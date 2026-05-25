import { useLayoutEffect, type RefObject } from "react";

/** Matches App.css: sidebar collapses to a top bar below 901px. */
const SIDEBAR_LAYOUT_MQ = "(min-width: 901px)";

function resolveTopNavStickyOffset(nav: HTMLElement): string {
  const navInSidebar = nav.closest(".app-sidebar-col") !== null;
  if (navInSidebar && window.matchMedia(SIDEBAR_LAYOUT_MQ).matches) {
    // Right-rail nav is not stacked above builder content — sticky wizard bar pins to viewport top.
    return "0px";
  }
  return `${nav.offsetHeight}px`;
}

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
      host.style.setProperty("--app-top-nav-height", resolveTopNavStickyOffset(nav));
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(nav);
    const mq = window.matchMedia(SIDEBAR_LAYOUT_MQ);
    mq.addEventListener("change", apply);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", apply);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remeasure when layout-affecting deps change
  }, deps);
}
