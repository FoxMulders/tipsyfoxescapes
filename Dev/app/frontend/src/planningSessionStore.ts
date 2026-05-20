/** Resilient client store for planning sessionId (IndexedDB primary, localStorage fallback). */

const DB_NAME = "tipsyfox-planning-v1";
const DB_VERSION = 1;
const STORE = "sessions";
const LS_KEY = "escape-room-builder-planning-session-v1";

export type PersistedPlanningSession = {
  authTokenFingerprint: string;
  sessionId: string;
  leaseExpiresAt?: number;
  updatedAt: number;
};

export const fingerprintAuthToken = (authToken: string): string => {
  let h = 2166136261;
  for (let i = 0; i < authToken.length; i++) {
    h ^= authToken.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `tfx_${(h >>> 0).toString(36)}`;
};

const readLocalFallback = (): Record<string, PersistedPlanningSession> => {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PersistedPlanningSession>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeLocalFallback = (map: Record<string, PersistedPlanningSession>): void => {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    // quota / private mode
  }
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "authTokenFingerprint" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });

const idbGet = async (fingerprint: string): Promise<PersistedPlanningSession | null> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(fingerprint);
    req.onsuccess = () => resolve((req.result as PersistedPlanningSession | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("idb get failed"));
    tx.oncomplete = () => db.close();
  });
};

const idbPut = async (row: PersistedPlanningSession): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).put(row);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("idb put failed"));
    tx.oncomplete = () => db.close();
  });
};

const idbDelete = async (fingerprint: string): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(fingerprint);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error("idb delete failed"));
    tx.oncomplete = () => db.close();
  });
};

export const loadPersistedPlanningSession = async (
  authToken: string,
): Promise<PersistedPlanningSession | null> => {
  if (!authToken.trim()) return null;
  const fingerprint = fingerprintAuthToken(authToken);
  try {
    const fromIdb = await idbGet(fingerprint);
    if (fromIdb?.sessionId) return fromIdb;
  } catch {
    // fall through
  }
  const map = readLocalFallback();
  return map[fingerprint] ?? null;
};

export const persistPlanningSessionId = async (
  authToken: string,
  sessionId: string,
  leaseExpiresAt?: number,
): Promise<void> => {
  if (!authToken.trim() || !sessionId.trim()) return;
  const fingerprint = fingerprintAuthToken(authToken);
  const row: PersistedPlanningSession = {
    authTokenFingerprint: fingerprint,
    sessionId: sessionId.trim(),
    leaseExpiresAt,
    updatedAt: Date.now(),
  };
  const map = readLocalFallback();
  map[fingerprint] = row;
  writeLocalFallback(map);
  try {
    await idbPut(row);
  } catch {
    // localStorage already updated
  }
};

export const clearPersistedPlanningSession = async (authToken: string): Promise<void> => {
  if (!authToken.trim()) return;
  const fingerprint = fingerprintAuthToken(authToken);
  const map = readLocalFallback();
  delete map[fingerprint];
  writeLocalFallback(map);
  try {
    await idbDelete(fingerprint);
  } catch {
    // ignore
  }
};
