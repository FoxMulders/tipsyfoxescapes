import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResetChecklistModal } from "@/components/live/ResetChecklistModal";
import {
  deriveConnectivityStatus,
  fetchPlanningSessionHealth,
  renewPlanningSessionLease,
  type ConnectivityStatus,
} from "@/planningSession";
import {
  fetchLeaderboard,
  formatMsClock,
  initLiveSession,
  isEnterpriseFleetError,
  isSubscriptionFrozenError,
  postGameEnd,
  postLiveClue,
  postLivePlayers,
  postLiveStage,
  postLiveTimer,
  postPlayerDisplayMode,
  postPuzzleComplete,
} from "@/live/api";
import { useLiveStream } from "@/live/useLiveStream";
import type { LeaderboardEntry, PlayerDisplayMode } from "../../../shared/liveContracts";
import "@/live/live.css";

const AUTH_STORAGE_KEY = "escape-room-builder-auth-v1";

type TabId = "console" | "screens" | "player" | "reports" | "leaderboards";

const connectivityLabel: Record<ConnectivityStatus, string> = {
  connected: "Connected",
  degraded: "Reconnecting",
  offline: "Offline",
};

export function GmConsolePage() {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { snapshot, connected, error, applyState } = useLiveStream(sessionId);
  const [tab, setTab] = useState<TabId>("console");
  const [clueDraft, setClueDraft] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [initError, setInitError] = useState("");
  const [planningOk, setPlanningOk] = useState(true);
  const [customMediaLabel, setCustomMediaLabel] = useState("Team photo / branded slide");
  const [authToken, setAuthToken] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { authToken?: string };
      setAuthToken(parsed.authToken ?? "");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    void initLiveSession(sessionId, "venue")
      .then(({ state }) => applyState(state))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Could not init live session.";
        setInitError(msg);
        if (isEnterpriseFleetError(msg)) {
          navigate("/?enterprise=onboarding", { replace: true });
        }
      });
  }, [sessionId, applyState, navigate]);

  useEffect(() => {
    if (!sessionId) return;
    const headers: HeadersInit = authToken
      ? { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
    const tick = async () => {
      const health = await fetchPlanningSessionHealth(sessionId, headers);
      setPlanningOk(Boolean(health?.ok));
      if (health?.ok && authToken) {
        await renewPlanningSessionLease(sessionId, headers);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 4 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [sessionId, authToken]);

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

  const connectivity = deriveConnectivityStatus({
    planningOk,
    streamConnected: connected,
    streamError: Boolean(error || initError),
  });

  const frozenOps = isSubscriptionFrozenError(initError);

  const bottleneck = useMemo(() => {
    if (!state) return null;
    const incomplete = state.puzzles.filter((p) => !p.completed);
    if (incomplete.length === 0) return null;
    return incomplete[0]?.title ?? null;
  }, [state]);

  const sendClue = async (text: string) => {
    if (!sessionId || !text.trim() || frozenOps) return;
    const res = await postLiveClue(sessionId, text.trim());
    applyState(res.state);
    setClueDraft("");
    if (state?.playerDisplayMode !== "hint_overlay") {
      void postPlayerDisplayMode(sessionId, "hint_overlay").then((s) => applyState(s.state, s.elapsedMs, s.remainingMs));
    }
  };

  const setDisplayMode = async (mode: PlayerDisplayMode) => {
    if (!sessionId || frozenOps) return;
    const res = await postPlayerDisplayMode(
      sessionId,
      mode,
      mode === "custom_media" ? customMediaLabel : undefined,
    );
    applyState(res.state, res.elapsedMs, res.remainingMs);
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "console", label: "Console" },
    { id: "screens", label: "Screen Manager" },
    { id: "player", label: "Player window" },
    { id: "reports", label: "Reports" },
    { id: "leaderboards", label: "Leaderboards" },
  ];

  const stageCount = 6;

  return (
    <div className="gm-console-root">
      <header className="gm-console-header live-glass-panel">
        <div>
          <p className="gm-console-eyebrow">Gamemaster Live Console</p>
          <h1>{state?.planName ?? "Live session"}</h1>
          <p className="gm-console-meta">
            Session {sessionId}
            <span
              className={`gm-connectivity gm-connectivity--${connectivity}`}
              role="status"
              aria-label={`Connectivity: ${connectivityLabel[connectivity]}`}
              title={
                connectivity === "connected"
                  ? "Planning lease and live stream healthy"
                  : connectivity === "degraded"
                    ? "Live stream reconnecting or lease renew pending"
                    : "Planning session unreachable — check network or reopen builder"
              }
            >
              <span className="gm-connectivity__dot" aria-hidden />
              {connectivityLabel[connectivity]}
            </span>
            {state?.playerDisplayReady ? (
              <span className="gm-player-ready-badge">Player display ready</span>
            ) : (
              <span className="gm-player-ready-badge gm-player-ready-badge--pending">Awaiting player display</span>
            )}
          </p>
        </div>
        <Link to="/" className="gm-console-back">
          ← Builder
        </Link>
      </header>

      {frozenOps ? (
        <p className="gm-console-banner gm-console-banner--warn">
          Subscription inactive — live timer and player sync are read-only until you reactivate your operator tier.
        </p>
      ) : null}

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

      {initError && !isEnterpriseFleetError(initError) ? <p className="gm-console-error">{initError}</p> : null}
      {error ? <p className="gm-console-hint">{error}</p> : null}

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
                disabled={frozenOps}
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
                disabled={frozenOps}
                onClick={() => void postLiveTimer(sessionId, "adjust", 1).then((s) => applyState(s.state, s.elapsedMs, s.remainingMs))}
              >
                −1 min
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={frozenOps}
                onClick={() => void postLiveTimer(sessionId, "adjust", -1).then((s) => applyState(s.state, s.elapsedMs, s.remainingMs))}
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
                disabled={frozenOps}
                value={state?.activePlayerCount ?? 0}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) void postLivePlayers(sessionId, n).then((r) => applyState(r.state));
                }}
              />
            </label>
            <label>
              Story stage
              <select
                className="gm-stage-select"
                disabled={frozenOps}
                value={state?.currentStageIndex ?? 0}
                onChange={(e) =>
                  void postLiveStage(sessionId, Number(e.target.value)).then((s) =>
                    applyState(s.state, s.elapsedMs, s.remainingMs),
                  )
                }
              >
                {Array.from({ length: stageCount }, (_, i) => (
                  <option key={i} value={i}>
                    Stage {i + 1}
                  </option>
                ))}
              </select>
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
                  <Button
                    type="button"
                    size="sm"
                    disabled={frozenOps}
                    onClick={() => void postPuzzleComplete(sessionId, p.id).then((r) => applyState(r.state))}
                  >
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
            <Button
              type="button"
              variant="secondary"
              disabled={frozenOps}
              onClick={() => void postGameEnd(sessionId, "success").then((r) => applyState(r.state))}
            >
              Mark success
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={frozenOps}
              onClick={() => void postGameEnd(sessionId, "fail").then((r) => applyState(r.state))}
            >
              Mark fail
            </Button>
          </div>
        </section>
      ) : null}

      {tab === "screens" ? (
        <section className="gm-panel live-glass-panel">
          <h2>Screen Manager</h2>
          <p className="gm-help">Push the player projector view instantly. GM console remains master for timer and clues.</p>
          <p className="gm-help muted">
            Active mode: <strong>{state?.playerDisplayMode ?? "active_game"}</strong>
          </p>
          <div className="gm-screen-grid">
            <Button type="button" disabled={frozenOps} onClick={() => void setDisplayMode("active_game")}>
              Active Game
            </Button>
            <Button type="button" disabled={frozenOps} onClick={() => void setDisplayMode("hint_overlay")}>
              Hint Overlay
            </Button>
            <Button type="button" disabled={frozenOps} onClick={() => void setDisplayMode("end_game")}>
              End Game
            </Button>
            <Button type="button" disabled={frozenOps} onClick={() => void setDisplayMode("custom_media")}>
              Custom Media Trigger
            </Button>
          </div>
          <label className="gm-custom-media-label">
            Custom media label
            <Input value={customMediaLabel} onChange={(e) => setCustomMediaLabel(e.target.value)} disabled={frozenOps} />
          </label>
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
                disabled={frozenOps}
                onChange={(e) => setClueDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void sendClue(clueDraft);
                }}
              />
              <Button type="button" disabled={frozenOps} onClick={() => void sendClue(clueDraft)}>
                Send
              </Button>
            </div>
            <div className="gm-hint-chips">
              {(state?.preSavedHints ?? []).map((hint) => (
                <button key={hint} type="button" className="gm-hint-chip" disabled={frozenOps} onClick={() => void sendClue(hint)}>
                  {hint.length > 48 ? `${hint.slice(0, 48)}…` : hint}
                </button>
              ))}
            </div>
          </div>
          <details className="gm-venue-help">
            <summary>Venue ops help</summary>
            <ul>
              <li>Map display 1 to GM console (this device).</li>
              <li>Map display 2 to the player URL above — wait for &quot;Player display ready&quot;.</li>
              <li>Multi-room fleet requires enterprise provisioning on Venue Blueprint.</li>
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
