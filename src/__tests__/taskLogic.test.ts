import { describe, it, expect, beforeEach } from 'bun:test';
import { Task, TaskFilter } from '../types/task';

// Funciones puras de lógica de negocio desacopladas para TDD
export function validateAndCreateTask(
  title: string,
  description: string,
  existingTasks: Task[]
): { success: boolean; task?: Task; error?: string } {
  const trimmedTitle = title.trim();
  const trimmedDesc = description.trim();

  if (!trimmedTitle) {
    return { success: false, error: 'El título de la tarea es obligatorio.' };
  }

  const newTask: Task = {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: trimmedTitle,
    description: trimmedDesc,
    completed: false,
    createdAt: Date.now(),
  };

  return { success: true, task: newTask };
}

export function updateTask(
  id: string,
  title: string,
  description: string,
  tasks: Task[]
): { success: boolean; updatedTasks: Task[]; error?: string } {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return { success: false, updatedTasks: tasks, error: 'El título no puede estar vacío.' };
  }

  const updatedTasks = tasks.map((t) =>
    t.id === id
      ? { ...t, title: trimmedTitle, description: description.trim(), updatedAt: Date.now() }
      : t
  );

  return { success: true, updatedTasks };
}

export function toggleTaskStatus(id: string, tasks: Task[]): Task[] {
  return tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t
  );
}

export function deleteTaskById(id: string, tasks: Task[]): Task[] {
  return tasks.filter((t) => t.id !== id);
}

export function filterTasks(
  tasks: Task[],
  filter: TaskFilter,
  searchQuery: string = ''
): Task[] {
  return tasks.filter((t) => {
    if (filter === 'pending' && t.completed) return false;
    if (filter === 'completed' && !t.completed) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      return matchTitle || matchDesc;
    }

    return true;
  });
}

export function computeTaskStats(tasks: Task[]) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  return { total, completed, pending };
}

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
