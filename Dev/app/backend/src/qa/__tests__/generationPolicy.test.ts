import { describe, expect, it } from "vitest";
import {
  applyTargetInterfaceCategoryCounts,
  assertHomePartyHardwareProfile,
} from "../../generationPolicy.js";

describe("generationPolicy", () => {
  it("moves electronic slots to physical for home party", () => {
    expect(applyTargetInterfaceCategoryCounts({ logic: 2, physical: 2, electronic: 2 }, "home_party")).toEqual({
      logic: 2,
      physical: 4,
      electronic: 0,
    });
  });

  it("leaves commercial counts unchanged", () => {
    const counts = { logic: 2, physical: 2, electronic: 2 };
    expect(applyTargetInterfaceCategoryCounts(counts, "commercial_venue")).toEqual(counts);
  });

  it("allows print_and_play for home hardware profiles", () => {
    expect(assertHomePartyHardwareProfile("print_and_play")).toBeNull();
    expect(assertHomePartyHardwareProfile("relay_maglock")).toMatch(/forbids/);
  });
});
