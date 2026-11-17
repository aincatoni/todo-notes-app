export interface RawCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp?: number;
}

export interface LocationPort {
  servicesEnabled(): Promise<boolean>;
  getCurrentPosition(): Promise<RawCoordinates>;
}
