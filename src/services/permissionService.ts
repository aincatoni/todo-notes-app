import {
  PermissionOutcome,
  PermissionPort,
  PermissionRequestOptions,
  PermissionResource,
  SystemPermissionState,
} from '../ports/permissions';

export interface PermissionCopy {
  title: string;
  description: string;
  blockedDescription: string;
}

export const PERMISSION_RATIONALE_COPY: Record<
  PermissionResource,
  PermissionCopy
> = {
  camera: {
    title: 'Permiso de cámara',
    description:
      'Necesitamos acceso a tu cámara para tomar una foto y adjuntarla directamente a la tarea.',
    blockedDescription:
      'El acceso a la cámara está bloqueado. Ábrelo desde los ajustes del dispositivo o elige una imagen de tu galería.',
  },
  mediaLibrary: {
    title: 'Permiso de galería',
    description:
      'Necesitamos acceso a tus fotos para que puedas seleccionar una imagen existente y adjuntarla a la tarea.',
    blockedDescription:
      'El acceso a tu galería está bloqueado. Puedes habilitarlo desde los ajustes del dispositivo.',
  },
  location: {
    title: 'Ubicación al crear la tarea',
    description:
      'Usamos tu ubicación solo mientras usas la app para registrar dónde creaste la tarea.',
    blockedDescription:
      'El permiso de ubicación fue bloqueado. Puedes habilitarlo en ajustes o guardar la tarea sin ubicación.',
  },
};

export type ConfirmRationaleFn = (
  resource: PermissionResource
) => Promise<boolean>;

export interface PermissionService {
  ensure(resource: PermissionResource): Promise<PermissionOutcome>;
  getStatus(resource: PermissionResource): Promise<SystemPermissionState>;
  openSettings(): Promise<void>;
}

function getRequestOptions(
  resource: PermissionResource
): PermissionRequestOptions | undefined {
  return resource === 'location' ? { scope: 'foreground' } : undefined;
}

export function createPermissionService(
  port: PermissionPort,
  confirmRationale: ConfirmRationaleFn,
  denialCounts: Map<PermissionResource, number> = new Map()
): PermissionService {
  return {
    async ensure(resource: PermissionResource): Promise<PermissionOutcome> {
      const options = getRequestOptions(resource);
      const current = await port.getStatus(resource, options);

      if (current.status === 'granted') {
        denialCounts.delete(resource);
        return 'granted';
      }

      const priorDenials =
        denialCounts.get(resource) ?? (current.status === 'denied' ? 1 : 0);

      if ((current.status === 'denied' && !current.canAskAgain) || priorDenials >= 2) {
        denialCounts.set(resource, Math.max(priorDenials, 2));
        return 'blocked';
      }

      const userAccepted = await confirmRationale(resource);
      if (!userAccepted) {
        const nextDenials = priorDenials + 1;
        denialCounts.set(resource, nextDenials);
        return nextDenials >= 2 ? 'blocked' : 'denied';
      }

      const next = await port.request(resource, options);
      if (next.status === 'granted') {
        denialCounts.delete(resource);
        return 'granted';
      }

      const nextDenials = priorDenials + 1;
      if (!next.canAskAgain || current.status === 'denied' || nextDenials >= 2) {
        denialCounts.set(resource, Math.max(nextDenials, 2));
        return 'blocked';
      }

      denialCounts.set(resource, nextDenials);
      return 'denied';
    },

    async getStatus(
      resource: PermissionResource
    ): Promise<SystemPermissionState> {
      const current = await port.getStatus(resource, getRequestOptions(resource));
      if (current.status === 'granted') {
        denialCounts.delete(resource);
        return current;
      }

      const denials = denialCounts.get(resource) ?? 0;
      if ((current.status === 'denied' && !current.canAskAgain) || denials >= 2) {
        return { status: 'denied', canAskAgain: false };
      }

      if (current.status === 'denied' || denials === 1) {
        return { status: 'denied', canAskAgain: true };
      }

      return current;
    },

    async openSettings(): Promise<void> {
      return port.openSettings();
    },
  };
}
