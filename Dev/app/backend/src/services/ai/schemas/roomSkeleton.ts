import { z } from "zod";
import { HardwareProfileSchema } from "../../../hardwareProfile.js";

export const RoomZoneSchema = z.object({
  zone_id: z.string().min(1),
  name: z.string().min(2),
  primary_player_action: z.string().min(10),
  suggested_hardware_profile: HardwareProfileSchema.optional(),
});

/** Step 0 — room flow skeleton before per-puzzle compilation. */
export const RoomSkeletonSchema = z.object({
  flow_pattern: z.enum(["linear_4zone", "multilinear", "nonlinear_open"]),
  zones: z.array(RoomZoneSchema).min(2).max(6),
  flow_summary: z.string().min(20),
});

export type RoomSkeleton = z.infer<typeof RoomSkeletonSchema>;
