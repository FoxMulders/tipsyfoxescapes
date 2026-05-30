import type { InventoryItem } from "../../../../../shared/inventory";
import { migrateAvailableItemsToInventory } from "../../../../../shared/inventory";
import type { PlanningApiBody, PlanningFormState } from "./planningTypes";

export function buildPlanningBody(state: PlanningFormState, mode: "draft" | "strict"): PlanningApiBody | null {
  const parsedItems = state.availableItems
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const inventoryItems: InventoryItem[] =
    state.inventoryItems.length > 0 ? state.inventoryItems : migrateAvailableItemsToInventory(parsedItems);
  const noGoParsed = state.noGoItems
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24);
  const pc = Number(state.playersConcurrent);
  const pt = Number(state.participantsTotal);
  const sd = Number(state.sessionDurationMinutes);
  const env = state.environmentType.trim();
  const mainOverride = ((): number | null => {
    if (!state.useCustomMainPuzzleCount) return null;
    const n = Number.parseInt(state.customMainPuzzleCountStr.trim(), 10);
    if (!Number.isFinite(n)) return null;
    return Math.min(24, Math.max(1, Math.trunc(n)));
  })();
  const mixTriple = ((): { logic: number; physical: number; electronic: number } | null => {
    if (!state.useCustomMix) return null;
    const L = Number.parseInt(state.customMixLogic.trim(), 10);
    const P = Number.parseInt(state.customMixPhysical.trim(), 10);
    const E = Number.parseInt(state.customMixElectronic.trim(), 10);
    if (!Number.isFinite(L) || !Number.isFinite(P) || !Number.isFinite(E)) return null;
    if (L < 0 || P < 0 || E < 0 || L > 20 || P > 20 || E > 20) return null;
    if (L + P + E < 1) return null;
    return { logic: Math.trunc(L), physical: Math.trunc(P), electronic: Math.trunc(E) };
  })();
  if (mode === "strict") {
    if (!Number.isFinite(pc) || pc < 1 || pc > 99) return null;
    if (!Number.isFinite(pt) || pt < 1 || pt > 99) return null;
    if (pc > pt) return null;
    if (!Number.isFinite(sd) || sd < 10 || sd > 180) return null;
    if (!env) return null;
    if (state.useCustomMainPuzzleCount && mainOverride === null) return null;
    if (state.useCustomMix && mixTriple === null) return null;
    return {
      playersConcurrent: pc,
      participantsTotal: pt,
      sessionDurationMinutes: sd,
      environmentType: env,
      availableItems: parsedItems,
      inventoryItems,
      designConstraints: state.designConstraints.trim().slice(0, 1200) || undefined,
      noGoItems: noGoParsed.length ? noGoParsed : undefined,
      techLevel: state.techLevel || undefined,
      roomDifficulty: state.roomDifficulty,
      youthAddOnEnabled: state.youthAddOnEnabled,
      youthAddOnGatesAdultFlow: state.youthAddOnGatesAdultFlow,
      youthAddOnAgeNote: state.youthAddOnAgeNote.trim().slice(0, 400),
      eventType: state.eventType.trim().slice(0, 200),
      mainTrackPuzzleCountOverride: mainOverride,
      puzzleMixLogic: mixTriple?.logic ?? null,
      puzzleMixPhysical: mixTriple?.physical ?? null,
      puzzleMixElectronic: mixTriple?.electronic ?? null,
      themeMustMatchEnvironment: state.themeMustMatchEnvironment,
      venueBuildType: state.venueBuildType,
      targetInterface: state.targetInterface,
      propFabrication3dEnabled: state.propFabrication3dEnabled,
      propFabricationKinds: state.propFabricationKinds,
      roomLayout: state.roomLayout,
    };
  }
  const players = Number.isFinite(pc) && pc > 0 ? Math.min(99, Math.max(1, Math.trunc(pc))) : 4;
  const participants = Number.isFinite(pt) && pt > 0 ? Math.min(99, Math.max(1, Math.trunc(pt))) : 6;
  const duration = Number.isFinite(sd) && sd >= 10 ? Math.min(180, Math.max(10, Math.trunc(sd))) : 45;
  return {
    playersConcurrent: players,
    participantsTotal: participants,
    sessionDurationMinutes: duration,
    environmentType: env || "Not specified yet",
    availableItems: parsedItems,
    inventoryItems,
    designConstraints: state.designConstraints.trim().slice(0, 1200) || undefined,
    noGoItems: noGoParsed.length ? noGoParsed : undefined,
    techLevel: state.techLevel || undefined,
    roomDifficulty: state.roomDifficulty,
    youthAddOnEnabled: state.youthAddOnEnabled,
    youthAddOnGatesAdultFlow: state.youthAddOnGatesAdultFlow,
    youthAddOnAgeNote: state.youthAddOnAgeNote.trim().slice(0, 400),
    eventType: state.eventType.trim().slice(0, 200),
    mainTrackPuzzleCountOverride: mainOverride,
    puzzleMixLogic: mixTriple?.logic ?? null,
    puzzleMixPhysical: mixTriple?.physical ?? null,
    puzzleMixElectronic: mixTriple?.electronic ?? null,
    themeMustMatchEnvironment: state.themeMustMatchEnvironment,
    venueBuildType: state.venueBuildType,
    targetInterface: state.targetInterface,
    propFabrication3dEnabled: state.propFabrication3dEnabled,
    propFabricationKinds: state.propFabricationKinds,
    roomLayout: state.roomLayout,
  };
}
