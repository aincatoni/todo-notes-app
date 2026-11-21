import { Directory, File, Paths } from 'expo-file-system';
import { PhotoFiles } from '../ports/photoFiles';

export const fileSystemPhotos: PhotoFiles = {
  async copy(fromUri: string, toRelativePath: string): Promise<string> {
    const segments = toRelativePath.split('/').filter(Boolean);
    const fileName = segments.pop() ?? `photo-${Date.now()}.jpg`;
    const targetDir =
      segments.length > 0
        ? new Directory(Paths.document, ...segments)
        : Paths.document;

    if (!targetDir.exists) {
      targetDir.create({ intermediates: true, idempotent: true });
    }

    const destinationFile = new File(targetDir, fileName);
    if (destinationFile.exists) {
      destinationFile.delete();
    }

    const sourceFile = new File(fromUri);
    await sourceFile.copy(destinationFile);

    return destinationFile.uri;
  },

  async delete(uri: string): Promise<void> {
    try {
      const file = new File(uri);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // Ignorar si el archivo ya fue eliminado o no es accesible
    }
  },

  async exists(uri: string): Promise<boolean> {
    try {
      const file = new File(uri);
      return file.exists;
    } catch {
      return false;
    }
  },
};
