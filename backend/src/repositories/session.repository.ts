import { sql } from "../db/client";
import type { AuthUser } from "../types/auth";

export async function createSession(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await sql`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt})
  `;
}

export async function findUserBySessionHash(
  tokenHash: string,
): Promise<AuthUser | null> {
  const rows = await sql`
    SELECT
      users.id,
      users.email,
      users.name,
      users.picture,
      (users.refresh_token_encrypted IS NOT NULL) AS "driveConnected",
      users.drive_root_folder_id AS "driveRootFolderId"
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ${tokenHash}
      AND sessions.expires_at > now()
    LIMIT 1
  `;

  return (rows[0] as AuthUser | undefined) ?? null;
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await sql`
    DELETE FROM sessions
    WHERE token_hash = ${tokenHash}
  `;
}
