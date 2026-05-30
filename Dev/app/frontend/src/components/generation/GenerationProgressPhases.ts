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
    headline: "Generating diegetic puzzles…",
    subtext: "Compiling physical affordances embedded in your theme brief — usually 30–90 seconds.",
  },
  {
    headline: "Compiling hardware profiles…",
    subtext: "Mapping triggers, props, and maker-ready components for each puzzle slot.",
  },
  {
    headline: "Running Council of Ten validation…",
    subtext: "Scoring narrative integration, safety, and wow factor before shipping the set.",
  },
];
