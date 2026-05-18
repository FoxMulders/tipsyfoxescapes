import { describe, expect, it } from "vitest";
import { calculateEscapePlanPrice } from "../../../../shared/escapePlanPricing.js";
import { quotePlanCheckout, billingPlanById } from "../../billing/catalog.js";

describe("escapePlanPricing", () => {
  it("charges base only for the included layout room", () => {
    const quote = calculateEscapePlanPrice(1, { basePriceCents: 14900, includedLayoutRooms: 1, perAdditionalRoomCents: 3900 });
    expect(quote.totalCents).toBe(14900);
    expect(quote.additionalLayoutRooms).toBe(0);
  });

  it("adds per-room cents for each layout beyond included", () => {
    const quote = calculateEscapePlanPrice(6, { basePriceCents: 14900, includedLayoutRooms: 1, perAdditionalRoomCents: 3900 });
    expect(quote.additionalLayoutRooms).toBe(5);
    expect(quote.totalCents).toBe(14900 + 5 * 3900);
    expect(quote.roomsToAdd).toBe(6);
  });

  it("quotes creative studio checkout from catalog", () => {
    const plan = billingPlanById("creative_studio");
    expect(plan).toBeTruthy();
    const quote = quotePlanCheckout(plan!, 4);
    expect(quote.totalCents).toBe(14900 + 3 * 3900);
    expect(quote.roomsToAdd).toBe(4);
  });
});
