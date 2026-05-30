import { cn } from "@/lib/utils";
import { useGenerationProgressPhases, type GenerationProgressPhase } from "./GenerationProgressPhases";

type GenerationProgressIndicatorProps = {
  active: boolean;
  phases: GenerationProgressPhase[];
  className?: string;
  /** Override rotating phase with a fixed headline/subtext */
  headline?: string;
  subtext?: string;
  phaseIntervalMs?: number;
};

export function GenerationProgressIndicator({
  active,
  phases,
  className,
  headline,
  subtext,
  phaseIntervalMs,
}: GenerationProgressIndicatorProps) {
  const rotating = useGenerationProgressPhases(phases, active && !headline, phaseIntervalMs);

  if (!active) return null;

  const displayHeadline = headline ?? rotating.headline;
  const displaySubtext = subtext ?? rotating.subtext;

  return (
    <div className={cn("generation-progress-indicator", className)} role="status" aria-live="polite" aria-busy="true">
      <div className="generation-progress-indicator__spinner" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="generation-progress-indicator__headline">{displayHeadline}</p>
      {displaySubtext ? <p className="generation-progress-indicator__sub muted">{displaySubtext}</p> : null}
      <div className="generation-progress-indicator__bar" aria-hidden="true">
        <div className="generation-progress-indicator__bar-fill" />
      </div>
    </div>
  );
}
