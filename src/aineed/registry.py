"""Registry that stores and queries AI requirements."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Callable, List, Optional

from .requirement import Category, Priority, Requirement


class Registry:
    """In-memory store of :class:`Requirement` objects with persistence support."""

    def __init__(self) -> None:
        self._requirements: List[Requirement] = []

    # ------------------------------------------------------------------
    # Mutation helpers
    # ------------------------------------------------------------------

    def add(self, requirement: Requirement) -> None:
        """Add a new requirement to the registry."""
        self._requirements.append(requirement)

    def remove(self, title: str) -> bool:
        """Remove the first requirement whose title matches *title*.

        Returns ``True`` if a requirement was removed, ``False`` otherwise.
        """
        for i, req in enumerate(self._requirements):
            if req.title == title:
                del self._requirements[i]
                return True
        return False

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def all(self) -> List[Requirement]:
        """Return all requirements."""
        return list(self._requirements)

    def filter(
        self,
        *,
        priority: Optional[Priority] = None,
        category: Optional[Category] = None,
        tag: Optional[str] = None,
        predicate: Optional[Callable[[Requirement], bool]] = None,
    ) -> List[Requirement]:
        """Return requirements that satisfy all supplied constraints."""
        results = self._requirements
        if priority is not None:
            results = [r for r in results if r.priority == priority]
        if category is not None:
            results = [r for r in results if r.category == category]
        if tag is not None:
            results = [r for r in results if tag in r.tags]
        if predicate is not None:
            results = [r for r in results if predicate(r)]
        return list(results)

    def find(self, title: str) -> Optional[Requirement]:
        """Return the first requirement whose title matches *title*, or ``None``."""
        for req in self._requirements:
            if req.title == title:
                return req
        return None

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, path: Path) -> None:
        """Persist the registry to a JSON file at *path*."""
        data = [req.to_dict() for req in self._requirements]
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> "Registry":
        """Load a registry from a JSON file at *path*."""
        registry = cls()
        raw = json.loads(path.read_text(encoding="utf-8"))
        for item in raw:
            registry.add(Requirement.from_dict(item))
        return registry

    # ------------------------------------------------------------------
    # Dunder helpers
    # ------------------------------------------------------------------

    def __len__(self) -> int:
        return len(self._requirements)

    def __iter__(self):
        return iter(self._requirements)
