/**
 * Public catalog: one-time room packs (slots do not expire).
 * Prices in USD cents — edit here; UI and Square checkout read from this file.
 *
 * Per-room positioning: personal hosts (Home host) < pay-as-you-go (Single) <
 * professional tiers (Studio, Venue) — operators pay more per room than families.
 */
export type BillingPlanId = "free" | "single" | "home_host" | "studio" | "venue";

export type BillingPlanDefinition = {
  id: BillingPlanId;
  name: string;
  tagline: string;
  priceCents: number;
  currency: "USD";
  roomsToAdd: number;
  exportCreditsToAdd: number;
  features: string[];
  /** One inline sentence after "Compared to:" in the UI */
  comparedTo: string;
  purchasable: boolean;
  highlight?: boolean;
};

export const BILLING_PLANS: BillingPlanDefinition[] = [
  {
    id: "free",
    name: "Trial",
    tagline: "One complete room design — same curated themes every time",
    priceCents: 0,
    currency: "USD",
    roomsToAdd: 0,
    exportCreditsToAdd: 0,
    purchasable: false,
    features: [
      "Same three curated themes for every trial",
      "One full export with electronics (one-time)",
      "Replace puzzles during the trial run",
      "Saving to your account requires a paid pack",
    ],
    comparedTo:
      "one family night out at a venue (~$120–$160 for four people, one hour); Trial is a single at-home design pass—you cannot save the plan until you purchase a pack.",
  },
  {
    id: "single",
    name: "Single room",
    tagline: "One complete room design — pay as you go",
    priceCents: 4900,
    currency: "USD",
    roomsToAdd: 1,
    exportCreditsToAdd: 1,
    purchasable: true,
    highlight: true,
    features: [
      "1 additional saved-room slot",
      "1 full electronic export credit",
      "Full theme catalog, refresh, and custom themes",
      "Best when you only need one extra room this season",
    ],
    comparedTo:
      "one family night out (~$120–$240 for 4–6 people at a commercial room); you keep a reusable host plan to run at home, not a single timed session.",
  },
  {
    id: "home_host",
    name: "Home host pack",
    tagline: "Birthdays, family game nights, and backyard parties",
    priceCents: 11900,
    currency: "USD",
    roomsToAdd: 3,
    exportCreditsToAdd: 3,
    purchasable: true,
    features: [
      "3 additional saved-room slots",
      "3 full electronic export credits",
      "Full catalog for personal hosting seasons",
      "Bring-your-own custom themes",
    ],
    comparedTo:
      "three family nights out at a venue (~$360–$720 total for groups of 4–6 across three visits)—for three room plans you can host at home again and again.",
  },
  {
    id: "studio",
    name: "Studio pack",
    tagline: "Repeat builders running several rooms a year",
    priceCents: 64900,
    currency: "USD",
    roomsToAdd: 10,
    exportCreditsToAdd: 10,
    purchasable: true,
    features: [
      "10 additional saved-room slots",
      "10 full electronic export credits",
      "Full catalog, custom themes, and refresh",
      "Professional tier — higher per-room than Home host, far below hiring a designer",
    ],
    comparedTo:
      "ten group nights out (~$1,200–$2,400+ for parties of 4–6) or a fraction of one design-firm room ($5,000–$15,000+); about $65 per digital plan—you build and operate.",
  },
  {
    id: "venue",
    name: "Venue pack",
    tagline: "Operators building a library of hosted rooms",
    priceCents: 179900,
    currency: "USD",
    roomsToAdd: 25,
    exportCreditsToAdd: 25,
    purchasable: true,
    features: [
      "25 additional saved-room slots",
      "25 full electronic export credits",
      "Full catalog for multi-room venues",
      "Stackable with org pool bonuses on the server",
    ],
    comparedTo:
      "twenty-five commercial nights out (~$3,000–$6,000+ in tickets for groups of 4–6) or a sliver of turn-key install ($55,000+); about $72 per plan—software and exports only, not build labor or staff.",
  },
];

export const billingPlanById = (id: string): BillingPlanDefinition | undefined =>
  BILLING_PLANS.find((p) => p.id === id);

export const formatPlanPrice = (plan: BillingPlanDefinition): string => {
  if (plan.priceCents <= 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency }).format(
    plan.priceCents / 100,
  );
};

export const perRoomPriceLabel = (plan: BillingPlanDefinition): string | null => {
  if (plan.priceCents <= 0 || plan.roomsToAdd <= 0) return null;
  const perRoom = plan.priceCents / plan.roomsToAdd / 100;
  return `≈ ${new Intl.NumberFormat("en-US", { style: "currency", currency: plan.currency }).format(perRoom)} per room`;
};

export type PublicBillingPlan = BillingPlanDefinition & {
  priceLabel: string;
  perRoomPriceLabel: string | null;
};

export const toPublicBillingPlans = (): PublicBillingPlan[] =>
  BILLING_PLANS.map((plan) => ({
    ...plan,
    priceLabel: formatPlanPrice(plan),
    perRoomPriceLabel: perRoomPriceLabel(plan),
  }));
