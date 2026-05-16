/**
 * Vercel serverless entry: runs the Express app from backend/dist/serverless.js.
 */
let expressHandler;

export default async function handler(req, res) {
  if (!expressHandler) {
    const mod = await import("../backend/dist/serverless.js");
    expressHandler = mod.default;
  }
  return expressHandler(req, res);
}
