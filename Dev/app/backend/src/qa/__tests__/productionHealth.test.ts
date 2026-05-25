import { afterEach, describe, expect, it, vi } from "vitest";
import { oauthExchangeInvalidMessage, resolveAuthStoreMode } from "../../productionHealth.js";

describe("productionHealth", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
  });

  it("resolveAuthStoreMode returns ephemeral on Vercel without KV", () => {
    vi.stubEnv("VERCEL", "1");
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(resolveAuthStoreMode()).toBe("ephemeral");
  });

  it("oauthExchangeInvalidMessage mentions KV when ephemeral on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    expect(oauthExchangeInvalidMessage()).toMatch(/KV|Upstash/i);
  });

  it("oauthExchangeInvalidMessage stays generic when KV is configured", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "token");
    expect(oauthExchangeInvalidMessage()).toMatch(/expired or already used/i);
  });
});
