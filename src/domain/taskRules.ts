import { Photo, Task, TaskFilter } from '../types/task';
import { Clock } from '../ports/clock';
import { IdGenerator } from '../ports/idGenerator';
import { systemClock } from '../adapters/systemClock';
import { defaultIdGenerator } from '../adapters/defaultIdGenerator';

export interface TaskRuleDeps {
  clock?: Clock;
  idGenerator?: IdGenerator;
  userId?: string;
  photo?: Photo | null;
}

export function validateAndCreateTask(
  title: string,
  description: string,
  _existingTasks: Task[],
  deps?: TaskRuleDeps
): { success: boolean; task?: Task; error?: string } {
  const trimmedTitle = title.trim();
  const trimmedDesc = description.trim();

  if (!trimmedTitle) {
    return { success: false, error: 'El título de la tarea es obligatorio.' };
  }

  const clock = deps?.clock ?? systemClock;
  const idGenerator = deps?.idGenerator ?? defaultIdGenerator;

  const newTask: Task = {
    id: idGenerator.next(),
    userId: deps?.userId ?? 'local',
    title: trimmedTitle,
    description: trimmedDesc,
    completed: false,
    createdAt: clock.now(),
    photo: deps?.photo ?? null,
    location: null,
    weather: null,
    remoteId: null,
    syncStatus: 'pending',
    source: 'local',
    deletedAt: null,
  };

  return { success: true, task: newTask };
}

export function updateTask(
  id: string,
  title: string,
  description: string,
  tasks: Task[],
  deps?: TaskRuleDeps
): { success: boolean; updatedTasks: Task[]; error?: string } {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return {
      success: false,
      updatedTasks: tasks,
      error: 'El título no puede estar vacío.',
    };
  }

  const clock = deps?.clock ?? systemClock;
  const updatedAt = clock.now();
  const hasPhotoOverride = deps !== undefined && deps.photo !== undefined;

  const updatedTasks = tasks.map((t) =>
    t.id === id
      ? {
          ...t,
          title: trimmedTitle,
          description: description.trim(),
          updatedAt,
          ...(hasPhotoOverride ? { photo: deps.photo ?? null } : {}),
        }
      : t
  );

  return { success: true, updatedTasks };
}

export function toggleTaskStatus(
  id: string,
  tasks: Task[],
  deps?: TaskRuleDeps
): Task[] {
  const clock = deps?.clock ?? systemClock;
  const updatedAt = clock.now();

  return tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed, updatedAt } : t
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
