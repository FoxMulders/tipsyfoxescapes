import { SidebarAdmin, type SidebarAdminProps } from "./SidebarAdmin";
import { BuilderAccountStrip, type BuilderAccountStripProps } from "./BuilderAccountStrip";
import type { GenerationTelemetry } from "../domain/generationTelemetry";

type StickyDashboardProps = SidebarAdminProps & BuilderAccountStripProps & {
  generationTelemetry?: GenerationTelemetry | null;
  puzzlesGenerating?: boolean;
  serverOpenAiConfigured?: boolean | null;
};

export function StickyDashboard({ className, generationTelemetry, puzzlesGenerating, serverOpenAiConfigured, browserAiReady, ...props }: StickyDashboardProps) {
  return (
    <aside className={`sticky-dashboard glass-panel ${className ?? ""}`} aria-label="Plan snapshot and account">
      <SidebarAdmin
        {...props}
        className="sticky-dashboard__inner"
        generationTelemetry={generationTelemetry}
        puzzlesGenerating={puzzlesGenerating}
        serverOpenAiConfigured={serverOpenAiConfigured}
        browserAiReady={browserAiReady}
      />
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
