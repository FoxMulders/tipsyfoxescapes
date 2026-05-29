import { Button } from "@/components/ui/button";

type AppView = "builder" | "account" | "admin";

export type BuilderAccountStripProps = {
  authName: string;
  authEmail: string;
  billingTierLabel: string;
  planStatusDetail?: string;
  appView: AppView;
  showAdminTab?: boolean;
  onAppViewChange: (view: AppView) => void;
  onSignOut: () => void;
};

export function BuilderAccountStrip({
  authName,
  authEmail,
  billingTierLabel,
  planStatusDetail,
  appView,
  showAdminTab,
  onAppViewChange,
  onSignOut,
}: BuilderAccountStripProps) {
  return (
    <section className="builder-account-strip" aria-label="Account and navigation">
      <div className="builder-account-strip__identity">
        <span className="builder-account-strip__tier">{billingTierLabel}</span>
        <p className="builder-account-strip__name">
          <strong>{authName}</strong>
        </p>
        <p className="builder-account-strip__email muted text-xs" title={authEmail}>
          {authEmail}
        </p>
        {planStatusDetail ? <p className="builder-account-strip__slots muted text-xs">{planStatusDetail}</p> : null}
      </div>
      <div className="builder-account-strip__actions" role="group" aria-label="Main views">
        <Button
          type="button"
          size="sm"
          variant={appView === "builder" ? "default" : "outline"}
          className="builder-account-strip__btn"
          onClick={() => onAppViewChange("builder")}
        >
          Room builder
        </Button>
        <Button
          type="button"
          size="sm"
          variant={appView === "account" ? "default" : "outline"}
          className="builder-account-strip__btn"
          onClick={() => onAppViewChange("account")}
        >
          Account
        </Button>
        {showAdminTab ? (
          <Button
            type="button"
            size="sm"
            variant={appView === "admin" ? "default" : "outline"}
            className="builder-account-strip__btn"
            onClick={() => onAppViewChange("admin")}
          >
            Admin
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="secondary" className="builder-account-strip__btn" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </section>
  );
}
