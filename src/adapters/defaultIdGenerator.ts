import { IdGenerator } from '../ports/idGenerator';

export const defaultIdGenerator: IdGenerator = {
  next: () => `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
};
