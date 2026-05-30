import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function GeneratePlanningDialog({ open, onOpenChange, onSubmit, eventSuggestions }: GeneratePlanningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Room details</DialogTitle>
          <DialogDescription>
            Confirm players, duration, and environment before we generate your room.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <GeneratePlanningForm eventSuggestions={eventSuggestions} />
        </div>
        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
