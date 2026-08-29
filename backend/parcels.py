"""
parcels.py
----------
The mock land-parcel dataset for the MVP demo.

This is Adrija's data. Subham's parser only tells us what the *user wants*;
this file is the inventory we search against. Everything downstream (Saikat's map
pins, Souradeep's detail panel) reads the fields defined here, so treat these
field names as part of the team contract.

The data is generated deterministically (fixed seed) so every run — and every
teammate's machine — produces the exact same 24 parcels. Change SEED or the
ranges to reshape the dataset; the shape (the keys) should stay stable.
"""

import random

SEED = 42

# --- Corridor geography -------------------------------------------------------
# We pin the demo to one corridor (per the FRD: a single ~50km industrial belt).
# Here: the Durgapur Expressway (NH19) belt, Dankuni -> Durgapur, West Bengal.
# Parcels are scattered along the line between these two anchor points.
_CORRIDOR_START = (22.68, 88.30)   # Dankuni end
_CORRIDOR_END = (23.52, 87.31)     # Durgapur end

# Points of interest used for "proximity" scoring later.
POIS = {
    "airport": (22.6547, 88.4467),   # Kolkata NSCBI (Dum Dum)
    "port": (22.5450, 88.3000),      # Kolkata Port area (proxy)
    "city": (22.5726, 88.3639),      # Kolkata city centre
}

_NAME_PREFIX = [
    "Dankuni", "Singur", "Kamarkundu", "Bardhaman", "Palsit", "Panagarh",
    "Durgapur", "Bud Bud", "Galsi", "Shaktigarh", "Memari", "Rajbandh",
]

_NAME_SUFFIX = [
    "Logistics Park", "Industrial Plot", "Green Belt Parcel", "Warehouse Estate",
    "Factory Land", "Corridor Block", "Growth Centre Plot", "Fringe Land",
]

_ZONING_CHOICES = [
    ("industrial", 0.50),   # (label, probability weight)
    ("mixed", 0.22),
    ("agricultural", 0.18),
    ("commercial", 0.10),
]


def _weighted_choice(rng, choices):
    labels = [c[0] for c in choices]
    weights = [c[1] for c in choices]
    return rng.choices(labels, weights=weights, k=1)[0]


def _lerp(a, b, t):
    return a + (b - a) * t


def generate_parcels(n=24):
    """Return a list of ~n parcel dicts. Deterministic given SEED."""
    rng = random.Random(SEED)
    parcels = []

    for i in range(n):
        t = i / max(1, n - 1)  # 0..1 along the corridor
        base_lat = _lerp(_CORRIDOR_START[0], _CORRIDOR_END[0], t)
        base_lng = _lerp(_CORRIDOR_START[1], _CORRIDOR_END[1], t)

        # jitter off the centre line so pins don't sit in a straight row
        lat = round(base_lat + rng.uniform(-0.05, 0.05), 5)
        lng = round(base_lng + rng.uniform(-0.05, 0.05), 5)

        name = f"{rng.choice(_NAME_PREFIX)} {rng.choice(_NAME_SUFFIX)} {i+1:02d}"
        zoning = _weighted_choice(rng, _ZONING_CHOICES)

        parcel = {
            "id": f"P-{i+1:03d}",
            "name": name,
            "lat": lat,
            "lng": lng,
            "acreage": round(rng.uniform(1.0, 40.0), 1),
            "zoning": zoning,
            # infrastructure distances in km
            "dist_power_km": round(rng.uniform(0.2, 12.0), 1),
            "dist_highway_km": round(rng.uniform(0.1, 15.0), 1),
            "dist_water_km": round(rng.uniform(0.3, 10.0), 1),
            "dist_rail_km": round(rng.uniform(0.5, 25.0), 1),
            # boolean attributes
            "power_3phase": rng.random() < 0.6,
            "flood_risk": rng.random() < 0.30,
            "litigation": rng.random() < 0.18,
            "eco_sensitive": rng.random() < 0.12,
            # commercial
            "price_per_acre_lakh": round(rng.uniform(15, 120), 1),
        }

        # Pre-compute straight-line distance (km) to each POI for proximity scoring.
        parcel["dist_to"] = {
            poi: _haversine_km(lat, lng, plat, plng)
            for poi, (plat, plng) in POIS.items()
        }

        parcels.append(parcel)

    return parcels


def _haversine_km(lat1, lon1, lat2, lon2):
    """Great-circle distance in km between two lat/lng points."""
    from math import radians, sin, cos, asin, sqrt
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = (sin(dlat / 2) ** 2
         + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2)
    return round(2 * r * asin(sqrt(a)), 1)


# Materialise once at import so the dataset is stable across requests.
PARCELS = generate_parcels(24)

if __name__ == "__main__":
    import json
    print(f"Generated {len(PARCELS)} parcels")
    print(json.dumps(PARCELS[0], indent=2))
