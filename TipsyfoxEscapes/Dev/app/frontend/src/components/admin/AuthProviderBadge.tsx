const PROVIDER_META: Record<string, { label: string; icon: string }> = {
  google: { label: "Google", icon: "G" },
  facebook: { label: "Facebook", icon: "f" },
  github: { label: "GitHub", icon: "GH" },
  local: { label: "Local Email/Password", icon: "@" },
};

export function AuthProviderBadge({
  provider,
  authMethodBadge,
}: {
  provider: string;
  authMethodBadge?: string;
}) {
  const key = String(provider ?? "local").toLowerCase();
  const meta = PROVIDER_META[key] ?? PROVIDER_META.local;
  const detail = authMethodBadge?.trim();
  return (
    <span className="admin-auth-badge" title={detail || meta.label}>
      <span className={`admin-auth-badge__icon admin-auth-badge__icon--${key}`} aria-hidden>
        {meta.icon}
      </span>
      <span className="admin-auth-badge__label">{meta.label}</span>
    </span>
  );
}
