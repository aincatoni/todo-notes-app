import { HttpClient } from '../adapters/http';
import { createAppError, isAppError } from '../domain/errors';
import { AuthApi, AuthLoginResult, AuthRefreshResult } from '../ports/api';
import { Clock } from '../ports/clock';
import { TaskStorage } from '../storage/taskStorage';
import { User } from '../types/auth';

export interface LocalAuthApiDeps {
  taskStorage: TaskStorage;
  clock: Clock;
  defaultExpiresInMins?: number;
}

export interface AuthApiDeps {
  http: HttpClient;
  clock: Clock;
  baseUrl?: string;
  defaultExpiresInMins?: number;
  enableLocalFallback?: boolean;
}

const DEFAULT_BASE_URL = 'https://dummyjson.com';
const DEFAULT_EXPIRES_IN_MINS = 30;
const LOCAL_REFRESH_PREFIX = 'local-refresh-';

interface LocalDemoAccount {
  id: string;
  username: string;
  password: string;
  displayName: string;
}

const LOCAL_DEMO_ACCOUNTS: LocalDemoAccount[] = [
  {
    id: '1',
    username: 'emilys',
    password: 'emilyspass',
    displayName: 'Emily Johnson',
  },
  {
    id: '2',
    username: 'michaelw',
    password: 'michaelwpass',
    displayName: 'Michael Williams',
  },
];

function buildLocalLogin(
  username: string,
  password: string,
  nowMs: number,
  expiresInMins: number
): AuthLoginResult {
  const account = LOCAL_DEMO_ACCOUNTS.find((a) => a.username === username);
  if (!account || account.password !== password) {
    throw createAppError('AUTH_INVALID_CREDENTIALS');
  }

  return {
    user: {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
    },
    session: {
      userId: account.id,
      username: account.username,
      accessToken: `local-session-${account.id}-${nowMs}`,
      refreshToken: `${LOCAL_REFRESH_PREFIX}${account.id}`,
      expiresAt: nowMs + expiresInMins * 60_000,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeUserId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return readNonEmptyString(value);
}

function parseUserFromPayload(raw: unknown): User | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = normalizeUserId(raw.id);
  const username = readNonEmptyString(raw.username);
  if (!id || !username) {
    return null;
  }

  const firstName = readNonEmptyString(raw.firstName);
  const lastName = readNonEmptyString(raw.lastName);
  const displayName = [firstName, lastName].filter(Boolean).join(' ');

  return {
    id,
    username,
    ...(displayName.length > 0 ? { displayName } : {}),
  };
}

export function createAuthApi(deps: AuthApiDeps): AuthApi {
  const baseUrl = (deps.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  const defaultExpiresInMins =
    deps.defaultExpiresInMins ?? DEFAULT_EXPIRES_IN_MINS;

  return {
    async login(
      username: string,
      password: string,
      expiresInMins: number = defaultExpiresInMins
    ): Promise<AuthLoginResult> {
      let raw: unknown;
      try {
        raw = await deps.http.request<unknown>(`${baseUrl}/auth/login`, {
          method: 'POST',
          body: { username, password, expiresInMins },
          skipAuth: true,
          skipAuthRefresh: true,
        });
      } catch (err) {
        if (isAppError(err) && err.code === 'API_VALIDATION') {
          throw createAppError('AUTH_INVALID_CREDENTIALS');
        }
        if (
          deps.enableLocalFallback &&
          isAppError(err) &&
          (err.code === 'NETWORK_OFFLINE' ||
            err.code === 'NETWORK_TIMEOUT' ||
            err.code === 'API_SERVER' ||
            err.code === 'API_BAD_RESPONSE')
        ) {
          return buildLocalLogin(
            username,
            password,
            deps.clock.now(),
            expiresInMins
          );
        }
        throw err;
      }

      const user = parseUserFromPayload(raw);
      if (!user || !isRecord(raw)) {
        throw createAppError('API_BAD_RESPONSE');
      }

      const accessToken = readNonEmptyString(raw.accessToken);
      if (!accessToken) {
        throw createAppError('API_BAD_RESPONSE');
      }

      const refreshToken = readNonEmptyString(raw.refreshToken);
      const expiresAt = deps.clock.now() + expiresInMins * 60_000;

      return {
        user,
        session: {
          userId: user.id,
          username: user.username,
          accessToken,
          ...(refreshToken ? { refreshToken } : {}),
          expiresAt,
        },
      };
    },

    async refresh(
      refreshToken: string,
      expiresInMins: number = defaultExpiresInMins
    ): Promise<AuthRefreshResult> {
      if (
        deps.enableLocalFallback &&
        refreshToken.startsWith(LOCAL_REFRESH_PREFIX)
      ) {
        const accountId = refreshToken.slice(LOCAL_REFRESH_PREFIX.length);
        const account = LOCAL_DEMO_ACCOUNTS.find((a) => a.id === accountId);
        if (!account) {
          throw createAppError('AUTH_EXPIRED');
        }
        const nowMs = deps.clock.now();
        return {
          accessToken: `local-session-${account.id}-${nowMs}`,
          refreshToken,
          expiresAt: nowMs + expiresInMins * 60_000,
        };
      }

      let raw: unknown;
      try {
        raw = await deps.http.request<unknown>(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          body: { refreshToken, expiresInMins },
          skipAuth: true,
          skipAuthRefresh: true,
        });
      } catch (err) {
        if (isAppError(err) && err.code === 'API_VALIDATION') {
          throw createAppError('AUTH_EXPIRED');
        }
        throw err;
      }

      if (!isRecord(raw)) {
        throw createAppError('API_BAD_RESPONSE');
      }

      const accessToken = readNonEmptyString(raw.accessToken);
      if (!accessToken) {
        throw createAppError('API_BAD_RESPONSE');
      }

      const nextRefreshToken = readNonEmptyString(raw.refreshToken);
      const expiresAt = deps.clock.now() + expiresInMins * 60_000;

      return {
        accessToken,
        ...(nextRefreshToken ? { refreshToken: nextRefreshToken } : {}),
        expiresAt,
      };
    },

    async me(accessToken: string): Promise<User> {
      const raw = await deps.http.request<unknown>(`${baseUrl}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        skipAuthRefresh: true,
      });

      const user = parseUserFromPayload(raw);
      if (!user) {
        throw createAppError('API_BAD_RESPONSE');
      }
      return user;
    },
  };
}

export function createLocalAuthApi(deps: LocalAuthApiDeps): AuthApi {
  const defaultExpiresInMins =
    deps.defaultExpiresInMins ?? DEFAULT_EXPIRES_IN_MINS;

  return {
    async login(
      username: string,
      password: string,
      expiresInMins: number = defaultExpiresInMins
    ): Promise<AuthLoginResult> {
      const normalized = username.trim().toLowerCase();
      const accounts = await deps.taskStorage.getAccounts();
      const account = accounts.find(
        (a) => a.username.toLowerCase() === normalized
      );

      if (!account || account.password !== password) {
        throw createAppError('AUTH_INVALID_CREDENTIALS');
      }

      const nowMs = deps.clock.now();
      const user: User = {
        id: account.id,
        username: account.username,
        ...(account.displayName ? { displayName: account.displayName } : {}),
      };

      return {
        user,
        session: {
          userId: account.id,
          username: account.username,
          accessToken: `local-session-${account.id}-${nowMs}`,
          refreshToken: `${LOCAL_REFRESH_PREFIX}${account.id}`,
          expiresAt: nowMs + expiresInMins * 60_000,
        },
      };
    },

    async refresh(
      refreshToken: string,
      expiresInMins: number = defaultExpiresInMins
    ): Promise<AuthRefreshResult> {
      if (!refreshToken.startsWith(LOCAL_REFRESH_PREFIX)) {
        throw createAppError('AUTH_EXPIRED');
      }

      const accountId = refreshToken.slice(LOCAL_REFRESH_PREFIX.length);
      const accounts = await deps.taskStorage.getAccounts();
      const account = accounts.find((a) => a.id === accountId);
      if (!account) {
        throw createAppError('AUTH_EXPIRED');
      }

      const nowMs = deps.clock.now();
      return {
        accessToken: `local-session-${account.id}-${nowMs}`,
        refreshToken,
        expiresAt: nowMs + expiresInMins * 60_000,
      };
    },

    async me(accessToken: string): Promise<User> {
      const prefix = 'local-session-';
      if (!accessToken.startsWith(prefix)) {
        throw createAppError('AUTH_EXPIRED');
      }
      const rest = accessToken.slice(prefix.length);
      const lastDash = rest.lastIndexOf('-');
      const accountId = lastDash > 0 ? rest.slice(0, lastDash) : rest;
      const accounts = await deps.taskStorage.getAccounts();
      const account = accounts.find((a) => a.id === accountId);
      if (!account) {
        throw createAppError('AUTH_EXPIRED');
      }
      return {
        id: account.id,
        username: account.username,
        ...(account.displayName ? { displayName: account.displayName } : {}),
      };
    },
  };
}
