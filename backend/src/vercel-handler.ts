import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleRequest } from "./app";
import { parseCookies } from "./lib/cookies";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const origin = Array.isArray(req.headers.origin)
    ? req.headers.origin[0]
    : req.headers.origin;

  const result = await handleRequest({
    method: req.method ?? "GET",
    path: url.pathname,
    body: req.body,
    cookies: parseCookies(req.headers.cookie),
    query: Object.fromEntries(url.searchParams),
    origin,
  });

  for (const [key, value] of Object.entries(result.headers ?? {})) {
    res.setHeader(key, value);
  }

  if (result.body === undefined) {
    res.status(result.status).end();
    return;
  }

  res.status(result.status).json(result.body);
}
