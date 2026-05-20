import type { RequestHandler } from "express";
import type { AuthTokenStore } from "./authSession.js";

type DiskSyncDeps = {
  authStore: AuthTokenStore;
  loadUsers: () => Promise<void>;
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
    void Promise.all([deps.authStore.reloadFromDisk(), deps.loadUsers()])
      .then(() => next())
      .catch(next);
  };
};
