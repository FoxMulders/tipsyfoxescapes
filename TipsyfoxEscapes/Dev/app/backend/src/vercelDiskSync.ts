import type { RequestHandler } from "express";

type DiskSyncDeps = {
  loadAuthTokens: (map: Map<string, string>) => Promise<void>;
  loadUsers: () => Promise<void>;
  authTokens: Map<string, string>;
};

const shouldReloadAuthFromStore = (): boolean =>
  Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";

/** On Vercel/production, reload users/tokens from shared KV (and disk mirror) before each request. */
export const createVercelDiskSyncMiddleware = (deps: DiskSyncDeps): RequestHandler => {
  return (_req, _res, next) => {
    if (!shouldReloadAuthFromStore()) {
      next();
      return;
    }
    void Promise.all([deps.loadAuthTokens(deps.authTokens), deps.loadUsers()])
      .then(() => next())
      .catch(next);
  };
};
