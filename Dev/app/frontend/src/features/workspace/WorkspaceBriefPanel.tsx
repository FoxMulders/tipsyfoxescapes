import type { ReactNode } from "react";
import type { LayoutStylePreference } from "./workspaceSteps";
import { LAYOUT_STYLE_OPTIONS } from "./workspaceSteps";

type WorkspaceBriefPanelProps = {
  layoutStyle: LayoutStylePreference;
  onLayoutStyleChange: (style: LayoutStylePreference) => void;
  themeContent?: ReactNode;
  venueSummary?: string;
  canGenerate: boolean;
  generateDisabledReason?: string;
  generating: boolean;
  onGenerateRoom: () => void;
};

export function WorkspaceBriefPanel({
  layoutStyle,
  onLayoutStyleChange,
  themeContent,
  venueSummary,
  canGenerate,
  generateDisabledReason,
  generating,
  onGenerateRoom,
}: WorkspaceBriefPanelProps) {
  return (
    <div className="workspace-brief-panel flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header>
        <h2 className="m-0 text-base font-bold text-slate-50">The Brief</h2>
        <p className="mt-1 mb-0 text-sm text-slate-400">
          Set venue constraints, pick a theme, and choose a layout style. The blueprint visualizes after generation.
        </p>
      </header>

      {venueSummary ? (
        <p className="m-0 rounded-md border border-slate-700/80 bg-slate-900/50 px-2.5 py-2 text-xs text-slate-300">{venueSummary}</p>
      ) : null}

      <fieldset className="workspace-brief-fieldset m-0 min-w-0 border border-slate-700/70 p-2.5">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Layout style</legend>
        <div className="flex flex-col gap-1.5">
          {LAYOUT_STYLE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-start gap-2 text-sm text-slate-200">
              <input
                type="radio"
                name="layout-style"
                value={opt.value}
                checked={layoutStyle === opt.value}
                onChange={() => onLayoutStyleChange(opt.value)}
                className="mt-0.5"
              />
              <span>
                <strong className="font-semibold">{opt.label}</strong>
                <span className="mt-0.5 block text-xs text-slate-500">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="min-h-0 flex-1 overflow-auto border-t border-slate-800/80 pt-3">{themeContent}</div>

      <button
        type="button"
        className="primary-btn w-full shrink-0"
        disabled={!canGenerate || generating}
        title={generateDisabledReason}
        onClick={onGenerateRoom}
      >
        {generating ? "Generating room…" : "Generate room"}
      </button>
    </div>
  );
}
