import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types/task';

const STORAGE_KEY = '@ciisa_todo_app:tasks_v1';

const INITIAL_TASKS: Task[] = [
  {
    id: 'seed-1',
    title: 'Instalar entorno y dependencias',
    description: 'Configurar Node.js, Bun y Expo SDK 58 para desarrollo móvil multiplataforma.',
    completed: true,
    createdAt: Date.now() - 3600000 * 24,
  },
  {
    id: 'seed-2',
    title: 'Diseñar interfaz de usuario (UI)',
    description: 'Implementar lista de tareas, formulario modal, estados vacíos y feedback visual según principios de UI.',
    completed: false,
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'seed-3',
    title: 'Documentar informe en README',
    description: 'Desarrollar explicaciones de arquitectura, patrones de diseño y principios de diseño para la rúbrica.',
    completed: false,
    createdAt: Date.now() - 1800000,
  },
];

export const taskStorage = {
  async getTasks(): Promise<Task[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) {
        // Primera ejecución: guardar e inicializar tareas semilla
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TASKS));
        return INITIAL_TASKS;
      }
      const parsed: Task[] = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : INITIAL_TASKS;
    } catch (error) {
      console.error('[taskStorage] Error al leer tareas de AsyncStorage:', error);
      return INITIAL_TASKS;
    }
  },

  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('[taskStorage] Error al guardar tareas en AsyncStorage:', error);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[taskStorage] Error al limpiar AsyncStorage:', error);
    }
  },
};
