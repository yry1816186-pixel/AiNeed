"""Core requirement model for AiNeed."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class Priority(Enum):
    """Priority level of an AI requirement."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Category(Enum):
    """Broad category of an AI requirement."""

    DATA = "data"
    MODEL = "model"
    INFRASTRUCTURE = "infrastructure"
    INTEGRATION = "integration"
    ETHICS = "ethics"
    OTHER = "other"


@dataclass
class Requirement:
    """Represents a single AI requirement."""

    title: str
    description: str
    priority: Priority = Priority.MEDIUM
    category: Category = Category.OTHER
    tags: List[str] = field(default_factory=list)
    accepted: Optional[bool] = None

    def to_dict(self) -> dict:
        """Serialise the requirement to a plain dictionary."""
        return {
            "title": self.title,
            "description": self.description,
            "priority": self.priority.value,
            "category": self.category.value,
            "tags": list(self.tags),
            "accepted": self.accepted,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Requirement":
        """Deserialise a requirement from a plain dictionary."""
        return cls(
            title=data["title"],
            description=data["description"],
            priority=Priority(data.get("priority", Priority.MEDIUM.value)),
            category=Category(data.get("category", Category.OTHER.value)),
            tags=list(data.get("tags", [])),
            accepted=data.get("accepted"),
        )
