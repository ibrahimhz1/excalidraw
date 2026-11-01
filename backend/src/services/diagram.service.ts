import { HttpError } from "../lib/http-error";
import * as repository from "../repositories/diagram.repository";
import type { Diagram, DiagramInput } from "../types/diagram";
import * as driveService from "./google-drive.service";

export interface DiagramWriteInput extends DiagramInput {
  contentJson: string;
}

export interface DiagramWithContent {
  diagram: Diagram;
  content: unknown;
}

export function listDiagrams(ownerId: string): Promise<Diagram[]> {
  return repository.listDiagrams(ownerId);
}

export async function getDiagram(
  ownerId: string,
  id: string,
): Promise<Diagram> {
  const diagram = await repository.getDiagram(ownerId, id);

  if (!diagram) {
    throw new HttpError(404, "Diagram not found");
  }

  return diagram;
}

export async function getDiagramContent(
  ownerId: string,
  id: string,
): Promise<DiagramWithContent> {
  const diagram = await getDiagram(ownerId, id);

  if (!diagram.googleDriveFileId) {
    throw new HttpError(409, "Diagram has no Drive file");
  }

  let raw: string;

  try {
    raw = await driveService.getFile(ownerId, diagram.googleDriveFileId);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      throw new HttpError(502, "Diagram content is unavailable");
    }

    throw error;
  }

  let content: unknown;

  try {
    content = JSON.parse(raw);
  } catch {
    throw new HttpError(502, "Diagram content is not valid JSON");
  }

  return { diagram, content };
}

export async function createDiagram(
  ownerId: string,
  input: DiagramWriteInput,
): Promise<Diagram> {
  const file = await driveService.createFile(
    ownerId,
    input.name,
    input.contentJson,
  );

  try {
    return await repository.createDiagram(ownerId, input, file.id);
  } catch (error) {
    try {
      await driveService.deleteFile(ownerId, file.id);
    } catch (cleanupError) {
      console.error("Failed to clean up orphaned Drive file:", cleanupError);
    }

    throw error;
  }
}

export async function updateDiagram(
  ownerId: string,
  id: string,
  input: DiagramWriteInput,
): Promise<Diagram> {
  const existing = await getDiagram(ownerId, id);
  let fileId = existing.googleDriveFileId;
  let createdFile = false;

  if (fileId) {
    await driveService.updateFile(ownerId, fileId, input.contentJson);
  } else {
    const file = await driveService.createFile(
      ownerId,
      input.name,
      input.contentJson,
    );
    fileId = file.id;
    createdFile = true;
  }

  try {
    const diagram = await repository.updateDiagram(ownerId, id, input, fileId);

    if (!diagram) {
      throw new HttpError(404, "Diagram not found");
    }

    return diagram;
  } catch (error) {
    if (createdFile) {
      try {
        await driveService.deleteFile(ownerId, fileId);
      } catch (cleanupError) {
        console.error("Failed to clean up orphaned Drive file:", cleanupError);
      }
    }

    throw error;
  }
}

export async function deleteDiagram(
  ownerId: string,
  id: string,
): Promise<void> {
  const existing = await getDiagram(ownerId, id);

  if (existing.googleDriveFileId) {
    try {
      await driveService.deleteFile(ownerId, existing.googleDriveFileId);
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) {
        throw error;
      }
    }
  }

  const deleted = await repository.deleteDiagram(ownerId, id);

  if (!deleted) {
    throw new HttpError(404, "Diagram not found");
  }
}
