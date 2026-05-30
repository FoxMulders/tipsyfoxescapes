import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function parseItemChips(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const k = t.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function itemKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const PROP_LABEL_BLOCKLIST =
  /\b(knives?|knife|blade|razor|machete|axe|chainsaw|firearm|gun|ammunition|bleach|ammonia|chlorine|torch\s*\(propane\)|blow-?torch)\b/i;

const UNSAFE_UTILITY_ITEM =
  /\b(real\s+)?(furnace|furnaces|hot[-\s]?water\s*(heater|heaters|tank|tanks)|water\s*heater|water\s*heaters|boiler|boilers|gas\s*line|propane\s*tank)\b/i;

export function isAllowedAvailableItemLabel(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (/^fake\s+/i.test(t)) return true;
  if (PROP_LABEL_BLOCKLIST.test(t)) return false;
  if (UNSAFE_UTILITY_ITEM.test(t) && !/^fake\s+/i.test(t)) return false;
  return true;
}

export function AvailableItemsChips({
  value,
  onChange,
  invalid,
  historyOptions,
  disabled,
  presetLabels,
}: {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  historyOptions: string[];
  disabled?: boolean;
  presetLabels: string[];
}) {
  const chips = useMemo(() => parseItemChips(value), [value]);
  const [customDraft, setCustomDraft] = useState("");
  const [customHint, setCustomHint] = useState("");

  const togglePreset = (label: string): void => {
    if (disabled) return;
    const k = itemKey(label);
    if (chips.some((c) => itemKey(c) === k)) {
      onChange(chips.filter((c) => itemKey(c) !== k).join(", "));
    } else {
      onChange([...chips, label].join(", "));
    }
  };

  const addCustom = (): void => {
    if (disabled) return;
    const t = customDraft.trim();
    if (!t) return;
    if (!isAllowedAvailableItemLabel(t)) {
      setCustomHint('Use safe props only. Prefix theatrical utilities with "Fake …".');
      return;
    }
    setCustomHint("");
    const k = itemKey(t);
    if (chips.some((c) => itemKey(c) === k)) {
      setCustomDraft("");
      return;
    }
    onChange([...chips, t].join(", "));
    setCustomDraft("");
  };

  const removeChip = (index: number): void => {
    if (disabled) return;
    onChange(chips.filter((_, j) => j !== index).join(", "));
  };

  return (
    <div
      className={cn(
        "form-field-panel space-y-3 rounded-md border border-white/12 p-4",
        invalid && "border-destructive/60",
        disabled && "opacity-60",
      )}
    >
      {disabled ? (
        <p className="text-sm text-muted-foreground">Choose Environment first to see prop suggestions for your space.</p>
      ) : presetLabels.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested props">
          {presetLabels.map((label) => {
            const selected = chips.some((c) => itemKey(c) === itemKey(label));
            return (
              <button
                key={label}
                type="button"
                disabled={disabled}
                onClick={() => togglePreset(label)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  selected
                    ? "border-primary/60 bg-primary/20 text-primary"
                    : "border-slate-800/50 bg-secondary/80 text-secondary-foreground hover:border-primary/40",
                )}
                aria-pressed={selected}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No preset list for this wording—add custom props below.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[12rem] flex-1 rounded-md border border-slate-800/50 bg-input/80 px-3 py-2 text-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-ring"
          type="text"
          list="items-history"
          value={customDraft}
          placeholder='Custom prop (e.g. "Fake boiler gauge board")'
          disabled={disabled}
          onChange={(e) => {
            setCustomDraft(e.target.value);
            setCustomHint("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-amber-400 hover:bg-amber-400/10"
              aria-label="Safety check for custom props"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            Safety Check: Real furnaces, gas lines, boilers, and utility elements are strictly prohibited. Please describe fake or
            theatrical props only.
          </TooltipContent>
        </Tooltip>
        <button
          type="button"
          className="rounded-md border border-slate-800/50 bg-secondary px-3 py-2 text-sm hover:bg-secondary/80"
          onClick={addCustom}
          disabled={disabled}
        >
          Add
        </button>
      </div>
      <datalist id="items-history">
        {historyOptions.map((entry) => (
          <option key={entry} value={entry} />
        ))}
      </datalist>
      {customHint ? <p className="text-sm text-destructive">{customHint}</p> : null}
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Selected props">
          {chips.map((chip, i) => (
            <span
              key={`${chip}-${i}`}
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs"
            >
              {chip}
              <button
                type="button"
                className="rounded-full px-1 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${chip}`}
                disabled={disabled}
                onClick={() => removeChip(i)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
