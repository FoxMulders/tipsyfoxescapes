export type OAuthProvider = "google" | "facebook" | "github";

const envKey = (provider: OAuthProvider, suffix: "CLIENT_ID" | "CLIENT_SECRET"): string =>
  `${provider.toUpperCase()}_${suffix}`;

const PLACEHOLDER_PATTERNS = [
  /^your[-_]/i,
  /^change[-_]?me/i,
  /^xxx+$/i,
  /^replace[-_]?me/i,
  /^<.*>$/,
  /^todo$/i,
];

const looksLikePlaceholder = (value: string): boolean => {
  const v = value.trim();
  if (!v) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(v));
};

export type OAuthClientCredentials = {
  clientId: string;
  clientSecret: string;
};

export type OAuthCredentialIssue = {
  envVar: string;
  reason: "missing" | "placeholder";
};

/** Read provider credentials from process.env without dummy fallbacks. */
export const readOAuthClientCredentials = (provider: OAuthProvider): OAuthClientCredentials | null => {
  const idKey = envKey(provider, "CLIENT_ID");
  const secretKey = envKey(provider, "CLIENT_SECRET");
  const clientId = String(process.env[idKey] ?? "").trim();
  const clientSecret = String(process.env[secretKey] ?? "").trim();
  if (!clientId || !clientSecret) return null;
  if (looksLikePlaceholder(clientId) || looksLikePlaceholder(clientSecret)) return null;
  return { clientId, clientSecret };
};

export const diagnoseOAuthClientCredentials = (provider: OAuthProvider): OAuthCredentialIssue[] => {
  const issues: OAuthCredentialIssue[] = [];
  const idKey = envKey(provider, "CLIENT_ID");
  const secretKey = envKey(provider, "CLIENT_SECRET");
  const clientId = String(process.env[idKey] ?? "").trim();
  const clientSecret = String(process.env[secretKey] ?? "").trim();
  if (!clientId || looksLikePlaceholder(clientId)) {
    issues.push({ envVar: idKey, reason: !clientId ? "missing" : "placeholder" });
  }
  if (!clientSecret || looksLikePlaceholder(clientSecret)) {
    issues.push({ envVar: secretKey, reason: !clientSecret ? "missing" : "placeholder" });
  }
  return issues;
};

export const oauthCredentialSetupHint = (provider: OAuthProvider): string => {
  const idKey = envKey(provider, "CLIENT_ID");
  const secretKey = envKey(provider, "CLIENT_SECRET");
  return `Set ${idKey} and ${secretKey} in Vercel → Settings → Environment Variables (Production). Use the live OAuth app credentials from your ${provider} developer console—no placeholder values.`;
};
