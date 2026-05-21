import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const HOME_ENVIRONMENT_PRESETS = [
  "Living room",
  "Family room / rec room",
  "Garage",
  "Basement",
  "Backyard",
  "Home office",
] as const;

export const ENVIRONMENT_PRESETS = [
  ...HOME_ENVIRONMENT_PRESETS,
  "Kitchen",
  "Dining room",
  "Office / study",
  "Classroom",
  "Conference room",
  "Retail / pop-up space",
  "Indoor party venue",
  "Warehouse / studio",
] as const;

export type EnvironmentPresetScope = "home" | "all";

const CUSTOM_VALUE = "__custom_environment__";

function itemKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function EnvironmentSelect({
  value,
  onChange,
  invalid,
  id,
  onEnvironmentCleared,
  presetScope = "all",
}: {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  id?: string;
  onEnvironmentCleared?: () => void;
  presetScope?: EnvironmentPresetScope;
}) {
  const presets = presetScope === "home" ? HOME_ENVIRONMENT_PRESETS : ENVIRONMENT_PRESETS;
  const matchedPreset = useMemo(
    () => presets.find((p) => itemKey(p) === itemKey(value)),
    [value, presets],
  );
  const selectValue = matchedPreset ?? (value.trim() ? CUSTOM_VALUE : "");
  const [customOpen, setCustomOpen] = useState(selectValue === CUSTOM_VALUE);

  return (
    <div className="space-y-2">
      <Select
        value={selectValue || undefined}
        onValueChange={(next) => {
          if (next === CUSTOM_VALUE) {
            setCustomOpen(true);
            if (matchedPreset) onChange("");
            return;
          }
          setCustomOpen(false);
          if (!next) {
            onChange("");
            onEnvironmentCleared?.();
          } else {
            onChange(next);
          }
        }}
      >
        <SelectTrigger id={id} className={cn(invalid && "border-destructive ring-destructive/40")} aria-invalid={invalid}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((entry) => (
            <SelectItem key={entry} value={entry}>
              {entry}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CUSTOM_VALUE}>Custom location…</SelectItem>
        </SelectContent>
      </Select>
      {(customOpen || selectValue === CUSTOM_VALUE) && !matchedPreset ? (
        <input
          className={cn(
            "flex h-10 w-full rounded-md border border-slate-800/50 bg-input/80 px-3 py-2 text-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-ring",
            invalid && "border-destructive",
          )}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Custom environment description"
        />
      ) : null}
    </div>
  );
}
