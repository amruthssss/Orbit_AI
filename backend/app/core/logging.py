"""Small logging setup shared by backend modules."""

import logging


def get_logger(name: str) -> logging.Logger:
    """Return a named logger without changing application-wide handlers."""
    return logging.getLogger(name)
