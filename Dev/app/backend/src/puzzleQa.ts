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

/**
 * Constraint 2 (production-ready media): copy that tells the builder to author content later,
 * or that leaves a blank, is a hard failure — the card must be printable/fabricable as-is.
 */
const PLACEHOLDER_PROSE =
  /\b(insert\s+(?:custom\s+)?(?:text|name|theme|value|clue|code)?\s*here|design (?:a|your|the)\b|fill in|to be (?:added|determined|decided)|tbd|coming soon|your (?:custom|own)\b[^.]*\bhere|lorem ipsum|placeholder|\bTODO\b|\bFIXME\b|add (?:your )?[a-z ]*here|\[[^\]]*\b(?:insert|your|custom|todo|tbd)\b[^\]]*\])/i;

/** Ellipsis / blank-fill markers that signal unfinished content in printable copy. */
const ELLIPSIS_OR_BLANK = /(\.\.\.|…|_{3,}|\{\{?\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}?\})/;

/** Era buckets used for anti-skinning (Constraint 1): a mechanism must fit the theme's universe. */
const SCIFI_THEME = /\b(sci-?fi|science fiction|space|spaceship|starship|space station|orbital|galactic|galaxy|martian|alien|android|robot|cyber|cyberpunk|quantum|nebula|warp|hyperspace|interstellar|spacecraft|космос)\b/i;
const MEDIEVAL_THEME = /\b(medieval|castle|dungeon|knight|alchemist|alchemy|wizard|sorcer|dragon|kingdom|tavern|crypt|gothic|witch|druid|rune|catacomb|monastery|fae|fantasy realm)\b/i;
/** Player-facing anachronisms for a futuristic universe. */
const SCIFI_FORBIDDEN = /\b(telegraph|telegram key|parchment|quill|musket|wax seal|sealing wax|gramophone|pocket ?watch|abacus|hieroglyph)\b/i;
/** Player-facing anachronisms for a pre-industrial / medieval universe. */
const MEDIEVAL_FORBIDDEN = /\b(keypad|rfid|barcode|qr code|smartphone|laptop|usb|wi-?fi|bluetooth|laser grid|touchscreen|digital display|lcd screen)\b/i;

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

/** Root/homepage with no path (e.g. https://www.arduino.cc/, https://randomnerdtutorials.com/). */
export const isRootOrHomepageUrl = (urlRaw: string): boolean => {
  try {
    const u = new URL(urlRaw.trim());
    const path = u.pathname.replace(/\/+$/, "");
    const hasQuery = [...u.searchParams.keys()].length > 0;
    return path === "" && !hasQuery && !u.hash;
  } catch {
    return false;
  }
};

/** Generic search/listing page (e.g. /search, ?q=, ?search_query=) — not a specific build asset. */
export const isGenericSearchUrl = (urlRaw: string): boolean => {
  try {
    const u = new URL(urlRaw.trim());
    if (/\/search\/?$/i.test(u.pathname)) return true;
    for (const key of u.searchParams.keys()) {
      if (/^(q|query|search|search_query|s|keyword|keywords)$/i.test(key)) return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Electronic puzzles must deep-link to the exact project/tutorial/repo/video a builder can open
 * and fabricate from — never a site homepage, bare channel, or search/listing page.
 */
export const isTooGenericForElectronicReference = (urlRaw: string): boolean =>
  isRootOrHomepageUrl(urlRaw) ||
  isGenericSearchUrl(urlRaw) ||
  isBareYoutubeChannel(urlRaw) ||
  isYoutubeSearchResults(urlRaw);

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
  const electronic = puzzle.category === "electronic";
  for (const link of links) {
    const urlRaw = (link.url ?? "").trim();
    if (!isAllowedReferenceUrl(urlRaw)) continue;
    // Electronic puzzles require specific deep links; drop homepages / channels / search pages.
    if (electronic && isTooGenericForElectronicReference(urlRaw)) continue;
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

  // Constraint 2: no placeholders / author-it-later prose / blank fills in printable copy.
  const printableFields: Array<{ field: string; text: string }> = [
    { field: "title", text: puzzle.title ?? "" },
    { field: "objective", text: puzzle.objective ?? "" },
    { field: "howItWorks", text: puzzle.howItWorks ?? "" },
    ...(puzzle.solveSteps ?? []).map((s, i) => ({ field: `solveSteps[${i}]`, text: s })),
  ];
  for (const { field, text } of printableFields) {
    if (PLACEHOLDER_PROSE.test(text)) {
      issues.push({
        code: "COPY_PLACEHOLDER",
        severity: "error",
        field,
        message: `Copy contains an author-it-later placeholder instead of finished, printable content: "${text.slice(0, 60)}".`,
      });
    } else if (ELLIPSIS_OR_BLANK.test(text)) {
      issues.push({
        code: "COPY_BLANK_OR_ELLIPSIS",
        severity: "error",
        field,
        message: `Copy contains an ellipsis or blank/template token; output the exact final strings instead: "${text.slice(0, 60)}".`,
      });
    }
  }

  // Constraint 1: anti-skinning — the mechanism must belong to the theme's universe.
  const mechanism = `${puzzle.title} ${puzzle.objective} ${puzzle.howItWorks} ${puzzle.themeFitReason ?? ""}`;
  const themeContext = `${ctx.themeName} ${(puzzle.themeTags ?? []).join(" ")}`;
  if (SCIFI_THEME.test(themeContext) && SCIFI_FORBIDDEN.test(mechanism)) {
    issues.push({
      code: "ANACHRONISTIC_MECHANIC",
      severity: "warn",
      field: "howItWorks",
      message: `Mechanism uses an old-world prop that breaks the futuristic "${ctx.themeName}" universe — re-skin it as a diegetic sci-fi interaction.`,
    });
  }
  if (MEDIEVAL_THEME.test(themeContext) && MEDIEVAL_FORBIDDEN.test(mechanism)) {
    issues.push({
      code: "ANACHRONISTIC_MECHANIC",
      severity: "warn",
      field: "howItWorks",
      message: `Mechanism exposes a modern/digital device that breaks the period "${ctx.themeName}" universe — disguise it as an in-world prop.`,
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
  } else if (/\bloop\s*\([^)]*\)\s*\{\s*\}/.test(code)) {
    // Constraint 3: loop() must actually do continuous work, not be an empty stub.
    issues.push({
      code: "ARDUINO_EMPTY_LOOP",
      severity: "error",
      field: "electronicDetails.arduinoCode",
      message: "loop() is empty — provide the continuous runtime logic, not a stub.",
    });
  }

  // Constraint 3: pin assignments must be declared (not magic numbers buried in calls).
  if (code && !/(#define\s+\w+|const\s+(?:int|byte|uint8_t)\s+\w+|\bint\s+\w+Pin\b|pinMode\s*\()/i.test(code)) {
    issues.push({
      code: "ARDUINO_PIN_DECLARATIONS",
      severity: "warn",
      field: "electronicDetails.arduinoCode",
      message: "Declare pin assignments (#define / const int / pinMode) so the firmware maps to the wiring.",
    });
  }

  // Constraint 3: inputs need debounce / state-tracking to avoid spurious triggers.
  const readsInput = /digitalRead\s*\(|analogRead\s*\(|\bINPUT(_PULLUP)?\b/.test(code);
  const hasStateOrDebounce = /\bmillis\s*\(|debounce|lastState|lastPress|lastTap|prevState|\bstate\b|stableSince/i.test(code);
  if (readsInput && !hasStateOrDebounce) {
    issues.push({
      code: "ARDUINO_NO_DEBOUNCE",
      severity: "warn",
      field: "electronicDetails.arduinoCode",
      message: "Input-reading sketch should include debounce or state-tracking (millis()/lastState) for reliable triggers.",
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

  // Constraint 4: named hardware (sensors/modules/actuators) must appear by name in the
  // wiring notes or firmware — never reduced to a generic "sensor"/"pad".
  const codeWiring = `${code} ${wiring}`.toLowerCase();
  const namedComponents = parts.filter((part) =>
    /\b(mpr121|mfrc522|pn532|hc-?sr04|ds18b20|ws2812|neopixel|sensor|module|relay|maglock|buzzer|servo|stepper|solenoid|reader|reed|hall|photoresistor|photodiode|laser|keypad|rfid|nfc)\b/i.test(
      part,
    ),
  );
  const STOP_PART_WORDS = new Set(["with", "and", "the", "for", "low", "high", "power", "optional", "equivalent", "module", "modules", "style", "passive", "active"]);
  const unmappedComponents = namedComponents.filter((part) => {
    const tokens = part
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !STOP_PART_WORDS.has(t));
    if (tokens.length === 0) return false;
    return !tokens.some((t) => codeWiring.includes(t));
  });
  if (namedComponents.length > 0 && unmappedComponents.length > 0) {
    issues.push({
      code: "HARDWARE_NOT_MAPPED",
      severity: "error",
      field: "electronicDetails",
      message: `Parts not referenced by exact name in wiring/firmware: ${unmappedComponents
        .map((p) => p.split(/[(,]/)[0]!.trim())
        .join(", ")}. Map each named component to the circuit and code.`,
    });
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

  // Constraint 3 (electronic deep links): reject homepages / channels / search pages and
  // require at least one specific deep link to survive filtering so a builder can fabricate now.
  if (puzzle.category === "electronic") {
    for (const link of rawLinks) {
      const url = (link.url ?? "").trim();
      if (!url) continue;
      if (isTooGenericForElectronicReference(url)) {
        issues.push({
          code: "ELECTRONIC_REFERENCE_GENERIC",
          severity: "error",
          field: "referenceLinks",
          message: `Electronic puzzles need a specific deep link (exact project, tutorial, video, or code repo), not a homepage/channel/search page: ${link.title || url}`,
        });
      }
    }
    if (rawLinks.length > 0 && filteredCount === 0) {
      issues.push({
        code: "ELECTRONIC_REFERENCE_MISSING",
        severity: "error",
        field: "referenceLinks",
        message:
          "Electronic puzzle has no specific deep-link reference after filtering—add a build guide, tutorial video, or code repository for this exact circuit.",
      });
    }
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