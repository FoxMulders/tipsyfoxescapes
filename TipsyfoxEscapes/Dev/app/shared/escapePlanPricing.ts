/**
 * Scalable venue escape-plan pricing — base operator package + per additional layout room.
 */

export type EscapePlanRoomProfile = {
  id: string;
  name: string;
  layoutLabel: string;
};

export const SCALABLE_OPERATOR_PLAN_ID = "creative_studio";

export const DEFAULT_INCLUDED_LAYOUT_ROOMS = 1;
export const DEFAULT_PER_ADDITIONAL_ROOM_CENTS = 3900;

export type EscapePlanPriceInput = {
  basePriceCents: number;
  includedLayoutRooms?: number;
  perAdditionalRoomCents?: number;
  exportCreditsPerRoom?: number;
};

export type EscapePlanPriceQuote = {
  layoutRoomCount: number;
  includedLayoutRooms: number;
  additionalLayoutRooms: number;
  totalCents: number;
  roomsToAdd: number;
  exportCreditsToAdd: number;
  perRoomLabel: string;
  breakdownLabel: string;
};

export const createEscapePlanRoom = (index: number): EscapePlanRoomProfile => ({
  id: `layout_room_${index}_${Date.now().toString(36)}`,
  name: `Room ${index}`,
  layoutLabel: "",
});

export const calculateEscapePlanPrice = (
  layoutRoomCount: number,
  input: EscapePlanPriceInput,
): EscapePlanPriceQuote => {
  const included = Math.max(1, Math.floor(input.includedLayoutRooms ?? DEFAULT_INCLUDED_LAYOUT_ROOMS));
  const perRoom = Math.max(0, Math.floor(input.perAdditionalRoomCents ?? DEFAULT_PER_ADDITIONAL_ROOM_CENTS));
  const count = Math.max(1, Math.floor(layoutRoomCount));
  const additional = Math.max(0, count - included);
  const totalCents = Math.max(0, input.basePriceCents) + additional * perRoom;
  const exportPerRoom = Math.max(1, Math.floor(input.exportCreditsPerRoom ?? 2));
  const perRoomUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(perRoom / 100);
  const totalUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalCents / 100);
  const baseUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    input.basePriceCents / 100,
  );

  return {
    layoutRoomCount: count,
    includedLayoutRooms: included,
    additionalLayoutRooms: additional,
    totalCents,
    roomsToAdd: count,
    exportCreditsToAdd: count * exportPerRoom,
    perRoomLabel: `+${perRoomUsd} per additional layout room`,
    breakdownLabel:
      additional > 0
        ? `${baseUsd} base (${included} layout${included === 1 ? "" : "s"}) + ${additional} × ${perRoomUsd} = ${totalUsd}`
        : `${baseUsd} base package · ${count} layout room${count === 1 ? "" : "s"}`,
  };
};

export const formatCentsUsd = (cents: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.max(0, cents) / 100);
