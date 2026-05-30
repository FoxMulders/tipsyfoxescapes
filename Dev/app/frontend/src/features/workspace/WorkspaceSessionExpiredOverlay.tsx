type WorkspaceSessionExpiredOverlayProps = {
  open: boolean;
  message: string;
  userName?: string;
  onSignIn: () => void;
};

export function WorkspaceSessionExpiredOverlay({
  open,
  message,
  userName,
  onSignIn,
}: WorkspaceSessionExpiredOverlayProps) {
  if (!open) return null;

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
