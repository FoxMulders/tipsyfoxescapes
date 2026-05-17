/**
 * Puzzle QA department — automated checks on every puzzle presented to the host.
 * See QA/departments/puzzle_qa.md
 */

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

const themeTokens = (themeName: string): string[] => SIGNIFICANT_WORDS(themeName);

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

const isBareYoutubeChannel = (urlRaw: string): boolean => {
  try {
    const u = new URL(urlRaw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "youtube.com" && host !== "m.youtube.com") return false;
    const path = u.pathname.toLowerCase();
    if (path.startsWith("/watch") || path.startsWith("/embed") || path.startsWith("/shorts/")) return false;
    if (path.startsWith("/@") || path === "/channel" || path.startsWith("/c/") || path.startsWith("/user/")) {
      return path.split("/").filter(Boolean).length <= 2;
    }
    return false;
  } catch {
    return false;
  }
};

const channelLinkAllowed = (puzzle: PuzzleForQa, link: PuzzleReferenceLink): boolean => {
  if (puzzle.category !== "electronic") return false;
  const corpus = puzzleCorpus(puzzle);
  if (!/\barduino\b|\bled\b|\bbuzzer\b|\bsensor\b|\brfid\b|\belectronic\b/.test(corpus)) return false;
  const title = (link.title ?? "").toLowerCase();
  if (title.includes("playful technology") && corpus.includes("arduino")) return true;
  if (title.includes("puzzle pieces") && linkSharesPuzzleContext(puzzle, link)) return true;
  return linkSharesPuzzleContext(puzzle, link);
};

/** Drop irrelevant or generic reference links before the host sees the card. */
export const filterReferenceLinksForPuzzle = (puzzle: PuzzleForQa): PuzzleReferenceLink[] => {
  const links = puzzle.referenceLinks ?? [];
  const out: PuzzleReferenceLink[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    const urlRaw = (link.url ?? "").trim();
    if (!urlRaw) continue;
    if (isYoutubeSearchResults(urlRaw)) continue;
    if (isBareYoutubeChannel(urlRaw) && !channelLinkAllowed(puzzle, link)) continue;
    if (isOfficialDocLink(urlRaw)) {
      const k = `${urlRaw}|${link.title}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(link);
      }
      continue;
    }
    if (!linkSharesPuzzleContext(puzzle, link) && !channelLinkAllowed(puzzle, link)) continue;
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
      severity: "warn",
      field: "howItWorks",
      message: "How it works should mention the puzzle title or core mechanism keywords.",
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

  const themeName = ctx.themeName.trim();
  const fit = (puzzle.themeFitReason ?? "").trim();
  if (!fit) {
    issues.push({
      code: "THEME_FIT_MISSING",
      severity: "error",
      field: "themeFitReason",
      message: "Why this fits the theme is required.",
    });
  } else if (themeName) {
    const tokens = themeTokens(themeName);
    const fitLower = fit.toLowerCase();
    const namesTheme =
      fitLower.includes(themeName.toLowerCase()) || tokens.some((t) => fitLower.includes(t));
    if (!namesTheme) {
      issues.push({
        code: "THEME_FIT_THEME_NAME",
        severity: "error",
        field: "themeFitReason",
        message: `Theme fit should name "${themeName}" or a clear keyword from that theme.`,
      });
    }
  }

  if ((puzzle.solveSteps ?? []).length < 2) {
    issues.push({
      code: "SOLVE_STEPS_FEW",
      severity: "warn",
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
        severity: "warn",
        field: "electronicDetails.wiringDiagramSvg",
        message: "Diagram labels should name components from the parts list.",
      });
    }
  }

  return issues;
};

const auditReferences = (filteredCount: number, rawCount: number, strippedSearchCount: number): PuzzleQaIssue[] => {
  const issues: PuzzleQaIssue[] = [];
  if (strippedSearchCount > 0) {
    issues.push({
      code: "REFERENCE_SEARCH_STRIPPED",
      severity: "warn",
      field: "referenceLinks",
      message: `${strippedSearchCount} generic search link(s) removed—only puzzle-specific references are shown.`,
    });
  }
  if (rawCount > 0 && filteredCount === 0) {
    issues.push({
      code: "REFERENCES_ALL_STRIPPED",
      severity: "warn",
      field: "referenceLinks",
      message:
        "All reference links were removed—they did not match this puzzle. Add a specific tutorial or doc when you adapt the build.",
    });
  }
  return issues;
};

export const auditPuzzleQa = (
  puzzle: PuzzleForQa,
  ctx: PuzzleQaContext,
  refAudit?: { rawCount: number; strippedSearchCount: number },
): PuzzleQaReport => {
  const issues: PuzzleQaIssue[] = [
    ...auditCopyFields(puzzle, ctx),
    ...auditElectronic(puzzle),
    ...(refAudit
      ? auditReferences(puzzle.referenceLinks.length, refAudit.rawCount, refAudit.strippedSearchCount)
      : auditReferences(puzzle.referenceLinks.length, puzzle.referenceLinks.length, 0)),
  ];
  const passed = !issues.some((i) => i.severity === "error");
  return { passed, issues };
};

const countStrippedSearchLinks = (puzzle: PuzzleForQa): number =>
  (puzzle.referenceLinks ?? []).filter((link) => isYoutubeSearchResults(link.url ?? "")).length;

/** Filter links, attach QA report, and return updated puzzles. */
export const applyPuzzleQaGate = <T extends PuzzleForQa>(puzzles: T[], ctx: PuzzleQaContext): PuzzleWithQa[] =>
  puzzles.map((puzzle) => {
    const rawCount = (puzzle.referenceLinks ?? []).length;
    const strippedSearchCount = countStrippedSearchLinks(puzzle);
    const filteredLinks = filterReferenceLinksForPuzzle(puzzle);
    const scrubbed = { ...puzzle, referenceLinks: filteredLinks };
    const puzzleQa = auditPuzzleQa(scrubbed, ctx, { rawCount, strippedSearchCount });
    return { ...scrubbed, puzzleQa };
  });

export const allPuzzlesPassedPuzzleQa = (puzzles: PuzzleWithQa[]): boolean =>
  puzzles.every((p) => p.puzzleQa?.passed !== false);
