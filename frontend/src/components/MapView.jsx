import React, { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import ParcelMarker from "./ParcelMarker";
import MapLegend from "./MapLegend";
import LayerControls from "./LayerControls";
import ResultsHeader from "./ResultsHeader";
import LoadingState from "./LoadingState";
import { validateParcel, getBounds, sortParcels } from "../utils/mapUtils";

// ── India default center ──────────────────────────────────────────────────────
const INDIA_CENTER = [20.5937, 78.9629];
const INDIA_ZOOM   = 5;

// CartoDB Dark Matter — free with OSM attribution, no API key for standard use
const TILE_URL =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// ── FitBounds sub-component ───────────────────────────────────────────────────
/**
 * Uses a useEffect inside the map context to call fitBounds
 * whenever the valid parcel set changes.
 * The `key` on this component (from MapView) forces a remount
 * on each new search result so the effect always fires.
 */
function BoundsController({ validParcels }) {
  const map = useMap();
  const prevCount = useRef(0);

  useEffect(() => {
    if (validParcels.length === 0) return;
    const bounds = getBounds(validParcels);
    if (!bounds) return;
    // Small timeout lets Leaflet finish its internal state update
    setTimeout(() => {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
    }, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validParcels.length]);

  return null;
}

// ── Background click handler ──────────────────────────────────────────────────
function MapClickHandler({ onDeselect }) {
  useMapEvents({
    click: () => onDeselect(),
  });
  return null;
}

// ── Empty state overlay ───────────────────────────────────────────────────────
function EmptyState({ searched }) {
  if (!searched) return null;
  return (
    <div className="empty-state" role="status">
      <div className="empty-state__title">No suitable parcels found</div>
      <p className="empty-state__body">
        No industrial land matched your requirements.
      </p>
      <ul className="empty-state__suggestions">
        <li className="empty-state__suggestion">
          Increase the acceptable area range
        </li>
        <li className="empty-state__suggestion">
          Expand proximity requirements
        </li>
        <li className="empty-state__suggestion">
          Relax infrastructure constraints
        </li>
      </ul>
    </div>
  );
}

// ── MapView (main export) ─────────────────────────────────────────────────────
/**
 * MapView
 * The primary map component. Renders parcels, overlays, and manages the
 * Leaflet map instance.
 *
 * Props:
 *   parcels: Parcel[]         — raw results from API
 *   selectedParcel: Parcel | null
 *   onParcelSelect(parcel | null): void
 *   loading: boolean
 *   searched: boolean         — true after at least one search attempt
 *   sortValue: string
 *   onSortChange(value): void
 *   activeLayers: object
 *   onToggleLayer(key): void
 */
export default function MapView({
  parcels,
  selectedParcel,
  onParcelSelect,
  loading,
  searched,
  sortValue,
  onSortChange,
  activeLayers,
  onToggleLayer,
}) {
  // Filter to only valid, renderable parcels
  const validParcels = (parcels || []).filter(validateParcel);

  // Sorted copy for display — never mutates original
  const sortedParcels = sortParcels(validParcels, sortValue);

  const showEmpty = searched && !loading && sortedParcels.length === 0;

  return (
    <div className="map-area">
      <MapContainer
        className="map-container"
        center={INDIA_CENTER}
        zoom={INDIA_ZOOM}
        zoomControl={true}
        attributionControl={true}
        scrollWheelZoom={true}
      >
        {/* OpenStreetMap tiles (free, no API key required) */}
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          maxZoom={19}
        />

        {/* Auto-fit bounds on parcel change */}
        <BoundsController validParcels={validParcels} />

        {/* Deselect on map background click */}
        <MapClickHandler onDeselect={() => onParcelSelect(null)} />

        {/* Parcel markers */}
        {sortedParcels.map((parcel) => (
          <ParcelMarker
            key={parcel.parcel_id}
            parcel={parcel}
            isSelected={
              selectedParcel?.parcel_id === parcel.parcel_id
            }
            onSelect={onParcelSelect}
            onClose={() => onParcelSelect(null)}
            onViewDetails={onParcelSelect}
          />
        ))}
      </MapContainer>

      {/* Overlays (positioned absolutely over the map) */}
      <ResultsHeader
        parcels={sortedParcels}
        sortValue={sortValue}
        onSortChange={onSortChange}
      />

      <MapLegend />

      <LayerControls
        activeLayers={activeLayers}
        onToggleLayer={onToggleLayer}
      />

      {loading && <LoadingState loading={loading} />}

      {showEmpty && <EmptyState searched={searched} />}
    </div>
  );
}
