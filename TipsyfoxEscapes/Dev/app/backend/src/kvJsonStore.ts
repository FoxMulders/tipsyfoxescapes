import { promises as fs } from "fs";
import path from "path";
import { ensureDataDir, getDataDir } from "./dataDir.js";

const kvRest = (): { url: string; token: string } | null => {
  const url = (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "").trim().replace(/\/$/, "");
  const token = (process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim();
  if (!url || !token) return null;
  return { url, token };
};

export const isKvConfigured = (): boolean => kvRest() !== null;

const kvCommand = async (command: (string | number)[]): Promise<unknown> => {
  const cfg = kvRest();
  if (!cfg) throw new Error("KV is not configured");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`KV request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(String(data.error));
  return data.result;
};

const kvKey = (name: string): string => `erb:${name.replace(/\.json$/i, "")}`;

export const kvGetJson = async <T>(name: string): Promise<T | null> => {
  if (!isKvConfigured()) return null;
  const raw = await kvCommand(["GET", kvKey(name)]);
  if (raw == null) return null;
  if (typeof raw === "object") return raw as T;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    return null;
  }
};

export const kvSetJson = async (name: string, value: unknown): Promise<void> => {
  if (!isKvConfigured()) return;
  await kvCommand(["SET", kvKey(name), JSON.stringify(value)]);
};

const filePath = (name: string): string => path.join(getDataDir(), name);

/** Prefer KV on Vercel; fall back to DATA_DIR file (local dev / warm same-instance). */
export const readJsonBlob = async <T>(name: string): Promise<T | null> => {
  const fromKv = await kvGetJson<T>(name);
  if (fromKv !== null) return fromKv;
  try {
    const raw = await fs.readFile(filePath(name), "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
};

/** Write to KV when configured and always mirror to DATA_DIR for local /tmp cache. */
export const writeJsonBlob = async (name: string, value: unknown): Promise<void> => {
  await kvSetJson(name, value);
  await ensureDataDir();
  await fs.writeFile(filePath(name), JSON.stringify(value, null, 2), "utf8");
};
