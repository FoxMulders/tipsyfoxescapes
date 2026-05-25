export type ServiceHealth = {
  ok: boolean;
  authStore: "kv" | "ephemeral" | "local";
  warnings?: string[];
};

export async function fetchServiceHealth(apiBase: string): Promise<ServiceHealth | null> {
  try {
    const res = await fetch(`${apiBase}/api/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ServiceHealth;
  } catch {
    return null;
  }
}

export function ephemeralAuthStoreWarning(health: ServiceHealth | null): string | null {
  if (!health || health.authStore !== "ephemeral") return null;
  return "Social login may fail until Vercel KV (Upstash Redis) is linked to this project. Room building still works for guests.";
}

export function socialLoginBlockedMessage(health: ServiceHealth | null): string | null {
  if (!health || health.authStore !== "ephemeral") return null;
  return "Social login is unavailable until Vercel KV is linked. Use email sign-in or continue as a guest.";
}
