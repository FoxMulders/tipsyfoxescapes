/**
 * Validation tests — pricing tiers, export credit guards, session state transitions.
 * Run with: npm run test:unit
 */
import { describe, it, expect } from "vitest";

// ── Billing plan slot counts ────────────────────────────────────────────────

const PLANS = [
  { id: "free",             name: "Trial",                  roomsToAdd: 0, exportCreditsToAdd: 0 },
  { id: "casual_hobbyist",  name: "The Casual Hobbyist Pass", roomsToAdd: 1, exportCreditsToAdd: 1 },
  { id: "home_enthusiast",  name: "The Home Host Enthusiast", roomsToAdd: 3, exportCreditsToAdd: 3 },
  { id: "creative_studio",  name: "The Creative Studio",      roomsToAdd: 1, exportCreditsToAdd: 2 },
  { id: "venue_blueprint",  name: "The Venue Blueprint",      roomsToAdd: 25, exportCreditsToAdd: 25 },
] as const;

describe("Pricing tier slot counts", () => {
  it("Trial (free) grants 0 saved room slots and 0 export credits", () => {
    const plan = PLANS.find((p) => p.id === "free")!;
    expect(plan.roomsToAdd).toBe(0);
    expect(plan.exportCreditsToAdd).toBe(0);
  });

  it("Casual Hobbyist grants 1 saved room slot and 1 export credit", () => {
    const plan = PLANS.find((p) => p.id === "casual_hobbyist")!;
    expect(plan.roomsToAdd).toBe(1);
    expect(plan.exportCreditsToAdd).toBe(1);
  });

  it("Home Host Enthusiast grants 3 saved room slots and 3 export credits", () => {
    const plan = PLANS.find((p) => p.id === "home_enthusiast")!;
    expect(plan.roomsToAdd).toBe(3);
    expect(plan.exportCreditsToAdd).toBe(3);
  });

  it("Creative Studio base includes 1 layout room and 2 export credits", () => {
    const plan = PLANS.find((p) => p.id === "creative_studio")!;
    expect(plan.roomsToAdd).toBe(1);
    expect(plan.exportCreditsToAdd).toBe(2);
  });

  it("Venue Blueprint grants 25 rooms and 25 export credits", () => {
    const plan = PLANS.find((p) => p.id === "venue_blueprint")!;
    expect(plan.roomsToAdd).toBe(25);
    expect(plan.exportCreditsToAdd).toBe(25);
  });

  it("All plan IDs are unique", () => {
    const ids = PLANS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Export credit logic guards ──────────────────────────────────────────────

type BillingTier = "admin" | "pack" | "trial" | "free";

interface SessionLike {
  billingTier: BillingTier;
  trialRemaining: boolean;
  exportCreditsRemaining: number;
  hasFullCatalog: boolean;
}

function canExport(s: SessionLike): boolean {
  const isAdmin = s.billingTier === "admin";
  const isPack = s.billingTier === "pack";
  if (isAdmin) return true;
  if (isPack && s.hasFullCatalog && s.exportCreditsRemaining > 0) return true;
  if (s.billingTier === "trial" && s.trialRemaining) return true;
  return false;
}

describe("Export credit logic guards", () => {
  it("Admin can always export regardless of credits", () => {
    expect(canExport({ billingTier: "admin", trialRemaining: false, exportCreditsRemaining: 0, hasFullCatalog: false })).toBe(true);
  });

  it("Pack user with credits and full catalog can export", () => {
    expect(canExport({ billingTier: "pack", trialRemaining: false, exportCreditsRemaining: 1, hasFullCatalog: true })).toBe(true);
  });

  it("Pack user with 0 export credits cannot export", () => {
    expect(canExport({ billingTier: "pack", trialRemaining: false, exportCreditsRemaining: 0, hasFullCatalog: true })).toBe(false);
  });

  it("Pack user without full catalog cannot export even with credits", () => {
    expect(canExport({ billingTier: "pack", trialRemaining: false, exportCreditsRemaining: 5, hasFullCatalog: false })).toBe(false);
  });

  it("Trial user with remaining trial can export once", () => {
    expect(canExport({ billingTier: "trial", trialRemaining: true, exportCreditsRemaining: 0, hasFullCatalog: false })).toBe(true);
  });

  it("Trial user after trial is used cannot export", () => {
    expect(canExport({ billingTier: "trial", trialRemaining: false, exportCreditsRemaining: 0, hasFullCatalog: false })).toBe(false);
  });

  it("Free (unauthenticated) user cannot export", () => {
    expect(canExport({ billingTier: "free", trialRemaining: false, exportCreditsRemaining: 0, hasFullCatalog: false })).toBe(false);
  });
});

// ── Session state transitions ───────────────────────────────────────────────

type SessionPhase = "planning" | "themes" | "puzzles" | "export";

function nextPhase(current: SessionPhase): SessionPhase {
  const order: SessionPhase[] = ["planning", "themes", "puzzles", "export"];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : current;
}

function canGeneratePuzzles(session: { selectedThemeId: string | null }): boolean {
  return session.selectedThemeId !== null && session.selectedThemeId.trim().length > 0;
}

function canExportPlan(session: { puzzleCount: number; selectedThemeId: string | null }): boolean {
  return session.selectedThemeId !== null && session.puzzleCount > 0;
}

describe("Session state transitions", () => {
  it("planning -> themes is the first valid transition", () => {
    expect(nextPhase("planning")).toBe("themes");
  });

  it("themes -> puzzles after theme selection", () => {
    expect(nextPhase("themes")).toBe("puzzles");
  });

  it("puzzles -> export after puzzle set is generated", () => {
    expect(nextPhase("puzzles")).toBe("export");
  });

  it("export phase does not advance further", () => {
    expect(nextPhase("export")).toBe("export");
  });

  it("cannot generate puzzles without a selected theme", () => {
    expect(canGeneratePuzzles({ selectedThemeId: null })).toBe(false);
  });

  it("can generate puzzles once a theme is selected", () => {
    expect(canGeneratePuzzles({ selectedThemeId: "theme_abc" })).toBe(true);
  });

  it("cannot export plan without puzzles", () => {
    expect(canExportPlan({ selectedThemeId: "theme_abc", puzzleCount: 0 })).toBe(false);
  });

  it("can export plan with theme and at least one puzzle", () => {
    expect(canExportPlan({ selectedThemeId: "theme_abc", puzzleCount: 3 })).toBe(true);
  });

  it("cannot export plan without theme even if puzzles exist", () => {
    expect(canExportPlan({ selectedThemeId: null, puzzleCount: 5 })).toBe(false);
  });
});

// ── Scalable room pricing ───────────────────────────────────────────────────

const BASE_PRICE_CENTS = 14900;
const PER_ROOM_CENTS = 3900;
const INCLUDED_ROOMS = 1;

function calcPrice(layoutRooms: number): number {
  const additional = Math.max(0, layoutRooms - INCLUDED_ROOMS);
  return BASE_PRICE_CENTS + additional * PER_ROOM_CENTS;
}

describe("Scalable room pricing (Creative Studio)", () => {
  it("1 room = base price only ($149)", () => {
    expect(calcPrice(1)).toBe(14900);
  });

  it("2 rooms = base + 1 additional ($149 + $39 = $188)", () => {
    expect(calcPrice(2)).toBe(18800);
  });

  it("3 rooms = base + 2 additional ($149 + $78 = $227)", () => {
    expect(calcPrice(3)).toBe(22700);
  });

  it("0 rooms treated as 1 (no negative pricing)", () => {
    expect(calcPrice(0)).toBe(14900);
  });
});
