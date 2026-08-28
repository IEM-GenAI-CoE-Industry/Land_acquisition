import React from "react";
import {
  getViabilityBand,
  getViabilityLabel,
  formatDistance,
  formatArea,
  formatTags,
} from "../utils/mapUtils";

// ─────────────────────────────────────────────────────────────────────────────
// DetailPanel — INTEGRATION POINT FOR SOURADEEP
//
// This is a temporary stub. Replace the content of this file with your full
// detail panel implementation. Do NOT modify App.jsx, MapView.jsx, or state.
//
// Props received:
//   parcel: Parcel | null
//     The currently selected parcel object, or null if nothing is selected.
//     The full Parcel schema is documented in src/services/api.js (JSDoc).
// ─────────────────────────────────────────────────────────────────────────────

export default function DetailPanel({ parcel }) {
  // ── Empty state ────────────────────────────────────────────────────────────
  if (!parcel) {
    return (
      <aside className="detail-panel detail-panel--empty" aria-label="Parcel detail panel">
        <svg
          className="detail-panel__empty-icon"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
        >
          <rect x="4" y="8" width="24" height="28" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 16h12M10 22h8M10 28h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="30" cy="30" r="8" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5" />
          <path d="M27 30h6M30 27v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div className="detail-panel__empty-title">No parcel selected</div>
        <div className="detail-panel__empty-hint">
          Click any parcel marker on the map to view its detailed analysis.
        </div>
      </aside>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const band  = getViabilityBand(parcel.viability_score);
  const label = getViabilityLabel(parcel.viability_score);

  // Score breakdown — handle missing gracefully
  const breakdown = parcel.score_breakdown || {};
  const breakdownItems = [
    { key: "power",     label: "Power Supply",  value: breakdown.power     ?? null },
    { key: "proximity", label: "Proximity",      value: breakdown.proximity ?? null },
    { key: "risk",      label: "Risk Profile",   value: breakdown.risk      ?? null },
  ].filter((item) => item.value !== null);

  const maxBreakdownValue = 35; // approximate max per dimension

  return (
    <aside className="detail-panel" aria-label={`Detail panel for ${parcel.name}`}>
      {/* Header */}
      <div className="detail-panel__header">
        <div className="detail-panel__header-label">Selected Parcel</div>
        <div className="detail-panel__name">{parcel.name}</div>
        <div className="detail-panel__id">{parcel.parcel_id}</div>
      </div>

      {/* Viability score */}
      <div className="detail-panel__score-band">
        <div className={`detail-panel__score-number detail-panel__score-number--${band}`}>
          {parcel.viability_score}
        </div>
        <div className="detail-panel__score-meta">
          <div className="detail-panel__score-total">/ 100 Viability</div>
          <div className={`detail-panel__score-label detail-panel__score-label--${band}`}>
            {label}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="detail-panel__body">

        {/* Land Details */}
        <section aria-labelledby="detail-land-title">
          <div id="detail-land-title" className="detail-panel__section-title">
            Land Details
          </div>
          <div className="detail-panel__data-rows">
            <div className="detail-panel__data-row">
              <span className="detail-panel__data-label">Area</span>
              <span className="detail-panel__data-value">{formatArea(parcel.area_acres)}</span>
            </div>
            <div className="detail-panel__data-row">
              <span className="detail-panel__data-label">Zoning</span>
              <span className="detail-panel__data-value">
                {parcel.zoning
                  ? parcel.zoning.charAt(0).toUpperCase() + parcel.zoning.slice(1)
                  : "—"}
              </span>
            </div>
            <div className="detail-panel__data-row">
              <span className="detail-panel__data-label">Power</span>
              <span className="detail-panel__data-value">
                {parcel.power_available
                  ? parcel.power_available.replace(/_/g, " ")
                  : "—"}
              </span>
            </div>
          </div>
        </section>

        {/* Proximity */}
        <section aria-labelledby="detail-proximity-title">
          <div id="detail-proximity-title" className="detail-panel__section-title">
            Proximity
          </div>
          <div className="detail-panel__data-rows">
            <div className="detail-panel__data-row">
              <span className="detail-panel__data-label">Highway</span>
              <span className="detail-panel__data-value">
                {formatDistance(parcel.distance_to_highway_km)}
              </span>
            </div>
            <div className="detail-panel__data-row">
              <span className="detail-panel__data-label">Airport</span>
              <span className="detail-panel__data-value">
                {formatDistance(parcel.distance_to_airport_km)}
              </span>
            </div>
          </div>
        </section>

        {/* Risk Profile */}
        <section aria-labelledby="detail-risk-title">
          <div id="detail-risk-title" className="detail-panel__section-title">
            Risk Profile
          </div>
          <div className="detail-panel__data-rows">
            <div className="detail-panel__data-row">
              <span className="detail-panel__data-label">Flood Risk</span>
              <span
                className="detail-panel__data-value"
                style={{
                  color: parcel.flood_risk
                    ? "var(--status-low-text)"
                    : "var(--status-high-text)",
                }}
              >
                {parcel.flood_risk ? "Yes" : "None"}
              </span>
            </div>
            <div className="detail-panel__data-row">
              <span className="detail-panel__data-label">Litigation</span>
              <span
                className="detail-panel__data-value"
                style={{
                  color: parcel.litigation_flag
                    ? "var(--status-low-text)"
                    : "var(--status-high-text)",
                }}
              >
                {parcel.litigation_flag ? "Active" : "Clear"}
              </span>
            </div>
          </div>
        </section>

        {/* Score Breakdown */}
        {breakdownItems.length > 0 && (
          <section aria-labelledby="detail-breakdown-title">
            <div id="detail-breakdown-title" className="detail-panel__section-title">
              Score Breakdown
            </div>
            <div className="detail-panel__breakdown">
              {breakdownItems.map((item) => (
                <div key={item.key} className="detail-panel__breakdown-item">
                  <div className="detail-panel__breakdown-header">
                    <span className="detail-panel__breakdown-label">{item.label}</span>
                    <span className="detail-panel__breakdown-value">{item.value}</span>
                  </div>
                  <div className="detail-panel__breakdown-bar-track">
                    <div
                      className="detail-panel__breakdown-bar-fill"
                      style={{
                        width: `${Math.max(0, (item.value / maxBreakdownValue) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Use Case Tags */}
        {Array.isArray(parcel.use_case_tags) && parcel.use_case_tags.length > 0 && (
          <section aria-labelledby="detail-tags-title">
            <div id="detail-tags-title" className="detail-panel__section-title">
              Use Cases
            </div>
            <div className="detail-panel__tags">
              {parcel.use_case_tags.map((tag) => (
                <span key={tag} className="detail-panel__tag">
                  {tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Souradeep integration note */}
        <div className="detail-panel__stub-note" aria-hidden="true">
          ⚑ Souradeep: Replace this file with the full dossier panel. All parcel data is available via the <code>parcel</code> prop.
        </div>

      </div>
    </aside>
  );
}
