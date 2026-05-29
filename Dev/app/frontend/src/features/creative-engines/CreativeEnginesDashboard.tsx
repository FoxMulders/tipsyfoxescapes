import { useHardwareSimulator } from "./hooks/useHardwareSimulator.ts";
import { useCreativeEnginesStore } from "./hooks/useCreativeEnginesStore.ts";
import { creativeEnginesStore } from "./store.ts";
import type { ValidationIssue } from "../../../../shared/creativeEngines.ts";
import { PuzzleDependencyGraph } from "./PuzzleDependencyGraph.tsx";
import { SiteHardwareConfigurator } from "./SiteHardwareConfigurator.tsx";
import { StoryTimelineEditor } from "./StoryTimelineEditor.tsx";

function ValidationShelf(): JSX.Element {
  const issues = useCreativeEnginesStore((s) => s.validationIssues);
  const collapsed = useCreativeEnginesStore((s) => s.leftShelfCollapsed);

  if (collapsed) {
    return (
      <aside className="ce-shelf ce-shelf--left ce-shelf--collapsed" aria-label="Validation issues">
        <button type="button" className="ce-shelf-toggle" onClick={() => creativeEnginesStore.toggleLeftShelf()}>
          Show validation
        </button>
      </aside>
    );
  }

  return (
    <aside className="ce-shelf ce-shelf--left" aria-label="Validation and navigation">
      <header className="ce-shelf-head">
        <h3>Validation</h3>
        <button type="button" className="ce-shelf-toggle" onClick={() => creativeEnginesStore.toggleLeftShelf()}>
          Collapse
        </button>
      </header>
      {issues.length === 0 ? (
        <p className="ce-validation-ok">All engines in sync.</p>
      ) : (
        <ul className="ce-validation-list">
          {issues.map((issue: ValidationIssue) => (
            <li key={issue.id} className={`ce-validation-item ce-validation-item--${issue.severity}`}>
              <span className="ce-validation-code">{issue.code}</span>
              <span>{issue.message}</span>
              <span className="ce-validation-engine">{issue.engine}</span>
            </li>
          ))}
        </ul>
      )}
      <nav className="ce-engine-nav" aria-label="Creative engine tabs">
        {(["timeline", "puzzle", "hardware"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className="secondary-btn ce-engine-nav-btn"
            onClick={() => creativeEnginesStore.setActiveTab(tab)}
          >
            {tab === "timeline" ? "Story timeline" : tab === "puzzle" ? "Puzzle graph" : "Hardware"}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function SimulatorShelf(): JSX.Element {
  const collapsed = useCreativeEnginesStore((s) => s.rightShelfCollapsed);
  const log = useCreativeEnginesStore((s) => s.simulatorLog);
  const knownPuzzleIds = useCreativeEnginesStore((s) => s.knownPuzzleIds);
  const { connected, connect, disconnect, simulatePuzzleSolve } = useHardwareSimulator();

  if (collapsed) {
    return (
      <aside className="ce-shelf ce-shelf--right ce-shelf--collapsed" aria-label="Hardware simulator">
        <button type="button" className="ce-shelf-toggle" onClick={() => creativeEnginesStore.toggleRightShelf()}>
          Show simulator
        </button>
      </aside>
    );
  }

  return (
    <aside className="ce-shelf ce-shelf--right" aria-label="Local hardware simulator">
      <header className="ce-shelf-head">
        <h3>Simulator</h3>
        <button type="button" className="ce-shelf-toggle" onClick={() => creativeEnginesStore.toggleRightShelf()}>
          Collapse
        </button>
      </header>
      <p className="muted ce-simulator-lead">Mock SSE stream — puzzle solve triggers narrative advance and DMX green.</p>
      <div className="ce-simulator-actions">
        {connected ? (
          <button type="button" className="secondary-btn" onClick={disconnect}>
            Disconnect
          </button>
        ) : (
          <button type="button" className="primary-btn" onClick={connect}>
            Connect mock SSE
          </button>
        )}
      </div>
      <label className="ce-simulator-solve-label" htmlFor="ce-sim-puzzle">
        Simulate puzzle solve
        <select
          id="ce-sim-puzzle"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) simulatePuzzleSolve(e.target.value);
          }}
        >
          <option value="" disabled>
            Choose puzzle…
          </option>
          {knownPuzzleIds.map((id: string) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <div className="ce-dmx-preview" aria-live="polite">
        <span className="ce-dmx-swatch" title="Simulated DMX green" />
        DMX preview (green on solve)
      </div>
      <ol className="ce-simulator-log" aria-label="Simulator event log">
        {log.length === 0 ? <li className="muted">No events yet.</li> : null}
        {log.map((line: string, i: number) => (
          <li key={`${i}-${line}`}>{line}</li>
        ))}
      </ol>
    </aside>
  );
}

function EngineCanvas(): JSX.Element {
  const activeTab = useCreativeEnginesStore((s) => s.activeTab);

  return (
    <main className="ce-canvas" aria-label="Creative engine canvas">
      <div className="ce-canvas-tabs" role="tablist" aria-label="Engine selector">
        {(
          [
            ["timeline", "Story timeline"],
            ["puzzle", "Puzzle dependencies"],
            ["hardware", "Site hardware"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`ce-canvas-tab${activeTab === tab ? " ce-canvas-tab--active" : ""}`}
            onClick={() => creativeEnginesStore.setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="ce-canvas-body" role="tabpanel">
        {activeTab === "timeline" ? <StoryTimelineEditor /> : null}
        {activeTab === "puzzle" ? <PuzzleDependencyGraph /> : null}
        {activeTab === "hardware" ? <SiteHardwareConfigurator /> : null}
      </div>
    </main>
  );
}

export type CreativeEnginesDashboardProps = {
  className?: string;
};

export function CreativeEnginesDashboard({ className }: CreativeEnginesDashboardProps): JSX.Element {
  return (
    <section
      className={`creative-engines-dashboard${className ? ` ${className}` : ""}`}
      aria-label="Creative engines workspace"
    >
      <header className="ce-dashboard-head">
        <h3 className="output-review-section-title">Creative engines</h3>
        <p className="muted">
          Unified narrative timeline, puzzle dependency graph, and site hardware matrix with cross-engine validation.
        </p>
      </header>
      <div className="ce-dashboard-grid">
        <ValidationShelf />
        <EngineCanvas />
        <SimulatorShelf />
      </div>
    </section>
  );
}
