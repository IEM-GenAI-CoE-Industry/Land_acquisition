import React from "react";
import { SORT_OPTIONS } from "../utils/mapUtils";

/**
 * ResultsHeader
 * Floating overlay above the map showing result count and sort control.
 *
 * Props:
 *   parcels: Parcel[]
 *   sortValue: string
 *   onSortChange(value: string): void
 */
export default function ResultsHeader({ parcels, sortValue, onSortChange }) {
  if (!parcels || parcels.length === 0) return null;

  return (
    <div className="results-header" role="status" aria-live="polite">
      <span className="results-header__count">
        {parcels.length} parcel{parcels.length !== 1 ? "s" : ""} found
      </span>

      <div className="results-header__sep" aria-hidden="true" />

      <label
        htmlFor="sort-select"
        className="results-header__sort-label"
      >
        Sort
      </label>

      <select
        id="sort-select"
        className="results-header__sort-select"
        value={sortValue}
        onChange={(e) => onSortChange(e.target.value)}
        aria-label="Sort parcels by"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
