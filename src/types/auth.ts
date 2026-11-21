export interface User {
  id: string;
  username: string;
  displayName?: string;
}

export interface LocalAccount {
  id: string;
  username: string;
  password: string;
  displayName?: string;
  createdAt: number;
}

export interface Session {
  userId: string;
  username?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}
