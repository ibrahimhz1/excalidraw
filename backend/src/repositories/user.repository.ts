import { sql } from "../db/client";
import type { GoogleProfile } from "../types/auth";

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  googleSub: string | null;
  refreshTokenEncrypted: string | null;
  driveRootFolderId: string | null;
}

export async function upsertGoogleUser(
  profile: GoogleProfile,
  refreshTokenEncrypted: string | null,
): Promise<UserRow> {
  const rows = await sql`
    INSERT INTO users (
      email,
      name,
      picture,
      google_sub,
      refresh_token_encrypted
    )
    VALUES (
      ${profile.email},
      ${profile.name},
      ${profile.picture},
      ${profile.googleSub},
      ${refreshTokenEncrypted}
    )
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      picture = EXCLUDED.picture,
      google_sub = COALESCE(users.google_sub, EXCLUDED.google_sub),
      refresh_token_encrypted = COALESCE(
        EXCLUDED.refresh_token_encrypted,
        users.refresh_token_encrypted
      ),
      updated_at = now()
    RETURNING
      id,
      email,
      name,
      picture,
      google_sub AS "googleSub",
      refresh_token_encrypted AS "refreshTokenEncrypted",
      drive_root_folder_id AS "driveRootFolderId"
  `;

  return rows[0] as UserRow;
}

export async function getGoogleCredentials(userId: string): Promise<{
  refreshTokenEncrypted: string | null;
  driveRootFolderId: string | null;
} | null> {
  const rows = await sql`
    SELECT
      refresh_token_encrypted AS "refreshTokenEncrypted",
      drive_root_folder_id AS "driveRootFolderId"
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  return (
    (rows[0] as
      | {
          refreshTokenEncrypted: string | null;
          driveRootFolderId: string | null;
        }
      | undefined) ?? null
  );
}

export async function updateDriveRootFolder(
  userId: string,
  folderId: string,
): Promise<void> {
  await sql`
    UPDATE users
    SET drive_root_folder_id = ${folderId}, updated_at = now()
    WHERE id = ${userId}
  `;
}
