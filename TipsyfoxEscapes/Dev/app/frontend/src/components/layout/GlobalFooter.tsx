type GlobalFooterProps = {
  buildStamp: string;
};

export function GlobalFooter({ buildStamp }: GlobalFooterProps) {
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
        <p className="footer-build-stamp">Build: {buildStamp}</p>
      </div>
    </div>
  );
}
