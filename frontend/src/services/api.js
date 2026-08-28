// ─────────────────────────────────────────────────────────────────────────────
// services/api.js
// Single source of truth for all backend communication.
// Set VITE_USE_MOCK_DATA=false and VITE_API_BASE_URL in .env to go live.
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import mockParcels from "../data/mockParcels.json";

// ── Configuration ─────────────────────────────────────────────────────────────
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ── Mock stubs ────────────────────────────────────────────────────────────────

/**
 * Mock implementation of parseQuery.
 * Returns a stub ParsedQuery object after a short artificial delay.
 * @param {string} _query — ignored in mock mode
 * @returns {Promise<ParsedQuery>}
 */
async function mockParseQuery(_query) {
  await delay(600);
  return {
    min_area_acres: null,
    max_area_acres: null,
    use_case_tags: [],
    power_required: null,
    flood_risk_allowed: null,
    max_distance_to_airport_km: null,
    max_distance_to_highway_km: null,
    zoning: "industrial",
  };
}

/**
 * Mock implementation of getParcels.
 * Returns all mock parcels after a short artificial delay.
 * @param {ParsedQuery} _parsedQuery — ignored in mock mode
 * @returns {Promise<Parcel[]>}
 */
async function mockGetParcels(_parsedQuery) {
  await delay(900);
  return mockParcels;
}

// ── Live API implementations ──────────────────────────────────────────────────

/**
 * Live implementation: POST /parse-query
 * @param {string} query — natural-language search string
 * @returns {Promise<ParsedQuery>}
 */
async function liveParseQuery(query) {
  const { data } = await client.post("/parse-query", { query });
  return data;
}

/**
 * Live implementation: POST /get-parcels
 * @param {ParsedQuery} parsedQuery — structured query from parseQuery()
 * @returns {Promise<Parcel[]>}
 */
async function liveGetParcels(parsedQuery) {
  const { data } = await client.post("/get-parcels", parsedQuery);
  if (!Array.isArray(data)) {
    throw new Error("Unexpected response format from /get-parcels");
  }
  return data;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parses a natural-language query into a structured ParsedQuery.
 * Integrates with Subham's /parse-query endpoint.
 *
 * @param {string} query
 * @returns {Promise<ParsedQuery>}
 * @throws Will throw on network failure or unexpected response shape.
 */
export async function parseQuery(query) {
  if (USE_MOCK_DATA) return mockParseQuery(query);
  return liveParseQuery(query);
}

/**
 * Fetches matching industrial parcels from Adrija's /get-parcels endpoint.
 *
 * @param {ParsedQuery} parsedQuery — structured output from parseQuery()
 * @returns {Promise<Parcel[]>}
 * @throws Will throw on network failure or unexpected response shape.
 */
export async function getParcels(parsedQuery) {
  if (USE_MOCK_DATA) return mockGetParcels(parsedQuery);
  return liveGetParcels(parsedQuery);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── JSDoc type definitions ────────────────────────────────────────────────────

/**
 * @typedef {Object} ParsedQuery
 * @property {number|null} min_area_acres
 * @property {number|null} max_area_acres
 * @property {string[]} use_case_tags
 * @property {string|null} power_required
 * @property {boolean|null} flood_risk_allowed
 * @property {number|null} max_distance_to_airport_km
 * @property {number|null} max_distance_to_highway_km
 * @property {string|null} zoning
 */

/**
 * @typedef {Object} Parcel
 * @property {string}   parcel_id
 * @property {string}   name
 * @property {number}   latitude
 * @property {number}   longitude
 * @property {number}   area_acres
 * @property {string}   zoning
 * @property {string[]} use_case_tags
 * @property {number}   distance_to_airport_km
 * @property {number}   distance_to_highway_km
 * @property {string}   power_available
 * @property {boolean}  flood_risk
 * @property {boolean}  litigation_flag
 * @property {number}   viability_score
 * @property {Object}   score_breakdown
 */
