import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TargetInterfaceCard } from "@/features/planning/components/TargetInterfaceCard";
import { RoomConfigurationForm } from "@/features/planning/components/RoomConfigurationForm";
import { usePlanning } from "@/features/planning/context/PlanningProvider";

type ComposeRoomDetailsStepProps = {
  eventSuggestions: string[];
  onNext: () => Promise<boolean>;
  onValidationFailed: () => void;
  onTryValidate: () => boolean;
};

export function ComposeRoomDetailsStep({
  eventSuggestions,
  onNext,
  onValidationFailed,
  onTryValidate,
}: ComposeRoomDetailsStepProps) {
  const { state, dispatch } = usePlanning();
  const [saving, setSaving] = useState(false);

  const handleNext = async (): Promise<void> => {
    if (!onTryValidate()) {
      onValidationFailed();
      return;
    }
    setSaving(true);
    try {
      const saved = await onNext();
      if (!saved) onValidationFailed();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="compose-room-details glass-panel"
      role="region"
      aria-labelledby="compose-room-details-title"
      data-testid="compose-room-details"
    >
      <header className="compose-room-details__header">
        <h2 id="compose-room-details-title" className="m-0 text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Room details
        </h2>
        <p className="mt-2 text-sm text-slate-400 md:text-base">
          Set players, duration, and environment. We will suggest themes that fit your room once you continue.
        </p>
      </header>
      <div id="room-details-blueprint-form" className="room-details-blueprint-form compose-room-details__form">
        <div className="space-y-4">
          <TargetInterfaceCard
            value={state.targetInterface}
            onChange={(v) => dispatch({ type: "SET_TARGET_INTERFACE", value: v })}
          />
          <RoomConfigurationForm eventSuggestions={eventSuggestions} primaryOnly />
        </div>
      </div>
      <footer className="compose-room-details__footer">
        <Button type="button" size="lg" className="compose-room-details__next" disabled={saving} aria-busy={saving} onClick={() => void handleNext()}>
          {saving ? "Saving…" : "Next → Themes"}
        </Button>
      </footer>
    </section>
  );
}
