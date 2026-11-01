export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!header) {
    return cookies;
  }

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    if (name) {
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
    }
  }

  return cookies;
}

interface CookieOptions {
  maxAgeSeconds?: number;
  path?: string;
  httpOnly?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  secure?: boolean;
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  parts.push(`Path=${options.path ?? "/"}`);

  if (options.maxAgeSeconds !== undefined) {
    parts.push(`Max-Age=${options.maxAgeSeconds}`);
  }

  if (options.httpOnly ?? true) {
    parts.push("HttpOnly");
  }

  parts.push(`SameSite=${options.sameSite ?? "Lax"}`);

  if (options.secure ?? process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}
