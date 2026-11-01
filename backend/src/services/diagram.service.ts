import { HttpError } from "../lib/http-error";
import * as repository from "../repositories/diagram.repository";
import type { Diagram, DiagramInput } from "../types/diagram";

export function listDiagrams(): Promise<Diagram[]> {
  return repository.listDiagrams();
}

export async function getDiagram(id: string): Promise<Diagram> {
  const diagram = await repository.getDiagram(id);

  if (!diagram) {
    throw new HttpError(404, "Diagram not found");
  }

  return diagram;
}

export function createDiagram(input: DiagramInput): Promise<Diagram> {
  return repository.createDiagram(input);
}

export async function updateDiagram(
  id: string,
  input: DiagramInput,
): Promise<Diagram> {
  const diagram = await repository.updateDiagram(id, input);

  if (!diagram) {
    throw new HttpError(404, "Diagram not found");
  }

  return diagram;
}

export async function deleteDiagram(id: string): Promise<void> {
  const deleted = await repository.deleteDiagram(id);

  if (!deleted) {
    throw new HttpError(404, "Diagram not found");
  }
}
