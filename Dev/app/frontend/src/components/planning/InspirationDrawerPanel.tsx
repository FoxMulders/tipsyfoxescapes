import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { generateContextualInspirationInBrowser, type ContextualInspirationResult } from "@/browserAiInspiration";
import { INSPIRATION_CATALOG, type InspirationCatalogEntry } from "@/inspirationCatalog";

const INSPIRATION_DRAWER_CATEGORY_ORDER: InspirationCatalogEntry["category"][] = [
  "Tech & DIY",
  "Design & theory",
  "Community & playthroughs",
  "Visual ideas",
  "Starter articles",
];

function inspirationCatalogEntryById(id: string): InspirationCatalogEntry | undefined {
  return INSPIRATION_CATALOG.find((e) => e.id === id);
}

/** Structured result from the server-side /api/inspiration/generate endpoint. */
interface InspirationApiResult {
  theme: string;
  narrativeHook: string;
  puzzlesAndProps: Array<{ puzzleConcept: string; requiredProps: string[] }>;
  source: "openai" | "mock";
}

export type InspirationDrawerPanelProps = {
  open: boolean;
  onClose: () => void;
  plannerMainPuzzleTarget: number;
  themeMustMatchEnvironment: boolean;
  environmentType: string;
  availableItems: string;
  eventType: string;
  themeName: string;
  themeTldr: string;
  themeDescriptionExcerpt: string;
  commercialVenueContext: boolean;
  coachBrowserAiReady: boolean;
};

export function InspirationDrawerPanel({
  open,
  onClose,
  plannerMainPuzzleTarget,
  themeMustMatchEnvironment,
  environmentType,
  availableItems,
  eventType,
  themeName,
  themeTldr,
  themeDescriptionExcerpt,
  commercialVenueContext,
  coachBrowserAiReady,
}: InspirationDrawerPanelProps) {
  const [inspirationAiBrief, setInspirationAiBrief] = useState<ContextualInspirationResult | null>(null);
  const [inspirationServerResult, setInspirationServerResult] = useState<InspirationApiResult | null>(null);
  const [inspirationAiBusy, setInspirationAiBusy] = useState(false);
  const [inspirationAiError, setInspirationAiError] = useState("");
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const aiEnabledFetchedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      aiEnabledFetchedRef.current = false;
      return;
    }
    if (aiEnabledFetchedRef.current) return;
    aiEnabledFetchedRef.current = true;
    fetch("/api/config")
      .then((r) => r.json())
      .then((data: { isAiEnabled?: boolean }) => {
        setAiEnabled(Boolean(data.isAiEnabled));
      })
      .catch(() => {
        setAiEnabled(true);
      });
  }, [open]);

  const runContextualInspiration = useCallback(async (): Promise<void> => {
    setInspirationAiError("");
    setInspirationServerResult(null);
    setInspirationAiBrief(null);
    setInspirationAiBusy(true);
    try {
      try {
        const payload = {
          environmentType: environmentType.trim(),
          availableItems: availableItems.trim(),
          targetNodeCount: plannerMainPuzzleTarget,
          themeMustMatchEnvironment,
          eventType: eventType.trim(),
          themeName: themeName.trim(),
        };
        const resp = await fetch("/api/inspiration/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (resp.ok) {
          const data = (await resp.json()) as InspirationApiResult;
          if (data.theme && Array.isArray(data.puzzlesAndProps) && data.puzzlesAndProps.length > 0) {
            setInspirationServerResult(data);
            return;
          }
        }
      } catch {
        /* fall through to browser AI */
      }

      if (coachBrowserAiReady) {
        const result = await generateContextualInspirationInBrowser({
          environmentType: environmentType.trim(),
          availableItems: availableItems.trim(),
          eventType: eventType.trim(),
          themeName: themeName.trim() || "Not selected yet",
          themeTldr,
          themeDescriptionExcerpt,
          isCommercialVenue: commercialVenueContext,
        });
        if (result && (result.intro || result.propIdeas.length > 0 || result.proTip)) {
          setInspirationAiBrief(result);
          return;
        }
      }

      setInspirationAiError(
        "Could not generate inspiration. The server API is available without configuration and returns sample concepts — if you see this, try refreshing the page.",
      );
    } finally {
      setInspirationAiBusy(false);
    }
  }, [
    availableItems,
    coachBrowserAiReady,
    commercialVenueContext,
    environmentType,
    eventType,
    plannerMainPuzzleTarget,
    themeDescriptionExcerpt,
    themeMustMatchEnvironment,
    themeName,
    themeTldr,
  ]);

  if (!open) return null;

  return (
    <>
      <div className="inspiration-drawer-backdrop" role="presentation" aria-hidden="true" onClick={onClose} />
      <aside
        className="inspiration-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspiration-drawer-title"
      >
        <div className="inspiration-drawer-head">
          <h2 id="inspiration-drawer-title">Inspiration drawer</h2>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted inspiration-drawer-lead">
          Curated libraries below. <strong>On-device AI</strong> can tie <strong>your environment, props, and theme</strong> to
          these links—same privacy model as the theme coach (nothing leaves your machine).
        </p>
        <div className="inspiration-ai-panel">
          <button
            type="button"
            className="primary-btn inspiration-ai-generate-btn"
            disabled={inspirationAiBusy}
            aria-busy={inspirationAiBusy}
            onClick={() => void runContextualInspiration()}
          >
            {inspirationAiBusy
              ? "Generating…"
              : `Generate AI concept (${plannerMainPuzzleTarget} puzzle node${plannerMainPuzzleTarget === 1 ? "" : "s"})`}
          </button>
          {aiEnabled === false ? (
            <p className="inspiration-ai-config-warn" role="status">
              Live AI concepts are not available in this session — showing curated sample ideas matched to your room instead.
            </p>
          ) : null}
          {inspirationAiError ? <p className="error-banner inspiration-ai-error">{inspirationAiError}</p> : null}

          {inspirationServerResult ? (
            <div className="inspiration-ai-result inspiration-structured-result" role="region" aria-label="AI-generated escape room concept">
              <div className="inspiration-concept-header">
                <h3 className="inspiration-concept-theme">{inspirationServerResult.theme}</h3>
                {inspirationServerResult.source === "mock" ? (
                  <span className="inspiration-source-badge inspiration-source-badge--mock">Sample concept</span>
                ) : (
                  <span className="inspiration-source-badge inspiration-source-badge--ai">AI-generated</span>
                )}
              </div>
              {inspirationServerResult.narrativeHook ? (
                <p className="inspiration-narrative-hook">{inspirationServerResult.narrativeHook}</p>
              ) : null}
              {inspirationServerResult.puzzlesAndProps.length > 0 ? (
                <>
                  <h4 className="inspiration-ai-subhead">
                    Puzzle nodes — {inspirationServerResult.puzzlesAndProps.length} node
                    {inspirationServerResult.puzzlesAndProps.length === 1 ? "" : "s"}
                    {themeMustMatchEnvironment ? " · environmental fit enforced" : ""}
                  </h4>
                  <ol className="inspiration-puzzle-nodes-list">
                    {inspirationServerResult.puzzlesAndProps.map((node, idx) => (
                      <li key={`node-${idx}`} className="inspiration-puzzle-node-item">
                        <p className="inspiration-puzzle-concept">{node.puzzleConcept}</p>
                        {node.requiredProps.length > 0 ? (
                          <p className="inspiration-puzzle-props muted">
                            <strong>Props:</strong> {node.requiredProps.join(", ")}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}
              {inspirationServerResult.source === "mock" ? (
                <p className="muted inspiration-mock-notice">
                  This is a sample concept matched to your environment. Set <code>OPENAI_API_KEY</code> in your backend{" "}
                  <code>.env</code> to get personalized AI-generated plans.
                </p>
              ) : null}
            </div>
          ) : null}

          {inspirationAiBrief ? (
            <div className="inspiration-ai-result" role="region" aria-label="On-device AI inspiration">
              <p className="muted inspiration-source-note">Generated by on-device AI</p>
              {inspirationAiBrief.intro ? <p className="inspiration-ai-intro">{inspirationAiBrief.intro}</p> : null}
              {inspirationAiBrief.propIdeas.length > 0 ? (
                <>
                  <h3 className="inspiration-ai-subhead">Props → puzzle angles</h3>
                  <ul className="inspiration-ai-prop-list">
                    {inspirationAiBrief.propIdeas.map((row, idx) => (
                      <li key={`prop-idea-${idx}`} className="inspiration-ai-prop-item">
                        {row.props.length > 0 ? (
                          <p className="inspiration-ai-prop-line">
                            <strong>{row.props.join(", ")}</strong>
                          </p>
                        ) : null}
                        <p className="inspiration-ai-angle">{row.puzzleAngle}</p>
                        {row.searchHints && row.searchHints.length > 0 ? (
                          <p className="muted inspiration-ai-hints">
                            <strong>Search:</strong> {row.searchHints.join(" · ")}
                          </p>
                        ) : null}
                        {row.resourceIds.length > 0 ? (
                          <ul className="inspiration-ai-resource-chips">
                            {row.resourceIds.map((rid) => {
                              const entry = inspirationCatalogEntryById(rid);
                              if (!entry) return null;
                              return (
                                <li key={rid}>
                                  <a href={entry.url} target="_blank" rel="noreferrer">
                                    {entry.label}
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {inspirationAiBrief.resourceNotes.length > 0 ? (
                <>
                  <h3 className="inspiration-ai-subhead">Where to dig next</h3>
                  <ul className="inspiration-ai-notes-list">
                    {inspirationAiBrief.resourceNotes.map((note, idx) => {
                      const entry = inspirationCatalogEntryById(note.resourceId);
                      if (!entry) return null;
                      return (
                        <li key={`${note.resourceId}-${idx}`}>
                          <a href={entry.url} target="_blank" rel="noreferrer">
                            {entry.label}
                          </a>
                          <span className="muted"> — {note.note}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}
              {inspirationAiBrief.proTip ? (
                <p className="inspiration-ai-protip">
                  <strong>Pro tip:</strong> {inspirationAiBrief.proTip}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        {INSPIRATION_DRAWER_CATEGORY_ORDER.map((category) => {
          const links = INSPIRATION_CATALOG.filter((e) => e.category === category);
          if (links.length === 0) return null;
          return (
            <Fragment key={category}>
              <h3 className="inspiration-drawer-category">{category}</h3>
              <ul className="inspiration-drawer-list">
                {links.map((link) => (
                  <li key={link.id}>
                    <a className="inspiration-drawer-link" href={link.url} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Fragment>
          );
        })}
      </aside>
    </>
  );
}
