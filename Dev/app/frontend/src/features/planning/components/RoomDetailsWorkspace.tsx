import { lazy, Suspense, useId, useState } from "react";
import { RoomConfigurationPanel } from "./RoomConfigurationPanel";
import { StickyDashboard } from "./StickyDashboard";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { BuilderAccountStripProps } from "./BuilderAccountStrip";
import type { GenerationTelemetry } from "../domain/generationTelemetry";

const BlueprintWorkspace = lazy(() =>
  import("./BlueprintWorkspace").then((m) => ({ default: m.BlueprintWorkspace })),
);

type MobileRoomPanel = "setup" | "layout" | "plan";

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
  serverOpenAiConfigured?: boolean | null;
  browserAiReady?: boolean;
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
  serverOpenAiConfigured,
  browserAiReady,
  authName,
  authEmail,
  billingTierLabel,
  planStatusDetail,
  appView,
  showAdminTab,
  onAppViewChange,
  onSignOut,
}: RoomDetailsWorkspaceProps) {
  const isMobileCad = useMediaQuery("(max-width: 900px)");
  const [mobilePanel, setMobilePanel] = useState<MobileRoomPanel>("setup");
  const tabsId = useId();

  const blueprint = (
    <>
      {spatialFlowSummary ? (
        <p className="blueprint-flow-summary muted text-sm" role="note">
          <strong>Spatial flow:</strong> {spatialFlowSummary}
        </p>
      ) : null}
      <Suspense fallback={<p className="muted p-4 text-sm">Loading blueprint workspace…</p>}>
        <BlueprintWorkspace />
      </Suspense>
    </>
  );

  const dashboard = (
    <StickyDashboard
      className="room-builder-cad__dashboard"
      themeLabel={themeLabel}
      mainPuzzleCount={mainPuzzleCount}
      sessionSyncing={sessionSyncing}
      generationTelemetry={generationTelemetry}
      puzzlesGenerating={puzzlesGenerating}
      serverOpenAiConfigured={serverOpenAiConfigured}
      browserAiReady={browserAiReady}
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
  );

  return (
    <div className={`room-builder-cad flow-content flow-content--blueprint${isMobileCad ? " room-builder-cad--mobile" : ""}`}>
      {isMobileCad ? (
        <>
          <div className="room-mobile-tabs" role="tablist" aria-label="Room builder panels">
            {(
              [
                ["setup", "Room setup"],
                ["layout", "Floor plan"],
                ["plan", "Plan snapshot"],
              ] as const
            ).map(([panel, label]) => (
              <button
                key={panel}
                type="button"
                role="tab"
                id={`${tabsId}-${panel}`}
                aria-selected={mobilePanel === panel}
                aria-controls={`${tabsId}-${panel}-panel`}
                className={`room-mobile-tabs__btn${mobilePanel === panel ? " room-mobile-tabs__btn--active" : ""}`}
                onClick={() => setMobilePanel(panel)}
              >
                {label}
              </button>
            ))}
          </div>

          {mobilePanel === "setup" ? (
            <div
              id={`${tabsId}-setup-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-setup`}
              className="room-mobile-panel room-mobile-panel--setup"
            >
              <RoomConfigurationPanel
                eventSuggestions={eventSuggestions}
                itemHistory={itemHistory}
                onOpenInspiration={onOpenInspiration}
              />
            </div>
          ) : null}

          {mobilePanel === "layout" ? (
            <div
              id={`${tabsId}-layout-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-layout`}
              className="room-mobile-panel room-mobile-panel--layout"
            >
              {blueprint}
            </div>
          ) : null}

          {mobilePanel === "plan" ? (
            <div
              id={`${tabsId}-plan-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-plan`}
              className="room-mobile-panel room-mobile-panel--plan"
            >
              {dashboard}
            </div>
          ) : null}
        </>
      ) : (
        <div className="room-builder-cad__grid">
          <RoomConfigurationPanel
            eventSuggestions={eventSuggestions}
            itemHistory={itemHistory}
            onOpenInspiration={onOpenInspiration}
          />

          <div className="room-builder-cad__center">{blueprint}</div>

          {dashboard}
        </div>
      )}

      <div className="room-builder-cad__cta setup-options" id="room-details-continue">
        <button type="button" className="primary-btn" onClick={onContinue}>
          Continue to theme selection
        </button>
      </div>
    </div>
  );
}
