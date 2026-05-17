import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { parseItemChips } from "./AvailableItemsChips";

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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-800/40 py-2 text-sm last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-foreground">{value || "—"}</span>
    </div>
  );
}

export function PlanningSidebar(props: SummaryProps) {
  const [open, setOpen] = useState(true);
  const itemChips = parseItemChips(props.availableItems);

  return (
    <aside
      className={cn(
        "planning-snapshot-rail rounded-lg border border-slate-800/50 bg-card/40 p-4 backdrop-blur-md",
      )}
      aria-label="Plan snapshot"
    >
      <button
        type="button"
        className="mb-3 flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          <h2 className="text-sm font-semibold text-foreground">Your plan snapshot</h2>
          <p className="text-xs text-muted-foreground">Read-only summary — edits happen in the main form</p>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-1">
          <SummaryRow label="Players at once" value={props.playersConcurrent} />
          <SummaryRow label="Total participants" value={props.participantsTotal} />
          <SummaryRow label="Duration (min)" value={props.sessionDurationMinutes} />
          <SummaryRow label="Environment" value={props.environmentType} />
          <SummaryRow label="Event context" value={props.eventType || "—"} />
          <SummaryRow
            label="Props"
            value={itemChips.length ? itemChips.join(", ") : "None selected"}
          />
          <SummaryRow label="Difficulty" value={props.roomDifficulty} />
          <SummaryRow
            label="Environmental fit"
            value={props.themeMustMatchEnvironment ? "Enforced" : "Flexible"}
          />
          {props.youthAddOnEnabled ? <SummaryRow label="Junior track" value="Enabled" /> : null}
          <SummaryRow label="Theme" value={props.themeLabel} />
          <SummaryRow
            label="Main puzzles"
            value={`${props.mainPuzzleCount} generated (target ~${props.plannerTarget})`}
          />
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
