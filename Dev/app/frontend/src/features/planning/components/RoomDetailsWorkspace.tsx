import { lazy, Suspense } from "react";
import { RoomConfigurationPanel } from "./RoomConfigurationPanel";
import { StickyDashboard } from "./StickyDashboard";

const BlueprintWorkspace = lazy(() =>
  import("./BlueprintWorkspace").then((m) => ({ default: m.BlueprintWorkspace })),
);

type RoomDetailsWorkspaceProps = {
  eventSuggestions: string[];
  itemHistory: string[];
  onContinue: () => void;
  onOpenInspiration: () => void;
  themeLabel: string;
  mainPuzzleCount: number;
  sessionSyncing?: boolean;
};

export function RoomDetailsWorkspace({
  eventSuggestions,
  itemHistory,
  onContinue,
  onOpenInspiration,
  themeLabel,
  mainPuzzleCount,
  sessionSyncing,
}: RoomDetailsWorkspaceProps) {
  return (
    <div className="room-builder-cad flow-content flow-content--blueprint">
      <div className="room-builder-cad__grid">
        <RoomConfigurationPanel
          eventSuggestions={eventSuggestions}
          itemHistory={itemHistory}
          onOpenInspiration={onOpenInspiration}
        />

        <div className="room-builder-cad__center">
          <Suspense fallback={<p className="muted p-4 text-sm">Loading blueprint workspace…</p>}>
            <BlueprintWorkspace />
          </Suspense>
        </div>

        <StickyDashboard
          className="room-builder-cad__dashboard"
          themeLabel={themeLabel}
          mainPuzzleCount={mainPuzzleCount}
          sessionSyncing={sessionSyncing}
          eventSuggestions={eventSuggestions}
          itemHistory={itemHistory}
        />
      </div>

      <div className="room-builder-cad__cta setup-options" id="room-details-continue">
        <button type="button" className="primary-btn" onClick={onContinue}>
          Continue to theme selection
        </button>
      </div>
    </div>
  );
}
