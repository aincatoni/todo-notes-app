import { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, TaskFilter } from '../types/task';
import { taskStorage } from '../storage/taskStorage';

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
      const trimmedTitle = title.trim();
      const trimmedDesc = description.trim();

      if (!trimmedTitle) {
        return false;
      }

      const newTask: Task = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title: trimmedTitle,
        description: trimmedDesc,
        completed: false,
        createdAt: Date.now(),
      };

      const updated = [newTask, ...tasks];
      await persist(updated);
      return true;
    },
    [tasks, persist]
  );

  // Editar tarea existente
  const editTask = useCallback(
    async (id: string, title: string, description: string): Promise<boolean> => {
      const trimmedTitle = title.trim();
      const trimmedDesc = description.trim();

      if (!trimmedTitle) {
        return false;
      }

      const updated = tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              title: trimmedTitle,
              description: trimmedDesc,
              updatedAt: Date.now(),
            }
          : t
      );

      await persist(updated);
      return true;
    },
    [tasks, persist]
  );

  // Alternar estado completada / pendiente
  const toggleTask = useCallback(
    async (id: string): Promise<void> => {
      const updated = tasks.map((t) =>
        t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t
      );
      await persist(updated);
    },
    [tasks, persist]
  );

  // Eliminar tarea
  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      const updated = tasks.filter((t) => t.id !== id);
      await persist(updated);
    },
    [tasks, persist]
  );

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [tasks]);

  // Lista filtrada y con búsqueda
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Filtro por estado
      if (filter === 'pending' && t.completed) return false;
      if (filter === 'completed' && !t.completed) return false;

      // Filtro por búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description.toLowerCase().includes(query);
        return matchesTitle || matchesDesc;
      }

      return true;
    });
  }, [tasks, filter, searchQuery]);

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
