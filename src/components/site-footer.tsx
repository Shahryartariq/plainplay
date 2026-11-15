import type { ReactNode } from "react";

export function SiteFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="site-footer">
      <nav aria-label="Footer" className="site-footer__links">
        {children}
      </nav>
      <p className="site-footer__note">
        Videos are played by YouTube&apos;s own player. Plainplay is not affiliated with YouTube or Google.
      </p>
    </footer>
  );
}
