import { AvailableItemsChips } from "@/components/planning/AvailableItemsChips";
import { FieldHint } from "@/components/planning/FieldHint";
import { usePlanning } from "../context/PlanningProvider";

type PropManagerProps = {
  itemHistory: string[];
};

export function PropManager({ itemHistory }: PropManagerProps) {
  const { state, dispatch, propPresetLabels, clearValidation } = usePlanning();
  const invalid = (key: string) => Boolean(state.validationFlags[key]);
  const isCommercial = state.targetInterface === "commercial_venue";
  const envReady = state.environmentType.trim().length > 0;

  return (
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
          value={state.availableItems}
          presetLabels={propPresetLabels}
          historyOptions={itemHistory}
          disabled={!envReady}
          invalid={invalid("availableItems")}
          onChange={(next) => {
            dispatch({ type: "SET_AVAILABLE_ITEMS", value: next });
            clearValidation("availableItems");
          }}
        />
      </FieldHint>
    </div>
  );
}
