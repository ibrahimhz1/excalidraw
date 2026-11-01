import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { handleRequest } from "./app";

const port = Number(process.env.PORT ?? 3000);
const maxBodyBytes = 1_000_000;

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > maxBodyBytes) {
      throw new Error("Request body too large");
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", `http://localhost:${port}`).pathname;

  try {
    const body = await readJsonBody(req);
    const result = await handleRequest({
      method: req.method ?? "GET",
      path,
      body,
    });

    for (const [key, value] of Object.entries(result.headers ?? {})) {
      res.setHeader(key, value);
    }

    if (result.body === undefined) {
      res.statusCode = result.status;
      res.end();
      return;
    }

    sendJson(res, result.status, result.body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    console.error(error);
    sendJson(res, 500, { error: "Internal server error" });
  }
}).listen(port, () => {
  console.log(`Backend dev server: http://localhost:${port}`);
});
