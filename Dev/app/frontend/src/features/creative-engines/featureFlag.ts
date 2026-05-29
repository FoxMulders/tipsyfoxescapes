/** Feature flag: set VITE_CREATIVE_ENGINES=1 in .env or Vercel env to enable creative engines workspace. */
export const isCreativeEnginesEnabled = (): boolean => import.meta.env.VITE_CREATIVE_ENGINES === "1";
