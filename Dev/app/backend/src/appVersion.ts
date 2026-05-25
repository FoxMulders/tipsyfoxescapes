import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertAbsolutePath } from "./resolveModuleFilename.js";

/** App root (Dev/app). Works in tsx dev, Vercel cwd, and CJS bundles where import.meta.url is empty. */
const appRoot = (): string => {
  if (process.env.VERCEL) return process.cwd();
  try {
    const meta = import.meta.url;
    if (typeof meta === "string" && meta.trim()) {
      return join(dirname(fileURLToPath(meta)), "../..");
    }
  } catch {
    /* fall through */
  }
  return process.cwd();
};

const readJsonFile = (label: string, absolutePath: string): string => {
  const safePath = assertAbsolutePath(label, absolutePath);
  return readFileSync(safePath, "utf8");
};

const readBundledRelease = (): { version?: string; build?: string } | null => {
  const root = appRoot();
  const bundled = join(root, "api", "app-version.json");
  if (!existsSync(bundled)) return null;
  try {
    return JSON.parse(readJsonFile("app-version.json", bundled)) as { version?: string; build?: string };
  } catch {
    return null;
  }
};

export const readAppSemver = (): string => {
  const bundled = readBundledRelease();
  if (bundled && typeof bundled.version === "string" && bundled.version.trim()) {
    return bundled.version.trim();
  }
  const root = appRoot();
  try {
    const pkg = JSON.parse(readJsonFile("frontend/package.json", join(root, "frontend", "package.json"))) as {
      version?: string;
    };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
};

export const resolveLocalBuildId = (): string => {
  const bundled = readBundledRelease();
  if (bundled && typeof bundled.build === "string" && bundled.build.trim()) {
    return bundled.build.trim();
  }
  const sha = String(process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT ?? "").trim();
  if (sha) return sha.slice(0, 7);
  const deployment = String(process.env.VERCEL_DEPLOYMENT_ID ?? "").trim();
  if (deployment) return deployment;
  return String(process.env.BUILD_ID ?? "").trim() || "local";
};
