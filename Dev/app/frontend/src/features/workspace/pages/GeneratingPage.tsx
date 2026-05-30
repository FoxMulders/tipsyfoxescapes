import { GenerationProgressIndicator } from "@/components/generation/GenerationProgressIndicator";
import { PUZZLE_GENERATION_PHASES } from "@/components/generation/GenerationProgressPhases";

export function GeneratingPanel() {
  return (
    <div className="generating-hero-panel glass-panel w-full max-w-md text-center">
      <p className="m-0 text-xs font-bold uppercase tracking-widest text-cyan-400/80">Master generation</p>
      <h2 id="experience-generating-title" className="mb-0 mt-2 text-xl font-bold text-slate-50">
        Building your room
      </h2>
      <p className="mb-6 mt-2 text-sm text-slate-400">
        Drafting physical zones, thematic puzzles, and running quality checks. This usually takes under a minute.
      </p>
      <GenerationProgressIndicator
        active={true}
        phases={PUZZLE_GENERATION_PHASES}
        phaseIntervalMs={4000}
        className="w-full"
      />
    </div>
  );
}

export function GeneratingPage() {
  return (
    <div
      className="experience-step experience-step--generating experience-step--scroll flex h-full min-h-full w-full flex-col items-center justify-start gap-6 p-8 pt-[8vh] md:pt-[10vh]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <GeneratingPanel />
    </div>
  );
}
