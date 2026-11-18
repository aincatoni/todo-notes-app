import { describe, it, expect, beforeEach, test } from 'bun:test';
import { FakeCamera } from './fakes/FakeCamera';
import { FakePhotoFiles } from './fakes/FakePhotoFiles';
import { FakePermissions } from './fakes/FakePermissions';
import { FakeClock } from './fakes/FakeClock';
import { SeqIdGenerator } from './fakes/SeqIdGenerator';
import { createPermissionService } from '../services/permissionService';
import { createPhotoService } from '../services/photoService';
import { isAppError } from '../domain/errors';
import {
  validateAndCreateTask,
  updateTask,
} from '../domain/taskRules';
import { CameraPickerResult } from '../ports/camera';
import { Photo } from '../types/task';

describe('photoService (R7, R9, Fase 3)', () => {
  let fakeCamera: FakeCamera;
  let fakePhotoFiles: FakePhotoFiles;
  let fakePermissions: FakePermissions;
  let fakeClock: FakeClock;

  beforeEach(() => {
    fakeCamera = new FakeCamera();
    fakePhotoFiles = new FakePhotoFiles();
    fakePermissions = new FakePermissions();
    fakeClock = new FakeClock(1700000000000);

    fakePermissions.setInitialState('camera', {
      status: 'granted',
      canAskAgain: true,
    });
    fakePermissions.setInitialState('mediaLibrary', {
      status: 'granted',
      canAskAgain: true,
    });
  });

  function buildService(rationaleAccepted = true) {
    const permissions = createPermissionService(
      fakePermissions,
      async () => rationaleAccepted
    );
    return createPhotoService({
      camera: fakeCamera,
      photoFiles: fakePhotoFiles,
      permissions,
      clock: fakeClock,
    });
  }

  it('captura foto con cámara, la copia a photos/<userId>/<taskId>-<ts>.jpg y retorna metadatos', async () => {
    fakeCamera.setNextCameraResult({
      canceled: false,
      assets: [{ uri: 'file:///cache/tmp-cam.jpg', width: 1200, height: 900 }],
    });

    const service = buildService();
    const photo = await service.captureFromCamera({
      userId: 'user-1',
      taskId: 'task-1',
    });

    expect(photo).toEqual({
      uri: 'file:///document/photos/user-1/task-1-1700000000000.jpg',
      width: 1200,
      height: 900,
      takenWith: 'camera',
    });
    expect(fakeCamera.takePhotoCalls).toBe(1);
    expect(await fakePhotoFiles.exists(photo.uri)).toBe(true);
  });

  it('R9: selecciona foto desde galería y la copia al directorio privado', async () => {
    fakeCamera.setNextGalleryResult({
      canceled: false,
      assets: [{ uri: 'file:///cache/gal.png', width: 800, height: 600 }],
    });

    const service = buildService();
    const photo = await service.pickFromGallery({
      userId: 'user-2',
      taskId: 'task-9',
    });

    expect(photo).toEqual({
      uri: 'file:///document/photos/user-2/task-9-1700000000000.jpg',
      width: 800,
      height: 600,
      takenWith: 'gallery',
    });
    expect(fakeCamera.pickFromGalleryCalls).toBe(1);
    expect(await fakePhotoFiles.exists(photo.uri)).toBe(true);
  });

  it('cancelar la captura lanza CAPTURE_CANCELLED y no crea ningún archivo', async () => {
    fakeCamera.setNextCameraResult({ canceled: true, assets: null });
    const service = buildService();

    let caught: unknown;
    try {
      await service.captureFromCamera({ userId: 'user-1', taskId: 'task-1' });
    } catch (err) {
      caught = err;
    }

    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('CAPTURE_CANCELLED');
    }
    expect(fakePhotoFiles.listUris()).toHaveLength(0);
  });

  it('R9: permiso de cámara denegado lanza PERMISSION_DENIED sin abrir cámara y permite elegir de galería', async () => {
    fakePermissions.setInitialState('camera', {
      status: 'undetermined',
      canAskAgain: true,
    });
    fakePermissions.setNextRequestResult('camera', {
      status: 'denied',
      canAskAgain: true,
    });
    fakeCamera.setNextGalleryResult({
      canceled: false,
      assets: [{ uri: 'file:///cache/alt.jpg', width: 640, height: 480 }],
    });

    const service = buildService(true);

    let caught: unknown;
    try {
      await service.captureFromCamera({ userId: 'user-1', taskId: 'task-1' });
    } catch (err) {
      caught = err;
    }

    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('PERMISSION_DENIED');
    }
    expect(fakeCamera.takePhotoCalls).toBe(0);
    expect(fakePhotoFiles.listUris()).toHaveLength(0);

    // Alternativa desde galería funciona
    const fallbackPhoto = await service.pickFromGallery({
      userId: 'user-1',
      taskId: 'task-1',
    });
    expect(fallbackPhoto.takenWith).toBe('gallery');
    expect(await fakePhotoFiles.exists(fallbackPhoto.uri)).toBe(true);
  });

  it('R24: permiso de cámara bloqueado lanza PERMISSION_BLOCKED sin abrir cámara', async () => {
    fakePermissions.setInitialState('camera', {
      status: 'denied',
      canAskAgain: false,
    });

    const service = buildService(true);

    let caught: unknown;
    try {
      await service.captureFromCamera({ userId: 'user-1', taskId: 'task-1' });
    } catch (err) {
      caught = err;
    }

    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('PERMISSION_BLOCKED');
    }
    expect(fakeCamera.takePhotoCalls).toBe(0);
  });

  it('cámara no disponible lanza CAMERA_UNAVAILABLE y no crea archivo', async () => {
    fakeCamera.setCameraError(new Error('Camera hardware unavailable'));
    const service = buildService();

    let caught: unknown;
    try {
      await service.captureFromCamera({ userId: 'user-1', taskId: 'task-1' });
    } catch (err) {
      caught = err;
    }

    expect(isAppError(caught)).toBe(true);
    if (isAppError(caught)) {
      expect(caught.code).toBe('CAMERA_UNAVAILABLE');
    }
    expect(fakePhotoFiles.listUris()).toHaveLength(0);
  });

  it('R7: reemplazar foto borra el archivo anterior y conserva el nuevo', async () => {
    const oldUri = 'file:///document/photos/user-1/task-1-1700000000000.jpg';
    fakePhotoFiles.seed(oldUri);
    const previousPhoto: Photo = {
      uri: oldUri,
      width: 1000,
      height: 800,
      takenWith: 'camera',
    };

    fakeClock.advance(5000);
    fakeCamera.setNextCameraResult({
      canceled: false,
      assets: [{ uri: 'file:///cache/new.jpg', width: 1280, height: 720 }],
    });

    const service = buildService();
    const updatedPhoto = await service.captureFromCamera({
      userId: 'user-1',
      taskId: 'task-1',
      previousPhoto,
    });

    expect(updatedPhoto.uri).toBe(
      'file:///document/photos/user-1/task-1-1700000005000.jpg'
    );
    expect(await fakePhotoFiles.exists(updatedPhoto.uri)).toBe(true);
    expect(await fakePhotoFiles.exists(oldUri)).toBe(false);
    expect(fakePhotoFiles.deletedUris).toEqual([oldUri]);
  });

  it('R7: si al reemplazar la foto el usuario cancela, conserva el archivo anterior', async () => {
    const oldUri = 'file:///document/photos/user-1/task-1-1700000000000.jpg';
    fakePhotoFiles.seed(oldUri);
    const previousPhoto: Photo = {
      uri: oldUri,
      width: 1000,
      height: 800,
      takenWith: 'camera',
    };

    fakeCamera.setNextGalleryResult({ canceled: true, assets: null });
    const service = buildService();

    await expect(
      service.pickFromGallery({
        userId: 'user-1',
        taskId: 'task-1',
        previousPhoto,
      })
    ).rejects.toMatchObject({ code: 'CAPTURE_CANCELLED' });

    expect(await fakePhotoFiles.exists(oldUri)).toBe(true);
    expect(fakePhotoFiles.deletedUris).toHaveLength(0);
  });

  it('R7: removePhoto elimina el archivo de la foto y tolera null', async () => {
    const uri = 'file:///document/photos/user-1/task-1-1700000000000.jpg';
    fakePhotoFiles.seed(uri);
    const service = buildService();

    await service.removePhoto(null);
    expect(await fakePhotoFiles.exists(uri)).toBe(true);

    await service.removePhoto({
      uri,
      width: 500,
      height: 500,
      takenWith: 'gallery',
    });
    expect(await fakePhotoFiles.exists(uri)).toBe(false);
    expect(fakePhotoFiles.deletedUris).toEqual([uri]);
  });

  test.each<{ name: string; result: CameraPickerResult }>([
    { name: 'sin assets (null)', result: { canceled: false, assets: null } },
    { name: 'assets vacío', result: { canceled: false, assets: [] } },
    {
      name: 'uri vacía',
      result: { canceled: false, assets: [{ uri: '  ', width: 100, height: 100 }] },
    },
    {
      name: 'ancho 0',
      result: {
        canceled: false,
        assets: [{ uri: 'file:///a.jpg', width: 0, height: 100 }],
      },
    },
    {
      name: 'alto negativo',
      result: {
        canceled: false,
        assets: [{ uri: 'file:///a.jpg', width: 100, height: -10 }],
      },
    },
  ])(
    'rechaza resultado malformado del picker ($name) sin crear archivo',
    async ({ result }) => {
      fakeCamera.setNextCameraResult(result);
      const service = buildService();

      let caught: unknown;
      try {
        await service.captureFromCamera({ userId: 'user-1', taskId: 'task-1' });
      } catch (err) {
        caught = err;
      }

      expect(isAppError(caught)).toBe(true);
      if (isAppError(caught)) {
        expect(caught.code).toBe('CAMERA_UNAVAILABLE');
      }
      expect(fakePhotoFiles.listUris()).toHaveLength(0);
    }
  );

  it('taskRules: crear y editar tarea conservan, reemplazan o quitan photo', () => {
    const idGenerator = new SeqIdGenerator();
    const photo1: Photo = {
      uri: 'file:///document/photos/u1/t1-1.jpg',
      width: 800,
      height: 600,
      takenWith: 'camera',
    };
    const photo2: Photo = {
      uri: 'file:///document/photos/u1/t1-2.jpg',
      width: 1024,
      height: 768,
      takenWith: 'gallery',
    };

    const created = validateAndCreateTask('Con foto', 'Desc', [], {
      clock: fakeClock,
      idGenerator,
      userId: 'u1',
      photo: photo1,
    });
    expect(created.success).toBe(true);
    expect(created.task?.photo).toEqual(photo1);

    const tasks = created.task ? [created.task] : [];

    // Editar sin especificar photo conserva photo1
    const kept = updateTask('task-id-1', 'Editada', 'Desc 2', tasks, {
      clock: fakeClock,
    });
    expect(kept.updatedTasks[0].photo).toEqual(photo1);

    // Editar reemplazando photo
    const replaced = updateTask('task-id-1', 'Editada 2', 'Desc 2', tasks, {
      clock: fakeClock,
      photo: photo2,
    });
    expect(replaced.updatedTasks[0].photo).toEqual(photo2);

    // Editar quitando photo (photo: null)
    const removed = updateTask(
      'task-id-1',
      'Sin foto',
      'Desc 2',
      replaced.updatedTasks,
      { clock: fakeClock, photo: null }
    );
    expect(removed.updatedTasks[0].photo).toBeNull();
  });
});
