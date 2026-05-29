import { useState } from "react";
import { usePlanning } from "../context/PlanningProvider";
import { LayoutAssetPalette } from "./LayoutAssetPalette";
import { LayoutCanvas } from "./LayoutCanvas";
import { LayoutA11yMirror } from "./LayoutA11yMirror";
import type { PaletteItem } from "./layoutScene";

const layoutDesignerEnabled = import.meta.env.VITE_LAYOUT_DESIGNER !== "0";

export function LayoutDesigner() {
  const { state, dispatch } = usePlanning();
  const [pendingItem, setPendingItem] = useState<PaletteItem | null>(null);
  const activeKey = pendingItem ? `${pendingItem.kind}:${pendingItem.label}` : null;

  if (!layoutDesignerEnabled) return null;

  return (
    <section className="layout-designer" aria-labelledby="layout-designer-title">
      <div className="layout-designer__header">
        <h3 id="layout-designer-title" className="room-details-title">
          Room layout designer
        </h3>
        <p className="muted text-sm">
          Place walls, doors, puzzle nodes, and props on a snap grid. Changes sync with your prop list and plan snapshot.
        </p>
        <a href="#room-details-continue" className="layout-designer-skip-link">
          Skip layout designer
        </a>
        <label className="layout-designer-snap-toggle">
          <input
            type="checkbox"
            checked={state.roomLayout.snapEnabled}
            onChange={(e) => dispatch({ type: "LAYOUT_TOGGLE_SNAP", enabled: e.target.checked })}
          />
          Snap to 0.5m grid
        </label>
      </div>
      <div className="layout-designer__body">
        <LayoutAssetPalette
          activeKind={activeKey}
          onPick={(item) => {
            setPendingItem(item);
            dispatch({ type: "LAYOUT_ANNOUNCE", message: `Selected ${item.label}. Click the canvas to place.` });
          }}
        />
        <LayoutCanvas pendingItem={pendingItem} />
      </div>
      <LayoutA11yMirror layout={state.roomLayout} announcement={state.layoutA11yAnnouncement} />
    </section>
  );
}
