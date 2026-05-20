import { app, bootstrap } from "./server.js";

// Start bootstrap when the bundle loads; do not block requests (OAuth, etc.) on cold start.
void bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[serverless] bootstrap failed:", err);
});

/** Vercel invokes Express apps as (req, res) — serverless-http prevents responses from completing. */
export default app;
