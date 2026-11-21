import { asyncStorageStore } from './adapters/asyncStorageStore';
import { expoCamera } from './adapters/expoCamera';
import { expoLocation } from './adapters/expoLocation';
import { expoNetwork } from './adapters/expoNetwork';
import { expoPermissions } from './adapters/expoPermissions';
import { fileSystemPhotos } from './adapters/fileSystemPhotos';
import { createHttpClient } from './adapters/http';
import { secureSessionStore } from './adapters/secureSessionStore';
import { systemClock } from './adapters/systemClock';
import { createLocalAuthApi } from './api/authApi';
import { IdGenerator } from './ports/idGenerator';
import { AuthService, createAuthService } from './services/authService';
import { createTaskStorage } from './storage/taskStorage';

export const taskStorage = createTaskStorage(asyncStorageStore);
export const secureStore = secureSessionStore;
export const networkPort = expoNetwork;
export const permissionPort = expoPermissions;
export const cameraPort = expoCamera;
export const photoFilesPort = fileSystemPhotos;
export const locationPort = expoLocation;
export const clock = systemClock;

const accountIdGenerator: IdGenerator = {
  next: () => `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
};

let authServiceInstance: AuthService;

export const httpClient = createHttpClient({
  network: networkPort,
  clock,
  ownHosts: ['dummyjson.com'],
  getAccessToken: () => authServiceInstance.getAccessToken(),
  onUnauthorized: () => authServiceInstance.handleUnauthorized(),
});

export const authApi = createLocalAuthApi({
  taskStorage,
  clock,
});

authServiceInstance = createAuthService({
  authApi,
  secureStore,
  taskStorage,
  network: networkPort,
  clock,
  idGenerator: accountIdGenerator,
});

export const authService = authServiceInstance;
