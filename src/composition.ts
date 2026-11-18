import { asyncStorageStore } from './adapters/asyncStorageStore';
import { expoPermissions } from './adapters/expoPermissions';
import { createTaskStorage } from './storage/taskStorage';

export const taskStorage = createTaskStorage(asyncStorageStore);
export const permissionPort = expoPermissions;
