import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import {
  PermissionPort,
  PermissionRequestOptions,
  PermissionResource,
  SystemPermissionState,
} from '../ports/permissions';

function mapPermissionResponse(response: {
  status: string;
  canAskAgain: boolean;
}): SystemPermissionState {
  if (response.status === 'granted') {
    return { status: 'granted', canAskAgain: response.canAskAgain };
  }
  if (response.status === 'denied') {
    return { status: 'denied', canAskAgain: response.canAskAgain };
  }
  return { status: 'undetermined', canAskAgain: response.canAskAgain };
}

function assertForegroundLocation(
  resource: PermissionResource,
  options?: PermissionRequestOptions
): void {
  if (resource === 'location' && options?.scope === 'background') {
    throw new Error(
      'R25: El permiso de ubicación en segundo plano está prohibido'
    );
  }
}

async function isGrantedInAndroidOs(
  resource: PermissionResource
): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    if (resource === 'camera') {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    }

    if (resource === 'mediaLibrary') {
      const candidates = [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VISUAL_USER_SELECTED,
      ].filter(Boolean);

      const checks = await Promise.all(
        candidates.map((perm) => PermissionsAndroid.check(perm))
      );
      return checks.some(Boolean);
    }

    const [fine, coarse] = await Promise.all([
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      ),
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      ),
    ]);
    return fine || coarse;
  } catch {
    return false;
  }
}

async function getRawPermissionStatus(
  resource: PermissionResource
): Promise<SystemPermissionState> {
  if (resource === 'camera') {
    return mapPermissionResponse(await ImagePicker.getCameraPermissionsAsync());
  }
  if (resource === 'mediaLibrary') {
    return mapPermissionResponse(
      await ImagePicker.getMediaLibraryPermissionsAsync()
    );
  }
  return mapPermissionResponse(await Location.getForegroundPermissionsAsync());
}

async function requestRawPermission(
  resource: PermissionResource
): Promise<SystemPermissionState> {
  if (resource === 'camera') {
    return mapPermissionResponse(
      await ImagePicker.requestCameraPermissionsAsync()
    );
  }
  if (resource === 'mediaLibrary') {
    return mapPermissionResponse(
      await ImagePicker.requestMediaLibraryPermissionsAsync()
    );
  }
  return mapPermissionResponse(
    await Location.requestForegroundPermissionsAsync()
  );
}

const blockedInSession = new Set<PermissionResource>();

export const expoPermissions: PermissionPort = {
  async getStatus(
    resource: PermissionResource,
    options?: PermissionRequestOptions
  ): Promise<SystemPermissionState> {
    assertForegroundLocation(resource, options);

    const mapped = await getRawPermissionStatus(resource);
    if (mapped.status === 'granted' || (await isGrantedInAndroidOs(resource))) {
      blockedInSession.delete(resource);
      return { status: 'granted', canAskAgain: true };
    }

    if (mapped.status === 'denied' && blockedInSession.has(resource)) {
      return { status: 'denied', canAskAgain: false };
    }

    return mapped;
  },

  async request(
    resource: PermissionResource,
    options?: PermissionRequestOptions
  ): Promise<SystemPermissionState> {
    assertForegroundLocation(resource, options);

    if (await isGrantedInAndroidOs(resource)) {
      await requestRawPermission(resource);
      blockedInSession.delete(resource);
      return { status: 'granted', canAskAgain: true };
    }

    const previous = await this.getStatus(resource, options);
    const mapped = await requestRawPermission(resource);

    if (mapped.status === 'granted' || (await isGrantedInAndroidOs(resource))) {
      blockedInSession.delete(resource);
      return { status: 'granted', canAskAgain: true };
    }

    if (
      mapped.status === 'denied' &&
      (!mapped.canAskAgain || previous.status === 'denied')
    ) {
      blockedInSession.add(resource);
      return { status: 'denied', canAskAgain: false };
    }

    return mapped;
  },

  async openSettings(): Promise<void> {
    await Linking.openSettings();
  },
};
