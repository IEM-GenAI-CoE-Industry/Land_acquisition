# Industrial Land Intelligence
### AI-Driven Industrial Land Acquisition Platform — Frontend

A premium B2B enterprise GIS dashboard for discovering, evaluating, and comparing industrial land parcels using natural-language search powered by AI.

---

## Overview

This is the **frontend visualization module** of a larger AI-driven land acquisition system. It consumes two backend APIs — a natural-language query parser and a parcel scoring engine — and presents results on an interactive Leaflet map with viability-coded markers, parcel popups, and a detail panel.

The application is designed to feel like a professional **enterprise GIS / industrial intelligence tool**, not a generic real-estate listing site.

---

## Team Responsibilities

| Module | Owner | Integration Point |
|---|---|---|
| **Frontend Map UI** (this repo) | Saikat | — |
| `/parse-query` API (NLP parser) | Subham | `src/services/api.js` → `parseQuery()` |
| `/get-parcels` API (parcel scorer) | Adrija | `src/services/api.js` → `getParcels()` |
| Detail Panel (dossier view) | Souradeep | `src/components/DetailPanel.jsx` |

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | React 18 + Vite |
| Map | Leaflet + react-leaflet |
| HTTP Client | Axios |
| Styling | Vanilla CSS (CSS custom properties) |
| Map Tiles | OpenStreetMap (free, no API key) |
| Font | Inter (Google Fonts) |

---

## Project Structure

```
src/
├── components/
│   ├── SearchBar.jsx        # Natural-language query input
│   ├── MapView.jsx          # Leaflet map + overlay layout
│   ├── ParcelMarker.jsx     # Circle marker per parcel (viability-coded)
│   ├── ParcelPopup.jsx      # Compact popup on marker click
│   ├── DetailPanel.jsx      # Right sidebar — Souradeep's integration slot
│   ├── ResultsHeader.jsx    # "N parcels found" + sort control
│   ├── MapLegend.jsx        # Viability colour key overlay
│   ├── LayerControls.jsx    # Layer toggle panel (extensible)
│   └── LoadingState.jsx     # Top progress bar + status pill
│
├── services/
│   └── api.js               # All HTTP calls — mock/live toggled by .env
│
├── data/
│   └── mockParcels.json     # 25 sample parcels for development
│
├── utils/
│   └── mapUtils.js          # Pure helpers: viability bands, validation,
│                            # bounds calculation, sort, formatters
│
├── App.jsx                  # Root — owns all state, orchestrates flow
├── main.jsx                 # Vite entry point
└── index.css                # Full design system (tokens + all styles)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
# Clone the repository
git clone <repo-url>
cd Land_Acquisition

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

Create a `.env` file in the project root (already present):

```env
VITE_USE_MOCK_DATA=true
VITE_API_BASE_URL=http://localhost:8000
```

| Variable | Purpose |
|---|---|
| `VITE_USE_MOCK_DATA` | `true` → uses local mock data. `false` → calls real backend APIs |
| `VITE_API_BASE_URL` | Base URL for Adrija's and Subham's backend |

> **Never commit `.env` with production values to git.** Set environment variables in your deployment platform's dashboard instead.

---

## Mock Data Mode

The app ships with **25 realistic sample parcels** across Indian industrial corridors (Bangalore, NCR, Pune, Chennai, Hyderabad) in `src/data/mockParcels.json`.

With `VITE_USE_MOCK_DATA=true`, all API calls return this mock data with an artificial delay (600ms for parse, 900ms for parcels) to simulate real network behaviour.

**To switch to the live backend**, change one line in `.env`:
```diff
- VITE_USE_MOCK_DATA=true
+ VITE_USE_MOCK_DATA=false
```

---

## API Contract

### `POST /parse-query` — Subham's endpoint

**Request:**
```json
{ "query": "5 acres cold storage near airport with 3-phase power" }
```

**Response:**
```json
{
  "min_area_acres": 5,
  "max_area_acres": null,
  "use_case_tags": ["cold_storage"],
  "power_required": "3_phase",
  "flood_risk_allowed": false,
  "max_distance_to_airport_km": 10,
  "max_distance_to_highway_km": null,
  "zoning": "industrial"
}
```

---

### `POST /get-parcels` — Adrija's endpoint

**Request:** the `ParsedQuery` object returned by `/parse-query`

**Response:**
```json
[
  {
    "parcel_id": "P001",
    "name": "Plot near Expressway KM 12",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "area_acres": 6,
    "zoning": "industrial",
    "use_case_tags": ["cold_storage", "manufacturing"],
    "distance_to_airport_km": 4.2,
    "distance_to_highway_km": 0.8,
    "power_available": "3_phase",
    "flood_risk": false,
    "litigation_flag": false,
    "viability_score": 87,
    "score_breakdown": { "power": 30, "proximity": 27, "risk": 30 }
  }
]
```

> **Validation:** Parcels missing `parcel_id`, `latitude`, `longitude`, or `viability_score` are silently dropped from the map. Check the browser console in dev mode for a warning.

---

## Viability Score Bands

| Score | Band | Marker Colour |
|---|---|---|
| 80 – 100 | High | Muted green `#4a9a6a` |
| 60 – 79 | Medium | Muted amber `#9a7c2a` |
| 0 – 59 | Low | Muted red `#9a4040` |

These thresholds are defined once in `src/utils/mapUtils.js` (`VIABILITY_BANDS`) and used by markers, the legend, and the detail panel.

---

## Integration Guide for Teammates

### Adrija — Backend `/get-parcels`
No frontend changes needed. Set `VITE_USE_MOCK_DATA=false` and `VITE_API_BASE_URL` to your server. Ensure your backend sends CORS headers:
```
Access-Control-Allow-Origin: <frontend-origin>
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Subham — Backend `/parse-query`
Same as above — no frontend changes. The parsed query object is passed directly to `getParcels()`.

### Souradeep — Detail Panel
Replace **only** `src/components/DetailPanel.jsx`. The component receives one prop:

```jsx
// Props received:
// parcel: Parcel | null  — the selected parcel object, or null

export default function DetailPanel({ parcel }) {
  if (!parcel) return <aside className="detail-panel detail-panel--empty">...</aside>;
  return <aside className="detail-panel">...</aside>;
}
```

Keep the CSS class names `detail-panel` and `detail-panel--empty` on the root element — the layout grid depends on them. All parcel fields are documented in `src/services/api.js`.

---

## User Flow

```
User types natural-language query
          ↓
     <SearchBar>
          ↓
   POST /parse-query         ← Subham's AI parser
          ↓
   Structured query JSON
          ↓
   POST /get-parcels          ← Adrija's scoring engine
          ↓
   Parcel results array
          ↓
   Map auto-fits to results
   Viability-coded markers appear
          ↓
   User clicks a marker
          ↓
   Popup preview opens
   Detail panel populates     ← Souradeep's component
```

---

## Build for Production

```bash
# Build
npm run build

# Preview production build locally
npm run preview
```

Output is in the `dist/` folder — deploy to any static host (Vercel, Netlify, S3, Nginx).

---

## Pre-Launch Checklist

- [ ] `VITE_USE_MOCK_DATA=false` set in deployment environment
- [ ] `VITE_API_BASE_URL` points to production backend
- [ ] Backend CORS configured for frontend origin
- [ ] `/parse-query` and `/get-parcels` endpoints live and returning correct schema
- [ ] Souradeep's `DetailPanel.jsx` replaces the stub
- [ ] `npm run build` completes without errors
- [ ] End-to-end flow tested: search → map → popup → detail panel

---

## Layer Controls (Future)

The **Layers** panel (Flood Zones, Power Substations, Highways, Industrial Zones) is currently UI-only. The architecture is structured for easy extension — add a `<GeoJSON>` layer inside `MapView.jsx` that renders based on `activeLayers[key]` to activate each layer when GeoJSON data is available.

---

## License

Internal project — AI-Driven Industrial Land Acquisition Platform.
