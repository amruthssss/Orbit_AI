"""Security seams kept intentionally small during the architecture phase."""

from app.services import hash_password

__all__ = ["hash_password"]
