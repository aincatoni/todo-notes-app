export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: number;
  updatedAt?: number;
}

export type TaskFilter = 'all' | 'pending' | 'completed';

export interface TaskFormData {
  title: string;
  description: string;
}
