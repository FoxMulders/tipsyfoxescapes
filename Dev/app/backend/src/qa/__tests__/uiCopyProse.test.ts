import { describe, expect, it } from "vitest";
import { ROOM_DETAILS_UI_COPY, auditProseEnglish, auditUiCopyCatalog } from "../../../../shared/qa/proseQaRules.js";

describe("UI copy prose QA", () => {
  it("passes curated Room details strings", () => {
    const issues = auditUiCopyCatalog(ROOM_DETAILS_UI_COPY);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(issues).toEqual([]);
  });

  it("flags missing apostrophe in contractions", () => {
    const issues = auditProseEnglish("Players dont need hints.", "test", { label: "test" });
    expect(issues.some((i) => i.code === "PROSE_CONTRACTION_APOSTROPHE")).toBe(true);
  });

  it("flags space before comma", () => {
    const issues = auditProseEnglish("Hello , world.", "test", { label: "test" });
    expect(issues.some((i) => i.code === "PROSE_SPACE_BEFORE_PUNCT")).toBe(true);
  });
});
