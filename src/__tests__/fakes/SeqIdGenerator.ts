import { IdGenerator } from '../../ports/idGenerator';

export class SeqIdGenerator implements IdGenerator {
  private counter = 0;

  next(): string {
    this.counter += 1;
    return `task-id-${this.counter}`;
  }

  reset(): void {
    this.counter = 0;
  }
}
