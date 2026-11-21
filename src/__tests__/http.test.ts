import { describe, it, expect, beforeEach, test, afterEach } from 'bun:test';
import { FakeClock } from './fakes/FakeClock';
import { FakeNetwork } from './fakes/FakeNetwork';
import { createFakeFetch, FakeFetchController } from './fakes/fakeFetch';
import { createHttpClient } from '../adapters/http';
import { isAppError } from '../domain/errors';

describe('http client (Fase 5 — seguridad y manejo de errores)', () => {
  let clock: FakeClock;
  let network: FakeNetwork;
  let fakeFetch: FakeFetchController;
  let token: string | null;

  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    clock = new FakeClock(1700000000000);
    clock.useManualTimers(true);
    network = new FakeNetwork(true);
    fakeFetch = createFakeFetch();
    token = 'secret-jwt-token-xyz';
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  function buildClient(
    onUnauthorized?: () => Promise<boolean>
  ) {
    return createHttpClient({
      fetchFn: fakeFetch.fetch,
      network,
      clock,
      ownHosts: ['dummyjson.com'],
      defaultTimeoutMs: 10_000,
      getAccessToken: () => token,
      onUnauthorized,
    });
  }

  it('agrega Authorization Bearer solo a hosts propios (dummyjson.com) y nunca a terceros (open-meteo.com)', async () => {
    fakeFetch.enqueueJson(200, { ok: true });
    fakeFetch.enqueueJson(200, { current: { temperature_2m: 20 } });

    const http = buildClient();
    await http.request('https://dummyjson.com/auth/me');
    await http.request('https://api.open-meteo.com/v1/forecast?latitude=-33.4&longitude=-70.6');

    expect(fakeFetch.calls).toHaveLength(2);
    expect(fakeFetch.calls[0].headers['authorization']).toBe(
      'Bearer secret-jwt-token-xyz'
    );
    expect(fakeFetch.calls[1].headers['authorization']).toBeUndefined();
  });

  it('rechaza URLs con protocolo http:// sin invocar fetch', async () => {
    const http = buildClient();

    let caught: unknown;
    try {
      await http.request('http://dummyjson.com/todos');
    } catch (err) {
      caught = err;
    }

    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('API_VALIDATION');
    }
    expect(fakeFetch.calls).toHaveLength(0);
  });

  it('aborta la petición cuando excede el timeout avanzando FakeClock y lanza NETWORK_TIMEOUT', async () => {
    fakeFetch.enqueueHang();
    const http = buildClient();

    const pending = http.request('https://dummyjson.com/todos', {
      timeoutMs: 5_000,
    });

    await Promise.resolve();
    await Promise.resolve();
    clock.advance(5_000);

    let caught: unknown;
    try {
      await pending;
    } catch (err) {
      caught = err;
    }

    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('NETWORK_TIMEOUT');
    }
  });

  test.each([500, 502, 503])(
    'mapea respuesta HTTP %i (5xx) a API_SERVER',
    async (status) => {
      fakeFetch.enqueueJson(status, { message: 'Server failure' });
      const http = buildClient();

      let caught: unknown;
      try {
        await http.request('https://dummyjson.com/todos');
      } catch (err) {
        caught = err;
      }

      expect(isAppError(caught)).toBe(true);
      if (isAppError(caught)) {
        expect(caught.code).toBe('API_SERVER');
      }
    }
  );

  test.each([400, 403, 404, 422])(
    'mapea respuesta HTTP %i (4xx != 401) a API_VALIDATION conservando status en cause',
    async (status) => {
      fakeFetch.enqueueJson(status, { message: 'Invalid request' });
      const http = buildClient();

      let caught: unknown;
      try {
        await http.request('https://dummyjson.com/todos/999');
      } catch (err) {
        caught = err;
      }

      expect(isAppError(caught)).toBe(true);
      if (isAppError(caught)) {
        expect(caught.code).toBe('API_VALIDATION');
        expect((caught.cause as { status?: number })?.status).toBe(status);
      }
    }
  );

  it('mapea JSON inválido a API_BAD_RESPONSE', async () => {
    fakeFetch.enqueueText(200, '{not-valid-json');
    const http = buildClient();

    let caught: unknown;
    try {
      await http.request('https://dummyjson.com/todos');
    } catch (err) {
      caught = err;
    }

    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('API_BAD_RESPONSE');
    }
  });

  it('lanza NETWORK_OFFLINE si no hay red (sin invocar fetch) o si fetch falla por red', async () => {
    network.setOnline(false);
    const http = buildClient();

    let offlineErr: unknown;
    try {
      await http.request('https://dummyjson.com/todos');
    } catch (err) {
      offlineErr = err;
    }

    expect(isAppError(offlineErr)).toBe(true);
    if (isAppError(offlineErr)) {
      expect(offlineErr.code).toBe('NETWORK_OFFLINE');
    }
    expect(fakeFetch.calls).toHaveLength(0);

    network.setOnline(true);
    fakeFetch.enqueueNetworkError('Network request failed');

    let netErr: unknown;
    try {
      await http.request('https://dummyjson.com/todos');
    } catch (err) {
      netErr = err;
    }

    expect(isAppError(netErr)).toBe(true);
    if (isAppError(netErr)) {
      expect(netErr.code).toBe('NETWORK_OFFLINE');
    }
  });

  it('R3: el token nunca se imprime en console.* ni en mensajes de error', async () => {
    const loggedArgs: string[] = [];
    const recordLog = (...args: unknown[]) => {
      loggedArgs.push(args.map((a) => String(a)).join(' '));
    };
    console.log = recordLog;
    console.info = recordLog;
    console.warn = recordLog;
    console.error = recordLog;

    fakeFetch.enqueueJson(200, { ok: true });
    fakeFetch.enqueueJson(500, { error: 'boom' });
    fakeFetch.enqueueText(200, 'invalid-json');
    fakeFetch.enqueueJson(401, { message: 'Unauthorized' });

    const http = buildClient(async () => false);
    await http.request('https://dummyjson.com/todos');

    const capturedErrors: unknown[] = [];
    for (let i = 0; i < 3; i++) {
      try {
        await http.request('https://dummyjson.com/todos');
      } catch (err) {
        capturedErrors.push(err);
      }
    }

    expect(loggedArgs.join('\n')).not.toContain('secret-jwt-token-xyz');
    for (const err of capturedErrors) {
      expect(JSON.stringify(err)).not.toContain('secret-jwt-token-xyz');
      expect((err as Error).message).not.toContain('secret-jwt-token-xyz');
    }
  });
});
