import { lazy, Suspense } from "react";
import { TargetInterfaceCard } from "./TargetInterfaceCard";
import { RoomConfigurationForm } from "./RoomConfigurationForm";
import { PropManager } from "./PropManager";
import { AdvancedFeatureToggle } from "./AdvancedFeatureToggle";
import { usePlanning } from "../context/PlanningProvider";

const LayoutDesigner = lazy(() =>
  import("../layout-designer/LayoutDesigner").then((m) => ({ default: m.LayoutDesigner })),
);

type RoomDetailsWorkspaceProps = {
  eventSuggestions: string[];
  itemHistory: string[];
  onContinue: () => void;
  onOpenInspiration: () => void;
};

export function RoomDetailsWorkspace({ eventSuggestions, itemHistory, onContinue, onOpenInspiration }: RoomDetailsWorkspaceProps) {
  const { state, dispatch } = usePlanning();

  return (
    <div className="flow-content flow-content--blueprint">
          <div className="room-details-form-card overflow-hidden rounded-xl">
            <header className="room-setup-command-bar" aria-label="Room details setup">
              <div className="room-setup-command-bar__primary">
                <h2 className="room-details-title">Room details</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-300/90">
                  Configure your space, headcount, and props. Progress is tracked in the mission map above.
                </p>
              </div>
              <div className="room-setup-command-bar__actions">
                <button
                  type="button"
                  className="secondary-btn inspiration-drawer-trigger self-stretch"
                  onClick={onOpenInspiration}
                  title="Opens curated prop ideas, theme sparks, and on-device AI inspiration for your space."
                >
                  Get AI prop &amp; theme inspiration
                </button>
              </div>
            </header>

            <div className="room-details-blueprint-form" id="room-details-blueprint-form">
              <div className="form-field-panel form-field-panel--primary">
                <TargetInterfaceCard
                  value={state.targetInterface}
                  onChange={(v) => dispatch({ type: "SET_TARGET_INTERFACE", value: v })}
                />
              </div>
              <RoomConfigurationForm eventSuggestions={eventSuggestions} />
              <PropManager itemHistory={itemHistory} />
              <AdvancedFeatureToggle />
              <Suspense fallback={<p className="muted p-4 text-sm">Loading layout designer…</p>}>
                <LayoutDesigner />
              </Suspense>
            </div>

            <div className="room-details-form-card__cta setup-options" id="room-details-continue">
              <button type="button" className="primary-btn" onClick={onContinue}>
                Continue to theme selection
              </button>
            </div>
          </div>
    </div>
  );
}
