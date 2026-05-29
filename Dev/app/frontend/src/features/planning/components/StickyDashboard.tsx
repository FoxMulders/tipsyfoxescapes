import { SidebarAdmin, type SidebarAdminProps } from "./SidebarAdmin";

type StickyDashboardProps = SidebarAdminProps;

export function StickyDashboard(props: StickyDashboardProps) {
  return (
    <aside
      className={`sticky-dashboard ${props.className ?? ""}`}
      aria-label="Plan snapshot and account"
    >
      <SidebarAdmin {...props} className="sticky-dashboard__inner" />
    </aside>
  );
}
