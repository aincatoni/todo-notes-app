import { createAppError } from '../domain/errors';
import { CameraPickerResult, CameraPort, PickedPhotoAsset } from '../ports/camera';
import { Clock } from '../ports/clock';
import { PermissionOutcome, PermissionResource } from '../ports/permissions';
import { PhotoFiles } from '../ports/photoFiles';
import { Photo } from '../types/task';

export interface PhotoPermissions {
  ensure(resource: PermissionResource): Promise<PermissionOutcome>;
}

export interface PhotoServiceDeps {
  camera: CameraPort;
  photoFiles: PhotoFiles;
  permissions: PhotoPermissions;
  clock: Clock;
}

export interface CapturePhotoParams {
  userId: string;
  taskId: string;
  previousPhoto?: Photo | null;
}

export interface PhotoService {
  captureFromCamera(params: CapturePhotoParams): Promise<Photo>;
  pickFromGallery(params: CapturePhotoParams): Promise<Photo>;
  removePhoto(photo: Photo | null | undefined): Promise<void>;
}

function extractValidAsset(result: CameraPickerResult): PickedPhotoAsset {
  if (result.canceled) {
    throw createAppError('CAPTURE_CANCELLED');
  }

  const first = Array.isArray(result.assets) ? result.assets[0] : undefined;
  if (
    !first ||
    typeof first.uri !== 'string' ||
    first.uri.trim().length === 0 ||
    typeof first.width !== 'number' ||
    !Number.isFinite(first.width) ||
    first.width <= 0 ||
    typeof first.height !== 'number' ||
    !Number.isFinite(first.height) ||
    first.height <= 0
  ) {
    throw createAppError('CAMERA_UNAVAILABLE');
  }

  return first;
}

export function createPhotoService(deps: PhotoServiceDeps): PhotoService {
  const { camera, photoFiles, permissions, clock } = deps;

  const acquirePhoto = async (
    takenWith: 'camera' | 'gallery',
    params: CapturePhotoParams
  ): Promise<Photo> => {
    const resource: PermissionResource =
      takenWith === 'camera' ? 'camera' : 'mediaLibrary';
    const outcome = await permissions.ensure(resource);

    if (outcome === 'blocked') {
      throw createAppError('PERMISSION_BLOCKED');
    }
    if (outcome === 'denied') {
      throw createAppError('PERMISSION_DENIED');
    }

    let rawResult: CameraPickerResult;
    try {
      rawResult =
        takenWith === 'camera'
          ? await camera.takePhoto()
          : await camera.pickFromGallery();
    } catch (err) {
      throw createAppError('CAMERA_UNAVAILABLE', err);
    }

    const asset = extractValidAsset(rawResult);
    const relativePath = `photos/${params.userId}/${params.taskId}-${clock.now()}.jpg`;
    const destUri = await photoFiles.copy(asset.uri, relativePath);

    if (params.previousPhoto?.uri && params.previousPhoto.uri !== destUri) {
      await photoFiles.delete(params.previousPhoto.uri);
    }

    return {
      uri: destUri,
      width: asset.width,
      height: asset.height,
      takenWith,
    };
  };

  return {
    captureFromCamera(params: CapturePhotoParams): Promise<Photo> {
      return acquirePhoto('camera', params);
    },

    pickFromGallery(params: CapturePhotoParams): Promise<Photo> {
      return acquirePhoto('gallery', params);
    },

    async removePhoto(photo: Photo | null | undefined): Promise<void> {
      if (!photo?.uri) {
        return;
      }
      await photoFiles.delete(photo.uri);
    },
  };
}
