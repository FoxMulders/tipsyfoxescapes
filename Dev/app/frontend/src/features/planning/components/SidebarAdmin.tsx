import { PlanningSidebar, type PlanningSidebarProps } from "@/components/planning/PlanningSidebar";
import { usePlanning } from "../context/PlanningProvider";
import { CouncilTelemetryPanel } from "./GenerationTelemetryPanel";
import type { GenerationTelemetry } from "../domain/generationTelemetry";

export type SidebarAdminProps = Omit<
  PlanningSidebarProps,
  | "playersConcurrent"
  | "participantsTotal"
  | "sessionDurationMinutes"
  | "environmentType"
  | "eventType"
  | "availableItems"
  | "roomDifficulty"
  | "themeMustMatchEnvironment"
  | "venueBuildType"
  | "youthAddOnEnabled"
  | "youthAddOnGatesAdultFlow"
  | "youthAddOnAgeNote"
  | "validationFlags"
  | "setPlayersConcurrent"
  | "setParticipantsTotal"
  | "setSessionDurationMinutes"
  | "setEnvironmentType"
  | "setEventType"
  | "setAvailableItems"
  | "setThemeMustMatchEnvironment"
  | "setVenueBuildType"
  | "setRoomDifficulty"
  | "setYouthAddOnEnabled"
  | "setYouthAddOnGatesAdultFlow"
  | "setYouthAddOnAgeNote"
  | "clearValidation"
  | "commercialVenueContext"
  | "propPresetLabels"
  | "plannerTarget"
> & {
  className?: string;
  generationTelemetry?: GenerationTelemetry | null;
  puzzlesGenerating?: boolean;
};

export function SidebarAdmin(props: SidebarAdminProps) {
  const { state, dispatch, propPresetLabels, commercialVenueContext, placedPuzzleNodeCount, plannerMainPuzzleTarget, clearValidation } =
    usePlanning();

  const { className, generationTelemetry, puzzlesGenerating, ...sidebarProps } = props;

  return (
    <div className={`sidebar-admin planning-snapshot-rail ${className ?? ""}`} aria-label="Plan and account overview">
      <CouncilTelemetryPanel
        loading={puzzlesGenerating}
        telemetry={generationTelemetry ?? null}
        compact
      />
      <header className="sticky-dashboard__snapshot-head">
        <h3 className="planning-snapshot-rail-title">Plan snapshot</h3>
        <div className="sidebar-admin__placed-count sticky-dashboard__telemetry" role="status">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Blueprint nodes</span>
          <strong className="text-lg tabular-nums text-foreground">{placedPuzzleNodeCount}</strong>
          <span className="muted text-xs">/ ~{plannerMainPuzzleTarget} target</span>
        </div>
      </header>
      <PlanningSidebar
        {...sidebarProps}
        playersConcurrent={state.playersConcurrent}
        participantsTotal={state.participantsTotal}
        sessionDurationMinutes={state.sessionDurationMinutes}
        environmentType={state.environmentType}
        eventType={state.eventType}
        availableItems={state.availableItems}
        roomDifficulty={state.roomDifficulty}
        themeMustMatchEnvironment={state.themeMustMatchEnvironment}
        venueBuildType={state.venueBuildType}
        youthAddOnEnabled={state.youthAddOnEnabled}
        youthAddOnGatesAdultFlow={state.youthAddOnGatesAdultFlow}
        youthAddOnAgeNote={state.youthAddOnAgeNote}
        validationFlags={state.validationFlags}
        setPlayersConcurrent={(v) => dispatch({ type: "SET_PLAYERS_CONCURRENT", value: v })}
        setParticipantsTotal={(v) => dispatch({ type: "SET_PARTICIPANTS_TOTAL", value: v })}
        setSessionDurationMinutes={(v) => dispatch({ type: "SET_SESSION_DURATION", value: v })}
        setEnvironmentType={(v) => dispatch({ type: "SET_ENVIRONMENT", value: v })}
        setEventType={(v) => dispatch({ type: "SET_EVENT_TYPE", value: v })}
        setAvailableItems={(v) => dispatch({ type: "SET_AVAILABLE_ITEMS", value: v })}
        setThemeMustMatchEnvironment={(v) => dispatch({ type: "SET_THEME_MUST_MATCH_ENV", value: v })}
        setVenueBuildType={(v) => dispatch({ type: "SET_VENUE_BUILD_TYPE", value: v })}
        setRoomDifficulty={(v) => dispatch({ type: "SET_ROOM_DIFFICULTY", value: v })}
        setYouthAddOnEnabled={(enabled) => dispatch({ type: "SET_YOUTH_ADD_ON", enabled })}
        setYouthAddOnGatesAdultFlow={(v) => dispatch({ type: "SET_YOUTH_GATES_ADULT", value: v })}
        setYouthAddOnAgeNote={(v) => dispatch({ type: "SET_YOUTH_AGE_NOTE", value: v })}
        clearValidation={clearValidation}
        commercialVenueContext={commercialVenueContext}
        propPresetLabels={propPresetLabels}
        plannerTarget={plannerMainPuzzleTarget}
      />
    </div>
  );
}
