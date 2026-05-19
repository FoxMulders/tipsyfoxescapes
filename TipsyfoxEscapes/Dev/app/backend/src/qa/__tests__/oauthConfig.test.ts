import { afterEach, describe, expect, it } from "vitest";
import {
  diagnoseOAuthClientCredentials,
  readOAuthClientCredentials,
} from "../../oauthConfig.js";

describe("oauthConfig", () => {
  afterEach(() => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
  });

  it("returns null when GitHub credentials are missing", () => {
    expect(readOAuthClientCredentials("github")).toBeNull();
    expect(diagnoseOAuthClientCredentials("github").map((i) => i.envVar)).toEqual([
      "GITHUB_CLIENT_ID",
      "GITHUB_CLIENT_SECRET",
    ]);
  });

  it("rejects placeholder GitHub credentials", () => {
    process.env.GITHUB_CLIENT_ID = "your-github-client-id";
    process.env.GITHUB_CLIENT_SECRET = "your-github-client-secret";
    expect(readOAuthClientCredentials("github")).toBeNull();
    expect(diagnoseOAuthClientCredentials("github").every((i) => i.reason === "placeholder")).toBe(true);
  });

  it("reads trimmed GitHub credentials from environment", () => {
    process.env.GITHUB_CLIENT_ID = "  Iv1.realClientId  ";
    process.env.GITHUB_CLIENT_SECRET = "  realSecretValue  ";
    expect(readOAuthClientCredentials("github")).toEqual({
      clientId: "Iv1.realClientId",
      clientSecret: "realSecretValue",
    });
  });
});
