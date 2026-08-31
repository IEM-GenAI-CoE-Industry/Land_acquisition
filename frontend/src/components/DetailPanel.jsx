import React from "react";
import {
  getViabilityBand,
  getViabilityLabel,
  formatDistance,
  formatArea,
} from "../utils/mapUtils";

// ─────────────────────────────────────────────────────────────────────────────
// DetailPanel (Souradeep — Parcel Dossier & Detail View)
//
// Props:
//   parcel: Parcel | null    — selected parcel from API / search results (normalised)
//   queryUnderstood: object  — query_understood parameters from search response
//   onClose: () => void      — callback to deselect parcel and close the panel
// ─────────────────────────────────────────────────────────────────────────────

// Factor display metadata & icons
const FACTOR_META = {
  power:         { label: "Power Supply",   icon: "⚡" },
  proximity_poi: { label: "POI Proximity",  icon: "✈" },
  flood:         { label: "Flood Safety",   icon: "🌊" },
  zoning:        { label: "Zoning Fit",     icon: "📋" },
  highway:       { label: "Highway Access", icon: "🛣" },
  size_fit:      { label: "Plot Size Fit",  icon: "📐" },
  water:         { label: "Water Access",   icon: "💧" },
};

/**
 * Formats a currency value in Lakhs to either ₹X.XX Cr or ₹X.X L
 */
function formatCurrencyLakh(lakhs) {
  if (typeof lakhs !== "number" || !isFinite(lakhs) || lakhs <= 0) return null;
  if (lakhs >= 100) {
    const crores = lakhs / 100;
    return `₹${crores.toFixed(2)} Cr`;
  }
  return `₹${lakhs.toLocaleString("en-IN", { maximumFractionDigits: 1 })} L`;
}

// ── Sub-component: PanelHeader ───────────────────────────────────────────────
function PanelHeader({ parcel, onClose }) {
  return (
    <header className="detail-panel__header">
      <div className="detail-panel__header-top">
        <div className="detail-panel__dossier-tag">
          <span className="detail-panel__dossier-dot" aria-hidden="true" />
          Parcel Dossier
        </div>
        {typeof onClose === "function" && (
          <button
            type="button"
            className="detail-panel__close-btn"
            onClick={onClose}
            aria-label="Close parcel detail panel"
            title="Close panel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      <h2 className="detail-panel__name">{parcel.name}</h2>
      <div className="detail-panel__id-row">
        <span className="detail-panel__id-label">ID:</span>
        <span className="detail-panel__id">{parcel.parcel_id}</span>
      </div>
    </header>
  );
}

// ── Sub-component: ViabilityScoreCard ────────────────────────────────────────
function ViabilityScoreCard({ score }) {
  const band  = getViabilityBand(score);
  const label = getViabilityLabel(score);
  const numericScore = typeof score === "number" && isFinite(score) ? score : 0;
  const clampedScore = Math.max(0, Math.min(100, numericScore));

  const tierDescription =
    band === "high"
      ? "High Suitability for Industrial Deployment"
      : band === "medium"
      ? "Moderate Suitability — Conditional Viability"
      : "Low Suitability — Elevated Constraints";

  return (
    <section className="detail-panel__score-card" aria-label="Viability score summary">
      <div className="detail-panel__score-card-main">
        <div className="detail-panel__score-left">
          <div className="detail-panel__score-label-heading">Viability Score</div>
          <div className={`detail-panel__score-number detail-panel__score-number--${band}`}>
            {numericScore.toFixed(1)}
            <span className="detail-panel__score-denominator">/ 100</span>
          </div>
        </div>

        <div className="detail-panel__score-badge-wrap">
          <div className={`detail-panel__score-badge detail-panel__score-badge--${band}`}>
            <span className="detail-panel__score-badge-dot" aria-hidden="true" />
            {label} Viability
          </div>
        </div>
      </div>

      <div className="detail-panel__score-meter" aria-hidden="true">
        <div
          className={`detail-panel__score-meter-fill detail-panel__score-meter-fill--${band}`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>

      <div className="detail-panel__score-tier-text">
        {tierDescription}
      </div>
    </section>
  );
}

// ── Sub-component: RiskAlertBanner ───────────────────────────────────────────
function RiskAlertBanner({ parcel, queryUnderstood }) {
  const redFlags = Array.isArray(parcel.red_flags) ? parcel.red_flags : [];
  const hasLitigation = Boolean(parcel.litigation_flag);
  const hasFlood = Boolean(parcel.flood_risk);

  const isCritical =
    hasLitigation ||
    (hasFlood && Boolean(queryUnderstood?.avoid_flood));

  const hasAnyRisk = hasLitigation || hasFlood || redFlags.length > 0;

  const alertStatus = isCritical ? "critical" : hasAnyRisk ? "warning" : "clear";

  return (
    <section className={`detail-panel__risk-banner detail-panel__risk-banner--${alertStatus}`} aria-label="Risk and due diligence status">
      <div className="detail-panel__risk-banner-header">
        <span className="detail-panel__risk-icon" aria-hidden="true">
          {alertStatus === "clear" ? "✓" : "⚠"}
        </span>
        <div className="detail-panel__risk-title-wrap">
          <div className="detail-panel__risk-title">
            {alertStatus === "critical"
              ? "Critical Due Diligence Alert"
              : alertStatus === "warning"
              ? "Risk Factors Identified"
              : "Clear Due Diligence Profile"}
          </div>
          <div className="detail-panel__risk-subtitle">
            {alertStatus === "clear"
              ? "No active litigation or flood hazards flagged."
              : `${redFlags.length > 0 ? redFlags.length : (hasLitigation ? 1 : 0) + (hasFlood ? 1 : 0)} warning factor(s) detected.`}
          </div>
        </div>
      </div>

      {redFlags.length > 0 ? (
        <ul className="detail-panel__redflags">
          {redFlags.map((flag, i) => (
            <li key={i} className="detail-panel__redflag">
              {flag}
            </li>
          ))}
        </ul>
      ) : (
        hasAnyRisk && (
          <ul className="detail-panel__redflags">
            {hasLitigation && (
              <li className="detail-panel__redflag">Pending litigation or disputed title flagged.</li>
            )}
            {hasFlood && (
              <li className="detail-panel__redflag">Located in a designated flood-prone area.</li>
            )}
          </ul>
        )
      )}
    </section>
  );
}

// ── Sub-component: ExecutiveSummary ──────────────────────────────────────────
function ExecutiveSummary({ parcel, totalEstimatedFormatted }) {
  const areaFormatted = formatArea(parcel.area_acres);
  const zoningFormatted = parcel.zoning
    ? parcel.zoning.charAt(0).toUpperCase() + parcel.zoning.slice(1)
    : "Unspecified";

  const highwayText = parcel.distance_to_highway_km != null
    ? `${formatDistance(parcel.distance_to_highway_km)} from highway`
    : null;

  const powerText = parcel.dist_power_km != null
    ? `${formatDistance(parcel.dist_power_km)} from substation`
    : null;

  const infraSnippet = [highwayText, powerText].filter(Boolean).join(" and ");

  return (
    <section className="detail-panel__section" aria-labelledby="detail-exec-title">
      <div id="detail-exec-title" className="detail-panel__section-title">
        Executive Summary
      </div>
      <div className="detail-panel__exec-card">
        {parcel.reason && (
          <div className="detail-panel__reason-block">
            <span className="detail-panel__reason-badge">AI Assessment</span>
            <p className="detail-panel__reason-text">{parcel.reason}</p>
          </div>
        )}

        <div className="detail-panel__exec-narrative">
          <p>
            This plot comprises <strong>{areaFormatted}</strong> zoned for <strong>{zoningFormatted}</strong> use.
            {infraSnippet && <> Connectivity profile includes proximity of <strong>{infraSnippet}</strong>.</>}
          </p>
          {totalEstimatedFormatted && parcel.price_per_acre_lakh != null && (
            <p className="detail-panel__exec-commercial">
              Estimated acquisition outlay: <strong>{totalEstimatedFormatted}</strong> (at ₹{parcel.price_per_acre_lakh.toLocaleString("en-IN")} L/acre estimate).
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Sub-component: KeyMetricsGrid ────────────────────────────────────────────
function KeyMetricsGrid({ parcel, totalEstimatedFormatted }) {
  return (
    <section className="detail-panel__section" aria-labelledby="detail-metrics-title">
      <div id="detail-metrics-title" className="detail-panel__section-title">
        Key Land & Infrastructure Metrics
      </div>
      <div className="detail-panel__metrics-grid">
        {/* Metric 1: Land Area */}
        <div className="detail-panel__metric-card">
          <span className="detail-panel__metric-label">Land Area</span>
          <span className="detail-panel__metric-value">{formatArea(parcel.area_acres)}</span>
          <span className="detail-panel__metric-sub">Total site footprint</span>
        </div>

        {/* Metric 2: Zoning */}
        <div className="detail-panel__metric-card">
          <span className="detail-panel__metric-label">Zoning</span>
          <span className="detail-panel__metric-value">
            {parcel.zoning
              ? parcel.zoning.charAt(0).toUpperCase() + parcel.zoning.slice(1)
              : "—"}
          </span>
          <span className="detail-panel__metric-sub">Master plan status</span>
        </div>

        {/* Metric 3: Price Per Acre */}
        <div className="detail-panel__metric-card">
          <span className="detail-panel__metric-label">Price / Acre</span>
          <span className="detail-panel__metric-value">
            {parcel.price_per_acre_lakh != null
              ? `₹${parcel.price_per_acre_lakh.toLocaleString("en-IN")} L`
              : "—"}
          </span>
          <span className="detail-panel__metric-sub">Indicative unit rate</span>
        </div>

        {/* Metric 4: Est. Total Value */}
        <div className="detail-panel__metric-card">
          <span className="detail-panel__metric-label">Est. Total Outlay</span>
          <span className="detail-panel__metric-value">
            {totalEstimatedFormatted || "—"}
          </span>
          <span className="detail-panel__metric-sub">Estimated total cost</span>
        </div>

        {/* Metric 5: Highway Proximity */}
        <div className="detail-panel__metric-card">
          <span className="detail-panel__metric-label">Highway Access</span>
          <span className="detail-panel__metric-value">
            {formatDistance(parcel.distance_to_highway_km)}
          </span>
          <span className="detail-panel__metric-sub">Nearest arterial road</span>
        </div>

        {/* Metric 6: Power Substation */}
        <div className="detail-panel__metric-card">
          <span className="detail-panel__metric-label">Power Substation</span>
          <span className="detail-panel__metric-value">
            {formatDistance(parcel.dist_power_km)}
          </span>
          <span className="detail-panel__metric-sub">
            {parcel.power_available ? parcel.power_available.replace(/_/g, " ") : "Grid proximity"}
          </span>
        </div>

        {/* Metric 7: Airport Proximity (if provided) */}
        {parcel.distance_to_airport_km != null && (
          <div className="detail-panel__metric-card">
            <span className="detail-panel__metric-label">Airport Distance</span>
            <span className="detail-panel__metric-value">
              {formatDistance(parcel.distance_to_airport_km)}
            </span>
            <span className="detail-panel__metric-sub">Cargo / passenger POI</span>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Sub-component: ScoreBreakdownSection ─────────────────────────────────────
function ScoreBar({ points, maxPoints = 35 }) {
  const pct = Math.max(0, Math.min(100, (points / maxPoints) * 100));
  const color =
    pct >= 70
      ? "var(--status-high-text)"
      : pct >= 40
      ? "var(--status-medium-text)"
      : "var(--status-low-text)";

  return (
    <div className="detail-panel__breakdown-bar-track">
      <div
        className="detail-panel__breakdown-bar-fill"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function ScoreBreakdownSection({ breakdown }) {
  if (!breakdown || breakdown.length === 0) return null;

  const maxPoints = Math.max(...breakdown.map((b) => b.points || 0), 1);

  return (
    <section className="detail-panel__section" aria-labelledby="detail-breakdown-title">
      <div id="detail-breakdown-title" className="detail-panel__section-title">
        Weighted Score Breakdown
      </div>
      <div className="detail-panel__breakdown">
        {breakdown.map((item) => {
          const meta = FACTOR_META[item.factor] ?? { label: item.factor, icon: "📊" };
          const pts = typeof item.points === "number" ? item.points.toFixed(1) : "0.0";
          return (
            <div key={item.factor} className="detail-panel__breakdown-item">
              <div className="detail-panel__breakdown-header">
                <span className="detail-panel__breakdown-label">
                  <span className="detail-panel__factor-icon" aria-hidden="true">{meta.icon}</span>
                  {meta.label}
                </span>
                <span className="detail-panel__breakdown-value">
                  {pts} pts
                </span>
              </div>
              <ScoreBar points={item.points || 0} maxPoints={maxPoints} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Sub-component: UseCaseTags ───────────────────────────────────────────────
function UseCaseTags({ tags }) {
  if (!Array.isArray(tags) || tags.length === 0) return null;

  return (
    <section className="detail-panel__section" aria-labelledby="detail-tags-title">
      <div id="detail-tags-title" className="detail-panel__section-title">
        Target Industrial Use Cases
      </div>
      <div className="detail-panel__tags">
        {tags.map((tag) => (
          <span key={tag} className="detail-panel__tag">
            {tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        ))}
      </div>
    </section>
  );
}

// ── Sub-component: EmptyState ────────────────────────────────────────────────
function EmptyState() {
  return (
    <aside className="detail-panel detail-panel--empty" aria-label="Parcel detail panel empty state">
      <div className="detail-panel__empty-content">
        <svg
          className="detail-panel__empty-icon"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
        >
          <rect x="4" y="8" width="24" height="28" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 16h12M10 22h8M10 28h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="30" cy="30" r="8" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5" />
          <path d="M27 30h6M30 27v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div className="detail-panel__empty-title">No Parcel Selected</div>
        <p className="detail-panel__empty-hint">
          Click any parcel marker on the map or select &quot;View Details&quot; in a popup to inspect its full acquisition dossier.
        </p>
      </div>
    </aside>
  );
}

// ── Main Component: DetailPanel ──────────────────────────────────────────────
export default function DetailPanel({ parcel, queryUnderstood, onClose }) {
  if (!parcel) {
    return <EmptyState />;
  }

  // Calculate estimated total land value if area and price are available
  const totalEstimatedLakh =
    typeof parcel.area_acres === "number" &&
    typeof parcel.price_per_acre_lakh === "number" &&
    parcel.area_acres > 0 &&
    parcel.price_per_acre_lakh > 0
      ? parcel.area_acres * parcel.price_per_acre_lakh
      : null;

  const totalEstimatedFormatted = formatCurrencyLakh(totalEstimatedLakh);

  // Normalize score breakdown (defensively handles array or object shapes)
  let breakdown = [];
  if (Array.isArray(parcel.score_breakdown)) {
    breakdown = [...parcel.score_breakdown].sort((a, b) => (b.points || 0) - (a.points || 0));
  } else if (parcel.score_breakdown && typeof parcel.score_breakdown === "object") {
    breakdown = Object.entries(parcel.score_breakdown)
      .map(([factor, pts]) => ({ factor, points: Number(pts) || 0 }))
      .sort((a, b) => b.points - a.points);
  }

  return (
    <aside
      className="detail-panel"
      aria-label={`Detailed land acquisition dossier for ${parcel.name}`}
    >
      {/* 1. Header with Name, ID, and Close Button */}
      <PanelHeader parcel={parcel} onClose={onClose} />

      {/* 2. Viability Score Summary Card */}
      <ViabilityScoreCard score={parcel.viability_score} />

      {/* Scrollable Dossier Body */}
      <div className="detail-panel__body">
        {/* 3. Unified Risk & Due Diligence Alert Banner */}
        <RiskAlertBanner parcel={parcel} queryUnderstood={queryUnderstood} />

        {/* 4. Business Executive Summary */}
        <ExecutiveSummary
          parcel={parcel}
          totalEstimatedFormatted={totalEstimatedFormatted}
        />

        {/* 5. Structured Key Land & Infrastructure Metrics Grid */}
        <KeyMetricsGrid
          parcel={parcel}
          totalEstimatedFormatted={totalEstimatedFormatted}
        />

        {/* 6. Factor-by-Factor Score Breakdown */}
        <ScoreBreakdownSection breakdown={breakdown} />

        {/* 7. Target Use Case Tags */}
        <UseCaseTags tags={parcel.use_case_tags} />
      </div>
    </aside>
  );
}
