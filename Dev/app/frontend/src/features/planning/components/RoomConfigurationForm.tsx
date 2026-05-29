import { Input } from "@/components/ui/input";
import { EnvironmentSelect } from "@/components/planning/EnvironmentSelect";
import { FieldHint } from "@/components/planning/FieldHint";
import { NumberCounter } from "@/components/planning/NumberCounter";
import { VenueBuildTypeField } from "@/components/planning/VenueBuildTypeField";
import { cn } from "@/lib/utils";
import { usePlanning } from "../context/PlanningProvider";
import { DynamicEstimator } from "./DynamicEstimator";

const selectClass =
  "flex h-10 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-ring";

const textareaClass =
  "flex min-h-[7.5rem] w-full resize-y rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm leading-relaxed text-slate-50 focus:outline-none focus:ring-2 focus:ring-ring";

type RoomConfigurationFormProps = {
  eventSuggestions: string[];
};

export function RoomConfigurationForm({ eventSuggestions }: RoomConfigurationFormProps) {
  const { state, dispatch, clearValidation, maxConcurrent, plannerMainPuzzleTarget, juniorAddOnPuzzleSlots, estimatePulseKey } =
    usePlanning();
  const invalid = (key: string) => Boolean(state.validationFlags[key]);
  const isCommercial = state.targetInterface === "commercial_venue";

  return (
    <>
      {isCommercial ? (
        <>
          <div className="form-field-panel">
            <VenueBuildTypeField
              value={state.venueBuildType}
              onChange={(v) => dispatch({ type: "SET_VENUE_BUILD_TYPE", value: v })}
              environmentType={state.environmentType}
            />
          </div>
          <div className="form-field-panel">
            <FieldHint
              label="Describe your facility layout or architectural shell"
              required
              invalid={invalid("environmentType")}
              tooltip="Retail venues are fully custom—describe zones, door positions, GM sightlines, and any fixed infrastructure."
              htmlFor="facility-layout-input"
            >
              <textarea
                id="facility-layout-input"
                className={cn(textareaClass, invalid("environmentType") && "border-destructive ring-destructive/40")}
                value={state.environmentType}
                rows={5}
                maxLength={800}
                placeholder="Example: 4-zone linear flow — briefing airlock, main gallery, tech pit, finale airlock…"
                aria-invalid={invalid("environmentType")}
                onChange={(e) => {
                  dispatch({ type: "SET_ENVIRONMENT", value: e.target.value });
                  clearValidation("environmentType");
                }}
              />
            </FieldHint>
          </div>
        </>
      ) : (
        <div className="form-field-panel">
          <FieldHint label="Environment" required invalid={invalid("environmentType")} tooltip="Residential play spaces only.">
            <EnvironmentSelect
              presetScope="home"
              value={state.environmentType}
              invalid={invalid("environmentType")}
              onChange={(v) => {
                dispatch({ type: "SET_ENVIRONMENT", value: v });
                clearValidation("environmentType");
              }}
              onEnvironmentCleared={() => dispatch({ type: "SET_ENVIRONMENT", value: "", clearItems: true })}
            />
          </FieldHint>
        </div>
      )}

      {invalid("headcountOrder") ? (
        <p className="error-banner room-validation-banner" role="alert">
          Players at one time cannot exceed total participants. Raise total guests or lower concurrent players.
        </p>
      ) : null}

      <div className="form-field-panel room-details-metrics-row">
        <FieldHint label="Players at one time" required invalid={invalid("playersConcurrent")}>
          <NumberCounter
            value={state.playersConcurrent}
            onChange={(v) => dispatch({ type: "SET_PLAYERS_CONCURRENT", value: v })}
            min={1}
            max={maxConcurrent}
            invalid={invalid("playersConcurrent")}
            aria-label="Players at one time"
          />
        </FieldHint>
        <FieldHint label="Total participants" required invalid={invalid("participantsTotal")}>
          <NumberCounter
            value={state.participantsTotal}
            onChange={(v) => dispatch({ type: "SET_PARTICIPANTS_TOTAL", value: v })}
            min={1}
            max={99}
            invalid={invalid("participantsTotal")}
            aria-label="Total participants"
          />
        </FieldHint>
      </div>

      <div className="form-field-panel room-details-duration-row">
        <FieldHint label="Session duration (minutes)" required invalid={invalid("sessionDurationMinutes")}>
          <NumberCounter
            value={state.sessionDurationMinutes}
            onChange={(v) => {
              dispatch({ type: "SET_SESSION_DURATION", value: v });
              clearValidation("sessionDurationMinutes");
            }}
            min={10}
            max={180}
            step={5}
            invalid={invalid("sessionDurationMinutes")}
            aria-label="Session duration in minutes"
          />
        </FieldHint>
        <DynamicEstimator target={plannerMainPuzzleTarget} juniorAddOnSlots={juniorAddOnPuzzleSlots} pulseKey={estimatePulseKey} />
      </div>

      {!isCommercial ? (
        <div className="form-field-panel">
          <FieldHint label="Event context" htmlFor="event-context-input" tooltip="e.g., Halloween party, corporate team building.">
            <Input
              id="event-context-input"
              type="text"
              list="event-type-suggestions"
              className="border-slate-700/60 bg-slate-900/90 text-slate-50"
              value={state.eventType}
              maxLength={200}
              onChange={(e) => dispatch({ type: "SET_EVENT_TYPE", value: e.target.value })}
            />
            <datalist id="event-type-suggestions">
              {eventSuggestions.map((entry) => (
                <option key={entry} value={entry} />
              ))}
            </datalist>
          </FieldHint>
        </div>
      ) : null}

      <div className="form-field-panel">
        <FieldHint label="Puzzle difficulty" tooltip="Sets how challenging the generated puzzles will be.">
          <select
            className={selectClass}
            value={state.roomDifficulty}
            onChange={(e) => dispatch({ type: "SET_ROOM_DIFFICULTY", value: e.target.value as "easy" | "medium" | "hard" })}
            aria-label="Room puzzle difficulty"
          >
            <option value="easy">Easy — family-friendly, accessible to all ages</option>
            <option value="medium">Medium — suited to most adults</option>
            <option value="hard">Hard — experienced players, complex logic</option>
          </select>
        </FieldHint>
      </div>
    </>
  );
}
