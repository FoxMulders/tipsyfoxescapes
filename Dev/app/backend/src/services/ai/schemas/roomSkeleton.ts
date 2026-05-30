import { z } from "zod";
import { HardwareProfileSchema } from "../../../hardwareProfile.js";

export const RoomZoneSchema = z.object({
  zone_id: z.string().min(1).describe("Stable snake_case id for this physical room (e.g. starting_cell, main_reactor)."),
  name: z
    .string()
    .min(2)
    .describe(
      "Literal physical room name in the building (e.g. 'Starting Cell', 'Main Reactor', 'Hidden Vent'). NOT narrative pacing beats.",
    ),
  primary_player_action: z
    .string()
    .min(10)
    .describe(
      "Physical activity players perform inside this room (search shelves, align a panel, crawl through vent) — not story act labels.",
    ),
  suggested_hardware_profile: HardwareProfileSchema.optional(),
});

/** Step 0 — room flow skeleton before per-puzzle compilation. */
export const RoomSkeletonSchema = z.object({
  flow_pattern: z.enum(["linear_4zone", "multilinear", "nonlinear_open"]),
  zones: z
    .array(RoomZoneSchema)
    .min(2)
    .max(6)
    .describe("Physical rooms only — each entry is buildable square footage, not a narrative beat."),
  flow_summary: z
    .string()
    .min(20)
    .describe("One paragraph describing how players move through physical rooms left-to-right / branch — no act structure."),
});

export type RoomSkeleton = z.infer<typeof RoomSkeletonSchema>;
