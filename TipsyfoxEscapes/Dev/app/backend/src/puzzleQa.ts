/**
 * Puzzle QA department — validation on every puzzle presented to the host.
 * Theme-fit narrative cross-checks Story Editor QA (shared rules).
 * See QA/departments/puzzle_qa.md
 */

import { auditThemeFitNarrative } from "../../shared/qa/storyEditorRules.js";

export type PuzzleReferenceLink = {
  title: string;
  url: string;
  creditTo?: string;
  affiliateUrl?: string;
};

export type PuzzleForQa = {
  id: string;
  category: "logic" | "physical" | "electronic";
  themeTags: string[];
  title: string;
  objective: string;
  howItWorks: string;
  themeFitReason?: string;
  referenceLinks: PuzzleReferenceLink[];
  solveSteps: string[];
  difficulty: "easy" | "medium" | "hard";
  electronicDetails?: {
    parts: string[];
    wiringDiagram: string[];
    wiringDiagramSvg: string;
    buildSteps: string[];
    arduinoCode: string;
  };
};

export type PuzzleQaIssue = {
  code: string;
  severity: "error" | "warn";
  field: string;
  message: string;
};

export type PuzzleQaReport = {
  passed: boolean;
  issues: PuzzleQaIssue[];
};

export type PuzzleWithQa = PuzzleForQa & { puzzleQa?: PuzzleQaReport };

export type PuzzleQaContext = {
  themeName: string;
  /** CI / catalog audit: treat stripped bad links as errors, not silent warns. */
  strict?: boolean;
};

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "your",
  "this",
  "that",
  "from",
  "into",
  "room",
  "escape",
  "puzzle",
  "generic",
]);

const SIGNIFICANT_WORDS = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));

const puzzleCorpus = (puzzle: PuzzleForQa): string =>
  `${puzzle.title} ${puzzle.objective} ${puzzle.howItWorks} ${(puzzle.solveSteps ?? []).join(" ")} ${puzzle.themeFitReason ?? ""}`.toLowerCase();

const PLACEHOLDER_URL =
  /example\.com|localhost|127\.0\.0\.1|placeholder|lorem|ipsum|todo|fixme|undefined|null/i;

const linkSharesPuzzleContext = (puzzle: PuzzleForQa, link: PuzzleReferenceLink): boolean => {
  const corpus = puzzleCorpus(puzzle);
  const title = (link.title ?? "").trim().toLowerCase();
  if (!title) return false;
  const titleWords = SIGNIFICANT_WORDS(title);
  if (titleWords.some((w) => corpus.includes(w))) return true;
  const chunk = title.slice(0, 32);
  if (chunk.length >= 8 && corpus.includes(chunk)) return true;
  try {
    const u = new URL(link.url.trim());
    const slug = u.pathname.split("/").filter(Boolean).pop() ?? "";
    if (slug.length >= 5) {
      const slugWords = slug.replace(/-/g, " ");
      if (SIGNIFICANT_WORDS(slugWords).some((w) => corpus.includes(w))) return true;
    }
  } catch {
    return false;
  }
  return false;
};

const isOfficialDocLink = (urlRaw: string): boolean => {
  try {
    const host = new URL(urlRaw).hostname.replace(/^www\./, "").toLowerCase();
    return host === "arduino.cc" || host.endsWith(".arduino.cc");
  } catch {
    return false;
  }
};

const isYoutubeSearchResults = (urlRaw: string): boolean => {
  try {
    const u = new URL(urlRaw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") return false;
    if (!host.includes("youtube.com")) return false;
    return u.pathname === "/results" || u.searchParams.has("search_query");
  } catch {
    return false;
  }
};

const isSpecificYoutubeVideo = (urlRaw: string): boolean => {
  try {
    const u = new URL(urlRaw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") return u.pathname.length > 1;
    if (!host.includes("youtube.com")) return false;
    return (
      u.pathname.startsWith("/watch") ||
      u.pathname.startsWith("/embed") ||
      u.pathname.startsWith("/shorts/")
    );
  } catch {
    return false;
  }
};

const isBareYoutubeChannel = (urlRaw: string): boolean => {
  try {
    const u = new URL(urlRaw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "youtube.com" && host !== "m.youtube.com") return false;
    const path = u.pathname.toLowerCase();
    if (isSpecificYoutubeVideo(urlRaw)) return false;
    return (
      path.startsWith("/@") ||
      path === "/channel" ||
      path.startsWith("/c/") ||
      path.startsWith("/user/")
    );
  } catch {
    return false;
  }
};

const isAllowedReferenceUrl = (urlRaw: string): boolean => {
  const t = urlRaw.trim();
  if (!t || t === "#") return false;
  if (PLACEHOLDER_URL.test(t)) return false;
  try {
    const u = new URL(t);
    if (!/^https?:$/i.test(u.protocol)) return false;
  } catch {
    return false;
  }
  if (isYoutubeSearchResults(t)) return false;
  if (isBareYoutubeChannel(t)) return false;
  return true;
};

/** Drop irrelevant or generic reference links before the host sees the card. */
export const filterReferenceLinksForPuzzle = (puzzle: PuzzleForQa): PuzzleReferenceLink[] => {
  const links = puzzle.referenceLinks ?? [];
  const out: PuzzleReferenceLink[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    const urlRaw = (link.url ?? "").trim();
    if (!isAllowedReferenceUrl(urlRaw)) continue;
    if (isOfficialDocLink(urlRaw)) {
      const k = `${urlRaw}|${link.title}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(link);
      }
      continue;
    }
    if (isSpecificYoutubeVideo(urlRaw) && linkSharesPuzzleContext(puzzle, link)) {
      const k = `${urlRaw}|${link.title}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(link);
      }
      continue;
    }
    if (!linkSharesPuzzleContext(puzzle, link)) continue;
    const k = `${urlRaw}|${link.affiliateUrl ?? ""}|${link.title}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(link);
    if (out.length >= 5) break;
  }
  return out;
};

const auditCopyFields = (puzzle: PuzzleForQa, ctx: PuzzleQaContext): PuzzleQaIssue[] => {
  const issues: PuzzleQaIssue[] = [];
  const corpus = puzzleCorpus(puzzle);
  const titleWords = SIGNIFICANT_WORDS(puzzle.title);

  if ((puzzle.howItWorks ?? "").trim().length < 48) {
    issues.push({
      code: "HOW_IT_WORKS_SHORT",
      severity: "error",
      field: "howItWorks",
      message: "How it works is too short to describe the mechanism—replace or expand.",
    });
  } else if (!titleWords.some((w) => corpus.includes(w))) {
    issues.push({
      code: "HOW_IT_WORKS_TITLE_MISMATCH",
      severity: "error",
      field: "howItWorks",
      message: "How it works must mention the puzzle title or core mechanism keywords.",
    });
  }

  if ((puzzle.objective ?? "").trim().length < 12) {
    issues.push({
      code: "OBJECTIVE_SHORT",
      severity: "error",
      field: "objective",
      message: "Objective is missing or too vague.",
    });
  }

  const storyIssues = auditThemeFitNarrative(puzzle.themeFitReason ?? "", ctx.themeName, "themeFitReason");
  for (const si of storyIssues) {
    issues.push({
      code: si.code.replace("STORY_", "PUZZLE_"),
      severity: si.severity,
      field: si.field,
      message: si.message,
    });
  }

  if ((puzzle.solveSteps ?? []).length < 2) {
    issues.push({
      code: "SOLVE_STEPS_FEW",
      severity: "error",
      field: "solveSteps",
      message: "Add at least two solve steps that match how it works.",
    });
  }

  return issues;
};

const extractPins = (text: string): string[] => {
  const pins = new Set<string>();
  for (const m of text.matchAll(/\bD(\d{1,2})\b/gi)) {
    pins.add(`d${m[1]}`);
  }
  return [...pins];
};

const auditElectronic = (puzzle: PuzzleForQa): PuzzleQaIssue[] => {
  const issues: PuzzleQaIssue[] = [];
  if (puzzle.category !== "electronic") return issues;
  const ed = puzzle.electronicDetails;
  if (!ed) {
    issues.push({
      code: "ELECTRONIC_DETAILS_MISSING",
      severity: "error",
      field: "electronicDetails",
      message: "Electronic puzzles must include parts, wiring, diagram, build steps, and Arduino sketch.",
    });
    return issues;
  }

  const parts = ed.parts ?? [];
  const wiring = (ed.wiringDiagram ?? []).join(" ");
  const code = ed.arduinoCode ?? "";
  const svg = ed.wiringDiagramSvg ?? "";

  if (parts.length < 2) {
    issues.push({
      code: "ELECTRONIC_PARTS_FEW",
      severity: "error",
      field: "electronicDetails.parts",
      message: "Parts list must name the major components.",
    });
  }

  if ((ed.wiringDiagram ?? []).length < 2) {
    issues.push({
      code: "ELECTRONIC_WIRING_FEW",
      severity: "error",
      field: "electronicDetails.wiringDiagram",
      message: "Wiring notes must describe connections players or staff will build.",
    });
  }

  if (!/setup\s*\(/i.test(code) || !/loop\s*\(/i.test(code)) {
    issues.push({
      code: "ARDUINO_STRUCTURE",
      severity: "error",
      field: "electronicDetails.arduinoCode",
      message: "Arduino sketch must include setup() and loop().",
    });
  }

  const wiringPins = extractPins(wiring);
  const codePins = extractPins(code);
  if (wiringPins.length > 0 && codePins.length > 0) {
    const missingInCode = wiringPins.filter((p) => !codePins.includes(p));
    const missingInWiring = codePins.filter((p) => !wiringPins.includes(p));
    if (missingInCode.length > 0 || missingInWiring.length > 0) {
      issues.push({
        code: "PIN_MISMATCH",
        severity: "error",
        field: "electronicDetails",
        message: "Wiring pin labels (Dx) must match the Arduino sketch pin constants.",
      });
    }
  }

  if (!/<svg[\s>]/i.test(svg)) {
    issues.push({
      code: "SVG_INVALID",
      severity: "error",
      field: "electronicDetails.wiringDiagramSvg",
      message: "Wiring diagram SVG is missing or malformed.",
    });
  } else {
    const svgLower = svg.toLowerCase();
    const matchedParts = parts.filter((part) => {
      const token = part.split(/[\s(,]/)[0]?.toLowerCase() ?? "";
      return token.length >= 4 && svgLower.includes(token);
    });
    if (parts.length >= 2 && matchedParts.length < 2) {
      issues.push({
        code: "SVG_PART_LABELS",
        severity: "error",
        field: "electronicDetails.wiringDiagramSvg",
        message: "Diagram labels must name components from the parts list.",
      });
    }
  }

  return issues;
};

const auditReferences = (
  puzzle: PuzzleForQa,
  filteredCount: number,
  rawLinks: PuzzleReferenceLink[],
  strict: boolean,
): PuzzleQaIssue[] => {
  const issues: PuzzleQaIssue[] = [];
  const sev = strict ? "error" : "warn";

  for (const link of rawLinks) {
    const url = (link.url ?? "").trim();
    if (!url) {
      issues.push({
        code: "REFERENCE_EMPTY_URL",
        severity: "error",
        field: "referenceLinks",
        message: `Reference "${link.title || "(untitled)"}" has an empty URL.`,
      });
      continue;
    }
    if (PLACEHOLDER_URL.test(url)) {
      issues.push({
        code: "REFERENCE_PLACEHOLDER",
        severity: "error",
        field: "referenceLinks",
        message: `Placeholder or invalid URL: ${url}`,
      });
    }
    if (isYoutubeSearchResults(url)) {
      issues.push({
        code: "REFERENCE_SEARCH_URL",
        severity: sev,
        field: "referenceLinks",
        message: `Remove YouTube search results URL (not a specific puzzle asset): ${link.title || url}`,
      });
    }
    if (isBareYoutubeChannel(url)) {
      issues.push({
        code: "REFERENCE_CHANNEL_HOME",
        severity: sev,
        field: "referenceLinks",
        message: `Remove bare channel home link unless it is a specific video for this puzzle: ${link.title || url}`,
      });
    }
    if (!linkSharesPuzzleContext(puzzle, link) && !isOfficialDocLink(url) && !isSpecificYoutubeVideo(url)) {
      issues.push({
        code: "REFERENCE_OFF_TOPIC",
        severity: sev,
        field: "referenceLinks",
        message: `Link does not match this puzzle's title/mechanism: ${link.title || url}`,
      });
    }
  }

  if (rawLinks.length > 0 && filteredCount === 0) {
    issues.push({
      code: "REFERENCES_ALL_STRIPPED",
      severity: "error",
      field: "referenceLinks",
      message:
        "No valid reference links remain—add a specific tutorial, official doc, or credited build guide for this exact puzzle.",
    });
  }

  return issues;
};

export const auditPuzzleQa = (
  puzzle: PuzzleForQa,
  ctx: PuzzleQaContext,
  rawLinks?: PuzzleReferenceLink[],
): PuzzleQaReport => {
  const originals = rawLinks ?? puzzle.referenceLinks ?? [];
  const issues: PuzzleQaIssue[] = [
    ...auditCopyFields(puzzle, ctx),
    ...auditElectronic(puzzle),
    ...auditReferences(puzzle, puzzle.referenceLinks.length, originals, Boolean(ctx.strict)),
  ];
  const passed = !issues.some((i) => i.severity === "error");
  return { passed, issues };
};

/** Filter links, attach QA report, and return updated puzzles. */
export const applyPuzzleQaGate = <T extends PuzzleForQa>(puzzles: T[], ctx: PuzzleQaContext): PuzzleWithQa[] =>
  puzzles.map((puzzle) => {
    const rawLinks = [...(puzzle.referenceLinks ?? [])];
    const filteredLinks = filterReferenceLinksForPuzzle(puzzle);
    const scrubbed = { ...puzzle, referenceLinks: filteredLinks };
    const puzzleQa = auditPuzzleQa(scrubbed, ctx, rawLinks);
    return { ...scrubbed, puzzleQa };
  });

export const allPuzzlesPassedPuzzleQa = (puzzles: PuzzleWithQa[]): boolean =>
  puzzles.every((p) => p.puzzleQa?.passed !== false);

export const collectPuzzleQaFailures = (
  puzzles: PuzzleWithQa[],
): Array<{ puzzleId: string; title: string; issues: PuzzleQaIssue[] }> =>
  puzzles
    .filter((p) => p.puzzleQa && !p.puzzleQa.passed)
    .map((p) => ({
      puzzleId: p.id,
      title: p.title,
      issues: p.puzzleQa!.issues.filter((i) => i.severity === "error"),
    }));

// fix rawCount bug - I left a stray variable. Remove rawCount and fix auditReferences call