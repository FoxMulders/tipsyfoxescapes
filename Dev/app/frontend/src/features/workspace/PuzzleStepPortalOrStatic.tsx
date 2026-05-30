import type { ReactNode } from "react";
import { PuzzleWorkspacePortal } from "./WorkspacePortals";

type PuzzleStepPortalOrStaticProps = {
  persistent: boolean;
  children: ReactNode;
};

export function PuzzleStepPortalOrStatic({ persistent, children }: PuzzleStepPortalOrStaticProps) {
  if (persistent) {
    return (
      <PuzzleWorkspacePortal>
        <div className="puzzle-builder-layout__main flow-content workspace-puzzle-portal">{children}</div>
      </PuzzleWorkspacePortal>
    );
  }
  return null;
}
