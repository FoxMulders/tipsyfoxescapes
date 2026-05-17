import { useEffect, useRef, useState } from "react";
import type { LiveGameState } from "../../../shared/liveContracts";
import type { LiveSnapshot } from "./api";

export const useLiveStream = (sessionId: string | undefined) => {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>("");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setError("");
    const es = new EventSource(`/api/live/${sessionId}/stream`);
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      setError("Live connection interrupted — reconnecting…");
    };
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as LiveSnapshot;
        if (data.state) {
          setSnapshot(data);
          setError("");
        }
      } catch {
        // ignore malformed
      }
    };
    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [sessionId]);

  const applyState = (state: LiveGameState, elapsedMs?: number, remainingMs?: number) => {
    setSnapshot((prev) => ({
      state,
      elapsedMs: elapsedMs ?? prev?.elapsedMs ?? 0,
      remainingMs: remainingMs ?? prev?.remainingMs ?? 0,
    }));
  };

  return { snapshot, connected, error, applyState, state: snapshot?.state ?? null };
};
