import { Clock } from '../../ports/clock';
import { LocationPort, RawCoordinates } from '../../ports/location';

export class FakeLocation implements LocationPort {
  private enabled = true;
  private nextPosition: RawCoordinates = {
    latitude: -33.4489,
    longitude: -70.6693,
    accuracy: 15,
  };
  private positionError: Error | null = null;
  private delayMs = 0;
  private delayClock: Clock | null = null;
  private hang = false;

  public servicesEnabledCalls = 0;
  public getCurrentPositionCalls = 0;

  setServicesEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setNextPosition(coords: RawCoordinates): void {
    this.nextPosition = coords;
    this.positionError = null;
    this.hang = false;
  }

  setPositionError(error: Error | null): void {
    this.positionError = error;
  }

  setPositionDelayMs(delayMs: number, clock: Clock): void {
    this.delayMs = delayMs;
    this.delayClock = clock;
  }

  setHang(hang: boolean): void {
    this.hang = hang;
  }

  async servicesEnabled(): Promise<boolean> {
    this.servicesEnabledCalls += 1;
    return this.enabled;
  }

  async getCurrentPosition(): Promise<RawCoordinates> {
    this.getCurrentPositionCalls += 1;

    if (this.hang) {
      return new Promise<RawCoordinates>(() => {
        // Intencionalmente sin resolver para probar timeout
      });
    }

    if (this.delayMs > 0 && this.delayClock) {
      await this.delayClock.sleep(this.delayMs);
    }

    if (this.positionError) {
      throw this.positionError;
    }

    return { ...this.nextPosition };
  }
}
