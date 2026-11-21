import { NetworkPort } from '../../ports/network';

export class FakeNetwork implements NetworkPort {
  private online: boolean;
  private readonly listeners = new Set<(online: boolean) => void>();

  constructor(initialOnline: boolean = true) {
    this.online = initialOnline;
  }

  async isOnline(): Promise<boolean> {
    return this.online;
  }

  subscribe(cb: (online: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  setOnline(online: boolean): void {
    this.online = online;
    for (const listener of this.listeners) {
      listener(online);
    }
  }
}
