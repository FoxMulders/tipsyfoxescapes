import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NumberCounterProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
  "aria-label"?: string;
};

export function NumberCounter({
  id,
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  invalid,
  "aria-label": ariaLabel,
}: NumberCounterProps) {
  const parsed = Number.parseInt(value, 10);
  const current = Number.isFinite(parsed) ? parsed : min;

  const setClamped = (next: number) => {
    onChange(String(Math.min(max, Math.max(min, next))));
  };

  return (
    <div className={cn("number-counter inline-flex items-center gap-1", invalid && "number-counter--invalid")}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        aria-label={`Decrease ${ariaLabel ?? "value"}`}
        disabled={current <= min}
        onClick={() => setClamped(current - step)}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </Button>
      <span
        id={id}
        className="number-counter-value min-w-[2.75rem] text-center text-sm font-semibold tabular-nums"
        aria-live="polite"
        aria-label={ariaLabel}
      >
        {value.trim() || min}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0"
        aria-label={`Increase ${ariaLabel ?? "value"}`}
        disabled={current >= max}
        onClick={() => setClamped(current + step)}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
