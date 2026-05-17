import type { RequestHandler } from "express";

type DiskSyncDeps = {
  loadAuthTokens: (map: Map<string, string>) => Promise<void>;
  loadUsers: () => Promise<void>;
  authTokens: Map<string, string>;
};

/** On Vercel, reload users/tokens from shared KV (and /tmp mirror) before each request. */
export const createVercelDiskSyncMiddleware = (deps: DiskSyncDeps): RequestHandler => {
  return (_req, _res, next) => {
    if (!process.env.VERCEL) {
      next();
      return;
    }
    void Promise.all([deps.loadAuthTokens(deps.authTokens), deps.loadUsers()])
      .then(() => next())
      .catch(next);
  };
};
