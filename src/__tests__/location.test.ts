import { describe, it, expect, beforeEach, test } from 'bun:test';
import { FakeLocation } from './fakes/FakeLocation';
import { FakePermissions } from './fakes/FakePermissions';
import { FakeClock } from './fakes/FakeClock';
import { SeqIdGenerator } from './fakes/SeqIdGenerator';
import { aLocation, aTask } from './builders';
import { createPermissionService } from '../services/permissionService';
import {
  LOCATION_TIMEOUT_MS,
  LOW_ACCURACY_THRESHOLD_METERS,
  buildMapsUrl,
  createLocationService,
  formatCoordinates,
  isLowAccuracy,
} from '../services/locationService';
import {
  applyTaskLocation,
  enrichTaskLocationAsync,
} from '../services/taskEnricher';
import { isAppError } from '../domain/errors';
import {
  deleteTaskById,
  toggleTaskStatus,
  updateTask,
  validateAndCreateTask,
} from '../domain/taskRules';
import { Task } from '../types/task';

describe('locationService & taskEnricher (R6, R8, R25, Fase 4)', () => {
  let fakeLocation: FakeLocation;
  let fakePermissions: FakePermissions;
  let fakeClock: FakeClock;

  beforeEach(() => {
    fakeLocation = new FakeLocation();
    fakePermissions = new FakePermissions();
    fakeClock = new FakeClock(1700000000000);
    fakeClock.useManualTimers(true);

    fakePermissions.setInitialState('location', {
      status: 'granted',
      canAskAgain: true,
    });
  });

  function buildService(rationaleAccepted = true) {
    const permissions = createPermissionService(
      fakePermissions,
      async () => rationaleAccepted
    );
    return createLocationService({
      locationPort: fakeLocation,
      permissions,
      clock: fakeClock,
    });
  }

  it('captura lectura válida con accuracy y capturedAt del reloj', async () => {
    fakeLocation.setNextPosition({
      latitude: -33.4489,
      longitude: -70.6693,
      accuracy: 12.5,
      timestamp: 1699999999000,
    });

    const service = buildService();
    const location = await service.captureCurrentLocation();

    expect(location).toEqual({
      latitude: -33.4489,
      longitude: -70.6693,
      accuracy: 12.5,
      capturedAt: 1700000000000,
    });
    expect(fakeLocation.servicesEnabledCalls).toBe(1);
    expect(fakeLocation.getCurrentPositionCalls).toBe(1);
  });

  test.each([
    { name: 'latitud > 90', lat: 95, lon: 0 },
    { name: 'latitud < -90', lat: -91, lon: 0 },
    { name: 'longitud > 180', lat: 0, lon: 181 },
    { name: 'longitud < -180', lat: 0, lon: -185 },
    { name: 'latitud NaN', lat: Number.NaN, lon: -70 },
    { name: 'longitud Infinity', lat: -33, lon: Number.POSITIVE_INFINITY },
  ])(
    'descarta coordenadas inválidas o no finitas ($name) con LOCATION_UNAVAILABLE',
    async ({ lat, lon }) => {
      fakeLocation.setNextPosition({
        latitude: lat,
        longitude: lon,
        accuracy: 10,
      });

      const service = buildService();
      let caught: unknown;
      try {
        await service.captureCurrentLocation();
      } catch (err) {
        caught = err;
      }

      expect(isAppError(caught)).toBe(true);
      if (isAppError(caught)) {
        expect(caught.code).toBe('LOCATION_UNAVAILABLE');
      }
    }
  );

  it('R8: timeout de 10 s avanzando FakeClock lanza LOCATION_TIMEOUT y captureForNewTask retorna location=null', async () => {
    fakeLocation.setHang(true);
    const service = buildService();

    const pending = service.captureForNewTask();

    // Permitir que servicesEnabled y permissions resuelvan antes de avanzar el reloj
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    fakeClock.advance(LOCATION_TIMEOUT_MS);
    const result = await pending;

    expect(result.location).toBeNull();
    expect(result.error?.code).toBe('LOCATION_TIMEOUT');
    expect(fakeClock.sleptMs).toContain(10_000);
  });

  it('R8: si los servicios GPS están apagados retorna LOCATION_UNAVAILABLE sin llamar getCurrentPosition', async () => {
    fakeLocation.setServicesEnabled(false);
    const service = buildService();

    const result = await service.captureForNewTask();

    expect(result.location).toBeNull();
    expect(result.error?.code).toBe('LOCATION_UNAVAILABLE');
    expect(fakeLocation.getCurrentPositionCalls).toBe(0);
  });

  it('R8: si el permiso de ubicación es denegado o bloqueado retorna location=null sin crash', async () => {
    fakePermissions.setInitialState('location', {
      status: 'undetermined',
      canAskAgain: true,
    });
    fakePermissions.setNextRequestResult('location', {
      status: 'denied',
      canAskAgain: true,
    });

    const deniedService = buildService(true);
    const deniedResult = await deniedService.captureForNewTask();
    expect(deniedResult.location).toBeNull();
    expect(deniedResult.error?.code).toBe('PERMISSION_DENIED');
    expect(fakeLocation.getCurrentPositionCalls).toBe(0);

    fakePermissions.setInitialState('location', {
      status: 'denied',
      canAskAgain: false,
    });
    const blockedService = buildService(true);
    const blockedResult = await blockedService.captureForNewTask();
    expect(blockedResult.location).toBeNull();
    expect(blockedResult.error?.code).toBe('PERMISSION_BLOCKED');
    expect(fakeLocation.getCurrentPositionCalls).toBe(0);
  });

  it('precisión de datos: accuracy > 100 m marca baja precisión pero guarda ubicación', () => {
    expect(LOW_ACCURACY_THRESHOLD_METERS).toBe(100);
    expect(isLowAccuracy(aLocation({ accuracy: 15 }))).toBe(false);
    expect(isLowAccuracy(aLocation({ accuracy: 100 }))).toBe(false);
    expect(isLowAccuracy(aLocation({ accuracy: 100.1 }))).toBe(true);
    expect(isLowAccuracy(aLocation({ accuracy: 250 }))).toBe(true);
    expect(isLowAccuracy(aLocation({ accuracy: null }))).toBe(false);
    expect(isLowAccuracy(null)).toBe(false);

    const loc = aLocation({ latitude: -33.4489, longitude: -70.6693 });
    expect(formatCoordinates(loc)).toBe('-33.44890, -70.66930');
    expect(buildMapsUrl(loc, 'ios')).toContain('maps.apple.com');
    expect(buildMapsUrl(loc, 'android')).toContain('geo:-33.4489,-70.6693');
  });

  it('R6: editar o alternar una tarea conserva inmutable su ubicación original', () => {
    const initialLocation = aLocation({ latitude: -33.45, longitude: -70.67 });
    const idGenerator = new SeqIdGenerator();
    const created = validateAndCreateTask('Original', 'Desc', [], {
      clock: fakeClock,
      idGenerator,
      location: initialLocation,
    });
    expect(created.success).toBe(true);
    expect(created.task?.location).toEqual(initialLocation);

    const tasks = created.task ? [created.task] : [];
    const edited = updateTask('task-id-1', 'Editada', 'Nueva desc', tasks, {
      clock: fakeClock,
    });
    expect(edited.updatedTasks[0].location).toEqual(initialLocation);

    const toggled = toggleTaskStatus('task-id-1', edited.updatedTasks, {
      clock: fakeClock,
    });
    expect(toggled[0].location).toEqual(initialLocation);
  });

  it('taskEnricher: el enriquecimiento posterior conserva ediciones previas y no revive tareas borradas', async () => {
    const capturedLoc = aLocation({ latitude: -33.45, longitude: -70.67, accuracy: 20 });
    fakeLocation.setNextPosition({
      latitude: capturedLoc.latitude,
      longitude: capturedLoc.longitude,
      accuracy: capturedLoc.accuracy,
    });
    const service = buildService();

    // Escenario A: el usuario edita la tarea mientras el GPS está resolviendo
    let stateA: Task[] = [
      aTask({ id: 't-1', title: 'Borrador', description: '', completed: false, location: null }),
    ];
    stateA = updateTask('t-1', 'Título editado a tiempo', 'Detalle', stateA, {
      clock: fakeClock,
    }).updatedTasks;

    await enrichTaskLocationAsync({
      taskId: 't-1',
      captureForNewTask: () => service.captureForNewTask(),
      applyUpdate: async (updater) => {
        stateA = updater(stateA);
      },
    });

    expect(stateA).toHaveLength(1);
    expect(stateA[0].title).toBe('Título editado a tiempo');
    expect(stateA[0].description).toBe('Detalle');
    expect(stateA[0].location).toEqual(capturedLoc);

    // Escenario B: el usuario elimina la tarea antes de que llegue el GPS
    let stateB: Task[] = [aTask({ id: 't-2', location: null })];
    stateB = deleteTaskById('t-2', stateB);

    await enrichTaskLocationAsync({
      taskId: 't-2',
      captureForNewTask: () => service.captureForNewTask(),
      applyUpdate: async (updater) => {
        stateB = updater(stateB);
      },
    });

    expect(stateB).toEqual([]);
    expect(applyTaskLocation([], 't-2', capturedLoc)).toEqual([]);
  });
});
