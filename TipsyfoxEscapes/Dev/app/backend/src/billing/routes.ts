import type { Express, Request, Response } from "express";
import express from "express";
import { billingPlanById, toPublicBillingPlans } from "./catalog.js";
import {
  completePendingOrderFromWebhook,
  createSquareCheckout,
  lookupCheckoutStatus,
  readSquareConfig,
  resolveFulfillmentByCheckoutRef,
  resolveFulfillmentFromWebhook,
  verifySquareWebhookSignature,
} from "./square.js";

export type BillingRouteDeps = {
  readAuthUser: (req: Request) => { id: string; email: string; isAdmin: boolean } | null;
  findUserById: (userId: string) => {
    id: string;
    email: string;
    roomAllowance: number;
    exportCreditsRemaining: number;
  } | null;
  applyPlanTopUp: (
    user: { roomAllowance: number; exportCreditsRemaining: number },
    planId: string,
  ) => { roomsAdded: number; exportCreditsAdded: number } | null;
  persistUsers: () => Promise<void>;
  appendBillingAudit: (entry: {
    ts?: string;
    userId?: string;
    email?: string;
    action: string;
    detail?: Record<string, unknown>;
  }) => Promise<void>;
  toPublicUser: (user: { id: string; email: string; roomAllowance: number; exportCreditsRemaining: number }) => unknown;
};

const fulfillCheckout = async (
  deps: BillingRouteDeps,
  fulfillment: { pendingOrderId: string; planId: string; userId: string; email: string; alreadyCompleted: boolean },
  auditAction: string,
  auditDetail: Record<string, unknown>,
): Promise<{ user: unknown; roomsAdded: number; exportCreditsAdded: number; alreadyCompleted: boolean } | null> => {
  if (fulfillment.alreadyCompleted) {
    const user = deps.findUserById(fulfillment.userId);
    if (!user) return null;
    return { user: deps.toPublicUser(user), roomsAdded: 0, exportCreditsAdded: 0, alreadyCompleted: true };
  }

  const user = deps.findUserById(fulfillment.userId);
  if (!user) return null;

  const topUp = deps.applyPlanTopUp(user, fulfillment.planId);
  if (!topUp) return null;

  await deps.persistUsers();
  await completePendingOrderFromWebhook(fulfillment.pendingOrderId, auditDetail);
  await deps.appendBillingAudit({
    userId: fulfillment.userId,
    email: fulfillment.email,
    action: auditAction,
    detail: { planId: fulfillment.planId, pendingOrderId: fulfillment.pendingOrderId, ...auditDetail },
  });

  return {
    user: deps.toPublicUser(user),
    roomsAdded: topUp.roomsAdded,
    exportCreditsAdded: topUp.exportCreditsAdded,
    alreadyCompleted: false,
  };
};

/** Register before `express.json()` so the webhook signature uses the raw body. */
export const registerSquareWebhook = (app: Express, getDeps: () => BillingRouteDeps): void => {
  app.post(
    "/api/billing/square/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const rawBody =
        typeof req.body === "string"
          ? req.body
          : Buffer.isBuffer(req.body)
            ? req.body.toString("utf8")
            : JSON.stringify(req.body ?? {});
      const signature = String(req.headers["x-square-hmacsha256-signature"] ?? "");

      const cfg = readSquareConfig();
      if (!cfg.webhookSignatureKey || !cfg.webhookNotificationUrl) {
        res.status(503).json({
          error: {
            code: "WEBHOOK_NOT_CONFIGURED",
            message: "Set SQUARE_WEBHOOK_SIGNATURE_KEY and SQUARE_WEBHOOK_NOTIFICATION_URL.",
            details: [],
          },
        });
        return;
      }

      const valid = await verifySquareWebhookSignature(rawBody, signature);
      if (!valid) {
        res.status(403).json({ error: { code: "INVALID_SIGNATURE", message: "Square webhook signature invalid.", details: [] } });
        return;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody) as unknown;
      } catch {
        res.status(400).json({ error: { code: "INVALID_JSON", message: "Webhook body is not JSON.", details: [] } });
        return;
      }

      const fulfillment = await resolveFulfillmentFromWebhook(payload);
      if (!fulfillment) {
        res.json({ ok: true, ignored: true });
        return;
      }

      const result = await fulfillCheckout(getDeps(), fulfillment, "square_checkout_completed", {
        source: "square_webhook",
      });
      if (!result) {
        res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "Checkout user not found.", details: [] } });
        return;
      }

      res.json({ ok: true, fulfilled: !result.alreadyCompleted, user: result.user });
    },
  );
};

export const registerBillingRoutes = (app: Express, getDeps: () => BillingRouteDeps): void => {
  const deps = (): BillingRouteDeps => getDeps();
  app.get("/api/billing/plans", (_req, res: Response) => {
    const square = readSquareConfig();
    res.json({
      plans: toPublicBillingPlans(),
      square: {
        configured: square.configured,
        environment: square.environment,
        applicationId: square.applicationId || null,
        locationId: square.configured ? square.locationId : null,
        setupHint: square.setupHint,
      },
      billingModel: "one_time_room_packs",
    });
  });

  app.post("/api/billing/checkout", async (req, res) => {
    const user = deps().readAuthUser(req);
    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth token is required.", details: [] } });
      return;
    }
    if (user.isAdmin) {
      res.status(400).json({
        error: { code: "ADMIN_NO_CHECKOUT", message: "Admin accounts already have full access.", details: [] },
      });
      return;
    }

    const planId = String((req.body as { planId?: string })?.planId ?? "").trim();
    const plan = billingPlanById(planId);
    if (!plan || !plan.purchasable) {
      res.status(400).json({ error: { code: "INVALID_PLAN", message: "Unknown or non-purchasable plan.", details: [] } });
      return;
    }

    const square = readSquareConfig();
    if (!square.configured) {
      res.status(503).json({
        error: {
          code: "SQUARE_NOT_CONFIGURED",
          message:
            square.setupHint ??
            "Square payments are not configured. Set SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, and SQUARE_ENVIRONMENT on the server.",
          details: [],
        },
      });
      return;
    }

    try {
      const checkout = await createSquareCheckout({
        userId: user.id,
        email: user.email,
        plan,
      });
      res.json({
        checkoutUrl: checkout.checkoutUrl,
        pendingOrderId: checkout.pendingOrderId,
        plan: { id: plan.id, name: plan.name, priceLabel: toPublicBillingPlans().find((p) => p.id === plan.id)?.priceLabel },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start Square checkout.";
      res.status(502).json({ error: { code: "CHECKOUT_FAILED", message, details: [] } });
    }
  });

  app.get("/api/billing/checkout/:orderId/status", async (req, res) => {
    const user = deps().readAuthUser(req);
    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth token is required.", details: [] } });
      return;
    }
    const orderId = String(req.params.orderId ?? "").trim();
    const status = await lookupCheckoutStatus(orderId, user.id);
    if (!status) {
      res.status(404).json({ error: { code: "ORDER_NOT_FOUND", message: "Checkout session not found.", details: [] } });
      return;
    }
    res.json(status);
  });

  /** After redirect from Square, client may call this once to fulfill if webhook is delayed (sandbox/dev). */
  app.post("/api/billing/checkout/confirm", async (req, res) => {
    const user = deps().readAuthUser(req);
    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth token is required.", details: [] } });
      return;
    }
    const ref = String((req.body as { ref?: string })?.ref ?? "").trim();
    if (!ref) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "ref is required.", details: [] } });
      return;
    }

    const fulfillment = await resolveFulfillmentByCheckoutRef(ref);
    if (!fulfillment || fulfillment.userId !== user.id) {
      res.status(404).json({ error: { code: "ORDER_NOT_FOUND", message: "Checkout session not found.", details: [] } });
      return;
    }

    if (fulfillment.alreadyCompleted) {
      const existing = deps().findUserById(user.id);
      res.json({
        ok: true,
        alreadyFulfilled: true,
        user: existing ? deps().toPublicUser(existing) : null,
      });
      return;
    }

    const square = readSquareConfig();
    if (!square.configured) {
      res.status(503).json({
        error: {
          code: "SQUARE_NOT_CONFIGURED",
          message: square.setupHint ?? "Cannot confirm checkout until Square is configured.",
          details: [],
        },
      });
      return;
    }

    const result = await fulfillCheckout(deps(), fulfillment, "square_checkout_confirm", {
      source: "client_confirm",
    });
    if (!result) {
      res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found.", details: [] } });
      return;
    }

    res.json({
      ok: true,
      fulfilled: !result.alreadyCompleted,
      roomsAdded: result.roomsAdded,
      exportCreditsAdded: result.exportCreditsAdded,
      user: result.user,
    });
  });

  /** Web Payments SDK nonce handler (stub — charge + fulfill wired next). */
  app.post("/api/payments/square/process", async (req, res) => {
    const user = deps().readAuthUser(req);
    if (!user) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth token is required.", details: [] } });
      return;
    }
    const sourceId = String((req.body as { sourceId?: string })?.sourceId ?? "").trim();
    const planId = String((req.body as { planId?: string })?.planId ?? "").trim();
    if (!sourceId || !planId) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "sourceId and planId are required.", details: [] },
      });
      return;
    }
    const plan = billingPlanById(planId);
    if (!plan || !plan.purchasable) {
      res.status(400).json({ error: { code: "INVALID_PLAN", message: "Unknown or non-purchasable plan.", details: [] } });
      return;
    }
    const square = readSquareConfig();
    if (!square.configured) {
      res.status(503).json({
        error: {
          code: "SQUARE_NOT_CONFIGURED",
          message: square.setupHint ?? "Square payments are not configured on the server.",
          details: [],
        },
      });
      return;
    }
    res.status(202).json({
      ok: true,
      status: "stub",
      message: "Payment nonce received. Server-side charge fulfillment will complete this flow.",
      planId,
    });
  });
};
