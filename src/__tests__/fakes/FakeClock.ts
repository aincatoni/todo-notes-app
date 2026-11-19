import { Clock } from '../../ports/clock';

interface PendingTimer {
  wakeAt: number;
  resolve: () => void;
}

export class FakeClock implements Clock {
  private currentMs: number;
  private manualTimers = false;
  private timers: PendingTimer[] = [];
  public readonly sleptMs: number[] = [];

  constructor(initialMs: number = 1700000000000) {
    this.currentMs = initialMs;
  }

  useManualTimers(enabled = true): void {
    this.manualTimers = enabled;
  }

  now(): number {
    return this.currentMs;
  }

  advance(ms: number): void {
    this.currentMs += ms;
    const due = this.timers
      .filter((t) => t.wakeAt <= this.currentMs)
      .sort((a, b) => a.wakeAt - b.wakeAt);
    this.timers = this.timers.filter((t) => t.wakeAt > this.currentMs);
    for (const timer of due) {
      timer.resolve();
    }
  }

  async sleep(ms: number): Promise<void> {
    this.sleptMs.push(ms);
    if (!this.manualTimers) {
      this.currentMs += ms;
      return;
    }

    return new Promise<void>((resolve) => {
      this.timers.push({
        wakeAt: this.currentMs + ms,
        resolve,
      });
    });
  }
}
