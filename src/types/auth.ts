export interface User {
  id: string;
  username: string;
  displayName?: string;
}

export interface Session {
  userId: string;
  username?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}
