import React, { useRef, useEffect } from "react";
import { CircleMarker } from "react-leaflet";
import L from "leaflet";
import { getViabilityColor, getViabilityBand } from "../utils/mapUtils";
import ParcelPopup from "./ParcelPopup";

const RADIUS_NORMAL   = 8;
const RADIUS_SELECTED = 13;

/**
 * ParcelMarker
 *
 * Fix notes:
 *  1. Always render <ParcelPopup> (not conditional) so Leaflet keeps the
 *     popup bound to the layer. Use a ref + useEffect to imperatively call
 *     openPopup() / closePopup() when isSelected changes.
 *  2. Use L.DomEvent.stopPropagation(e) so the marker click does NOT bubble
 *     up to the MapClickHandler, which would immediately clear the selection.
 */
export default function ParcelMarker({
  parcel,
  isSelected,
  onSelect,
  onClose,
  onViewDetails,
}) {
  const markerRef = useRef(null);

  const color = getViabilityColor(parcel.viability_score);

  // ── Programmatically open / close popup when selection changes ────────────
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (isSelected) {
      marker.openPopup();
    } else {
      marker.closePopup();
    }
  }, [isSelected]);

  const pathOptions = isSelected
    ? {
        radius:      RADIUS_SELECTED,
        fillColor:   color,
        fillOpacity: 0.92,
        color:       "#1a1a1a",
        weight:      2.5,
      }
    : {
        radius:      RADIUS_NORMAL,
        fillColor:   color,
        fillOpacity: 0.82,
        color:       "rgba(255,255,255,0.6)",
        weight:      1.5,
      };

  return (
    <CircleMarker
      ref={markerRef}
      center={[parcel.latitude, parcel.longitude]}
      pathOptions={pathOptions}
      eventHandlers={{
        click: (e) => {
          // Stop event from bubbling to the map's click handler,
          // which would immediately call onDeselect() and wipe the selection.
          L.DomEvent.stopPropagation(e);
          onSelect(parcel);
        },
      }}
    >
      {/* Always mounted so Leaflet keeps the popup bound to this layer */}
      <ParcelPopup
        parcel={parcel}
        onViewDetails={onViewDetails}
        onClose={onClose}
      />
    </CircleMarker>
  );
}
