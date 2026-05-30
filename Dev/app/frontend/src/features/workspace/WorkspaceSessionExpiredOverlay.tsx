type WorkspaceSessionExpiredOverlayProps = {
  open: boolean;
  message: string;
  userName?: string;
  onSignIn: () => void;
  /** inline = non-blocking banner (Experience Designer). overlay = legacy full-screen modal. */
  variant?: "overlay" | "inline";
};

export function WorkspaceSessionExpiredOverlay({
  open,
  message,
  userName,
  onSignIn,
  variant = "overlay",
}: WorkspaceSessionExpiredOverlayProps) {
  if (!open) return null;

  if (variant === "inline") {
    return (
      <div className="workspace-session-expired-inline" role="alert">
        <div className="workspace-session-expired-inline__copy">
          <strong className="workspace-session-expired-inline__title">Session expired</strong>
          {userName ? (
            <span className="workspace-session-expired-inline__user muted">
              Signed in as <strong>{userName}</strong>
            </span>
          ) : null}
          <p className="workspace-session-expired-inline__message">{message}</p>
        </div>
        <button type="button" className="primary-btn workspace-session-expired-inline__action" onClick={onSignIn}>
          Sign in again
        </button>
      </div>
    );
  }

  return (
    <div
      className="workspace-session-expired-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-session-expired-title"
    >
      <div className="workspace-session-expired-dialog glass-panel">
        <h2 id="workspace-session-expired-title">Session expired</h2>
        {userName ? (
          <p className="workspace-session-expired-user muted">
            Signed in as <strong>{userName}</strong>
          </p>
        ) : null}
        <p className="workspace-session-expired-message">{message}</p>
        <p className="muted workspace-session-expired-hint">
          AI theme and puzzle generation requires an active sign-in. Static catalog results are disabled until you sign back in.
        </p>
        <button type="button" className="primary-btn w-full" onClick={onSignIn}>
          Sign in again
        </button>
      </div>
    </div>
  );
}
