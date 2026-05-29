import { TargetInterfaceCard } from "./TargetInterfaceCard";
import { RoomConfigurationForm } from "./RoomConfigurationForm";
import { PropManager } from "./PropManager";
import { AdvancedFeatureToggle } from "./AdvancedFeatureToggle";
import { usePlanning } from "../context/PlanningProvider";

type RoomConfigurationPanelProps = {
  eventSuggestions: string[];
  itemHistory: string[];
  onOpenInspiration: () => void;
};

export function RoomConfigurationPanel({
  eventSuggestions,
  itemHistory,
  onOpenInspiration,
}: RoomConfigurationPanelProps) {
  const { state, dispatch } = usePlanning();

  return (
    <aside className="room-config-panel glass-panel" aria-label="Room configuration">
      <header className="room-config-panel__header">
        <h2 className="room-details-title">Room configuration</h2>
        <p className="room-config-panel__lead muted text-sm">
          Players, duration, props, and target interface — synced with the blueprint.
        </p>
        <button
          type="button"
          className="secondary-btn inspiration-drawer-trigger w-full"
          onClick={onOpenInspiration}
          title="Opens curated prop ideas, theme sparks, and on-device AI inspiration for your space."
        >
          Get AI prop &amp; theme inspiration
        </button>
      </header>

      <div className="room-config-panel__body" id="room-details-blueprint-form">
        <div className="form-field-panel form-field-panel--primary">
          <TargetInterfaceCard
            value={state.targetInterface}
            onChange={(v) => dispatch({ type: "SET_TARGET_INTERFACE", value: v })}
          />
        </div>
        <RoomConfigurationForm eventSuggestions={eventSuggestions} />
        <PropManager itemHistory={itemHistory} />
        <AdvancedFeatureToggle />
      </div>
    </aside>
  );
}
