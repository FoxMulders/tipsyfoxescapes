/**
 * Best-effort discouragement for casual copy/screenshot of builder content.
 * Browsers cannot block screenshots; this must not harm accessibility or mobile UX.
 */
export function installContentProtection(root: HTMLElement | null): () => void {
  if (!root || typeof document === "undefined") return () => {};

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let flashTimer: ReturnType<typeof window.setTimeout> | undefined;

  const flashBlur = (): void => {
    if (prefersReducedMotion) return;
    root.classList.add("content-protect-flash");
    if (flashTimer) window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => {
      root.classList.remove("content-protect-flash");
    }, 450);
  };

  const onVisibility = (): void => {
    root.classList.toggle("content-protect-hidden", document.visibilityState === "hidden");
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === "PrintScreen") flashBlur();
  };

  const onCopy = (event: ClipboardEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("input, textarea, select, button, [contenteditable='true']")) return;
    if (target.closest(".export-markdown-pre, .theme-idea-card, .theme-selected-brief")) return;
    if (!root.contains(target)) return;
    if (!root.classList.contains("page-shell--builder-protect")) return;
    event.preventDefault();
  };

  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("keyup", onKeyUp);
  root.addEventListener("copy", onCopy);
  onVisibility();

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("keyup", onKeyUp);
    root.removeEventListener("copy", onCopy);
    root.classList.remove("content-protect-hidden", "content-protect-flash");
    if (flashTimer) window.clearTimeout(flashTimer);
  };
}
