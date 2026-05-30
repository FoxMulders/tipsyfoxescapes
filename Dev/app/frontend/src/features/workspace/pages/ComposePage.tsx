import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ComposeRoomDetailsStep } from "../ComposeRoomDetailsStep";
import { useExperienceDesigner, type ComposeActiveStep } from "../ExperienceDesignerContext";

function ComposeStepIndicator({ activeStep }: { activeStep: ComposeActiveStep }) {
  return (
    <nav className="compose-step-indicator" aria-label="Compose steps">
      <span
        className={`compose-step-indicator__item${activeStep === "room-details" ? " compose-step-indicator__item--active" : " compose-step-indicator__item--complete"}`}
        aria-current={activeStep === "room-details" ? "step" : undefined}
      >
        1. Room details
      </span>
      <span className="compose-step-indicator__sep" aria-hidden="true">
        →
      </span>
      <span
        className={`compose-step-indicator__item${activeStep === "themes" ? " compose-step-indicator__item--active" : " compose-step-indicator__item--pending"}`}
        aria-current={activeStep === "themes" ? "step" : undefined}
      >
        2. Choose theme
      </span>
    </nav>
  );
}

export function ComposePage() {
  const {
    composeActiveStep,
    setComposeActiveStep,
    composeThemeContent,
    simpleThemeView,
    setSimpleThemeView,
    selectedThemeId,
    canGenerateRoom,
    onGenerateRoom,
    onGenerateThemes,
    onSaveRoomDetails,
    onTryValidateRoomDetails,
    onPlanningIncomplete,
    eventSuggestions,
    themesCount,
    themeIdeasLoading,
    canGenerateNewThemes,
    themePath,
    isGenerating,
  } = useExperienceDesigner();

  const themeSelected = Boolean(selectedThemeId.trim());
  const autoThemesRequestedRef = useRef(false);
  const prevThemePathRef = useRef(themePath);

  const handleGenerateThemes = onGenerateThemes;

  useEffect(() => {
    if (prevThemePathRef.current !== themePath) {
      autoThemesRequestedRef.current = false;
      prevThemePathRef.current = themePath;
    }
  }, [themePath]);

  useEffect(() => {
    if (composeActiveStep !== "themes") return;
    if (themesCount > 0) return;
    if (themePath === "custom") return;
    if (themeIdeasLoading || !canGenerateNewThemes) return;
    if (autoThemesRequestedRef.current) return;

    autoThemesRequestedRef.current = true;
    handleGenerateThemes();
  }, [composeActiveStep, themesCount, themePath, themeIdeasLoading, canGenerateNewThemes, handleGenerateThemes]);

  const handleSaveAndContinue = async (): Promise<boolean> => {
    const saved = await onSaveRoomDetails();
    if (saved) {
      setComposeActiveStep("themes");
    }
    return saved;
  };

  return (
    <div className="experience-step experience-step--scroll experience-step--compose h-full">
      <ComposeStepIndicator activeStep={composeActiveStep} />

      {composeActiveStep === "room-details" ? (
        <div className="compose-step-panel compose-step-panel--room-details">
          <ComposeRoomDetailsStep
            eventSuggestions={eventSuggestions}
            onTryValidate={onTryValidateRoomDetails}
            onValidationFailed={onPlanningIncomplete}
            onNext={handleSaveAndContinue}
          />
        </div>
      ) : (
        <div className="compose-step-panel compose-step-panel--themes">
          <div className="experience-compose-hero">
            <div className="experience-compose-hero__actions">
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setComposeActiveStep("room-details")}>
                ← Edit room details
              </Button>
            </div>
            <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-50 md:text-3xl">Choose your theme</h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400 md:text-base">
              Pick one direction for your escape room, then hit <strong className="text-cyan-400/90">Generate room</strong> when
              you are ready — we will draft zones, puzzles, and story in one pass.
            </p>
            <div className="mt-4 inline-flex rounded-md border border-white/10 p-0.5" role="group" aria-label="Theme view">
              <Button
                type="button"
                size="sm"
                variant={simpleThemeView ? "default" : "ghost"}
                className="h-8"
                onClick={() => setSimpleThemeView(true)}
              >
                Simple
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!simpleThemeView ? "default" : "ghost"}
                className="h-8"
                onClick={() => setSimpleThemeView(false)}
              >
                Full brief
              </Button>
            </div>
          </div>
          <div className="experience-compose-grid">{composeThemeContent ?? <ComposeThemeSkeleton />}</div>
          {themeSelected ? (
            <div className="experience-compose-footer">
              <Button
                type="button"
                size="lg"
                className="experience-compose-footer__cta"
                disabled={!canGenerateRoom || isGenerating}
                aria-busy={isGenerating}
                onClick={onGenerateRoom}
              >
                {isGenerating ? "Generating…" : "Generate room →"}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ComposeThemeSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="theme-loading-skeleton glass-panel h-48 w-full rounded-lg bg-transparent" />
      ))}
    </>
  );
}
