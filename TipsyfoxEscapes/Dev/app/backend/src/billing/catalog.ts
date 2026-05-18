/**
 * Public catalog: value-driven subscriptions and passes.
 * Prices in USD cents — UI and Square checkout read from this file.
 */
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
  /** @deprecated Use valueFocus in UI */
  comparedTo?: string;
};

const LEGACY_PLAN_ALIASES: Record<string, BillingPlanId> = {
  single: "casual_hobbyist",
  home_host: "home_enthusiast",
  studio: "creative_studio",
  venue: "venue_blueprint",
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
    valueFocus: "Low-risk way to test the builder before choosing a host or operator plan.",
    features: [
      "Same three curated themes every trial",
      "One full export with electronics (one-time)",
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
    valueFocus: "Low-barrier hosting for casual events — print and play without operator tooling.",
    features: [
      "1 active room slot",
      "Full theme catalog",
      "Standard runbook export (Home Mode)",
      "Player screen with timer + preset hints",
      "No Gamemaster Live Console or multi-room ops",
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
      "3 saved room slots",
      "3 full export credits",
      "Unlocks electronics & tech wiring notes in exports",
      "Full catalog + custom themes",
      "Home Mode player screen; optional Commercial Venue preview on export",
    ],
    comparedTo: "",
  },
  {
    id: "creative_studio",
    name: "The Creative Studio",
    tagline: "Recurring operator rights for small venues and repeat builders",
    priceCents: 14900,
    currency: "USD",
    priceSubtitle: "$149/month · or $1,200/year (save ~33%)",
    billingInterval: "monthly",
    tierLane: "operator",
    roomsToAdd: 5,
    exportCreditsToAdd: 10,
    purchasable: true,
    valueHeadline: "5 concurrent live rooms · white-label staff run sheets",
    valueFocus: "Commercial operator rights with Gamemaster Live Console — timer, clues, and basic reporting.",
    features: [
      "5 concurrent active live rooms",
      "Full commercial operator rights",
      "100% white-labeled staff run sheets",
      "Gamemaster Live Console: timer controls, clue box, basic reporting",
      "Player window + SSE sync to in-room displays",
      "Interactive reset checklists for staff",
    ],
    comparedTo: "",
  },
  {
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
  },
];

export const resolveBillingPlanId = (id: string): BillingPlanId | undefined => {
  const normalized = LEGACY_PLAN_ALIASES[id] ?? id;
  return BILLING_PLANS.find((p) => p.id === normalized)?.id;
};

export const billingPlanById = (id: string): BillingPlanDefinition | undefined => {
  const resolved = resolveBillingPlanId(id);
  if (!resolved) return undefined;
  return BILLING_PLANS.find((p) => p.id === resolved);
};

export const formatPlanPrice = (plan: BillingPlanDefinition): string => {
  if (plan.billingInterval === "enterprise" && !plan.purchasable) {
    return "Custom";
  }
  if (plan.priceCents <= 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency }).format(
    plan.priceCents / 100,
  );
};

export const perRoomPriceLabel = (_plan: BillingPlanDefinition): string | null => null;

export type PublicBillingPlan = BillingPlanDefinition & {
  priceLabel: string;
  perRoomPriceLabel: string | null;
};

export const toPublicBillingPlans = (): PublicBillingPlan[] =>
  BILLING_PLANS.map((plan) => ({
    ...plan,
    priceLabel: formatPlanPrice(plan),
    perRoomPriceLabel: perRoomPriceLabel(plan),
    comparedTo: plan.valueFocus,
  }));
