import { GeoLocation, Task } from '../types/task';
import { LocationCaptureResult } from './locationService';

export function applyTaskLocation(
  tasks: Task[],
  taskId: string,
  location: GeoLocation | null
): Task[] {
  if (!location) {
    return tasks;
  }

  let changed = false;
  const updated = tasks.map((task) => {
    if (task.id !== taskId || task.deletedAt) {
      return task;
    }
    changed = true;
    return {
      ...task,
      location,
    };
  });

  return changed ? updated : tasks;
}

export interface EnrichTaskLocationParams {
  taskId: string;
  captureForNewTask: () => Promise<LocationCaptureResult>;
  applyUpdate: (updater: (currentTasks: Task[]) => Task[]) => Promise<void>;
}

export async function enrichTaskLocationAsync(
  params: EnrichTaskLocationParams
): Promise<LocationCaptureResult> {
  const result = await params.captureForNewTask();
  if (result.location) {
    await params.applyUpdate((currentTasks) =>
      applyTaskLocation(currentTasks, params.taskId, result.location)
    );
  }
  return result;
}
