import crypto from "crypto";
import { SquareClient, SquareEnvironment, WebhooksHelper } from "square";
import type { BillingPlanDefinition } from "./catalog.js";
import { billingPlanById } from "./catalog.js";
import {
  createPendingOrder,
  getPendingOrder,
  getPendingOrderByReference,
  markOrderCompleted,
  updatePendingOrder,
} from "./pendingOrders.js";

export type SquareConfig = {
  configured: boolean;
  environment: "sandbox" | "production";
  locationId: string;
  accessToken: string;
  webhookSignatureKey: string;
  webhookNotificationUrl: string;
  appPublicUrl: string;
};

export const readSquareConfig = (): SquareConfig => {
  const accessToken = String(process.env.SQUARE_ACCESS_TOKEN ?? "").trim();
  const locationId = String(process.env.SQUARE_LOCATION_ID ?? "").trim();
  const envRaw = String(process.env.SQUARE_ENVIRONMENT ?? "sandbox").trim().toLowerCase();
  const environment = envRaw === "production" ? "production" : "sandbox";
  const webhookSignatureKey = String(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? "").trim();
  const webhookNotificationUrl = String(process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ?? "").trim();
  const appPublicUrl =
    String(process.env.APP_PUBLIC_URL ?? process.env.AUTH_CALLBACK_BASE_URL ?? "http://localhost:5173").replace(
      /\/$/,
      "",
    );
  return {
    configured: Boolean(accessToken && locationId),
    environment,
    locationId,
    accessToken,
    webhookSignatureKey,
    webhookNotificationUrl,
    appPublicUrl,
  };
};

const squareClient = (): SquareClient => {
  const cfg = readSquareConfig();
  if (!cfg.configured) {
    throw new Error("Square is not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID.");
  }
  return new SquareClient({
    token: cfg.accessToken,
    environment: cfg.environment === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });
};

export const squareReferenceForOrder = (pendingOrderId: string): string => `erb_${pendingOrderId}`;

export const createSquareCheckout = async (input: {
  userId: string;
  email: string;
  plan: BillingPlanDefinition;
}): Promise<{ checkoutUrl: string; pendingOrderId: string }> => {
  const cfg = readSquareConfig();
  if (!cfg.configured) {
    throw new Error("Square payments are not configured on this server.");
  }
  if (!input.plan.purchasable || input.plan.priceCents <= 0) {
    throw new Error("This plan cannot be purchased.");
  }

  const pending = await createPendingOrder({
    userId: input.userId,
    email: input.email,
    planId: input.plan.id,
  });
  const referenceId = squareReferenceForOrder(pending.id);
  const client = squareClient();
  const idempotencyKey = crypto.randomUUID();

  const response = await client.checkout.paymentLinks.create({
    idempotencyKey,
    description: `Escape Room Builder — ${input.plan.name}`,
    order: {
      locationId: cfg.locationId,
      referenceId,
      lineItems: [
        {
          name: input.plan.name,
          quantity: "1",
          basePriceMoney: {
            amount: BigInt(input.plan.priceCents),
            currency: input.plan.currency,
          },
        },
      ],
      metadata: {
        erb_user_id: input.userId,
        erb_plan_id: input.plan.id,
        erb_pending_order_id: pending.id,
      },
    },
    checkoutOptions: {
      redirectUrl: `${cfg.appPublicUrl}/?checkout=success&ref=${encodeURIComponent(pending.id)}`,
      merchantSupportEmail: input.email,
    },
  });

  const paymentLink = response.paymentLink;
  const checkoutUrl = paymentLink?.url;
  if (!checkoutUrl) {
    throw new Error("Square did not return a checkout URL.");
  }

  await updatePendingOrder(pending.id, {
    squarePaymentLinkId: paymentLink?.id ?? undefined,
    squareOrderId: paymentLink?.orderId ?? undefined,
  });

  return { checkoutUrl, pendingOrderId: pending.id };
};

export type SquareWebhookFulfillment = {
  pendingOrderId: string;
  planId: string;
  userId: string;
  email: string;
  alreadyCompleted: boolean;
};

const parseReferenceId = (referenceId: string | undefined | null): string | null => {
  const raw = String(referenceId ?? "").trim();
  if (!raw.startsWith("erb_")) return null;
  return raw.slice(4) || null;
};

export const resolveFulfillmentFromWebhook = async (
  body: unknown,
): Promise<SquareWebhookFulfillment | null> => {
  const payload = body as {
    type?: string;
    data?: {
      type?: string;
      id?: string;
      object?: {
        payment?: {
          status?: string;
          order_id?: string;
          reference_id?: string;
        };
        order?: {
          reference_id?: string;
          metadata?: Record<string, string>;
        };
      };
    };
  };

  const eventType = String(payload.type ?? "");
  const payment = payload.data?.object?.payment;
  const order = payload.data?.object?.order;

  const paymentOk =
    eventType === "payment.updated" || eventType === "payment.created" || eventType === "payment.completed";
  if (payment && paymentOk) {
    const status = String(payment.status ?? "").toUpperCase();
    if (status !== "COMPLETED") return null;
  } else if (eventType !== "order.updated" && eventType !== "order.created") {
    return null;
  }

  const metaPending = String(order?.metadata?.erb_pending_order_id ?? "").trim();
  let pendingId =
    parseReferenceId(payment?.reference_id) ??
    parseReferenceId(order?.reference_id) ??
    (metaPending || null);

  if (!pendingId) return null;

  const pending = await getPendingOrder(pendingId);
  if (!pending) return null;

  const plan = billingPlanById(pending.planId);
  if (!plan) return null;

  return {
    pendingOrderId: pending.id,
    planId: pending.planId,
    userId: pending.userId,
    email: pending.email,
    alreadyCompleted: pending.status === "completed",
  };
};

export const verifySquareWebhookSignature = async (
  rawBody: string,
  signatureHeader: string,
): Promise<boolean> => {
  const cfg = readSquareConfig();
  if (!cfg.webhookSignatureKey || !cfg.webhookNotificationUrl) return false;
  return WebhooksHelper.verifySignature({
    requestBody: rawBody,
    signatureHeader,
    signatureKey: cfg.webhookSignatureKey,
    notificationUrl: cfg.webhookNotificationUrl,
  });
};

export const completePendingOrderFromWebhook = async (
  pendingOrderId: string,
  detail: { squarePaymentLinkId?: string; squareOrderId?: string },
): Promise<void> => {
  await markOrderCompleted(pendingOrderId, detail);
};

export const lookupCheckoutStatus = async (
  pendingOrderId: string,
  userId: string,
): Promise<{ status: string; planId: string } | null> => {
  const pending = await getPendingOrder(pendingOrderId);
  if (!pending || pending.userId !== userId) return null;
  return { status: pending.status, planId: pending.planId };
};

export const resolveFulfillmentByCheckoutRef = async (
  ref: string,
): Promise<SquareWebhookFulfillment | null> => {
  const pending = await getPendingOrderByReference(`erb_${ref}`) ?? (await getPendingOrder(ref));
  if (!pending) return null;
  const plan = billingPlanById(pending.planId);
  if (!plan) return null;
  return {
    pendingOrderId: pending.id,
    planId: pending.planId,
    userId: pending.userId,
    email: pending.email,
    alreadyCompleted: pending.status === "completed",
  };
};
