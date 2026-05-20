import { useLayoutEffect, type RefObject } from "react";

/** Publishes measured top nav height to a host element for sticky sub-nav offset. */
export function useTopNavHeight(
  navRef: RefObject<HTMLElement | null>,
  hostRef: RefObject<HTMLElement | null>,
  deps: readonly unknown[] = [],
): void {
  useLayoutEffect(() => {
    const nav = navRef.current;
    const host = hostRef.current;
    if (!nav || !host) return;

    const apply = (): void => {
      host.style.setProperty("--app-top-nav-height", `${nav.offsetHeight}px`);
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(nav);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remeasure when layout-affecting deps change
  }, deps);
}
