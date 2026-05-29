type OpenAiOpsBannerProps = {
  configured: boolean | null;
  className?: string;
};

/** Shown when production is missing OPENAI_API_KEY — static catalog is expected until fixed. */
export function OpenAiOpsBanner({ configured, className }: OpenAiOpsBannerProps) {
  if (configured !== false) return null;
  return (
    <div className={`openai-ops-banner ${className ?? ""}`} role="alert">
      <strong>AI engine offline on this server.</strong>{" "}
      <code>OPENAI_API_KEY</code> is not set in Vercel production, so themes, puzzles, and the Council of Ten use the static
      catalog only. Add the key under Vercel → Project → Settings → Environment Variables (Production), redeploy, then use{" "}
      <strong>Refresh Ideas</strong> and regenerate puzzles.
    </div>
  );
}
