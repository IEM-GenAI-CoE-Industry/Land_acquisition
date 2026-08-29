import React from "react";
import {
  getViabilityBand,
  getViabilityLabel,
  formatDistance,
  formatArea,
} from "../utils/mapUtils";

// ─────────────────────────────────────────────────────────────────────────────
// DetailPanel
//
// Props:
//   parcel: Parcel | null    — selected parcel from API (normalised)
//   queryUnderstood: object  — query_understood block from API response
// ─────────────────────────────────────────────────────────────────────────────

// Factor display names & icons
const FACTOR_META = {
  power:         { label: "Power Supply",   icon: "⚡" },
  proximity_poi: { label: "POI Proximity",  icon: "✈" },
  flood:         { label: "Flood Safety",   icon: "🌊" },
  zoning:        { label: "Zoning",         icon: "📋" },
  highway:       { label: "Highway Access", icon: "🛣" },
  size_fit:      { label: "Size Fit",       icon: "📐" },
  water:         { label: "Water Access",   icon: "💧" },
};

function ScoreBar({ points, maxPoints = 35 }) {
  const pct = Math.max(0, Math.min(100, (points / maxPoints) * 100));
  const color =
    pct >= 70 ? "var(--status-high-text)" :
    pct >= 40 ? "var(--status-medium-text)" :
                "var(--status-low-text)";
  return (
    <div className="detail-panel__breakdown-bar-track">
      <div
        className="detail-panel__breakdown-bar-fill"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function DetailPanel({ parcel, queryUnderstood }) {
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

  // score_breakdown is an array of {factor, raw_score, weight, points}
  const breakdown = Array.isArray(parcel.score_breakdown)
    ? [...parcel.score_breakdown].sort((a, b) => b.points - a.points)
    : [];

  const maxPoints = breakdown.length > 0
    ? Math.max(...breakdown.map((b) => b.points), 1)
    : 35;

  const redFlags = Array.isArray(parcel.red_flags) ? parcel.red_flags : [];
  const hasRedFlags = redFlags.length > 0;

  return (
    <aside className="detail-panel" aria-label={`Detail panel for ${parcel.name}`}>
      {/* ── Header ── */}
      <div className="detail-panel__header">
        <div className="detail-panel__header-label">Selected Parcel</div>
        <div className="detail-panel__name">{parcel.name}</div>
        <div className="detail-panel__id">{parcel.parcel_id}</div>
      </div>

      {/* ── Viability score ── */}
      <div className="detail-panel__score-band">
        <div className={`detail-panel__score-number detail-panel__score-number--${band}`}>
          {typeof parcel.viability_score === "number"
            ? parcel.viability_score.toFixed(1)
            : "—"}
        </div>
        <div className="detail-panel__score-meta">
          <div className="detail-panel__score-total">/ 100 Viability</div>
          <div className={`detail-panel__score-label detail-panel__score-label--${band}`}>
            {label}
          </div>
        </div>
      </div>

      {/* ── AI Reason ── */}
      {parcel.reason && (
        <div className="detail-panel__reason">
          <span className="detail-panel__reason-icon" aria-hidden="true">💡</span>
          {parcel.reason}
        </div>
      )}

      {/* ── Body ── */}
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
            {parcel.price_per_acre_lakh != null && (
              <div className="detail-panel__data-row">
                <span className="detail-panel__data-label">Price / acre</span>
                <span className="detail-panel__data-value">
                  ₹{parcel.price_per_acre_lakh.toLocaleString("en-IN")} L
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Proximity */}
        <section aria-labelledby="detail-proximity-title">
          <div id="detail-proximity-title" className="detail-panel__section-title">
            Proximity
          </div>
          <div className="detail-panel__data-rows">
            {parcel.distance_to_highway_km != null && (
              <div className="detail-panel__data-row">
                <span className="detail-panel__data-label">Highway</span>
                <span className="detail-panel__data-value">
                  {formatDistance(parcel.distance_to_highway_km)}
                </span>
              </div>
            )}
            {parcel.dist_power_km != null && (
              <div className="detail-panel__data-row">
                <span className="detail-panel__data-label">Power substation</span>
                <span className="detail-panel__data-value">
                  {formatDistance(parcel.dist_power_km)}
                </span>
              </div>
            )}
            {parcel.distance_to_airport_km != null && (
              <div className="detail-panel__data-row">
                <span className="detail-panel__data-label">Airport</span>
                <span className="detail-panel__data-value">
                  {formatDistance(parcel.distance_to_airport_km)}
                </span>
              </div>
            )}
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
                {parcel.flood_risk ? "⚠ Yes" : "✓ None"}
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
                {parcel.litigation_flag ? "⚠ Active" : "✓ Clear"}
              </span>
            </div>
          </div>
        </section>

        {/* Red Flags */}
        {hasRedFlags && (
          <section aria-labelledby="detail-redflags-title">
            <div id="detail-redflags-title" className="detail-panel__section-title">
              ⚠ Red Flags
            </div>
            <ul className="detail-panel__redflags">
              {redFlags.map((flag, i) => (
                <li key={i} className="detail-panel__redflag">
                  {flag}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Score Breakdown */}
        {breakdown.length > 0 && (
          <section aria-labelledby="detail-breakdown-title">
            <div id="detail-breakdown-title" className="detail-panel__section-title">
              Score Breakdown
            </div>
            <div className="detail-panel__breakdown">
              {breakdown.map((item) => {
                const meta = FACTOR_META[item.factor] ?? { label: item.factor, icon: "📊" };
                return (
                  <div key={item.factor} className="detail-panel__breakdown-item">
                    <div className="detail-panel__breakdown-header">
                      <span className="detail-panel__breakdown-label">
                        {meta.icon} {meta.label}
                      </span>
                      <span className="detail-panel__breakdown-value">
                        {item.points?.toFixed(1)} pts
                      </span>
                    </div>
                    <ScoreBar points={item.points} maxPoints={maxPoints} />
                  </div>
                );
              })}
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

      </div>
    </aside>
  );
}
