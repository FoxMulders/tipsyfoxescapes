import { useMemo } from "react";
import { usePlanning } from "../context/PlanningProvider";
import { buildLayoutPalette, type PaletteItem } from "./layoutScene";

export function LayoutAssetPalette({
  onPick,
  activeKind,
}: {
  onPick: (item: PaletteItem) => void;
  activeKind: string | null;
}) {
  const { state, propPresetLabels } = usePlanning();
  const items = useMemo(
    () =>
      buildLayoutPalette(
        state.targetInterface,
        state.environmentType,
        state.availableItems,
        propPresetLabels,
      ),
    [state.targetInterface, state.environmentType, state.availableItems, propPresetLabels],
  );
  const byCategory = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [items]);

  return (
    <aside className="layout-designer-palette" aria-label="Placeable room assets">
      {[...byCategory.entries()].map(([category, list]) => (
        <div key={category} className="layout-designer-palette__group">
          <h4 className="layout-designer-palette__heading">{category}</h4>
          <ul className="layout-designer-palette__list">
            {list.map((item) => (
              <li key={`${item.kind}-${item.label}`}>
                <button
                  type="button"
                  className={`layout-designer-palette__btn${activeKind === `${item.kind}:${item.label}` ? " layout-designer-palette__btn--active" : ""}`}
                  onClick={() => onPick(item)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
