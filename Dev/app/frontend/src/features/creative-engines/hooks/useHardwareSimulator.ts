import { useCallback, useEffect, useRef, useState } from "react";
import { resolveSimulatorOutputs, type SimulatorEvent } from "../../../../../shared/creativeEngines.ts";
import { creativeEnginesStore } from "../store.ts";
import { useCreativeEnginesStore } from "./useCreativeEnginesStore.ts";

type MockEvent = {
  type: string;
  payload: unknown;
  at: number;
};

/** Mock SSE stream for local hardware / narrative integration testing. */
export function useHardwareSimulator(): {
  connected: boolean;
  events: MockEvent[];
  connect: () => void;
  disconnect: () => void;
  simulatePuzzleSolve: (puzzleId: string) => void;
} {
  const snapshot = useCreativeEnginesStore((s) => ({
    narrativeNodes: s.narrativeNodes,
    puzzleNodes: s.puzzleNodes,
    puzzleEdges: s.puzzleEdges,
    virtualStates: s.virtualStates,
    hardwareMappings: s.hardwareMappings,
  }));
  const connected = useCreativeEnginesStore((s) => s.simulatorConnected);
  const [events, setEvents] = useState<MockEvent[]>([]);
  const timerRef = useRef<number | null>(null);

  const disconnect = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    creativeEnginesStore.setSimulatorConnected(false);
    creativeEnginesStore.appendSimulatorLog("Simulator disconnected.");
  }, []);

  const connect = useCallback(() => {
    disconnect();
    creativeEnginesStore.setSimulatorConnected(true);
    creativeEnginesStore.appendSimulatorLog("Mock SSE connected (local).");
    timerRef.current = window.setInterval(() => {
      creativeEnginesStore.appendSimulatorLog("heartbeat: site-controller ok");
    }, 15000);
  }, [disconnect]);

  useEffect(() => () => disconnect(), [disconnect]);

  const simulatePuzzleSolve = useCallback(
    (puzzleId: string) => {
      const resolved = resolveSimulatorOutputs(snapshot, puzzleId);
      const batch: MockEvent[] = resolved.map((ev: SimulatorEvent) => ({
        type: ev.type,
        payload: ev,
        at: Date.now(),
      }));
      setEvents((prev) => [...prev.slice(-24), ...batch]);
      for (const ev of resolved) {
        if (ev.type === "puzzle_solved") {
          creativeEnginesStore.appendSimulatorLog(`PUZZLE_SOLVED ${ev.puzzleId}`);
        } else if (ev.type === "narrative_advance") {
          creativeEnginesStore.appendSimulatorLog(`NARRATIVE_ADVANCE act ${ev.actIndex} (${ev.nodeId})`);
        } else if (ev.type === "hardware_output") {
          const color = ev.outputKind === "dmx" ? "green (65280)" : String(ev.value);
          creativeEnginesStore.appendSimulatorLog(`${ev.outputKind.toUpperCase()} → ${color}`);
        }
      }
    },
    [snapshot],
  );

  return { connected, events, connect, disconnect, simulatePuzzleSolve };
}
