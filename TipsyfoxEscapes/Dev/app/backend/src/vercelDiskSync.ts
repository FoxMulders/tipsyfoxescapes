import type { RequestHandler } from "express";

type DiskSyncDeps = {
  loadAuthTokens: (map: Map<string, string>) => Promise<void>;
  loadUsers: () => Promise<void>;
  authTokens: Map<string, string>;
};

/** On Vercel, reload users/tokens from /tmp before each request (OAuth runs in a separate bundle). */
export const createVercelDiskSyncMiddleware = (deps: DiskSyncDeps): RequestHandler => {
  let syncPromise: Promise<void> | null = null;
  const sync = async (): Promise<void> => {
    if (!syncPromise) {
      syncPromise = Promise.all([deps.loadAuthTokens(deps.authTokens), deps.loadUsers()]).then(() => undefined);
      syncPromise.finally(() => {
        syncPromise = null;
      });
    }
    await syncPromise;
  };

  return (_req, _res, next) => {
    if (!process.env.VERCEL) {
      next();
      return;
    }
    void sync()
      .then(() => next())
      .catch(next);
  };
};
