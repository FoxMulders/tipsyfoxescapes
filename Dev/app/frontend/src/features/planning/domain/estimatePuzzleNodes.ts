/** Mirrors `estimatePuzzleCount` in the backend for live UI feedback. */
export function estimatePuzzleNodes(playersConcurrent: number, sessionDurationMinutes: number): number {
  if (sessionDurationMinutes <= 5) return 1;
  if (sessionDurationMinutes <= 10) return Math.min(2, Math.max(1, Math.ceil(playersConcurrent / 3)));
  if (sessionDurationMinutes <= 15) return Math.min(3, Math.max(2, Math.ceil(playersConcurrent / 2)));
  if (sessionDurationMinutes <= 30) {
    const raw = Math.ceil((playersConcurrent * sessionDurationMinutes) / 38);
    return Math.min(8, Math.max(2, raw));
  }
  const raw = Math.ceil((playersConcurrent * sessionDurationMinutes) / 30);
  return Math.max(4, Math.min(18, raw));
}

export function estimateJuniorAddOnSlots(sessionDurationMinutes: number, youthAddOnEnabled: boolean): number {
  if (!youthAddOnEnabled) return 0;
  if (!Number.isFinite(sessionDurationMinutes) || sessionDurationMinutes < 1) return 2;
  return sessionDurationMinutes >= 25 ? 3 : 2;
}
