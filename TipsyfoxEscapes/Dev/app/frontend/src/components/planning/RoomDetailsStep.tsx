import type { ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AvailableItemsChips } from "@/components/planning/AvailableItemsChips";
import { EnvironmentSelect } from "@/components/planning/EnvironmentSelect";
import { FieldHint } from "@/components/planning/FieldHint";

type RoomDetailsStepProps = {
  playersConcurrent: string;
  setPlayersConcurrent: (v: string) => void;
  participantsTotal: string;
  setParticipantsTotal: (v: string) => void;
  sessionDurationMinutes: string;
  setSessionDurationMinutes: (v: string) => void;
  eventType: string;
  setEventType: (v: string) => void;
  environmentType: string;
  setEnvironmentType: (v: string) => void;
  availableItems: string;
  setAvailableItems: (v: string) => void;
  themeMustMatchEnvironment: boolean;
  setThemeMustMatchEnvironment: (v: boolean) => void;
  roomDifficulty: "easy" | "medium" | "hard";
  setRoomDifficulty: (v: "easy" | "medium" | "hard") => void;
  youthAddOnEnabled: boolean;
  setYouthAddOnEnabled: (v: boolean) => void;
  youthAddOnGatesAdultFlow: boolean;
  setYouthAddOnGatesAdultFlow: (v: boolean) => void;
  youthAddOnAgeNote: string;
  setYouthAddOnAgeNote: (v: string) => void;
  validationFlags: Record<string, boolean>;
  clearValidation: (key: string) => void;
  commercialVenueContext: boolean;
  eventSuggestions: string[];
  itemHistory: string[];
  propPresetLabels: string[];
  puzzleEstimateHud: ReactNode;
  onContinue: () => void;
  onOpenInspiration: () => void;
};

function RequiredMark() {
  return (
    <span className="text-destructive ml-0.5" aria-hidden="true">
      *
    </span>
  );
}

const inputClass =
  "flex h-10 w-full rounded-md border border-slate-800/50 bg-input/80 px-3 py-2 text-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-ring";

export function RoomDetailsStep(props: RoomDetailsStepProps) {
  const invalid = (key: string) => Boolean(props.validationFlags[key]);

  return (
    <div className="flow-content flow-content--blueprint space-y-6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="room-details-title text-xl font-semibold">Room details</h2>
          <p className="muted mt-1 max-w-2xl text-sm">
            Who plays, how long, where, and optional props. Advanced difficulty and junior-track controls live below.
          </p>
        </div>
        <button type="button" className="secondary-btn inspiration-drawer-trigger shrink-0" onClick={props.onOpenInspiration}>
          Inspiration
        </button>
      </div>

      {props.puzzleEstimateHud}

      <div className="mx-auto max-w-xl space-y-6" id="room-details-blueprint-form">
        <FieldHint label="Players at one time" required invalid={invalid("playersConcurrent")}>
          <input
            className={`${inputClass} max-w-[8rem] ${invalid("playersConcurrent") ? "border-destructive" : ""}`}
            type="number"
            min={1}
            max={99}
            value={props.playersConcurrent}
            onChange={(e) => {
              props.setPlayersConcurrent(e.target.value);
              props.clearValidation("playersConcurrent");
            }}
          />
        </FieldHint>

        <FieldHint label="Total participants" required invalid={invalid("participantsTotal")}>
          <input
            className={`${inputClass} max-w-[8rem] ${invalid("participantsTotal") ? "border-destructive" : ""}`}
            type="number"
            min={1}
            max={99}
            value={props.participantsTotal}
            onChange={(e) => {
              props.setParticipantsTotal(e.target.value);
              props.clearValidation("participantsTotal");
            }}
          />
        </FieldHint>

        <FieldHint label="Session duration (minutes)" required invalid={invalid("sessionDurationMinutes")}>
          <input
            className={`${inputClass} max-w-[8rem] ${invalid("sessionDurationMinutes") ? "border-destructive" : ""}`}
            type="number"
            min={10}
            max={180}
            step={5}
            value={props.sessionDurationMinutes}
            onChange={(e) => {
              props.setSessionDurationMinutes(e.target.value);
              props.clearValidation("sessionDurationMinutes");
            }}
          />
        </FieldHint>

        <FieldHint
          label="Event context"
          htmlFor="event-context-input"
          tooltip="e.g., Commercial venue, Halloween party, corporate team building, or school fundraiser. This guides the system in adjusting tone and compliance notes."
        >
          <input
            id="event-context-input"
            className={inputClass}
            type="text"
            list="event-type-suggestions"
            value={props.eventType}
            maxLength={200}
            onChange={(e) => props.setEventType(e.target.value)}
            placeholder="Optional"
          />
          <datalist id="event-type-suggestions">
            {props.eventSuggestions.map((entry) => (
              <option key={entry} value={entry} />
            ))}
          </datalist>
          {props.commercialVenueContext ? (
            <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm" role="note">
              <strong>Commercial / ticketed venue:</strong> Guests expect a clearly unique experience—treat generated ideas as raw
              material for original puzzles and flow.
            </p>
          ) : null}
        </FieldHint>

        <FieldHint
          label="Environment"
          required
          invalid={invalid("environmentType")}
          tooltip="Choosing an environment automatically filters our puzzle catalog to props that realistically fit your physical space layout."
        >
          <EnvironmentSelect
            value={props.environmentType}
            invalid={invalid("environmentType")}
            onChange={(v) => {
              props.setEnvironmentType(v);
              props.clearValidation("environmentType");
            }}
            onEnvironmentCleared={() => props.setAvailableItems("")}
          />
        </FieldHint>

        <FieldHint
          label="Available items & props"
          invalid={invalid("availableItems")}
          tooltip="Optional props that may be on hand. Click suggested chips or add custom theatrical props."
        >
          <AvailableItemsChips
            value={props.availableItems}
            presetLabels={props.propPresetLabels}
            historyOptions={props.itemHistory}
            disabled={!props.environmentType.trim()}
            invalid={invalid("availableItems")}
            onChange={(next) => {
              props.setAvailableItems(next);
              props.clearValidation("availableItems");
            }}
          />
        </FieldHint>

        <div className="flex items-start gap-2">
          <input
            id="enforce-env-fit"
            type="checkbox"
            className="mt-1"
            checked={props.themeMustMatchEnvironment}
            onChange={(e) => props.setThemeMustMatchEnvironment(e.target.checked)}
          />
          <FieldHint
            label="Enforce environmental fit"
            htmlFor="enforce-env-fit"
            tooltip="When active, the generator prioritizes themes matching your exact physical venue logistics (e.g., garage vs. classroom) over pure high-fantasy concepts."
          />
        </div>

        <Accordion type="single" collapsible className="rounded-md border border-slate-800/50 bg-card/30 px-4 backdrop-blur-md">
          <AccordionItem value="advanced">
            <AccordionTrigger>Advanced Configuration (Difficulty, Junior Tracks, etc.)</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <FieldHint label="Room puzzle difficulty">
                <select
                  className={inputClass}
                  value={props.roomDifficulty}
                  onChange={(e) => props.setRoomDifficulty(e.target.value as "easy" | "medium" | "hard")}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </FieldHint>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={props.youthAddOnEnabled}
                  onChange={(e) => {
                    const on = e.target.checked;
                    props.setYouthAddOnEnabled(on);
                    if (!on) {
                      props.setYouthAddOnGatesAdultFlow(false);
                      props.setYouthAddOnAgeNote("");
                    }
                  }}
                />
                <span>Include junior add-on escape (parallel easy–medium track)</span>
              </label>
              {props.youthAddOnEnabled ? (
                <div className="space-y-3 pl-6">
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={props.youthAddOnGatesAdultFlow}
                      onChange={(e) => props.setYouthAddOnGatesAdultFlow(e.target.checked)}
                    />
                    <span>Junior puzzles may gate adult progression</span>
                  </label>
                  <FieldHint label="Junior track notes">
                    <input
                      className={inputClass}
                      type="text"
                      value={props.youthAddOnAgeNote}
                      maxLength={400}
                      onChange={(e) => props.setYouthAddOnAgeNote(e.target.value)}
                      placeholder="e.g. ages ~6–11, nook off main room"
                    />
                  </FieldHint>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="setup-options pt-2">
        <button type="button" className="primary-btn" onClick={props.onContinue}>
          Continue to theme selection
        </button>
      </div>
    </div>
  );
}
