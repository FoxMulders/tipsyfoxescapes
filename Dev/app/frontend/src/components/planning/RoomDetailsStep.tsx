import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { AvailableItemsChips } from "@/components/planning/AvailableItemsChips";
import { EnvironmentSelect } from "@/components/planning/EnvironmentSelect";
import { FieldHint } from "@/components/planning/FieldHint";
import { JuniorTrackFeatureCard } from "@/components/planning/JuniorTrackFeatureCard";
import { NumberCounter } from "@/components/planning/NumberCounter";
import { PropFabricationSection, type PropFabricationKind } from "@/components/planning/PropFabricationSection";
import { PuzzleEstimateBadge } from "@/components/planning/PuzzleEstimateBadge";
import { TargetInterfaceField } from "@/components/planning/TargetInterfaceField";
import { VenueBuildTypeField } from "@/components/planning/VenueBuildTypeField";
import type { TargetInterface, VenueBuildType } from "../../../../shared/contracts";
import { cn } from "@/lib/utils";

type RoomDetailsStepProps = {
  wizardStepIndex: number;
  wizardStepTotal: number;
  wizardStepLabel: string;
  playersConcurrent: string;
  onPlayersConcurrentChange: (v: string) => void;
  maxConcurrent?: number;
  participantsTotal: string;
  onParticipantsTotalChange: (v: string) => void;
  venueBuildType: VenueBuildType;
  setVenueBuildType: (v: VenueBuildType) => void;
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
  targetInterface: TargetInterface;
  setTargetInterface: (v: TargetInterface) => void;
  roomDifficulty: "easy" | "medium" | "hard";
  setRoomDifficulty: (v: "easy" | "medium" | "hard") => void;
  youthAddOnEnabled: boolean;
  setYouthAddOnEnabled: (v: boolean) => void;
  youthAddOnGatesAdultFlow: boolean;
  setYouthAddOnGatesAdultFlow: (v: boolean) => void;
  youthAddOnAgeNote: string;
  setYouthAddOnAgeNote: (v: string) => void;
  propFabrication3dEnabled: boolean;
  setPropFabrication3dEnabled: (v: boolean) => void;
  propFabricationKinds: PropFabricationKind[];
  setPropFabricationKinds: (v: PropFabricationKind[]) => void;
  validationFlags: Record<string, boolean>;
  clearValidation: (key: string) => void;
  commercialVenueContext: boolean;
  eventSuggestions: string[];
  itemHistory: string[];
  propPresetLabels: string[];
  plannerMainPuzzleTarget: number;
  juniorAddOnPuzzleSlots: number;
  estimatePulseKey: string;
  onContinue: () => void;
  onOpenInspiration: () => void;
};

const selectClass =
  "flex h-10 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-ring";

const textareaClass =
  "flex min-h-[7.5rem] w-full resize-y rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm leading-relaxed text-slate-50 focus:outline-none focus:ring-2 focus:ring-ring";

export function RoomDetailsStep(props: RoomDetailsStepProps) {
  const invalid = (key: string) => Boolean(props.validationFlags[key]);
  const isCommercial = props.targetInterface === "commercial_venue";
  const envReady = props.environmentType.trim().length > 0;

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
              onClick={props.onOpenInspiration}
              title="Opens curated prop ideas, theme sparks, and on-device AI inspiration for your space."
            >
              Get AI prop &amp; theme inspiration
            </button>
          </div>
        </header>

        <div className="room-details-blueprint-form" id="room-details-blueprint-form">
          <div className="form-field-panel form-field-panel--primary">
            <TargetInterfaceField value={props.targetInterface} onChange={props.setTargetInterface} />
          </div>

          {isCommercial ? (
            <>
              <div className="form-field-panel">
                <VenueBuildTypeField
                  value={props.venueBuildType}
                  onChange={props.setVenueBuildType}
                  environmentType={props.environmentType}
                />
              </div>
              <div className="form-field-panel">
                <FieldHint
                  label="Describe your facility layout or architectural shell"
                required
                invalid={invalid("environmentType")}
                tooltip="Retail venues are fully custom—describe zones, door positions, GM sightlines, and any fixed infrastructure so themes and installs align with your build."
                htmlFor="facility-layout-input"
              >
                <textarea
                  id="facility-layout-input"
                  className={cn(textareaClass, invalid("environmentType") && "border-destructive ring-destructive/40")}
                  value={props.environmentType}
                  rows={5}
                  maxLength={800}
                  placeholder="Example: 4-zone linear flow — briefing airlock, main gallery, tech pit, finale airlock; GM desk sightline to zones 2–3…"
                  aria-invalid={invalid("environmentType")}
                  onChange={(e) => {
                    props.setEnvironmentType(e.target.value);
                    props.clearValidation("environmentType");
                  }}
                />
              </FieldHint>
              </div>
            </>
          ) : (
            <div className="form-field-panel">
              <FieldHint
                label="Environment"
                required
                invalid={invalid("environmentType")}
                tooltip="Residential play spaces only—choosing an environment filters props and theme suggestions to what fits at home."
              >
                <EnvironmentSelect
                  presetScope="home"
                  value={props.environmentType}
                  invalid={invalid("environmentType")}
                  onChange={(v) => {
                    props.setEnvironmentType(v);
                    props.clearValidation("environmentType");
                  }}
                  onEnvironmentCleared={() => props.setAvailableItems("")}
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
                value={props.playersConcurrent}
                onChange={props.onPlayersConcurrentChange}
                min={1}
                max={props.maxConcurrent ?? 99}
                invalid={invalid("playersConcurrent")}
                aria-label="Players at one time"
              />
            </FieldHint>
            <FieldHint label="Total participants" required invalid={invalid("participantsTotal")}>
              <NumberCounter
                value={props.participantsTotal}
                onChange={props.onParticipantsTotalChange}
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
                value={props.sessionDurationMinutes}
                onChange={(v) => {
                  props.setSessionDurationMinutes(v);
                  props.clearValidation("sessionDurationMinutes");
                }}
                min={10}
                max={180}
                step={5}
                invalid={invalid("sessionDurationMinutes")}
                aria-label="Session duration in minutes"
              />
            </FieldHint>
            <PuzzleEstimateBadge
              target={props.plannerMainPuzzleTarget}
              juniorAddOnSlots={props.juniorAddOnPuzzleSlots}
              pulseKey={props.estimatePulseKey}
            />
          </div>

          {!isCommercial ? (
            <div className="form-field-panel">
              <FieldHint
                label="Event context"
                htmlFor="event-context-input"
                tooltip="e.g., Halloween party, corporate team building, school fundraiser, or birthday."
              >
                <Input
                  id="event-context-input"
                  type="text"
                  list="event-type-suggestions"
                  className="border-slate-700/60 bg-slate-900/90 text-slate-50"
                  value={props.eventType}
                  maxLength={200}
                  onChange={(e) => props.setEventType(e.target.value)}
                />
                <datalist id="event-type-suggestions">
                  {props.eventSuggestions.map((entry) => (
                    <option key={entry} value={entry} />
                  ))}
                </datalist>
              </FieldHint>
            </div>
          ) : null}

          <div className="form-field-panel">
            <FieldHint
              label={isCommercial ? "Planned installs & props" : "Available items & props"}
              invalid={invalid("availableItems")}
              tooltip={
                isCommercial
                  ? "Optional list of fixtures and props you plan to order or install."
                  : "Optional props on hand. Click suggested chips or add custom theatrical props."
              }
            >
              <AvailableItemsChips
                value={props.availableItems}
                presetLabels={props.propPresetLabels}
                historyOptions={props.itemHistory}
                disabled={!envReady}
                invalid={invalid("availableItems")}
                onChange={(next) => {
                  props.setAvailableItems(next);
                  props.clearValidation("availableItems");
                }}
              />
            </FieldHint>
          </div>

          <div className="form-field-panel">
            <FieldHint
              label="Puzzle difficulty"
              tooltip="Sets how challenging the generated puzzles will be. Easy is family-friendly, Medium suits most adults, Hard is for experienced players."
            >
              <select
                className={selectClass}
                value={props.roomDifficulty}
                onChange={(e) => props.setRoomDifficulty(e.target.value as "easy" | "medium" | "hard")}
                aria-label="Room puzzle difficulty"
              >
                <option value="easy">Easy — family-friendly, accessible to all ages</option>
                <option value="medium">Medium — suited to most adults</option>
                <option value="hard">Hard — experienced players, complex logic</option>
              </select>
            </FieldHint>
          </div>

          <div className="junior-track-standalone">
            <JuniorTrackFeatureCard
            enabled={props.youthAddOnEnabled}
            onEnabledChange={props.setYouthAddOnEnabled}
            gatesAdultFlow={props.youthAddOnGatesAdultFlow}
            onGatesAdultFlowChange={props.setYouthAddOnGatesAdultFlow}
            ageNote={props.youthAddOnAgeNote}
            onAgeNoteChange={props.setYouthAddOnAgeNote}
            juniorAddOnSlots={props.juniorAddOnPuzzleSlots}
            />
          </div>

          <PropFabricationSection
            enabled={props.propFabrication3dEnabled}
            onEnabledChange={props.setPropFabrication3dEnabled}
            kinds={props.propFabricationKinds}
            onKindsChange={props.setPropFabricationKinds}
          />

          <Accordion type="single" collapsible className="form-field-panel advanced-config-panel rounded-md border border-slate-600 bg-slate-900 px-4">
            <AccordionItem value="advanced">
              <AccordionTrigger>Advanced options</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <FieldHint
                  label="Enforce Environmental Fit"
                  htmlFor="enforce-env-fit"
                  tooltip="Forces the AI to strictly anchor all puzzles to the physical objects and layout constraints of your chosen room environment. Useful when you want zero generic puzzles."
                >
                  <label className="feature-card__toggle-row room-details-checkbox-row">
                    <input
                      id="enforce-env-fit"
                      type="checkbox"
                      checked={props.themeMustMatchEnvironment}
                      onChange={(e) => props.setThemeMustMatchEnvironment(e.target.checked)}
                    />
                    <span>Strictly match generated ideas to this environment.</span>
                  </label>
                </FieldHint>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="room-details-form-card__cta setup-options">
          <button type="button" className="primary-btn" onClick={props.onContinue}>
            Continue to theme selection
          </button>
        </div>
      </div>
    </div>
  );
}
