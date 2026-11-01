import { HttpError } from "../lib/http-error";
import { decryptToken, encryptToken } from "../lib/crypto";
import * as userRepository from "../repositories/user.repository";

const tokenEndpoint = "https://oauth2.googleapis.com/token";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

export async function getAccessTokenForUser(
  userId: string,
): Promise<string> {
  const cached = tokenCache.get(userId);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  const credentials = await userRepository.getGoogleCredentials(userId);

  if (!credentials?.refreshTokenEncrypted) {
    throw new HttpError(403, "Google Drive is not connected");
  }

  const refreshToken = decryptToken(credentials.refreshTokenEncrypted);
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!response.ok || !payload.access_token) {
    console.error("Google token refresh failed:", payload.error ?? response.status);
    throw new HttpError(401, "Google authorization expired; sign in again");
  }

  if (payload.refresh_token) {
    await userRepository.updateRefreshToken(
      userId,
      encryptToken(payload.refresh_token),
    );
  }

  const expiresIn = payload.expires_in ?? 3600;
  tokenCache.set(userId, {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 30) * 1000,
  });

  return payload.access_token;
}
