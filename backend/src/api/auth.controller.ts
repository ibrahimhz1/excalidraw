import type { ApiResult, RequestContext } from "../app";
import { serializeCookie } from "../lib/cookies";
import { randomToken } from "../lib/crypto";
import * as authService from "../services/auth.service";

const oauthStateMaxAgeSeconds = 600;

function stateCookie(state: string): string {
  return serializeCookie(authService.stateCookieName, state, {
    path: "/api/auth",
    maxAgeSeconds: oauthStateMaxAgeSeconds,
  });
}

function clearStateCookie(): string {
  return serializeCookie(authService.stateCookieName, "", {
    path: "/api/auth",
    maxAgeSeconds: 0,
  });
}

function sessionCookie(sessionToken: string): string {
  return serializeCookie(authService.sessionCookieName, sessionToken, {
    path: "/",
    maxAgeSeconds: authService.sessionDurationSeconds,
  });
}

function clearSessionCookie(): string {
  return serializeCookie(authService.sessionCookieName, "", {
    path: "/",
    maxAgeSeconds: 0,
  });
}

export function startGoogleAuth(): ApiResult {
  const state = randomToken();

  return {
    status: 302,
    headers: {
      Location: authService.buildAuthorizationUrl(state),
      "Set-Cookie": stateCookie(state),
    },
  };
}

export async function googleCallback(
  _params: string[],
  _body: unknown,
  ctx: RequestContext,
): Promise<ApiResult> {
  try {
    const { code, state } = ctx.query;

    if (!code || !state || state !== ctx.cookies[authService.stateCookieName]) {
      throw new Error("Invalid OAuth state or missing code");
    }

    const { sessionToken } = await authService.completeGoogleLogin(code);

    return {
      status: 302,
      headers: {
        Location: `${authService.frontendUrl()}/?auth=success`,
        "Set-Cookie": [clearStateCookie(), sessionCookie(sessionToken)],
      },
    };
  } catch (error) {
    console.error("Google OAuth callback failed:", error);

    return {
      status: 302,
      headers: {
        Location: `${authService.frontendUrl()}/?auth=error`,
        "Set-Cookie": clearStateCookie(),
      },
    };
  }
}

export async function me(
  _params: string[],
  _body: unknown,
  ctx: RequestContext,
): Promise<ApiResult> {
  return { status: 200, body: { user: ctx.user } };
}

export async function logout(
  _params: string[],
  _body: unknown,
  ctx: RequestContext,
): Promise<ApiResult> {
  await authService.logout(ctx.cookies[authService.sessionCookieName]);

  return {
    status: 204,
    headers: { "Set-Cookie": clearSessionCookie() },
  };
}
