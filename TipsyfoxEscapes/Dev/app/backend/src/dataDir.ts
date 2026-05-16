import { promises as fs } from "fs";
import path from "path";

export const getDataDir = (): string => {
  if (process.env.DATA_DIR?.trim()) return process.env.DATA_DIR.trim();
  if (process.env.VERCEL) return "/tmp/erb-data";
  return path.join(process.cwd(), "data");
};

export const ensureDataDir = async (): Promise<string> => {
  const dir = getDataDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
};
