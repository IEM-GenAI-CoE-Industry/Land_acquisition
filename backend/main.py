"""
main.py — Combined Backend Entry Point
Wires together Subham's parser and Adrija's filter/scoring engine
into one single FastAPI app, running on one URL, one deployment.

Run locally:
    uvicorn main:app --reload --port 8000

Endpoints:
    POST /parse-query   (Subham)
    GET  /parcels       (Adrija)
    POST /get-parcels   (Adrija)
    POST /search        (Adrija — convenience: calls the parser internally)
    GET  /health
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import parser
import filters

app = FastAPI(title="Industrial Land Platform — Backend")

# Allow the frontend to call this freely during development/demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Plug in each person's router — no route logic duplicated here,
# each module owns its own endpoint(s).
app.include_router(parser.router)
app.include_router(filters.router)


@app.get("/health")
def health():
    return {"status": "ok"}
