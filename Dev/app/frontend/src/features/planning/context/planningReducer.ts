import type { PropFabricationKind } from "@/components/planning/PropFabricationSection";
import type { RoomLayoutDocument, RoomLayoutElement, RoomLayoutElementKind } from "../../../../../shared/roomLayout";
import { DEFAULT_ROOM_LAYOUT } from "../../../../../shared/roomLayout";
import type { TargetInterface, VenueBuildType } from "../../../../../shared/contracts";
import type { InventoryItem, TechLevel } from "../../../../../shared/contracts";
import { inventoryItemNames, migrateAvailableItemsToInventory } from "../../../../../shared/inventory";
import { parseItemChips } from "../domain/parseItems";
import type { PlanningFormState } from "../domain/planningTypes";
import { DEFAULT_PLANNING_FORM_STATE } from "../domain/planningTypes";

export type PlanningAction =
  | { type: "HYDRATE"; payload: Partial<PlanningFormState> }
  | { type: "SET_TARGET_INTERFACE"; value: TargetInterface }
  | { type: "SET_PLAYERS_CONCURRENT"; value: string }
  | { type: "SET_PARTICIPANTS_TOTAL"; value: string }
  | { type: "SET_SESSION_DURATION"; value: string }
  | { type: "SET_ENVIRONMENT"; value: string; clearItems?: boolean }
  | { type: "SET_EVENT_TYPE"; value: string }
  | { type: "SET_AVAILABLE_ITEMS"; value: string }
  | { type: "SET_INVENTORY_ITEMS"; items: InventoryItem[] }
  | { type: "SET_DESIGN_CONSTRAINTS"; value: string }
  | { type: "SET_NO_GO_ITEMS"; value: string }
  | { type: "SET_TECH_LEVEL"; value: TechLevel | "" }
  | { type: "ADD_AVAILABLE_ITEM"; label: string }
  | { type: "SET_ROOM_DIFFICULTY"; value: "easy" | "medium" | "hard" }
  | { type: "SET_THEME_MUST_MATCH_ENV"; value: boolean }
  | { type: "SET_VENUE_BUILD_TYPE"; value: VenueBuildType }
  | { type: "SET_YOUTH_ADD_ON"; enabled: boolean }
  | { type: "SET_YOUTH_GATES_ADULT"; value: boolean }
  | { type: "SET_YOUTH_AGE_NOTE"; value: string }
  | { type: "SET_PROP_FAB_3D"; enabled: boolean }
  | { type: "SET_PROP_FAB_KINDS"; kinds: PropFabricationKind[] }
  | { type: "SET_CUSTOM_MAIN_COUNT"; enabled: boolean; str?: string }
  | { type: "SET_CUSTOM_MIX"; enabled: boolean; logic?: string; physical?: string; electronic?: string }
  | { type: "CLEAR_VALIDATION"; key: string }
  | { type: "SET_VALIDATION_FLAGS"; flags: Record<string, boolean> }
  | { type: "SET_ROOM_LAYOUT"; layout: RoomLayoutDocument }
  | { type: "LAYOUT_TOGGLE_SNAP"; enabled: boolean }
  | { type: "LAYOUT_PLACE"; element: Omit<RoomLayoutElement, "id"> & { id?: string } }
  | { type: "LAYOUT_MOVE"; id: string; xM: number; yM: number }
  | { type: "LAYOUT_REMOVE"; id: string }
  | { type: "LAYOUT_SELECT"; id: string | null }
  | { type: "LAYOUT_ANNOUNCE"; message: string };

let layoutIdSeq = 0;
export function nextLayoutElementId(): string {
  layoutIdSeq += 1;
  return `ly_${Date.now()}_${layoutIdSeq}`;
}

function applyTargetInterfaceSideEffects(state: PlanningFormState, ti: TargetInterface): PlanningFormState {
  return {
    ...state,
    targetInterface: ti,
    sessionDurationMinutes: ti === "commercial_venue" ? "60" : state.sessionDurationMinutes === "60" && ti === "home_party" ? "30" : state.sessionDurationMinutes,
    venueBuildType: ti === "commercial_venue" ? "professional_empty" : "prebuilt_space",
  };
}

function removeLayoutElementsForPropKey(layout: RoomLayoutDocument, propKey: string): RoomLayoutDocument {
  const k = propKey.trim().toLowerCase();
  return {
    ...layout,
    elements: layout.elements.filter(
      (e) => !(e.kind === "prop" && (e.meta?.propKey ?? e.label).trim().toLowerCase() === k),
    ),
  };
}

export function planningReducer(state: PlanningFormState, action: PlanningAction): PlanningFormState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload, roomLayout: action.payload.roomLayout ?? state.roomLayout };
    case "SET_TARGET_INTERFACE":
      return applyTargetInterfaceSideEffects(state, action.value);
    case "SET_PLAYERS_CONCURRENT":
      return {
        ...state,
        playersConcurrent: action.value,
        validationFlags: { ...state.validationFlags, playersConcurrent: false, participantsTotal: false, headcountOrder: false },
      };
    case "SET_PARTICIPANTS_TOTAL": {
      const pt = Number(action.value);
      const pc = Number(state.playersConcurrent);
      let playersConcurrent = state.playersConcurrent;
      if (Number.isFinite(pt) && Number.isFinite(pc) && pt > 0 && pc > pt) {
        playersConcurrent = String(Math.min(99, Math.max(1, Math.trunc(pt))));
      }
      return {
        ...state,
        participantsTotal: action.value,
        playersConcurrent,
        validationFlags: { ...state.validationFlags, participantsTotal: false, playersConcurrent: false, headcountOrder: false },
      };
    }
    case "SET_SESSION_DURATION":
      return {
        ...state,
        sessionDurationMinutes: action.value,
        validationFlags: { ...state.validationFlags, sessionDurationMinutes: false },
      };
    case "SET_ENVIRONMENT":
      return {
        ...state,
        environmentType: action.value,
        availableItems: action.clearItems ? "" : state.availableItems,
        validationFlags: { ...state.validationFlags, environmentType: false },
      };
    case "SET_EVENT_TYPE":
      return { ...state, eventType: action.value };
    case "SET_AVAILABLE_ITEMS": {
      const prev = parseItemChips(state.availableItems);
      const next = parseItemChips(action.value);
      const removed = prev.filter((p) => !next.some((n) => n.toLowerCase() === p.toLowerCase()));
      let roomLayout = state.roomLayout;
      for (const r of removed) roomLayout = removeLayoutElementsForPropKey(roomLayout, r);
      const inventoryItems =
        state.inventoryItems.length > 0
          ? state.inventoryItems.filter((i) => next.some((n) => n.toLowerCase() === i.name.toLowerCase()) || i.status === "exclude")
          : migrateAvailableItemsToInventory(next);
      return {
        ...state,
        availableItems: action.value,
        inventoryItems,
        roomLayout,
        validationFlags: { ...state.validationFlags, availableItems: false },
      };
    }
    case "SET_INVENTORY_ITEMS": {
      const useNames = inventoryItemNames(action.items);
      return {
        ...state,
        inventoryItems: action.items,
        availableItems: useNames.join(", "),
        validationFlags: { ...state.validationFlags, availableItems: false },
      };
    }
    case "SET_DESIGN_CONSTRAINTS":
      return { ...state, designConstraints: action.value };
    case "SET_NO_GO_ITEMS":
      return { ...state, noGoItems: action.value };
    case "SET_TECH_LEVEL":
      return { ...state, techLevel: action.value };
    case "ADD_AVAILABLE_ITEM": {
      const chips = parseItemChips(state.availableItems);
      const k = action.label.trim().toLowerCase();
      if (!k || chips.some((c) => c.toLowerCase() === k)) return state;
      return { ...state, availableItems: [...chips, action.label.trim()].join(", ") };
    }
    case "SET_ROOM_DIFFICULTY":
      return { ...state, roomDifficulty: action.value };
    case "SET_THEME_MUST_MATCH_ENV":
      return { ...state, themeMustMatchEnvironment: action.value };
    case "SET_VENUE_BUILD_TYPE":
      return { ...state, venueBuildType: action.value };
    case "SET_YOUTH_ADD_ON":
      return {
        ...state,
        youthAddOnEnabled: action.enabled,
        youthAddOnGatesAdultFlow: action.enabled ? state.youthAddOnGatesAdultFlow : false,
        youthAddOnAgeNote: action.enabled ? state.youthAddOnAgeNote : "",
      };
    case "SET_YOUTH_GATES_ADULT":
      return { ...state, youthAddOnGatesAdultFlow: action.value };
    case "SET_YOUTH_AGE_NOTE":
      return { ...state, youthAddOnAgeNote: action.value };
    case "SET_PROP_FAB_3D":
      return {
        ...state,
        propFabrication3dEnabled: action.enabled,
        propFabricationKinds: action.enabled ? state.propFabricationKinds : [],
      };
    case "SET_PROP_FAB_KINDS":
      return { ...state, propFabricationKinds: action.kinds };
    case "SET_CUSTOM_MAIN_COUNT":
      return {
        ...state,
        useCustomMainPuzzleCount: action.enabled,
        customMainPuzzleCountStr: action.str ?? state.customMainPuzzleCountStr,
      };
    case "SET_CUSTOM_MIX":
      return {
        ...state,
        useCustomMix: action.enabled,
        customMixLogic: action.logic ?? state.customMixLogic,
        customMixPhysical: action.physical ?? state.customMixPhysical,
        customMixElectronic: action.electronic ?? state.customMixElectronic,
      };
    case "CLEAR_VALIDATION":
      return { ...state, validationFlags: { ...state.validationFlags, [action.key]: false } };
    case "SET_VALIDATION_FLAGS":
      return { ...state, validationFlags: action.flags };
    case "SET_ROOM_LAYOUT":
      return { ...state, roomLayout: action.layout };
    case "LAYOUT_TOGGLE_SNAP":
      return { ...state, roomLayout: { ...state.roomLayout, snapEnabled: action.enabled } };
    case "LAYOUT_PLACE": {
      const id = action.element.id ?? nextLayoutElementId();
      const el: RoomLayoutElement = { ...action.element, id };
      if (action.element.kind === "prop" && action.element.meta?.propKey) {
        const chips = parseItemChips(state.availableItems);
        const pk = action.element.meta.propKey.trim();
        const has = chips.some((c) => c.toLowerCase() === pk.toLowerCase());
        const availableItems = has ? state.availableItems : [...chips, pk].join(", ");
        return {
          ...state,
          availableItems,
          roomLayout: { ...state.roomLayout, elements: [...state.roomLayout.elements, el] },
          layoutSelectedId: id,
          layoutA11yAnnouncement: `${el.label} placed at X:${el.xM}, Y:${el.yM}`,
        };
      }
      return {
        ...state,
        roomLayout: { ...state.roomLayout, elements: [...state.roomLayout.elements, el] },
        layoutSelectedId: id,
        layoutA11yAnnouncement: `${el.label} placed at X:${el.xM}, Y:${el.yM}`,
      };
    }
    case "LAYOUT_MOVE": {
      const elements = state.roomLayout.elements.map((e) =>
        e.id === action.id ? { ...e, xM: action.xM, yM: action.yM } : e,
      );
      const moved = elements.find((e) => e.id === action.id);
      return {
        ...state,
        roomLayout: { ...state.roomLayout, elements },
        layoutA11yAnnouncement: moved ? `${moved.label} moved to X:${action.xM}, Y:${action.yM}` : state.layoutA11yAnnouncement,
      };
    }
    case "LAYOUT_REMOVE": {
      const removed = state.roomLayout.elements.find((e) => e.id === action.id);
      return {
        ...state,
        roomLayout: { ...state.roomLayout, elements: state.roomLayout.elements.filter((e) => e.id !== action.id) },
        layoutSelectedId: state.layoutSelectedId === action.id ? null : state.layoutSelectedId,
        layoutA11yAnnouncement: removed ? `${removed.label} removed` : state.layoutA11yAnnouncement,
      };
    }
    case "LAYOUT_SELECT":
      return { ...state, layoutSelectedId: action.id };
    case "LAYOUT_ANNOUNCE":
      return { ...state, layoutA11yAnnouncement: action.message };
    default:
      return state;
  }
}

export function createInitialPlanningState(overrides?: Partial<PlanningFormState>): PlanningFormState {
  return {
    ...DEFAULT_PLANNING_FORM_STATE,
    roomLayout: { ...DEFAULT_ROOM_LAYOUT },
    ...overrides,
  };
}
