import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeAuthExchangeCode,
  createAuthExchangeCode,
  buildOAuthSuccessRedirectUrl,
} from "../../oauthExchangeCode.js";

vi.mock("../../kvJsonStore.js", () => {
  const store = new Map<string, string>();
  return {
    readJsonBlob: vi.fn(async (name: string) => {
      const raw = store.get(name);
      return raw ? JSON.parse(raw) : null;
    }),
    writeJsonBlob: vi.fn(async (name: string, value: unknown) => {
      store.set(name, JSON.stringify(value));
    }),
  };
});

describe("oauthExchangeCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates and consumes a one-time exchange code", async () => {
    const code = await createAuthExchangeCode({
      authToken: "tok_test",
      refreshToken: "rt_test",
      accessExpiresAt: Date.now() + 60_000,
      user: { id: "usr_1", email: "a@example.com" },
    });
    expect(code.length).toBeGreaterThan(20);

    const payload = await consumeAuthExchangeCode(code);
    expect(payload?.authToken).toBe("tok_test");
    expect(payload?.refreshToken).toBe("rt_test");

    const again = await consumeAuthExchangeCode(code);
    expect(again).toBeNull();
  });

  it("builds redirect URL with oauth_code only", () => {
    const url = buildOAuthSuccessRedirectUrl("https://www.tipsyfoxescapes.ca/", "abc123");
    expect(url).toBe("https://www.tipsyfoxescapes.ca/?oauth_code=abc123");
    expect(url).not.toContain("auth_token");
    expect(url).not.toContain("refresh_token");
  });
});
