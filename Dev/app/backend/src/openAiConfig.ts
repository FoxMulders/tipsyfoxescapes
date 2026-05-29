/** Whether production can call OpenAI (Master Generator, Council, AI themes). */
export const isOpenAiConfigured = (): boolean => {
  const key = String(process.env.OPENAI_API_KEY ?? "").trim();
  return key.startsWith("sk-");
};

export const OPENAI_MISSING_OPS_HINT =
  "Set OPENAI_API_KEY in Vercel → Project → Settings → Environment Variables (Production), then redeploy.";
