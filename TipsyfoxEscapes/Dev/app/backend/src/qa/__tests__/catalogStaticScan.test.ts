import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractPuzzlePoolSource, scanPuzzleCatalog } from "../catalogScan.js";

const serverPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../server.ts",
);

describe("Catalog static scan (migrated)", () => {
  const pool = extractPuzzlePoolSource(readFileSync(serverPath, "utf8"));

  it("has a puzzle pool region in server.ts", () => {
    expect(pool.length).toBeGreaterThan(100);
  });

  it("contains no banned YouTube search URLs", () => {
    const failures = scanPuzzleCatalog(pool);
    const codes = failures.map((f) => f.code);
    expect(codes).not.toContain("CATALOG_YOUTUBE_SEARCH");
    expect(codes).not.toContain("CATALOG_GENERIC_LOGIC_CHANNEL");
  });
});
