/**
 * Public catalog: one-time room packs (slots do not expire).
 * Prices in USD cents — edit here; UI and Square checkout read from this file.
 *
 * Per-room positioning: personal hosts (Home host) < pay-as-you-go (Single) <
 * professional tiers (Studio, Venue) — operators pay more per room than families.
 *
 * Live ops (Home vs Retail Venue) unlock from Room details → Target interface;
 * see feature bullets per plan below.
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
  /** Placeholder flags for future operator tooling (not enforced in MVP). */
  futureFeatureFlags?: string[];
  /** One inline sentence after "Compared to:" in the UI */
  comparedTo: string;
  purchasable: boolean;
  highlight?: boolean;
};

export const BILLING_PLANS: BillingPlanDefinition[] = [
  {
    id: "free",
    name: "Trial",
    tagline: "One complete room design — try Home or Retail Venue live tools on export",
    priceCents: 0,
    currency: "USD",
    roomsToAdd: 0,
    exportCreditsToAdd: 0,
    purchasable: false,
    features: [
      "Same three curated themes for every trial",
      "One full export with electronics (one-time)",
      "Replace puzzles during the trial run",
      "Home Mode: printable runbook + player screen (timer + plan hints on a TV/tablet)",
      "Retail Venue Mode: Gamemaster Live Console when you choose Commercial Venue at export",
      "Saving to your account requires a paid pack",
    ],
    comparedTo:
      "one family night out at a venue (~$120–$160 for four people, one hour); Trial is a single at-home design pass—you cannot save the plan until you purchase a pack.",
  },
  {
    id: "single",
    name: "Single room",
    tagline: "One saved room — Home player screen or venue GM console included",
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
      "Home Mode: post-export onboarding, runbook download, and player display synced to your session timer",
      "Retail Venue Mode: GM Live Console (start/pause timer, puzzle completion log, custom clues to player screen)",
      "Best when you only need one extra room this season",
    ],
    comparedTo:
      "one family night out (~$120–$240 for 4–6 people at a commercial room); you keep a reusable host plan to run at home, not a single timed session.",
  },
  {
    id: "home_host",
    name: "Home host pack",
    tagline: "Family parties with runbook + in-room player screen",
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
      "Home Mode: “How to run your game” walkthrough after every export",
      "Player screen at /room/…/player-display — live countdown + hints (no GM chat or multi-room)",
      "Optional Commercial Venue target if you also run ticketed events (GM console included)",
    ],
    comparedTo:
      "three family nights out at a venue (~$360–$720 total for groups of 4–6 across three visits)—for three room plans you can host at home again and again.",
  },
  {
    id: "studio",
    name: "Studio pack",
    tagline: "Repeat builders — full Retail Venue live ops when you need them",
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
      "Retail Venue — Gamemaster Live Console: live timer (+1/−1 min), active players, puzzle progress bar",
      "Player window tab: projector/tablet URL + live clue box with pre-saved hints",
      "Reports tab: success/fail, elapsed time, event log; interactive reset checklist for staff",
      "Home Mode on any room: runbook + basic player screen (timer + standard hints)",
    ],
    comparedTo:
      "ten group nights out (~$1,200–$2,400+ for parties of 4–6) or a fraction of one design-firm room ($5,000–$15,000+); about $65 per digital plan—you build and operate.",
  },
  {
    id: "venue",
    name: "Venue pack",
    tagline: "Multi-room operators — GM console, player sync, reports & leaderboards",
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
      "Gamemaster Live Console (4 tabs): Console, Player window, Reports, Leaderboards",
      "Real-time SSE sync: timer, clues, and puzzle state match session duration & player counts",
      "Leaderboards: public top escape times for corporate and competitive teams",
      "Multi-room ops: one session ID per active room; venue onboarding for display mapping",
      "Session reports: completion times, success rate, and per-puzzle bottleneck data",
      "Home Mode still available for staff-training rooms (runbook + simple player screen)",
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
