/**
 * Email / username identity normalization and password verification.
 */

export type AuthProvider = "local" | "google" | "facebook" | "github";

export type AuthUserRecord = {
  id: string;
  name: string;
  email: string;
  username: string;
  provider: AuthProvider;
  password?: string;
  isAdmin: boolean;
};

export const normalizeEmail = (raw: unknown): string => String(raw ?? "").trim().toLowerCase();

/** Login handle: lowercase, no spaces; allows dots in email local part when derived. */
export const normalizeUsername = (raw: unknown): string =>
  String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

export const deriveUsername = (email: string, name: string, existing?: string): string => {
  const prior = normalizeUsername(existing);
  if (prior) return prior;
  const local = normalizeEmail(email).split("@")[0] ?? "";
  if (local && /^[a-z0-9._-]+$/.test(local)) return local.replace(/[^a-z0-9._-]/g, "");
  const fromName = normalizeUsername(name).replace(/[^a-z0-9._-]/g, "");
  if (fromName.length >= 3) return fromName;
  return local || "user";
};

export const resolveLoginIdentifier = (
  raw: unknown,
  usersByEmail: Map<string, AuthUserRecord>,
  usersByUsername: Map<string, string>,
): AuthUserRecord | undefined => {
  const id = normalizeUsername(raw);
  if (!id) return undefined;
  if (id.includes("@")) {
    return usersByEmail.get(normalizeEmail(id));
  }
  const email = usersByUsername.get(id);
  if (email) return usersByEmail.get(email);
  return usersByEmail.get(normalizeEmail(id));
};

export const verifyUserPassword = (user: AuthUserRecord, password: unknown): boolean => {
  const candidate = String(password ?? "");
  if (!candidate) return false;
  if (user.password && user.password === candidate) return true;
  return false;
};

export const canAuthenticateWithPassword = (user: AuthUserRecord): boolean =>
  user.provider === "local" || Boolean(user.password);

export const indexUserUsername = (
  user: AuthUserRecord,
  usersByUsername: Map<string, string>,
  selfEmail: string,
): void => {
  const u = normalizeUsername(user.username);
  if (!u) return;
  const existing = usersByUsername.get(u);
  if (existing && existing !== selfEmail) return;
  usersByUsername.set(u, selfEmail);
};
