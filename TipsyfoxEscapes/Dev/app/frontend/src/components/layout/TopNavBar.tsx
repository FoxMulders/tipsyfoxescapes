import { ClipboardList, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type TopNavBarProps = {
  brandName: string;
  authName: string;
  authEmail: string;
  authProviderLabel: string;
  billingTierLabel: string;
  planStatusDetail?: string;
  appView: "builder" | "account";
  onAppViewChange: (view: "builder" | "account") => void;
  onSignOut: () => void;
  onOpenSnapshot?: () => void;
  themeName?: string;
  puzzleCount?: number;
};

export function TopNavBar({
  brandName,
  authName,
  authEmail,
  authProviderLabel,
  billingTierLabel,
  planStatusDetail,
  appView,
  onAppViewChange,
  onSignOut,
  onOpenSnapshot,
  themeName,
  puzzleCount,
}: TopNavBarProps) {
  return (
    <header className="app-top-nav glass-panel" role="banner">
      <div className="app-top-nav__inner">
        <div className="app-top-nav__brand">
          <p className="app-top-nav__chip">Escape Room Builder</p>
          <h1 className="app-top-nav__title">{brandName}</h1>
        </div>

        <div className="app-top-nav__utility" aria-label="Account and plan">
          <span className="app-top-nav__plan-tier" title={planStatusDetail}>
            {billingTierLabel}
          </span>
          <p className="app-top-nav__signed-in muted hidden text-xs sm:block" title={`${authEmail} via ${authProviderLabel}`}>
            <strong className="text-foreground">{authName}</strong>
          </p>
          <div className="app-view-toggle" role="tablist" aria-label="Main views">
            <Button
              type="button"
              size="sm"
              variant={appView === "builder" ? "default" : "outline"}
              onClick={() => onAppViewChange("builder")}
            >
              Room builder
            </Button>
            <Button
              type="button"
              size="sm"
              variant={appView === "account" ? "default" : "outline"}
              onClick={() => onAppViewChange("account")}
            >
              Account
            </Button>
          </div>
          {onOpenSnapshot ? (
            <details className="app-top-nav__plan-menu">
              <summary className="app-top-nav__plan-menu-trigger">
                <ClipboardList className="h-4 w-4" aria-hidden />
                Plan
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </summary>
              <div className="app-top-nav__plan-menu-panel glass-panel">
                <p className="app-top-nav__plan-menu-row">
                  <span className="text-muted-foreground text-xs">Theme</span>
                  <strong className="text-sm">{themeName ?? "Not selected"}</strong>
                </p>
                <p className="app-top-nav__plan-menu-row">
                  <span className="text-muted-foreground text-xs">Puzzles</span>
                  <strong className="text-sm">{puzzleCount ?? 0}</strong>
                </p>
                {planStatusDetail ? <p className="muted text-xs">{planStatusDetail}</p> : null}
                <Button type="button" size="sm" variant="outline" className="mt-2 w-full gap-1.5" onClick={onOpenSnapshot}>
                  <ClipboardList className="h-4 w-4" aria-hidden />
                  Open plan snapshot
                </Button>
              </div>
            </details>
          ) : null}
          <Button type="button" size="sm" variant="secondary" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
