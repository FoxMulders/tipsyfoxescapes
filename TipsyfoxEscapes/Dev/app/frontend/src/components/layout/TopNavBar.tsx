import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

type TopNavBarProps = {
  brandName: string;
  authName: string;
  authEmail: string;
  authProviderLabel: string;
  appView: "builder" | "account";
  onAppViewChange: (view: "builder" | "account") => void;
  onSignOut: () => void;
  onOpenSnapshot?: () => void;
  showSnapshot?: boolean;
  themeName?: string;
  puzzleCount?: number;
};

export function TopNavBar({
  brandName,
  authName,
  authEmail,
  authProviderLabel,
  appView,
  onAppViewChange,
  onSignOut,
  onOpenSnapshot,
  showSnapshot = true,
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

        <div className="app-top-nav__stats" aria-label="Mission status">
          <div className="app-top-nav__stat">
            <span className="text-muted-foreground text-xs">Theme</span>
            <strong className="text-sm">{themeName ?? "Not selected"}</strong>
          </div>
          <div className="app-top-nav__stat">
            <span className="text-muted-foreground text-xs">Puzzles</span>
            <strong className="text-sm">{puzzleCount ?? 0}</strong>
          </div>
        </div>

        <div className="app-top-nav__actions">
          <p className="app-top-nav__signed-in muted hidden text-xs sm:block" title={`${authEmail} via ${authProviderLabel}`}>
            Signed in as <strong className="text-foreground">{authName}</strong>
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
          {showSnapshot && onOpenSnapshot ? (
            <Button type="button" size="sm" variant="outline" onClick={onOpenSnapshot} className="gap-1.5">
              <ClipboardList className="h-4 w-4" aria-hidden />
              Plan snapshot
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="secondary" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
