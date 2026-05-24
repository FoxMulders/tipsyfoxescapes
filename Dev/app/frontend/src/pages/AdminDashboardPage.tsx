import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { SiteShell } from "@/components/layout/SiteShell";
import { getOrCreateDeviceId } from "@/deviceId";

const AUTH_STORAGE_KEY = "escape-room-builder-auth-v1";
const API_BASE = "";

type StoredAuth = { authToken?: string; authUser?: { role?: string; isAdmin?: boolean } };

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [authToken, setAuthToken] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let token = "";
    let user: StoredAuth["authUser"];
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredAuth;
        token = parsed.authToken ?? "";
        user = parsed.authUser;
      }
    } catch {
      // ignore
    }
    if (!token) {
      setAllowed(false);
      return;
    }
    setAuthToken(token);
    if (user?.role === "admin" || user?.isAdmin) {
      setAllowed(true);
      return;
    }
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/me`, {
          headers: { Authorization: `Bearer ${token}`, "X-Device-Id": getOrCreateDeviceId() },
        });
        const data = (await response.json()) as { user?: { role?: string; isAdmin?: boolean } };
        const ok = Boolean(data.user?.isAdmin || data.user?.role === "admin");
        setAllowed(ok);
      } catch {
        setAllowed(false);
      }
    })();
  }, []);

  if (allowed === null) {
    return (
      <SiteShell>
        <p className="muted" style={{ padding: "2rem" }}>
          Loading admin panel…
        </p>
      </SiteShell>
    );
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return (
    <SiteShell>
      <header className="admin-dashboard-page-header">
        <Link to="/" className="secondary-btn" onClick={() => navigate("/")}>
          ← Back to builder
        </Link>
      </header>
      <AdminDashboard apiBase={API_BASE} authToken={authToken} deviceId={getOrCreateDeviceId()} />
    </SiteShell>
  );
}
