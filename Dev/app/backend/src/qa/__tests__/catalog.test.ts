import { describe, expect, it } from "vitest";
import { BILLING_PLANS } from "../../billing/catalog.js";

describe("billing catalog — Balanced Growth", () => {
  const free = BILLING_PLANS.find((p) => p.id === "free");
  const casual = BILLING_PLANS.find((p) => p.id === "casual_hobbyist");

  it("free tier emphasizes text-only narrative planning", () => {
    expect(free).toBeDefined();
    expect(free!.valueFocus?.toLowerCase()).toMatch(/text-only|text-only narrative|text-forward/);
    const features = free!.features.join(" ").toLowerCase();
    expect(features).not.toMatch(/one full export with electronics/);
    expect(features).toMatch(/no wiring|text-only|narrative/);
  });

  it("casual hobbyist tier omits maker electronics in exports", () => {
    expect(casual).toBeDefined();
    const features = casual!.features.join(" ").toLowerCase();
    expect(features).toMatch(/electronics.*omit|omit.*electronics|completely omitted/);
    expect(features).toMatch(/arduino|wiring|pinout|svg/);
  });
});
