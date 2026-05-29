import { SidebarAdmin, type SidebarAdminProps } from "./SidebarAdmin";
import { BuilderAccountStrip, type BuilderAccountStripProps } from "./BuilderAccountStrip";

type StickyDashboardProps = SidebarAdminProps & BuilderAccountStripProps;

export function StickyDashboard({ className, ...props }: StickyDashboardProps) {
  return (
    <aside className={`sticky-dashboard glass-panel ${className ?? ""}`} aria-label="Plan snapshot and account">
      <SidebarAdmin {...props} className="sticky-dashboard__inner" />
      <BuilderAccountStrip
        authName={props.authName}
        authEmail={props.authEmail}
        billingTierLabel={props.billingTierLabel}
        planStatusDetail={props.planStatusDetail}
        appView={props.appView}
        showAdminTab={props.showAdminTab}
        onAppViewChange={props.onAppViewChange}
        onSignOut={props.onSignOut}
      />
    </aside>
  );
}
