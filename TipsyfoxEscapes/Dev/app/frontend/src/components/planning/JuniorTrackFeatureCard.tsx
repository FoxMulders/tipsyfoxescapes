import { Input } from "@/components/ui/input";
import { FieldHint } from "@/components/planning/FieldHint";

type JuniorTrackFeatureCardProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  gatesAdultFlow: boolean;
  onGatesAdultFlowChange: (value: boolean) => void;
  ageNote: string;
  onAgeNoteChange: (value: string) => void;
  juniorAddOnSlots: number;
};

export function JuniorTrackFeatureCard({
  enabled,
  onEnabledChange,
  gatesAdultFlow,
  onGatesAdultFlowChange,
  ageNote,
  onAgeNoteChange,
  juniorAddOnSlots,
}: JuniorTrackFeatureCardProps) {
  return (
    <section className="feature-card feature-card--junior" aria-labelledby="junior-track-feature-title">
      <header className="feature-card__header">
        <p className="feature-card__eyebrow">Premium differentiator</p>
        <h3 id="junior-track-feature-title" className="feature-card__title">
          Activate Multi-Generation Play (Junior Track Parallel Escape)
        </h3>
        <p className="feature-card__lead">
          Dynamically appends a synchronized, kid-friendly puzzle layer to this room so families and mixed-age groups can play
          together without compromising the adult experience.
        </p>
        {enabled && juniorAddOnSlots > 0 ? (
          <p className="feature-card__metric muted" role="status">
            Est. <strong className="text-foreground">+{juniorAddOnSlots}</strong> parallel junior puzzle
            {juniorAddOnSlots === 1 ? "" : "s"} in your live session estimate.
          </p>
        ) : null}
      </header>

      <label className="feature-card__toggle-row feature-card__toggle-row--primary">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            const on = e.target.checked;
            onEnabledChange(on);
            if (!on) {
              onGatesAdultFlowChange(false);
              onAgeNoteChange("");
            }
          }}
        />
        <span>Enable Junior Track parallel escape for this room</span>
      </label>

      {enabled ? (
        <div className="feature-card__body space-y-3">
          <label className="feature-card__toggle-row">
            <input
              type="checkbox"
              checked={gatesAdultFlow}
              onChange={(e) => onGatesAdultFlowChange(e.target.checked)}
            />
            <span>Junior puzzles may gate adult progression (families must complete kid beats first)</span>
          </label>
          <FieldHint label="Junior track notes" htmlFor="junior-track-notes">
            <Input
              id="junior-track-notes"
              type="text"
              value={ageNote}
              maxLength={400}
              onChange={(e) => onAgeNoteChange(e.target.value)}
              aria-label="Junior track notes"
            />
          </FieldHint>
        </div>
      ) : null}
    </section>
  );
}
