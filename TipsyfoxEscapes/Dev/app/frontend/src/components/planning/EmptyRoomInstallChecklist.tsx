import { EMPTY_ROOM_INSTALL_CHECKLIST } from "@/components/planning/VenueBuildTypeField";

type EmptyRoomInstallChecklistProps = {
  environmentType?: string;
  themeName?: string;
  compact?: boolean;
};

export function EmptyRoomInstallChecklist({ environmentType, themeName, compact }: EmptyRoomInstallChecklistProps) {
  const envTrim = environmentType?.trim() ?? "";
  const themeTrim = themeName?.trim() ?? "";

  return (
    <section
      className="feature-card feature-card--blueprint empty-room-install-checklist"
      aria-labelledby="empty-room-install-title"
    >
      <header className="feature-card__header">
        <p className="feature-card__eyebrow">Prop layout · room blueprint</p>
        <h3 id="empty-room-install-title" className="feature-card__title">
          What to install in your empty room
        </h3>
        <p className="feature-card__lead muted">
          Use this after your theme and puzzle set are locked—map physical installs to your fiction before you export and
          brief staff.
          {themeTrim ? (
            <>
              {" "}
              Theme: <strong className="text-foreground">{themeTrim}</strong>.
            </>
          ) : null}
          {envTrim ? (
            <>
              {" "}
              Facility or fiction shell: <strong className="text-foreground">{envTrim}</strong>.
            </>
          ) : null}
        </p>
      </header>
      <ol className={compact ? "empty-room-install-list empty-room-install-list--compact" : "empty-room-install-list"}>
        {EMPTY_ROOM_INSTALL_CHECKLIST.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </section>
  );
}
