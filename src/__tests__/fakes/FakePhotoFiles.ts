import { PhotoFiles } from '../../ports/photoFiles';

export class FakePhotoFiles implements PhotoFiles {
  private readonly files = new Map<string, string>();
  public readonly deletedUris: string[] = [];

  seed(uri: string, sourceUri = 'seed'): void {
    this.files.set(uri, sourceUri);
  }

  async copy(fromUri: string, toRelativePath: string): Promise<string> {
    const normalized = toRelativePath.replace(/^\/+/, '');
    const destUri = `file:///document/${normalized}`;
    this.files.set(destUri, fromUri);
    return destUri;
  }

  async delete(uri: string): Promise<void> {
    this.files.delete(uri);
    this.deletedUris.push(uri);
  }

  async exists(uri: string): Promise<boolean> {
    return this.files.has(uri);
  }

  listUris(): string[] {
    return Array.from(this.files.keys());
  }
}
