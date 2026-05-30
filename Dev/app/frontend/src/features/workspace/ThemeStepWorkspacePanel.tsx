import type { ReactNode } from "react";
import { ThemeGenerateButton } from "@/components/themes/ThemeGenerateButton";

type ThemeStepWorkspacePanelProps = {
  children: ReactNode;
  themeIdeasLoading: boolean;
  canGenerateNewThemes: boolean;
  themeGenerateDisabledTitle?: string;
  themesCount: number;
  onGenerateThemes: () => void;
  selectedThemeId: string;
  onContinueToPuzzles: () => void;
};

/** Theme cards + controls for the persistent workspace left panel. */
export function ThemeStepWorkspacePanel({
  children,
  themeIdeasLoading,
  canGenerateNewThemes,
  themeGenerateDisabledTitle,
  themesCount,
  onGenerateThemes,
  selectedThemeId,
  onContinueToPuzzles,
}: ThemeStepWorkspacePanelProps) {
  return (
    <div className="workspace-themes-extra flex flex-col gap-3">
      <ThemeGenerateButton
        themesCount={themesCount}
        loading={themeIdeasLoading}
        disabled={!canGenerateNewThemes}
        disabledTitle={themeGenerateDisabledTitle}
        onGenerate={onGenerateThemes}
      />
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {selectedThemeId ? (
        <button type="button" className="primary-btn w-full shrink-0" onClick={onContinueToPuzzles}>
          Continue to puzzle builder →
        </button>
      ) : null}
    </div>
  );
}
