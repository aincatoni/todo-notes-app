import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyValueStore } from '../ports/storage';

export const asyncStorageStore: KeyValueStore = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key),
};
