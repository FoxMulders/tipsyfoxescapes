import type express from "express";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../runtimePersistence.js", () => ({
  loadAuthTokens: vi.fn(async (map: Map<string, string>) => {
    map.set("tok_persisted", "usr_persisted");
  }),
  persistAuthTokens: vi.fn(async () => undefined),
}));

import { extractBearerToken, issueAuthToken, resolveAuthUserId } from "../../authSession.js";
import { loadAuthTokens, persistAuthTokens } from "../../runtimePersistence.js";

describe("authSession", () => {
  beforeEach(() => {
    vi.mocked(loadAuthTokens).mockClear();
    vi.mocked(persistAuthTokens).mockClear();
  });

  it("extractBearerToken trims bearer prefix", () => {
    const req = { headers: { authorization: "Bearer tok_abc_123" } } as express.Request;
    expect(extractBearerToken(req)).toBe("tok_abc_123");
  });

  it("resolveAuthUserId reloads map on cache miss", async () => {
    const authTokens = new Map<string, string>();
    const req = { headers: { authorization: "Bearer tok_persisted" } } as express.Request;
    const userId = await resolveAuthUserId(req, authTokens);
    expect(userId).toBe("usr_persisted");
    expect(loadAuthTokens).toHaveBeenCalled();
  });

  it("issueAuthToken writes to map and persists", async () => {
    const authTokens = new Map<string, string>();
    const token = await issueAuthToken(authTokens, "usr_1");
    expect(authTokens.get(token)).toBe("usr_1");
    expect(persistAuthTokens).toHaveBeenCalled();
  });
});
