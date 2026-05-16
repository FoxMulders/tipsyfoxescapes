export type Difficulty = "easy" | "medium" | "hard";
export type PuzzleCategory = "logic" | "physical" | "electronic";

export type RoomDifficulty = "easy" | "medium" | "hard";

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

