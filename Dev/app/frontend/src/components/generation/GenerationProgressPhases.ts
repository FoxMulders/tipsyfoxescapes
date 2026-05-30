import { useEffect, useState } from "react";

export type GenerationProgressPhase = {
  headline: string;
  subtext?: string;
};

export function useGenerationProgressPhases(phases: GenerationProgressPhase[], active: boolean, intervalMs = 5200): GenerationProgressPhase {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    if (phases.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % phases.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [active, phases, intervalMs]);

  return phases[Math.min(index, phases.length - 1)] ?? phases[0] ?? { headline: "Generating…" };
}

export const THEME_GENERATION_PHASES: GenerationProgressPhase[] = [
  {
    headline: "Generating theme ideas…",
    subtext: "Crafting escape-room concepts tailored to your room setup — this usually takes 10–60 seconds.",
  },
];

export const PUZZLE_GENERATION_PHASES: GenerationProgressPhase[] = [
  {
    headline: "Stitching narrative threads…",
    subtext: "Weaving your theme brief into room fiction.",
  },
  {
    headline: "Calibrating room logic…",
    subtext: "Balancing logic, physical, and electronic beats.",
  },
  {
    headline: "Assembling prop interactions…",
    subtext: "Binding inventory props to puzzle carriers.",
  },
  {
    headline: "Finalizing escape sequence…",
    subtext: "Running Council QA and quality checks.",
  },
  {
    headline: "Generating diegetic puzzles…",
    subtext: "Compiling physical affordances — usually 30–90s.",
  },
];
