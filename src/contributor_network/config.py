from __future__ import annotations

import tomllib
from pathlib import Path

from pydantic import BaseModel


class Config(BaseModel):
    title: str
    author: str
    description: str
    central_repository: str
    repositories: list[str]
    contributors: dict[str, dict[str, str]]  # Nested: {"devseed": {...}, "alumni": {...}}
    contributor_padding: int = 40

    @property
    def devseed_contributors(self) -> dict[str, str]:
        """Only Development Seed employees."""
        return self.contributors.get("devseed", {})

    @property
    def alumni_contributors(self) -> dict[str, str]:
        """Friends and alumni (when enabled)."""
        return self.contributors.get("alumni", {})

    @property
    def all_contributors(self) -> dict[str, str]:
        """All contributors across all categories."""
        result = {}
        for category in self.contributors.values():
            result.update(category)
        return result

    @classmethod
    def from_toml(cls, path: Path | str) -> Config:
        """Load configuration from a TOML file."""
        with open(path, "rb") as f:
            return cls.model_validate(tomllib.load(f))
