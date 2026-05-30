import { GenerationProgressIndicator } from "@/components/generation/GenerationProgressIndicator";
import { PUZZLE_GENERATION_PHASES } from "@/components/generation/GenerationProgressPhases";
import type { CouncilReportClient, CouncilVerdictClient, GenerationEngine, GenerationTelemetry } from "../domain/generationTelemetry";
import { generationEngineLabel } from "../domain/generationTelemetry";

type GenerationEngineBadgeProps = {
  engine: GenerationEngine;
  loading?: boolean;
};

export function GenerationEngineBadge({ engine, loading }: GenerationEngineBadgeProps) {
  if (loading) {
    return (
      <span className="generation-engine-badge generation-engine-badge--loading" role="status">
        Generating…
      </span>
    );
  }
  const variant =
    engine === "ai_generated"
      ? "ai"
      : engine === "browser_generated"
        ? "browser"
        : engine === "static_fallback"
          ? "fallback"
          : "catalog";
  return (
    <span className={`generation-engine-badge generation-engine-badge--${variant}`} role="status">
      {generationEngineLabel(engine)}
    </span>
  );
}

type CouncilTelemetryPanelProps = {
  loading?: boolean;
  telemetry: GenerationTelemetry | null;
  compact?: boolean;
  serverOpenAiConfigured?: boolean | null;
  browserAiReady?: boolean;
};

export function CouncilTelemetryPanel({ loading, telemetry, compact }: CouncilTelemetryPanelProps) {
  if (loading) {
    return (
      <section className="council-telemetry council-telemetry--loading" aria-live="polite" aria-busy="true">
        <header className="council-telemetry__head">
          <h4 className="council-telemetry__title">Generation engine</h4>
          <GenerationEngineBadge engine="static_catalog" loading={true} />
        </header>
        <GenerationProgressIndicator active phases={PUZZLE_GENERATION_PHASES} className="generation-progress-indicator--compact" />
      </section>
    );
  }

  if (!telemetry) {
    return (
      <section className="council-telemetry council-telemetry--empty" aria-live="polite">
        <header className="council-telemetry__head">
          <h4 className="council-telemetry__title">Generation engine</h4>
          <GenerationEngineBadge engine="static_catalog" />
        </header>
        <p className="muted text-sm">
          Themes and puzzles generate when you continue through the wizard — pick a theme, then open{" "}
          <strong>Build puzzle set</strong>.
        </p>
        <ol className="council-telemetry__steps muted text-xs">
          <li>Finish room details → Continue to theme selection</li>
          <li>Pick or author a theme → Build puzzle set</li>
          <li>Blueprint zones update as the set loads</li>
        </ol>
      </section>
    );
  }

  const council = telemetry.councilReport;
  const browserGenerated = telemetry.engine === "browser_generated";
  return (
    <section className="council-telemetry" aria-live="polite">
      <header className="council-telemetry__head">
        <h4 className="council-telemetry__title">Generation engine</h4>
        <GenerationEngineBadge engine={telemetry.engine} />
      </header>
      {browserGenerated ? (
        <p className="council-telemetry__hint text-sm">
          Original themes and puzzles drafted on this device, then validated for your room plan.
        </p>
      ) : telemetry.masterAttempted && telemetry.engine !== "ai_generated" ? (
        <p className="council-telemetry__hint text-sm" role="note">
          Using curated starter puzzles aligned to your theme — use <strong>Refresh Ideas</strong> or replace individual slots
          for more variety.
        </p>
      ) : null}
      {council ? (
        <>
          <div className="council-telemetry__summary">
            <div className="council-telemetry__metric">
              <span className="council-telemetry__metric-label">Avg score</span>
              <strong className="council-telemetry__metric-value">{council.averageScore.toFixed(1)}</strong>
              <span className="muted text-xs">/ 10</span>
            </div>
            <div className="council-telemetry__metric">
              <span className="council-telemetry__metric-label">Wow votes</span>
              <strong className="council-telemetry__metric-value">{council.wowCount}</strong>
              <span className="muted text-xs">/ 10</span>
            </div>
            <div className="council-telemetry__metric">
              <span className="council-telemetry__metric-label">Loops</span>
              <strong className="council-telemetry__metric-value">{council.iterations}</strong>
            </div>
          </div>
          <p
            className={`council-telemetry__consensus text-sm ${council.passed ? "council-telemetry__consensus--pass" : "council-telemetry__consensus--fail"}`}
            role="status"
          >
            {council.passed ? "Council consensus passed" : "Shipped after max revision loops (best effort)"}
          </p>
          {!compact && council.verdicts && council.verdicts.length > 0 ? (
            <ul className="council-telemetry__verdicts">
              {council.verdicts.map((v) => (
                <CouncilVerdictRow key={v.personaId} verdict={v} />
              ))}
            </ul>
          ) : null}
          {!council.passed && council.revisionNotes ? (
            <details className="council-telemetry__revision">
              <summary className="text-sm">Revision notes</summary>
              <pre className="council-telemetry__revision-body">{council.revisionNotes}</pre>
            </details>
          ) : null}
        </>
      ) : (
        <p className="muted text-sm">
          {telemetry.engine === "ai_generated"
            ? "AI-generated puzzle set for your theme."
            : telemetry.engine === "browser_generated"
              ? "On-device draft validated for your room."
              : "Curated puzzle set matched to your theme and capacity."}
        </p>
      )}
      <p className="council-telemetry__ts muted text-xs">
        Last run {new Date(telemetry.generatedAt).toLocaleString()}
      </p>
    </section>
  );
}

function CouncilVerdictRow({ verdict }: { verdict: CouncilVerdictClient }) {
  return (
    <li className={`council-telemetry__verdict ${verdict.wow_factor ? "council-telemetry__verdict--wow" : ""}`}>
      <div className="council-telemetry__verdict-head">
        <span className="council-telemetry__verdict-title">{verdict.title}</span>
        <span className="council-telemetry__verdict-score tabular-nums">{verdict.score.toFixed(1)}</span>
        {verdict.wow_factor ? <span className="council-telemetry__wow-pill">Wow</span> : null}
      </div>
      {!verdict.wow_factor && verdict.critical_feedback ? (
        <p className="council-telemetry__verdict-note muted text-xs">{verdict.critical_feedback}</p>
      ) : null}
    </li>
  );
}
