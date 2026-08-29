import React from "react";

const LAYERS = [
  { key: "floodZones",       label: "Flood Zones"       },
  { key: "powerSubstations", label: "Power Substations"  },
  { key: "highways",         label: "Highways"           },
  { key: "industrialZones",  label: "Industrial Zones"   },
];

/**
 * LayerControls
 * Stateful but UI-only layer toggles.
 * Structured so GeoJSON LayerGroups can be attached per-key in the future.
 *
 * Props:
 *   activeLayers: { [key]: boolean }
 *   onToggleLayer(key: string): void
 */
export default function LayerControls({ activeLayers, onToggleLayer }) {
  return (
    <div className="layer-controls" aria-label="Map layer controls">
      <div className="layer-controls__title">Layers</div>
      <ul className="layer-controls__items" role="list">
        {LAYERS.map((layer) => (
          <li key={layer.key} role="listitem">
            <label className="layer-controls__item">
              <input
                type="checkbox"
                id={`layer-${layer.key}`}
                className="layer-controls__checkbox"
                checked={activeLayers[layer.key] || false}
                onChange={() => onToggleLayer(layer.key)}
                aria-label={`Toggle ${layer.label} layer`}
              />
              <span className="layer-controls__label">{layer.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

