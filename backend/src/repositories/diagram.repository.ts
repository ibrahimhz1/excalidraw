import { sql } from "../db/client";
import type { Diagram, DiagramInput } from "../types/diagram";

export async function listDiagrams(ownerId: string): Promise<Diagram[]> {
  const rows = await sql`
    SELECT
      id,
      name,
      description,
      owner_id AS "ownerId",
      folder_id AS "folderId",
      google_drive_file_id AS "googleDriveFileId",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM diagrams
    WHERE owner_id = ${ownerId}
    ORDER BY updated_at DESC
  `;

  return rows as Diagram[];
}

export async function getDiagram(
  ownerId: string,
  id: string,
): Promise<Diagram | null> {
  const rows = await sql`
    SELECT
      id,
      name,
      description,
      owner_id AS "ownerId",
      folder_id AS "folderId",
      google_drive_file_id AS "googleDriveFileId",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM diagrams
    WHERE id = ${id} AND owner_id = ${ownerId}
    LIMIT 1
  `;

  return (rows[0] as Diagram | undefined) ?? null;
}

export async function createDiagram(
  ownerId: string,
  input: DiagramInput,
): Promise<Diagram> {
  const rows = await sql`
    INSERT INTO diagrams (name, description, folder_id, owner_id)
    VALUES (${input.name}, ${input.description}, ${input.folderId}, ${ownerId})
    RETURNING
      id,
      name,
      description,
      owner_id AS "ownerId",
      folder_id AS "folderId",
      google_drive_file_id AS "googleDriveFileId",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  return rows[0] as Diagram;
}

export async function updateDiagram(
  ownerId: string,
  id: string,
  input: DiagramInput,
): Promise<Diagram | null> {
  const rows = await sql`
    UPDATE diagrams
    SET
      name = ${input.name},
      description = ${input.description},
      folder_id = ${input.folderId},
      updated_at = now()
    WHERE id = ${id} AND owner_id = ${ownerId}
    RETURNING
      id,
      name,
      description,
      owner_id AS "ownerId",
      folder_id AS "folderId",
      google_drive_file_id AS "googleDriveFileId",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;

  return (rows[0] as Diagram | undefined) ?? null;
}

export async function deleteDiagram(
  ownerId: string,
  id: string,
): Promise<boolean> {
  const rows = await sql`
    DELETE FROM diagrams
    WHERE id = ${id} AND owner_id = ${ownerId}
    RETURNING id
  `;

  return rows.length > 0;
}
