import { createAppError, isAppError } from '../domain/errors';
import { validateCoordinates } from '../domain/validators';
import { Clock } from '../ports/clock';
import { LocationPort, RawCoordinates } from '../ports/location';
import { PermissionOutcome, PermissionResource } from '../ports/permissions';
import { AppError } from '../types/errors';
import { GeoLocation } from '../types/task';

export const LOCATION_TIMEOUT_MS = 10_000;
export const LOW_ACCURACY_THRESHOLD_METERS = 100;

export interface LocationPermissions {
  ensure(resource: PermissionResource): Promise<PermissionOutcome>;
}

export interface LocationServiceDeps {
  locationPort: LocationPort;
  permissions: LocationPermissions;
  clock: Clock;
}

export interface LocationCaptureResult {
  location: GeoLocation | null;
  error: AppError | null;
}

export interface LocationService {
  captureCurrentLocation(): Promise<GeoLocation>;
  captureForNewTask(): Promise<LocationCaptureResult>;
}

export function isLowAccuracy(
  location: GeoLocation | null | undefined
): boolean {
  if (!location || location.accuracy === null) {
    return false;
  }
  return (
    Number.isFinite(location.accuracy) &&
    location.accuracy > LOW_ACCURACY_THRESHOLD_METERS
  );
}

export function formatCoordinates(location: GeoLocation): string {
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

export function buildMapsUrl(
  location: GeoLocation,
  platformOs?: string
): string {
  const { latitude, longitude } = location;
  if (platformOs === 'ios') {
    return `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(
      'Ubicación de tarea'
    )}`;
  }
  if (platformOs === 'android') {
    return `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function createLocationService(
  deps: LocationServiceDeps
): LocationService {
  const { locationPort, permissions, clock } = deps;

  const captureCurrentLocation = async (): Promise<GeoLocation> => {
    const outcome = await permissions.ensure('location');
    if (outcome === 'blocked') {
      throw createAppError('PERMISSION_BLOCKED');
    }
    if (outcome === 'denied') {
      throw createAppError('PERMISSION_DENIED');
    }

    const enabled = await locationPort.servicesEnabled();
    if (!enabled) {
      throw createAppError('LOCATION_UNAVAILABLE');
    }

    const positionPromise: Promise<RawCoordinates> = locationPort
      .getCurrentPosition()
      .catch((err) => {
        throw createAppError('LOCATION_UNAVAILABLE', err);
      });

    const timeoutPromise: Promise<never> = clock
      .sleep(LOCATION_TIMEOUT_MS)
      .then(() => {
        throw createAppError('LOCATION_TIMEOUT');
      });

    const raw = await Promise.race([positionPromise, timeoutPromise]);

    if (!validateCoordinates(raw.latitude, raw.longitude)) {
      throw createAppError('LOCATION_UNAVAILABLE');
    }

    const accuracy =
      typeof raw.accuracy === 'number' &&
      Number.isFinite(raw.accuracy) &&
      raw.accuracy >= 0
        ? raw.accuracy
        : null;

    return {
      latitude: raw.latitude,
      longitude: raw.longitude,
      accuracy,
      capturedAt: clock.now(),
    };
  };

  return {
    captureCurrentLocation,

    async captureForNewTask(): Promise<LocationCaptureResult> {
      try {
        const location = await captureCurrentLocation();
        return { location, error: null };
      } catch (err) {
        return {
          location: null,
          error: isAppError(err)
            ? err
            : createAppError('LOCATION_UNAVAILABLE', err),
        };
      }
    },
  };
}
