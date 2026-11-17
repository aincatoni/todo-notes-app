import { Clock } from '../../ports/clock';

export class FakeClock implements Clock {
  private currentMs: number;
  public readonly sleptMs: number[] = [];

  constructor(initialMs: number = 1700000000000) {
    this.currentMs = initialMs;
  }

  now(): number {
    return this.currentMs;
  }

  advance(ms: number): void {
    this.currentMs += ms;
  }

  async sleep(ms: number): Promise<void> {
    this.sleptMs.push(ms);
    this.currentMs += ms;
  }
}
