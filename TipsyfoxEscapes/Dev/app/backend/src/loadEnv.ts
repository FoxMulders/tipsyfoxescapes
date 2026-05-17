/** Load backend/.env locally only; Vercel injects process.env at runtime. */
export function loadEnv(): void {
  if (process.env.VERCEL) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv/config");
}
