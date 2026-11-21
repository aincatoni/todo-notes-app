import { SecureStore } from '../../ports/secureStore';

export class FakeSecureStore implements SecureStore {
  private readonly store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  dump(): Record<string, string> {
    return Object.fromEntries(this.store.entries());
  }

  clear(): void {
    this.store.clear();
  }
}
