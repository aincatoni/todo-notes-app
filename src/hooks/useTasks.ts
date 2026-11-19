import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GeoLocation, Photo, Task, TaskFilter } from '../types/task';
import {
  clock,
  locationPort,
  permissionPort,
  photoFilesPort,
  taskStorage,
} from '../composition';
import {
  validateAndCreateTask,
  updateTask,
  toggleTaskStatus,
  deleteTaskById,
  filterTasks,
  computeTaskStats,
} from '../domain/taskRules';
import {
  LocationPermissions,
  createLocationService,
} from '../services/locationService';
import { enrichTaskLocationAsync } from '../services/taskEnricher';
import { createPermissionService } from '../services/permissionService';

export interface UseTasksOptions {
  ensureLocationPermission?: LocationPermissions['ensure'];
}

export function useTasks(options?: UseTasksOptions) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
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
        tasksRef.current = loaded;
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
    tasksRef.current = updatedTasks;
    setTasks(updatedTasks);
    await taskStorage.saveTasks(updatedTasks);
  }, []);

  const applyFunctionalUpdate = useCallback(
    async (updater: (currentTasks: Task[]) => Task[]): Promise<void> => {
      const next = updater(tasksRef.current);
      if (next === tasksRef.current) {
        return;
      }
      tasksRef.current = next;
      setTasks(next);
      await taskStorage.saveTasks(next);
    },
    []
  );

  // Agregar nueva tarea (UI optimista + enriquecimiento GPS no bloqueante)
  const addTask = useCallback(
    async (
      title: string,
      description: string,
      photo?: Photo | null,
      preCapturedLocation?: GeoLocation | null
    ): Promise<boolean> => {
      const res = validateAndCreateTask(title, description, tasksRef.current, {
        ...(photo !== undefined ? { photo } : {}),
        ...(preCapturedLocation !== undefined
          ? { location: preCapturedLocation }
          : {}),
      });
      if (!res.success || !res.task) {
        return false;
      }

      const createdTask = res.task;
      const updated = [createdTask, ...tasksRef.current];
      await persist(updated);

      if (preCapturedLocation === undefined) {
        const fallbackPermissions = createPermissionService(
          permissionPort,
          async () => false
        );
        const locationService = createLocationService({
          locationPort,
          permissions: {
            ensure:
              options?.ensureLocationPermission ?? fallbackPermissions.ensure,
          },
          clock,
        });

        void enrichTaskLocationAsync({
          taskId: createdTask.id,
          captureForNewTask: () => locationService.captureForNewTask(),
          applyUpdate: applyFunctionalUpdate,
        });
      }

      return true;
    },
    [persist, applyFunctionalUpdate, options?.ensureLocationPermission]
  );

  // Editar tarea existente (R6: ubicación inmutable)
  const editTask = useCallback(
    async (
      id: string,
      title: string,
      description: string,
      photo?: Photo | null
    ): Promise<boolean> => {
      const previousTask = tasksRef.current.find((t) => t.id === id);
      const res = updateTask(id, title, description, tasksRef.current, {
        ...(photo !== undefined ? { photo } : {}),
      });
      if (!res.success) {
        return false;
      }

      await persist(res.updatedTasks);

      if (
        photo !== undefined &&
        previousTask?.photo?.uri &&
        previousTask.photo.uri !== photo?.uri
      ) {
        await photoFilesPort.delete(previousTask.photo.uri);
      }

      return true;
    },
    [persist]
  );

  // Alternar estado completada / pendiente
  const toggleTask = useCallback(
    async (id: string): Promise<void> => {
      const updated = toggleTaskStatus(id, tasksRef.current);
      await persist(updated);
    },
    [persist]
  );

  // Eliminar tarea (R7: borra también el archivo de foto asociado)
  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      const target = tasksRef.current.find((t) => t.id === id);
      const updated = deleteTaskById(id, tasksRef.current);
      await persist(updated);

      if (target?.photo?.uri) {
        await photoFilesPort.delete(target.photo.uri);
      }
    },
    [persist]
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
