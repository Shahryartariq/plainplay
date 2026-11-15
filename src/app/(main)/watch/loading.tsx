export default function WatchLoading() {
  return (
    <main className="watch" aria-busy="true">
      <p className="visually-hidden" role="status">
        Loading video…
      </p>
      <div className="watch__main">
        <div className="player">
          <div className="player__frame skeleton">
            <div className="player__overlay player__overlay--loading">
              <span className="spinner" aria-hidden />
            </div>
          </div>
        </div>
        <div className="watch__info">
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--line skeleton--short" />
        </div>
      </div>
    </main>
  );
}
