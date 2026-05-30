type ThemeGenerateButtonProps = {
  themesCount: number;
  loading: boolean;
  disabled: boolean;
  disabledTitle?: string;
  onGenerate: () => void;
  className?: string;
};

export function ThemeGenerateButton({
  themesCount,
  loading,
  disabled,
  disabledTitle,
  onGenerate,
  className,
}: ThemeGenerateButtonProps) {
  return (
    <button
      type="button"
      className={`secondary-btn theme-generate-new-btn${className ? ` ${className}` : ""}`}
      disabled={disabled || loading}
      title={disabledTitle}
      aria-busy={loading}
      onClick={onGenerate}
    >
      {loading ? "Generating…" : themesCount > 0 ? "Generate new themes" : "Generate themes"}
    </button>
  );
}
