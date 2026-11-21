import { Session, User } from '../types/auth';
import { WeatherSnapshot } from '../types/task';

export interface AuthLoginResult {
  user: User;
  session: Session;
}

export interface AuthRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface RemoteTodoDto {
  id: number;
  todo: string;
  completed: boolean;
  userId?: number;
}

export interface RemoteTodosPage {
  todos: RemoteTodoDto[];
  total: number;
  skip: number;
  limit: number;
}

export interface AuthApi {
  login(
    username: string,
    password: string,
    expiresInMins?: number
  ): Promise<AuthLoginResult>;
  refresh(
    refreshToken: string,
    expiresInMins?: number
  ): Promise<AuthRefreshResult>;
  me(accessToken: string): Promise<User>;
}

export interface TasksApi {
  listTodos(limit: number, skip: number): Promise<RemoteTodosPage>;
  createTodo(input: {
    todo: string;
    completed: boolean;
    userId: number;
  }): Promise<RemoteTodoDto>;
  updateTodo(
    remoteId: number,
    input: { todo?: string; completed?: boolean }
  ): Promise<RemoteTodoDto>;
  deleteTodo(remoteId: number): Promise<void>;
}

export interface WeatherApi {
  getCurrentWeather(
    latitude: number,
    longitude: number
  ): Promise<WeatherSnapshot>;
}
