import { describe, it, expect, beforeEach } from 'bun:test';
import { Task } from '../types/task';
import {
  validateAndCreateTask,
  updateTask,
  toggleTaskStatus,
  deleteTaskById,
  filterTasks,
  computeTaskStats,
} from '../domain/taskRules';

describe('TDD: Pruebas Unitarias de Gestión de Tareas (EVA1)', () => {
  let sampleTasks: Task[];

  beforeEach(() => {
    sampleTasks = [
      {
        id: 'task-1',
        title: 'Estudiar React Native',
        description: 'Repasar arquitectura Fabric y TurboModules',
        completed: false,
        createdAt: 1000,
      },
      {
        id: 'task-2',
        title: 'Configurar entorno Expo',
        description: 'Instalar SDK 58 y probar en iPhone',
        completed: true,
        createdAt: 2000,
      },
    ];
  });

  describe('Creación de tareas (Create)', () => {
    it('debe crear una nueva tarea con título y descripción válidos', () => {
      const res = validateAndCreateTask('Nueva tarea', 'Descripción prueba', sampleTasks);
      expect(res.success).toBe(true);
      expect(res.task).toBeDefined();
      expect(res.task?.title).toBe('Nueva tarea');
      expect(res.task?.description).toBe('Descripción prueba');
      expect(res.task?.completed).toBe(false);
      expect(res.task?.id).toBeString();
    });

    it('debe rechazar tareas con título vacío o sólo espacios', () => {
      const res = validateAndCreateTask('   ', 'Descripción', sampleTasks);
      expect(res.success).toBe(false);
      expect(res.error).toBe('El título de la tarea es obligatorio.');
    });

    it('debe recortar espacios en blanco al inicio y final del título', () => {
      const res = validateAndCreateTask('  Tarea con espacios  ', '  Desc  ', sampleTasks);
      expect(res.success).toBe(true);
      expect(res.task?.title).toBe('Tarea con espacios');
      expect(res.task?.description).toBe('Desc');
    });
  });

  describe('Edición y actualización de tareas (Update)', () => {
    it('debe actualizar el título y descripción de una tarea existente', () => {
      const res = updateTask('task-1', 'Título editado', 'Nueva desc', sampleTasks);
      expect(res.success).toBe(true);
      const updated = res.updatedTasks.find((t) => t.id === 'task-1');
      expect(updated?.title).toBe('Título editado');
      expect(updated?.description).toBe('Nueva desc');
      expect(updated?.updatedAt).toBeNumber();
    });

    it('debe rechazar actualizaciones con título vacío', () => {
      const res = updateTask('task-1', '   ', 'Nueva desc', sampleTasks);
      expect(res.success).toBe(false);
      expect(res.error).toBe('El título no puede estar vacío.');
    });
  });

  describe('Alternar estado completada / pendiente (Toggle)', () => {
    it('debe marcar una tarea pendiente como completada', () => {
      const updated = toggleTaskStatus('task-1', sampleTasks);
      const task = updated.find((t) => t.id === 'task-1');
      expect(task?.completed).toBe(true);
    });

    it('debe desmarcar una tarea completada a pendiente', () => {
      const updated = toggleTaskStatus('task-2', sampleTasks);
      const task = updated.find((t) => t.id === 'task-2');
      expect(task?.completed).toBe(false);
    });
  });

  describe('Eliminación de tareas (Delete)', () => {
    it('debe eliminar la tarea correspondiente por su ID', () => {
      const updated = deleteTaskById('task-1', sampleTasks);
      expect(updated.length).toBe(1);
      expect(updated.find((t) => t.id === 'task-1')).toBeUndefined();
    });
  });

  describe('Filtrado y Búsqueda (Filter & Search)', () => {
    it('debe filtrar correctamente solo tareas pendientes', () => {
      const pending = filterTasks(sampleTasks, 'pending');
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe('task-1');
    });

    it('debe filtrar correctamente solo tareas completadas', () => {
      const completed = filterTasks(sampleTasks, 'completed');
      expect(completed.length).toBe(1);
      expect(completed[0].id).toBe('task-2');
    });

    it('debe buscar tareas por coincidencia en el título (case-insensitive)', () => {
      const results = filterTasks(sampleTasks, 'all', 'react');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Estudiar React Native');
    });

    it('debe buscar tareas por coincidencia en la descripción', () => {
      const results = filterTasks(sampleTasks, 'all', 'iphone');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('task-2');
    });
  });

  describe('Cálculo de estadísticas (Metrics)', () => {
    it('debe calcular correctamente total, pendientes y completadas', () => {
      const stats = computeTaskStats(sampleTasks);
      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.completed).toBe(1);
    });
  });
});
