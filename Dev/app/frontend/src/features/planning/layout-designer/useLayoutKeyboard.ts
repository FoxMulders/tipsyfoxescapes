import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import { usePlanning } from "../context/PlanningProvider";
import type { PlanningAction } from "../context/planningReducer";
import { snapMeters } from "./layoutScene";

export function useLayoutKeyboard(dispatch: Dispatch<PlanningAction>): void {
  const { state } = usePlanning();
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const onKey = (ev: KeyboardEvent): void => {
      const s = stateRef.current;
      const id = s.layoutSelectedId;
      if (!id) return;
      const el = s.roomLayout.elements.find((e) => e.id === id);
      if (!el) return;
      const step = s.roomLayout.snapM;
      if (ev.key === "Delete" || ev.key === "Backspace") {
        ev.preventDefault();
        dispatch({ type: "LAYOUT_REMOVE", id });
        return;
      }
      if (ev.key === "Escape") {
        dispatch({ type: "LAYOUT_SELECT", id: null });
        return;
      }
      let xM = el.xM;
      let yM = el.yM;
      if (ev.key === "ArrowLeft") xM -= step;
      if (ev.key === "ArrowRight") xM += step;
      if (ev.key === "ArrowUp") yM -= step;
      if (ev.key === "ArrowDown") yM += step;
      if (xM === el.xM && yM === el.yM) return;
      ev.preventDefault();
      xM = snapMeters(Math.max(0, Math.min(s.roomLayout.roomWidthM, xM)), step, s.roomLayout.snapEnabled);
      yM = snapMeters(Math.max(0, Math.min(s.roomLayout.roomHeightM, yM)), step, s.roomLayout.snapEnabled);
      dispatch({ type: "LAYOUT_MOVE", id, xM, yM });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);
}
