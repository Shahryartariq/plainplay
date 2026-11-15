import Link from "next/link";
import { LogoMark } from "@/components/icons";

export default function NotFound() {
  return (
    <main id="main" className="page-message page-message--standalone">
      <div className="empty-state">
        <LogoMark size={40} />
        <h1 className="empty-state__title">Nothing to watch here</h1>
        <p className="empty-state__body">This video doesn&apos;t exist, was removed, or is private.</p>
        <div className="empty-state__actions">
          <Link className="button" href="/">
            Back to search
          </Link>
        </div>
      </div>
    </main>
  );
}
