import React from "react";

/**
 * LoadingState
 * Renders a top loading bar (always) and a floating status pill (inside the map).
 *
 * Props:
 *   loading: boolean
 */
export default function LoadingState({ loading }) {
  if (!loading) return null;

  return (
    <>
      {/* Top-of-page progress bar */}
      <div className="loading-bar" role="progressbar" aria-label="Loading results">
        <div className="loading-bar__fill" />
      </div>

      {/* In-map floating pill */}
      <div
        className="loading-overlay"
        aria-live="polite"
        aria-label="Searching industrial parcels"
      >
        <span className="loading-overlay__spinner" aria-hidden="true" />
        <span className="loading-overlay__text">Searching industrial parcels…</span>
      </div>
    </>
  );
}
