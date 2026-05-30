import { useEffect, useRef, useState } from "react";
import { ClipboardList, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppView = "builder" | "account" | "admin";

export type WorkspaceNavMenuProps = {
  brandName: string;
  authName: string;
  billingTierLabel: string;
  planStatusDetail?: string;
  appView: AppView;
  showAdminTab?: boolean;
  onAppViewChange: (view: AppView) => void;
  onSignOut: () => void;
  onOpenSnapshot?: () => void;
  themeName?: string;
  puzzleCount?: number;
};

export function WorkspaceNavMenu({
  brandName,
  authName,
  billingTierLabel,
  planStatusDetail,
  appView,
  showAdminTab = false,
  onAppViewChange,
  onSignOut,
  onOpenSnapshot,
  themeName,
  puzzleCount,
}: WorkspaceNavMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pickView = (view: AppView): void => {
    setOpen(false);
    onAppViewChange(view);
  };

  return (
    <div ref={rootRef} className="workspace-nav-menu relative shrink-0">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-600/80 bg-slate-900/80 text-slate-200 transition-colors hover:border-cyan-500/40 hover:bg-slate-800"
        aria-label="Workspace menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Menu className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          className="workspace-nav-menu__panel absolute left-0 top-[calc(100%+0.35rem)] z-[80] w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-slate-700/90 bg-slate-950/98 p-3 shadow-2xl"
          role="menu"
        >
          <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-slate-500">Workspace</p>
          <p className="m-0 mt-0.5 truncate text-sm font-semibold text-slate-100">{brandName}</p>
          <p className="m-0 mt-1 text-xs text-slate-400">
            Signed in as <strong className="text-slate-200">{authName}</strong>
          </p>
          <p className="m-0 mt-1 text-xs text-cyan-400/90">{billingTierLabel}</p>
          {planStatusDetail ? <p className="m-0 mt-1 text-[11px] text-slate-500">{planStatusDetail}</p> : null}

          <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-800 pt-3" role="group" aria-label="Main views">
            <Button type="button" size="sm" variant={appView === "builder" ? "default" : "outline"} className="justify-start" onClick={() => pickView("builder")}>
              Room builder
            </Button>
            <Button type="button" size="sm" variant={appView === "account" ? "default" : "outline"} className="justify-start" onClick={() => pickView("account")}>
              Account &amp; pricing
            </Button>
            {showAdminTab ? (
              <Button type="button" size="sm" variant={appView === "admin" ? "default" : "outline"} className="justify-start" onClick={() => pickView("admin")}>
                Admin
              </Button>
            ) : null}
          </div>

          {onOpenSnapshot ? (
            <div className="mt-3 border-t border-slate-800 pt-3">
              <p className="m-0 text-xs text-slate-400">
                Theme: <strong className="text-slate-200">{themeName ?? "Not selected"}</strong>
              </p>
              <p className="m-0 mt-1 text-xs text-slate-400">
                Puzzles: <strong className="text-slate-200">{puzzleCount ?? 0}</strong>
              </p>
              <Button type="button" size="sm" variant="outline" className="mt-2 w-full gap-1.5" onClick={() => { setOpen(false); onOpenSnapshot(); }}>
                <ClipboardList className="h-4 w-4" aria-hidden />
                Open plan snapshot
              </Button>
            </div>
          ) : null}

          <Button type="button" size="sm" variant="secondary" className="mt-3 w-full" onClick={() => { setOpen(false); onSignOut(); }}>
            Sign out
          </Button>
        </div>
      ) : null}
    </div>
  );
}
