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
        Council deliberating…
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

export function CouncilTelemetryPanel({ loading, telemetry, compact, serverOpenAiConfigured, browserAiReady }: CouncilTelemetryPanelProps) {
  if (loading) {
    return (
      <section className="council-telemetry council-telemetry--loading" aria-live="polite" aria-busy="true">
        <header className="council-telemetry__head">
          <h4 className="council-telemetry__title">Council of Ten</h4>
          <GenerationEngineBadge engine="static_catalog" loading={true} />
        </header>
        <p className="council-telemetry__lead muted text-sm">
          Compiling room skeleton, diegetic puzzles, and preview firmware — then ten expert personas score the design.
        </p>
        <ul className="council-telemetry__persona-skeleton" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <li key={i} className="council-telemetry__persona-skeleton-row" />
          ))}
        </ul>
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
        {serverOpenAiConfigured === false ? (
          browserAiReady ? (
            <p className="council-telemetry__hint text-sm">
              Server AI is offline, but <strong>Chrome on-device generation</strong> can draft original themes and puzzles when
              you continue to theme selection and build the puzzle set.
            </p>
          ) : (
            <p className="council-telemetry__warn text-sm" role="alert">
              <strong>OPENAI_API_KEY is missing on the server</strong> and on-device AI is unavailable in this browser. Use Chrome
              with the Language Model API enabled, or add the server key in Vercel and redeploy.
            </p>
          )
        ) : (
          <>
            <p className="muted text-sm">
              Master Generator and Council of Ten run when you open <strong>Build puzzle set</strong> (step 3) with a theme
              selected.
            </p>
            <ol className="council-telemetry__steps muted text-xs">
              <li>Finish room details → Continue to theme selection</li>
              <li>Pick a theme → open Build puzzle set</li>
              <li>Wait ~30s — blueprint zones and council scores update</li>
            </ol>
          </>
        )}
      </section>
    );
  }

  const council = telemetry.councilReport;
  const browserGenerated = telemetry.engine === "browser_generated";
  const missingKey =
    !browserGenerated &&
    (telemetry.diagnostics?.openAiConfigured === false ||
      telemetry.diagnostics?.staticReason === "missing_openai_key" ||
      serverOpenAiConfigured === false);
  return (
    <section className="council-telemetry" aria-live="polite">
      <header className="council-telemetry__head">
        <h4 className="council-telemetry__title">Generation engine</h4>
        <GenerationEngineBadge engine={telemetry.engine} />
      </header>
      {browserGenerated ? (
        <p className="council-telemetry__hint text-sm">
          {telemetry.diagnostics?.opsHint ??
            "Drafted in Chrome via on-device Language Model, validated on the server. Council of Ten is skipped on this path."}
        </p>
      ) : missingKey ? (
        <p className="council-telemetry__warn text-sm" role="alert">
          <strong>OPENAI_API_KEY is not configured on the server.</strong>{" "}
          {telemetry.diagnostics?.opsHint ??
            "Add the key in Vercel production env vars and redeploy, then refresh themes and regenerate puzzles."}
        </p>
      ) : telemetry.masterAttempted && telemetry.engine !== "ai_generated" ? (
        <p className="council-telemetry__warn text-sm" role="note">
          Master Generator was attempted but this set came from the static catalog — check OpenAI key, catalog tier, or council
          revision loops.
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
            ? "AI puzzles generated without council metadata (legacy path)."
            : missingKey
              ? "Static catalog only — Council did not run because OpenAI is not configured."
              : "Static catalog path — no council evaluation."}
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
