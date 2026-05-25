import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getDataDir } from "../dataDir.js";
import { assertAbsolutePath } from "../resolveModuleFilename.js";

export type PendingCheckoutOrder = {
  id: string;
  userId: string;
  email: string;
  planId: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
  squarePaymentLinkId?: string;
  squareOrderId?: string;
  /** Scalable operator checkout — layout rooms purchased. */
  layoutRoomCount?: number;
  priceCentsCharged?: number;
};

type PendingOrdersFile = { orders: PendingCheckoutOrder[] };

const pendingOrdersPath = (): string =>
  path.join(getDataDir(), assertAbsolutePath("pending orders file", "billing-pending-orders.json"));
let cache: PendingCheckoutOrder[] | null = null;

const load = async (): Promise<PendingCheckoutOrder[]> => {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(pendingOrdersPath(), "utf8");
    const parsed = JSON.parse(raw) as PendingOrdersFile;
    cache = Array.isArray(parsed.orders) ? parsed.orders : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") cache = [];
    else cache = [];
  }
  return cache;
};

const persist = async (): Promise<void> => {
  if (!cache) return;
  await fs.mkdir(path.dirname(pendingOrdersPath()), { recursive: true });
  await fs.writeFile(pendingOrdersPath(), JSON.stringify({ orders: cache }, null, 2), "utf8");
};

export const createPendingOrder = async (input: {
  userId: string;
  email: string;
  planId: string;
  layoutRoomCount?: number;
  priceCentsCharged?: number;
}): Promise<PendingCheckoutOrder> => {
  const orders = await load();
  const order: PendingCheckoutOrder = {
    id: crypto.randomBytes(8).toString("hex"),
    userId: input.userId,
    email: input.email,
    planId: input.planId,
    status: "pending",
    createdAt: new Date().toISOString(),
    ...(input.layoutRoomCount && input.layoutRoomCount > 0 ? { layoutRoomCount: input.layoutRoomCount } : {}),
    ...(input.priceCentsCharged && input.priceCentsCharged > 0 ? { priceCentsCharged: input.priceCentsCharged } : {}),
  };
  orders.push(order);
  cache = orders;
  await persist();
  return order;
};

export const getPendingOrder = async (id: string): Promise<PendingCheckoutOrder | undefined> => {
  const orders = await load();
  return orders.find((o) => o.id === id);
};

export const getPendingOrderByReference = async (referenceId: string): Promise<PendingCheckoutOrder | undefined> => {
  const token = referenceId.startsWith("erb_") ? referenceId.slice(4) : referenceId;
  return getPendingOrder(token);
};

export const updatePendingOrder = async (
  id: string,
  patch: Partial<PendingCheckoutOrder>,
): Promise<PendingCheckoutOrder | undefined> => {
  const orders = await load();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx < 0) return undefined;
  orders[idx] = { ...orders[idx], ...patch };
  cache = orders;
  await persist();
  return orders[idx];
};

export const markOrderCompleted = async (
  id: string,
  detail: { squarePaymentLinkId?: string; squareOrderId?: string },
): Promise<PendingCheckoutOrder | undefined> =>
  updatePendingOrder(id, {
    status: "completed",
    completedAt: new Date().toISOString(),
    ...detail,
  });
