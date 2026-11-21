import * as ImagePicker from 'expo-image-picker';
import { CameraPickerResult, CameraPort } from '../ports/camera';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsEditing: false,
};

function mapPickerResult(
  result: ImagePicker.ImagePickerResult
): CameraPickerResult {
  if (result.canceled || !result.assets) {
    return { canceled: Boolean(result.canceled), assets: null };
  }

  return {
    canceled: false,
    assets: result.assets.map((asset) => ({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
    })),
  };
}

export const expoCamera: CameraPort = {
  async takePhoto(): Promise<CameraPickerResult> {
    return mapPickerResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
  },

  async pickFromGallery(): Promise<CameraPickerResult> {
    return mapPickerResult(
      await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS)
    );
  },
};
