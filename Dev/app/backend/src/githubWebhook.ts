import crypto from "crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

type WebhookRequest = IncomingMessage & { body?: unknown; method?: string };

const readRawBody = async (req: WebhookRequest): Promise<Buffer> => {
  if (Buffer.isBuffer(req.body)) return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const signatureHeader = (req: IncomingMessage): string => {
  const raw = req.headers["x-hub-signature-256"];
  return (Array.isArray(raw) ? raw[0] : raw) ?? "";
};

export const verifyGitHubWebhookSignature = (payload: Buffer, header: string, secret: string): boolean => {
  if (!secret || !header) return false;
  const expectedHex = header.startsWith("sha256=") ? header.slice(7) : header;
  let expectedBuf: Buffer;
  let actualBuf: Buffer;
  try {
    actualBuf = crypto.createHmac("sha256", secret).update(payload).digest();
    expectedBuf = Buffer.from(expectedHex, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
};

/** GitHub repository webhook (POST with X-Hub-Signature-256). */
export const handleGitHubWebhook = async (req: WebhookRequest, res: ServerResponse): Promise<void> => {
  const method = String(req.method ?? "GET").toUpperCase();
  if (method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Method Not Allowed");
    return;
  }

  const secret = String(process.env.GITHUB_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: { code: "NOT_CONFIGURED", message: "GITHUB_WEBHOOK_SECRET is not set." } }));
    return;
  }

  const raw = await readRawBody(req);
  if (!verifyGitHubWebhookSignature(raw, signatureHeader(req), secret)) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Forbidden");
    return;
  }

  const event = String(req.headers["x-github-event"] ?? "");
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ ok: true, event: event || "unknown" }));
};
