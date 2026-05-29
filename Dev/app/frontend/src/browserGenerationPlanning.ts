type CategoryTriple = { logic: number; physical: number; electronic: number };

const computeDefaultCategoryCounts = (remaining: number, sessionMinutes: number): CategoryTriple => {
  let electronicCount = 0;
  let logicCount = 0;
  let physicalCount = 0;
  if (remaining === 1) {
    logicCount = 1;
  } else if (remaining === 2) {
    logicCount = 1;
    physicalCount = 1;
  } else if (remaining > 2) {
    electronicCount = Math.max(1, Math.ceil(remaining * 0.4));
    logicCount = Math.max(1, Math.floor(remaining * 0.3));
    physicalCount = Math.max(1, remaining - electronicCount - logicCount);

    if (sessionMinutes <= 10) {
      electronicCount = Math.min(electronicCount, 1);
      logicCount = Math.min(logicCount, 1);
      physicalCount = Math.max(1, remaining - electronicCount - logicCount);
    } else if (sessionMinutes <= 15) {
      electronicCount = Math.min(electronicCount, 1);
      physicalCount = Math.max(1, remaining - electronicCount - logicCount);
    }

    let total = electronicCount + logicCount + physicalCount;
    let guard = 0;
    while (total > remaining && guard < 24) {
      guard += 1;
      if (electronicCount > 1 && electronicCount >= logicCount && electronicCount >= physicalCount) electronicCount -= 1;
      else if (physicalCount > 1 && physicalCount >= logicCount) physicalCount -= 1;
      else if (logicCount > 1) logicCount -= 1;
      else break;
      total = electronicCount + logicCount + physicalCount;
    }
  }
  return { logic: logicCount, physical: physicalCount, electronic: electronicCount };
};

const applyHomePartyCategoryCounts = (counts: CategoryTriple, targetInterface: string): CategoryTriple => {
  if (targetInterface !== "home_party") return counts;
  if (counts.electronic === 0) return counts;
  return {
    logic: counts.logic,
    physical: counts.physical + counts.electronic,
    electronic: 0,
  };
};

/** Mirrors server resolveGeneratedCategoryCounts defaults for browser on-device generation. */
export function estimateBrowserCategoryCounts(input: {
  mainPuzzleTarget: number;
  existingPuzzleCount: number;
  sessionDurationMinutes: number;
  targetInterface: string;
  customMix?: { logic: number; physical: number; electronic: number } | null;
}): CategoryTriple {
  const remaining = Math.max(input.mainPuzzleTarget - input.existingPuzzleCount, 0);
  if (remaining <= 0) return { logic: 0, physical: 0, electronic: 0 };
  if (input.customMix) {
    const sum = input.customMix.logic + input.customMix.physical + input.customMix.electronic;
    if (sum > 0) {
      const scale = remaining / sum;
      let logic = Math.max(0, Math.round(input.customMix.logic * scale));
      let physical = Math.max(0, Math.round(input.customMix.physical * scale));
      let electronic = Math.max(0, remaining - logic - physical);
      return applyHomePartyCategoryCounts({ logic, physical, electronic }, input.targetInterface);
    }
  }
  return applyHomePartyCategoryCounts(
    computeDefaultCategoryCounts(remaining, input.sessionDurationMinutes),
    input.targetInterface,
  );
}
