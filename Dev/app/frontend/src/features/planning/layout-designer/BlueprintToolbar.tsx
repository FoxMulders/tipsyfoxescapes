import type { BlueprintDockItem } from "./blueprintShell";
import { BLUEPRINT_DOCK_ITEMS } from "./blueprintShell";
import type { PaletteItem } from "./layoutScene";

export function BlueprintToolbar({
  activeKey,
  onPick,
}: {
  activeKey: string | null;
  onPick: (item: PaletteItem) => void;
}) {
  return (
    <div className="blueprint-toolbar-dock" role="toolbar" aria-label="Placeable blueprint assets">
      {BLUEPRINT_DOCK_ITEMS.map((item: BlueprintDockItem) => {
        const key = `${item.kind}:${item.label}`;
        return (
          <button
            key={key}
            type="button"
            className={`blueprint-toolbar-dock__btn${activeKey === key ? " blueprint-toolbar-dock__btn--active" : ""}`}
            aria-pressed={activeKey === key}
            title={`Place ${item.shortLabel}`}
            onClick={() => onPick({ kind: item.kind, label: item.label, category: "Blueprint" })}
          >
            <span className="blueprint-toolbar-dock__icon" aria-hidden>
              {item.icon}
            </span>
            <span className="blueprint-toolbar-dock__label">{item.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
