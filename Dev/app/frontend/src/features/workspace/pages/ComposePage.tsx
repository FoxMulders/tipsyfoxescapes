import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useExperienceDesigner } from "../ExperienceDesignerContext";

export function ComposePage() {
  const {
    composeThemeContent,
    simpleThemeView,
    setSimpleThemeView,
    selectedThemeId,
    canGenerateRoom,
    generateRoomDisabledReason,
    onGenerateRoom,
    puzzlesGenerating,
  } = useExperienceDesigner();

  const themeSelected = Boolean(selectedThemeId.trim());

  return (
    <div className="experience-step experience-step--scroll experience-step--compose h-full">
      <div className="experience-compose-hero">
        <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-50 md:text-3xl">Choose your theme</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400 md:text-base">
          Pick one direction for your escape room. When a theme is selected, use <strong className="text-cyan-400/90">Generate room</strong>{" "}
          below (or in the header) to draft zones, puzzles, and story in one pass.
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
        <div className="experience-compose-footer" role="group" aria-label="Generate room">
          {!canGenerateRoom && generateRoomDisabledReason ? (
            <p className="experience-compose-footer__hint muted">{generateRoomDisabledReason}</p>
          ) : (
            <p className="experience-compose-footer__hint muted">Theme selected — generate when you are ready. You stay on this step until you confirm.</p>
          )}
          <Button
            type="button"
            size="lg"
            className="experience-compose-footer__cta"
            disabled={!canGenerateRoom || puzzlesGenerating}
            title={generateRoomDisabledReason}
            onClick={onGenerateRoom}
          >
            {puzzlesGenerating ? "Generating…" : "Generate room →"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ComposeThemeSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-48 w-full rounded-lg bg-slate-800/60" />
      ))}
    </>
  );
}
