import { OpenAiOpsBanner } from "@/features/planning/components/OpenAiOpsBanner";
import { ThemeCuratedCard } from "@/components/planning/ThemeCuratedCard";
import { ThemeGenerateButton } from "@/components/themes/ThemeGenerateButton";
import { GenerationProgressIndicator } from "@/components/generation/GenerationProgressIndicator";
import { THEME_GENERATION_PHASES } from "@/components/generation/GenerationProgressPhases";
import { Skeleton } from "@/components/ui/skeleton";
import type { ThemeCuratedCardTheme } from "@/components/planning/ThemeCuratedCard";

export type ExperienceThemeSectionProps = {
  serverOpenAiConfigured: boolean | null;
  browserAiReady: boolean;
  themePath: "generated" | "custom" | null;
  themes: ThemeCuratedCardTheme[];
  themeIdeasLoading: boolean;
  themeSessionExpiredNotice: string;
  workspaceSessionExpiredOpen: boolean;
  canGenerateNewThemes: boolean;
  themeGenerateDisabledTitle?: string;
  onGenerateThemes: () => void;
  selectedThemeId: string;
  simpleThemeView: boolean;
  simpleRoomSetup: boolean;
  hasFullCatalogAccess: boolean;
  validationFlagsSelectedTheme: boolean;
  hoverPreviewThemeId: string | null;
  themePlanningContextLine: string;
  resolveThemeTldr: (theme: ThemeCuratedCardTheme) => string;
  onThemeSelect: (id: string) => void;
  onHoverTheme: (id: string | null) => void;
  onUseCustomTheme: () => void;
  onBrowseGenerated: () => void;
  customThemeName: string;
  customThemeDescription: string;
  customThemeSaving: boolean;
  onCustomThemeNameChange: (v: string) => void;
  onCustomThemeDescriptionChange: (v: string) => void;
  onAddCustomTheme: () => void;
  customThemeCoachMessages: unknown[];
  customThemeCoachBusy: boolean;
  customThemeCoachError: string;
  coachBrowserAiReady: boolean;
  authToken: string;
  customThemeCoachPrereqsOk: boolean;
  coachCoverage: unknown;
  onStartCoach: () => void;
  onSelectCoachOption: (option: string) => void;
  onSynthesizeCoach: () => void;
  onClearCoach: () => void;
  briefPolishBusy: boolean;
  onRunPolishBrief: () => void;
  ThemeDescriptionBlocks: React.ComponentType<{ text: string }>;
  inputHistoryCustomThemeNames: string[];
};

export function ExperienceThemeSection(props: ExperienceThemeSectionProps) {
  const {
    serverOpenAiConfigured,
    browserAiReady,
    themePath,
    themes,
    themeIdeasLoading,
    themeSessionExpiredNotice,
    workspaceSessionExpiredOpen,
    canGenerateNewThemes,
    themeGenerateDisabledTitle,
    onGenerateThemes,
    selectedThemeId,
    simpleThemeView,
    validationFlagsSelectedTheme,
    hoverPreviewThemeId,
    themePlanningContextLine,
    resolveThemeTldr,
    onThemeSelect,
    onHoverTheme,
    onUseCustomTheme,
    onBrowseGenerated,
    customThemeName,
    customThemeDescription,
    customThemeSaving,
    onCustomThemeNameChange,
    onCustomThemeDescriptionChange,
    onAddCustomTheme,
    ThemeDescriptionBlocks,
    hasFullCatalogAccess,
  } = props;

  if (themeIdeasLoading && themes.length === 0) {
    return (
      <div className="col-span-full space-y-3">
        <GenerationProgressIndicator
          active
          phases={THEME_GENERATION_PHASES}
          className="generation-progress-indicator--surface"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg bg-slate-800/60" />
          ))}
        </div>
      </div>
    );
  }

  const themeListLoading = themeIdeasLoading && themes.length > 0;

  return (
    <div className="col-span-full space-y-4">
      {themeIdeasLoading ? (
        <GenerationProgressIndicator active phases={THEME_GENERATION_PHASES} className="generation-progress-indicator--surface" />
      ) : null}
      <OpenAiOpsBanner configured={serverOpenAiConfigured} browserAiReady={browserAiReady} />
      {hasFullCatalogAccess ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="secondary-btn" onClick={onUseCustomTheme}>
            Use your own theme
          </button>
          {themePath === "custom" ? (
            <button type="button" className="secondary-btn" onClick={onBrowseGenerated}>
              Browse generated themes
            </button>
          ) : null}
        </div>
      ) : null}
      {themePath === "custom" ? (
        <div className="glass-panel rounded-lg p-4">
          <label className="block text-sm font-medium text-slate-200">
            Theme name
            <input
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
              value={customThemeName}
              onChange={(e) => onCustomThemeNameChange(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-slate-200">
            Description
            <textarea
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
              rows={4}
              value={customThemeDescription}
              onChange={(e) => onCustomThemeDescriptionChange(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="primary-btn mt-3"
            disabled={customThemeSaving || !customThemeName.trim()}
            onClick={onAddCustomTheme}
          >
            {customThemeSaving ? "Saving…" : "Add and select custom theme"}
          </button>
        </div>
      ) : (
        <>
          {themeSessionExpiredNotice && !workspaceSessionExpiredOpen ? (
            <p className="text-sm text-amber-300" role="alert">
              {themeSessionExpiredNotice}
            </p>
          ) : null}
          {themes.length === 0 && !workspaceSessionExpiredOpen ? (
            <div className="text-center">
              <p className="muted mb-3">No theme ideas yet.</p>
              <ThemeGenerateButton
                themesCount={themes.length}
                loading={themeIdeasLoading}
                disabled={!canGenerateNewThemes}
                disabledTitle={themeGenerateDisabledTitle}
                onGenerate={onGenerateThemes}
              />
            </div>
          ) : null}
          {themes.length > 0 ? (
            <>
              <ThemeGenerateButton
                themesCount={themes.length}
                loading={themeIdeasLoading}
                disabled={!canGenerateNewThemes}
                disabledTitle={themeGenerateDisabledTitle}
                onGenerate={onGenerateThemes}
              />
              <ul
                className={`theme-ideas-list${validationFlagsSelectedTheme ? " invalid-list" : ""}${themeListLoading ? " theme-ideas-list--refreshing" : ""}`}
              >
                {themes.map((theme) => (
                  <ThemeCuratedCard
                    key={theme.id}
                    theme={theme}
                    tldr={resolveThemeTldr(theme)}
                    selected={selectedThemeId === theme.id}
                    preview={hoverPreviewThemeId === theme.id}
                    simpleView={simpleThemeView}
                    planningContext={themePlanningContextLine}
                    onSelect={() => onThemeSelect(theme.id)}
                    onPointerEnter={() => onHoverTheme(theme.id)}
                    onPointerLeave={() => onHoverTheme(null)}
                    fullBrief={!simpleThemeView ? <ThemeDescriptionBlocks text={theme.description} /> : undefined}
                  />
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
