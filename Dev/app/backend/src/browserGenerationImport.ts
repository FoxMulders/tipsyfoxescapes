import { routeArduinoProductionBundle } from "./arduinoResourceRouter.js";
import type { HardwareProfile } from "./hardwareProfile.js";

export type BrowserThemeDraft = {
  name: string;
  tldr: string;
  description: string;
};

export type BrowserPuzzleDraft = {
  category: "logic" | "physical" | "electronic";
  title: string;
  objective: string;
  howItWorks: string;
  themeFitReason: string;
  solveSteps: string[];
  difficulty: "easy" | "medium" | "hard";
};

export const normalizeBrowserThemeDrafts = (raw: unknown): BrowserThemeDraft[] | null => {
  if (!Array.isArray(raw) || raw.length < 1) return null;
  const themes: BrowserThemeDraft[] = [];
  for (const row of raw.slice(0, 3)) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    const tldr = typeof o.tldr === "string" ? o.tldr.trim() : "";
    const description = typeof o.description === "string" ? o.description.trim() : "";
    if (name.length < 3 || tldr.length < 8 || description.length < 80) continue;
    themes.push({ name, tldr, description });
  }
  return themes.length > 0 ? themes : null;
};

export const normalizeBrowserPuzzleDrafts = (raw: unknown): BrowserPuzzleDraft[] | null => {
  if (!Array.isArray(raw) || raw.length < 1) return null;
  const puzzles: BrowserPuzzleDraft[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const category = o.category;
    if (category !== "logic" && category !== "physical" && category !== "electronic") continue;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const objective = typeof o.objective === "string" ? o.objective.trim() : "";
    const howItWorks = typeof o.howItWorks === "string" ? o.howItWorks.trim() : "";
    const themeFitReason = typeof o.themeFitReason === "string" ? o.themeFitReason.trim() : "";
    const difficulty = o.difficulty;
    if (!title || !objective || !howItWorks || !themeFitReason) continue;
    const solveSteps = Array.isArray(o.solveSteps)
      ? o.solveSteps.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 8)
      : [];
    puzzles.push({
      category,
      title,
      objective,
      howItWorks,
      themeFitReason,
      solveSteps: solveSteps.length > 0 ? solveSteps : ["Follow in-room clues.", "Combine results with the team."],
      difficulty: difficulty === "easy" || difficulty === "hard" ? difficulty : "medium",
    });
  }
  return puzzles.length > 0 ? puzzles : null;
};

export const sliceBrowserPuzzlesForCounts = (
  drafts: BrowserPuzzleDraft[],
  counts: { logic: number; physical: number; electronic: number },
): BrowserPuzzleDraft[] | null => {
  const byCat = {
    logic: drafts.filter((p) => p.category === "logic"),
    physical: drafts.filter((p) => p.category === "physical"),
    electronic: drafts.filter((p) => p.category === "electronic"),
  };
  const picked: BrowserPuzzleDraft[] = [];
  for (let i = 0; i < counts.logic; i += 1) {
    if (!byCat.logic[i]) return null;
    picked.push(byCat.logic[i]!);
  }
  for (let i = 0; i < counts.physical; i += 1) {
    if (!byCat.physical[i]) return null;
    picked.push(byCat.physical[i]!);
  }
  for (let i = 0; i < counts.electronic; i += 1) {
    if (!byCat.electronic[i]) return null;
    picked.push(byCat.electronic[i]!);
  }
  return picked.length > 0 ? picked : null;
};

const commercialElectronicStub = (title: string): {
  parts: string[];
  wiringDiagram: string[];
  wiringDiagramSvg: string;
  buildSteps: string[];
  arduinoCode: string;
  hardware_profile: HardwareProfile;
  pinoutTable: Array<{ pin: string; function: string; connectsTo: string }>;
} => {
  const parts = ["Arduino Uno R3", "Tactile button module", "LED with 220Ω resistor"];
  const wiringDiagram = [
    "Tactile button module signal → D2 on Arduino Uno",
    "Status LED anode → D9 via 220Ω resistor",
    "Common GND to Arduino GND rail",
  ];
  const bundle = routeArduinoProductionBundle(title, wiringDiagram, parts, "button_led");
  return {
    parts,
    wiringDiagram,
    wiringDiagramSvg:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 110"><text x="10" y="22" font-size="13">Arduino Uno</text><text x="10" y="48" font-size="13">Tactile button D2</text><text x="10" y="74" font-size="13">LED D9</text><text x="10" y="98" font-size="11">220Ω to GND</text></svg>',
    buildSteps: [
      "Wire the button module and LED per the diagram; bench-test before mounting in the set.",
      "Upload the preview sketch and verify the LED state tracks the button.",
    ],
    arduinoCode: bundle.arduinoCode,
    hardware_profile: "button_led",
    pinoutTable: bundle.pinoutTable,
  };
};

export type BrowserPuzzleImportDeps = {
  themeTags: string[];
  refPuzzlePieces: (title: string) => { title: string; url: string; creditTo?: string };
  refRoomEscapeArtist: (title: string) => { title: string; url: string; creditTo?: string };
  allocateId: () => string;
  commercialVenue: boolean;
};

export type BrowserPuzzleLike = {
  id: string;
  category: "logic" | "physical" | "electronic";
  themeTags: string[];
  title: string;
  objective: string;
  howItWorks: string;
  themeFitReason: string;
  referenceLinks: Array<{ title: string; url: string; creditTo?: string }>;
  solveSteps: string[];
  difficulty: "easy" | "medium" | "hard";
  audienceTrack: "main";
  electronicDetails?: {
    parts: string[];
    wiringDiagram: string[];
    wiringDiagramSvg: string;
    buildSteps: string[];
    arduinoCode: string;
    hardware_profile?: HardwareProfile;
    pinoutTable?: Array<{ pin: string; function: string; connectsTo: string }>;
  };
};

export const browserDraftsToPuzzles = (
  drafts: BrowserPuzzleDraft[],
  deps: BrowserPuzzleImportDeps,
): BrowserPuzzleLike[] =>
  drafts.map((draft) => {
    const base: BrowserPuzzleLike = {
      id: deps.allocateId(),
      category: draft.category,
      themeTags: deps.themeTags,
      title: draft.title,
      objective: draft.objective,
      howItWorks: draft.howItWorks,
      themeFitReason: draft.themeFitReason,
      referenceLinks: [
        deps.refPuzzlePieces(`Puzzle Pieces — inspiration for ${draft.title}`),
        deps.refRoomEscapeArtist(`Room Escape Artist — ideas for ${draft.title}`),
      ],
      solveSteps: draft.solveSteps,
      difficulty: draft.difficulty,
      audienceTrack: "main",
    };
    if (draft.category === "electronic" && deps.commercialVenue) {
      const stub = commercialElectronicStub(draft.title);
      return {
        ...base,
        electronicDetails: {
          parts: stub.parts,
          wiringDiagram: stub.wiringDiagram,
          wiringDiagramSvg: stub.wiringDiagramSvg,
          buildSteps: stub.buildSteps,
          arduinoCode: stub.arduinoCode,
          hardware_profile: stub.hardware_profile,
          pinoutTable: stub.pinoutTable,
        },
      };
    }
    return base;
  });
