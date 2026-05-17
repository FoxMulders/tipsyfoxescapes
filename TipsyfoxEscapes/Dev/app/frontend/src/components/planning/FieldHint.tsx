import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function FieldHint({
  label,
  required,
  tooltip,
  invalid,
  htmlFor,
  children,
}: {
  label: string;
  tooltip?: string;
  required?: boolean;
  invalid?: boolean;
  htmlFor?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", invalid && "rounded-md p-1 ring-1 ring-destructive/60")}>
      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="cursor-default">
            {label}
            {required ? <span className="ml-0.5 text-destructive" aria-hidden="true">*</span> : null}
          </label>
        ) : (
          <span>
            {label}
            {required ? <span className="ml-0.5 text-destructive" aria-hidden="true">*</span> : null}
          </span>
        )}
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`More about ${label}`}
              >
                <CircleHelp className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {children}
    </div>
  );
}
