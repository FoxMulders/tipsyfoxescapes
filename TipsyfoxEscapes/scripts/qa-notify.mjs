#!/usr/bin/env node
/**
 * Sends a QA handoff payload to QA_WEBHOOK_URL when set (JSON POST).
 * Sources: cursor-stop, pre-push, manual, github-actions (set QA_SOURCE env).
 *
 * Env:
 *   QA_WEBHOOK_URL     — required to send (otherwise no-op, exit 0)
 *   QA_WEBHOOK_SECRET  — optional; sent as Authorization: Bearer <secret>
 *   QA_REPO_ROOT       — optional; default: git root from cwd
 *   QA_SOURCE          — default: manual
 *   GITHUB_*           — set automatically in Actions for richer payload
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findGitRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

function sh(cwd, cmd, maxBuffer = 4_000_000) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd, maxBuffer, stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
  } catch {
    return "";
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data.trim()));
  });
}

function truncate(s, max = 240_000) {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n… [truncated ${s.length - max} chars]`;
}

const args = new Set(process.argv.slice(2));
const sourceArg = process.argv.find((a) => a.startsWith("--source="));
const source = sourceArg?.split("=", 2)[1] ?? process.env.QA_SOURCE ?? "manual";

async function main() {
  const repoRoot = process.env.QA_REPO_ROOT ? path.resolve(process.env.QA_REPO_ROOT) : findGitRoot(process.cwd());
  const url = String(process.env.QA_WEBHOOK_URL ?? "").trim();
  const hookStdin = await readStdin();

  const head = sh(repoRoot, "git rev-parse HEAD");
  const branch = sh(repoRoot, "git rev-parse --abbrev-ref HEAD");
  const lastMsg = sh(repoRoot, "git log -1 --oneline");
  const nameStatus = sh(repoRoot, "git diff --name-status HEAD");

  let diff = "";
  if (source === "cursor-stop" || source === "after-file-edit") {
    diff = [sh(repoRoot, "git diff"), sh(repoRoot, "git diff --cached")].filter(Boolean).join("\n");
  } else if (source === "pre-push") {
    const base = sh(repoRoot, "git merge-base HEAD @{upstream}");
    diff = base
      ? `${sh(repoRoot, `git diff --stat ${base}..HEAD`)}\n\n${sh(repoRoot, `git diff ${base}..HEAD`)}`
      : `${sh(repoRoot, "git diff --stat HEAD~1..HEAD")}\n\n${sh(repoRoot, "git diff HEAD~1..HEAD")}`;
  } else {
    diff = sh(repoRoot, "git diff HEAD~1..HEAD") || sh(repoRoot, "git diff --stat HEAD~1..HEAD") || nameStatus;
  }

  const payload = {
    schema: "qa-handoff/1",
    source,
    timestamp: new Date().toISOString(),
    repository: process.env.GITHUB_REPOSITORY || "",
    ref: process.env.GITHUB_REF || branch,
    sha: process.env.GITHUB_SHA || head,
    compareUrl: process.env.GITHUB_COMPARE_URL || "",
    actor: process.env.GITHUB_ACTOR || process.env.USER || process.env.USERNAME || "",
    lastCommit: lastMsg,
    nameStatus: truncate(nameStatus, 120_000),
    diff: truncate(diff, 260_000),
    cursorHookStdin: hookStdin ? truncate(hookStdin, 50_000) : undefined,
  };

  if (!url) {
    process.stderr.write(
      "[qa-notify] QA_WEBHOOK_URL is not set; skipping POST (set it to enable QA notifications).\n",
    );
    process.exit(0);
  }

  const headers = { "Content-Type": "application/json" };
  const secret = String(process.env.QA_WEBHOOK_SECRET ?? "").trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    process.stderr.write(`[qa-notify] Webhook failed: ${res.status} ${res.statusText} ${text.slice(0, 500)}\n`);
    process.exit(args.has("--fail-on-error") ? 1 : 0);
  }

  process.stderr.write(`[qa-notify] Sent to QA (${source}, ${res.status}).\n`);
}

main().catch((e) => {
  process.stderr.write(`[qa-notify] ${e instanceof Error ? e.stack : String(e)}\n`);
  process.exit(args.has("--fail-on-error") ? 1 : 0);
});
