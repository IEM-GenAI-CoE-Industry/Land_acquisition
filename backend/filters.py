"""
filters.py — Adrija's Filter/Scoring Engine module (was main.py)
Exposes a router with:
    GET  /parcels      -> raw mock dataset
    POST /get-parcels  -> filter + score (THE contract endpoint)
    POST /search       -> convenience: plain English -> parser -> filter+score
"""

import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from parcels import PARCELS
from scoring import filter_and_score

router = APIRouter()

# Subham's live parser. In the combined backend this still calls the public
# Render URL by default (works fine) — override with PARSER_URL if it ever moves.
PARSER_URL = os.getenv(
    "PARSER_URL",
    "https://land-parser-6z60.onrender.com/parse-query",
)


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
    Note: first call may take ~50s if the parser (Render free tier) is asleep.
    """
    try:
        with httpx.Client(timeout=60) as client:
            resp = client.post(PARSER_URL, json={"query": body.query})
            resp.raise_for_status()
            parsed = resp.json()
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Parser call failed: {e}")

    result = filter_and_score(PARCELS, parsed, drop_undersized=True)
    result["parser_output"] = parsed  # surface what the parser returned

    # If Subham's parser reported a failure or extracted nothing usable, say so
    # loudly instead of returning all parcels as if the search worked.
    q = result["query_understood"]
    parser_failed = isinstance(parsed, dict) and parsed.get("success") is False
    extracted_nothing = (q["area_acres"] is None and q["use_case"] == "general"
                          and q["proximity"] is None and not q["wants_power"])

    if parser_failed or extracted_nothing:
        result["warning"] = (
            "Parser returned no usable criteria (success=false or all fields "
            "null), so results are UNFILTERED. This is an issue in Subham's "
            "parser, not the filter engine. Error from parser: "
            + str(parsed.get("error") if isinstance(parsed, dict) else "unknown")
        )

    return result
