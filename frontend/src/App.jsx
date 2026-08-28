import React, { useState, useCallback, useEffect } from "react";
import SearchBar from "./components/SearchBar";
import MapView from "./components/MapView";
import DetailPanel from "./components/DetailPanel";
import { parseQuery, getParcels } from "./services/api";
import { validateParcel } from "./utils/mapUtils";

// ── App
// Root component — owns all application state.
// Orchestrates: SearchBar → api.js → MapView → DetailPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [parcels,        setParcels]        = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [searched,       setSearched]       = useState(false);
  const [sortValue,      setSortValue]      = useState("viability_desc");

  const [activeLayers, setActiveLayers] = useState({
    floodZones:       false,
    powerSubstations: false,
    highways:         false,
    industrialZones:  false,
  });

  // ── Auto-load on mount ─────────────────────────────────────────────────────
  // Silently loads mock parcels on startup so the map opens populated.
  // This does not run a full search — just seeds the initial view.
  useEffect(() => {
    (async () => {
      try {
        const results = await getParcels({});
        if (Array.isArray(results)) setParcels(results);
      } catch (_) {
        // Silent fail — user can still search manually
      }
    })();
  }, []);

  // ── Search handler ─────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (query) => {
    if (!query || !query.trim()) return;

    setLoading(true);
    setError(null);
    setSelectedParcel(null);
    // Preserve previous parcels while loading so map isn't blank

    try {
      const parsedQ  = await parseQuery(query);
      const results  = await getParcels(parsedQ);

      if (!Array.isArray(results)) {
        throw new Error("Unexpected response from server.");
      }

      // Warn about invalid parcels in dev but never crash
      const invalidCount = results.filter((p) => !validateParcel(p)).length;
      if (invalidCount > 0 && import.meta.env.DEV) {
        console.warn(`[MapView] ${invalidCount} parcels failed validation and will not be rendered.`);
      }

      setParcels(results);
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

        {/* ── Detail Panel (Souradeep's integration point) ── */}
        <DetailPanel parcel={selectedParcel} />
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
