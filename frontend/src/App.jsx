import React, { useState, useCallback } from "react";
import SearchBar from "./components/SearchBar";
import MapView from "./components/MapView";
import DetailPanel from "./components/DetailPanel";
import { searchParcels } from "./services/api";
import { validateParcel } from "./utils/mapUtils";

// ── App
// Root component — owns all application state.
// Orchestrates: SearchBar → api.js (POST /search) → MapView → DetailPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [parcels,          setParcels]          = useState([]);
  const [selectedParcel,   setSelectedParcel]   = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState(null);
  const [searched,         setSearched]         = useState(false);
  const [sortValue,        setSortValue]        = useState("viability_desc");
  const [queryUnderstood,  setQueryUnderstood]  = useState(null);

  const [activeLayers, setActiveLayers] = useState({
    floodZones:       false,
    powerSubstations: false,
    highways:         false,
    industrialZones:  false,
  });

  // ── Search handler ─────────────────────────────────────────────────────────
  // Single call to POST /search — backend handles NLP + parcel filtering.
  const handleSearch = useCallback(async (query) => {
    if (!query || !query.trim()) return;

    setLoading(true);
    setError(null);
    setSelectedParcel(null);
    // Preserve previous parcels while loading so map isn't blank

    try {
      const { parcels: results, query_understood } = await searchParcels(query);

      if (!Array.isArray(results)) {
        throw new Error("Unexpected response from server.");
      }

      // Warn about invalid parcels in dev but never crash
      const invalidCount = results.filter((p) => !validateParcel(p)).length;
      if (invalidCount > 0 && import.meta.env.DEV) {
        console.warn(
          `[MapView] ${invalidCount} parcels failed validation and will not be rendered.`
        );
      }

      setParcels(results);
      setQueryUnderstood(query_understood);
      setSearched(true);
    } catch (err) {
      // Preserve previous results on error
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to retrieve parcels. Please try again."
      );
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Layer toggle ───────────────────────────────────────────────────────────
  const handleToggleLayer = useCallback((key) => {
    setActiveLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header__logo">
          <div className="app-header__icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="2" fill="currentColor" />
            </svg>
          </div>
          <div className="app-header__wordmark">
            <div className="app-header__title">Industrial Land Intelligence</div>
            <div className="app-header__subtitle">AI-Driven Acquisition Platform</div>
          </div>
        </div>

        <div className="app-header__divider" aria-hidden="true" />
        <span className="app-header__tag">MVP</span>

        <div className="app-header__spacer" />

        <div className="app-header__status">
          <span className="app-header__status-dot" aria-hidden="true" />
          {import.meta.env.VITE_USE_MOCK_DATA === "true" ? "Mock Data" : "Live API"}
        </div>
      </header>

      {/* ── Search ── */}
      <SearchBar
        onSearch={handleSearch}
        loading={loading}
        error={error}
      />

      {/* ── Workspace ── */}
      <main className="workspace">
        <MapView
          parcels={parcels}
          selectedParcel={selectedParcel}
          onParcelSelect={setSelectedParcel}
          loading={loading}
          searched={searched}
          sortValue={sortValue}
          onSortChange={setSortValue}
          activeLayers={activeLayers}
          onToggleLayer={handleToggleLayer}
        />

        {/* ── Detail Panel ── */}
        <DetailPanel
          parcel={selectedParcel}
          queryUnderstood={queryUnderstood}
          onClose={() => setSelectedParcel(null)}
        />
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <span className="app-footer__text">
          © 2025 Industrial Land Intelligence Platform
        </span>
        <span className="app-footer__sep" aria-hidden="true" />
        <span className="app-footer__text">
          Map: © OpenStreetMap contributors, © CARTO
        </span>
        <span className="app-footer__sep" aria-hidden="true" />
        <span className="app-footer__text">
          Data sourced via AI-assisted parcel scoring
        </span>
      </footer>
    </div>
  );
}
