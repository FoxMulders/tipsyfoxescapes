import { describe, expect, it } from "vitest";
import type { RoomSkeleton } from "../../../../../../shared/roomSkeleton";
import { validateRoomDataForComplete } from "../generationEngine";
import type { RoomBriefContext, ThemeContext } from "../generationTypes";

const roomBrief: RoomBriefContext = {
  playersConcurrent: 4,
  participantsTotal: 8,
  sessionDurationMinutes: 60,
  environmentType: "home",
  availableItems: "tables, chairs",
};

const theme: ThemeContext = {
  id: "theme-haunted-toy",
  name: "The Haunted Toy Shop",
  tags: ["clockwork", "toys", "spirits"],
};

const skeleton: RoomSkeleton = {
  flow_pattern: "linear_4zone",
  flow_summary: "Entry → Gallery → Workshop → Airlock.",
  zones: [
    { zone_id: "z1", name: "Entry", primary_player_action: "Find key", suggested_hardware_profile: "print_and_play" },
    { zone_id: "z2", name: "Gallery", primary_player_action: "Decode symbols", suggested_hardware_profile: "analog_sensor" },
  ],
};

const validPuzzles = [
  {
    id: "p1",
    title: "Clockwork Clue",
    category: "logic",
    objective: "Decode the haunted toy shop inventory tags on the spirit shelf.",
    narrativeHook: "The shopkeeper's ghost whispers that the marionettes hold the first secret.",
  },
];

describe("validateRoomDataForComplete", () => {
  it("commits when theme, brief, layout, and thematic copy pass", () => {
    const result = validateRoomDataForComplete({
      skeleton,
      puzzles: validPuzzles,
      theme,
      roomBrief,
      telemetry: null,
      viewportWidth: 1600,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.roomData.theme.name).toBe("The Haunted Toy Shop");
      expect(result.roomData.layoutMode).toBe("grid");
    }
  });

  it("rejects generic placeholder copy with theme-specific retry hint", () => {
    const result = validateRoomDataForComplete({
      skeleton,
      puzzles: [
        {
          id: "p1",
          title: "Generic",
          category: "logic",
          objective: "Solve the generic logic puzzle in the escape room.",
        },
      ],
      theme,
      roomBrief,
      telemetry: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryHint).toContain("Haunted Toy Shop");
    }
  });

  it("requires room data fields, not a loading flag", () => {
    const result = validateRoomDataForComplete({
      skeleton: null,
      puzzles: validPuzzles,
      theme,
      roomBrief,
      telemetry: null,
    });
    expect(result.ok).toBe(false);
  });
});
