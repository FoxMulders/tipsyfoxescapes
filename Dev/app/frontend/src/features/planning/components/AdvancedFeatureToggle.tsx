import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FieldHint } from "@/components/planning/FieldHint";
import { JuniorTrackFeatureCard } from "@/components/planning/JuniorTrackFeatureCard";
import { PropFabricationSection } from "@/components/planning/PropFabricationSection";
import { usePlanning } from "../context/PlanningProvider";

export function AdvancedFeatureToggle() {
  const { state, dispatch, juniorAddOnPuzzleSlots } = usePlanning();

  return (
    <>
      <div className="junior-track-standalone">
        <JuniorTrackFeatureCard
          enabled={state.youthAddOnEnabled}
          onEnabledChange={(enabled) => dispatch({ type: "SET_YOUTH_ADD_ON", enabled })}
          gatesAdultFlow={state.youthAddOnGatesAdultFlow}
          onGatesAdultFlowChange={(value) => dispatch({ type: "SET_YOUTH_GATES_ADULT", value })}
          ageNote={state.youthAddOnAgeNote}
          onAgeNoteChange={(value) => dispatch({ type: "SET_YOUTH_AGE_NOTE", value })}
          juniorAddOnSlots={juniorAddOnPuzzleSlots}
        />
      </div>
      <PropFabricationSection
        enabled={state.propFabrication3dEnabled}
        onEnabledChange={(enabled) => dispatch({ type: "SET_PROP_FAB_3D", enabled })}
        kinds={state.propFabricationKinds}
        onKindsChange={(kinds) => dispatch({ type: "SET_PROP_FAB_KINDS", kinds })}
      />
      <Accordion type="single" collapsible className="form-field-panel advanced-config-panel rounded-md border border-slate-600 bg-slate-900 px-4">
        <AccordionItem value="advanced">
          <AccordionTrigger>Advanced options</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <FieldHint
              label="Enforce Environmental Fit"
              htmlFor="enforce-env-fit"
              tooltip="Forces the AI to strictly anchor all puzzles to the physical objects and layout constraints of your chosen room environment."
            >
              <label className="feature-card__toggle-row room-details-checkbox-row">
                <input
                  id="enforce-env-fit"
                  type="checkbox"
                  checked={state.themeMustMatchEnvironment}
                  onChange={(e) => dispatch({ type: "SET_THEME_MUST_MATCH_ENV", value: e.target.checked })}
                />
                <span>Strictly match generated ideas to this environment.</span>
              </label>
            </FieldHint>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}
