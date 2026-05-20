import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FlowStepIntroProps = {
  stepIndex: number;
  stepTotal: number;
  title: string;
  helper?: string | null;
  actions?: ReactNode;
  className?: string;
};

export function FlowStepIntro({
  stepIndex,
  stepTotal,
  title,
  helper,
  actions,
  className,
}: FlowStepIntroProps) {
  return (
    <section
      className={cn("flow-step-intro-card", className)}
      aria-label={`Step ${stepIndex + 1}: ${title}`}
    >
      <div className="flow-step-intro-card__copy">
        <p className="flow-step-intro-card__eyebrow mb-1 text-[0.72rem] font-bold uppercase tracking-widest text-slate-400">
          Step {stepIndex + 1} of {stepTotal}
        </p>
        <h2 className="flow-step-intro-card__title m-0 text-xl font-extrabold leading-tight text-slate-50">
          {title}
        </h2>
        {helper ? (
          <p className="flow-step-intro-card__helper mt-2 max-w-3xl text-sm leading-relaxed text-slate-300/90">
            {helper}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flow-step-intro-card__actions shrink-0">{actions}</div> : null}
    </section>
  );
}
