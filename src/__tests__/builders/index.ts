import { Session } from '../../types/auth';
import { GeoLocation, Task } from '../../types/task';

export function aTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    userId: '1',
    title: 'Tarea de prueba',
    description: 'Descripción de prueba',
    completed: false,
    createdAt: 1700000000000,
    photo: null,
    location: null,
    weather: null,
    remoteId: null,
    syncStatus: 'pending',
    source: 'local',
    deletedAt: null,
    ...overrides,
  };
}

export function aLocation(overrides: Partial<GeoLocation> = {}): GeoLocation {
  return {
    latitude: -33.4489,
    longitude: -70.6693,
    accuracy: 15,
    capturedAt: 1700000000000,
    ...overrides,
  };
}

export function aSession(overrides: Partial<Session> = {}): Session {
  return {
    userId: '1',
    username: 'emilys',
    accessToken: 'fake-access-token',
    refreshToken: 'fake-refresh-token',
    expiresAt: 1700003600000,
    ...overrides,
  };
}
