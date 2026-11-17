import { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, TaskFilter } from '../types/task';
import { taskStorage } from '../composition';
import {
  validateAndCreateTask,
  updateTask,
  toggleTaskStatus,
  deleteTaskById,
  filterTasks,
  computeTaskStats,
} from '../domain/taskRules';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cargar tareas al montar el componente
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const loaded = await taskStorage.getTasks();
      if (isMounted) {
        setTasks(loaded);
        setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Guardar en almacenamiento cada vez que cambien las tareas
  const persist = useCallback(async (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    await taskStorage.saveTasks(updatedTasks);
  }, []);

  // Agregar nueva tarea
  const addTask = useCallback(
    async (title: string, description: string): Promise<boolean> => {
      const res = validateAndCreateTask(title, description, tasks);
      if (!res.success || !res.task) {
        return false;
      }

      const updated = [res.task, ...tasks];
      await persist(updated);
      return true;
    },
    [tasks, persist]
  );

  // Editar tarea existente
  const editTask = useCallback(
    async (id: string, title: string, description: string): Promise<boolean> => {
      const res = updateTask(id, title, description, tasks);
      if (!res.success) {
        return false;
      }

      await persist(res.updatedTasks);
      return true;
    },
    [tasks, persist]
  );

  // Alternar estado completada / pendiente
  const toggleTask = useCallback(
    async (id: string): Promise<void> => {
      const updated = toggleTaskStatus(id, tasks);
      await persist(updated);
    },
    [tasks, persist]
  );

  // Eliminar tarea
  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      const updated = deleteTaskById(id, tasks);
      await persist(updated);
    },
    [tasks, persist]
  );

  // Estadísticas calculadas
  const stats = useMemo(() => computeTaskStats(tasks), [tasks]);

  // Lista filtrada y con búsqueda
  const filteredTasks = useMemo(
    () => filterTasks(tasks, filter, searchQuery),
    [tasks, filter, searchQuery]
  );

  return {
    tasks,
    filteredTasks,
    loading,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    addTask,
    editTask,
    toggleTask,
    deleteTask,
    stats,
  };
}
