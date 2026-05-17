type GlobalFooterProps = {
  buildStamp: string;
  showBuilderPolicy?: boolean;
};

export function GlobalFooter({ buildStamp, showBuilderPolicy = false }: GlobalFooterProps) {
  return (
    <div className="page-footer-block global-site-footer">
      {showBuilderPolicy ? (
        <>
          <p className="footer-content-policy muted">
            In-app plans are for private planning only. Do not redistribute screen recordings or scraped text; use{" "}
            <strong>Export</strong> when you intend to share a sanitized artifact.
          </p>
          <p className="footer-anti-screenshot muted" role="note">
            Browsers cannot fully block screenshots—this is a policy plus light on-page discouragement, not technical DRM.
          </p>
        </>
      ) : null}
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
        <p className="footer-build-stamp">Build: {buildStamp}</p>
      </div>
    </div>
  );
}
