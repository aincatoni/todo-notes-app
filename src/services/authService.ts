import { createAppError, isAppError } from '../domain/errors';
import { validatePassword, validateUsername } from '../domain/validators';
import { AuthApi } from '../ports/api';
import { Clock } from '../ports/clock';
import { IdGenerator } from '../ports/idGenerator';
import { NetworkPort } from '../ports/network';
import { SecureStore } from '../ports/secureStore';
import { TaskStorage } from '../storage/taskStorage';
import { LocalAccount, Session, User } from '../types/auth';
import { AppError, AppErrorAction, AppErrorCode } from '../types/errors';

export const SESSION_STORAGE_KEY = 'session_v1';
const LOCAL_SESSION_DURATION_MS = 30 * 60_000;

export interface AuthState {
  user: User | null;
  session: Session | null;
}

export interface AuthSessionBundle {
  user: User;
  session: Session;
}

export interface RegisterInput {
  username: string;
  password: string;
  displayName?: string;
}

export interface AuthServiceDeps {
  authApi: AuthApi;
  secureStore: SecureStore;
  taskStorage: TaskStorage;
  network: NetworkPort;
  clock: Clock;
  idGenerator?: IdGenerator;
}

export interface AuthService {
  login(username: string, password: string): Promise<AuthSessionBundle>;
  register(input: RegisterInput): Promise<AuthSessionBundle>;
  restoreSession(): Promise<AuthSessionBundle | null>;
  refreshSession(): Promise<AuthSessionBundle>;
  handleUnauthorized(): Promise<boolean>;
  getAccessToken(): string | null;
  getCurrentUser(): User | null;
  getCurrentSession(): Session | null;
  hasPendingSync(userId?: string): Promise<boolean>;
  logout(): Promise<void>;
  subscribe(listener: (state: AuthState) => void): () => void;
}

class ValidationDomainError extends Error implements AppError {
  public readonly code: AppErrorCode = 'API_VALIDATION';
  public readonly action: AppErrorAction = 'inform';

  constructor(message: string) {
    super(message);
    this.name = 'ValidationDomainError';
  }
}

function isStoredBundle(raw: unknown): raw is AuthSessionBundle {
  if (typeof raw !== 'object' || raw === null) {
    return false;
  }
  const candidate = raw as { user?: unknown; session?: unknown };
  if (typeof candidate.user !== 'object' || candidate.user === null) {
    return false;
  }
  if (typeof candidate.session !== 'object' || candidate.session === null) {
    return false;
  }

  const user = candidate.user as Partial<User>;
  const session = candidate.session as Partial<Session>;

  return (
    typeof user.id === 'string' &&
    user.id.length > 0 &&
    typeof user.username === 'string' &&
    user.username.length > 0 &&
    typeof session.userId === 'string' &&
    session.userId.length > 0 &&
    typeof session.accessToken === 'string' &&
    session.accessToken.length > 0 &&
    typeof session.expiresAt === 'number' &&
    Number.isFinite(session.expiresAt)
  );
}

export function createAuthService(deps: AuthServiceDeps): AuthService {
  let state: AuthState = { user: null, session: null };
  let refreshInFlight: Promise<AuthSessionBundle> | null = null;
  const listeners = new Set<(next: AuthState) => void>();

  const setState = (next: AuthState) => {
    state = next;
    for (const listener of listeners) {
      listener(next);
    }
  };

  const persistBundle = async (bundle: AuthSessionBundle): Promise<void> => {
    await deps.secureStore.set(SESSION_STORAGE_KEY, JSON.stringify(bundle));
  };

  const clearStoredSession = async (): Promise<void> => {
    await deps.secureStore.remove(SESSION_STORAGE_KEY);
    setState({ user: null, session: null });
  };

  const readStoredBundle = async (): Promise<AuthSessionBundle | null> => {
    const raw = await deps.secureStore.get(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return isStoredBundle(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const refreshSession = async (): Promise<AuthSessionBundle> => {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    refreshInFlight = (async () => {
      const activeUser = state.user;
      const activeSession = state.session;
      const stored =
        activeUser && activeSession
          ? { user: activeUser, session: activeSession }
          : await readStoredBundle();

      if (!stored || !stored.session.refreshToken) {
        await clearStoredSession();
        throw createAppError('AUTH_EXPIRED');
      }

      try {
        const refreshed = await deps.authApi.refresh(stored.session.refreshToken);
        const updatedBundle: AuthSessionBundle = {
          user: stored.user,
          session: {
            ...stored.session,
            accessToken: refreshed.accessToken,
            refreshToken:
              refreshed.refreshToken ?? stored.session.refreshToken,
            expiresAt: refreshed.expiresAt,
          },
        };
        await persistBundle(updatedBundle);
        setState(updatedBundle);
        return updatedBundle;
      } catch (err) {
        if (isAppError(err) && err.code === 'AUTH_EXPIRED') {
          await clearStoredSession();
        }
        throw err;
      }
    })();

    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  };

  return {
    async login(
      username: string,
      password: string
    ): Promise<AuthSessionBundle> {
      const userValidation = validateUsername(username);
      if (!userValidation.valid) {
        throw new ValidationDomainError(userValidation.error);
      }

      const passValidation = validatePassword(password);
      if (!passValidation.valid) {
        throw new ValidationDomainError(passValidation.error);
      }

      const result = await deps.authApi.login(
        userValidation.value,
        passValidation.value
      );
      const bundle: AuthSessionBundle = {
        user: result.user,
        session: result.session,
      };

      await persistBundle(bundle);
      await deps.taskStorage.saveLastUser(result.user);
      setState(bundle);
      return bundle;
    },

    async register(input: RegisterInput): Promise<AuthSessionBundle> {
      const userValidation = validateUsername(input.username.trim());
      if (!userValidation.valid) {
        throw new ValidationDomainError(userValidation.error);
      }

      const passValidation = validatePassword(input.password);
      if (!passValidation.valid) {
        throw new ValidationDomainError(passValidation.error);
      }

      const accounts = await deps.taskStorage.getAccounts();
      const normalizedUsername = userValidation.value.toLowerCase();
      const alreadyExists = accounts.some(
        (account) => account.username.toLowerCase() === normalizedUsername
      );
      if (alreadyExists) {
        throw new ValidationDomainError('Este usuario ya está registrado');
      }

      const nowMs = deps.clock.now();
      const id = deps.idGenerator
        ? deps.idGenerator.next()
        : `account-${nowMs}`;
      const trimmedDisplayName = input.displayName?.trim();

      const newAccount: LocalAccount = {
        id,
        username: userValidation.value,
        password: passValidation.value,
        ...(trimmedDisplayName ? { displayName: trimmedDisplayName } : {}),
        createdAt: nowMs,
      };

      await deps.taskStorage.saveAccounts([...accounts, newAccount]);

      const user: User = {
        id: newAccount.id,
        username: newAccount.username,
        ...(newAccount.displayName
          ? { displayName: newAccount.displayName }
          : {}),
      };

      const bundle: AuthSessionBundle = {
        user,
        session: {
          userId: newAccount.id,
          username: newAccount.username,
          accessToken: `local-session-${newAccount.id}-${nowMs}`,
          refreshToken: `local-refresh-${newAccount.id}`,
          expiresAt: nowMs + LOCAL_SESSION_DURATION_MS,
        },
      };

      await persistBundle(bundle);
      await deps.taskStorage.saveLastUser(user);
      setState(bundle);
      return bundle;
    },

    async restoreSession(): Promise<AuthSessionBundle | null> {
      const stored = await readStoredBundle();
      if (!stored) {
        setState({ user: null, session: null });
        return null;
      }

      const online = await deps.network.isOnline();
      if (!online) {
        // R4: Sin red se permite trabajar offline con la sesión almacenada
        setState(stored);
        return stored;
      }

      if (stored.session.expiresAt > deps.clock.now()) {
        setState(stored);
        return stored;
      }

      setState(stored);
      try {
        return await refreshSession();
      } catch (err) {
        if (isAppError(err) && err.code === 'AUTH_EXPIRED') {
          return null;
        }
        // Ante caída temporal de red/servidor al arrancar, mantener modo offline
        return stored;
      }
    },

    refreshSession,

    async handleUnauthorized(): Promise<boolean> {
      await refreshSession();
      return true;
    },

    getAccessToken(): string | null {
      return state.session?.accessToken ?? null;
    },

    getCurrentUser(): User | null {
      return state.user;
    },

    getCurrentSession(): Session | null {
      return state.session;
    },

    async hasPendingSync(userId?: string): Promise<boolean> {
      const targetUserId = userId ?? state.user?.id;
      if (!targetUserId) {
        return false;
      }
      const ops = await deps.taskStorage.getOutbox(targetUserId);
      return ops.length > 0;
    },

    async logout(): Promise<void> {
      await clearStoredSession();
    },

    subscribe(listener: (next: AuthState) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
