import Link from "next/link";

export default function MainNotFound() {
  return (
    <main className="page-message">
      <div className="empty-state">
        <h1 className="empty-state__title">Nothing to watch here</h1>
        <p className="empty-state__body">This video or playlist doesn&apos;t exist, was removed, or is private.</p>
        <div className="empty-state__actions">
          <Link className="button" href="/">
            Back to search
          </Link>
        </div>
      </div>
    </main>
  );
}
