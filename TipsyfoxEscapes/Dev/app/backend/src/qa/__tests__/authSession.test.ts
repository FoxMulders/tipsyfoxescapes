import type express from "express";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../runtimePersistence.js", () => ({
  loadAuthSessions: vi.fn(async () => [
    {
      userId: "usr_persisted",
      accessToken: "tok_persisted",
      refreshToken: "rt_persisted",
      accessExpiresAt: Date.now() + 60_000,
      refreshExpiresAt: Date.now() + 120_000,
    },
  ]),
  persistAuthSessions: vi.fn(async () => undefined),
}));

import { AuthTokenStore, extractBearerToken, resolveAuthUserId } from "../../authSession.js";
import { loadAuthSessions, persistAuthSessions } from "../../runtimePersistence.js";

describe("authSession", () => {
  beforeEach(() => {
    vi.mocked(loadAuthSessions).mockClear();
    vi.mocked(persistAuthSessions).mockClear();
  });

  it("extractBearerToken trims bearer prefix", () => {
    const req = { headers: { authorization: "Bearer tok_abc_123" } } as express.Request;
    expect(extractBearerToken(req)).toBe("tok_abc_123");
  });

  it("resolveAuthUserId reloads store on cache miss", async () => {
    const store = new AuthTokenStore();
    const req = { headers: { authorization: "Bearer tok_persisted" } } as express.Request;
    const userId = await resolveAuthUserId(req, store);
    expect(userId).toBe("usr_persisted");
    expect(loadAuthSessions).toHaveBeenCalled();
  });

  it("issueTokenPair writes session and persists", async () => {
    const store = new AuthTokenStore();
    const issued = await store.issueTokenPair("usr_1");
    expect(issued.authToken).toContain("tok_usr_1");
    expect(issued.refreshToken).toMatch(/^rt_/);
    expect(store.validateAccessToken(issued.authToken).ok).toBe(true);
    expect(persistAuthSessions).toHaveBeenCalled();
  });

  it("refreshTokenPair rotates access token", async () => {
    const store = new AuthTokenStore();
    const issued = await store.issueTokenPair("usr_2");
    const refreshed = await store.refreshTokenPair(issued.refreshToken);
    expect(refreshed.ok).toBe(true);
    if (!refreshed.ok) return;
    expect(refreshed.tokens.authToken).not.toBe(issued.authToken);
    expect(store.validateAccessToken(issued.authToken).ok).toBe(false);
    expect(store.validateAccessToken(refreshed.tokens.authToken).ok).toBe(true);
  });
});
