export type PermissionResource = 'camera' | 'mediaLibrary' | 'location';

export type SystemPermissionStatus = 'granted' | 'denied' | 'undetermined';

export type PermissionOutcome = 'granted' | 'denied' | 'blocked';

export type LocationScope = 'foreground' | 'background';

export interface PermissionRequestOptions {
  scope?: LocationScope;
}

export interface SystemPermissionState {
  status: SystemPermissionStatus;
  canAskAgain: boolean;
}

export interface PermissionPort {
  getStatus(
    resource: PermissionResource,
    options?: PermissionRequestOptions
  ): Promise<SystemPermissionState>;
  request(
    resource: PermissionResource,
    options?: PermissionRequestOptions
  ): Promise<SystemPermissionState>;
  openSettings(): Promise<void>;
}
