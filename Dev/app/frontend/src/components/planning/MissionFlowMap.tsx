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
  const segW = compact ? 46 : n <= 5 ? 76 : 60;
  const w = Math.max(360, 44 + (n - 1) * segW);
  const useFork = youthAddOnEnabled && forkSegmentIndex !== null && forkSegmentIndex >= 0 && forkSegmentIndex < n - 1;
  const h = useFork ? 58 : 48;
  const nodeY = useFork ? 24 : 20;
  const nodeR = compact ? 5.5 : 6.25;
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
    if (active) return "hsl(187 92% 48%)";
    if (done) return "hsl(187 70% 62%)";
    return "rgba(88, 108, 148, 0.45)";
  };

  const glowId = `missionFlowGlow-${reactId}`;

  return (
    <div
      className={cn(
        "mission-flow-map mission-flow-map--header mission-flow-map--compact-sticky",
        compact && "mission-flow-map--compact",
        useFork && "mission-flow-map--fork",
      )}
      role="navigation"
      aria-label="Mission progress map"
      data-testid="mission-flow-map"
    >
      <svg
        className="mission-flow-svg mission-flow-svg--compact block w-full max-h-[3.25rem] overflow-visible"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
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
          const upcoming = !done && !active;
          return (
            <g key={`seg-g-${i}`} className="mission-flow-segment">
              <path
                d={d}
                className="mission-flow-path-track"
                fill="none"
                stroke={upcoming ? "rgba(40, 52, 82, 0.65)" : "rgba(52, 68, 108, 0.95)"}
                strokeWidth={4.5}
                strokeLinecap="round"
              />
              <path
                d={d}
                className={cn(
                  "mission-flow-path",
                  done && "mission-flow-path--done",
                  active && "mission-flow-path--active",
                  upcoming && "mission-flow-path--todo",
                )}
                fill="none"
                stroke={segStroke(done, active)}
                strokeWidth={active ? 3.2 : done ? 2.8 : 2.2}
                strokeLinecap="round"
                filter={active ? `url(#${glowId})` : undefined}
              />
              {(() => {
                const x0 = xs[i] ?? 0;
                const x1 = xs[i + 1] ?? 0;
                const mid = (x0 + x1) / 2;
                const chev = 4;
                const fill = active ? "hsl(187 92% 48%)" : done ? "hsl(187 70% 62%)" : "rgba(88, 108, 148, 0.55)";
                return (
                  <polygon
                    points={`${mid - chev},${nodeY - chev} ${mid + chev},${nodeY} ${mid - chev},${nodeY + chev}`}
                    className="mission-flow-chevron"
                    fill={fill}
                  />
                );
              })()}
            </g>
          );
        })}
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
              <text y={4} textAnchor="middle" className="mission-flow-node-num">
                {i + 1}
              </text>
              <text y={nodeR + 15} textAnchor="middle" className="mission-flow-node-label">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      {useFork ? (
        <p className="mission-flow-fork-caption" role="note">
          <span className="mission-flow-fork-badge">Junior add-on</span> Parallel track on Build → Review
        </p>
      ) : null}
    </div>
  );
}
