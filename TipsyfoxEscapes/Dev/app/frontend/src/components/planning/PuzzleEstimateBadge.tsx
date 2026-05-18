import { useEffect, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function RollingEstimateNum({ target }: { target: number }) {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(display);
  const rafRef = useRef<number | null>(null);
  displayRef.current = display;

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const from = displayRef.current;
    if (from === target) return;
    const t0 = performance.now();
    const dur = 320;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const ease = 1 - (1 - t) * (1 - t);
      setDisplay(Math.round(from + (target - from) * ease));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  return <span className="tabular-nums">{display}</span>;
}

type PuzzleEstimateBadgeProps = {
  target: number;
  juniorAddOnSlots?: number;
  pulseKey?: string;
};

export function PuzzleEstimateBadge({ target, juniorAddOnSlots = 0, pulseKey }: PuzzleEstimateBadgeProps) {
  return (
    <div
      className={cn("puzzle-estimate-badge", pulseKey && "puzzle-estimate-badge--pulse")}
      key={`estimate-${pulseKey}`}
      role="status"
      aria-live="polite"
      aria-describedby="puzzle-estimate-hint"
    >
      <div className="puzzle-estimate-badge__head">
        <span className="puzzle-estimate-badge__label">Estimated puzzle nodes</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="puzzle-estimate-badge__help"
              aria-label="How puzzle node count is calculated"
            >
              <CircleHelp className="h-3.5 w-3.5" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-left">
            This number updates live from your session duration and head count—the AI uses it to size how many puzzle nodes to
            generate in your main track.
          </TooltipContent>
        </Tooltip>
      </div>
      <span className="puzzle-estimate-badge__value">
        <RollingEstimateNum target={target} />
      </span>
      <p id="puzzle-estimate-hint" className="puzzle-estimate-badge__micro muted">
        Live estimate based on duration and concurrent players
      </p>
      {juniorAddOnSlots > 0 ? (
        <span className="puzzle-estimate-badge__junior">+{juniorAddOnSlots} junior</span>
      ) : null}
    </div>
  );
}
