import { ChevronDown, Pencil } from "lucide-react";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { AvailableItemsChips, parseItemChips } from "@/components/planning/AvailableItemsChips";
import { EnvironmentSelect } from "@/components/planning/EnvironmentSelect";
import { FieldHint } from "@/components/planning/FieldHint";
import { cn } from "@/lib/utils";

type SummaryProps = {
  playersConcurrent: string;
  participantsTotal: string;
  sessionDurationMinutes: string;
  environmentType: string;
  eventType: string;
  availableItems: string;
  roomDifficulty: string;
  themeMustMatchEnvironment: boolean;
  youthAddOnEnabled: boolean;
  themeLabel: string;
  mainPuzzleCount: number;
  plannerTarget: number;
  sessionSyncing?: boolean;
};

type EditHandlers = {
  setPlayersConcurrent: (v: string) => void;
  setParticipantsTotal: (v: string) => void;
  setSessionDurationMinutes: (v: string) => void;
  setEnvironmentType: (v: string) => void;
  setEventType: (v: string) => void;
  setAvailableItems: (v: string) => void;
  setThemeMustMatchEnvironment: (v: boolean) => void;
  setRoomDifficulty: (v: "easy" | "medium" | "hard") => void;
  setYouthAddOnEnabled: (v: boolean) => void;
  setYouthAddOnGatesAdultFlow: (v: boolean) => void;
  setYouthAddOnAgeNote: (v: string) => void;
  youthAddOnGatesAdultFlow: boolean;
  youthAddOnAgeNote: string;
  validationFlags: Record<string, boolean>;
  clearValidation: (key: string) => void;
  commercialVenueContext: boolean;
  eventSuggestions: string[];
  itemHistory: string[];
  propPresetLabels: string[];
};

export type PlanningSidebarProps = SummaryProps & EditHandlers;

const inputClass =
  "flex h-9 w-full rounded-md border border-slate-800/50 bg-input/80 px-2.5 py-1.5 text-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-ring";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-800/40 py-2 text-sm last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-foreground">{value || "—"}</span>
    </div>
  );
}

function PlanningSidebarSummary(props: SummaryProps) {
  const itemChips = parseItemChips(props.availableItems);
  const envDisplay = props.environmentType.trim() || "—";

  return (
    <>
      <SummaryRow label="Players at once" value={props.playersConcurrent} />
      <SummaryRow label="Total participants" value={props.participantsTotal} />
      <SummaryRow label="Duration (min)" value={props.sessionDurationMinutes} />
      <SummaryRow label="Environment" value={envDisplay} />
      <SummaryRow label="Event context" value={props.eventType || "—"} />
      <SummaryRow label="Props" value={itemChips.length ? itemChips.join(", ") : "None selected"} />
      <SummaryRow label="Difficulty" value={props.roomDifficulty} />
      <SummaryRow label="Environmental fit" value={props.themeMustMatchEnvironment ? "Enforced" : "Flexible"} />
      {props.youthAddOnEnabled ? <SummaryRow label="Junior track" value="Enabled" /> : null}
      <SummaryRow label="Theme" value={props.themeLabel} />
      <SummaryRow
        label="Main puzzles"
        value={`${props.mainPuzzleCount} generated (target ~${props.plannerTarget})`}
      />
    </>
  );
}

function PlanningSidebarEdit(props: PlanningSidebarProps) {
  const invalid = (key: string) => Boolean(props.validationFlags[key]);

  return (
    <div className="space-y-3">
      <FieldHint label="Players at once" required invalid={invalid("playersConcurrent")}>
        <input
          className={cn(inputClass, invalid("playersConcurrent") && "border-destructive")}
          type="number"
          min={1}
          max={99}
          value={props.playersConcurrent}
          onChange={(e) => {
            props.setPlayersConcurrent(e.target.value);
            props.clearValidation("playersConcurrent");
          }}
        />
      </FieldHint>

      <FieldHint label="Total participants" required invalid={invalid("participantsTotal")}>
        <input
          className={cn(inputClass, invalid("participantsTotal") && "border-destructive")}
          type="number"
          min={1}
          max={99}
          value={props.participantsTotal}
          onChange={(e) => {
            props.setParticipantsTotal(e.target.value);
            props.clearValidation("participantsTotal");
          }}
        />
      </FieldHint>

      <FieldHint label="Duration (min)" required invalid={invalid("sessionDurationMinutes")}>
        <input
          className={cn(inputClass, invalid("sessionDurationMinutes") && "border-destructive")}
          type="number"
          min={10}
          max={180}
          step={5}
          value={props.sessionDurationMinutes}
          onChange={(e) => {
            props.setSessionDurationMinutes(e.target.value);
            props.clearValidation("sessionDurationMinutes");
          }}
        />
      </FieldHint>

      <FieldHint label="Environment" required invalid={invalid("environmentType")}>
        <EnvironmentSelect
          value={props.environmentType}
          invalid={invalid("environmentType")}
          onChange={(v) => {
            props.setEnvironmentType(v);
            props.clearValidation("environmentType");
          }}
          onEnvironmentCleared={() => props.setAvailableItems("")}
        />
      </FieldHint>

      <FieldHint label="Event context" htmlFor="sidebar-event-context">
        <input
          id="sidebar-event-context"
          className={inputClass}
          type="text"
          list="sidebar-event-type-suggestions"
          value={props.eventType}
          maxLength={200}
          onChange={(e) => props.setEventType(e.target.value)}
          placeholder="Optional"
        />
        <datalist id="sidebar-event-type-suggestions">
          {props.eventSuggestions.map((entry) => (
            <option key={entry} value={entry} />
          ))}
        </datalist>
        {props.commercialVenueContext ? (
          <p className="mt-1 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs" role="note">
            Commercial venue: treat generated ideas as raw material for original puzzles.
          </p>
        ) : null}
      </FieldHint>

      <FieldHint label="Props" invalid={invalid("availableItems")}>
        <AvailableItemsChips
          value={props.availableItems}
          presetLabels={props.propPresetLabels}
          historyOptions={props.itemHistory}
          disabled={!props.environmentType.trim()}
          invalid={invalid("availableItems")}
          onChange={(next) => {
            props.setAvailableItems(next);
            props.clearValidation("availableItems");
          }}
        />
      </FieldHint>

      <div className="flex items-start gap-2">
        <input
          id="sidebar-enforce-env-fit"
          type="checkbox"
          className="mt-1"
          checked={props.themeMustMatchEnvironment}
          onChange={(e) => props.setThemeMustMatchEnvironment(e.target.checked)}
        />
        <FieldHint label="Enforce environmental fit" htmlFor="sidebar-enforce-env-fit" />
      </div>

      <Accordion type="single" collapsible className="rounded-md border border-slate-800/50 bg-card/30 px-3 backdrop-blur-md">
        <AccordionItem value="advanced">
          <AccordionTrigger className="py-2 text-xs">Advanced</AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <FieldHint label="Difficulty">
              <select
                className={inputClass}
                value={props.roomDifficulty}
                onChange={(e) => props.setRoomDifficulty(e.target.value as "easy" | "medium" | "hard")}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </FieldHint>
            <label className="flex cursor-pointer items-start gap-2 text-xs">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={props.youthAddOnEnabled}
                onChange={(e) => {
                  const on = e.target.checked;
                  props.setYouthAddOnEnabled(on);
                  if (!on) {
                    props.setYouthAddOnGatesAdultFlow(false);
                    props.setYouthAddOnAgeNote("");
                  }
                }}
              />
              <span>Junior add-on track</span>
            </label>
            {props.youthAddOnEnabled ? <JuniorTrackOptions props={props} /> : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="space-y-1 border-t border-slate-800/40 pt-2">
        <SummaryRow label="Theme" value={props.themeLabel} />
        <SummaryRow
          label="Main puzzles"
          value={`${props.mainPuzzleCount} generated (target ~${props.plannerTarget})`}
        />
      </div>
    </div>
  );
}

function JuniorTrackOptions({ props }: { props: PlanningSidebarProps }) {
  return (
    <div className="space-y-2 pl-4">
      <label className="flex cursor-pointer items-start gap-2 text-xs">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={props.youthAddOnGatesAdultFlow}
          onChange={(e) => props.setYouthAddOnGatesAdultFlow(e.target.checked)}
        />
        <span>Junior puzzles may gate adult flow</span>
      </label>
      <FieldHint label="Junior notes">
        <input
          className={inputClass}
          type="text"
          value={props.youthAddOnAgeNote}
          maxLength={400}
          onChange={(e) => props.setYouthAddOnAgeNote(e.target.value)}
          placeholder="e.g. ages ~6–11"
        />
      </FieldHint>
    </div>
  );
}

export function PlanningSidebar(props: PlanningSidebarProps) {
  const [open, setOpen] = useState(true);
  const [editMode, setEditMode] = useState(false);

  return (
    <aside
      className={cn(
        "planning-snapshot-rail rounded-lg border border-slate-800/50 bg-card/40 p-4 backdrop-blur-md",
      )}
      aria-label="Plan snapshot"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="min-w-0 pr-2">
            <h2 className="text-sm font-semibold text-foreground">Your plan snapshot</h2>
            <p className="text-xs text-muted-foreground">
              {editMode ? "Editing — changes sync automatically" : "Read-only summary"}
            </p>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
        <Button
          type="button"
          variant={editMode ? "secondary" : "outline"}
          size="sm"
          className="shrink-0"
          onClick={() => {
            setEditMode((v) => !v);
            if (!open) setOpen(true);
          }}
          aria-pressed={editMode}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          {editMode ? "Done" : "Edit in sidebar"}
        </Button>
      </div>
      {open ? (
        <div className="space-y-1">
          {editMode ? <PlanningSidebarEdit {...props} /> : <PlanningSidebarSummary {...props} />}
          {props.sessionSyncing ? (
            <p className="pt-2 text-xs text-primary" role="status">
              Syncing to session…
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
