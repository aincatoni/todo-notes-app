import { describe, it, expect, beforeEach } from 'bun:test';
import { FakePermissions } from './fakes/FakePermissions';
import { PermissionResource } from '../ports/permissions';
import {
  PERMISSION_RATIONALE_COPY,
  createPermissionService,
} from '../services/permissionService';

describe('permissionService (R22, R23, R24, R25)', () => {
  let fakePort: FakePermissions;
  let rationaleCalls: PermissionResource[];

  beforeEach(() => {
    fakePort = new FakePermissions();
    rationaleCalls = [];
  });

  it('si el permiso ya está concedido, no muestra rationale ni vuelve a pedir al sistema', async () => {
    fakePort.setInitialState('camera', { status: 'granted', canAskAgain: true });
    const service = createPermissionService(fakePort, async (resource) => {
      rationaleCalls.push(resource);
      return true;
    });

    const outcome = await service.ensure('camera');

    expect(outcome).toBe('granted');
    expect(rationaleCalls).toHaveLength(0);
    expect(fakePort.requestCalls).toHaveLength(0);
  });

  it('R22/R23: si está indeterminado, muestra rationale primero y si el usuario acepta solicita al sistema', async () => {
    fakePort.setInitialState('camera', {
      status: 'undetermined',
      canAskAgain: true,
    });
    fakePort.setNextRequestResult('camera', {
      status: 'granted',
      canAskAgain: true,
    });

    const service = createPermissionService(fakePort, async (resource) => {
      rationaleCalls.push(resource);
      return true;
    });

    const outcome = await service.ensure('camera');

    expect(outcome).toBe('granted');
    expect(rationaleCalls).toEqual(['camera']);
    expect(fakePort.requestCalls).toHaveLength(1);
    expect(fakePort.requestCalls[0].resource).toBe('camera');
  });

  it('R23: si el usuario cancela el rationale, no llama al diálogo del sistema y retorna denied', async () => {
    fakePort.setInitialState('mediaLibrary', {
      status: 'undetermined',
      canAskAgain: true,
    });

    const service = createPermissionService(fakePort, async (resource) => {
      rationaleCalls.push(resource);
      return false;
    });

    const outcome = await service.ensure('mediaLibrary');

    expect(outcome).toBe('denied');
    expect(rationaleCalls).toEqual(['mediaLibrary']);
    expect(fakePort.requestCalls).toHaveLength(0);
  });

  it('si el sistema niega con canAskAgain=true retorna denied y permite reintentar mostrando rationale', async () => {
    fakePort.setInitialState('camera', {
      status: 'undetermined',
      canAskAgain: true,
    });
    fakePort.setNextRequestResult('camera', {
      status: 'denied',
      canAskAgain: true,
    });

    const service = createPermissionService(fakePort, async (resource) => {
      rationaleCalls.push(resource);
      return true;
    });

    const firstOutcome = await service.ensure('camera');
    expect(firstOutcome).toBe('denied');
    expect(rationaleCalls).toEqual(['camera']);

    fakePort.setNextRequestResult('camera', {
      status: 'granted',
      canAskAgain: true,
    });

    const secondOutcome = await service.ensure('camera');
    expect(secondOutcome).toBe('granted');
    expect(rationaleCalls).toEqual(['camera', 'camera']);
    expect(fakePort.requestCalls).toHaveLength(2);
  });

  it('R24: si ya viene denegado con canAskAgain=false retorna blocked sin mostrar rationale ni volver a pedir', async () => {
    fakePort.setInitialState('camera', {
      status: 'denied',
      canAskAgain: false,
    });

    const service = createPermissionService(fakePort, async (resource) => {
      rationaleCalls.push(resource);
      return true;
    });

    const outcome = await service.ensure('camera');

    expect(outcome).toBe('blocked');
    expect(rationaleCalls).toHaveLength(0);
    expect(fakePort.requestCalls).toHaveLength(0);
  });

  it('R24: si el sistema deniega con canAskAgain=false tras el diálogo retorna blocked y openSettings abre Ajustes', async () => {
    fakePort.setInitialState('camera', {
      status: 'undetermined',
      canAskAgain: true,
    });
    fakePort.setNextRequestResult('camera', {
      status: 'denied',
      canAskAgain: false,
    });

    const service = createPermissionService(fakePort, async (resource) => {
      rationaleCalls.push(resource);
      return true;
    });

    const outcome = await service.ensure('camera');
    expect(outcome).toBe('blocked');

    await service.openSettings();
    expect(fakePort.openSettingsCalls).toBe(1);
  });

  it('R24 (Android): si el permiso ya estaba denied y tras volver a solicitarlo al sistema sigue denied, pasa a blocked y no vuelve a preguntar', async () => {
    fakePort.setInitialState('camera', {
      status: 'undetermined',
      canAskAgain: true,
    });
    fakePort.setNextRequestResult('camera', {
      status: 'denied',
      canAskAgain: true,
    });

    const service = createPermissionService(fakePort, async (resource) => {
      rationaleCalls.push(resource);
      return true;
    });

    // Primer rechazo
    expect(await service.ensure('camera')).toBe('denied');
    expect(rationaleCalls).toEqual(['camera']);
    expect(fakePort.requestCalls).toHaveLength(1);

    // Segundo rechazo consecutivo aunque el sistema aún reporte canAskAgain=true
    fakePort.setNextRequestResult('camera', {
      status: 'denied',
      canAskAgain: true,
    });
    expect(await service.ensure('camera')).toBe('blocked');
    expect(rationaleCalls).toEqual(['camera', 'camera']);
    expect(fakePort.requestCalls).toHaveLength(2);

    // Tercer intento ya queda bloqueado sin mostrar rationale ni volver a pedir
    expect(await service.ensure('camera')).toBe('blocked');
    expect(rationaleCalls).toEqual(['camera', 'camera']);
    expect(fakePort.requestCalls).toHaveLength(2);
    expect(await service.getStatus('camera')).toEqual({
      status: 'denied',
      canAskAgain: false,
    });
  });

  it('R24 (Expo Go Android): dos rechazos con status=undetermined y denialCounts compartido entre instancias pasan a blocked', async () => {
    const sharedDenialCounts = new Map<PermissionResource, number>();
    fakePort.setInitialState('location', {
      status: 'undetermined',
      canAskAgain: true,
    });

    const firstService = createPermissionService(
      fakePort,
      async (resource) => {
        rationaleCalls.push(resource);
        return true;
      },
      sharedDenialCounts
    );

    // Primer rechazo donde Android/Expo Go aún devuelve undetermined
    fakePort.setNextRequestResult('location', {
      status: 'undetermined',
      canAskAgain: true,
    });
    expect(await firstService.ensure('location')).toBe('denied');
    expect(await firstService.getStatus('location')).toEqual({
      status: 'denied',
      canAskAgain: true,
    });

    // Nueva instancia del servicio (p. ej. al reabrir el modal) conserva el conteo
    const reopenedService = createPermissionService(
      fakePort,
      async (resource) => {
        rationaleCalls.push(resource);
        return true;
      },
      sharedDenialCounts
    );

    // Segundo rechazo pasa a blocked aunque getStatus/request sigan devolviendo undetermined
    fakePort.setNextRequestResult('location', {
      status: 'undetermined',
      canAskAgain: true,
    });
    expect(await reopenedService.ensure('location')).toBe('blocked');
    expect(rationaleCalls).toEqual(['location', 'location']);

    // Tercer intento retorna blocked directo sin mostrar rationale ni llamar al sistema
    expect(await reopenedService.ensure('location')).toBe('blocked');
    expect(rationaleCalls).toEqual(['location', 'location']);
    expect(fakePort.requestCalls).toHaveLength(2);
    expect(await reopenedService.getStatus('location')).toEqual({
      status: 'denied',
      canAskAgain: false,
    });

    // También si alguien cancela el rationale dos veces tras un rechazo previo
    fakePort.setInitialState('camera', {
      status: 'undetermined',
      canAskAgain: true,
    });
    const cancelService = createPermissionService(
      fakePort,
      async () => false,
      sharedDenialCounts
    );
    expect(await cancelService.ensure('camera')).toBe('denied');
    expect(await cancelService.ensure('camera')).toBe('blocked');
  });

  it('R25: ubicación solicita únicamente permiso en primer plano (scope=foreground)', async () => {
    fakePort.setInitialState('location', {
      status: 'undetermined',
      canAskAgain: true,
    });
    fakePort.setNextRequestResult('location', {
      status: 'granted',
      canAskAgain: true,
    });

    const service = createPermissionService(fakePort, async () => true);

    const outcome = await service.ensure('location');
    const current = await service.getStatus('location');

    expect(outcome).toBe('granted');
    expect(current.status).toBe('granted');
    expect(fakePort.getStatusCalls[0]).toEqual({
      resource: 'location',
      options: { scope: 'foreground' },
    });
    expect(fakePort.requestCalls[0]).toEqual({
      resource: 'location',
      options: { scope: 'foreground' },
    });
    await expect(
      fakePort.request('location', { scope: 'background' })
    ).rejects.toThrow('R25');
  });

  it('PERMISSION_RATIONALE_COPY provee textos en español para todos los recursos', () => {
    const resources: PermissionResource[] = ['camera', 'mediaLibrary', 'location'];
    for (const resource of resources) {
      const copy = PERMISSION_RATIONALE_COPY[resource];
      expect(copy.title.trim().length).toBeGreaterThan(3);
      expect(copy.description.trim().length).toBeGreaterThan(10);
      expect(copy.blockedDescription.trim().length).toBeGreaterThan(10);
    }
  });
});
