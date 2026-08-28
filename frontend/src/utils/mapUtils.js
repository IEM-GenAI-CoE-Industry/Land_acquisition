// ─────────────────────────────────────────────────────────────────────────────
// mapUtils.js
// Pure utility functions for parcel data — no React, no side effects.
// Shared by MapView, ParcelMarker, MapLegend, and ResultsHeader.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Viability thresholds — single source of truth.
 * Used by markers, popup, legend, and results header.
 */
export const VIABILITY_BANDS = {
  high:   { min: 80, max: 100, label: "High",   color: "#4a9a6a" },
  medium: { min: 60, max: 79,  label: "Medium",  color: "#9a7c2a" },
  low:    { min: 0,  max: 59,  label: "Low",     color: "#9a4040" },
};

/**
 * Returns the viability band key for a given score.
 * @param {number} score
 * @returns {"high" | "medium" | "low"}
 */
export function getViabilityBand(score) {
  if (typeof score !== "number" || !isFinite(score)) return "low";
  if (score >= VIABILITY_BANDS.high.min) return "high";
  if (score >= VIABILITY_BANDS.medium.min) return "medium";
  return "low";
}

/**
 * Returns the muted CSS color string for a given viability score.
 * @param {number} score
 * @returns {string} CSS hex color
 */
export function getViabilityColor(score) {
  const band = getViabilityBand(score);
  return VIABILITY_BANDS[band].color;
}

/**
 * Returns the human-readable label for a viability score.
 * @param {number} score
 * @returns {string}
 */
export function getViabilityLabel(score) {
  const band = getViabilityBand(score);
  return VIABILITY_BANDS[band].label;
}

/**
 * Validates a parcel object before rendering on the map.
 * Returns true only when all critical spatial and score fields are valid.
 * @param {object} parcel
 * @returns {boolean}
 */
export function validateParcel(parcel) {
  if (!parcel || typeof parcel !== "object") return false;
  if (!parcel.parcel_id) return false;

  const lat = parcel.latitude;
  const lng = parcel.longitude;

  if (typeof lat !== "number" || !isFinite(lat)) return false;
  if (typeof lng !== "number" || !isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;

  if (typeof parcel.viability_score !== "number" || !isFinite(parcel.viability_score)) return false;

  return true;
}

/**
 * Computes Leaflet-compatible bounds from an array of valid parcels.
 * Returns null when no valid parcels are present.
 * @param {object[]} parcels  — assumed pre-filtered by validateParcel
 * @returns {number[][] | null}  [[minLat, minLng], [maxLat, maxLng]] or null
 */
export function getBounds(parcels) {
  if (!parcels || parcels.length === 0) return null;

  const lats = parcels.map((p) => p.latitude);
  const lngs = parcels.map((p) => p.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // For a single parcel add a small padding so the marker isn't at the edge
  if (parcels.length === 1) {
    const pad = 0.05;
    return [
      [minLat - pad, minLng - pad],
      [maxLat + pad, maxLng + pad],
    ];
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

/**
 * Formats a number to a fixed decimal string with a unit suffix.
 * @param {number} value
 * @param {number} decimals
 * @param {string} unit
 * @returns {string}
 */
export function formatDistance(value, unit = "km") {
  if (typeof value !== "number" || !isFinite(value)) return "N/A";
  return `${value.toFixed(1)} ${unit}`;
}

/**
 * Formats area acres nicely.
 * @param {number} acres
 * @returns {string}
 */
export function formatArea(acres) {
  if (typeof acres !== "number" || !isFinite(acres)) return "N/A";
  return `${acres.toLocaleString()} acres`;
}

/**
 * Formats a use_case_tags array into a readable string.
 * @param {string[]} tags
 * @returns {string}
 */
export function formatTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return "—";
  return tags.map((t) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(", ");
}

/**
 * Sort comparators for parcel arrays. Never mutates the original array.
 */
export const SORT_OPTIONS = [
  { value: "viability_desc",  label: "Viability ↓",         comparator: (a, b) => b.viability_score - a.viability_score },
  { value: "area_desc",       label: "Area ↓",              comparator: (a, b) => b.area_acres - a.area_acres },
  { value: "highway_asc",     label: "Highway Distance ↑",  comparator: (a, b) => a.distance_to_highway_km - b.distance_to_highway_km },
  { value: "airport_asc",     label: "Airport Distance ↑",  comparator: (a, b) => a.distance_to_airport_km - b.distance_to_airport_km },
];

/**
 * Returns a sorted copy of parcels using the named sort option.
 * @param {object[]} parcels
 * @param {string} sortValue
 * @returns {object[]}
 */
export function sortParcels(parcels, sortValue) {
  const option = SORT_OPTIONS.find((o) => o.value === sortValue);
  if (!option) return parcels;
  return [...parcels].sort(option.comparator);
}
