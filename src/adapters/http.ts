import { createAppError } from '../domain/errors';
import { Clock } from '../ports/clock';
import { NetworkPort } from '../ports/network';

export type FetchFn = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
}

export interface HttpClient {
  request<T>(url: string, options?: HttpRequestOptions): Promise<T>;
}

export interface HttpClientDeps {
  fetchFn?: FetchFn;
  network: NetworkPort;
  clock: Clock;
  ownHosts?: string[];
  defaultTimeoutMs?: number;
  getAccessToken?: () => Promise<string | null> | string | null;
  onUnauthorized?: () => Promise<boolean>;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_OWN_HOSTS = ['dummyjson.com'];

function isAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: unknown }).name === 'AbortError'
  );
}

function isOwnHost(hostname: string, ownHosts: string[]): boolean {
  const normalized = hostname.toLowerCase();
  return ownHosts.some((host) => host.toLowerCase() === normalized);
}

export function createHttpClient(deps: HttpClientDeps): HttpClient {
  const fetchImpl: FetchFn =
    deps.fetchFn ?? ((input, init) => globalThis.fetch(input, init));
  const ownHosts = deps.ownHosts ?? DEFAULT_OWN_HOSTS;
  const defaultTimeoutMs = deps.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;

  const executeRequest = async <T>(
    url: string,
    options?: HttpRequestOptions
  ): Promise<T> => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw createAppError('API_VALIDATION');
    }

    if (parsedUrl.protocol !== 'https:') {
      throw createAppError('API_VALIDATION');
    }

    const online = await deps.network.isOnline();
    if (!online) {
      throw createAppError('NETWORK_OFFLINE');
    }

    const own = isOwnHost(parsedUrl.hostname, ownHosts);
    const outgoingHeaders: Record<string, string> = {
      Accept: 'application/json',
    };

    if (options?.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        if (!own && key.toLowerCase() === 'authorization') {
          continue;
        }
        if (options.skipAuth && key.toLowerCase() === 'authorization') {
          continue;
        }
        outgoingHeaders[key] = value;
      }
    }

    const hasExplicitAuth = Object.keys(outgoingHeaders).some(
      (k) => k.toLowerCase() === 'authorization'
    );

    if (own && !options?.skipAuth && !hasExplicitAuth && deps.getAccessToken) {
      const token = await deps.getAccessToken();
      if (token) {
        outgoingHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    let serializedBody: string | undefined;
    if (options?.body !== undefined) {
      serializedBody = JSON.stringify(options.body);
      const hasContentType = Object.keys(outgoingHeaders).some(
        (k) => k.toLowerCase() === 'content-type'
      );
      if (!hasContentType) {
        outgoingHeaders['Content-Type'] = 'application/json';
      }
    }

    const method = options?.method ?? 'GET';
    const timeoutMs = options?.timeoutMs ?? defaultTimeoutMs;
    const controller = new AbortController();
    let settled = false;
    let timedOut = false;

    const fetchPromise = (async () => {
      try {
        const response = await fetchImpl(url, {
          method,
          headers: outgoingHeaders,
          ...(serializedBody !== undefined ? { body: serializedBody } : {}),
          signal: controller.signal,
        });
        const rawText = await response.text();
        return { response, rawText };
      } catch (err) {
        if (timedOut || controller.signal.aborted || isAbortError(err)) {
          throw createAppError('NETWORK_TIMEOUT');
        }
        throw createAppError('NETWORK_OFFLINE');
      }
    })();
    fetchPromise.catch(() => undefined);

    const timeoutPromise = deps.clock.sleep(timeoutMs).then(() => {
      if (!settled) {
        timedOut = true;
        controller.abort();
      }
      throw createAppError('NETWORK_TIMEOUT');
    });
    timeoutPromise.catch(() => undefined);

    let response: Response;
    let rawText: string;
    try {
      ({ response, rawText } = await Promise.race([
        fetchPromise,
        timeoutPromise,
      ]));
    } finally {
      settled = true;
    }

    if (response.status === 401) {
      if (!options?.skipAuth) {
        if (!options?.skipAuthRefresh && own && deps.onUnauthorized) {
          const refreshed = await deps.onUnauthorized();
          if (!refreshed) {
            throw createAppError('AUTH_EXPIRED', { status: 401 });
          }
          return executeRequest<T>(url, {
            ...options,
            skipAuthRefresh: true,
          });
        }
        throw createAppError('AUTH_EXPIRED', { status: 401 });
      }
      throw createAppError('API_VALIDATION', { status: 401 });
    }

    if (response.status >= 500) {
      throw createAppError('API_SERVER', { status: response.status });
    }

    if (response.status >= 400) {
      throw createAppError('API_VALIDATION', { status: response.status });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    try {
      return JSON.parse(rawText) as T;
    } catch {
      throw createAppError('API_BAD_RESPONSE');
    }
  };

  return {
    request: executeRequest,
  };
}
