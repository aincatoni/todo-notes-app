import { CameraPickerResult, CameraPort } from '../../ports/camera';

export class FakeCamera implements CameraPort {
  private nextCameraResult: CameraPickerResult = {
    canceled: true,
    assets: null,
  };
  private nextGalleryResult: CameraPickerResult = {
    canceled: true,
    assets: null,
  };
  private cameraError: Error | null = null;
  private galleryError: Error | null = null;

  public takePhotoCalls = 0;
  public pickFromGalleryCalls = 0;

  setNextCameraResult(result: CameraPickerResult): void {
    this.nextCameraResult = result;
    this.cameraError = null;
  }

  setNextGalleryResult(result: CameraPickerResult): void {
    this.nextGalleryResult = result;
    this.galleryError = null;
  }

  setCameraError(error: Error | null): void {
    this.cameraError = error;
  }

  setGalleryError(error: Error | null): void {
    this.galleryError = error;
  }

  async takePhoto(): Promise<CameraPickerResult> {
    this.takePhotoCalls += 1;
    if (this.cameraError) {
      throw this.cameraError;
    }
    return this.nextCameraResult;
  }

  async pickFromGallery(): Promise<CameraPickerResult> {
    this.pickFromGalleryCalls += 1;
    if (this.galleryError) {
      throw this.galleryError;
    }
    return this.nextGalleryResult;
  }
}
