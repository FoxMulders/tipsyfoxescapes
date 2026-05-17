import fs from "node:fs";

const path = new URL("../src/App.tsx", import.meta.url);
let s = fs.readFileSync(path, "utf8");
const start = '            {flowWizardStep === "setup" ? (';
const end = '{flowWizardStep === "themes" ? (';
const i0 = s.indexOf(start);
const i1 = s.indexOf(end, i0);
if (i0 < 0 || i1 < 0) {
  console.error("markers not found", { i0, i1 });
  process.exit(1);
}
const replacement = `${start}
              <RoomDetailsStep
                playersConcurrent={playersConcurrent}
                setPlayersConcurrent={setPlayersConcurrent}
                participantsTotal={participantsTotal}
                setParticipantsTotal={setParticipantsTotal}
                sessionDurationMinutes={sessionDurationMinutes}
                setSessionDurationMinutes={setSessionDurationMinutes}
                eventType={eventType}
                setEventType={setEventType}
                environmentType={environmentType}
                setEnvironmentType={setEnvironmentType}
                availableItems={availableItems}
                setAvailableItems={setAvailableItems}
                themeMustMatchEnvironment={themeMustMatchEnvironment}
                setThemeMustMatchEnvironment={setThemeMustMatchEnvironment}
                roomDifficulty={roomDifficulty}
                setRoomDifficulty={setRoomDifficulty}
                youthAddOnEnabled={youthAddOnEnabled}
                setYouthAddOnEnabled={setYouthAddOnEnabled}
                youthAddOnGatesAdultFlow={youthAddOnGatesAdultFlow}
                setYouthAddOnGatesAdultFlow={setYouthAddOnGatesAdultFlow}
                youthAddOnAgeNote={youthAddOnAgeNote}
                setYouthAddOnAgeNote={setYouthAddOnAgeNote}
                validationFlags={validationFlags}
                clearValidation={(key) => setValidationFlags((current) => ({ ...current, [key]: false }))}
                commercialVenueContext={commercialVenueContext}
                eventSuggestions={dedupeStringsPreserveOrder([...EVENT_CONTEXT_PRESETS, ...(inputHistory.eventType ?? [])])}
                itemHistory={inputHistory.availableItems ?? []}
                propPresetLabels={propPresetLabels}
                puzzleEstimateHud={
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
                }
                onContinue={() => void proceedFromSetupToThemes()}
                onOpenInspiration={() => setInspirationOpen(true)}
              />
            ) : null}
            {flowWizardStep === "themes" ? (`;
fs.writeFileSync(path, s.slice(0, i0) + replacement + s.slice(i1));
console.log("patched setup step", i1 - i0, "chars removed");
