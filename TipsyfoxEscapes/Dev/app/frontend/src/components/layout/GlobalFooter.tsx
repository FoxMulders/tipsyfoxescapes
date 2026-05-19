import { useEffect, useState } from "react";

type GlobalFooterProps = {
  buildStamp: string;
};

type ReleaseInfo = {
  version: string;
  build?: string;
};

export function GlobalFooter({ buildStamp }: GlobalFooterProps) {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/version")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: ReleaseInfo) => {
        if (!cancelled && typeof data?.version === "string" && data.version.trim()) {
          setRelease({
            version: data.version.trim(),
            build: typeof data.build === "string" ? data.build : undefined,
          });
        }
      })
      .catch(() => {
        /* footer falls back to build-time stamp */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const versionLabel = release?.version ?? buildStamp;

  return (
    <div className="page-footer-block global-site-footer">
      <footer className="site-footer">
        <a href="/faq.html" target="_blank" rel="noreferrer">
          FAQ
        </a>
        <a href="/terms-of-service.html" target="_blank" rel="noreferrer">
          Terms of Service
        </a>
        <a href="/how-to.html" target="_blank" rel="noreferrer">
          How To Use
        </a>
        <a href="/contact.html" target="_blank" rel="noreferrer">
          Contact Us
        </a>
        <a href="/privacy.html" target="_blank" rel="noreferrer">
          Privacy
        </a>
        <a href="/disclaimer.html" target="_blank" rel="noreferrer">
          Disclaimer
        </a>
      </footer>
      <div className="footer-logo-wrap">
        <img src="/tipsy-fox-logo.JPEG" alt="The Tipsy Fox logo" className="footer-logo" />
        <p className="footer-copyright muted">© {new Date().getFullYear()} Tipsy Fox Escapes. All rights reserved.</p>
        <p className="footer-build-stamp">Build: {versionLabel}</p>
      </div>
    </div>
  );
}