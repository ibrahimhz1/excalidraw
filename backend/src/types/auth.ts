export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  driveConnected: boolean;
  driveRootFolderId: string | null;
}

export interface GoogleProfile {
  googleSub: string;
  email: string;
  name: string | null;
  picture: string | null;
  refreshToken: string | null;
}
