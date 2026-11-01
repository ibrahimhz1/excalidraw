import { HttpError } from "../lib/http-error";
import { encryptToken, hashToken, randomToken } from "../lib/crypto";
import * as sessionRepository from "../repositories/session.repository";
import * as userRepository from "../repositories/user.repository";
import type { AuthUser, GoogleProfile } from "../types/auth";

const authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const tokenEndpoint = "https://oauth2.googleapis.com/token";
const userInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo";

export const sessionCookieName = "session";
export const stateCookieName = "oauth_state";
export const sessionDurationSeconds = 60 * 60 * 24 * 30;

const scopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
];

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

export function frontendUrl(): string {
  return requireEnv("FRONTEND_URL");
}

export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return `${authorizationEndpoint}?${params.toString()}`;
}

async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
}> {
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new HttpError(502, "Google token exchange failed");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
  };
}

async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch(userInfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });

  const payload = (await response.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  if (
    !response.ok ||
    !payload.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new HttpError(502, "Google user profile could not be verified");
  }

  return {
    googleSub: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
    refreshToken: null,
  };
}

export async function completeGoogleLogin(code: string): Promise<{
  user: AuthUser;
  sessionToken: string;
}> {
  const tokens = await exchangeCode(code);
  const profile = await fetchGoogleProfile(tokens.accessToken);
  const encryptedRefreshToken = tokens.refreshToken
    ? encryptToken(tokens.refreshToken)
    : null;

  const user = await userRepository.upsertGoogleUser(
    profile,
    encryptedRefreshToken,
  );

  const sessionToken = randomToken();
  const expiresAt = new Date(
    Date.now() + sessionDurationSeconds * 1000,
  );

  await sessionRepository.createSession(
    user.id,
    hashToken(sessionToken),
    expiresAt,
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      driveConnected: user.refreshTokenEncrypted !== null,
      driveRootFolderId: user.driveRootFolderId,
    },
    sessionToken,
  };
}

export async function getSessionUser(
  sessionToken: string | undefined,
): Promise<AuthUser | null> {
  if (!sessionToken) {
    return null;
  }

  return sessionRepository.findUserBySessionHash(hashToken(sessionToken));
}

export async function logout(sessionToken: string | undefined): Promise<void> {
  if (sessionToken) {
    await sessionRepository.deleteSession(hashToken(sessionToken));
  }
}
