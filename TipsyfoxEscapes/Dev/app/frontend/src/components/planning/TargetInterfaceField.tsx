import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TargetInterface } from "../../../../shared/contracts";

type TargetInterfaceFieldProps = {
  value: TargetInterface;
  onChange: (value: TargetInterface) => void;
};

const OPTIONS: Array<{
  value: TargetInterface;
  title: string;
  description: string;
}> = [
  {
    value: "home_party",
    title: "Home Party",
    description: "Print-ready runbook + basic timer display",
  },
  {
    value: "commercial_venue",
    title: "Commercial Venue",
    description: "Live GM dashboard, staff checklists, analytics",
  },
];

export function TargetInterfaceField({ value, onChange }: TargetInterfaceFieldProps) {
  return (
    <fieldset className="target-interface-field">
      <legend className="text-sm font-medium text-foreground">Target interface</legend>
      <p className="muted mt-1 text-xs">
        Start here—this is your primary filter. Home Party optimizes print runbooks; Commercial Venue unlocks GM Live Console,
        staff checklists, and multi-display ops.
      </p>
      <div className="target-interface-cards" role="radiogroup" aria-label="Target interface">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn("target-interface-card", selected && "target-interface-card--selected")}
            >
              <input
                type="radio"
                name="target-interface"
                className="sr-only"
                checked={selected}
                onChange={() => onChange(opt.value)}
              />
              <span className="target-interface-card__title">
                {opt.title}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="target-interface-card__tip" aria-label={`More about ${opt.title}`} tabIndex={0}>
                      ?
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{opt.description}</TooltipContent>
                </Tooltip>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
