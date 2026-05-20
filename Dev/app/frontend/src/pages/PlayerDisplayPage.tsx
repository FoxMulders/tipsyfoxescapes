import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { formatMsClock, initLiveSession, postPlayerReady } from "@/live/api";
import { useLiveStream } from "@/live/useLiveStream";
import "@/live/live.css";

export function PlayerDisplayPage() {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const { snapshot, connected, error } = useLiveStream(sessionId);

  useEffect(() => {
    if (!sessionId) return;
    void initLiveSession(sessionId)
      .then(() => postPlayerReady(sessionId))
      .catch(() => {
        /* may already exist */
      });
  }, [sessionId]);

  const remaining = snapshot?.remainingMs ?? 0;
  const clue = snapshot?.state?.currentClue ?? "";
  const planName = snapshot?.state?.planName ?? "Escape room";
  const mode = snapshot?.state?.playerDisplayMode ?? "active_game";
  const customLabel = snapshot?.state?.customMediaLabel ?? "";
  const gameResult = snapshot?.state?.gameResult ?? "in_progress";
  const solved = useMemo(
    () => snapshot?.state?.puzzles.filter((p) => p.completed).length ?? 0,
    [snapshot?.state?.puzzles],
  );
  const total = snapshot?.state?.puzzles.length ?? 0;

  return (
    <div className={`player-display-root player-display-root--${mode}`}>
      <header className="player-display-header">
        <p className="player-display-brand">Tipsy Fox Escapes</p>
        <h1 className="player-display-title">{planName}</h1>
        <p className={`player-display-status${connected ? "" : " player-display-status--warn"}`}>
          {connected ? "Live" : "Connecting…"}
        </p>
      </header>

      {mode === "hint_overlay" && clue ? (
        <div className="player-display-clue player-display-clue--overlay">
          <p className="player-display-clue-label">Hint</p>
          <p>{clue}</p>
        </div>
      ) : null}

      {mode === "end_game" ? (
        <div className="player-display-end">
          <p className="player-display-end-label">
            {gameResult === "success" ? "Mission complete" : gameResult === "fail" ? "Time's up" : "Game ended"}
          </p>
          <p className="player-display-end-time">{formatMsClock(snapshot?.elapsedMs ?? 0)}</p>
        </div>
      ) : null}

      {mode === "custom_media" ? (
        <div className="player-display-custom-media">
          <p className="player-display-custom-media-label">{customLabel || "Custom media"}</p>
          <p className="player-display-custom-media-hint">Trigger your branded slide or video on this display.</p>
        </div>
      ) : null}

      {mode === "active_game" || mode === "hint_overlay" ? (
        <>
          <div className="player-display-timer" aria-live="polite">
            {formatMsClock(remaining)}
          </div>
          {mode === "active_game" && clue ? (
            <div className="player-display-clue">
              <p className="player-display-clue-label">Hint</p>
              <p>{clue}</p>
            </div>
          ) : mode === "active_game" ? (
            <p className="player-display-waiting">Awaiting your game master…</p>
          ) : null}
          {total > 0 ? (
            <p className="player-display-progress">
              Progress: {solved}/{total} puzzles
            </p>
          ) : null}
        </>
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
