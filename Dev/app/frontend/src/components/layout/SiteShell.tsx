import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AppAtmosphere } from "./AppAtmosphere";

type SiteShellProps = {
  children: ReactNode;
  /** default: max-width builder shell; fullBleed: live/GM/player routes */
  variant?: "default" | "fullBleed";
  className?: string;
};

/** Shared atmospheric backdrop + page chrome so every route matches the builder palette. */
export function SiteShell({ children, variant = "default", className }: SiteShellProps) {
  return (
    <>
      <AppAtmosphere />
      {variant === "default" ? (
        <div className={cn("page-shell page-shell--layered site-shell", className)}>{children}</div>
      ) : (
        <div className={cn("site-shell site-shell--fullbleed", className)}>{children}</div>
      )}
    </>
  );
}
