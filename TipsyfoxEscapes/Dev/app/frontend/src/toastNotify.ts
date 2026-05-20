import { toast } from "sonner";

/** Stable toast ids — Sonner replaces an existing toast when the same id is reused. */
export const TOAST_ID = {
  appError: "app-error",
  planningRecovery: "planning-session-recovery",
  signInForPuzzles: "sign-in-generate-puzzles",
} as const;

const SIGN_IN_FOR_PUZZLES = "sign in to generate puzzles";
const PLANNING_RECOVERY_PREFIX = "your planning session expired";

export const isSignInForPuzzlesMessage = (message: string): boolean =>
  message.trim().toLowerCase().includes(SIGN_IN_FOR_PUZZLES);

export const isPlanningRecoveryMessage = (message: string): boolean =>
  message.trim().toLowerCase().includes(PLANNING_RECOVERY_PREFIX);

export const toastErrorOnce = (message: string, id?: string): void => {
  const trimmed = message.trim();
  if (!trimmed) return;
  const toastId =
    id ??
    (isSignInForPuzzlesMessage(trimmed)
      ? TOAST_ID.signInForPuzzles
      : isPlanningRecoveryMessage(trimmed)
        ? TOAST_ID.planningRecovery
        : TOAST_ID.appError);
  toast.error(trimmed, { id: toastId });
};

export const toastMessageOnce = (message: string, id: string, duration = 4000): void => {
  const trimmed = message.trim();
  if (!trimmed) return;
  toast.message(trimmed, { id, duration });
};
