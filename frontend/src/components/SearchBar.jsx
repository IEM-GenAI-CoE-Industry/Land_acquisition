import React, { useState, useCallback, useRef } from "react";

const PLACEHOLDER_EXAMPLES = [
  "5 acres cold storage near airport with 3-phase power, no flood risk",
  "10+ acres manufacturing plot near highway, no litigation",
  "Warehousing 8 acres within 5 km of expressway, 3-phase power",
  "Automotive plant site >12 acres, low flood risk, industrial zoning",
];

/**
 * SearchBar
 * Accepts a natural-language requirement and calls onSearch with the query.
 *
 * Props:
 *   onSearch(query: string) — called when user submits a valid query
 *   loading: boolean
 *   error: string | null
 */
export default function SearchBar({ onSearch, loading, error }) {
  const [query, setQuery] = useState("");
  const [placeholderIndex] = useState(() =>
    Math.floor(Math.random() * PLACEHOLDER_EXAMPLES.length)
  );
  const inputRef = useRef(null);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed || loading) return;
      onSearch(trimmed);
    },
    [query, loading, onSearch]
  );

  return (
    <section className="search-section" role="search">
      <form className="search-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="parcel-search-input" className="sr-only">
          Describe your industrial land requirement
        </label>

        <div className="search-input-wrapper">
          {/* Search icon */}
          <span className="search-input-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle
                cx="6.5"
                cy="6.5"
                r="4.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10.5 10.5L14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <input
            id="parcel-search-input"
            ref={inputRef}
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={PLACEHOLDER_EXAMPLES[placeholderIndex]}
            disabled={loading}
            autoComplete="off"
            spellCheck="false"
            aria-describedby={error ? "search-error" : undefined}
            aria-busy={loading}
          />
        </div>

        <button
          type="submit"
          className="search-btn"
          disabled={loading || !query.trim()}
          aria-label={loading ? "Searching…" : "Search industrial parcels"}
        >
          {loading ? (
            <>
              <span className="search-spinner" aria-hidden="true" />
              Searching
            </>
          ) : (
            <>
              Search
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
      </form>

      {error && (
        <div
          id="search-error"
          className="search-error"
          role="alert"
          aria-live="polite"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M7 4v4M7 10h.01"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {error}
        </div>
      )}
    </section>
  );
}
