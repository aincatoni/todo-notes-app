import { asyncStorageStore } from './adapters/asyncStorageStore';
import { expoCamera } from './adapters/expoCamera';
import { expoLocation } from './adapters/expoLocation';
import { expoPermissions } from './adapters/expoPermissions';
import { fileSystemPhotos } from './adapters/fileSystemPhotos';
import { systemClock } from './adapters/systemClock';
import { createTaskStorage } from './storage/taskStorage';

export const taskStorage = createTaskStorage(asyncStorageStore);
export const permissionPort = expoPermissions;
export const cameraPort = expoCamera;
export const photoFilesPort = fileSystemPhotos;
export const locationPort = expoLocation;
export const clock = systemClock;
