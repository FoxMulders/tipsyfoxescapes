import { useState } from "react";
import { usePlanning } from "../context/PlanningProvider";
import { LayoutCanvas } from "../layout-designer/LayoutCanvas";
import { LayoutA11yMirror } from "../layout-designer/LayoutA11yMirror";
import { BlueprintToolbar } from "../layout-designer/BlueprintToolbar";
import { layoutHasOnlyPresetShell } from "../layout-designer/roomSkeletonLayout";
import {
  dockItemToPalette,
  nextAutoPuzzlePosition,
  nextPuzzleNodeLabel,
  BLUEPRINT_DOCK_ITEMS,
} from "../layout-designer/blueprintShell";
import { snapMeters } from "../layout-designer/layoutScene";
import type { PaletteItem } from "../layout-designer/layoutScene";

const layoutDesignerEnabled = import.meta.env.VITE_LAYOUT_DESIGNER !== "0";

export function BlueprintWorkspace() {
  const { state, dispatch, placedPuzzleNodeCount, plannerMainPuzzleTarget, livePuzzleEstimate } = usePlanning();
  const [pendingItem, setPendingItem] = useState<PaletteItem | null>(null);
  const [showGridLayer, setShowGridLayer] = useState(true); // UI affordance; snap tied to reducer
  const activeKey = pendingItem ? `${pendingItem.kind}:${pendingItem.label}` : null;
  const hasSkeletonZones = state.roomLayout.elements.some(
    (e) => e.id.startsWith("skel_") || Boolean(e.meta?.skeletonZoneId),
  );
  const shellPresetOnly = layoutHasOnlyPresetShell(state.roomLayout);

  const pick = (item: PaletteItem) => {
    setPendingItem(item);
    dispatch({ type: "LAYOUT_ANNOUNCE", message: `Selected ${item.label}. Click the blueprint to place.` });
  };

  const addPuzzleNode = () => {
    const label = nextPuzzleNodeLabel(state.roomLayout.elements);
    const pos = nextAutoPuzzlePosition(state.roomLayout);
    const xM = snapMeters(pos.xM, state.roomLayout.snapM, state.roomLayout.snapEnabled);
    const yM = snapMeters(pos.yM, state.roomLayout.snapM, state.roomLayout.snapEnabled);
    dispatch({
      type: "LAYOUT_PLACE",
      element: { kind: "puzzle_node", label, xM, yM },
    });
  };

  const removeLastPuzzleNode = () => {
    const nodes = state.roomLayout.elements.filter((e) => e.kind === "puzzle_node");
    const last = nodes[nodes.length - 1];
    if (last) dispatch({ type: "LAYOUT_REMOVE", id: last.id });
  };

  if (!layoutDesignerEnabled) {
    return (
      <section className="blueprint-workspace blueprint-workspace--disabled glass-panel">
        <p className="muted text-sm p-4">Blueprint designer is disabled in this build.</p>
      </section>
    );
  }

  return (
    <section className="blueprint-workspace glass-panel" aria-labelledby="blueprint-workspace-title">
      <header className="blueprint-workspace__header">
        <div>
          <h2 id="blueprint-workspace-title" className="blueprint-workspace__title">
            Interior Plan &amp; Blueprint View
          </h2>
          <p className="blueprint-workspace__lead muted text-sm">
            Isometric CAD grid · 0.5m snap · drag zones and puzzle nodes
          </p>
          {hasSkeletonZones ? (
            <span className="blueprint-layout-mode blueprint-layout-mode--skeleton">Flow zones plotted</span>
          ) : shellPresetOnly ? (
            <span className="blueprint-layout-mode blueprint-layout-mode--shell">Architectural shell</span>
          ) : null}
        </div>
      </header>

      <div className="blueprint-workspace__stage">
        <div className="blueprint-workspace__hud blueprint-workspace__hud--tl">
          <button
            type="button"
            className="blueprint-hud-btn"
            aria-pressed={showGridLayer}
            title="Toggle snap grid"
            onClick={() => {
              const next = !showGridLayer;
              setShowGridLayer(next);
              dispatch({ type: "LAYOUT_TOGGLE_SNAP", enabled: next });
            }}
          >
            <span aria-hidden>⊞</span> Layer / snap
          </button>
        </div>

        <div className="blueprint-workspace__hud blueprint-workspace__hud--tr">
          <div className="blueprint-puzzle-stepper" role="group" aria-label="Puzzle nodes on blueprint">
            <span className="blueprint-puzzle-stepper__label">Puzzle nodes</span>
            <button
              type="button"
              className="blueprint-hud-btn blueprint-hud-btn--icon"
              aria-label="Remove last puzzle node"
              disabled={placedPuzzleNodeCount === 0}
              onClick={removeLastPuzzleNode}
            >
              −
            </button>
            <output className="blueprint-puzzle-stepper__value" aria-live="polite">
              {placedPuzzleNodeCount}
              <span className="blueprint-puzzle-stepper__target"> / ~{plannerMainPuzzleTarget}</span>
            </output>
            <button
              type="button"
              className="blueprint-hud-btn blueprint-hud-btn--icon"
              aria-label="Add puzzle node"
              onClick={addPuzzleNode}
            >
              +
            </button>
          </div>
          <p className="blueprint-puzzle-stepper__hint muted text-xs">
            Live estimate ~{livePuzzleEstimate} from headcount &amp; duration
          </p>
        </div>

        <LayoutCanvas pendingItem={pendingItem} />

        <BlueprintToolbar
          activeKey={activeKey}
          onPick={(item) => {
            if (item.kind === "puzzle_node") {
              pick({ ...item, label: nextPuzzleNodeLabel(state.roomLayout.elements) });
            } else {
              pick(item);
            }
          }}
        />
      </div>

      <LayoutA11yMirror layout={state.roomLayout} announcement={state.layoutA11yAnnouncement} />

      <div className="blueprint-workspace__quick-place sr-only-focusable">
        {BLUEPRINT_DOCK_ITEMS.map((d) => (
          <button key={d.kind} type="button" onClick={() => pick(dockItemToPalette(d))}>
            {d.shortLabel}
          </button>
        ))}
      </div>
    </section>
  );
}
