import * as SecureStoreLib from 'expo-secure-store';
import { SecureStore } from '../ports/secureStore';

export const secureSessionStore: SecureStore = {
  async get(key: string): Promise<string | null> {
    return await SecureStoreLib.getItemAsync(key);
  },

  async set(key: string, value: string): Promise<void> {
    await SecureStoreLib.setItemAsync(key, value);
  },

  async remove(key: string): Promise<void> {
    await SecureStoreLib.deleteItemAsync(key);
  },
};
