/**
 * Public catalog: value-driven subscriptions and passes.
 * Prices in USD cents — UI and Square checkout read from this file.
 */
import {
  calculateEscapePlanPrice,
  DEFAULT_INCLUDED_LAYOUT_ROOMS,
  DEFAULT_PER_ADDITIONAL_ROOM_CENTS,
} from "../../../shared/escapePlanPricing.js";

export type BillingPlanId =
  | "free"
  | "casual_hobbyist"
  | "home_enthusiast"
  | "creative_studio"
  | "venue_blueprint";

/** @deprecated Legacy IDs map to new tiers for existing purchases */
export type LegacyBillingPlanId = "single" | "home_host" | "studio" | "venue";

export type BillingInterval = "free" | "one_time" | "monthly" | "annual" | "enterprise";

export type TierLane = "home" | "operator" | "enterprise";

export type ScalableRoomPricing = {
  includedLayoutRooms: number;
  perAdditionalRoomCents: number;
  exportCreditsPerRoom?: number;
};

export type BillingPlanDefinition = {
  id: BillingPlanId;
  name: string;
  tagline: string;
  /** Primary price shown on card */
  priceCents: number;
  currency: "USD";
  /** e.g. "30-Day Event Pass · or $9/month" */
  priceSubtitle?: string;
  billingInterval: BillingInterval;
  tierLane: TierLane;
  roomsToAdd: number;
  exportCreditsToAdd: number;
  features: string[];
  /** Short value line under price (replaces per-room pack detail) */
  valueHeadline?: string;
  /** Core focus — shown instead of "Compared to" on marketing cards */
  valueFocus: string;
  purchasable: boolean;
  highlight?: boolean;
  /** Per-layout-room escalation at checkout (Creative Studio). */
  scalableRoomPricing?: ScalableRoomPricing;
  /** @deprecated Use valueFocus in UI */
  comparedTo?: string;
};

const LEGACY_PLAN_ALIASES: Record<string, BillingPlanId> = {
  single: "casual_hobbyist",
  home_host: "home_enthusiast",
  studio: "creative_studio",
  venue: "venue_blueprint",
};

/** Legacy enterprise tier — retained for purchased plan resolution, hidden from public catalog. */
const VENUE_BLUEPRINT_LEGACY: BillingPlanDefinition = {
  id: "venue_blueprint",
  name: "The Venue Blueprint",
  tagline: "Enterprise fleet management for multi-room operators",
  priceCents: 24900,
  currency: "USD",
  priceSubtitle: "From $249/month · custom enterprise pricing available",
  billingInterval: "enterprise",
  tierLane: "enterprise",
  roomsToAdd: 25,
  exportCreditsToAdd: 25,
  purchasable: false,
  valueHeadline: "Unlimited saved rooms · fleet-scale live ops",
  valueFocus: "Multi-room fleet management, leaderboards, and real-time display mapping for corporate teams.",
  features: [
    "Unlimited saved rooms (fair-use policy)",
    "Multi-room fleet management — active session ID per room",
    "Interactive reset checklists for staff",
    "Real-time SSE display mapping across rooms",
    "Public leaderboards for corporate & competitive teams",
    "Full Gamemaster Live Console suite + priority onboarding",
  ],
  comparedTo: "",
};

export const BILLING_PLANS: BillingPlanDefinition[] = [
  {
    id: "free",
    name: "Trial",
    tagline: "Design one complete room — explore Home or Retail Venue flows",
    priceCents: 0,
    currency: "USD",
    billingInterval: "free",
    tierLane: "home",
    roomsToAdd: 0,
    exportCreditsToAdd: 0,
    purchasable: false,
    valueHeadline: "One curated design pass",
    valueFocus:
      "Text-only narrative planning — story beats, puzzle objectives, and a printable host runbook preview. No maker electronics packs.",
    features: [
      "Same three curated themes every trial",
      "One narrative runbook export (text-only — no wiring diagrams, pinouts, or Arduino source)",
      "Replace puzzles during your trial run",
      "Home Mode: standard runbook + basic player screen",
      "Saving to your account requires a paid plan",
    ],
    comparedTo: "",
  },
  {
    id: "casual_hobbyist",
    name: "The Casual Hobbyist Pass",
    tagline: "Lightweight entry for backyard parties and birthdays",
    priceCents: 1500,
    currency: "USD",
    priceSubtitle: "30-Day Event Pass · or $9/month",
    billingInterval: "one_time",
    tierLane: "home",
    roomsToAdd: 1,
    exportCreditsToAdd: 1,
    purchasable: true,
    highlight: true,
    valueHeadline: "1 active room · full catalog · standard runbook",
    valueFocus:
      "Low-barrier hosting for casual events — narrative runbooks and host sheets only, without maker electronics detail.",
    features: [
      "1 active room slot",
      "Full theme catalog (beyond the trial’s fixed trio)",
      "Standard Home Mode runbook export",
      "Exports omit maker electronics — no wiring diagrams, pinouts, SVG schematics, or Arduino source",
      "Player screen with timer and preset hints",
    ],
    comparedTo: "",
  },
  {
    id: "home_enthusiast",
    name: "The Home Host Enthusiast",
    tagline: "For dedicated home haunters building a season of rooms",
    priceCents: 5900,
    currency: "USD",
    billingInterval: "one_time",
    tierLane: "home",
    roomsToAdd: 3,
    exportCreditsToAdd: 3,
    purchasable: true,
    valueHeadline: "3 saved rooms · 3 export credits · electronics unlocked",
    valueFocus: "Heavy hobbyists who want wiring notes, diagrams, and Arduino detail in exports.",
    features: [
      "3 saved room slots and 3 full export credits",
      "Maker pack in exports: wiring diagrams, SVG schematics, pinouts, and Arduino source",
      "Custom themes",
      "Optional Commercial Venue layout preview on export",
    ],
    comparedTo: "",
  },
  {
    id: "creative_studio",
    name: "The Creative Studio",
    tagline: "Recurring operator rights for small venues and repeat builders",
    priceCents: 14900,
    currency: "USD",
    priceSubtitle: "$149/month base · +$39 per additional layout room",
    billingInterval: "monthly",
    tierLane: "operator",
    roomsToAdd: 1,
    exportCreditsToAdd: 2,
    purchasable: true,
    highlight: true,
    scalableRoomPricing: {
      includedLayoutRooms: DEFAULT_INCLUDED_LAYOUT_ROOMS,
      perAdditionalRoomCents: DEFAULT_PER_ADDITIONAL_ROOM_CENTS,
      exportCreditsPerRoom: 2,
    },
    valueHeadline: "Scalable layout rooms · white-label staff run sheets",
    valueFocus: "Commercial operator rights with Gamemaster Live Console — add layout rooms as your venue grows.",
    features: [
      "1 layout room included (+$39/month per additional layout room at checkout)",
      "Commercial operator rights",
      "100% white-labeled staff run sheets",
      "Gamemaster Live Console — timer, clue box, and basic reporting",
      "Player window with SSE sync to in-room displays",
      "Interactive staff reset checklists",
    ],
    comparedTo: "",
  },
  VENUE_BLUEPRINT_LEGACY,
];

export const isPublicCatalogPlan = (plan: BillingPlanDefinition): boolean =>
  plan.id !== "venue_blueprint" && plan.tierLane !== "enterprise";

export const resolveBillingPlanId = (id: string): BillingPlanId | undefined => {
  const normalized = LEGACY_PLAN_ALIASES[id] ?? id;
  return BILLING_PLANS.find((p) => p.id === normalized)?.id;
};

export const billingPlanById = (id: string): BillingPlanDefinition | undefined => {
  const resolved = resolveBillingPlanId(id);
  if (!resolved) return undefined;
  return BILLING_PLANS.find((p) => p.id === resolved);
};

export const quotePlanCheckout = (
  plan: BillingPlanDefinition,
  layoutRoomCount?: number,
): { totalCents: number; roomsToAdd: number; exportCreditsToAdd: number } => {
  if (plan.scalableRoomPricing && layoutRoomCount && layoutRoomCount > 0) {
    const quote = calculateEscapePlanPrice(layoutRoomCount, {
      basePriceCents: plan.priceCents,
      includedLayoutRooms: plan.scalableRoomPricing.includedLayoutRooms,
      perAdditionalRoomCents: plan.scalableRoomPricing.perAdditionalRoomCents,
      exportCreditsPerRoom: plan.scalableRoomPricing.exportCreditsPerRoom,
    });
    return {
      totalCents: quote.totalCents,
      roomsToAdd: quote.roomsToAdd,
      exportCreditsToAdd: quote.exportCreditsToAdd,
    };
  }
  return {
    totalCents: plan.priceCents,
    roomsToAdd: plan.roomsToAdd,
    exportCreditsToAdd: plan.exportCreditsToAdd,
  };
};

export const formatPlanPrice = (plan: BillingPlanDefinition, layoutRoomCount?: number): string => {
  if (plan.billingInterval === "enterprise" && !plan.purchasable) {
    return "Custom";
  }
  if (plan.priceCents <= 0) return "Free";
  if (plan.scalableRoomPricing) {
    const quote = quotePlanCheckout(plan, layoutRoomCount ?? plan.scalableRoomPricing.includedLayoutRooms);
    const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency }).format(
      quote.totalCents / 100,
    );
    if ((layoutRoomCount ?? 1) <= plan.scalableRoomPricing.includedLayoutRooms) {
      return `From ${formatted}/mo`;
    }
    return `${formatted}/mo`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency }).format(plan.priceCents / 100);
};

export const perRoomPriceLabel = (plan: BillingPlanDefinition): string | null => {
  if (!plan.scalableRoomPricing) return null;
  const perRoom = new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency }).format(
    plan.scalableRoomPricing.perAdditionalRoomCents / 100,
  );
  return `+${perRoom}/mo per additional layout room`;
};

export type PublicBillingPlan = BillingPlanDefinition & {
  priceLabel: string;
  perRoomPriceLabel: string | null;
};

export const toPublicBillingPlans = (): PublicBillingPlan[] =>
  BILLING_PLANS.filter(isPublicCatalogPlan).map((plan) => ({
    ...plan,
    priceLabel: formatPlanPrice(plan),
    perRoomPriceLabel: perRoomPriceLabel(plan),
    comparedTo: plan.valueFocus,
  }));
