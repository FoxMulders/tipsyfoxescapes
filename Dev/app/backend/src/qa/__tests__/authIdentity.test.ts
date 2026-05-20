import { describe, expect, it } from "vitest";
import {
  deriveUsername,
  normalizeEmail,
  normalizeUsername,
  resolveLoginIdentifier,
  verifyUserPassword,
} from "../../authIdentity.js";

describe("authIdentity", () => {
  it("normalizes email with trim and lower case", () => {
    expect(normalizeEmail("  Brad@Gmail.COM ")).toBe("brad@gmail.com");
  });

  it("normalizes usernames with trim, lowercase, and whitespace removal", () => {
    expect(normalizeUsername("  Brad Mulders  ")).toBe("bradmulders");
  });

  it("resolves username to user record", () => {
    const usersByEmail = new Map([
      [
        "bradmulders@gmail.com",
        {
          id: "usr_1",
          name: "Brad",
          email: "bradmulders@gmail.com",
          username: "bradmulders",
          provider: "local" as const,
          password: "secret",
          isAdmin: true,
        },
      ],
    ]);
    const usersByUsername = new Map([["bradmulders", "bradmulders@gmail.com"]]);
    const user = resolveLoginIdentifier("bradmulders", usersByEmail, usersByUsername);
    expect(user?.email).toBe("bradmulders@gmail.com");
    expect(verifyUserPassword(user!, "secret")).toBe(true);
  });

  it("resolves email login despite whitespace and casing", () => {
    const usersByEmail = new Map([
      [
        "bradmulders@gmail.com",
        {
          id: "usr_1",
          name: "Brad",
          email: "bradmulders@gmail.com",
          username: "bradmulders",
          provider: "local" as const,
          password: "secret",
          isAdmin: true,
        },
      ],
    ]);
    const usersByUsername = new Map([["bradmulders", "bradmulders@gmail.com"]]);
    const user = resolveLoginIdentifier("  BRADMULDERS@GMAIL.COM  ", usersByEmail, usersByUsername);
    expect(user?.username).toBe("bradmulders");
  });

  it("derives username from email local part", () => {
    expect(deriveUsername("bradmulders@gmail.com", "Brad Mulders")).toBe("bradmulders");
  });
});
