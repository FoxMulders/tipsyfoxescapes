import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const SLOT_ID = "workspace-theme-slot";

export function ThemesWorkspacePortal({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const find = (): void => {
      setSlot(document.getElementById(SLOT_ID));
    };
    find();
    const timer = window.setInterval(find, 100);
    return () => window.clearInterval(timer);
  }, []);

  if (!slot) return <div className="workspace-themes-extra flow-content flow-content--themes-step">{children}</div>;
  return createPortal(children, slot);
}

export function PuzzleWorkspacePortal({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const find = (): void => {
      setSlot(document.getElementById("workspace-puzzle-slot"));
    };
    find();
    const timer = window.setInterval(find, 100);
    return () => window.clearInterval(timer);
  }, []);

  if (!slot) return <>{children}</>;
  return createPortal(children, slot);
}
