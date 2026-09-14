"""FastAPI application for What's New."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

from whats_new.api.routes import assets, auth_watchlist, briefings, evaluation, feed, health, sources

app = FastAPI(title="What's New API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(assets.router, prefix="/api")
app.include_router(briefings.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(feed.router, prefix="/api")
app.include_router(auth_watchlist.router, prefix="/api")
app.include_router(evaluation.router, prefix="/api")


@app.get("/")
def root() -> dict:
    return {"service": "whats-new", "docs": "/docs"}
