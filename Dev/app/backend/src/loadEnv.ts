import { createRequireFromHere } from "./resolveModuleFilename.js";

/** Load backend/.env locally only; Vercel injects process.env at runtime. */
export function loadEnv(): void {
  if (process.env.VERCEL) return;
  createRequireFromHere()("dotenv/config");
}
