"""
scoring.py
----------
The brain of the filter/scoring engine (Adrija). Three jobs:

1. normalize_query()    -> turn Subham's parser JSON into a clean, predictable
                            internal shape, tolerant of field-name variation.
2. filter_and_score()   -> keep parcels that fit, score each 0-100, explain why,
                            and attach red flags.
"""

# ---------------------------------------------------------------------------
# 1. NORMALIZATION — parser JSON -> internal query
# ---------------------------------------------------------------------------

# Every parser key we know how to read, grouped by the concept it feeds.
# If Subham's parser uses a key not in ANY of these lists, it shows up in
# `unrecognized_fields` in the response so you spot the mismatch instantly.
ALIASES = {
    "area": ["area_acres", "area", "acres", "size_acres", "size",
             "min_acres", "min_area_acres", "land_size", "plot_size"],
    "use_case": ["use_case", "usecase", "industry", "purpose", "type",
                 "business_type", "category"],
    "proximity": ["proximity", "near", "proximity_to", "poi", "close_to",
                  "location", "nearby"],
    "power": ["infra", "power", "power_requirement", "infrastructure",
              "three_phase", "requires_power", "electricity", "power_supply"],
    "flood": ["risk", "risk_tolerance", "flood_risk_tolerance",
              "avoid_flood", "no_flood", "flood_risk", "flood_ok",
              "flood", "hazard"],
}

# Keys we deliberately ignore (not real query params) so they don't trip the
# unrecognized-fields warning.
_IGNORE_KEYS = {"raw_query", "query", "success", "error", "message", "status"}

# flat set of every key we understand, for the unrecognized-field check
_KNOWN_KEYS = {k for group in ALIASES.values() for k in group} | _IGNORE_KEYS

# Common wrapper keys some parsers nest their result under.
_ENVELOPE_KEYS = ["parsed", "result", "data", "output", "parameters",
                  "params", "extracted", "response", "json"]


def _unwrap(parsed):
    """
    Dig out the real parameters if the parser nests them.
    Handles two cases:
      {"result": {...}}                 -> single wrapper key
      {"success": true, "data": {...}}  -> data alongside siblings
    """
    if not isinstance(parsed, dict):
        return {}
    for key in _ENVELOPE_KEYS:
        if isinstance(parsed.get(key), dict):
            return _unwrap(parsed[key])
    return parsed


def _first(d, keys, default=None):
    """Return the first present, non-null value among a list of alias keys."""
    for key in keys:
        if key in d and d[key] not in (None, ""):
            return d[key]
    return default


def _as_text(v):
    """Flatten strings / lists / bools into one lowercase string for keyword tests."""
    if isinstance(v, (list, tuple)):
        return " ".join(str(x) for x in v).lower()
    return str(v).lower()


def _to_float(v, default=None):
    try:
        return float(str(v).strip().split()[0])  # tolerate "5 acres"
    except (TypeError, ValueError, IndexError):
        return default


def _wants_no_flood(parsed):
    """Did the user ask to AVOID flood risk? Handles every messy variant."""
    val = _first(parsed, ALIASES["flood"], default="")
    text = _as_text(val).replace(" ", "_")

    # Subham's parser sends flood_risk_tolerance = "none"/"low"/"high".
    # "none" or "low" tolerance means the user wants to AVOID flood.
    if text in ("none", "low", "zero", "nil"):
        return True
    if any(k in text for k in ("no_flood", "avoid_flood", "flood_free", "low_flood")):
        return True
    if _first(parsed, ["avoid_flood", "no_flood"]) in (True, "true", "yes", 1):
        return True

    # explicit boolean flood_risk == False also means "no flood wanted"
    fr = _first(parsed, ["flood_risk", "flood_ok", "flood"])
    if fr in (False, "false", "no", 0):
        return True

    return False


def _wants_power(parsed):
    """Did the user ask for strong power / 3-phase supply?"""
    text = _as_text(_first(parsed, ALIASES["power"], default=""))
    if any(k in text for k in ("phase", "power", "electric", "grid")):
        return True
    if _first(parsed, ["three_phase", "requires_power"]) in (True, "true", "yes", 1):
        return True
    return False


def normalize_query(parsed: dict) -> dict:
    """
    parsed : the raw JSON dict from Subham's /parse-query (any reasonable shape)
    returns: clean internal query + a list of any fields we didn't recognise.
    """
    parsed = _unwrap(parsed or {})

    area = _to_float(_first(parsed, ALIASES["area"]), default=None)

    use_case = _first(parsed, ALIASES["use_case"], default="general")
    use_case = _as_text(use_case).strip().replace(" ", "_").replace("-", "_")

    proximity = _first(parsed, ALIASES["proximity"], default=None)
    proximity = _as_text(proximity).strip() if proximity else None

    # Any key the parser sent that we don't map -> surface it, don't swallow it.
    unrecognized = [k for k in parsed.keys() if k not in _KNOWN_KEYS]

    return {
        "area_acres": area,               # may be None -> no size filter
        "use_case": use_case,             # e.g. cold_storage / logistics / manufacturing
        "proximity": proximity,           # e.g. "airport" / "port" / None
        "wants_power": _wants_power(parsed),
        "avoid_flood": _wants_no_flood(parsed),
        "unrecognized_fields": unrecognized,  # <- watch this to confirm the fit
        "_raw": parsed,
    }


# ---------------------------------------------------------------------------
# 2. SCORING WEIGHTS — depend on the industry use-case (FRD FR-1.3)
# ---------------------------------------------------------------------------

# Each profile is a dict of factor -> weight. Weights per profile sum to ~1.0.
# Factors: power, highway, water, proximity_poi, flood, zoning, size_fit
_WEIGHT_PROFILES = {
    "logistics":      {"power": .12, "highway": .34, "water": .04, "proximity_poi": .16, "flood": .12, "zoning": .12, "size_fit": .10},
    "warehouse":      {"power": .12, "highway": .34, "water": .04, "proximity_poi": .16, "flood": .12, "zoning": .12, "size_fit": .10},
    "cold_storage":   {"power": .30, "highway": .20, "water": .06, "proximity_poi": .12, "flood": .12, "zoning": .10, "size_fit": .10},
    "manufacturing":  {"power": .28, "highway": .16, "water": .16, "proximity_poi": .06, "flood": .12, "zoning": .12, "size_fit": .10},
    "data_center":    {"power": .34, "highway": .08, "water": .12, "proximity_poi": .04, "flood": .22, "zoning": .10, "size_fit": .10},
    "general":        {"power": .18, "highway": .20, "water": .10, "proximity_poi": .12, "flood": .14, "zoning": .14, "size_fit": .12},
}


def _weights_for(query):
    profile = dict(_WEIGHT_PROFILES.get(query["use_case"],
                                         _WEIGHT_PROFILES["general"]))
    # If the user explicitly named a proximity POI, lean into it.
    if query.get("proximity"):
        profile["proximity_poi"] = profile.get("proximity_poi", 0) + 0.10
    # If they demanded power, lean into it.
    if query.get("wants_power"):
        profile["power"] = profile.get("power", 0) + 0.08
    # Re-normalise so weights still sum to 1.
    total = sum(profile.values())
    return {k: v / total for k, v in profile.items()}


# ---------------------------------------------------------------------------
# 3. PER-FACTOR SCORES — each returns 0.0 .. 1.0 (higher = better)
# ---------------------------------------------------------------------------

def _closeness(dist_km, good=1.0, bad=15.0):
    """1.0 when at/under `good` km, 0.0 at/over `bad` km, linear between."""
    if dist_km <= good:
        return 1.0
    if dist_km >= bad:
        return 0.0
    return 1.0 - (dist_km - good) / (bad - good)


def _power_score(parcel):
    base = _closeness(parcel["dist_power_km"], good=1.0, bad=12.0)
    if not parcel["power_3phase"]:
        base *= 0.5  # penalise lack of 3-phase supply
    return base


def _size_fit_score(parcel, requested):
    if not requested:
        return 0.7  # neutral-ish when no size asked
    acre = parcel["acreage"]
    if acre < requested:
        return 0.0  # can't fit the requirement at all
    ratio = requested / acre  # 1.0 = perfect fit, small = wastefully big
    if ratio >= 0.6:
        return 1.0
    if ratio >= 0.3:
        return 0.7
    return 0.4  # usable but much bigger than needed


def _zoning_score(parcel):
    return {"industrial": 1.0, "mixed": 0.65,
            "commercial": 0.35, "agricultural": 0.20}.get(parcel["zoning"], 0.3)


def _proximity_score(parcel, proximity):
    if not proximity:
        return 0.6
    # match the requested POI keyword to our known POIs
    for poi in parcel["dist_to"]:
        if poi in proximity:
            return _closeness(parcel["dist_to"][poi], good=5.0, bad=45.0)
    return 0.5  # asked for something we don't model


# ---------------------------------------------------------------------------
# 4. RED FLAGS (FRD FR-1.4)
# ---------------------------------------------------------------------------

def _red_flags(parcel, query):
    flags = []
    if parcel["flood_risk"]:
        msg = "Located in a flood-prone zone"
        if query["avoid_flood"]:
            msg += " — you asked to avoid flood risk"
        flags.append(msg)

    if parcel["litigation"]:
        flags.append("Pending litigation / disputed title")

    if parcel["eco_sensitive"]:
        flags.append("Overlaps an eco-sensitive zone (clearance risk)")

    if query["wants_power"] and not parcel["power_3phase"]:
        flags.append("No 3-phase power on site (you requested power supply)")

    if query["wants_power"] and parcel["dist_power_km"] > 8:
        flags.append(f"Nearest substation is {parcel['dist_power_km']} km away")

    if query["area_acres"] and parcel["acreage"] < query["area_acres"]:
        flags.append(
            f"Only {parcel['acreage']} acres — smaller than the "
            f"{query['area_acres']} acres requested"
        )

    if parcel["zoning"] == "agricultural":
        flags.append("Agricultural zoning — conversion to industrial required")

    return flags


# ---------------------------------------------------------------------------
# 5. MAIN ENTRY — filter, score, explain
# ---------------------------------------------------------------------------

def score_parcel(parcel, query, weights):
    """Return (score_0_100, breakdown_list)."""
    factors = {
        "power": _power_score(parcel),
        "highway": _closeness(parcel["dist_highway_km"], good=1.0, bad=15.0),
        "water": _closeness(parcel["dist_water_km"], good=1.0, bad=10.0),
        "proximity_poi": _proximity_score(parcel, query["proximity"]),
        "flood": 0.15 if parcel["flood_risk"] else 1.0,
        "zoning": _zoning_score(parcel),
        "size_fit": _size_fit_score(parcel, query["area_acres"]),
    }

    score = sum(factors[f] * weights.get(f, 0) for f in factors) * 100

    # Hard penalties that should visibly sink a bad parcel
    if query["avoid_flood"] and parcel["flood_risk"]:
        score *= 0.55
    if parcel["litigation"]:
        score *= 0.75

    score = round(max(0, min(100, score)), 1)

    # human-readable breakdown, sorted by contribution
    breakdown = []
    for f, val in factors.items():
        contrib = round(val * weights.get(f, 0) * 100, 1)
        breakdown.append({
            "factor": f,
            "raw_score": round(val, 2),
            "weight": round(weights.get(f, 0), 2),
            "points": contrib,
        })
    breakdown.sort(key=lambda x: x["points"], reverse=True)

    return score, breakdown


def _plain_reason(parcel, query, breakdown):
    """One-line business-language 'why', for the map/panel (FRD FR-2.3)."""
    top = [b["factor"] for b in breakdown[:2] if b["points"] > 0]
    label = {
        "power": "strong power access", "highway": "excellent highway access",
        "water": "good water access", "proximity_poi": f"close to the {query['proximity']}",
        "zoning": "industrial-ready zoning", "size_fit": "right-sized plot",
        "flood": "low flood risk",
    }
    reasons = [label.get(t, t) for t in top]
    if not reasons:
        return "Meets the basic criteria but scores low on key factors."
    return "Strong on " + " and ".join(reasons) + "."


def filter_and_score(parcels, parsed_query, drop_undersized=True, strict_flood=False):
    """
    parcels       : the dataset (list of dicts from parcels.py)
    parsed_query  : RAW parser JSON (we normalise it inside)
    returns       : list of result dicts, sorted best-first.
    """
    query = normalize_query(parsed_query)
    weights = _weights_for(query)

    results = []
    for parcel in parcels:
        # --- HARD FILTERS (drop before scoring) ---
        if drop_undersized and query["area_acres"] \
                and parcel["acreage"] < query["area_acres"]:
            continue
        if strict_flood and query["avoid_flood"] and parcel["flood_risk"]:
            continue

        score, breakdown = score_parcel(parcel, query, weights)
        flags = _red_flags(parcel, query)

        results.append({
            # passthrough fields the map + panel need
            "id": parcel["id"],
            "name": parcel["name"],
            "lat": parcel["lat"],
            "lng": parcel["lng"],
            "acreage": parcel["acreage"],
            "zoning": parcel["zoning"],
            "price_per_acre_lakh": parcel["price_per_acre_lakh"],
            "dist_power_km": parcel["dist_power_km"],
            "dist_highway_km": parcel["dist_highway_km"],
            # engine output
            "viability_score": score,
            "score_breakdown": breakdown,
            "reason": _plain_reason(parcel, query, breakdown),
            "red_flags": flags,
        })

    results.sort(key=lambda r: r["viability_score"], reverse=True)
    return {"query_understood": query, "count": len(results), "parcels": results}
