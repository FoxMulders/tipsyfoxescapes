import { FieldHint } from "@/components/planning/FieldHint";
import { usePlanning } from "../context/PlanningProvider";
import { LivingInventoryPanel, RoomConstraintsFields } from "./LivingInventoryPanel";

type PropManagerProps = {
  itemHistory: string[];
};

export function PropManager({ itemHistory }: PropManagerProps) {
  const { state, dispatch, propPresetLabels, clearValidation } = usePlanning();
  const invalid = (key: string) => Boolean(state.validationFlags[key]);
  const isCommercial = state.targetInterface === "commercial_venue";
  const envReady = state.environmentType.trim().length > 0;

  return (
    <div className="form-field-panel space-y-4">
      <FieldHint
        label={isCommercial ? "Living inventory — installs & props" : "Living inventory — props on hand"}
        invalid={invalid("availableItems")}
        tooltip="Use / Don't Use columns. Mark puzzle props, set dressing, or red herrings. Not every Use item needs a puzzle slot."
      >
        <LivingInventoryPanel
          items={state.inventoryItems}
          presetLabels={propPresetLabels}
          historyOptions={itemHistory}
          disabled={!envReady}
          invalid={invalid("availableItems")}
          onChange={(items) => {
            dispatch({ type: "SET_INVENTORY_ITEMS", items });
            clearValidation("availableItems");
          }}
        />
      </FieldHint>
      <RoomConstraintsFields
        designConstraints={state.designConstraints}
        noGoItems={state.noGoItems}
        techLevel={state.techLevel}
        disabled={!envReady}
        onDesignConstraintsChange={(value) => dispatch({ type: "SET_DESIGN_CONSTRAINTS", value })}
        onNoGoItemsChange={(value) => dispatch({ type: "SET_NO_GO_ITEMS", value })}
        onTechLevelChange={(value) => dispatch({ type: "SET_TECH_LEVEL", value })}
      />
    </div>
  );
}
