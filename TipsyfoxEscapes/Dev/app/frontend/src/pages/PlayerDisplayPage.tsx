import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { formatMsClock, initLiveSession } from "@/live/api";
import { useLiveStream } from "@/live/useLiveStream";
import "@/live/live.css";

export function PlayerDisplayPage() {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const { snapshot, connected, error } = useLiveStream(sessionId);

  useEffect(() => {
    if (!sessionId) return;
    void initLiveSession(sessionId).catch(() => {
      /* may already exist */
    });
  }, [sessionId]);

  const remaining = snapshot?.remainingMs ?? 0;
  const clue = snapshot?.state?.currentClue ?? "";
  const planName = snapshot?.state?.planName ?? "Escape room";
  const solved = useMemo(
    () => snapshot?.state?.puzzles.filter((p) => p.completed).length ?? 0,
    [snapshot?.state?.puzzles],
  );
  const total = snapshot?.state?.puzzles.length ?? 0;

  return (
    <div className="player-display-root">
      <header className="player-display-header">
        <p className="player-display-brand">Tipsy Fox Escapes</p>
        <h1 className="player-display-title">{planName}</h1>
        <p className={`player-display-status${connected ? "" : " player-display-status--warn"}`}>
          {connected ? "Live" : "Connecting…"}
        </p>
      </header>
      <div className="player-display-timer" aria-live="polite">
        {formatMsClock(remaining)}
      </div>
      {clue ? (
        <div className="player-display-clue">
          <p className="player-display-clue-label">Hint</p>
          <p>{clue}</p>
        </div>
      ) : (
        <p className="player-display-waiting">Awaiting your game master…</p>
      )}
      {total > 0 ? (
        <p className="player-display-progress">
          Progress: {solved}/{total} puzzles
        </p>
      ) : null}
      {error ? <p className="player-display-error">{error}</p> : null}
      <footer className="player-display-footer">
        <Link to="/" className="player-display-back">
          Builder
        </Link>
      </footer>
    </div>
  );
}
