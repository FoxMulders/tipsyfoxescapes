const DEVICE_STORAGE_KEY = "escape-room-builder-device-id-v1";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable per-browser id sent as X-Device-Id for trial abuse resistance (pair with server-side checks). */
export function getOrCreateDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY)?.trim();
    if (existing && existing.length <= 120) return existing;
    const next = randomId();
    window.localStorage.setItem(DEVICE_STORAGE_KEY, next);
    return next;
  } catch {
    return randomId();
  }
}
