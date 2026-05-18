import type express from "express";
import { loadAuthTokens, persistAuthTokens } from "./runtimePersistence.js";

export const extractBearerToken = (req: express.Request): string | undefined => {
  const authHeader = String(req.headers.authorization ?? "").trim();
  if (!authHeader.toLowerCase().startsWith("bearer ")) return undefined;
  const token = authHeader.slice(7).trim();
  return token || undefined;
};

/** Resolve user id for bearer token; reload persisted tokens once on cache miss (serverless / cold start). */
export const resolveAuthUserId = async (
  req: express.Request,
  authTokens: Map<string, string>,
): Promise<string | undefined> => {
  const token = extractBearerToken(req);
  if (!token) return undefined;
  let userId = authTokens.get(token);
  if (userId) return userId;
  await loadAuthTokens(authTokens);
  userId = authTokens.get(token);
  return userId;
};

export const issueAuthToken = async (authTokens: Map<string, string>, userId: string): Promise<string> => {
  const authToken = `tok_${userId}_${Date.now()}`;
  authTokens.set(authToken, userId);
  await persistAuthTokens(authTokens);
  return authToken;
};
