import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

/** Load backend/.env locally only; Vercel injects process.env at runtime. */
export function loadEnv(): void {
  if (process.env.VERCEL) return;
  _require("dotenv/config");
}
