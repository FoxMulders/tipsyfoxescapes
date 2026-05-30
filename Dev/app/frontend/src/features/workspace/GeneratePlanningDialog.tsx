import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TargetInterfaceCard } from "@/features/planning/components/TargetInterfaceCard";
import { RoomConfigurationForm } from "@/features/planning/components/RoomConfigurationForm";
import { usePlanning } from "@/features/planning/context/PlanningProvider";

type GeneratePlanningDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  eventSuggestions: string[];
};

function GeneratePlanningForm({ eventSuggestions }: { eventSuggestions: string[] }) {
  const { state, dispatch } = usePlanning();
  return (
    <div className="space-y-4">
      <TargetInterfaceCard
        value={state.targetInterface}
        onChange={(v) => dispatch({ type: "SET_TARGET_INTERFACE", value: v })}
      />
      <RoomConfigurationForm eventSuggestions={eventSuggestions} primaryOnly />
    </div>
  );
}

/** Inline room-details gate — no modal overlay or scroll lock. */
export function GeneratePlanningDialog({ open, onOpenChange, onSubmit, eventSuggestions }: GeneratePlanningDialogProps) {
  if (!open) return null;

  return (
    <section
      className="compose-planning-gate glass-panel"
      role="region"
      aria-labelledby="compose-planning-gate-title"
      data-testid="compose-planning-gate"
    >
      <div className="compose-planning-gate__header">
        <div className="min-w-0 flex-1">
          <h2 id="compose-planning-gate-title" className="text-lg font-semibold leading-none tracking-tight">
            Room details
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Confirm players, duration, and environment before we generate your room.
          </p>
        </div>
        <button
          type="button"
          className="compose-planning-gate__close"
          onClick={() => onOpenChange(false)}
          aria-label="Close room details"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div id="room-details-blueprint-form" className="room-details-blueprint-form compose-planning-gate__form">
        <GeneratePlanningForm eventSuggestions={eventSuggestions} />
      </div>
      <div className="compose-planning-gate__footer">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onSubmit();
          }}
        >
          Save and generate
        </Button>
      </div>
    </section>
  );
}
