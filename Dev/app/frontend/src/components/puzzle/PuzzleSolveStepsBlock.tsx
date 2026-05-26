import { extractCodeConstraintHint } from "@/lib/puzzleDisplayUtils";

type PuzzleSolveStepsBlockProps = {
  steps: string[];
};

export function PuzzleSolveStepsBlock({ steps }: PuzzleSolveStepsBlockProps) {
  const rows = steps.map((s) => s.trim()).filter(Boolean);
  if (rows.length === 0) return null;

  return (
    <section className="puzzle-solve-steps" aria-label="Solve steps">
      <h5 className="puzzle-solve-steps__title">Solve path</h5>
      <ol className="puzzle-solve-steps__list">
        {rows.map((step, index) => {
          const hint = extractCodeConstraintHint(step);
          return (
            <li key={`${index}-${step.slice(0, 24)}`} className="puzzle-solve-steps__item">
              <p className="puzzle-solve-steps__text">{step}</p>
              {hint ? <p className="field-hint field-hint--constraint">{hint}</p> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
