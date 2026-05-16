import serverless from "serverless-http";
import { app, bootstrap } from "./server.js";

let ready: Promise<void> | null = null;
const ensureReady = (): Promise<void> => {
  if (!ready) ready = bootstrap();
  return ready;
};

const expressHandler = serverless(app);

export default async function handler(req: unknown, res: unknown): Promise<unknown> {
  await ensureReady();
  return expressHandler(req as never, res as never);
}
