"""Stable router export for the versioned API surface."""

from fastapi import APIRouter

from app.routes import api as router

__all__ = ["router"]
