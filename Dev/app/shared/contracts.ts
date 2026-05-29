import type { RoomLayoutDocument } from "./roomLayout.js";

export type Difficulty = "easy" | "medium" | "hard";
export type PuzzleCategory = "logic" | "physical" | "electronic";

export type HardwareProfile =
  | "button_led"
  | "buzzer"
  | "touch"
  | "rfid"
  | "relay_maglock"
  | "analog_sensor"
  | "print_and_play"
  | "generic";

export type RoomDifficulty = "easy" | "medium" | "hard";

/** Commercial empty shell vs. an existing lived-in / furnished space. */
export type VenueBuildType = "professional_empty" | "prebuilt_space";

/** Host-facing run interface chosen at planning (maps to live `operatingMode`). */
export type TargetInterface = "home_party" | "commercial_venue";

export interface PlanningInput {
  playersConcurrent: number;
  participantsTotal: number;
  environmentType: string;
  availableItems: string[];
  /** When present, biases generated and suggested puzzles toward this challenge level. */
  roomDifficulty?: RoomDifficulty;
  /** Parallel junior add-on (same fiction), generator uses easy–medium puzzles only. */
  youthAddOnEnabled?: boolean;
  youthAddOnGatesAdultFlow?: boolean;
  youthAddOnAgeNote?: string;
  /** Event framing (holiday, team building, commercial, etc.) for server-side theme bias. */
  eventType?: string;
  /** When true, catalog theme ranking favors venue-aligned picks vs the environment field. */
  themeMustMatchEnvironment?: boolean;
  /** Professional empty room (install from scratch) vs. prebuilt home/office/rec space. */
  venueBuildType?: VenueBuildType;
  /** Explicit home vs venue live-ops path; persisted on the planning session. */
  targetInterface?: TargetInterface;
  /** Host plans to 3D-print props for this room. */
  propFabrication3dEnabled?: boolean;
  /** Subset of mechanical vs decorative print intent when 3D printing is enabled. */
  propFabricationKinds?: ("mechanical" | "decorative")[];
  /** Optional interactive floor-plan from Room Details layout designer. */
  roomLayout?: RoomLayoutDocument;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
}

export interface Puzzle {
  id: string;
  category: PuzzleCategory;
  title: string;
  objective: string;
  solveSteps: string[];
  difficulty: Difficulty;
  physical_anchor_prop?: string;
  narrative_justification?: string;
  bill_of_materials?: string[];
  required_parts_and_props?: string[];
  build_documentation_url?: string;
  isStaticCatalog?: boolean;
  hardware_profile?: HardwareProfile;
}

export interface CreateSessionResponse {
  sessionId: string;
  createdAt: string;
}

export interface GenerateThemesResponse {
  themes: Theme[];
}

export interface GeneratePuzzlesResponse {
  puzzles: Puzzle[];
}

