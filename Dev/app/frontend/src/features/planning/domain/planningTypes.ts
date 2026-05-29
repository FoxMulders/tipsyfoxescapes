import type { PropFabricationKind } from "@/components/planning/PropFabricationSection";
import { DEFAULT_ROOM_LAYOUT, type RoomLayoutDocument } from "../../../../../shared/roomLayout";
import type { TargetInterface, VenueBuildType } from "../../../../../shared/contracts";

export type PlanningFormState = {
  playersConcurrent: string;
  participantsTotal: string;
  sessionDurationMinutes: string;
  eventType: string;
  roomDifficulty: "easy" | "medium" | "hard";
  youthAddOnEnabled: boolean;
  youthAddOnGatesAdultFlow: boolean;
  youthAddOnAgeNote: string;
  environmentType: string;
  themeMustMatchEnvironment: boolean;
  venueBuildType: VenueBuildType;
  targetInterface: TargetInterface;
  propFabrication3dEnabled: boolean;
  propFabricationKinds: PropFabricationKind[];
  availableItems: string;
  useCustomMainPuzzleCount: boolean;
  customMainPuzzleCountStr: string;
  useCustomMix: boolean;
  customMixLogic: string;
  customMixPhysical: string;
  customMixElectronic: string;
  validationFlags: Record<string, boolean>;
  roomLayout: RoomLayoutDocument;
  layoutSelectedId: string | null;
  layoutA11yAnnouncement: string;
};

export type PlanningApiBody = {
  playersConcurrent: number;
  participantsTotal: number;
  sessionDurationMinutes: number;
  environmentType: string;
  availableItems: string[];
  roomDifficulty: "easy" | "medium" | "hard";
  youthAddOnEnabled: boolean;
  youthAddOnGatesAdultFlow: boolean;
  youthAddOnAgeNote: string;
  eventType: string;
  mainTrackPuzzleCountOverride: number | null;
  puzzleMixLogic: number | null;
  puzzleMixPhysical: number | null;
  puzzleMixElectronic: number | null;
  themeMustMatchEnvironment: boolean;
  venueBuildType: VenueBuildType;
  targetInterface: TargetInterface;
  propFabrication3dEnabled: boolean;
  propFabricationKinds: PropFabricationKind[];
  roomLayout?: RoomLayoutDocument;
};

export const DEFAULT_PLANNING_FORM_STATE: PlanningFormState = {
  playersConcurrent: "2",
  participantsTotal: "6",
  sessionDurationMinutes: "45",
  eventType: "",
  roomDifficulty: "medium",
  youthAddOnEnabled: false,
  youthAddOnGatesAdultFlow: false,
  youthAddOnAgeNote: "",
  environmentType: "",
  themeMustMatchEnvironment: false,
  venueBuildType: "prebuilt_space",
  targetInterface: "home_party",
  propFabrication3dEnabled: false,
  propFabricationKinds: [],
  availableItems: "",
  useCustomMainPuzzleCount: false,
  customMainPuzzleCountStr: "",
  useCustomMix: false,
  customMixLogic: "",
  customMixPhysical: "",
  customMixElectronic: "",
  validationFlags: {},
  roomLayout: { ...DEFAULT_ROOM_LAYOUT, elements: DEFAULT_ROOM_LAYOUT.elements.map((e) => ({ ...e })) },
  layoutSelectedId: null,
  layoutA11yAnnouncement: "",
};
