import { KeyValueStore } from '../../ports/storage';

export class FakeKeyValueStore implements KeyValueStore {
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

  snapshot(): Record<string, string> {
    return Object.fromEntries(this.store.entries());
  }

  clear(): void {
    this.store.clear();
  }
}
