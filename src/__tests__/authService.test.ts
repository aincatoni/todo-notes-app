import { describe, it, expect, beforeEach } from 'bun:test';
import { FakeClock } from './fakes/FakeClock';
import { FakeKeyValueStore } from './fakes/FakeKeyValueStore';
import { FakeNetwork } from './fakes/FakeNetwork';
import { FakeSecureStore } from './fakes/FakeSecureStore';
import { SeqIdGenerator } from './fakes/SeqIdGenerator';
import { createFakeFetch, FakeFetchController } from './fakes/fakeFetch';
import { aSession, aTask } from './builders';
import { createHttpClient } from '../adapters/http';
import { createAuthApi, createLocalAuthApi } from '../api/authApi';
import { createAuthService } from '../services/authService';
import { createTaskStorage, TaskStorage } from '../storage/taskStorage';
import { isAppError } from '../domain/errors';
import authLoginSuccessFixture from './fixtures/authLoginSuccess.json';
import authRefreshSuccessFixture from './fixtures/authRefreshSuccess.json';

describe('authService (R1, R2, R3, R4, R14, CU-01, CU-02)', () => {
  let clock: FakeClock;
  let kvStore: FakeKeyValueStore;
  let taskStorage: TaskStorage;
  let secureStore: FakeSecureStore;
  let network: FakeNetwork;
  let fakeFetch: FakeFetchController;

  beforeEach(() => {
    clock = new FakeClock(1700000000000);
    clock.useManualTimers(true);
    kvStore = new FakeKeyValueStore();
    taskStorage = createTaskStorage(kvStore);
    secureStore = new FakeSecureStore();
    network = new FakeNetwork(true);
    fakeFetch = createFakeFetch();
  });

  function buildAuthStack() {
    let authServiceRef: ReturnType<typeof createAuthService>;

    const http = createHttpClient({
      fetchFn: fakeFetch.fetch,
      network,
      clock,
      ownHosts: ['dummyjson.com'],
      getAccessToken: () => authServiceRef.getAccessToken(),
      onUnauthorized: () => authServiceRef.handleUnauthorized(),
    });

    const authApi = createAuthApi({
      http,
      clock,
      baseUrl: 'https://dummyjson.com',
    });

    authServiceRef = createAuthService({
      authApi,
      secureStore,
      taskStorage,
      network,
      clock,
    });

    return { authService: authServiceRef, http, authApi };
  }

  it('CU-01 / R3: login exitoso guarda tokens en SecureStore y nunca en KeyValueStore', async () => {
    fakeFetch.enqueueJson(200, authLoginSuccessFixture);
    const { authService } = buildAuthStack();

    const { user, session } = await authService.login('emilys', 'emilyspass');

    expect(user).toEqual({
      id: '1',
      username: 'emilys',
      displayName: 'Emily Johnson',
    });
    expect(session.accessToken).toBe('fake-jwt-access-token');

    const secureDump = secureStore.dump();
    expect(secureDump['session_v1']).toContain('fake-jwt-access-token');
    expect(secureDump['session_v1']).toContain('fake-jwt-refresh-token');

    const kvDump = kvStore.snapshot();
    const kvSerialized = JSON.stringify(kvDump);
    expect(kvSerialized).not.toContain('fake-jwt-access-token');
    expect(kvSerialized).not.toContain('fake-jwt-refresh-token');
    expect(await taskStorage.getLastUser()).toEqual({
      id: '1',
      username: 'emilys',
      displayName: 'Emily Johnson',
    });
  });

  it('CU-01: credenciales inválidas lanzan AUTH_INVALID_CREDENTIALS y SecureStore queda vacío', async () => {
    fakeFetch.enqueueJson(400, { message: 'Invalid credentials' });
    const { authService } = buildAuthStack();

    let caught: unknown;
    try {
      await authService.login('emilys', 'wrong-pass');
    } catch (err) {
      caught = err;
    }

    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('AUTH_INVALID_CREDENTIALS');
    }
    expect(secureStore.dump()).toEqual({});
    expect(authService.getCurrentUser()).toBeNull();
  });

  it('valida usuario y contraseña localmente antes de llamar a la red', async () => {
    const { authService } = buildAuthStack();

    let userErr: unknown;
    try {
      await authService.login('ab', '123456');
    } catch (err) {
      userErr = err;
    }
    expect(isAppError(userErr)).toBe(true);
    expect((userErr as Error).message).toBe('Usuario inválido');

    let passErr: unknown;
    try {
      await authService.login('emilys', '12345');
    } catch (err) {
      passErr = err;
    }
    expect(isAppError(passErr)).toBe(true);
    expect((passErr as Error).message).toBe('Mínimo 6 caracteres');

    expect(fakeFetch.calls).toHaveLength(0);
  });

  it('R14: un 401 dispara refresh de token y reintenta la petición exactamente una vez con el nuevo token', async () => {
    await secureStore.set(
      'session_v1',
      JSON.stringify({
        user: { id: '1', username: 'emilys', displayName: 'Emily Johnson' },
        session: aSession({
          accessToken: 'expired-access',
          refreshToken: 'valid-refresh',
          expiresAt: clock.now() + 60_000,
        }),
      })
    );

    const { authService, http } = buildAuthStack();
    await authService.restoreSession();

    fakeFetch.enqueueJson(401, { message: 'Token expired' });
    fakeFetch.enqueueJson(200, authRefreshSuccessFixture);
    fakeFetch.enqueueJson(200, { id: 1, todo: 'OK', completed: false });

    const data = await http.request<{ id: number; todo: string }>(
      'https://dummyjson.com/todos/1'
    );

    expect(data.todo).toBe('OK');
    expect(fakeFetch.calls).toHaveLength(3);
    expect(fakeFetch.calls[0].headers['authorization']).toBe(
      'Bearer expired-access'
    );
    expect(fakeFetch.calls[1].url).toBe('https://dummyjson.com/auth/refresh');
    expect(fakeFetch.calls[2].url).toBe('https://dummyjson.com/todos/1');
    expect(fakeFetch.calls[2].headers['authorization']).toBe(
      'Bearer fake-jwt-access-token-2'
    );
  });

  it('R14: dos peticiones concurrentes con 401 comparten una sola llamada a /auth/refresh', async () => {
    await secureStore.set(
      'session_v1',
      JSON.stringify({
        user: { id: '1', username: 'emilys' },
        session: aSession({
          accessToken: 'stale-token',
          refreshToken: 'refresh-tok',
          expiresAt: clock.now() + 60_000,
        }),
      })
    );

    let callsCount = 0;
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    let refreshRequests = 0;

    const customFetch = async (
      input: string | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      callsCount++;

      if (url.endsWith('/auth/refresh')) {
        refreshRequests++;
        await refreshGate;
        return new Response(JSON.stringify(authRefreshSuccessFixture), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      const authHeader = (init?.headers as Record<string, string> | undefined)?.[
        'Authorization'
      ];
      if (authHeader === 'Bearer stale-token') {
        return new Response(JSON.stringify({ message: 'Expired' }), {
          status: 401,
        });
      }

      return new Response(JSON.stringify({ ok: true, url }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    let concurrentAuth!: ReturnType<typeof createAuthService>;
    const concurrentHttp = createHttpClient({
      fetchFn: customFetch,
      network,
      clock,
      ownHosts: ['dummyjson.com'],
      getAccessToken: () => concurrentAuth.getAccessToken(),
      onUnauthorized: () => concurrentAuth.handleUnauthorized(),
    });
    const concurrentAuthApi = createAuthApi({
      http: concurrentHttp,
      clock,
      baseUrl: 'https://dummyjson.com',
    });
    concurrentAuth = createAuthService({
      authApi: concurrentAuthApi,
      secureStore,
      taskStorage,
      network,
      clock,
    });
    await concurrentAuth.restoreSession();

    const p1 = concurrentHttp.request<{ ok: boolean; url: string }>(
      'https://dummyjson.com/todos/1'
    );
    const p2 = concurrentHttp.request<{ ok: boolean; url: string }>(
      'https://dummyjson.com/todos/2'
    );

    // Esperar a que ambas fallen con 401 y entren al refresh único
    for (let i = 0; i < 12; i++) {
      await Promise.resolve();
    }
    expect(refreshRequests).toBe(1);
    releaseRefresh();

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(refreshRequests).toBe(1);
    expect(callsCount).toBe(5); // 2 x 401 + 1 x refresh + 2 x reintento
  });

  it('R14: si el refresh falla con 401 cierra la sesión, limpia SecureStore y lanza AUTH_EXPIRED', async () => {
    await secureStore.set(
      'session_v1',
      JSON.stringify({
        user: { id: '1', username: 'emilys' },
        session: aSession({
          accessToken: 'expired-access',
          refreshToken: 'expired-refresh',
          expiresAt: clock.now() + 60_000,
        }),
      })
    );

    const { authService, http } = buildAuthStack();
    await authService.restoreSession();

    fakeFetch.enqueueJson(401, { message: 'Token expired' });
    fakeFetch.enqueueJson(401, { message: 'Refresh token invalid' });

    let caught: unknown;
    try {
      await http.request('https://dummyjson.com/todos');
    } catch (err) {
      caught = err;
    }

    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('AUTH_EXPIRED');
    }
    expect(secureStore.dump()).toEqual({});
    expect(authService.getCurrentSession()).toBeNull();
    expect(authService.getCurrentUser()).toBeNull();
  });

  it('R4: sin red pero con sesión previa guardada (incluso con expiresAt vencido) entra offline sin borrar tokens', async () => {
    const expiredOfflineSession = aSession({
      userId: '1',
      username: 'emilys',
      accessToken: 'offline-access',
      refreshToken: 'offline-refresh',
      expiresAt: clock.now() - 3_600_000,
    });
    await secureStore.set(
      'session_v1',
      JSON.stringify({
        user: { id: '1', username: 'emilys', displayName: 'Emily Johnson' },
        session: expiredOfflineSession,
      })
    );
    network.setOnline(false);

    const { authService } = buildAuthStack();
    const restored = await authService.restoreSession();

    expect(restored).not.toBeNull();
    expect(restored?.user.username).toBe('emilys');
    expect(restored?.session.accessToken).toBe('offline-access');
    expect(fakeFetch.calls).toHaveLength(0);
    expect(secureStore.dump()['session_v1']).toContain('offline-access');
  });

  it('R2 / CU-02: logout borra tokens de SecureStore, conserva tareas del usuario y reporta cola pendiente', async () => {
    fakeFetch.enqueueJson(200, authLoginSuccessFixture);
    const { authService } = buildAuthStack();
    await authService.login('emilys', 'emilyspass');

    const task = aTask({ id: 't-local-1', userId: '1', title: 'Persistir al salir' });
    await taskStorage.saveTasks([task], '1');
    await taskStorage.saveOutbox('1', [
      {
        id: 'op-1',
        taskId: 't-local-1',
        type: 'create',
        attempts: 0,
        lastError: null,
        createdAt: clock.now(),
      },
    ]);

    expect(await authService.hasPendingSync()).toBe(true);

    await authService.logout();

    expect(secureStore.dump()).toEqual({});
    expect(authService.getCurrentSession()).toBeNull();
    expect(authService.getCurrentUser()).toBeNull();
    expect(await taskStorage.getTasks('1')).toEqual([task]);
  });

  describe('Registro y autenticación 100 % local en el dispositivo (R4b, CU-01b, R2)', () => {
    function buildLocalAuthStack() {
      const idGenerator = new SeqIdGenerator();
      const localAuthApi = createLocalAuthApi({
        taskStorage,
        clock,
      });
      const authService = createAuthService({
        authApi: localAuthApi,
        secureStore,
        taskStorage,
        network,
        clock,
        idGenerator,
      });
      return { authService, localAuthApi, idGenerator };
    }

    it('R4b / CU-01b: register exitoso guarda cuenta en users_v1, tokens en SecureStore (nunca en lastUser_v1) e inicia sesión', async () => {
      const { authService } = buildLocalAuthStack();

      const bundle = await authService.register({
        username: 'ain@ipss.cl',
        password: 'claveSegura123',
        displayName: 'Ain Catoni',
      });

      expect(bundle.user).toEqual({
        id: 'task-id-1',
        username: 'ain@ipss.cl',
        displayName: 'Ain Catoni',
      });
      expect(bundle.session.userId).toBe('task-id-1');
      expect(bundle.session.accessToken).toContain('local-session-task-id-1');

      const accounts = await taskStorage.getAccounts();
      expect(accounts.some((a) => a.username === 'ain@ipss.cl')).toBe(true);

      const secureDump = secureStore.dump();
      expect(secureDump['session_v1']).toContain(bundle.session.accessToken);

      const lastUserRaw = await kvStore.get('lastUser_v1');
      expect(lastUserRaw).not.toBeNull();
      expect(lastUserRaw).not.toContain(bundle.session.accessToken);
      expect(lastUserRaw).not.toContain('claveSegura123');
      expect(await taskStorage.getLastUser()).toEqual(bundle.user);
      expect(authService.getCurrentUser()).toEqual(bundle.user);
    });

    it('R4b: register rechaza usuario duplicado en mayúsculas/minúsculas (semillas y cuentas recién creadas)', async () => {
      const { authService } = buildLocalAuthStack();

      let dupSeedErr: unknown;
      try {
        await authService.register({
          username: 'Emilys',
          password: 'otraPassword',
        });
      } catch (err) {
        dupSeedErr = err;
      }
      expect(isAppError(dupSeedErr)).toBe(true);
      expect((dupSeedErr as Error).message).toBe(
        'Este usuario ya está registrado'
      );

      await authService.register({
        username: 'pia@ipss.cl',
        password: 'password123',
      });

      let dupCreatedErr: unknown;
      try {
        await authService.register({
          username: 'PIA@IPSS.CL',
          password: 'password456',
        });
      } catch (err) {
        dupCreatedErr = err;
      }
      expect(isAppError(dupCreatedErr)).toBe(true);
      expect((dupCreatedErr as Error).message).toBe(
        'Este usuario ya está registrado'
      );
    });

    it('R4b: register valida usuario y contraseña localmente antes de escribir en almacenamiento', async () => {
      const { authService } = buildLocalAuthStack();

      let userErr: unknown;
      try {
        await authService.register({ username: 'a b', password: 'password123' });
      } catch (err) {
        userErr = err;
      }
      expect(isAppError(userErr)).toBe(true);
      expect((userErr as Error).message).toBe('Usuario inválido');

      let passErr: unknown;
      try {
        await authService.register({ username: 'nuevo@ipss.cl', password: '123' });
      } catch (err) {
        passErr = err;
      }
      expect(isAppError(passErr)).toBe(true);
      expect((passErr as Error).message).toBe('Mínimo 6 caracteres');
      expect(secureStore.dump()).toEqual({});
    });

    it('R4b + R2: el usuario creado puede cerrar sesión, volver a entrar offline y conservar sus tareas aisladas', async () => {
      network.setOnline(false);
      const { authService } = buildLocalAuthStack();

      const created = await authService.register({
        username: 'ain@ipss.cl',
        password: 'miPassword123',
        displayName: 'Ain Catoni',
      });
      const newUserId = created.user.id;

      const myTask = aTask({
        id: 't-ain-1',
        userId: newUserId,
        title: 'Tarea privada de Ain',
      });
      const emilyTask = aTask({
        id: 't-emily-1',
        userId: '1',
        title: 'Tarea privada de Emily',
      });
      await taskStorage.saveTasks([myTask], newUserId);
      await taskStorage.saveTasks([emilyTask], '1');

      await authService.logout();
      expect(authService.getCurrentUser()).toBeNull();

      // Re-login offline con las credenciales recién registradas
      const loggedIn = await authService.login('AIN@ipss.cl', 'miPassword123');
      expect(loggedIn.user.id).toBe(newUserId);
      expect(loggedIn.user.username).toBe('ain@ipss.cl');

      // Aislamiento estricto por userId
      expect(await taskStorage.getTasks(newUserId)).toEqual([myTask]);
      expect(await taskStorage.getTasks('1')).toEqual([emilyTask]);

      // Refresh local sin red externa también funciona para la cuenta nueva
      clock.advance(60_000);
      const refreshed = await authService.refreshSession();
      expect(refreshed.user.id).toBe(newUserId);
      expect(refreshed.session.accessToken).not.toBe(loggedIn.session.accessToken);
    });
  });
});
