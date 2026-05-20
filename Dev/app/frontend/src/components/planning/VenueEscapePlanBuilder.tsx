import { useMemo } from "react";
import {
  calculateEscapePlanPrice,
  createEscapePlanRoom,
  formatCentsUsd,
  type EscapePlanRoomProfile,
} from "../../../../shared/escapePlanPricing";
import { cn } from "@/lib/utils";

export type VenueEscapePlanBuilderProps = {
  rooms: EscapePlanRoomProfile[];
  activeRoomId: string;
  onRoomsChange: (rooms: EscapePlanRoomProfile[]) => void;
  onActiveRoomChange: (roomId: string) => void;
  basePriceCents: number;
  includedLayoutRooms?: number;
  perAdditionalRoomCents?: number;
  planName: string;
};

export function VenueEscapePlanBuilder({
  rooms,
  activeRoomId,
  onRoomsChange,
  onActiveRoomChange,
  basePriceCents,
  includedLayoutRooms,
  perAdditionalRoomCents,
  planName,
}: VenueEscapePlanBuilderProps) {
  const quote = useMemo(
    () =>
      calculateEscapePlanPrice(rooms.length, {
        basePriceCents,
        includedLayoutRooms,
        perAdditionalRoomCents,
      }),
    [rooms.length, basePriceCents, includedLayoutRooms, perAdditionalRoomCents],
  );

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];

  const addRoom = () => {
    const nextIndex = rooms.length + 1;
    const created = createEscapePlanRoom(nextIndex);
    onRoomsChange([...rooms, created]);
    onActiveRoomChange(created.id);
  };

  const removeRoom = (roomId: string) => {
    if (rooms.length <= 1) return;
    const next = rooms.filter((r) => r.id !== roomId);
    onRoomsChange(next);
    if (activeRoomId === roomId) onActiveRoomChange(next[0]?.id ?? "");
  };

  const updateRoom = (roomId: string, patch: Partial<EscapePlanRoomProfile>) => {
    onRoomsChange(rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)));
  };

  return (
    <section className="escape-plan-builder" aria-label="Venue escape plan layouts">
      <header className="escape-plan-builder__head">
        <div>
          <h3 className="escape-plan-builder__title">Layout rooms in your escape plan</h3>
          <p className="escape-plan-builder__lead muted">
            Add as many physical layout configurations as your venue needs. Pricing for <strong>{planName}</strong>{" "}
            updates instantly as you grow the fleet.
          </p>
        </div>
        <div className="escape-plan-builder__quote" role="status" aria-live="polite">
          <p className="escape-plan-builder__quote-total">{formatCentsUsd(quote.totalCents)}</p>
          <p className="escape-plan-builder__quote-detail muted">{quote.breakdownLabel}</p>
          <p className="escape-plan-builder__quote-per-room">{quote.perRoomLabel}</p>
        </div>
      </header>

      <nav className="escape-plan-room-nav" aria-label="Layout room navigation">
        {rooms.map((room, index) => (
          <button
            key={room.id}
            type="button"
            className={cn("escape-plan-room-nav__pill", room.id === activeRoomId && "escape-plan-room-nav__pill--active")}
            onClick={() => onActiveRoomChange(room.id)}
            aria-current={room.id === activeRoomId ? "true" : undefined}
          >
            {room.name.trim() || `Room ${index + 1}`}
          </button>
        ))}
        <button type="button" className="escape-plan-room-nav__add" onClick={addRoom}>
          + Add new room
        </button>
      </nav>

      {activeRoom ? (
        <div className="escape-plan-room-panel">
          <div className="escape-plan-room-panel__grid">
            <label className="escape-plan-room-field">
              <span className="escape-plan-room-field__label">Room label</span>
              <input
                className="escape-plan-room-field__input"
                value={activeRoom.name}
                onChange={(e) => updateRoom(activeRoom.id, { name: e.target.value })}
                placeholder="e.g. The Vault, Kids wing, Pop-up trailer"
              />
            </label>
            <label className="escape-plan-room-field escape-plan-room-field--wide">
              <span className="escape-plan-room-field__label">Layout / zone notes</span>
              <textarea
                className="escape-plan-room-field__textarea"
                rows={3}
                value={activeRoom.layoutLabel}
                onChange={(e) => updateRoom(activeRoom.id, { layoutLabel: e.target.value })}
                placeholder="Brief footprint, GM sightlines, or install constraints for this layout."
              />
            </label>
          </div>
          {rooms.length > 1 ? (
            <button type="button" className="secondary-btn escape-plan-room-remove" onClick={() => removeRoom(activeRoom.id)}>
              Remove this layout room
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
