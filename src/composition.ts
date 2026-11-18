import { asyncStorageStore } from './adapters/asyncStorageStore';
import { expoCamera } from './adapters/expoCamera';
import { expoPermissions } from './adapters/expoPermissions';
import { fileSystemPhotos } from './adapters/fileSystemPhotos';
import { systemClock } from './adapters/systemClock';
import { createTaskStorage } from './storage/taskStorage';

export const taskStorage = createTaskStorage(asyncStorageStore);
export const permissionPort = expoPermissions;
export const cameraPort = expoCamera;
export const photoFilesPort = fileSystemPhotos;
export const clock = systemClock;
