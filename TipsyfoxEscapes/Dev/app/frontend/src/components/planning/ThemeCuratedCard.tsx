import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ThemeCuratedCardTheme = {
  id: string;
  name: string;
  description: string;
  tldr?: string;
  recommendedPuzzles?: Array<{
    id: string;
    title: string;
    category: string;
    difficulty?: string;
    objective: string;
    howItWorks: string;
  }>;
};

function narrativeHook(description: string): string {
  const firstBlock = description.split(/\n\n+/)[0]?.trim() ?? description.trim();
  const flat = firstBlock.replace(/\s+/g, " ");
  if (!flat) return "";
  return flat.length > 220 ? `${flat.slice(0, 217)}…` : flat;
}

export function ThemeCuratedCard({
  theme,
  tldr,
  selected,
  preview,
  simpleView,
  planningContext,
  onSelect,
  onPointerEnter,
  onPointerLeave,
  fullBrief,
  editorPass,
}: {
  theme: ThemeCuratedCardTheme;
  tldr: string;
  selected: boolean;
  preview: boolean;
  simpleView: boolean;
  planningContext: string;
  onSelect: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  fullBrief?: ReactNode;
  editorPass?: ReactNode;
}) {
  const expanded = selected || preview;
  const hook = narrativeHook(theme.description);

  return (
    <li className="theme-ideas-list__item">
      <article
        className={cn(
          "theme-idea-card",
          selected && "theme-idea-card--selected",
          preview && !selected && "theme-idea-card--preview",
          expanded && "theme-idea-card--expanded",
        )}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <div className="theme-idea-card__head">
          <label className="theme-idea-pick">
            <input
              type="radio"
              name="escape-theme-choice"
              className="theme-idea-radio"
              checked={selected}
              onChange={onSelect}
            />
            <span className="theme-idea-pick-text">
              <strong className="theme-idea-name">{theme.name}</strong>
            </span>
          </label>
        </div>
        <p className="theme-idea-tldr theme-idea-tldr--peek muted">
          <span className="theme-idea-tldr-label">TL;DR</span>
          <span className="theme-idea-tldr-text">{tldr}</span>
        </p>
        <div className="theme-idea-card__expand" aria-hidden={!expanded}>
          <div className="theme-idea-card__expand-inner">
            {hook ? (
              <p className="theme-idea-narrative">
                <span className="theme-idea-tldr-label">Narrative</span>
                <span className="theme-idea-narrative-text">{hook}</span>
              </p>
            ) : null}
            <p className="theme-idea-planning-params muted" role="note">
              <span className="theme-idea-tldr-label">Your room</span>
              <span>{planningContext}</span>
            </p>
            {!simpleView && fullBrief ? (
              <div className="theme-idea-full-brief">
                {editorPass ? <div className="theme-idea-card__toolbar">{editorPass}</div> : null}
                {fullBrief}
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </li>
  );
}
