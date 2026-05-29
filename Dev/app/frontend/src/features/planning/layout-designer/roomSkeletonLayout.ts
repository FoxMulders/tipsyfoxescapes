import type { HardwareProfile } from "../../../../../shared/contracts";
import type { RoomSkeleton, RoomZone } from "../../../../../shared/roomSkeleton";
import type { RoomLayoutDocument, RoomLayoutElement, RoomLayoutElementKind } from "../../../../../shared/roomLayout";
import { snapMeters } from "./layoutScene";

const SKELETON_ID_PREFIX = "skel_";
const SHELL_ID_PREFIX = "shell_";
const SNAP_M = 0.5;

const ELECTRONIC_PROFILES = new Set<HardwareProfile>([
  "button_led",
  "buzzer",
  "touch",
  "rfid",
  "relay_maglock",
  "analog_sensor",
]);

export function skeletonElementId(zoneId: string): string {
  const safe = zoneId.trim().replace(/[^\w-]+/g, "_").slice(0, 64);
  return `${SKELETON_ID_PREFIX}${safe || "zone"}`;
}

export function layoutHasOnlyPresetShell(layout: RoomLayoutDocument): boolean {
  if (layout.elements.length === 0) return true;
  return layout.elements.every((e) => e.id.startsWith(SHELL_ID_PREFIX));
}

function zoneElementKind(zone: RoomZone, index: number, total: number): RoomLayoutElementKind {
  if (index === 0) return "airlock";
  if (index === total - 1 && total > 1) return "finale";
  if (zone.suggested_hardware_profile && ELECTRONIC_PROFILES.has(zone.suggested_hardware_profile)) {
    return "tech_pit";
  }
  return "puzzle_node";
}

function zonePositions(
  count: number,
  flowPattern: RoomSkeleton["flow_pattern"],
  roomWidthM: number,
  roomHeightM: number,
): { xM: number; yM: number }[] {
  const margin = 1;
  const positions: { xM: number; yM: number }[] = [];

  if (flowPattern === "nonlinear_open") {
    const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
    const rows = Math.ceil(count / cols);
    const cellW = (roomWidthM - margin * 2) / cols;
    const cellH = (roomHeightM - margin * 2) / rows;
    for (let i = 0; i < count; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({
        xM: margin + cellW * (col + 0.5),
        yM: margin + cellH * (row + 0.5),
      });
    }
    return positions;
  }

  const usableW = Math.max(0.5, roomWidthM - margin * 2);
  const step = count > 1 ? usableW / (count - 1) : 0;
  for (let i = 0; i < count; i += 1) {
    const yRatio = flowPattern === "multilinear" ? (i % 2 === 0 ? 0.35 : 0.65) : 0.5;
    positions.push({
      xM: margin + step * i,
      yM: roomHeightM * yRatio,
    });
  }
  return positions;
}

function clampPosition(xM: number, yM: number, roomWidthM: number, roomHeightM: number): { xM: number; yM: number } {
  return {
    xM: snapMeters(Math.max(0.5, Math.min(roomWidthM - 0.5, xM)), SNAP_M, true),
    yM: snapMeters(Math.max(0.5, Math.min(roomHeightM - 0.5, yM)), SNAP_M, true),
  };
}

export function roomSkeletonZonesToElements(
  skeleton: RoomSkeleton,
  layout: RoomLayoutDocument,
): RoomLayoutElement[] {
  const zones = skeleton.zones.filter((z) => z.zone_id.trim() && z.name.trim());
  if (zones.length === 0) return [];

  const positions = zonePositions(zones.length, skeleton.flow_pattern, layout.roomWidthM, layout.roomHeightM);

  return zones.map((zone, index) => {
    const pos = clampPosition(positions[index]?.xM ?? 1, positions[index]?.yM ?? 1, layout.roomWidthM, layout.roomHeightM);
    const label = zone.name.trim().slice(0, 120);
    return {
      id: skeletonElementId(zone.zone_id),
      kind: zoneElementKind(zone, index, zones.length),
      label,
      xM: pos.xM,
      yM: pos.yM,
      meta: { skeletonZoneId: zone.zone_id },
    };
  });
}

/** Merge AI skeleton zones onto the blueprint without wiping manual placements. */
export function applyRoomSkeletonToLayout(
  layout: RoomLayoutDocument,
  skeleton: RoomSkeleton,
): RoomLayoutDocument {
  const skeletonElements = roomSkeletonZonesToElements(skeleton, layout);
  if (skeletonElements.length === 0) return layout;

  const dropPresetShell = layoutHasOnlyPresetShell(layout);
  const preserved = layout.elements.filter((e) => {
    if (e.id.startsWith(SKELETON_ID_PREFIX)) return false;
    if (dropPresetShell && e.id.startsWith(SHELL_ID_PREFIX)) return false;
    return true;
  });

  return {
    ...layout,
    elements: [...preserved, ...skeletonElements],
  };
}

/** Fallback spatial layout when Master Generator skeleton is unavailable (static catalog / no API key). */
export function buildHeuristicRoomSkeleton(themeName: string, commercialVenue: boolean): RoomSkeleton {
  const zones = [
    {
      zone_id: "entry",
      name: "Entry briefing",
      primary_player_action: "Receive the mission and orient players to the space.",
    },
    {
      zone_id: "search",
      name: "Search & discovery",
      primary_player_action: "Find hidden clues in props and set dressing.",
    },
    {
      zone_id: "core",
      name: "Core challenge",
      primary_player_action: "Solve the main logic or physical beat as a team.",
    },
    {
      zone_id: "finale",
      name: "Finale release",
      primary_player_action: "Complete the escape or unlock the final door.",
    },
  ];
  return {
    flow_pattern: commercialVenue ? "multilinear" : "linear_4zone",
    zones,
    flow_summary: `Estimated ${commercialVenue ? "multilinear" : "linear"} flow for “${themeName.trim() || "your theme"}”. AI skeleton zones replace this when OpenAI is configured.`,
  };
}
