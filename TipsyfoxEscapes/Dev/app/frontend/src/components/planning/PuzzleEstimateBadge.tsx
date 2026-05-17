import { useEffect, useRef, useState } from "react";
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
    >
      <span className="puzzle-estimate-badge__label">Main-track puzzles</span>
      <span className="puzzle-estimate-badge__value">
        <RollingEstimateNum target={target} />
      </span>
      {juniorAddOnSlots > 0 ? (
        <span className="puzzle-estimate-badge__junior">+{juniorAddOnSlots} junior</span>
      ) : null}
    </div>
  );
}
