import { useLayoutEffect, type RefObject } from "react";

/** Matches App.css: sidebar collapses to a top bar below 901px. */
const SIDEBAR_LAYOUT_MQ = "(min-width: 901px)";
const MOBILE_FIXED_MAP_MQ = "(max-width: 900px)";

function resolveTopNavStickyOffset(nav: HTMLElement): string {
  const navInSidebar = nav.closest(".app-sidebar-col") !== null;
  if (navInSidebar && window.matchMedia(SIDEBAR_LAYOUT_MQ).matches) {
    // Right-rail nav is not stacked above builder content — sticky wizard bar pins to viewport top.
    return "0px";
  }
  return `${nav.offsetHeight}px`;
}

/** Publishes measured top nav + wizard map bar heights for sticky/fixed layout offsets. */
export function useTopNavHeight(
  navRef: RefObject<HTMLElement | null>,
  hostRef: RefObject<HTMLElement | null>,
  mapBarRef: RefObject<HTMLElement | null> | null = null,
  deps: readonly unknown[] = [],
): void {
  useLayoutEffect(() => {
    const nav = navRef.current;
    const host = hostRef.current;
    if (!nav || !host) return;

    const apply = (): void => {
      host.style.setProperty("--app-top-nav-height", resolveTopNavStickyOffset(nav));
      const mapBar = mapBarRef?.current;
      if (mapBar) {
        host.style.setProperty("--flow-map-bar-height", `${mapBar.offsetHeight}px`);
      }
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(nav);
    const mapBar = mapBarRef?.current;
    if (mapBar) ro.observe(mapBar);
    const mqSidebar = window.matchMedia(SIDEBAR_LAYOUT_MQ);
    const mqMobileMap = window.matchMedia(MOBILE_FIXED_MAP_MQ);
    mqSidebar.addEventListener("change", apply);
    mqMobileMap.addEventListener("change", apply);
    return () => {
      ro.disconnect();
      mqSidebar.removeEventListener("change", apply);
      mqMobileMap.removeEventListener("change", apply);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remeasure when layout-affecting deps change
  }, deps);
}
