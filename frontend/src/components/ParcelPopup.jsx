import React from "react";
import { Popup } from "react-leaflet";
import {
  getViabilityBand,
  getViabilityLabel,
  formatDistance,
  formatArea,
  formatTags,
} from "../utils/mapUtils";

/**
 * ParcelPopup
 * Compact Leaflet Popup rendered inside a selected ParcelMarker.
 *
 * Props:
 *   parcel: Parcel
 *   onViewDetails(parcel): void
 *   onClose(): void
 */
export default function ParcelPopup({ parcel, onViewDetails, onClose }) {
  if (!parcel) return null;

  const band = getViabilityBand(parcel.viability_score);
  const label = getViabilityLabel(parcel.viability_score);

  return (
    <Popup
      eventHandlers={{
        popupclose: () => onClose(),
      }}
      closeButton={true}
      autoPan={true}
      autoPanPadding={[60, 60]}
    >
      <div className="parcel-popup">
        {/* Header */}
        <div className="parcel-popup__header">
          <div>
            <div className="parcel-popup__name">{parcel.name}</div>
            <div className="parcel-popup__id">{parcel.parcel_id}</div>
          </div>

          <div className={`parcel-popup__score parcel-popup__score--${band}`}>
            <div className="parcel-popup__score-value">
              {parcel.viability_score}
            </div>
            <div className="parcel-popup__score-label">/ 100</div>
            <div className={`parcel-popup__badge parcel-popup__badge--${band}`}>
              {label}
            </div>
          </div>
        </div>

        {/* Data rows */}
        <div className="parcel-popup__rows">
          <div className="parcel-popup__row">
            <span className="parcel-popup__row-label">Area</span>
            <span className="parcel-popup__row-value">
              {formatArea(parcel.area_acres)}
            </span>
          </div>
          <div className="parcel-popup__row">
            <span className="parcel-popup__row-label">Zoning</span>
            <span className="parcel-popup__row-value">
              {parcel.zoning
                ? parcel.zoning.charAt(0).toUpperCase() + parcel.zoning.slice(1)
                : "—"}
            </span>
          </div>
          <div className="parcel-popup__row">
            <span className="parcel-popup__row-label">Highway</span>
            <span className="parcel-popup__row-value">
              {formatDistance(parcel.distance_to_highway_km)}
            </span>
          </div>
          <div className="parcel-popup__row">
            <span className="parcel-popup__row-label">Airport</span>
            <span className="parcel-popup__row-value">
              {formatDistance(parcel.distance_to_airport_km)}
            </span>
          </div>
          <div className="parcel-popup__row">
            <span className="parcel-popup__row-label">Power</span>
            <span className="parcel-popup__row-value">
              {parcel.power_available
                ? parcel.power_available.replace(/_/g, " ")
                : "—"}
            </span>
          </div>
        </div>

        {/* Risk flags */}
        <div className="parcel-popup__flags">
          <span
            className={`parcel-popup__flag parcel-popup__flag--${
              parcel.flood_risk ? "warning" : "clear"
            }`}
          >
            {parcel.flood_risk ? "⚠ Flood Risk" : "✓ No Flood Risk"}
          </span>
          <span
            className={`parcel-popup__flag parcel-popup__flag--${
              parcel.litigation_flag ? "warning" : "clear"
            }`}
          >
            {parcel.litigation_flag ? "⚠ Litigation" : "✓ Clear Title"}
          </span>
        </div>

        {/* Action */}
        <button
          className="parcel-popup__action"
          onClick={() => onViewDetails(parcel)}
          aria-label={`View full details for ${parcel.name}`}
        >
          View Details
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 6h8M6 2l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </Popup>
  );
}
