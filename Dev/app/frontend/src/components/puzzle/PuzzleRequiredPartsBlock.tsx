type PuzzleRequiredPartsBlockProps = {
  parts: string[];
  category: "logic" | "physical" | "electronic";
  isMaglock?: boolean;
};

export function PuzzleRequiredPartsBlock({ parts, category, isMaglock = false }: PuzzleRequiredPartsBlockProps) {
  const unique = [...new Set(parts.map((p) => p.trim()).filter(Boolean))];
  if (unique.length === 0) return null;

  return (
    <section
      className={`puzzle-parts-block puzzle-parts-block--${isMaglock ? "maglock" : category}`}
      aria-label="Required parts and props"
    >
      <header className="puzzle-parts-block__head">
        <span className="puzzle-parts-block__icon" aria-hidden>
          {isMaglock ? "⚡" : category === "electronic" ? "◈" : "▣"}
        </span>
        <h5 className="puzzle-parts-block__title">
          {isMaglock ? "Maglock module — required parts & props" : "Required parts & props"}
        </h5>
      </header>
      <ul className="puzzle-parts-block__list">
        {unique.map((part) => (
          <li key={part}>{part}</li>
        ))}
      </ul>
    </section>
  );
}
