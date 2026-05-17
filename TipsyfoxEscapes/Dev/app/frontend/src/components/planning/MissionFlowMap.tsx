import { useId } from "react";
import { cn } from "@/lib/utils";

export function MissionFlowMap({
  stepLabels,
  activeIndex,
  youthAddOnEnabled,
  forkSegmentIndex,
  onStepClick,
  canNavigateToStep,
}: {
  stepLabels: readonly string[];
  activeIndex: number;
  youthAddOnEnabled: boolean;
  forkSegmentIndex: number | null;
  onStepClick?: (index: number) => void;
  canNavigateToStep?: (index: number) => boolean;
}) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const n = stepLabels.length;
  const compact = n >= 6;
  const segW = compact ? 72 : n <= 5 ? 132 : 96;
  const w = Math.max(520, 56 + (n - 1) * segW);
  const useFork = youthAddOnEnabled && forkSegmentIndex !== null && forkSegmentIndex >= 0 && forkSegmentIndex < n - 1;
  const h = useFork ? 118 : 88;
  const nodeY = useFork ? 56 : 44;
  const nodeR = compact ? 9 : 11;
  const lineEndInset = nodeR + 4;
  const xs = stepLabels.map((_, i) => 40 + i * ((w - 80) / Math.max(1, n - 1)));

  const segComplete = (i: number) => activeIndex > i;
  const segActive = (i: number) => activeIndex === i + 1;
  const nodeState = (i: number) => {
    if (activeIndex > i) return "done";
    if (activeIndex === i) return "active";
    return "todo";
  };

  const pathD = (i: number): string | null => {
    if (i >= n - 1) return null;
    const x0 = xs[i] ?? 0;
    const x1 = xs[i + 1] ?? 0;
    const dir = Math.sign(x1 - x0) || 1;
    const xa = x0 + dir * lineEndInset;
    const xb = x1 - dir * lineEndInset;
    if (Math.abs(xb - xa) < 6) return `M ${x0} ${nodeY} L ${x1} ${nodeY}`;
    return `M ${xa} ${nodeY} L ${xb} ${nodeY}`;
  };

  const segStroke = (done: boolean, active: boolean): string => {
    if (active) return "rgba(0, 242, 255, 0.98)";
    if (done) return "rgba(175, 228, 255, 1)";
    return "rgba(145, 188, 255, 0.92)";
  };

  const forkSeg = forkSegmentIndex ?? 0;
  const forkBranchD =
    useFork && forkSeg >= 0
      ? (() => {
          const x0 = xs[forkSeg] ?? 0;
          const x1 = xs[forkSeg + 1] ?? 0;
          const dir = Math.sign(x1 - x0) || 1;
          const sx = x0 + dir * lineEndInset;
          const ex = x1 - dir * lineEndInset;
          const mid = (sx + ex) / 2;
          const yTop = nodeY - 20;
          const yBot = nodeY + 20;
          return `M ${sx} ${nodeY} Q ${mid} ${yTop} ${ex} ${nodeY} M ${sx} ${nodeY} Q ${mid} ${yBot} ${ex} ${nodeY}`;
        })()
      : "";

  const glowId = `missionFlowGlow-${reactId}`;

  return (
    <div
      className={cn(
        "mission-flow-map mission-flow-map--header",
        compact && "mission-flow-map--compact",
      )}
      role="navigation"
      aria-label="Mission progress map"
      data-testid="mission-flow-map"
    >
      <svg className="mission-flow-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {stepLabels.map((_, i) => {
          if (i >= n - 1) return null;
          const d = pathD(i);
          if (!d) return null;
          const done = segComplete(i);
          const active = segActive(i);
          return (
            <g key={`seg-g-${i}`} className="mission-flow-segment">
              <path d={d} className="mission-flow-path-track" fill="none" stroke="rgba(52, 68, 108, 0.95)" strokeWidth={6} strokeLinecap="round" />
              <path
                d={d}
                className={cn("mission-flow-path", done && "mission-flow-path--done", active && "mission-flow-path--active")}
                fill="none"
                stroke={segStroke(done, active)}
                strokeWidth={active ? 4.1 : done ? 3.5 : 3.1}
                strokeLinecap="round"
                filter={active ? `url(#${glowId})` : undefined}
              />
            </g>
          );
        })}
        {forkBranchD ? (
          <path
            d={forkBranchD}
            className={cn("mission-flow-fork", forkSeg >= 0 && activeIndex >= forkSeg && "mission-flow-fork--live")}
            fill="none"
            stroke="rgba(0,242,255,0.55)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="6 5"
          />
        ) : null}
        {stepLabels.map((label, i) => {
          const st = nodeState(i);
          const cx = xs[i] ?? 0;
          const clickable = Boolean(onStepClick) && (canNavigateToStep?.(i) ?? true);
          return (
            <g
              key={`flow-node-${i}-${label}`}
              transform={`translate(${cx}, ${nodeY})`}
              className={cn(`mission-flow-node mission-flow-node--${st}`, clickable && "mission-flow-node--clickable")}
              style={clickable ? { cursor: "pointer" } : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-current={st === "active" ? "step" : undefined}
              aria-label={`${label}${st === "active" ? " (current)" : st === "done" ? " (completed)" : ""}`}
              onClick={
                clickable
                  ? () => {
                      onStepClick?.(i);
                    }
                  : undefined
              }
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onStepClick?.(i);
                      }
                    }
                  : undefined
              }
            >
              <circle r={nodeR + 3} className="mission-flow-node-halo" />
              <circle r={nodeR} className="mission-flow-node-ring" />
              <text y={nodeR + 22} textAnchor="middle" className="mission-flow-node-label">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      {useFork ? (
        <p className="muted mission-flow-fork-caption">
          Junior add-on: parallel branch on the Build → Review leg (adults + kids tracks).
        </p>
      ) : null}
    </div>
  );
}
