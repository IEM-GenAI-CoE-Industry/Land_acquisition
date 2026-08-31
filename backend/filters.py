"""
filters.py — Adrija's Filter/Scoring Engine module (was main.py)
Exposes a router with:
    GET  /parcels      -> raw mock dataset
    POST /get-parcels  -> filter + score (THE contract endpoint)
    POST /search       -> convenience: plain English -> parser -> filter+score

NOTE: /search used to call the standalone parser service over the network
(https://land-parser-6z60.onrender.com). That meant TWO separate free-tier
Render services both had to be awake at the same moment for /search to work —
if the standalone parser happened to be asleep, this endpoint failed with a
502 even though the combined backend itself was healthy.

Fix: parser.py's logic already lives in this same app, so we call it directly
in-process instead of making an outbound HTTP call. No network hop, no
dependency on another service's sleep state.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from parcels import PARCELS
from scoring import filter_and_score
import parser as parser_module  # in-process parser — see note above

router = APIRouter()


class SearchBody(BaseModel):
    query: str


@router.get("/parcels")
def all_parcels():
    """Raw dataset — useful for Saikat to plot pins before search is wired."""
    return {"count": len(PARCELS), "parcels": PARCELS}


@router.post("/get-parcels")
def get_parcels(parsed_query: dict,
                 strict_flood: bool = False,
                 drop_undersized: bool = True):
    """
    THE contract endpoint.
    Body is the JSON object that Subham's /parse-query returns.

    Query params (optional):
      strict_flood=true      -> hard-drop flood parcels instead of penalising
      drop_undersized=false  -> keep parcels smaller than requested acreage
    """
    if not isinstance(parsed_query, dict):
        raise HTTPException(400, "Body must be a JSON object (the parser output).")

    return filter_and_score(
        PARCELS, parsed_query,
        drop_undersized=drop_undersized,
        strict_flood=strict_flood,
    )


@router.post("/search")
def search(body: SearchBody):
    """
    Convenience one-shot: plain English -> parser -> filter -> scored parcels.
    Calls the parser function directly (in-process) — no external HTTP call,
    so this no longer depends on the standalone parser service being awake.
    """
    try:
        parsed_data = parser_module.call_llm(body.query)
        parsed_data.setdefault("raw_query", body.query)
        parsed = {"success": True, "data": parsed_data}
    except Exception as e:
        parsed = {
            "success": False,
            "error": str(e),
            "data": {
                "area_acres": None,
                "use_case": None,
                "proximity": None,
                "power_requirement": None,
                "flood_risk_tolerance": None,
                "raw_query": body.query,
            },
        }

    # filter_and_score expects the parser's raw output shape; unwrap the same
    # way normalize_query does, but pass the whole envelope through — scoring.py
    # already knows how to dig into {"success":..., "data": {...}}.
    result = filter_and_score(PARCELS, parsed, drop_undersized=True)
    result["parser_output"] = parsed  # surface what the parser returned

    # If the parser reported a failure or extracted nothing usable, say so
    # loudly instead of returning all parcels as if the search worked.
    q = result["query_understood"]
    parser_failed = parsed.get("success") is False
    extracted_nothing = (q["area_acres"] is None and q["use_case"] == "general"
                          and q["proximity"] is None and not q["wants_power"])

    if parser_failed or extracted_nothing:
        result["warning"] = (
            "Parser returned no usable criteria (success=false or all fields "
            "null), so results are UNFILTERED. Error from parser: "
            + str(parsed.get("error", "unknown"))
        )

    return result
