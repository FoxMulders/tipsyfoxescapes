import type { HardwareProfile } from "./contracts.js";

export type RoomZone = {
  zone_id: string;
  name: string;
  primary_player_action: string;
  suggested_hardware_profile?: HardwareProfile;
};

/** Step 0 — room flow skeleton before per-puzzle compilation. */
export type RoomSkeleton = {
  flow_pattern: "linear_4zone" | "multilinear" | "nonlinear_open";
  zones: RoomZone[];
  flow_summary: string;
};
