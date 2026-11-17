import { AppError, AppErrorAction, AppErrorCode } from '../types/errors';

export interface ErrorCatalogEntry {
  message: string;
  action: AppErrorAction;
}

export const ERROR_CATALOG: Record<AppErrorCode, ErrorCatalogEntry> = {
  PERMISSION_DENIED: {
    message: 'Permiso denegado. Puedes intentar nuevamente o usar otra opción.',
    action: 'inform',
  },
  PERMISSION_BLOCKED: {
    message:
      'El permiso fue bloqueado. Ábrelo desde los ajustes del dispositivo para continuar.',
    action: 'open_settings',
  },
  CAMERA_UNAVAILABLE: {
    message:
      'La cámara no está disponible en este dispositivo. Puedes elegir una foto de la galería.',
    action: 'inform',
  },
  CAPTURE_CANCELLED: {
    message: 'Captura de foto cancelada.',
    action: 'ignore',
  },
  LOCATION_UNAVAILABLE: {
    message:
      'La ubicación está desactivada o no disponible. La tarea se guardará sin coordenadas.',
    action: 'inform',
  },
  LOCATION_TIMEOUT: {
    message:
      'No se pudo obtener la ubicación a tiempo. La tarea se guardará sin coordenadas.',
    action: 'retry',
  },
  NETWORK_OFFLINE: {
    message:
      'Sin conexión a internet. Los cambios quedarán guardados para sincronizarse luego.',
    action: 'retry',
  },
  NETWORK_TIMEOUT: {
    message: 'La solicitud tardó demasiado en responder. Inténtalo nuevamente.',
    action: 'retry',
  },
  AUTH_INVALID_CREDENTIALS: {
    message: 'Usuario o contraseña incorrectos.',
    action: 'inform',
  },
  AUTH_EXPIRED: {
    message: 'Tu sesión ha expirado. Inicia sesión nuevamente para continuar.',
    action: 'relogin',
  },
  API_VALIDATION: {
    message: 'El servidor rechazó los datos enviados. Revisa la tarea.',
    action: 'inform',
  },
  API_SERVER: {
    message: 'El servidor presentó un problema temporal. Reintenta más tarde.',
    action: 'retry',
  },
  API_BAD_RESPONSE: {
    message: 'La respuesta del servidor tuvo un formato inesperado.',
    action: 'retry',
  },
};

export const ALL_ERROR_CODES = Object.keys(ERROR_CATALOG) as AppErrorCode[];

export class AppDomainError extends Error implements AppError {
  public readonly code: AppErrorCode;
  public readonly action: AppErrorAction;
  public override readonly cause?: unknown;

  constructor(code: AppErrorCode, cause?: unknown) {
    const entry = ERROR_CATALOG[code];
    super(entry.message);
    this.name = 'AppDomainError';
    this.code = code;
    this.action = entry.action;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export function createAppError(code: AppErrorCode, cause?: unknown): AppError {
  return new AppDomainError(code, cause);
}

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<AppError>;
  return (
    typeof candidate.code === 'string' &&
    Object.prototype.hasOwnProperty.call(ERROR_CATALOG, candidate.code) &&
    typeof candidate.message === 'string' &&
    typeof candidate.action === 'string'
  );
}
