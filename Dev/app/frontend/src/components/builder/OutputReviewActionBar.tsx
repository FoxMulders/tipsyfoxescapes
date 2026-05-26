type OutputReviewActionBarProps = {
  placement: "top" | "bottom";
  canGoBack: boolean;
  onBack: () => void;
  onContinueExport: () => void;
};

export function OutputReviewActionBar({
  placement,
  canGoBack,
  onBack,
  onContinueExport,
}: OutputReviewActionBarProps) {
  return (
    <div
      className={`output-review-action-bar output-review-action-bar--${placement}`}
      role="toolbar"
      aria-label={placement === "top" ? "Review actions (top)" : "Review actions (bottom)"}
    >
      <div className="output-review-action-bar__inner">
        {canGoBack ? (
          <button type="button" className="secondary-btn output-review-action-bar__btn" onClick={onBack}>
            ← Back
          </button>
        ) : null}
        <button type="button" className="primary-btn output-review-action-bar__btn" onClick={onContinueExport}>
          Continue to Export
        </button>
      </div>
    </div>
  );
}
