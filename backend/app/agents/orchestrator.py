"""Typed orchestration seam without implementing agent behavior yet."""

from dataclasses import dataclass


@dataclass
class AgentOrchestrator:
    """Describes an agent run without coupling callers to an engine."""

    name: str = "default"

    def describe(self) -> str:
        """Return a stable description for diagnostics and tests."""
        return f"Agent orchestrator: {self.name}"
