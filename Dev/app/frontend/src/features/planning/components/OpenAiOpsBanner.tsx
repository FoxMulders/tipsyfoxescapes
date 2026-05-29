type OpenAiOpsBannerProps = {
  configured: boolean | null;
  browserAiReady?: boolean;
  className?: string;
};

/** Intentionally hidden — generation runs via on-device AI or catalog without alarming ops banners. */
export function OpenAiOpsBanner(_props: OpenAiOpsBannerProps) {
  return null;
}
