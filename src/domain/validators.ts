import { RemoteTodoDto } from '../ports/api';

export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; error: string };

const TITLE_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 500;
const PASSWORD_MIN_LENGTH = 6;
const USERNAME_PATTERN = /^[a-zA-Z0-9._@-]{3,30}$/;

export function validateTitle(title: string): ValidationResult<string> {
  const trimmed = title.trim();
  if (trimmed.length === 0 || trimmed.length > TITLE_MAX_LENGTH) {
    return {
      valid: false,
      error: 'Ingresa un título (máx. 80 caracteres)',
    };
  }
  return { valid: true, value: trimmed };
}

export function validateDescription(
  description: string
): ValidationResult<string> {
  const trimmed = description.trim();
  if (trimmed.length > DESCRIPTION_MAX_LENGTH) {
    return {
      valid: false,
      error: 'Máximo 500 caracteres',
    };
  }
  return { valid: true, value: trimmed };
}

export function validateUsername(username: string): ValidationResult<string> {
  if (!USERNAME_PATTERN.test(username)) {
    return { valid: false, error: 'Usuario inválido' };
  }
  return { valid: true, value: username };
}

export function validatePassword(password: string): ValidationResult<string> {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: 'Mínimo 6 caracteres' };
  }
  return { valid: true, value: password };
}

export function validateCoordinates(
  latitude: number,
  longitude: number
): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function validateRemoteTodo(
  raw: unknown
): { valid: true; value: RemoteTodoDto } | { valid: false } {
  if (typeof raw !== 'object' || raw === null) {
    return { valid: false };
  }

  const candidate = raw as Record<string, unknown>;
  const { id, todo, completed, userId } = candidate;

  if (typeof id !== 'number' || !Number.isFinite(id)) {
    return { valid: false };
  }
  if (typeof todo !== 'string') {
    return { valid: false };
  }
  if (typeof completed !== 'boolean') {
    return { valid: false };
  }
  if (
    userId !== undefined &&
    (typeof userId !== 'number' || !Number.isFinite(userId))
  ) {
    return { valid: false };
  }

  const normalizedTitle = todo.trim().slice(0, TITLE_MAX_LENGTH);
  if (normalizedTitle.length === 0) {
    return { valid: false };
  }

  const dto: RemoteTodoDto = {
    id,
    todo: normalizedTitle,
    completed,
  };
  if (userId !== undefined) {
    dto.userId = userId;
  }

  return { valid: true, value: dto };
}
