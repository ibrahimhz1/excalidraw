import { routes } from "./api/routes";
import { HttpError } from "./lib/http-error";

export interface ApiRequest {
  method: string;
  path: string;
  body: unknown;
}

export interface ApiResult {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23503"
  );
}

export async function handleRequest(request: ApiRequest): Promise<ApiResult> {
  const matchingPaths = routes.filter((route) =>
    route.pattern.test(request.path),
  );
  const route = matchingPaths.find((item) => item.method === request.method);

  if (!route) {
    if (matchingPaths.length > 0) {
      return {
        status: 405,
        headers: {
          Allow: matchingPaths.map((item) => item.method).join(", "),
        },
        body: { error: "Method not allowed" },
      };
    }

    return { status: 404, body: { error: "Not found" } };
  }

  const params = route.pattern.exec(request.path)?.slice(1) ?? [];

  try {
    return await route.handler(params, request.body);
  } catch (error) {
    if (error instanceof HttpError) {
      return { status: error.status, body: { error: error.message } };
    }

    if (isForeignKeyViolation(error)) {
      return { status: 400, body: { error: "Folder not found" } };
    }

    console.error(error);
    return { status: 500, body: { error: "Internal server error" } };
  }
}
