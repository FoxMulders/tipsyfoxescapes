import { FieldHint } from "@/components/planning/FieldHint";
import { cn } from "@/lib/utils";

export type PropFabricationKind = "mechanical" | "decorative";

type PropFabricationSectionProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  kinds: PropFabricationKind[];
  onKindsChange: (kinds: PropFabricationKind[]) => void;
};

const KIND_OPTIONS: { value: PropFabricationKind; label: string; detail: string }[] = [
  {
    value: "mechanical",
    label: "Print-ready mechanical puzzles",
    detail: "STL enclosures, latch boxes, dial wheels, and fit-tested mechanisms.",
  },
  {
    value: "decorative",
    label: "Decorative set dressing",
    detail: "Themed bezels, signage, scenic shells, and non-mechanical props.",
  },
];

const toggleKind = (current: PropFabricationKind[], kind: PropFabricationKind): PropFabricationKind[] =>
  current.includes(kind) ? current.filter((k) => k !== kind) : [...current, kind];

export function PropFabricationSection({
  enabled,
  onEnabledChange,
  kinds,
  onKindsChange,
}: PropFabricationSectionProps) {
  return (
    <section className="feature-card feature-card--fabrication" aria-labelledby="prop-fabrication-title">
      <header className="feature-card__header">
        <p className="feature-card__eyebrow">Maker workflow</p>
        <h3 id="prop-fabrication-title" className="feature-card__title">
          Prop fabrication preferences
        </h3>
        <p className="feature-card__lead muted">
          Tell the generator whether you are printing functional puzzle hardware or scenic dressing so exports bias toward
          the right build notes.
        </p>
      </header>

      <label className="feature-card__toggle-row">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            const on = e.target.checked;
            onEnabledChange(on);
            if (!on) onKindsChange([]);
          }}
        />
        <span>Do you plan to 3D print props or components?</span>
      </label>

      {enabled ? (
        <div className="feature-card__body space-y-4">
          <FieldHint
            label="What are you printing?"
            tooltip="Select all that apply. Mechanical puzzles include STL-ready enclosures; decorative options cover scenic shells and signage."
          >
            <div className="prop-fabrication-options" role="group" aria-label="3D print categories">
              {KIND_OPTIONS.map((opt) => {
                const checked = kinds.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={cn("prop-fabrication-option", checked && "prop-fabrication-option--selected")}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onKindsChange(toggleKind(kinds, opt.value))}
                    />
                    <span className="prop-fabrication-option__text">
                      <span className="prop-fabrication-option__label">{opt.label}</span>
                      <span className="prop-fabrication-option__detail">{opt.detail}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </FieldHint>

          <div className="prop-fabrication-resources" role="note">
            <p className="prop-fabrication-resources__title">Trusted maker resources</p>
            <ul className="prop-fabrication-resources__list">
              <li>
                <a href="https://www.youtube.com/c/PlayfulTechnology" target="_blank" rel="noreferrer">
                  Playful Technology
                </a>
                <span className="muted"> — interactive prop wiring tutorials and microcontroller walkthroughs.</span>
              </li>
              <li>
                <a href="https://www.adafruit.com/" target="_blank" rel="noreferrer">
                  Adafruit
                </a>
                <span className="muted"> — breakout boards, sensors, and escape-room-friendly electronics kits.</span>
              </li>
              <li>
                <a href="https://www.thingiverse.com/" target="_blank" rel="noreferrer">
                  Thingiverse
                </a>
                <span className="muted"> — community STLs for enclosures, knobs, and scenic puzzle hardware.</span>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
