import { useSyncExternalStore } from "react";
import { creativeEnginesStore, type CreativeEnginesUiState } from "../store.ts";

export function useCreativeEnginesStore<T>(selector: (s: CreativeEnginesUiState) => T): T {
  return useSyncExternalStore(
    creativeEnginesStore.subscribe,
    () => selector(creativeEnginesStore.getState()),
    () => selector(creativeEnginesStore.getState()),
  );
}

export function useCreativeEnginesSnapshot(): CreativeEnginesUiState {
  return useCreativeEnginesStore((s) => s);
}
