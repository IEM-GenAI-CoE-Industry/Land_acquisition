"""
parser.py — Subham's NL Parser module
Exposes a router with POST /parse-query.
"""

import json
import os
from fastapi import APIRouter
from pydantic import BaseModel
import requests

router = APIRouter()

# ---- Config ----
LLM_API_URL = os.environ.get("LLM_API_URL", "https://openrouter.ai/api/v1/chat/completions")
LLM_API_KEY = os.environ.get("LLM_API_KEY", "PUT_YOUR_OPENROUTER_KEY_HERE")

FALLBACK_MODELS = [
    os.environ.get("LLM_MODEL", "openrouter/free"),
    "meta-llama/llama-4-maverick:free",
    "google/gemma-3-27b-it:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
]

SYSTEM_PROMPT = """You are a strict information-extraction engine for an industrial land search platform.

Given a user's natural language land requirement, extract ONLY these fields and return ONLY valid JSON — no markdown, no explanation, no extra text:

{
  "area_acres": <number or null>,
  "use_case": <one of: "cold_storage", "manufacturing", "warehousing", "logistics", "general_industrial", or null>,
  "proximity": <string describing what it should be near, e.g. "airport", "highway", "port", or null>,
  "power_requirement": <one of: "3_phase", "single_phase", "high_load", or null>,
  "flood_risk_tolerance": <one of: "none", "low", "moderate", or null>,
  "raw_query": <the original user text, unchanged>
}

Rules:
- If a field is not mentioned, set it to null.
- Never invent values that are not implied by the text.
- Output must be valid JSON and nothing else.
"""


class QueryRequest(BaseModel):
    query: str


def _call_one_model(model_name: str, user_query: str) -> dict:
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_query},
        ],
        "temperature": 0,
    }
    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    response = requests.post(LLM_API_URL, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    data = response.json()

    content = data["choices"][0]["message"]["content"]
    if content is None:
        raise ValueError(f"Model '{model_name}' returned no content")

    content = content.strip()
    if not content:
        raise ValueError(f"Model '{model_name}' returned an empty response")

    if content.startswith("```"):
        content = content.strip("`")
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    return json.loads(content)


def call_llm(user_query: str) -> dict:
    last_error = None
    for model_name in FALLBACK_MODELS:
        try:
            result = _call_one_model(model_name, user_query)
            print(f"[parser] Success using model: {model_name}")
            return result
        except Exception as e:
            print(f"[parser] Model '{model_name}' failed: {e}")
            last_error = e
            continue
    raise last_error


@router.post("/parse-query")
def parse_query(req: QueryRequest):
    try:
        parsed = call_llm(req.query)
        parsed.setdefault("raw_query", req.query)
        return {"success": True, "data": parsed}
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "data": {
                "area_acres": None,
                "use_case": None,
                "proximity": None,
                "power_requirement": None,
                "flood_risk_tolerance": None,
                "raw_query": req.query,
            },
        }
