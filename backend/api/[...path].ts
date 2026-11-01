import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleRequest } from "../src/app";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  const result = await handleRequest({
    method: req.method ?? "GET",
    path,
    body: req.body,
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
