import { asyncStorageStore } from './adapters/asyncStorageStore';
import { createTaskStorage } from './storage/taskStorage';

export const taskStorage = createTaskStorage(asyncStorageStore);
