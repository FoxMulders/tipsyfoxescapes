import { lazy, Suspense } from "react";
import { RoomConfigurationPanel } from "./RoomConfigurationPanel";
import { StickyDashboard } from "./StickyDashboard";
import type { BuilderAccountStripProps } from "./BuilderAccountStrip";
import type { GenerationTelemetry } from "../domain/generationTelemetry";

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
  generationTelemetry?: GenerationTelemetry | null;
  puzzlesGenerating?: boolean;
  spatialFlowSummary?: string | null;
} & BuilderAccountStripProps;

export function RoomDetailsWorkspace({
  eventSuggestions,
  itemHistory,
  onContinue,
  onOpenInspiration,
  themeLabel,
  mainPuzzleCount,
  sessionSyncing,
  generationTelemetry,
  puzzlesGenerating,
  spatialFlowSummary,
  authName,
  authEmail,
  billingTierLabel,
  planStatusDetail,
  appView,
  showAdminTab,
  onAppViewChange,
  onSignOut,
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
          {spatialFlowSummary ? (
            <p className="blueprint-flow-summary muted text-sm" role="note">
              <strong>Spatial flow:</strong> {spatialFlowSummary}
            </p>
          ) : null}
          <Suspense fallback={<p className="muted p-4 text-sm">Loading blueprint workspace…</p>}>
            <BlueprintWorkspace />
          </Suspense>
        </div>

        <StickyDashboard
          className="room-builder-cad__dashboard"
          themeLabel={themeLabel}
          mainPuzzleCount={mainPuzzleCount}
          sessionSyncing={sessionSyncing}
          generationTelemetry={generationTelemetry}
          puzzlesGenerating={puzzlesGenerating}
          eventSuggestions={eventSuggestions}
          itemHistory={itemHistory}
          authName={authName}
          authEmail={authEmail}
          billingTierLabel={billingTierLabel}
          planStatusDetail={planStatusDetail}
          appView={appView}
          showAdminTab={showAdminTab}
          onAppViewChange={onAppViewChange}
          onSignOut={onSignOut}
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
