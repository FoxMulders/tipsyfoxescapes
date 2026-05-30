import type { ReactNode } from "react";
import { ThemesWorkspacePortal } from "./WorkspacePortals";

type ThemeStepPortalOrStaticProps = {
  persistent: boolean;
  children: ReactNode;
};

export function ThemeStepPortalOrStatic({ persistent, children }: ThemeStepPortalOrStaticProps) {
  if (persistent) {
    return (
      <ThemesWorkspacePortal>
        <div className="flow-content flow-content--themes-step workspace-themes-portal">{children}</div>
      </ThemesWorkspacePortal>
    );
  }
  return <div className="flow-content flow-content--themes-step">{children}</div>;
}
