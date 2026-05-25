import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

declare const __filename: string | undefined;

/** Absolute filesystem path safe for `createRequire` in ESM, tsx, and CJS bundles. */
export const resolveModuleFilename = (): string => {
  let metaUrl: string | undefined;
  try {
    metaUrl = import.meta.url;
  } catch {
    metaUrl = undefined;
  }
  if (typeof metaUrl === "string" && metaUrl.trim()) {
    try {
      return fileURLToPath(metaUrl);
    } catch {
      /* fall through */
    }
  }

  if (typeof __filename === "string" && __filename.trim()) {
    return __filename;
  }

  return path.join(process.cwd(), "package.json");
};

export const createRequireFromHere = (): NodeRequire => {
  const filename = resolveModuleFilename();
  if (!filename?.trim()) {
    throw new Error(
      "Critical error: module filename path is undefined. Cannot initialize require() — check bundler/runtime.",
    );
  }
  return createRequire(filename);
};

/** Guard fs paths before read/write — surfaces misconfiguration early. */
export const assertAbsolutePath = (label: string, target: string | undefined | null): string => {
  const resolved = String(target ?? "").trim();
  if (!resolved) {
    throw new Error(
      `Critical error: '${label}' path variable is undefined or empty. Check your configuration or environment variables.`,
    );
  }
  return resolved;
};
