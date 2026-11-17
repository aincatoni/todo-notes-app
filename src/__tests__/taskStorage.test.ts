import { describe, it, expect, beforeEach } from 'bun:test';
import { FakeKeyValueStore } from './fakes/FakeKeyValueStore';
import { aTask } from './builders';
import { createTaskStorage } from '../storage/taskStorage';
import { SyncOperation } from '../types/task';
import { User } from '../types/auth';

describe('taskStorage sobre KeyValueStore (R2, B2, B5, Domain §8)', () => {
  let store: FakeKeyValueStore;

  beforeEach(() => {
    store = new FakeKeyValueStore();
  });

  it('R2: aísla las tareas por userId usando la clave tasks_v2:<userId>', async () => {
    const storage = createTaskStorage(store);
    const taskU1 = aTask({ id: 't-1', userId: 'user-1', title: 'Tarea de Ana' });
    const taskU2 = aTask({ id: 't-2', userId: 'user-2', title: 'Tarea de Luis' });

    await storage.saveTasks([taskU1], 'user-1');
    await storage.saveTasks([taskU2], 'user-2');

    expect(await storage.getTasks('user-1')).toEqual([taskU1]);
    expect(await storage.getTasks('user-2')).toEqual([taskU2]);
    expect(await store.get('tasks_v2:user-1')).not.toBeNull();
    expect(await store.get('tasks_v2:user-2')).not.toBeNull();
  });

  it('devuelve lista vacía en v2 cuando no hay tareas guardadas (sin semillas)', async () => {
    const storage = createTaskStorage(store);
    const tasks = await storage.getTasks('user-1');
    expect(tasks).toEqual([]);
  });

  it('migra v1 -> v2 una sola vez al primer usuario y excluye tareas seed-* (B5)', async () => {
    const legacyTasks = [
      {
        id: 'seed-1',
        title: 'Semilla U1',
        description: 'No debe migrarse',
        completed: true,
        createdAt: 1000,
      },
      {
        id: 'task_real_1',
        title: 'Tarea real U1',
        description: 'Debe migrarse',
        completed: false,
        createdAt: 2000,
      },
    ];
    await store.set('@ipss_todo_app:tasks_v1', JSON.stringify(legacyTasks));

    const storage = createTaskStorage(store);
    const firstUserTasks = await storage.getTasks('user-1');

    expect(firstUserTasks).toHaveLength(1);
    expect(firstUserTasks[0]).toEqual({
      id: 'task_real_1',
      userId: 'user-1',
      title: 'Tarea real U1',
      description: 'Debe migrarse',
      completed: false,
      createdAt: 2000,
      photo: null,
      location: null,
      weather: null,
      remoteId: null,
      syncStatus: 'pending',
      source: 'local',
      deletedAt: null,
    });

    // Marca de migración realizada
    expect(await store.get('@ipss_todo_app:tasks_v1_migrated')).toBe('true');

    // Un segundo usuario no vuelve a recibir la migración v1
    const secondUserTasks = await storage.getTasks('user-2');
    expect(secondUserTasks).toEqual([]);
  });

  it('migra también desde clave legacy @ciisa_todo_app:tasks_v1 si no existe @ipss_todo_app:tasks_v1', async () => {
    const legacyTasks = [
      {
        id: 'seed-2',
        title: 'Semilla',
        description: '',
        completed: false,
        createdAt: 1000,
      },
      {
        id: 'task_ciisa_1',
        title: 'Nota previa',
        description: 'Detalle',
        completed: true,
        createdAt: 1500,
      },
    ];
    await store.set('@ciisa_todo_app:tasks_v1', JSON.stringify(legacyTasks));

    const storage = createTaskStorage(store);
    const migrated = await storage.getTasks('user-1');

    expect(migrated).toHaveLength(1);
    expect(migrated[0].id).toBe('task_ciisa_1');
    expect(migrated[0].userId).toBe('user-1');
    expect(migrated[0].syncStatus).toBe('pending');
    expect(migrated[0].source).toBe('local');
  });

  it('maneja JSON corrupto en tasks_v2, tasks_v1 y outbox sin lanzar excepción', async () => {
    await store.set('tasks_v2:user-1', '{corrupt-json');
    await store.set('outbox_v1:user-1', 'not-an-array');

    const storage = createTaskStorage(store);
    expect(await storage.getTasks('user-1')).toEqual([]);
    expect(await storage.getOutbox('user-1')).toEqual([]);

    await store.set('@ipss_todo_app:tasks_v1', '{broken-v1');
    expect(await storage.getTasks('user-2')).toEqual([]);
  });

  it('persiste y recupera outbox_v1:<userId> aislado por usuario', async () => {
    const storage = createTaskStorage(store);
    const op: SyncOperation = {
      id: 'op-1',
      taskId: 't-1',
      type: 'create',
      attempts: 0,
      lastError: null,
      createdAt: 1700000000000,
    };

    await storage.saveOutbox('user-1', [op]);

    expect(await storage.getOutbox('user-1')).toEqual([op]);
    expect(await storage.getOutbox('user-2')).toEqual([]);
    expect(await store.get('outbox_v1:user-1')).not.toBeNull();
  });

  it('persiste, recupera y limpia lastUser_v1 sin secretos', async () => {
    const storage = createTaskStorage(store);
    const user: User = { id: '1', username: 'emilys', displayName: 'Emily Johnson' };

    expect(await storage.getLastUser()).toBeNull();
    await storage.saveLastUser(user);
    expect(await storage.getLastUser()).toEqual(user);

    await storage.saveLastUser(null);
    expect(await storage.getLastUser()).toBeNull();
  });
});
