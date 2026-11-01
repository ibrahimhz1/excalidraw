export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  driveConnected: boolean;
  driveRootFolderId: string | null;
}

export interface CloudDiagram {
  id: string;
  name: string;
  description: string | null;
  ownerId: string | null;
  folderId: string | null;
  googleDriveFileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CloudScene {
  type?: string;
  version?: number;
  elements: unknown[];
  appState?: Record<string, unknown> | null;
  files?: Record<string, unknown> | null;
}

export interface CloudDiagramDetail {
  diagram: CloudDiagram;
  content: CloudScene;
}

export interface CloudDiagramInput {
  name: string;
  description?: string | null;
  content: CloudScene;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const apiBaseUrl = (
  import.meta.env.VITE_APP_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export const loginUrl = `${apiBaseUrl}/api/auth/google`;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Request failed";

    throw new ApiError(response.status, message);
  }

  return payload as T;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const payload = await request<{ user: AuthUser }>("/api/auth/me");
  return payload.user;
}

export function logout(): Promise<void> {
  return request<void>("/api/auth/logout", { method: "POST" });
}

export function listDiagrams(): Promise<CloudDiagram[]> {
  return request<CloudDiagram[]>("/api/diagrams");
}

export function getDiagram(id: string): Promise<CloudDiagramDetail> {
  return request<CloudDiagramDetail>(`/api/diagrams/${id}`);
}

export function createDiagram(input: CloudDiagramInput): Promise<CloudDiagram> {
  return request<CloudDiagram>("/api/diagrams", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateDiagram(
  id: string,
  input: CloudDiagramInput,
): Promise<CloudDiagram> {
  return request<CloudDiagram>(`/api/diagrams/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteDiagram(id: string): Promise<void> {
  return request<void>(`/api/diagrams/${id}`, { method: "DELETE" });
}
