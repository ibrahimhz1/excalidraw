ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT UNIQUE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS picture TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS drive_root_folder_id TEXT;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);
