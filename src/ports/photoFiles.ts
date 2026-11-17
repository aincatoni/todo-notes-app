export interface PhotoFiles {
  copy(fromUri: string, toRelativePath: string): Promise<string>;
  delete(uri: string): Promise<void>;
  exists(uri: string): Promise<boolean>;
}
