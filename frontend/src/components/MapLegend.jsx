import React from "react";
import { VIABILITY_BANDS } from "../utils/mapUtils";

/**
 * MapLegend
 * Compact fixed overlay showing viability score bands.
 * Uses the same VIABILITY_BANDS constants as markers.
 */
export default function MapLegend() {
  return (
    <div className="map-legend" aria-label="Map viability legend">
      <div className="map-legend__title">Viability</div>
      <ul className="map-legend__items" role="list">
        {[
          { key: "high",   label: VIABILITY_BANDS.high.label,   range: "80–100" },
          { key: "medium", label: VIABILITY_BANDS.medium.label, range: "60–79"  },
          { key: "low",    label: VIABILITY_BANDS.low.label,    range: "< 60"   },
        ].map((item) => (
          <li key={item.key} className="map-legend__item" role="listitem">
            <span
              className={`map-legend__dot map-legend__dot--${item.key}`}
              aria-hidden="true"
            />
            <span className="map-legend__item-label">{item.label}</span>
            <span className="map-legend__item-range">{item.range}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
