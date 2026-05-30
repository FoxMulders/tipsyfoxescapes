import { GenerationProgressIndicator } from "@/components/generation/GenerationProgressIndicator";
import { PUZZLE_GENERATION_PHASES } from "@/components/generation/GenerationProgressPhases";

export function GeneratingPage() {
  return (
    <div className="experience-step flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="max-w-md w-full text-center">
        <p className="m-0 text-xs font-bold uppercase tracking-widest text-cyan-400/80">Master generation</p>
        <h2 className="mt-2 mb-0 text-xl font-bold text-slate-50">Building your room</h2>
        <p className="mt-2 mb-6 text-sm text-slate-400">
          Drafting physical zones, thematic puzzles, and running quality checks. This usually takes under a minute.
        </p>
        <GenerationProgressIndicator active phases={PUZZLE_GENERATION_PHASES} className="w-full" />
      </div>
    </div>
  );
}
