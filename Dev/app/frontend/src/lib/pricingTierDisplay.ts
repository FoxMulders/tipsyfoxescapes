/** Additive “plus tier” copy for pricing cards — deltas only in catalog, inherited tier named here. */

const ADDITIVE_PREVIOUS_TIER_NAME: Record<string, string> = {
  casual_hobbyist: "Trial",
  home_enthusiast: "The Casual Hobbyist Pass",
  creative_studio: "The Home Host Enthusiast",
};

export type PricingFeatureLine =
  | { kind: "plus-lead"; text: string }
  | { kind: "bullet"; text: string };

export const additivePlusLead = (planId: string): string | null => {
  const previous = ADDITIVE_PREVIOUS_TIER_NAME[planId];
  if (!previous) return null;
  return `Everything in ${previous}, plus:`;
};

/** Feature bullets for UI: optional plus-lead, then tier-specific deltas only. */
export const buildPricingFeatureLines = (planId: string, features: string[]): PricingFeatureLine[] => {
  const lead = additivePlusLead(planId);
  const lines: PricingFeatureLine[] = lead ? [{ kind: "plus-lead", text: lead }] : [];
  for (const text of features) {
    const trimmed = text.trim();
    if (trimmed) lines.push({ kind: "bullet", text: trimmed });
  }
  return lines;
};
