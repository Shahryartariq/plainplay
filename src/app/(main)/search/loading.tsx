export default function SearchLoading() {
  return (
    <main className="search-page" aria-busy="true">
      <p className="visually-hidden" role="status">
        Searching…
      </p>
      <div className="search-page__bar">
        <span className="skeleton skeleton--heading" />
        <span className="skeleton skeleton--chips" />
      </div>
      <ol className="results" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="result result--skeleton">
            <span className="result__link">
              <span className="result__thumb thumb skeleton" />
              <span className="result__body">
                <span className="skeleton skeleton--line" />
                <span className="skeleton skeleton--line skeleton--short" />
                <span className="skeleton skeleton--line skeleton--tiny" />
              </span>
            </span>
          </li>
        ))}
      </ol>
    </main>
  );
}
