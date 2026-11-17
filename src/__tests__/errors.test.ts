import { describe, it, expect, test } from 'bun:test';
import { AppErrorAction, AppErrorCode } from '../types/errors';
import {
  ALL_ERROR_CODES,
  ERROR_CATALOG,
  createAppError,
  isAppError,
} from '../domain/errors';

const EXPECTED_CODES: AppErrorCode[] = [
  'PERMISSION_DENIED',
  'PERMISSION_BLOCKED',
  'CAMERA_UNAVAILABLE',
  'CAPTURE_CANCELLED',
  'LOCATION_UNAVAILABLE',
  'LOCATION_TIMEOUT',
  'NETWORK_OFFLINE',
  'NETWORK_TIMEOUT',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_EXPIRED',
  'API_VALIDATION',
  'API_SERVER',
  'API_BAD_RESPONSE',
];

const VALID_ACTIONS: AppErrorAction[] = [
  'retry',
  'relogin',
  'open_settings',
  'ignore',
  'inform',
];

describe('Errores de dominio (Domain §7)', () => {
  it('contiene exactamente los 13 códigos de AppErrorCode en ALL_ERROR_CODES', () => {
    expect(ALL_ERROR_CODES).toHaveLength(13);
    expect([...ALL_ERROR_CODES].sort()).toEqual([...EXPECTED_CODES].sort());
  });

  test.each(EXPECTED_CODES)(
    'código %s tiene mensaje en español, acción válida y no filtra detalles internos',
    (code) => {
      const secretCause = new Error('Bearer super-secret-token stacktrace');
      const err = createAppError(code, secretCause);

      expect(err.code).toBe(code);
      expect(typeof err.message).toBe('string');
      expect(err.message.trim().length).toBeGreaterThan(5);
      expect(VALID_ACTIONS).toContain(err.action);
      expect(err.message).not.toContain('super-secret-token');
      expect(err.message).not.toContain('Bearer');
      expect(err.cause).toBe(secretCause);
      expect(ERROR_CATALOG[code]).toEqual({
        message: err.message,
        action: err.action,
      });
    }
  );

  it('asigna acciones específicas esperadas para flujos clave', () => {
    expect(createAppError('PERMISSION_BLOCKED').action).toBe('open_settings');
    expect(createAppError('AUTH_EXPIRED').action).toBe('relogin');
    expect(createAppError('CAPTURE_CANCELLED').action).toBe('ignore');
    expect(createAppError('NETWORK_OFFLINE').action).toBe('retry');
  });

  it('isAppError distingue correctamente AppError de otros valores', () => {
    const appErr = createAppError('NETWORK_TIMEOUT');
    expect(isAppError(appErr)).toBe(true);
    expect(isAppError(new Error('normal'))).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError({ code: 'UNKNOWN_CODE', message: 'x', action: 'inform' })).toBe(
      false
    );
  });
});
