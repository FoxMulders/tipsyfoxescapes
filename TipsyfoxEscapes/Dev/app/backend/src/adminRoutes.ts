import type express from "express";
import type { BillingPlanId } from "./billing/catalog.js";
import { resolveBillingPlanId } from "./billing/catalog.js";
import {
  resolveLifecycleStatus,
  tierTypeForUser,
  type LifecycleStatus,
  type LifecycleUser,
  type TierTypeLabel,
} from "./userLifecycle.js";

export type AdminStoredUser = LifecycleUser & {
  id: string;
  name: string;
  email: string;
  username: string;
  provider: "local" | "google" | "facebook" | "github";
  isAdmin: boolean;
  role?: "admin" | "user";
  lastPurchasedPlanId?: BillingPlanId;
  isEnterpriseProvisioned?: boolean;
  createdAt?: string;
};

export type AdminRouteDeps = {
  readAuthUser: (req: express.Request) => AdminStoredUser | undefined;
  usersByEmail: Map<string, AdminStoredUser>;
  persistUsers: () => Promise<void>;
  appendBillingAudit: (entry: {
    ts: string;
    action: string;
    email?: string;
    detail?: Record<string, unknown>;
  }) => Promise<void>;
  readBillingAudit: (limit: number) => Promise<Array<Record<string, unknown>>>;
  toPublicUser: (user: AdminStoredUser) => Record<string, unknown>;
};

const requireAdmin = (deps: AdminRouteDeps, req: express.Request, res: express.Response): AdminStoredUser | null => {
  const user = deps.readAuthUser(req);
  if (!user) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth token is required.", details: [] } });
    return null;
  }
  if (!user.isAdmin && user.role !== "admin") {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Administrator access required.", details: [] } });
    return null;
  }
  return user;
};

const adminUserRow = (user: AdminStoredUser) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  name: user.name,
  tierType: tierTypeForUser(user) as TierTypeLabel,
  lifecycleStatus: resolveLifecycleStatus(user) as LifecycleStatus,
  role: user.isAdmin ? "admin" : "user",
  roomAllowance: user.roomAllowance,
  exportCreditsRemaining: user.exportCreditsRemaining,
  subscriptionActive: user.subscriptionActive ?? null,
  subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
  lastPurchasedPlanId: user.lastPurchasedPlanId ?? null,
  provider: user.provider,
  trialUsedAt: user.trialUsedAt ?? null,
  isEnterpriseProvisioned: Boolean(user.isEnterpriseProvisioned),
  createdAt: user.createdAt ?? null,
});

export const registerAdminRoutes = (app: express.Express, deps: AdminRouteDeps): void => {
  app.get("/api/admin/users", async (req, res) => {
    if (!requireAdmin(deps, req, res)) return;
    const q = String(req.query.search ?? "")
      .trim()
      .toLowerCase();
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(10, Number.parseInt(String(req.query.pageSize ?? "25"), 10) || 25));
    let rows = Array.from(deps.usersByEmail.values()).map(adminUserRow);
    if (q) {
      rows = rows.filter(
        (r) =>
          r.email.includes(q) ||
          r.username.includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => a.email.localeCompare(b.email));
    const total = rows.length;
    const start = (page - 1) * pageSize;
    const users = rows.slice(start, start + pageSize);
    res.json({ users, page, pageSize, total });
  });

  app.patch("/api/admin/users/:userId", async (req, res) => {
    const admin = requireAdmin(deps, req, res);
    if (!admin) return;
    const userId = String(req.params.userId ?? "").trim();
    const target = Array.from(deps.usersByEmail.values()).find((u) => u.id === userId);
    if (!target) {
      res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found.", details: [] } });
      return;
    }
    const body = req.body as Record<string, unknown>;
    if (typeof body.roomAllowance === "number" && Number.isFinite(body.roomAllowance)) {
      target.roomAllowance = Math.max(0, Math.min(100_000, Math.floor(body.roomAllowance)));
    }
    if (typeof body.exportCreditsRemaining === "number" && Number.isFinite(body.exportCreditsRemaining)) {
      target.exportCreditsRemaining = Math.max(0, Math.min(500_000, Math.floor(body.exportCreditsRemaining)));
    }
    if (typeof body.isAdmin === "boolean") {
      target.isAdmin = body.isAdmin;
      target.role = body.isAdmin ? "admin" : "user";
    }
    if (body.role === "admin" || body.role === "user") {
      target.role = body.role;
      target.isAdmin = body.role === "admin";
    }
    if (typeof body.isEnterpriseProvisioned === "boolean") {
      target.isEnterpriseProvisioned = body.isEnterpriseProvisioned;
    }
    if (body.lifecycleStatus === "active" || body.lifecycleStatus === "delinquent" || body.lifecycleStatus === "canceled") {
      target.lifecycleStatus = body.lifecycleStatus;
    }
    if (typeof body.subscriptionActive === "boolean") target.subscriptionActive = body.subscriptionActive;
    if (body.subscriptionExpiresAt === null || typeof body.subscriptionExpiresAt === "string") {
      target.subscriptionExpiresAt = body.subscriptionExpiresAt;
    }
    if (typeof body.lastPurchasedPlanId === "string") {
      const resolved = resolveBillingPlanId(body.lastPurchasedPlanId);
      if (resolved) target.lastPurchasedPlanId = resolved;
    }
    if (typeof body.trialUsedAt === "string" || body.trialUsedAt === null) {
      target.trialUsedAt = body.trialUsedAt;
    }
    await deps.persistUsers();
    await deps.appendBillingAudit({
      ts: new Date().toISOString(),
      action: "admin_user_patch",
      email: target.email,
      detail: { adminEmail: admin.email, patch: body },
    });
    res.json({ user: deps.toPublicUser(target) });
  });

  app.get("/api/admin/audit", async (req, res) => {
    if (!requireAdmin(deps, req, res)) return;
    const limit = Math.min(500, Math.max(20, Number.parseInt(String(req.query.limit ?? "100"), 10) || 100));
    const emailFilter = String(req.query.email ?? "")
      .trim()
      .toLowerCase();
    let entries = await deps.readBillingAudit(limit * 3);
    if (emailFilter) {
      entries = entries.filter((e) => String(e.email ?? "").toLowerCase().includes(emailFilter));
    }
    res.json({ entries: entries.slice(0, limit) });
  });
};
