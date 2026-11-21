export type AppErrorCode =
  | 'PERMISSION_DENIED'
  | 'PERMISSION_BLOCKED'
  | 'CAMERA_UNAVAILABLE'
  | 'CAPTURE_CANCELLED'
  | 'LOCATION_UNAVAILABLE'
  | 'LOCATION_TIMEOUT'
  | 'NETWORK_OFFLINE'
  | 'NETWORK_TIMEOUT'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_EXPIRED'
  | 'API_VALIDATION'
  | 'API_SERVER'
  | 'API_BAD_RESPONSE';

export type AppErrorAction =
  | 'retry'
  | 'relogin'
  | 'open_settings'
  | 'ignore'
  | 'inform';

export interface AppError {
  code: AppErrorCode;
  message: string;
  action: AppErrorAction;
  cause?: unknown;
}
