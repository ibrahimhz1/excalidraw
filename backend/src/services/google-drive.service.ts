import { randomBytes } from "node:crypto";
import { HttpError } from "../lib/http-error";
import * as userRepository from "../repositories/user.repository";
import { getAccessTokenForUser } from "./google-auth.service";

const driveFilesEndpoint = "https://www.googleapis.com/drive/v3/files";
const driveUploadEndpoint =
  "https://www.googleapis.com/upload/drive/v3/files";
const folderMimeType = "application/vnd.google-apps.folder";
const fileMimeType = "application/json";
const rootFolderName = "Excalidraw";
const driveFileIdPattern = /^[A-Za-z0-9_-]{10,200}$/;

export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
}

function requireDriveFileId(fileId: string): string {
  if (!driveFileIdPattern.test(fileId)) {
    throw new HttpError(400, "Invalid Drive file id");
  }

  return fileId;
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return `${(cleaned || "Untitled").slice(0, 120)}.excalidraw`;
}

async function driveFetch(
  userId: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const accessToken = await getAccessTokenForUser(userId);
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (response.ok) {
    return response;
  }

  const detail = (await response.text()).slice(0, 500);
  console.error("Google Drive request failed:", response.status, detail);

  if (response.status === 401) {
    throw new HttpError(401, "Google authorization expired; sign in again");
  }

  if (response.status === 404) {
    throw new HttpError(404, "Drive file not found");
  }

  if (response.status === 429) {
    throw new HttpError(503, "Google Drive rate limited the request");
  }

  throw new HttpError(502, "Google Drive request failed");
}

async function createFolder(
  userId: string,
  name: string,
  parentId?: string,
): Promise<string> {
  const response = await driveFetch(
    userId,
    `${driveFilesEndpoint}?fields=id`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: folderMimeType,
        parents: [parentId ?? "root"],
      }),
    },
  );

  const payload = (await response.json()) as { id?: string };

  if (!payload.id) {
    throw new HttpError(502, "Google Drive did not return a folder id");
  }

  return payload.id;
}

export async function ensureRootFolder(userId: string): Promise<string> {
  const credentials = await userRepository.getGoogleCredentials(userId);

  if (!credentials) {
    throw new HttpError(403, "Google Drive is not connected");
  }

  if (credentials.driveRootFolderId) {
    return credentials.driveRootFolderId;
  }

  const query = [
    `name='${rootFolderName}'`,
    `mimeType='${folderMimeType}'`,
    "trashed=false",
    "'root' in parents",
  ].join(" and ");
  const response = await driveFetch(
    userId,
    `${driveFilesEndpoint}?q=${encodeURIComponent(query)}&fields=files(id)`,
  );
  const payload = (await response.json()) as { files?: { id?: string }[] };
  const existingId = payload.files?.[0]?.id;

  if (existingId) {
    await userRepository.updateDriveRootFolder(userId, existingId);
    return existingId;
  }

  const folderId = await createFolder(userId, rootFolderName);
  await userRepository.updateDriveRootFolder(userId, folderId);
  return folderId;
}

function multipartBody(
  metadata: Record<string, unknown>,
  content: string,
): { body: Buffer; contentType: string } {
  const boundary = `excalidraw-${randomBytes(16).toString("hex")}`;
  const body = Buffer.concat([
    Buffer.from(
      [
        `--${boundary}`,
        "Content-Type: application/json; charset=UTF-8",
        "",
        JSON.stringify(metadata),
        `--${boundary}`,
        `Content-Type: ${fileMimeType}`,
        "",
        "",
      ].join("\r\n"),
    ),
    Buffer.from(content, "utf8"),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  return {
    body,
    contentType: `multipart/related; boundary=${boundary}`,
  };
}

export async function createFile(
  userId: string,
  name: string,
  content: string,
  parentFolderId?: string,
): Promise<{ id: string; name: string }> {
  const parentId = parentFolderId ?? (await ensureRootFolder(userId));
  const multipart = multipartBody(
    {
      name: sanitizeFileName(name),
      mimeType: fileMimeType,
      parents: [parentId],
    },
    content,
  );
  const response = await driveFetch(
    userId,
    `${driveUploadEndpoint}?uploadType=multipart&fields=id,name`,
    {
      method: "POST",
      headers: { "Content-Type": multipart.contentType },
      body: multipart.body,
    },
  );

  const payload = (await response.json()) as { id?: string; name?: string };

  if (!payload.id || !payload.name) {
    throw new HttpError(502, "Google Drive did not return the created file");
  }

  return { id: payload.id, name: payload.name };
}

export async function getFile(userId: string, fileId: string): Promise<string> {
  const response = await driveFetch(
    userId,
    `${driveFilesEndpoint}/${requireDriveFileId(fileId)}?alt=media`,
  );

  return response.text();
}

export async function renameFile(
  userId: string,
  fileId: string,
  name: string,
): Promise<void> {
  await driveFetch(
    userId,
    `${driveFilesEndpoint}/${requireDriveFileId(fileId)}?fields=id`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sanitizeFileName(name) }),
    },
  );
}

export async function updateFile(
  userId: string,
  fileId: string,
  content: string,
): Promise<void> {
  await driveFetch(
    userId,
    `${driveUploadEndpoint}/${requireDriveFileId(fileId)}?uploadType=media`,
    {
      method: "PATCH",
      headers: { "Content-Type": fileMimeType },
      body: content,
    },
  );
}

export async function deleteFile(
  userId: string,
  fileId: string,
): Promise<void> {
  await driveFetch(
    userId,
    `${driveFilesEndpoint}/${requireDriveFileId(fileId)}`,
    { method: "DELETE" },
  );
}

export async function listFiles(
  userId: string,
  folderId?: string,
): Promise<DriveFileSummary[]> {
  const parentId = folderId ?? (await ensureRootFolder(userId));
  const query = `'${parentId}' in parents and trashed=false`;
  const response = await driveFetch(
    userId,
    `${driveFilesEndpoint}?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime)`,
  );
  const payload = (await response.json()) as {
    files?: DriveFileSummary[];
  };

  return payload.files ?? [];
}
