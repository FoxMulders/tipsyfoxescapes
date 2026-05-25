import { describe, expect, it } from "vitest";
import { assertAbsolutePath, resolveModuleFilename } from "../../resolveModuleFilename.js";

describe("resolveModuleFilename", () => {
  it("returns a non-empty absolute path for createRequire", () => {
    const filename = resolveModuleFilename();
    expect(typeof filename).toBe("string");
    expect(filename.trim().length).toBeGreaterThan(0);
  });

  it("assertAbsolutePath throws when path is missing", () => {
    expect(() => assertAbsolutePath("test-file", undefined)).toThrow(/undefined or empty/i);
    expect(() => assertAbsolutePath("test-file", "")).toThrow(/undefined or empty/i);
  });

  it("assertAbsolutePath returns trimmed path", () => {
    expect(assertAbsolutePath("test-file", "  /tmp/foo.json  ")).toBe("/tmp/foo.json");
  });
});
