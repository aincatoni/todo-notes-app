export interface PickedPhotoAsset {
  uri: string;
  width: number;
  height: number;
}

export interface CameraPickerResult {
  canceled: boolean;
  assets?: PickedPhotoAsset[] | null;
}

export interface CameraPort {
  takePhoto(): Promise<CameraPickerResult>;
  pickFromGallery(): Promise<CameraPickerResult>;
}
