import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FieldHint } from "@/components/planning/FieldHint";
import type { VenueBuildType } from "../../../../shared/contracts";

const VENUE_OPTIONS: { value: VenueBuildType; label: string; tooltip: string }[] = [
  {
    value: "prebuilt_space",
    label: "Prebuilt space (home, office, rec room, etc.)",
    tooltip:
      "You are running the game in an existing furnished space. Puzzles and themes assume props and furniture you already have on hand.",
  },
  {
    value: "professional_empty",
    label: "Professional empty room (build from scratch)",
    tooltip:
      "You are fitting out a commercial escape room shell. The system will suggest fixtures to install (locks, stations, lighting, GM desk) and bias copy toward purpose-built installs.",
  },
];

export const EMPTY_ROOM_INSTALL_CHECKLIST = [
  "Entry & briefing zone — waiver table, visible timer, coat hooks, briefing monitor or printed rules.",
  "Lock & latch infrastructure — hasp boxes, mag locks on strike plates you install (not real egress hardware), resettable padlocks.",
  "Prop & puzzle stations — 2–4 dedicated work surfaces sized for concurrent groups; plan cable routes.",
  "Clue surfaces — pin boards, whiteboards, or backlit frames; one central recap zone for the team.",
  "Lighting — dimmable zones, accent spots on puzzle faces; keep code-compliant egress lighting untouched.",
  "Control desk / GM position — sightlines to major zones, hint delivery, reset checklist, spare batteries.",
  "Electronics bench — Arduino/MCU prototypes on a service shelf; labeled harnesses before in-set mounting.",
  "Audio & ambience — hidden speakers for tone; volume limits so adjacent games are not spoiled.",
  "Safety & operations — clear fire exits, cable covers, first-aid kit, prop quarantine for resets.",
  "Finish pass — theme dressing, signage separating gameplay from staff-only areas.",
] as const;

type VenueBuildTypeFieldProps = {
  value: VenueBuildType;
  onChange: (v: VenueBuildType) => void;
  environmentType?: string;
  compact?: boolean;
};

export function VenueBuildTypeField({ value, onChange, environmentType, compact }: VenueBuildTypeFieldProps) {
  const envTrim = environmentType?.trim() ?? "";

  return (
    <div className="space-y-3">
      <FieldHint
        label="Venue type"
        tooltip="Choose whether you are fitting out an empty commercial game space or running in an existing furnished room. This steers install checklists and generator copy."
      >
        <fieldset className="space-y-2">
          <legend className="sr-only">Venue type</legend>
          {VENUE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-800/50 bg-card/20 p-3 text-sm backdrop-blur-md has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="venue-build-type"
                className="mt-1"
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-foreground">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{opt.tooltip}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </FieldHint>

      {value === "professional_empty" ? (
        <Accordion type="single" collapsible className="rounded-md border border-slate-800/50 bg-card/30 px-4 backdrop-blur-md">
          <AccordionItem value="empty-room-checklist">
            <AccordionTrigger className={compact ? "py-2 text-xs" : undefined}>
              What to install in your empty room
            </AccordionTrigger>
            <AccordionContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Starter checklist for a ticketed escape room venue.
                {envTrim ? (
                  <>
                    {" "}
                    Environment type <strong className="text-foreground">{envTrim}</strong> still guides theme fiction
                    even though you are building the shell from scratch.
                  </>
                ) : (
                  " Pick an environment below so themes match your intended fiction."
                )}
              </p>
              <ul className="list-inside list-decimal space-y-2 text-sm text-foreground">
                {EMPTY_ROOM_INSTALL_CHECKLIST.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
    </div>
  );
}


