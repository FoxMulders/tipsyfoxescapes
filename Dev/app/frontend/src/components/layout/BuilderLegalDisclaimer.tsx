const DISCLAIMER =
  "Tipsy Fox Escapes provides puzzle frameworks and narrative storylines only. We assume no liability or responsibility for physical construction, property damage, or personal injury. It is the sole responsibility of the user to implement strict safety precautions and verify that all physical puzzles are safe to build, install, and operate prior to construction.";

export function BuilderLegalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`builder-legal-disclaimer${compact ? " builder-legal-disclaimer--compact" : ""}`} role="note">
      <h4 className="builder-legal-disclaimer__title">Liability disclaimer</h4>
      <p className="builder-legal-disclaimer__body">{DISCLAIMER}</p>
    </aside>
  );
}
