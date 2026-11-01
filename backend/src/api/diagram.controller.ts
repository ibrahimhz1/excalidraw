import { HttpError } from "../lib/http-error";
import * as diagramService from "../services/diagram.service";
import type { DiagramInput } from "../types/diagram";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseId(id: string): string {
  if (!uuidPattern.test(id)) {
    throw new HttpError(400, "Invalid diagram id");
  }

  return id;
}

function parseInput(body: unknown): DiagramInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }

  const { name, description, folderId } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    throw new HttpError(400, "name is required");
  }

  if (name.trim().length > 200) {
    throw new HttpError(400, "name must be at most 200 characters");
  }

  if (description != null && typeof description !== "string") {
    throw new HttpError(400, "description must be a string");
  }

  if (typeof description === "string" && description.length > 2000) {
    throw new HttpError(400, "description must be at most 2000 characters");
  }

  if (folderId != null) {
    if (typeof folderId !== "string" || !uuidPattern.test(folderId)) {
      throw new HttpError(400, "folderId must be a UUID");
    }
  }

  return {
    name: name.trim(),
    description: description ?? null,
    folderId: folderId ?? null,
  };
}

export async function listDiagrams() {
  const diagrams = await diagramService.listDiagrams();
  return { status: 200, body: diagrams };
}

export async function getDiagram(id: string) {
  const diagram = await diagramService.getDiagram(parseId(id));
  return { status: 200, body: diagram };
}

export async function createDiagram(body: unknown) {
  const diagram = await diagramService.createDiagram(parseInput(body));
  return { status: 201, body: diagram };
}

export async function updateDiagram(id: string, body: unknown) {
  const diagram = await diagramService.updateDiagram(parseId(id), parseInput(body));
  return { status: 200, body: diagram };
}

export async function deleteDiagram(id: string) {
  await diagramService.deleteDiagram(parseId(id));
  return { status: 204 };
}
