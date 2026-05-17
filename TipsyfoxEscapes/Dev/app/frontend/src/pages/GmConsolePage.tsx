import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResetChecklistModal } from "@/components/live/ResetChecklistModal";
import {
  fetchLeaderboard,
  formatMsClock,
  initLiveSession,
  postGameEnd,
  postLiveClue,
  postLivePlayers,
  postLiveTimer,
  postPuzzleComplete,
} from "@/live/api";
import { useLiveStream } from "@/live/useLiveStream";
import type { LeaderboardEntry } from "../../../shared/liveContracts";
import "@/live/live.css";

type TabId = "console" | "player" | "reports" | "leaderboards";

export function GmConsolePage() {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const { snapshot, connected, error, applyState } = useLiveStream(sessionId);
  const [tab, setTab] = useState<TabId>("console");
  const [clueDraft, setClueDraft] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [initError, setInitError] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    void initLiveSession(sessionId, "venue")
      .then(({ state }) => applyState(state))
      .catch((e) => setInitError(e instanceof Error ? e.message : "Could not init live session."));
  }, [sessionId, applyState]);

  useEffect(() => {
    if (tab === "leaderboards") {
      void fetchLeaderboard().then(setLeaderboard);
    }
  }, [tab]);

  const state = snapshot?.state;
  const solved = state?.puzzles.filter((p) => p.completed).length ?? 0;
  const total = state?.puzzles.length ?? 0;
  const remaining = snapshot?.remainingMs ?? 0;
  const playerUrl =
    typeof window !== "undefined" ? `${window.location.origin}/room/${sessionId}/player-display` : "";

  const bottleneck = useMemo(() => {
    if (!state) return null;
    const incomplete = state.puzzles.filter((p) => !p.completed);
    if (incomplete.length === 0) return null;
    return incomplete[0]?.title ?? null;
  }, [state]);

  const sendClue = async (text: string) => {
    if (!sessionId || !text.trim()) return;
    const res = await postLiveClue(sessionId, text.trim());
    applyState(res.state);
    setClueDraft("");
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "console", label: "Console" },
    { id: "player", label: "Player window" },
    { id: "reports", label: "Reports" },
    { id: "leaderboards", label: "Leaderboards" },
  ];

  return (
    <div className="gm-console-root">
      <header className="gm-console-header live-glass-panel">
        <div>
          <p className="gm-console-eyebrow">Gamemaster Live Console</p>
          <h1>{state?.planName ?? "Live session"}</h1>
          <p className="gm-console-meta">
            Session {sessionId} · {connected ? "SSE connected" : "Reconnecting…"}
          </p>
        </div>
        <Link to="/" className="gm-console-back">
          ← Builder
        </Link>
      </header>

      <nav className="gm-console-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "gm-tab gm-tab--active" : "gm-tab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {initError ? <p className="gm-console-error">{initError}</p> : null}
      {error ? <p className="gm-console-error">{error}</p> : null}

      {tab === "console" ? (
        <section className="gm-panel live-glass-panel">
          <div className="gm-timer-row">
            <div className="gm-timer-display" aria-live="polite">
              {formatMsClock(remaining)}
            </div>
            <div className="gm-timer-actions">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  void postLiveTimer(sessionId, state?.timerRunning ? "pause" : "start").then((s) =>
                    applyState(s.state, s.elapsedMs, s.remainingMs),
                  )
                }
              >
                {state?.timerRunning ? "Pause" : "Start"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void postLiveTimer(sessionId, "pause", -1).then((s) => applyState(s.state, s.elapsedMs, s.remainingMs))}
              >
                −1 min
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void postLiveTimer(sessionId, "pause", 1).then((s) => applyState(s.state, s.elapsedMs, s.remainingMs))}
              >
                +1 min
              </Button>
            </div>
          </div>
          <div className="gm-stat-row">
            <label>
              Active players
              <Input
                type="number"
                min={0}
                max={99}
                value={state?.activePlayerCount ?? 0}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) void postLivePlayers(sessionId, n).then((r) => applyState(r.state));
                }}
              />
            </label>
            <p className="gm-progress-label">
              {solved}/{total} puzzles solved
            </p>
            <div className="gm-progress-bar" aria-hidden>
              <div className="gm-progress-fill" style={{ width: total ? `${(solved / total) * 100}%` : "0%" }} />
            </div>
          </div>
          <ul className="gm-puzzle-log">
            {state?.puzzles.map((p) => (
              <li key={p.id} className={p.completed ? "gm-puzzle-row gm-puzzle-row--done" : "gm-puzzle-row"}>
                <span>
                  <strong>{p.title}</strong>
                  <span className="gm-puzzle-cat">{p.category}</span>
                </span>
                {!p.completed ? (
                  <Button type="button" size="sm" onClick={() => void postPuzzleComplete(sessionId, p.id).then((r) => applyState(r.state))}>
                    Complete
                  </Button>
                ) : (
                  <span className="gm-puzzle-done">✓</span>
                )}
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" onClick={() => setResetOpen(true)}>
            Interactive reset checklist
          </Button>
          <div className="gm-end-row">
            <Button type="button" variant="secondary" onClick={() => void postGameEnd(sessionId, "success").then((r) => applyState(r.state))}>
              Mark success
            </Button>
            <Button type="button" variant="destructive" onClick={() => void postGameEnd(sessionId, "fail").then((r) => applyState(r.state))}>
              Mark fail
            </Button>
          </div>
        </section>
      ) : null}

      {tab === "player" ? (
        <section className="gm-panel live-glass-panel">
          <h2>Player window</h2>
          <p className="gm-help">Open this URL on the projector or in-room tablet:</p>
          <code className="gm-player-url">{playerUrl}</code>
          <div className="gm-clue-box">
            <h3>GM live clue box</h3>
            <div className="gm-clue-input-row">
              <Input
                placeholder="Type a custom clue…"
                value={clueDraft}
                onChange={(e) => setClueDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void sendClue(clueDraft);
                }}
              />
              <Button type="button" onClick={() => void sendClue(clueDraft)}>
                Send
              </Button>
            </div>
            <div className="gm-hint-chips">
              {(state?.preSavedHints ?? []).map((hint) => (
                <button key={hint} type="button" className="gm-hint-chip" onClick={() => void sendClue(hint)}>
                  {hint.length > 48 ? `${hint.slice(0, 48)}…` : hint}
                </button>
              ))}
            </div>
          </div>
          <p className="gm-help muted">Audio triggers and branded overlays — coming soon.</p>
          <details className="gm-venue-help">
            <summary>Venue ops help</summary>
            <ul>
              <li>Map display 1 to GM console (this device).</li>
              <li>Map display 2 to the player URL above.</li>
              <li>Multi-room: use one session ID per active room.</li>
            </ul>
          </details>
        </section>
      ) : null}

      {tab === "reports" ? (
        <section className="gm-panel live-glass-panel">
          <h2>Session report</h2>
          <dl className="gm-report-dl">
            <dt>Result</dt>
            <dd>{state?.gameResult === "in_progress" ? "In progress" : state?.gameResult}</dd>
            <dt>Elapsed</dt>
            <dd>{formatMsClock(snapshot?.elapsedMs ?? 0)}</dd>
            <dt>Bottleneck</dt>
            <dd>{bottleneck ?? "—"}</dd>
            <dt>Events logged</dt>
            <dd>{state?.events.length ?? 0}</dd>
          </dl>
          <ul className="gm-event-log">
            {(state?.events ?? [])
              .slice()
              .reverse()
              .slice(0, 20)
              .map((ev) => (
                <li key={ev.id}>
                  <span className="gm-event-type">{ev.type}</span>
                  <span className="gm-event-time">{new Date(ev.atMs).toLocaleTimeString()}</span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {tab === "leaderboards" ? (
        <section className="gm-panel live-glass-panel">
          <h2>Top times</h2>
          <p className="gm-help muted">In-memory leaderboard for this deployment (MVP).</p>
          <ol className="gm-leaderboard">
            {leaderboard.length === 0 ? (
              <li className="muted">No completed runs yet.</li>
            ) : (
              leaderboard.map((entry, i) => (
                <li key={`${entry.sessionId}-${entry.completedAtMs}`}>
                  <span className="gm-lb-rank">#{i + 1}</span>
                  <span>{entry.planName}</span>
                  <span>{formatMsClock(entry.elapsedMs)}</span>
                  <span className={entry.result === "success" ? "gm-lb-ok" : "gm-lb-fail"}>{entry.result}</span>
                </li>
              ))
            )}
          </ol>
        </section>
      ) : null}

      <ResetChecklistModal open={resetOpen} onClose={() => setResetOpen(false)} sessionId={sessionId} />
    </div>
  );
}
