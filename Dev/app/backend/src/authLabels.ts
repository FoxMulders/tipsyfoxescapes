export type AuthProvider = "local" | "google" | "facebook" | "github";

export type AuthMethodCode =
  | "credentials"
  | "oauth:google"
  | "oauth:facebook"
  | "oauth:github"
  | "trial"
  | "unknown";

export function authMethodFromProvider(provider: AuthProvider): AuthMethodCode {
  if (provider === "local") return "credentials";
  if (provider === "google") return "oauth:google";
  if (provider === "facebook") return "oauth:facebook";
  if (provider === "github") return "oauth:github";
  return "unknown";
}

export function formatAuthMethodBadge(code: string | undefined, provider?: AuthProvider): string {
  const resolved = code?.trim() || (provider ? authMethodFromProvider(provider) : "unknown");
  switch (resolved) {
    case "credentials":
      return "[Credentials]";
    case "oauth:google":
      return "[OAuth: Google]";
    case "oauth:facebook":
      return "[OAuth: Facebook]";
    case "oauth:github":
      return "[OAuth: GitHub]";
    case "trial":
      return "[Trial]";
    default:
      return "[Unknown]";
  }
}
