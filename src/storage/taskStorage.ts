import { KeyValueStore } from '../ports/storage';
import { LocalAccount, User } from '../types/auth';
import { SyncOperation, Task } from '../types/task';

const TASKS_V2_PREFIX = 'tasks_v2:';
const OUTBOX_V1_PREFIX = 'outbox_v1:';
const LAST_USER_KEY = 'lastUser_v1';
const USERS_V1_KEY = 'users_v1';
const LEGACY_V1_KEYS = [
  '@ipss_todo_app:tasks_v1',
  '@ciisa_todo_app:tasks_v1',
] as const;
const V1_MIGRATED_KEY = '@ipss_todo_app:tasks_v1_migrated';

function createSeedAccounts(): LocalAccount[] {
  return [
    {
      id: '1',
      username: 'emilys',
      password: 'emilyspass',
      displayName: 'Emily Johnson',
      createdAt: 0,
    },
    {
      id: '2',
      username: 'michaelw',
      password: 'michaelwpass',
      displayName: 'Michael Williams',
      createdAt: 0,
    },
  ];
}

function safeParseArray<T>(raw: string | null): T[] | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function safeParseObject<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as T;
    }
    return null;
  } catch {
    return null;
  }
}

function migrateLegacyTask(legacy: Task, userId: string): Task {
  return {
    ...legacy,
    userId,
    photo: legacy.photo ?? null,
    location: legacy.location ?? null,
    weather: legacy.weather ?? null,
    remoteId: legacy.remoteId ?? null,
    syncStatus: 'pending',
    source: 'local',
    deletedAt: legacy.deletedAt ?? null,
  };
}

export interface TaskStorage {
  getTasks(userId?: string): Promise<Task[]>;
  saveTasks(tasks: Task[], userId?: string): Promise<void>;
  clearTasks(userId?: string): Promise<void>;
  getOutbox(userId: string): Promise<SyncOperation[]>;
  saveOutbox(userId: string, ops: SyncOperation[]): Promise<void>;
  getLastUser(): Promise<User | null>;
  saveLastUser(user: User | null): Promise<void>;
  getAccounts(): Promise<LocalAccount[]>;
  saveAccounts(accounts: LocalAccount[]): Promise<void>;
}

export function createTaskStorage(store: KeyValueStore): TaskStorage {
  const migrateFromV1IfNeeded = async (userId: string): Promise<Task[]> => {
    const alreadyMigrated = await store.get(V1_MIGRATED_KEY);
    if (alreadyMigrated === 'true') {
      return [];
    }

    let legacyRaw: string | null = null;
    for (const key of LEGACY_V1_KEYS) {
      legacyRaw = await store.get(key);
      if (legacyRaw !== null) {
        break;
      }
    }

    if (legacyRaw === null) {
      return [];
    }

    await store.set(V1_MIGRATED_KEY, 'true');

    const parsedLegacy = safeParseArray<Task>(legacyRaw);
    if (!parsedLegacy) {
      return [];
    }

    const migrated = parsedLegacy
      .filter((t) => typeof t?.id === 'string' && !t.id.startsWith('seed-'))
      .map((t) => migrateLegacyTask(t, userId));

    if (migrated.length > 0) {
      await store.set(`${TASKS_V2_PREFIX}${userId}`, JSON.stringify(migrated));
    }

    return migrated;
  };

  return {
    async getTasks(userId: string = 'local'): Promise<Task[]> {
      const raw = await store.get(`${TASKS_V2_PREFIX}${userId}`);
      if (raw !== null) {
        return safeParseArray<Task>(raw) ?? [];
      }
      return migrateFromV1IfNeeded(userId);
    },

    async saveTasks(tasks: Task[], userId: string = 'local'): Promise<void> {
      await store.set(`${TASKS_V2_PREFIX}${userId}`, JSON.stringify(tasks));
    },

    async clearTasks(userId: string = 'local'): Promise<void> {
      await store.remove(`${TASKS_V2_PREFIX}${userId}`);
    },

    async getOutbox(userId: string): Promise<SyncOperation[]> {
      const raw = await store.get(`${OUTBOX_V1_PREFIX}${userId}`);
      return safeParseArray<SyncOperation>(raw) ?? [];
    },

    async saveOutbox(userId: string, ops: SyncOperation[]): Promise<void> {
      await store.set(`${OUTBOX_V1_PREFIX}${userId}`, JSON.stringify(ops));
    },

    async getLastUser(): Promise<User | null> {
      const parsed = safeParseObject<User>(await store.get(LAST_USER_KEY));
      if (
        !parsed ||
        typeof parsed.id !== 'string' ||
        typeof parsed.username !== 'string'
      ) {
        return null;
      }
      return parsed;
    },

    async saveLastUser(user: User | null): Promise<void> {
      if (!user) {
        await store.remove(LAST_USER_KEY);
        return;
      }
      const sanitized: User = {
        id: user.id,
        username: user.username,
        ...(user.displayName !== undefined
          ? { displayName: user.displayName }
          : {}),
      };
      await store.set(LAST_USER_KEY, JSON.stringify(sanitized));
    },

    async getAccounts(): Promise<LocalAccount[]> {
      const raw = await store.get(USERS_V1_KEY);
      if (raw === null) {
        const seeds = createSeedAccounts();
        await store.set(USERS_V1_KEY, JSON.stringify(seeds));
        return seeds;
      }
      const parsed = safeParseArray<LocalAccount>(raw);
      if (!parsed) {
        return createSeedAccounts();
      }
      return parsed;
    },

    async saveAccounts(accounts: LocalAccount[]): Promise<void> {
      await store.set(USERS_V1_KEY, JSON.stringify(accounts));
    },
  };
}
