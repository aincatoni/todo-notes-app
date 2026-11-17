export type PermissionResource = 'camera' | 'mediaLibrary' | 'location';

export type SystemPermissionStatus = 'granted' | 'denied' | 'undetermined';

export type PermissionOutcome = 'granted' | 'denied' | 'blocked';

export interface SystemPermissionState {
  status: SystemPermissionStatus;
  canAskAgain: boolean;
}

export interface PermissionPort {
  getStatus(resource: PermissionResource): Promise<SystemPermissionState>;
  request(resource: PermissionResource): Promise<SystemPermissionState>;
  openSettings(): Promise<void>;
}
