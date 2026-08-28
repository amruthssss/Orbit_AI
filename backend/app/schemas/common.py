"""Common API schema primitives."""

from pydantic import BaseModel


class StatusResponse(BaseModel):
    """Simple status payload shared by health-style endpoints."""

    status: str
