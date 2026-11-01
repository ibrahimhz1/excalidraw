import { routes } from "./api/routes";
import { HttpError } from "./lib/http-error";
import * as authService from "./services/auth.service";
import type { AuthUser } from "./types/auth";

export interface ApiRequest {
  method: string;
  path: string;
  body: unknown;
  cookies: Record<string, string>;
  query: Record<string, string>;
  origin?: string;
}

export interface RequestContext {
  cookies: Record<string, string>;
  query: Record<string, string>;
  user: AuthUser | null;
}

export interface ApiResult {
  status: number;
  body?: unknown;
  headers?: Record<string, string | string[]>;
}

function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowedOrigin = process.env.FRONTEND_URL;

  if (!allowedOrigin || !origin || origin !== allowedOrigin) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23503"
  );
}

function withCors(
  result: ApiResult,
  cors: Record<string, string>,
): ApiResult {
  return {
    ...result,
    headers: { ...cors, ...result.headers },
  };
}

export async function handleRequest(request: ApiRequest): Promise<ApiResult> {
  const cors = corsHeaders(request.origin);

  if (request.method === "OPTIONS") {
    return { status: 204, headers: cors };
  }

  const matchingPaths = routes.filter((route) =>
    route.pattern.test(request.path),
  );
  const route = matchingPaths.find((item) => item.method === request.method);

  if (!route) {
    if (matchingPaths.length > 0) {
      return withCors(
        {
          status: 405,
          headers: {
            Allow: matchingPaths.map((item) => item.method).join(", "),
          },
          body: { error: "Method not allowed" },
        },
        cors,
      );
    }

    return withCors({ status: 404, body: { error: "Not found" } }, cors);
  }

  const params = route.pattern.exec(request.path)?.slice(1) ?? [];
  const ctx: RequestContext = {
    cookies: request.cookies,
    query: request.query,
    user: null,
  };

  try {
    if (route.requiresAuth) {
      ctx.user = await authService.getSessionUser(
        request.cookies[authService.sessionCookieName],
      );

      if (!ctx.user) {
        throw new HttpError(401, "Unauthorized");
      }
    }

    return withCors(await route.handler(params, request.body, ctx), cors);
  } catch (error) {
    if (error instanceof HttpError) {
      return withCors(
        { status: error.status, body: { error: error.message } },
        cors,
      );
    }

    if (isForeignKeyViolation(error)) {
      return withCors(
        { status: 400, body: { error: "Folder not found" } },
        cors,
      );
    }

    console.error(error);
    return withCors(
      { status: 500, body: { error: "Internal server error" } },
      cors,
    );
  }
}
