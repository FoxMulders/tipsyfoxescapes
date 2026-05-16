import serverless from "serverless-http";
import { app, bootstrap } from "./server.js";

const expressHandler = serverless(app);

// Start bootstrap when the bundle loads; do not block requests (OAuth, etc.) on cold start.
void bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[serverless] bootstrap failed:", err);
});

export default async function handler(req: unknown, res: unknown): Promise<unknown> {
  return expressHandler(req as never, res as never);
}
