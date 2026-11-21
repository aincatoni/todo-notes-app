export interface RecordedFetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  parsedBody: unknown;
}

type QueuedOutcome =
  | {
      kind: 'response';
      status: number;
      bodyText: string;
      headers: Record<string, string>;
    }
  | { kind: 'error'; message: string }
  | { kind: 'hang' };

function normalizeHeaders(headersInit?: HeadersInit): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headersInit) {
    return result;
  }
  if (headersInit instanceof Headers) {
    headersInit.forEach((value, key) => {
      result[key.toLowerCase()] = value;
    });
    return result;
  }
  if (Array.isArray(headersInit)) {
    for (const [key, value] of headersInit) {
      result[key.toLowerCase()] = value;
    }
    return result;
  }
  for (const [key, value] of Object.entries(headersInit)) {
    if (typeof value === 'string') {
      result[key.toLowerCase()] = value;
    }
  }
  return result;
}

function createAbortError(): Error {
  const err = new Error('The operation was aborted.');
  err.name = 'AbortError';
  return err;
}

export interface FakeFetchController {
  fetch: (input: string | URL, init?: RequestInit) => Promise<Response>;
  calls: RecordedFetchCall[];
  enqueueJson(
    status: number,
    body: unknown,
    headers?: Record<string, string>
  ): void;
  enqueueText(
    status: number,
    rawText: string,
    headers?: Record<string, string>
  ): void;
  enqueueNetworkError(message?: string): void;
  enqueueHang(): void;
  reset(): void;
}

export function createFakeFetch(): FakeFetchController {
  const queue: QueuedOutcome[] = [];
  const calls: RecordedFetchCall[] = [];

  const fetchImpl = async (
    input: string | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers = normalizeHeaders(init?.headers);
    const body = typeof init?.body === 'string' ? init.body : null;
    let parsedBody: unknown = null;
    if (body !== null) {
      try {
        parsedBody = JSON.parse(body);
      } catch {
        parsedBody = body;
      }
    }

    calls.push({ url, method, headers, body, parsedBody });

    const next = queue.shift();
    if (!next) {
      throw new Error(
        `fakeFetch: cola vacía al invocar ${method} ${url}`
      );
    }

    if (next.kind === 'error') {
      throw new TypeError(next.message);
    }

    if (next.kind === 'hang') {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) {
          reject(createAbortError());
          return;
        }
        signal?.addEventListener(
          'abort',
          () => {
            reject(createAbortError());
          },
          { once: true }
        );
      });
    }

    return new Response(next.bodyText, {
      status: next.status,
      headers: next.headers,
    });
  };

  return {
    fetch: fetchImpl,
    calls,
    enqueueJson(
      status: number,
      body: unknown,
      headers: Record<string, string> = {}
    ): void {
      queue.push({
        kind: 'response',
        status,
        bodyText: JSON.stringify(body),
        headers: { 'content-type': 'application/json', ...headers },
      });
    },
    enqueueText(
      status: number,
      rawText: string,
      headers: Record<string, string> = {}
    ): void {
      queue.push({
        kind: 'response',
        status,
        bodyText: rawText,
        headers,
      });
    },
    enqueueNetworkError(message: string = 'Network request failed'): void {
      queue.push({ kind: 'error', message });
    },
    enqueueHang(): void {
      queue.push({ kind: 'hang' });
    },
    reset(): void {
      queue.length = 0;
      calls.length = 0;
    },
  };
}
