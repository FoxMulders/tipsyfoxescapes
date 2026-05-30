import type { LinearFlowStep } from "./generationFlowGraph";

type FlowLinearStepsProps = {
  steps: LinearFlowStep[];
};

export function FlowLinearSteps({ steps }: FlowLinearStepsProps) {
  if (steps.length === 0) {
    return (
      <p className="m-0 p-6 text-center text-sm text-slate-400" role="status">
        No flow steps to display yet.
      </p>
    );
  }

  return (
    <div className="flow-linear-steps glass-panel mx-auto max-w-2xl p-4 md:p-6" role="list" aria-label="Room flow step-by-step">
      <p className="m-0 mb-4 text-xs font-semibold uppercase tracking-widest text-cyan-400/80">
        Step-by-step room flow
      </p>
      <ol className="m-0 list-none space-y-3 p-0">
        {steps.map((step) => (
          <li key={`${step.kind}-${step.id}`} className="flow-linear-steps__item rounded-lg border border-white/10 bg-slate-900/40 p-3" role="listitem">
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 text-xs font-bold tabular-nums text-cyan-300/90">{step.order}.</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-violet-300/80">{step.kind === "zone" ? "Zone" : "Puzzle"}</span>
            </div>
            <p className="mb-0 mt-1 text-sm font-semibold text-slate-50">{step.label}</p>
            {step.detail?.trim() ? <p className="mb-0 mt-1 text-sm leading-relaxed text-slate-400">{step.detail}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
