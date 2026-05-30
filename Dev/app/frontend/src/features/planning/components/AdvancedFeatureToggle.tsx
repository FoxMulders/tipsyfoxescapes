import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FieldHint } from "@/components/planning/FieldHint";
import { JuniorTrackFeatureCard } from "@/components/planning/JuniorTrackFeatureCard";
import { PropFabricationSection } from "@/components/planning/PropFabricationSection";
import { usePlanning } from "../context/PlanningProvider";

/** Secondary setup options grouped under Advanced Configuration in the room form. */
export function AdvancedFeatureSections() {
  const { state, dispatch, juniorAddOnPuzzleSlots } = usePlanning();

  return (
    <div className="advanced-config-sections space-y-4">
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
    </div>
  );
}

/** @deprecated Use AdvancedFeatureSections inside RoomConfigurationPanel accordion. */
export function AdvancedFeatureToggle() {
  return (
    <Accordion type="single" collapsible className="form-field-panel advanced-config-panel rounded-md border border-white/12 px-4">
      <AccordionItem value="advanced">
        <AccordionTrigger>Advanced options</AccordionTrigger>
        <AccordionContent>
          <AdvancedFeatureSections />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
