import { describe, it, expect, beforeEach } from 'bun:test';
import { FakeClock } from './fakes/FakeClock';
import { FakeKeyValueStore } from './fakes/FakeKeyValueStore';
import { FakeNetwork } from './fakes/FakeNetwork';
import { createFakeFetch, FakeFetchController } from './fakes/fakeFetch';
import { createHttpClient } from '../adapters/http';
import { createAuthApi, createLocalAuthApi } from '../api/authApi';
import { createTaskStorage } from '../storage/taskStorage';
import { isAppError } from '../domain/errors';
import authLoginSuccessFixture from './fixtures/authLoginSuccess.json';
import authRefreshSuccessFixture from './fixtures/authRefreshSuccess.json';

describe('authApi sobre HttpClient (Fase 5)', () => {
  let clock: FakeClock;
  let network: FakeNetwork;
  let fakeFetch: FakeFetchController;

  beforeEach(() => {
    clock = new FakeClock(1700000000000);
    clock.useManualTimers(true);
    network = new FakeNetwork(true);
    fakeFetch = createFakeFetch();
  });

  function buildAuthApi(enableLocalFallback: boolean = false) {
    const http = createHttpClient({
      fetchFn: fakeFetch.fetch,
      network,
      clock,
      ownHosts: ['dummyjson.com'],
    });
    return createAuthApi({
      http,
      clock,
      baseUrl: 'https://dummyjson.com',
      enableLocalFallback,
    });
  }

  it('login exitoso con fixture authLoginSuccess.json normaliza id a string y calcula expiresAt', async () => {
    fakeFetch.enqueueJson(200, authLoginSuccessFixture);
    const api = buildAuthApi();

    const result = await api.login('emilys', 'emilyspass', 30);

    expect(fakeFetch.calls).toHaveLength(1);
    expect(fakeFetch.calls[0].url).toBe('https://dummyjson.com/auth/login');
    expect(fakeFetch.calls[0].method).toBe('POST');
    expect(fakeFetch.calls[0].parsedBody).toEqual({
      username: 'emilys',
      password: 'emilyspass',
      expiresInMins: 30,
    });
    expect(fakeFetch.calls[0].headers['authorization']).toBeUndefined();

    expect(result.user).toEqual({
      id: '1',
      username: 'emilys',
      displayName: 'Emily Johnson',
    });
    expect(result.session).toEqual({
      userId: '1',
      username: 'emilys',
      accessToken: 'fake-jwt-access-token',
      refreshToken: 'fake-jwt-refresh-token',
      expiresAt: 1700000000000 + 30 * 60_000,
    });
  });

  it('login con respuesta 400 o 401 lanza AUTH_INVALID_CREDENTIALS', async () => {
    fakeFetch.enqueueJson(400, { message: 'Invalid credentials' });
    fakeFetch.enqueueJson(401, { message: 'Unauthorized' });
    const api = buildAuthApi();

    for (let i = 0; i < 2; i++) {
      let caught: unknown;
      try {
        await api.login('emilys', 'wrongpass');
      } catch (err) {
        caught = err;
      }
      expect(isAppError(caught)).toBe(true);
      if (isAppError(caught)) {
        expect(caught.code).toBe('AUTH_INVALID_CREDENTIALS');
      }
    }
  });

  it('login con JSON malformado (sin accessToken o sin id) lanza API_BAD_RESPONSE', async () => {
    fakeFetch.enqueueJson(200, { id: 1, username: 'emilys' });
    fakeFetch.enqueueJson(200, { username: 'emilys', accessToken: 'tok' });
    const api = buildAuthApi();

    for (let i = 0; i < 2; i++) {
      let caught: unknown;
      try {
        await api.login('emilys', 'emilyspass');
      } catch (err) {
        caught = err;
      }
      expect(isAppError(caught)).toBe(true);
      if (isAppError(caught)) {
        expect(caught.code).toBe('API_BAD_RESPONSE');
      }
    }
  });

  it('refresh exitoso con fixture authRefreshSuccess.json retorna nuevos tokens y expiresAt', async () => {
    fakeFetch.enqueueJson(200, authRefreshSuccessFixture);
    const api = buildAuthApi();

    const refreshed = await api.refresh('fake-jwt-refresh-token', 45);

    expect(fakeFetch.calls).toHaveLength(1);
    expect(fakeFetch.calls[0].url).toBe('https://dummyjson.com/auth/refresh');
    expect(fakeFetch.calls[0].parsedBody).toEqual({
      refreshToken: 'fake-jwt-refresh-token',
      expiresInMins: 45,
    });
    expect(refreshed).toEqual({
      accessToken: 'fake-jwt-access-token-2',
      refreshToken: 'fake-jwt-refresh-token-2',
      expiresAt: 1700000000000 + 45 * 60_000,
    });
  });

  it('refresh rechazado con 400 o 401 lanza AUTH_EXPIRED', async () => {
    fakeFetch.enqueueJson(401, { message: 'Refresh token expired' });
    fakeFetch.enqueueJson(400, { message: 'Invalid refresh token' });
    const api = buildAuthApi();

    for (let i = 0; i < 2; i++) {
      let caught: unknown;
      try {
        await api.refresh('bad-refresh');
      } catch (err) {
        caught = err;
      }
      expect(isAppError(caught)).toBe(true);
      if (isAppError(caught)) {
        expect(caught.code).toBe('AUTH_EXPIRED');
      }
    }
  });

  it('me retorna User validado o lanza API_BAD_RESPONSE si faltan campos requeridos', async () => {
    fakeFetch.enqueueJson(200, {
      id: 7,
      username: 'michaelw',
      firstName: 'Michael',
      lastName: 'Williams',
    });
    fakeFetch.enqueueJson(200, { username: 'missing-id' });
    const api = buildAuthApi();

    const user = await api.me('tok-123');
    expect(user).toEqual({
      id: '7',
      username: 'michaelw',
      displayName: 'Michael Williams',
    });
    expect(fakeFetch.calls[0].headers['authorization']).toBe('Bearer tok-123');

    let caught: unknown;
    try {
      await api.me('tok-123');
    } catch (err) {
      caught = err;
    }
    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('API_BAD_RESPONSE');
    }
  });

  it('enableLocalFallback permite login y refresh local offline rechazando credenciales inválidas', async () => {
    network.setOnline(false);
    const api = buildAuthApi(true);

    const ok = await api.login('emilys', 'emilyspass', 30);
    expect(ok.user).toEqual({
      id: '1',
      username: 'emilys',
      displayName: 'Emily Johnson',
    });
    expect(ok.session.accessToken).toBe('local-session-1-1700000000000');
    expect(ok.session.refreshToken).toBe('local-refresh-1');

    let badCreds: unknown;
    try {
      await api.login('emilys', 'wrongpass', 30);
    } catch (err) {
      badCreds = err;
    }
    expect(isAppError(badCreds)).toBe(true);
    if (isAppError(badCreds)) {
      expect(badCreds.code).toBe('AUTH_INVALID_CREDENTIALS');
    }

    const refreshed = await api.refresh('local-refresh-1', 30);
    expect(refreshed).toEqual({
      accessToken: 'local-session-1-1700000000000',
      refreshToken: 'local-refresh-1',
      expiresAt: 1700000000000 + 30 * 60_000,
    });

    let badRefresh: unknown;
    try {
      await api.refresh('local-refresh-999', 30);
    } catch (err) {
      badRefresh = err;
    }
    expect(isAppError(badRefresh)).toBe(true);
    if (isAppError(badRefresh)) {
      expect(badRefresh.code).toBe('AUTH_EXPIRED');
    }
    expect(fakeFetch.calls).toHaveLength(0);
  });

  it('createLocalAuthApi autentica, refresca y valida me() 100 % en el dispositivo contra users_v1', async () => {
    const kv = new FakeKeyValueStore();
    const storage = createTaskStorage(kv);
    const localApi = createLocalAuthApi({ taskStorage: storage, clock });

    const loginRes = await localApi.login('emilys', 'emilyspass');
    expect(loginRes.user.username).toBe('emilys');

    const meRes = await localApi.me(loginRes.session.accessToken);
    expect(meRes).toEqual(loginRes.user);

    let badLogin: unknown;
    try {
      await localApi.login('emilys', 'wrongpass');
    } catch (err) {
      badLogin = err;
    }
    expect(isAppError(badLogin) && badLogin.code).toBe(
      'AUTH_INVALID_CREDENTIALS'
    );

    let badRefreshPrefix: unknown;
    try {
      await localApi.refresh('invalid-prefix');
    } catch (err) {
      badRefreshPrefix = err;
    }
    expect(isAppError(badRefreshPrefix) && badRefreshPrefix.code).toBe(
      'AUTH_EXPIRED'
    );

    let missingAccountRefresh: unknown;
    try {
      await localApi.refresh('local-refresh-missing');
    } catch (err) {
      missingAccountRefresh = err;
    }
    expect(
      isAppError(missingAccountRefresh) && missingAccountRefresh.code
    ).toBe('AUTH_EXPIRED');

    let badMe: unknown;
    try {
      await localApi.me('invalid-token');
    } catch (err) {
      badMe = err;
    }
    expect(isAppError(badMe) && badMe.code).toBe('AUTH_EXPIRED');
  });
});
