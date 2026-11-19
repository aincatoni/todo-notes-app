import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { LocationPort, RawCoordinates } from '../ports/location';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForSingleLocationUpdate(
  timeoutMs: number
): Promise<Location.LocationObject | null> {
  return new Promise((resolve) => {
    let settled = false;
    let subscription: Location.LocationSubscription | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = (location: Location.LocationObject | null) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (subscription) {
        subscription.remove();
        subscription = null;
      }
      resolve(location);
    };

    timer = setTimeout(() => finish(null), timeoutMs);

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 500,
        distanceInterval: 0,
        mayShowUserSettingsDialog: false,
      },
      (location) => {
        finish(location);
      }
    )
      .then((sub) => {
        if (settled) {
          sub.remove();
          return;
        }
        subscription = sub;
      })
      .catch(() => {
        finish(null);
      });
  });
}

export const expoLocation: LocationPort = {
  async servicesEnabled(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        await Location.enableNetworkProviderAsync();
        for (let attempt = 0; attempt < 15; attempt++) {
          if (await Location.hasServicesEnabledAsync()) {
            return true;
          }
          await delay(200);
        }
        return await Location.hasServicesEnabledAsync();
      } catch {
        return await Location.hasServicesEnabledAsync();
      }
    }

    return await Location.hasServicesEnabledAsync();
  },

  async getCurrentPosition(): Promise<RawCoordinates> {
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      if (req.status !== 'granted') {
        throw new Error('Permiso de ubicación en primer plano no concedido.');
      }
    }

    let position: Location.LocationObject | null = null;

    try {
      position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: false,
      });
    } catch {
      position = null;
    }

    if (!position) {
      position = await waitForSingleLocationUpdate(5_000);
    }

    if (!position) {
      try {
        position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          mayShowUserSettingsDialog: false,
        });
      } catch {
        position = null;
      }
    }

    if (!position) {
      try {
        position = await Location.getLastKnownPositionAsync();
      } catch {
        position = null;
      }
    }

    if (!position) {
      throw new Error('No se pudo obtener la ubicación actual.');
    }

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
      timestamp: position.timestamp,
    };
  },
};
