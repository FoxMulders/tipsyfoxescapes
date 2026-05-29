/**
 * Council of Ten — multi-agent consensus gate before shipping AI room generation.
 */
import { z } from "zod";
import { callOpenAiStructured } from "./openaiStructured.js";
import type { RoomSkeleton } from "./schemas/roomSkeleton.js";
import type { AiGeneratedPuzzle } from "./puzzles.js";

export const CouncilVerdictSchema = z.object({
  score: z.number().min(0).max(10),
  wow_factor: z.boolean(),
  critical_feedback: z.string(),
});

export type CouncilVerdict = z.infer<typeof CouncilVerdictSchema>;

export type CouncilPersona = {
  id: string;
  title: string;
  system: string;
};

export const COUNCIL_PERSONAS: CouncilPersona[] = [
  {
    id: "game_master",
    title: "Veteran Game Master",
    system: "You are a 20-year escape room GM. Score pacing, clarity, and player delight. Be harsh on confusing beats.",
  },
  {
    id: "fabricator",
    title: "Electronics Fabricator",
    system: "You build Arduino maglock rigs weekly. Score buildability, wiring realism, and reset-time for electronics.",
  },
  {
    id: "narrative_director",
    title: "Narrative Director",
    system: "You reject flavor-text puzzles. Score diegetic integration — physical actions must BE the story action.",
  },
  {
    id: "venue_owner",
    title: "Venue Owner",
    system: "You care about ROI, reset speed, and throughput for paying groups. Penalize fragile or slow resets.",
  },
  {
    id: "safety_inspector",
    title: "Fire & Safety Inspector",
    system: "Score egress safety, maglock fail-safe assumptions, and absence of hazardous player instructions.",
  },
  {
    id: "accessibility",
    title: "Accessibility Advocate",
    system: "Score color-blind safety, reachability, and parallel tasks for mixed-ability groups.",
  },
  {
    id: "puzzle_designer",
    title: "Puzzle Designer",
    system: "Score variety, fair clues, and absence of guesswork. Penalize cipher charts and padlock clichés.",
  },
  {
    id: "props_lead",
    title: "Props & Set Lead",
    system: "Score prop affordances, staging clarity, and whether BOM items match described interactions.",
  },
  {
    id: "player_advocate",
    title: "First-Time Player Advocate",
    system: "Score onboarding clarity and moment-to-moment fun for birthday-party groups.",
  },
  {
    id: "technical_director",
    title: "Technical Director",
    system: "Score firmware preview quality, pinout discipline, and hardware_profile routing coherence.",
  },
];

export type CouncilRoomPayload = {
  themeName: string;
  targetInterface: string;
  roomSkeleton: RoomSkeleton;
  puzzles: AiGeneratedPuzzle[];
};

export type CouncilAggregate = {
  passed: boolean;
  averageScore: number;
  wowCount: number;
  verdicts: Array<CouncilVerdict & { personaId: string; title: string }>;
  revisionNotes: string;
};

const WOW_THRESHOLD = 8;
const SCORE_THRESHOLD = 8.5;
export const COUNCIL_MAX_ITERATIONS = 3;

const buildCouncilUserPrompt = (payload: CouncilRoomPayload): string =>
  [
    `Theme: ${payload.themeName}`,
    `Target interface: ${payload.targetInterface}`,
    "Room skeleton:",
    JSON.stringify(payload.roomSkeleton, null, 2),
    "Compiled puzzles:",
    JSON.stringify(
      payload.puzzles.map((p) => ({
        id: p.id,
        category: p.category,
        title: p.title,
        objective: p.objective,
        hardware_profile: p.hardware_profile,
        howItWorks: p.howItWorks,
        solveSteps: p.solveSteps,
        hasFirmware: Boolean(p.electronicDetails?.arduinoCode),
      })),
      null,
      2,
    ),
    "Return JSON with score (0-10), wow_factor (true only if you would proudly run this room), and critical_feedback.",
  ].join("\n");

export const aggregateCouncilVerdicts = (
  verdicts: Array<CouncilVerdict & { personaId: string; title: string }>,
): CouncilAggregate => {
  const averageScore =
    verdicts.length === 0 ? 0 : verdicts.reduce((sum, v) => sum + v.score, 0) / verdicts.length;
  const wowCount = verdicts.filter((v) => v.wow_factor).length;
  const passed = averageScore > SCORE_THRESHOLD && wowCount >= WOW_THRESHOLD;
  const revisionNotes = verdicts
    .filter((v) => !v.wow_factor || v.score < SCORE_THRESHOLD)
    .map((v) => `[${v.title}] ${v.critical_feedback}`)
    .join("\n");
  return { passed, averageScore, wowCount, verdicts, revisionNotes };
};

export const runCouncilOfTen = async (
  apiKey: string,
  payload: CouncilRoomPayload,
  model = "gpt-4o-mini",
): Promise<CouncilAggregate> => {
  const user = buildCouncilUserPrompt(payload);
  const results = await Promise.all(
    COUNCIL_PERSONAS.map(async (persona) => {
      try {
        const verdict = await callOpenAiStructured({
          apiKey,
          model,
          system: `${persona.system}\nYou are one of ten expert critics. Be concise but specific in critical_feedback.`,
          user,
          schema: CouncilVerdictSchema,
          schemaName: "council_verdict",
          temperature: 0.4,
          maxTokens: 400,
          timeoutMs: 45_000,
        });
        return { ...verdict, personaId: persona.id, title: persona.title };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          score: 7,
          wow_factor: false,
          critical_feedback: `Council agent ${persona.title} unavailable: ${message}`,
          personaId: persona.id,
          title: persona.title,
        };
      }
    }),
  );
  return aggregateCouncilVerdicts(results);
};
