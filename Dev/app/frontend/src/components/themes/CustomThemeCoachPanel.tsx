import type { ThemeCoachUiMessage } from "./themeCoachUtils";

export function CustomThemeCoachPanel({
  messages,
  draft,
  onDraftChange,
  busy,
  localError,
  aiAvailable,
  accountSyncAvailable,
  coachPrereqsOk,
  coverage,
  onStart,
  onSend,
  onSynthesize,
  onClear,
}: {
  messages: ThemeCoachUiMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  busy: boolean;
  localError: string;
  aiAvailable: boolean;
  accountSyncAvailable: boolean;
  coachPrereqsOk: boolean;
  coverage: { done: number; total: number; doneLabels: string[] };
  onStart: () => void;
  onSend: () => void;
  onSynthesize: () => void;
  onClear: () => void;
}) {
  const canApply = messages.some((m) => m.role === "user");
  const hasAssistantMessage = messages.some((m) => m.role === "assistant");
  const startDisabled = busy || !aiAvailable || hasAssistantMessage || !coachPrereqsOk;
  const startTitle = !coachPrereqsOk
    ? "Complete room details and a theme name first."
    : !aiAvailable
      ? "On-device Prompt API is not available in this session yet. Enable Chrome flags, wait for the model, then refresh—or try again in a moment."
      : hasAssistantMessage
        ? "The coach has already started. Use Clear chat if you want a fresh opening."
        : busy
          ? "Please wait…"
          : undefined;
  const composerLocked = busy || !coachPrereqsOk;
  return (
    <div className="theme-coach-card" role="region" aria-label="Theme coach chat">
      <h3 className="theme-coach-heading">Theme coach · built-in AI</h3>
      <p className="muted theme-coach-lead">
        The coach asks short questions about tone, audience, and how your real room fits the story—so puzzle generation matches
        what you want.
      </p>
      {!coachPrereqsOk ? (
        <p className="theme-coach-locked-note" role="status">
          Complete <strong>Room details</strong> on the previous step (environment, timing, and headcounts),
          then enter a <strong>theme name</strong> above. The coach unlocks once both are in place so it can use your real room
          context.
        </p>
      ) : null}
      <p className="muted theme-coach-security-note">
        Security mode is on: do not paste passwords, API keys, tokens, private keys, or personal data into this chat. Messages
        that look like secrets are blocked before send.
      </p>
      {!accountSyncAvailable ? (
        <p className="muted theme-coach-account-note">
          Sign in to store this conversation on your account for this planning session. Other accounts cannot read it; without
          sign-in, chat stays only in this browser until you leave the page.
        </p>
      ) : (
        <p className="muted theme-coach-account-note">
          Chat is saved to your signed-in account for this planning session only.
        </p>
      )}
      {!aiAvailable ? (
        <div className="theme-coach-unavailable" role="note">
          <p className="muted theme-coach-unavailable-lead">
            On-device coach AI is not detected in this browser session. You can still write the theme description in the{" "}
            <strong>field above</strong> and continue without the coach.
          </p>
          <p className="muted theme-coach-unavailable-flags">
            In <strong>Chrome</strong> on desktop (recent stable or newer), enable built-in Gemini Nano, then relaunch: open{" "}
            <code className="chrome-flag-chip">chrome://flags/#optimization-guide-on-device-model</code> → <strong>Enabled</strong>, and{" "}
            <code className="chrome-flag-chip">chrome://flags/#prompt-api-for-gemini-nano</code> or{" "}
            <code className="chrome-flag-chip">chrome://flags/#prompt-api-for-gemini-nano-multimodal-input</code> → <strong>Enabled</strong>.{" "}
            On <code>localhost</code>, confirm with DevTools: <code className="chrome-flag-chip">await LanguageModel.availability()</code>{" "}
            (expect <strong>available</strong> or <strong>downloadable</strong>). Hardware and disk requirements apply—see the{" "}
            <a href="https://developer.chrome.com/docs/ai/get-started" target="_blank" rel="noreferrer">
              Chrome built-in AI get-started guide
            </a>
            .
          </p>
          <p className="muted theme-coach-unavailable-foot">
            <strong>Send</strong> and <strong>Apply answers</strong> stay off until the Prompt API is available here.
          </p>
        </div>
      ) : null}
      <p className="muted theme-coach-coverage">
        Interview coverage: {coverage.done}/{coverage.total} core topics captured
        {coverage.doneLabels.length > 0 ? ` (${coverage.doneLabels.join(", ")})` : ""}.
      </p>
      {localError ? <p className="error-banner theme-coach-error">{localError}</p> : null}
      <div className="theme-coach-messages" tabIndex={0} aria-live="polite">
        {messages.length === 0 ? (
          <p className="muted theme-coach-empty">
            {coachPrereqsOk
              ? "When you start the coach, it will assess what is already clear from your room details and theme name, then ask focused questions here."
              : "The coach stays closed until room details and a theme name are ready—see the note above."}
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`theme-coach-bubble theme-coach-bubble--${msg.role}`}>
              <span className="theme-coach-bubble-label">{msg.role === "assistant" ? "Coach" : "You"}</span>
              <div className="theme-coach-bubble-text">{msg.content}</div>
            </div>
          ))
        )}
        {busy ? <p className="muted theme-coach-thinking">Thinking…</p> : null}
      </div>
      <div className="theme-coach-composer">
        <label className="theme-coach-composer-label">
          Your reply
          <textarea
            className="theme-coach-textarea"
            rows={2}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={
              coachPrereqsOk ? "Type your answer, then Send." : "Unlock the coach with room details + theme name first."
            }
            disabled={composerLocked}
          />
        </label>
        <div className="theme-coach-actions">
          <button type="button" className="secondary-btn" onClick={onStart} disabled={startDisabled} title={startTitle}>
            Start conversation
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={onSend}
            disabled={
              busy ||
              !aiAvailable ||
              !coachPrereqsOk ||
              !draft.trim() ||
              !messages.some((m) => m.role === "assistant")
            }
            title={!aiAvailable ? "Built-in browser AI is required to send messages to the coach." : undefined}
          >
            Send
          </button>
        </div>
      </div>
      <div className="theme-coach-footer-actions">
        <button
          type="button"
          className="secondary-btn"
          onClick={onSynthesize}
          disabled={busy || !aiAvailable || !coachPrereqsOk || !canApply}
        >
          Apply answers to description
        </button>
        <button type="button" className="secondary-btn" onClick={onClear} disabled={busy || messages.length === 0}>
          Clear chat
        </button>
      </div>
    </div>
  );
}
