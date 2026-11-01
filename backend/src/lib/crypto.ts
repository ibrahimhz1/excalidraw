import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

function encryptionKey(): Buffer {
  const encoded = process.env.TOKEN_ENCRYPTION_KEY;

  if (!encoded) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  }

  const key = Buffer.from(encoded, "base64");

  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }

  return key;
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptToken(payload: string): string {
  const [version, iv, tag, data] = payload.split(".");

  if (version !== "v1" || !iv || !tag || !data) {
    throw new Error("Invalid encrypted token format");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}
