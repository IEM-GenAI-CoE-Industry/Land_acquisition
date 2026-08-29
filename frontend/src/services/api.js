// ─────────────────────────────────────────────────────────────────────────────
// services/api.js
// Single source of truth for all backend communication.
// Backend: POST https://land-filter.onrender.com/search
// Set VITE_USE_MOCK_DATA=true in .env to use mock data instead.
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import mockParcels from "../data/mockParcels.json";

// ── Configuration ─────────────────────────────────────────────────────────────
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://land-filter.onrender.com";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ── Normalizer ────────────────────────────────────────────────────────────────
/**
 * Normalises a raw parcel from the /search API response into the shape
 * that MapView, ParcelMarker, ParcelPopup, and DetailPanel expect.
 *
 * API field  →  Frontend field
 * ─────────────────────────────
 * id          →  parcel_id
 * lat/lng     →  latitude/longitude
 * acreage     →  area_acres
 * dist_highway_km → distance_to_highway_km
 * red_flags[] →  flood_risk (bool), litigation_flag (bool)  [derived]
 *
 * @param {object} raw — parcel object from the API response
 * @returns {Parcel}
 */
function normalizeParcel(raw) {
  const redFlags = Array.isArray(raw.red_flags) ? raw.red_flags : [];

  // Derive boolean flags from the red_flags text array
  const floodRisk = redFlags.some((f) => /flood/i.test(f));
  const litigationFlag = redFlags.some((f) =>
    /litigation|disputed/i.test(f)
  );

  return {
    // Identity
    parcel_id: raw.id ?? raw.parcel_id ?? "unknown",
    name: raw.name ?? "Unknown Parcel",

    // Spatial
    latitude: typeof raw.lat === "number" ? raw.lat : (raw.latitude ?? 0),
    longitude: typeof raw.lng === "number" ? raw.lng : (raw.longitude ?? 0),

    // Size
    area_acres: raw.acreage ?? raw.area_acres ?? 0,

    // Classification
    zoning: raw.zoning ?? null,

    // Pricing (new field from API)
    price_per_acre_lakh: raw.price_per_acre_lakh ?? null,

    // Infrastructure
    dist_power_km: raw.dist_power_km ?? null,
    distance_to_highway_km:
      raw.dist_highway_km ?? raw.distance_to_highway_km ?? null,
    distance_to_airport_km: raw.distance_to_airport_km ?? null,
    power_available: raw.power_available ?? null,

    // Risk (derived from red_flags array)
    flood_risk: floodRisk,
    litigation_flag: litigationFlag,

    // Scoring
    viability_score: raw.viability_score ?? 0,
    // score_breakdown is an array of {factor, raw_score, weight, points}
    score_breakdown: Array.isArray(raw.score_breakdown)
      ? raw.score_breakdown
      : [],

    // AI-generated fields
    reason: raw.reason ?? null,
    red_flags: redFlags,

    // Use case tags (may not be in this API – default empty)
    use_case_tags: Array.isArray(raw.use_case_tags) ? raw.use_case_tags : [],
  };
}

// ── Mock stub ─────────────────────────────────────────────────────────────────

/**
 * Mock: returns stub parcels after an artificial delay.
 * @returns {Promise<SearchResult>}
 */
async function mockSearch(_query) {
  await delay(900);
  const parcels = Array.isArray(mockParcels)
    ? mockParcels.map(normalizeParcel)
    : [];
  return { parcels, query_understood: {}, count: parcels.length };
}

// ── Live API implementation ───────────────────────────────────────────────────

/**
 * Live: POST /search
 * Sends the raw natural-language query and returns normalised parcels.
 * @param {string} query
 * @returns {Promise<SearchResult>}
 */
async function liveSearch(query) {
  const { data } = await client.post("/search", { query });

  // The API wraps results in { parcels: [...], query_understood: {}, count: N }
  const raw = Array.isArray(data?.parcels) ? data.parcels : (Array.isArray(data) ? data : []);
  const parcels = raw.map(normalizeParcel);

  return {
    parcels,
    query_understood: data?.query_understood ?? {},
    count: data?.count ?? parcels.length,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Searches for matching parcels using a natural-language query.
 * Internally hits POST /search and normalises the response.
 *
 * @param {string} query — raw user query string
 * @returns {Promise<SearchResult>}
 * @throws Will throw on network failure or unexpected response shape.
 */
export async function searchParcels(query) {
  if (USE_MOCK_DATA) return mockSearch(query);
  return liveSearch(query);
}

/**
 * @deprecated Use searchParcels() instead.
 * Kept for backward-compatibility; returns empty array.
 */
export async function parseQuery(_query) {
  return {};
}

/**
 * @deprecated Use searchParcels() instead.
 * Kept for backward-compatibility; returns empty array.
 */
export async function getParcels(_parsedQuery) {
  return [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── JSDoc type definitions ────────────────────────────────────────────────────

/**
 * @typedef {Object} SearchResult
 * @property {Parcel[]} parcels
 * @property {object}   query_understood
 * @property {number}   count
 */

/**
 * @typedef {Object} Parcel
 * @property {string}       parcel_id
 * @property {string}       name
 * @property {number}       latitude
 * @property {number}       longitude
 * @property {number}       area_acres
 * @property {string|null}  zoning
 * @property {number|null}  price_per_acre_lakh
 * @property {number|null}  dist_power_km
 * @property {number|null}  distance_to_highway_km
 * @property {number|null}  distance_to_airport_km
 * @property {string|null}  power_available
 * @property {boolean}      flood_risk
 * @property {boolean}      litigation_flag
 * @property {number}       viability_score
 * @property {object[]}     score_breakdown   — [{factor, raw_score, weight, points}]
 * @property {string|null}  reason
 * @property {string[]}     red_flags
 * @property {string[]}     use_case_tags
 */
