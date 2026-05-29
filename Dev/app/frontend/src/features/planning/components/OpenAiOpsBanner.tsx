type OpenAiOpsBannerProps = {
  configured: boolean | null;
  browserAiReady?: boolean;
  className?: string;
};

/** Shown when production is missing OPENAI_API_KEY — browser AI is the free path when available. */
export function OpenAiOpsBanner({ configured, browserAiReady, className }: OpenAiOpsBannerProps) {
  if (configured !== false) return null;
  if (browserAiReady) {
    return (
      <div className={`openai-ops-banner openai-ops-banner--browser ${className ?? ""}`} role="status">
        <strong>Server AI is offline.</strong> This browser can draft <em>original</em> themes and puzzles for free via
        Chrome&apos;s on-device Language Model — use <strong>Refresh Ideas</strong> and regenerate puzzles. For Council of Ten
        and Master Generator everywhere, add <code>OPENAI_API_KEY</code> in Vercel and redeploy.
      </div>
    );
  }
  return (
    <div className={`openai-ops-banner ${className ?? ""}`} role="alert">
      <strong>AI engine offline on this server.</strong>{" "}
      <code>OPENAI_API_KEY</code> is not set in Vercel production. Use Chrome with on-device AI enabled, or add the key under
      Vercel → Project → Settings → Environment Variables (Production), redeploy, then refresh themes and regenerate puzzles.
    </div>
  );
}
