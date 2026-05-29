import { describe, expect, it } from "vitest";
import { DEFAULT_ROOM_LAYOUT } from "../../../../../shared/roomLayout";
import type { RoomSkeleton } from "../../../../../shared/roomSkeleton";
import {
  applyRoomSkeletonToLayout,
  layoutHasOnlyPresetShell,
  roomSkeletonZonesToElements,
  skeletonElementId,
} from "../layout-designer/roomSkeletonLayout";

const sampleSkeleton: RoomSkeleton = {
  flow_pattern: "linear_4zone",
  flow_summary: "Players move through briefing, gallery, tech pit, and finale in sequence.",
  zones: [
    { zone_id: "z_entry", name: "Briefing Airlock", primary_player_action: "Review mission rules and collect gear before entering." },
    {
      zone_id: "z_gallery",
      name: "Main Gallery",
      primary_player_action: "Search display cases and decode wall-mounted clues together.",
    },
    {
      zone_id: "z_tech",
      name: "Tech Control",
      primary_player_action: "Wire the relay panel to release the maglock when the code is correct.",
      suggested_hardware_profile: "relay_maglock",
    },
    { zone_id: "z_finale", name: "Finale Chamber", primary_player_action: "Combine prior artifacts to stop the countdown and exit." },
  ],
};

describe("roomSkeletonLayout", () => {
  it("maps zones to layout elements with stable ids", () => {
    const elements = roomSkeletonZonesToElements(sampleSkeleton, DEFAULT_ROOM_LAYOUT);
    expect(elements).toHaveLength(4);
    expect(elements[0]).toMatchObject({ id: skeletonElementId("z_entry"), kind: "airlock", label: "Briefing Airlock" });
    expect(elements[2]).toMatchObject({ kind: "tech_pit", meta: { skeletonZoneId: "z_tech" } });
    expect(elements[3]).toMatchObject({ kind: "finale", label: "Finale Chamber" });
  });

  it("replaces preset shell on first auto-plot", () => {
    const next = applyRoomSkeletonToLayout(DEFAULT_ROOM_LAYOUT, sampleSkeleton);
    expect(layoutHasOnlyPresetShell(DEFAULT_ROOM_LAYOUT)).toBe(true);
    expect(next.elements.some((e) => e.id.startsWith("shell_"))).toBe(false);
    expect(next.elements.filter((e) => e.id.startsWith("skel_"))).toHaveLength(4);
  });

  it("preserves manual placements when merging skeleton", () => {
    const manual = {
      ...DEFAULT_ROOM_LAYOUT,
      elements: [
        ...DEFAULT_ROOM_LAYOUT.elements,
        { id: "ly_user_prop", kind: "prop" as const, label: "GM desk", xM: 1, yM: 1 },
      ],
    };
    const next = applyRoomSkeletonToLayout(manual, sampleSkeleton);
    expect(next.elements.some((e) => e.id === "ly_user_prop")).toBe(true);
    expect(next.elements.some((e) => e.id.startsWith("shell_"))).toBe(true);
    expect(next.elements.filter((e) => e.id.startsWith("skel_"))).toHaveLength(4);
  });

  it("refreshes skeleton elements on regenerate without removing user nodes", () => {
    const withPriorSkeleton = applyRoomSkeletonToLayout(DEFAULT_ROOM_LAYOUT, sampleSkeleton);
    const userNode = { id: "ly_custom", kind: "puzzle_node" as const, label: "Custom node", xM: 2, yM: 2 };
    const edited = { ...withPriorSkeleton, elements: [...withPriorSkeleton.elements, userNode] };
    const regenSkeleton: RoomSkeleton = {
      ...sampleSkeleton,
      zones: sampleSkeleton.zones.slice(0, 3),
    };
    const next = applyRoomSkeletonToLayout(edited, regenSkeleton);
    expect(next.elements.some((e) => e.id === "ly_custom")).toBe(true);
    expect(next.elements.filter((e) => e.id.startsWith("skel_"))).toHaveLength(3);
  });
});
