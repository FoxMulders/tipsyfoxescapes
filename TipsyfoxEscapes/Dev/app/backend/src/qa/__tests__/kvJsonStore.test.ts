import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

describe("kvJsonStore", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "token" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("falls back to local mirror when KV read fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, text: async () => "down" })));
    const { kvGetJson } = await import("../../kvJsonStore.js");
    await expect(kvGetJson("users.json")).resolves.toBeNull();
  });

  it("does not throw when KV write fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, text: async () => "down" })));
    const { kvSetJson } = await import("../../kvJsonStore.js");
    await expect(kvSetJson("users.json", [{ id: "usr_1" }])).resolves.toBeUndefined();
  });
});
