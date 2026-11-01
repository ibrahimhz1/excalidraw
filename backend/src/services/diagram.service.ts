import { HttpError } from "../lib/http-error";
import * as repository from "../repositories/diagram.repository";
import type { Diagram, DiagramInput } from "../types/diagram";

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

export function createDiagram(
  ownerId: string,
  input: DiagramInput,
): Promise<Diagram> {
  return repository.createDiagram(ownerId, input);
}

export async function updateDiagram(
  ownerId: string,
  id: string,
  input: DiagramInput,
): Promise<Diagram> {
  const diagram = await repository.updateDiagram(ownerId, id, input);

  if (!diagram) {
    throw new HttpError(404, "Diagram not found");
  }

  return diagram;
}

export async function deleteDiagram(
  ownerId: string,
  id: string,
): Promise<void> {
  const deleted = await repository.deleteDiagram(ownerId, id);

  if (!deleted) {
    throw new HttpError(404, "Diagram not found");
  }
}
