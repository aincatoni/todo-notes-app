export interface Photo {
  uri: string;
  width: number;
  height: number;
  takenWith: 'camera' | 'gallery';
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: number;
}

export interface WeatherSnapshot {
  temperatureC: number;
  weatherCode: number;
  description: string;
  fetchedAt: number;
}

export type SyncStatus = 'pending' | 'synced' | 'error';

export type TaskSource = 'local' | 'imported';

export type SyncOperationType = 'create' | 'update' | 'delete';

export interface SyncOperation {
  id: string;
  taskId: string;
  type: SyncOperationType;
  attempts: number;
  lastError: string | null;
  createdAt: number;
}

export interface Task {
  id: string;
  userId?: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: number;
  updatedAt?: number;
  photo?: Photo | null;
  location?: GeoLocation | null;
  weather?: WeatherSnapshot | null;
  remoteId?: number | null;
  syncStatus?: SyncStatus;
  source?: TaskSource;
  deletedAt?: number | null;
}

export type TaskFilter = 'all' | 'pending' | 'completed';

export interface TaskFormData {
  title: string;
  description: string;
}
