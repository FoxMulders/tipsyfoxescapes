import { describe, expect, it } from "vitest";
import { aggregateCouncilVerdicts, COUNCIL_PERSONAS } from "../../services/ai/councilOfTen.js";

describe("Council of Ten", () => {
  it("defines ten personas", () => {
    expect(COUNCIL_PERSONAS).toHaveLength(10);
  });

  it("passes when average score > 8.5 and wow_count >= 8", () => {
    const verdicts = Array.from({ length: 10 }, (_, i) => ({
      personaId: `p${i}`,
      title: `Persona ${i}`,
      score: 9,
      wow_factor: i < 8,
      critical_feedback: i < 8 ? "Great room." : "Needs clearer reset path.",
    }));
    const agg = aggregateCouncilVerdicts(verdicts);
    expect(agg.passed).toBe(true);
    expect(agg.wowCount).toBe(8);
  });

  it("fails when wow threshold not met", () => {
    const verdicts = Array.from({ length: 10 }, (_, i) => ({
      personaId: `p${i}`,
      title: `Persona ${i}`,
      score: 9.5,
      wow_factor: i < 5,
      critical_feedback: "Not wow enough.",
    }));
    const agg = aggregateCouncilVerdicts(verdicts);
    expect(agg.passed).toBe(false);
    expect(agg.revisionNotes).toContain("Persona");
  });
});
