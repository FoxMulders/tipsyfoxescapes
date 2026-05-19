import { useCallback, useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type AdminUserRow = {
  id: string;
  email: string;
  username: string;
  name: string;
  tierType: string;
  lifecycleStatus: string;
  role: string;
  roomAllowance: number;
  exportCreditsRemaining: number;
  subscriptionActive: boolean | null;
  subscriptionExpiresAt: string | null;
  lastPurchasedPlanId: string | null;
  provider: string;
  trialUsedAt: string | null;
  isEnterpriseProvisioned: boolean;
  createdAt: string | null;
};

type AuditRow = {
  ts?: string;
  email?: string;
  action?: string;
  detail?: Record<string, unknown>;
};
type LiveConnectionRow = { sessionId: string; connections: number };

type AdminDashboardProps = {
  apiBase: string;
  authToken: string;
  deviceId: string;
};

const AUTH_PROVIDER_LABELS: Record<string, string> = {
  local: "Local Email/Password",
  google: "Google",
  facebook: "Facebook",
  github: "GitHub",
};

function providerLabel(provider: string | null | undefined): string {
  return AUTH_PROVIDER_LABELS[String(provider ?? "local").toLowerCase()] ?? "Local Email/Password";
}

function auditStatus(row: AuditRow): string {
  const detailStatus = row.detail?.status;
  if (typeof detailStatus === "string" && detailStatus.trim()) return detailStatus;
  if (row.action?.includes("failed") || row.action?.includes("error")) return "Needs review";
  if (row.action?.includes("cleared") || row.action?.includes("patch")) return "Completed";
  return "Recorded";
}

function InfoTip({ label, children }: { label: string; children: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="admin-dashboard__tip" aria-label={label} tabIndex={0}>
          ?
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">{children}</TooltipContent>
    </Tooltip>
  );
}

export function AdminDashboard({ apiBase, authToken, deviceId }: AdminDashboardProps) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [liveConnections, setLiveConnections] = useState<LiveConnectionRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roomAllowance, setRoomAllowance] = useState("");
  const [exportCredits, setExportCredits] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState("active");
  const [subscriptionActive, setSubscriptionActive] = useState("true");
  const [userRole, setUserRole] = useState("user");
  const [enterpriseProvisioned, setEnterpriseProvisioned] = useState("false");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const headers = useCallback(
    (): HeadersInit => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      "X-Device-Id": deviceId,
    }),
    [authToken, deviceId],
  );

  const loadUsers = useCallback(async () => {
    setError("");
    const params = new URLSearchParams({ page: String(page), pageSize: "25", search });
    if (tierFilter) params.set("tier", tierFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (roleFilter) params.set("role", roleFilter);
    const response = await fetch(`${apiBase}/api/admin/users?${params}`, { headers: headers() });
    const data = (await response.json()) as {
      users?: AdminUserRow[];
      total?: number;
      error?: { message?: string };
    };
    if (!response.ok) {
      setError(data.error?.message ?? "Could not load users.");
      return;
    }
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
  }, [apiBase, headers, page, roleFilter, search, statusFilter, tierFilter]);

  const loadAudit = useCallback(async () => {
    const response = await fetch(`${apiBase}/api/admin/audit?limit=80`, { headers: headers() });
    const data = (await response.json()) as { entries?: AuditRow[]; liveConnections?: LiveConnectionRow[] };
    if (response.ok) {
      setAudit(data.entries ?? []);
      setLiveConnections(data.liveConnections ?? []);
    }
  }, [apiBase, headers]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setRoomAllowance(String(selected.roomAllowance));
    setExportCredits(String(selected.exportCreditsRemaining));
    setLifecycleStatus(selected.lifecycleStatus);
    setSubscriptionActive(selected.subscriptionActive === false ? "false" : "true");
    setUserRole(selected.role === "admin" ? "admin" : "user");
    setEnterpriseProvisioned(selected.isEnterpriseProvisioned ? "true" : "false");
  }, [selected]);

  const patchSelected = async (): Promise<void> => {
    if (!selectedId) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const body: Record<string, unknown> = {
        roomAllowance: Number(roomAllowance),
        exportCreditsRemaining: Number(exportCredits),
        lifecycleStatus,
        subscriptionActive: subscriptionActive === "true",
        role: userRole,
        isEnterpriseProvisioned: enterpriseProvisioned === "true",
      };
      const response = await fetch(`${apiBase}/api/admin/users/${encodeURIComponent(selectedId)}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setError(data.error?.message ?? "Update failed.");
        return;
      }
      setNotice("User updated.");
      await loadUsers();
      await loadAudit();
    } finally {
      setBusy(false);
    }
  };

  const clearSessionLocks = async (userId?: string): Promise<void> => {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/admin/session-locks/clear`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(userId ? { userId } : {}),
      });
      const data = (await response.json()) as { cleared?: number; error?: { message?: string } };
      if (!response.ok) {
        setError(data.error?.message ?? "Could not clear session locks.");
        return;
      }
      setNotice(`Cleared ${data.cleared ?? 0} active session lock(s).`);
      await loadAudit();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <section className="card mission-panel glass-panel">
        <h2 className="subscription-title">Admin — user &amp; subscription management</h2>
        <p className="muted">
          Search the roster, adjust room slots and export credits, and review operational audit entries (logins, generation,
          exports).
        </p>
        <div className="admin-dashboard__toolbar">
          <input
            type="search"
            className="blueprint-input admin-dashboard__search"
            value={search}
            placeholder="Search by User ID, Email, or Username..."
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search users"
          />
          <select
            className="blueprint-input admin-dashboard__compact-control"
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by active plan tier"
          >
            <option value="">All tiers</option>
            <option value="trial">Trial</option>
            <option value="hobbyist">Hobbyist</option>
            <option value="enthusiast">Enthusiast</option>
            <option value="studio">Studio</option>
            <option value="venue">Venue</option>
            <option value="admin">Admin</option>
            <option value="free">Free</option>
          </select>
          <select
            className="blueprint-input admin-dashboard__compact-control"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by lifecycle status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="delinquent">Delinquent</option>
            <option value="canceled">Canceled</option>
          </select>
          <select
            className="blueprint-input admin-dashboard__compact-control"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <button type="button" className="secondary-btn" onClick={() => void loadUsers()}>
            Refresh roster
          </button>
        </div>
        {error ? <p className="error-inline">{error}</p> : null}
        {notice ? <p className="success-inline">{notice}</p> : null}
        <div className="admin-dashboard__grid">
          <div className="admin-dashboard__table-wrap">
            <table className="admin-dashboard__table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Auth</th>
                  <th>Created</th>
                  <th>Tier</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr
                    key={row.id}
                    className={row.id === selectedId ? "admin-dashboard__row--selected" : undefined}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td>{row.id}</td>
                    <td>{row.email}</td>
                    <td>{row.username}</td>
                    <td>{providerLabel(row.provider)}</td>
                    <td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}</td>
                    <td>{row.tierType}</td>
                    <td>{row.lifecycleStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted admin-dashboard__pager">
              Page {page} · {total} users
              {page > 1 ? (
                <button type="button" className="secondary-btn admin-dashboard__pager-btn" onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
              ) : null}
              {page * 25 < total ? (
                <button type="button" className="secondary-btn admin-dashboard__pager-btn" onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              ) : null}
            </p>
          </div>
          <aside className="admin-dashboard__aside glass-panel">
            <h3 className="admin-dashboard__aside-title">Subscription overrides</h3>
            {selected ? (
              <div className="admin-dashboard__form space-y-3">
                <p className="muted text-sm">
                  <strong>{selected.name}</strong> · {selected.email} · {providerLabel(selected.provider)}
                </p>
                <label className="field-row">
                  <span className="admin-dashboard__label-with-tip">
                    Saved room limit
                    <InfoTip label="Saved room limit help">
                      Maximum saved plans this user can keep. Use temporary overrides sparingly and prefer plan purchases for normal increases.
                    </InfoTip>
                  </span>
                  <input type="number" min={0} value={roomAllowance} onChange={(e) => setRoomAllowance(e.target.value)} />
                </label>
                <label className="field-row">
                  <span className="admin-dashboard__label-with-tip">
                    Export credits
                    <InfoTip label="Export credits help">
                      Full runbook export credits remaining for this account. Admin users may still display unlimited behavior elsewhere.
                    </InfoTip>
                  </span>
                  <input type="number" min={0} value={exportCredits} onChange={(e) => setExportCredits(e.target.value)} />
                </label>
                <label className="field-row">
                  <span className="admin-dashboard__label-with-tip">
                    Lifecycle status
                    <InfoTip label="Lifecycle status help">
                      Delinquent and canceled states limit account capabilities; confirm billing records before applying.
                    </InfoTip>
                  </span>
                  <select className="admin-dashboard__compact-control" value={lifecycleStatus} onChange={(e) => setLifecycleStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="delinquent">Delinquent</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </label>
                <label className="field-row">
                  <span className="admin-dashboard__label-with-tip">
                    Subscription active
                    <InfoTip label="Subscription active help">
                      Inactive freezes live operations for operator features while preserving saved plan data.
                    </InfoTip>
                  </span>
                  <select className="admin-dashboard__compact-control" value={subscriptionActive} onChange={(e) => setSubscriptionActive(e.target.value)}>
                    <option value="true">Active</option>
                    <option value="false">Inactive (freeze live ops)</option>
                  </select>
                </label>
                <label className="field-row">
                  <span className="admin-dashboard__label-with-tip">
                    Role
                    <InfoTip label="Role help">
                      Admin role grants roster, subscription override, and session lock controls.
                    </InfoTip>
                  </span>
                  <select className="admin-dashboard__compact-control" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="field-row">
                  <span className="admin-dashboard__label-with-tip">
                    Enterprise fleet provisioned
                    <InfoTip label="Enterprise fleet help">
                      Enables multi-room fleet behavior for manually provisioned enterprise accounts.
                    </InfoTip>
                  </span>
                  <select className="admin-dashboard__compact-control" value={enterpriseProvisioned} onChange={(e) => setEnterpriseProvisioned(e.target.value)}>
                    <option value="false">No — single-room only</option>
                    <option value="true">Yes — multi-room fleet enabled</option>
                  </select>
                </label>
                <button type="button" className="primary-btn" disabled={busy} onClick={() => void patchSelected()}>
                  {busy ? "Saving…" : "Apply overrides"}
                </button>
                <button
                  type="button"
                  className="secondary-btn warning-btn"
                  disabled={busy}
                  title="Clears only this user's active planning session locks; generated and saved plans remain intact."
                  onClick={() => void clearSessionLocks(selected.id)}
                >
                  Clear this user’s session locks
                </button>
              </div>
            ) : (
              <p className="muted">Select a user from the roster.</p>
            )}
            <h3 className="admin-dashboard__aside-title">Operational audit</h3>
            <div className="admin-dashboard__live-connections" role="status">
              <strong>Active live streams:</strong>{" "}
              {liveConnections.length === 0
                ? "0"
                : liveConnections.map((row) => `${row.sessionId} (${row.connections})`).join(", ")}
            </div>
            <button
              type="button"
              className="secondary-btn danger-btn"
              disabled={busy}
              title="Clears all active planning session locks across users. Use when stale sessions block operations."
              onClick={() => void clearSessionLocks()}
            >
              Clear all session locks
            </button>
            <div className="admin-dashboard__audit-table-wrap" role="region" aria-label="Operational audit log">
              <table className="admin-dashboard__audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.slice(0, 80).map((row, i) => (
                    <tr key={`${row.ts ?? i}-${row.action ?? ""}`}>
                      <td>{row.ts ? new Date(row.ts).toLocaleString() : "—"}</td>
                      <td>{row.email ?? "—"}</td>
                      <td>{row.action ?? "—"}</td>
                      <td>{auditStatus(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
