import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "App.tsx");
let s = fs.readFileSync(appPath, "utf8");

const topNavBlock = `      <TopNavBar
        brandName={BRAND_NAME}
        authName={authUser.name}
        authEmail={authUser.email}
        authProviderLabel={AUTH_PROVIDER_LABELS[authUser.provider]}
        appView={appView}
        onAppViewChange={setAppView}
        onSignOut={signOut}
        onOpenSnapshot={appView === "builder" ? () => setSnapshotOpen(true) : undefined}
        showSnapshot={appView === "builder"}
        themeName={selectedTheme?.name}
        puzzleCount={puzzles.length}
      />
      <PlanningSnapshotSheet
        open={snapshotOpen}
        onOpenChange={setSnapshotOpen}
        playersConcurrent={playersConcurrent}
        participantsTotal={participantsTotal}
        sessionDurationMinutes={sessionDurationMinutes}
        environmentType={environmentType}
        eventType={eventType}
        availableItems={availableItems}
        roomDifficulty={roomDifficulty}
        themeMustMatchEnvironment={themeMustMatchEnvironment}
        venueBuildType={venueBuildType}
        youthAddOnEnabled={youthAddOnEnabled}
        themeLabel={
          themePath === "custom"
            ? customThemeName.trim() || "Custom theme"
            : selectedTheme?.name ?? (selectedThemeId ? "Theme selected" : "Not selected")
        }
        mainPuzzleCount={mainTrackPuzzles.length}
        plannerTarget={plannerMainPuzzleTarget}
        sessionSyncing={planningSyncing}
        setPlayersConcurrent={setPlayersConcurrent}
        setParticipantsTotal={setParticipantsTotal}
        setSessionDurationMinutes={setSessionDurationMinutes}
        setEnvironmentType={setEnvironmentType}
        setEventType={setEventType}
        setAvailableItems={setAvailableItems}
        setThemeMustMatchEnvironment={setThemeMustMatchEnvironment}
        setVenueBuildType={setVenueBuildType}
        setRoomDifficulty={setRoomDifficulty}
        setYouthAddOnEnabled={setYouthAddOnEnabled}
        setYouthAddOnGatesAdultFlow={setYouthAddOnGatesAdultFlow}
        setYouthAddOnAgeNote={setYouthAddOnAgeNote}
        youthAddOnGatesAdultFlow={youthAddOnGatesAdultFlow}
        youthAddOnAgeNote={youthAddOnAgeNote}
        validationFlags={validationFlags}
        clearValidation={(key) => setValidationFlags((current) => ({ ...current, [key]: false }))}
        commercialVenueContext={commercialVenueContext}
        eventSuggestions={dedupeStringsPreserveOrder([...EVENT_CONTEXT_PRESETS, ...(inputHistory.eventType ?? [])])}
        itemHistory={inputHistory.availableItems ?? []}
        propPresetLabels={propPresetLabels}
      />
`;

const deckStart = s.indexOf('id="control-deck-studio"');
const deckSectionStart = s.lastIndexOf("<section", deckStart);
const deckEnd = s.indexOf('{appView === "account"', deckStart);
s = s.slice(0, deckSectionStart) + topNavBlock + s.slice(deckEnd);

const ls = s.indexOf('<motion className="stage-layout stage-layout--hud">');
const ls2 = s.indexOf('<div className="stage-layout stage-layout--hud">');
const layoutStart = ls >= 0 ? ls : ls2;
const asideStart = s.indexOf('<aside className="stage-sidebar">', layoutStart);
const asideEnd = s.indexOf("</aside>", asideStart);
s = s.slice(0, layoutStart) + '<div className="builder-workspace">' + s.slice(asideEnd + "</aside>".length);

s = s.replace(
  `<p className="muted flow-map-label">Mission map</p>\n              `,
  "",
);

s = s.replace(
  `className="flow-shell-map-bar" aria-live="polite"`,
  `className="flow-shell-map-bar workspace-stepper" aria-live="polite"`,
);

s = s.replace(
  `<p className="muted">Step {wizardIndex + 1} of {wizardSteps.length}</p>
                  {flowWizardStep === "setup" ? null : <p><strong>{wizardLabel}</strong></p>}`,
  `{flowWizardStep === "setup" ? null : (
                    <>
                      <p className="muted">Step {wizardIndex + 1} of {wizardSteps.length}</p>
                      <p><strong>{wizardLabel}</strong></p>
                    </>
                  )}`,
);

s = s.replace(
  `puzzleEstimateHud={
                  <p className="puzzle-estimate-hud glass-hud-strip mx-auto max-w-xl" role="status">
                    Estimated main-track puzzle count:{" "}
                    <strong>
                      <RollingPuzzleEstimate target={plannerMainPuzzleTarget} />
                    </strong>
                    {youthAddOnEnabled && juniorAddOnPuzzleSlots > 0 ? (
                      <>
                        {" "}
                        · Junior add-on: <strong>+{juniorAddOnPuzzleSlots}</strong> puzzles
                      </>
                    ) : null}
                  </p>
                }`,
  `plannerMainPuzzleTarget={plannerMainPuzzleTarget}
                juniorAddOnPuzzleSlots={juniorAddOnPuzzleSlots}
                estimatePulseKey={estimatePulseKey}`,
);

const footerStart = s.lastIndexOf('<div className="page-footer-block">');
const footerEnd = s.indexOf("</main>", footerStart);
s =
  s.slice(0, footerStart) +
  '<GlobalFooter buildStamp={APP_BUILD_STAMP} showBuilderPolicy={appView === "builder"} />\n      ' +
  s.slice(footerEnd);

if (!s.includes("PlanningSidebar")) {
  s = s.replace(/import \{ PlanningSidebar \} from "@\/components\/planning\/PlanningSidebar";\r?\n/, "");
}

fs.writeFileSync(appPath, s);
console.log("patched");
