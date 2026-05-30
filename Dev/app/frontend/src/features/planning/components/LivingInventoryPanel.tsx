import { useMemo, type ReactNode } from "react";
import { FieldHint } from "@/components/planning/FieldHint";
import { cn } from "@/lib/utils";
import type { InventoryItem, InventoryItemRole } from "../../../../../shared/inventory";
import {
  inventoryItemFromName,
  migrateAvailableItemsToInventory,
  newInventoryItemId,
} from "../../../../../shared/inventory";

const ROLE_LABELS: Record<InventoryItemRole, string> = {
  unassigned: "Unassigned",
  puzzle_carrier: "Puzzle prop",
  set_dressing: "Set dressing",
  red_herring: "Red herring",
};

type LivingInventoryPanelProps = {
  items: InventoryItem[];
  disabled?: boolean;
  invalid?: boolean;
  onChange: (items: InventoryItem[]) => void;
  presetLabels?: string[];
  historyOptions?: string[];
};

export function LivingInventoryPanel({
  items,
  disabled,
  invalid,
  onChange,
  presetLabels = [],
  historyOptions = [],
}: LivingInventoryPanelProps) {
  const useItems = items.filter((i) => i.status === "use");
  const excludeItems = items.filter((i) => i.status === "exclude");
  const suggestions = useMemo(() => {
    const seen = new Set(items.map((i) => i.name.toLowerCase()));
    return [...presetLabels, ...historyOptions].filter((s) => {
      const k = s.trim().toLowerCase();
      return k && !seen.has(k);
    });
  }, [items, presetLabels, historyOptions]);

  const addNamed = (name: string, status: "use" | "exclude" = "use") => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...items, inventoryItemFromName(trimmed, status)]);
  };

  const setRole = (id: string, role: InventoryItemRole) => {
    onChange(items.map((i) => (i.id === id ? { ...i, role } : i)));
  };

  const toggleStatus = (id: string, next: "use" | "exclude") => {
    onChange(items.map((i) => (i.id === id ? { ...i, status: next, role: next === "exclude" ? "unassigned" : i.role } : i)));
  };

  const removeItem = (id: string) => onChange(items.filter((i) => i.id !== id));

  const importLegacyChips = (raw: string) => {
    const migrated = migrateAvailableItemsToInventory(raw.split(",").map((s) => s.trim()).filter(Boolean));
    const merged = [...items];
    for (const m of migrated) {
      if (!merged.some((i) => i.name.toLowerCase() === m.name.toLowerCase())) {
        merged.push({ ...m, id: newInventoryItemId() });
      }
    }
    onChange(merged);
  };

  return (
    <div className="living-inventory">
      <p className="muted text-xs mb-2">
        Not everything in Use needs a puzzle — mark scenery as set dressing. Puzzle props and unassigned items can anchor beats.
      </p>
      <div className="living-inventory-columns">
        <InventoryColumn
          title="Use"
          emptyHint="Add props you plan to stage."
          disabled={disabled}
        >
          {useItems.map((item) => (
            <InventoryRow
              key={item.id}
              item={item}
              disabled={disabled}
              onRoleChange={(role) => setRole(item.id, role)}
              onMove={() => toggleStatus(item.id, "exclude")}
              moveLabel="Don't use"
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </InventoryColumn>
        <InventoryColumn title="Don't use" emptyHint="Excluded props won't anchor puzzles." disabled={disabled}>
          {excludeItems.map((item) => (
            <div key={item.id} className="living-inventory-row">
              <span className="living-inventory-name">{item.name}</span>
              <button type="button" className="secondary-btn text-xs" disabled={disabled} onClick={() => toggleStatus(item.id, "use")}>
                Move to Use
              </button>
            </div>
          ))}
        </InventoryColumn>
      </div>
      <div className="living-inventory-add mt-2 flex flex-wrap gap-2">
        <input
          type="text"
          className={cn("flex h-9 min-w-[10rem] flex-1 rounded-md border border-slate-600 bg-slate-900 px-2 text-sm", invalid && "border-destructive")}
          placeholder="Add custom prop…"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addNamed((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
        {suggestions.slice(0, 8).map((label) => (
          <button key={label} type="button" className="chip-btn" disabled={disabled} onClick={() => addNamed(label)}>
            + {label}
          </button>
        ))}
      </div>
      {items.length === 0 && historyOptions.length > 0 ? (
        <button type="button" className="secondary-btn mt-2 text-xs" disabled={disabled} onClick={() => importLegacyChips(historyOptions.join(", "))}>
          Import recent props
        </button>
      ) : null}
    </div>
  );
}

function InventoryColumn({
  title,
  emptyHint,
  disabled,
  children,
}: {
  title: string;
  emptyHint: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const childArray = Array.isArray(children) ? children : [children];
  const hasItems = childArray.some(Boolean);
  return (
    <div className="living-inventory-col glass-panel p-3">
      <h4 className="m-0 mb-2 text-sm font-semibold text-slate-100">{title}</h4>
      {!hasItems ? <p className="muted m-0 text-xs">{emptyHint}</p> : null}
      <div className="living-inventory-list flex flex-col gap-2">{children}</div>
    </div>
  );
}

function InventoryRow({
  item,
  disabled,
  onRoleChange,
  onMove,
  moveLabel,
  onRemove,
}: {
  item: InventoryItem;
  disabled?: boolean;
  onRoleChange: (role: InventoryItemRole) => void;
  onMove: () => void;
  moveLabel: string;
  onRemove: () => void;
}) {
  return (
    <div className="living-inventory-row flex flex-col gap-1 rounded border border-white/10 bg-slate-900/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="living-inventory-name text-sm font-medium text-slate-50">{item.name}</span>
        <div className="flex gap-1">
          <button type="button" className="secondary-btn text-xs" disabled={disabled} onClick={onMove}>
            {moveLabel}
          </button>
          <button type="button" className="puzzle-window-close text-xs" disabled={disabled} aria-label={`Remove ${item.name}`} onClick={onRemove}>
            ×
          </button>
        </div>
      </div>
      <select
        className="h-8 rounded border border-slate-600 bg-slate-950 px-2 text-xs text-slate-100"
        value={item.role}
        disabled={disabled}
        onChange={(e) => onRoleChange(e.target.value as InventoryItemRole)}
      >
        {(Object.keys(ROLE_LABELS) as InventoryItemRole[]).map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RoomConstraintsFields({
  designConstraints,
  noGoItems,
  techLevel,
  disabled,
  onDesignConstraintsChange,
  onNoGoItemsChange,
  onTechLevelChange,
}: {
  designConstraints: string;
  noGoItems: string;
  techLevel: "" | "low_tech" | "mixed" | "maker_heavy";
  disabled?: boolean;
  onDesignConstraintsChange: (v: string) => void;
  onNoGoItemsChange: (v: string) => void;
  onTechLevelChange: (v: "" | "low_tech" | "mixed" | "maker_heavy") => void;
}) {
  const selectClass =
    "flex h-10 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-ring";
  const textareaClass =
    "flex min-h-[5rem] w-full resize-y rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm leading-relaxed text-slate-50 focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="form-field-panel space-y-3">
      <FieldHint
        label="Room constraints"
        tooltip="Brief the generator: era, materials, tone. Example: Victorian study, brass and paper only, no visible plastic."
      >
        <textarea
          className={textareaClass}
          value={designConstraints}
          rows={3}
          maxLength={1200}
          disabled={disabled}
          placeholder="Victorian curator study — tactile analog props, brass and paper, no RFID…"
          onChange={(e) => onDesignConstraintsChange(e.target.value)}
        />
      </FieldHint>
      <FieldHint label="Hard exclusions" tooltip="Comma-separated items or mechanisms to never use (maglocks, TV screens, etc.).">
        <input
          type="text"
          className={selectClass}
          value={noGoItems}
          disabled={disabled}
          placeholder="maglocks, RFID, TV screens"
          onChange={(e) => onNoGoItemsChange(e.target.value)}
        />
      </FieldHint>
      <FieldHint label="Tech level">
        <select
          className={selectClass}
          value={techLevel}
          disabled={disabled}
          onChange={(e) => onTechLevelChange(e.target.value as "" | "low_tech" | "mixed" | "maker_heavy")}
        >
          <option value="">Default (mixed)</option>
          <option value="low_tech">Low tech (paper &amp; props)</option>
          <option value="mixed">Mixed</option>
          <option value="maker_heavy">Maker heavy (more electronics)</option>
        </select>
      </FieldHint>
    </div>
  );
}
