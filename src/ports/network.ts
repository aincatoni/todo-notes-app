export interface NetworkPort {
  isOnline(): Promise<boolean>;
  subscribe(cb: (online: boolean) => void): () => void;
}
