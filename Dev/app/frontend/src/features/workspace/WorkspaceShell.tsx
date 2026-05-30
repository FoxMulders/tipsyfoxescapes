import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, PanelLeft, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKSPACE_STEPS, type WorkspaceStepId } from "./workspaceSteps";
import { WorkspaceNavMenu, type WorkspaceNavMenuProps } from "./WorkspaceNavMenu";

const LEFT_OPEN_W = 320;
const LEFT_RAIL_W = 48;
const RIGHT_OPEN_W = 360;
const RIGHT_RAIL_W = 48;

type WorkspaceShellProps = {
  activeStep: WorkspaceStepId;
  onStepChange: (step: WorkspaceStepId) => void;
  leftPanel: ReactNode;
  centerCanvas: ReactNode;
  rightPanel: ReactNode;
  mobileLeftOpen: boolean;
  onMobileLeftOpenChange: (open: boolean) => void;
  onLayoutChange?: (revision: number) => void;
  navMenu?: WorkspaceNavMenuProps;
  /** Step 1 brief: hide canvas, inspector, and view toggles — form-only layout. */
  briefFocusMode?: boolean;
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
  onLayoutChange,
  navMenu,
  briefFocusMode = false,
  className,
}: WorkspaceShellProps) {
  const briefOnly = briefFocusMode && activeStep === "brief";
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [layoutRevision, setLayoutRevision] = useState(0);

  const bumpLayout = (): void => {
    setLayoutRevision((r) => {
      const next = r + 1;
      onLayoutChange?.(next);
      return next;
    });
  };

  const toggleLeft = (): void => {
    setLeftOpen((v) => !v);
    bumpLayout();
  };

  const toggleRight = (): void => {
    setRightOpen((v) => !v);
    bumpLayout();
  };

  const centerWithLayout = useMemo(
    () => (
      <div className="workspace-shell__center-inner h-full min-h-0" data-layout-revision={layoutRevision}>
        {centerCanvas}
      </div>
    ),
    [centerCanvas, layoutRevision],
  );

  return (
    <div
      className={cn(
        "workspace-shell flex h-[calc(100vh-var(--app-top-nav-height,0px))] max-h-[calc(100vh-var(--app-top-nav-height,0px))] w-full flex-col overflow-hidden bg-slate-950",
        briefOnly && "workspace-shell--brief-focus",
        className,
      )}
    >
      <header className="workspace-shell__header flex h-[60px] shrink-0 items-center gap-2 border-b border-slate-800/90 bg-slate-950/95 px-2 md:gap-3 md:px-4">
        {navMenu ? <WorkspaceNavMenu {...navMenu} /> : null}
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="Workspace steps">
          {WORKSPACE_STEPS.map((step, index) => {
            const active = step.id === activeStep;
            const disabled = Boolean(step.transient);
            return (
              <div key={step.id} className="flex shrink-0 items-center gap-1">
                {index > 0 ? <span className="hidden text-slate-600 sm:inline" aria-hidden="true">→</span> : null}
                <button
                  type="button"
                  disabled={disabled}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors sm:px-3 sm:text-sm",
                    active
                      ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/35"
                      : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200",
                    disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-slate-400",
                  )}
                  aria-current={active ? "step" : undefined}
                  onClick={() => !disabled && onStepChange(step.id)}
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
        {/* Desktop: flex columns with collapsible rails */}
        <div className="hidden h-full min-h-0 gap-2 p-2 lg:flex">
          <aside
            className={cn(
              "workspace-shell__left relative flex shrink-0 flex-col overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/40 transition-[width] duration-300 ease-out",
              leftOpen ? "p-2" : "items-center justify-center p-1",
              briefOnly && "min-w-0 flex-1",
            )}
            style={briefOnly ? undefined : { width: leftOpen ? LEFT_OPEN_W : LEFT_RAIL_W }}
          >
            {leftOpen ? <div className="min-h-0 flex-1 overflow-auto">{leftPanel}</div> : null}
            {!leftOpen ? (
              <button
                type="button"
                className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 hover:text-cyan-300"
                aria-label="Expand wizard panel"
                title="Expand wizard panel"
                onClick={toggleLeft}
              >
                <PanelLeft className="h-4 w-4" aria-hidden />
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
            {leftOpen ? (
              <button
                type="button"
                className="workspace-panel-toggle workspace-panel-toggle--left"
                aria-label="Collapse wizard panel"
                title="Collapse wizard panel"
                onClick={toggleLeft}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </aside>

          {!briefOnly ? (
            <main className="workspace-shell__center min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950">
              {centerWithLayout}
            </main>
          ) : null}

          {!briefOnly ? (
            <aside
              className={cn(
                "workspace-shell__right relative flex shrink-0 flex-col overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/40 transition-[width] duration-300 ease-out",
                rightOpen ? "" : "items-center justify-center p-1",
              )}
              style={{ width: rightOpen ? RIGHT_OPEN_W : RIGHT_RAIL_W }}
            >
              {rightOpen ? <div className="min-h-0 flex-1 overflow-auto">{rightPanel}</div> : null}
              {!rightOpen ? (
                <button
                  type="button"
                  className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 hover:text-cyan-300"
                  aria-label="Expand inspector panel"
                  title="Expand inspector panel"
                  onClick={toggleRight}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  <PanelRight className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
              {rightOpen ? (
                <button
                  type="button"
                  className="workspace-panel-toggle workspace-panel-toggle--right"
                  aria-label="Collapse inspector panel"
                  title="Collapse inspector panel"
                  onClick={toggleRight}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </aside>
          ) : null}
        </div>

        {/* Mobile / tablet: brief step shows form; later steps show canvas */}
        <div className={cn("absolute inset-0 lg:hidden", briefOnly && "overflow-auto p-2")}>
          {briefOnly ? leftPanel : centerCanvas}
        </div>

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
