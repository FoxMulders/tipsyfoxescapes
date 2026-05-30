import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WORKSPACE_STEPS, type WorkspaceStepId } from "./workspaceSteps";

type WorkspaceShellProps = {
  activeStep: WorkspaceStepId;
  onStepChange: (step: WorkspaceStepId) => void;
  leftPanel: ReactNode;
  centerCanvas: ReactNode;
  rightPanel: ReactNode;
  mobileLeftOpen: boolean;
  onMobileLeftOpenChange: (open: boolean) => void;
  className?: string;
};

export function WorkspaceShell({
  activeStep,
  onStepChange,
  leftPanel,
  centerCanvas,
  rightPanel,
  mobileLeftOpen,
  onMobileLeftOpenChange,
  className,
}: WorkspaceShellProps) {
  return (
    <div
      className={cn(
        "workspace-shell flex h-[calc(100vh-var(--app-top-nav-height,0px))] max-h-[calc(100vh-var(--app-top-nav-height,0px))] w-full flex-col overflow-hidden bg-slate-950",
        className,
      )}
    >
      <header className="workspace-shell__header flex h-[60px] shrink-0 items-center gap-3 border-b border-slate-800/90 bg-slate-950/95 px-3 md:px-4">
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="Workspace steps">
          {WORKSPACE_STEPS.map((step, index) => {
            const active = step.id === activeStep;
            return (
              <div key={step.id} className="flex shrink-0 items-center gap-1">
                {index > 0 ? <span className="hidden text-slate-600 sm:inline" aria-hidden="true">→</span> : null}
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors sm:px-3 sm:text-sm",
                    active
                      ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/35"
                      : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200",
                  )}
                  aria-current={active ? "step" : undefined}
                  onClick={() => onStepChange(step.id)}
                >
                  <span className="sm:hidden">{step.index}</span>
                  <span className="hidden sm:inline">{step.shortLabel}</span>
                </button>
              </div>
            );
          })}
        </nav>
        <button
          type="button"
          className="lg:hidden shrink-0 rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200"
          onClick={() => onMobileLeftOpenChange(!mobileLeftOpen)}
        >
          {mobileLeftOpen ? "Hide panel" : "Settings"}
        </button>
      </header>

      <div className="workspace-shell__body relative min-h-0 flex-1">
        {/* Desktop grid */}
        <div className="hidden h-full min-h-0 lg:grid lg:grid-cols-[320px_1fr_360px] lg:gap-2 lg:p-2">
          <aside className="workspace-shell__left min-h-0 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/40 p-2">
            {leftPanel}
          </aside>
          <main className="workspace-shell__center min-h-0 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950">
            {centerCanvas}
          </main>
          <aside className="workspace-shell__right min-h-0 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/40">
            {rightPanel}
          </aside>
        </div>

        {/* Mobile / tablet: full-bleed canvas */}
        <div className="absolute inset-0 lg:hidden">{centerCanvas}</div>

        {/* Mobile bottom sheet — left wizard */}
        <div
          className={cn(
            "workspace-mobile-sheet pointer-events-none absolute inset-x-0 bottom-0 z-[60] lg:hidden",
            mobileLeftOpen && "pointer-events-auto",
          )}
        >
          <div
            className={cn(
              "max-h-[min(72vh,520px)] translate-y-full rounded-t-2xl border border-slate-700/80 bg-slate-950/98 shadow-2xl transition-transform duration-300 ease-out",
              mobileLeftOpen && "translate-y-0",
            )}
          >
            <div className="flex items-center justify-center py-2">
              <div className="h-1 w-10 rounded-full bg-slate-600" aria-hidden="true" />
            </div>
            <div className="max-h-[calc(min(72vh,520px)-2rem)] overflow-auto px-3 pb-4 pt-1">{leftPanel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
