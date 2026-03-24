"""Configuration management for the contributor network visualization.

The config supports categorizing contributors into groups (e.g., "devseed" for current
employees, "alumni" for past contributors). This allows filtering the visualization
to show only active team members while preserving historical data.
"""

from __future__ import annotations

import datetime
import tomllib
from pathlib import Path

from pydantic import BaseModel, field_validator


class ContributorEntry(BaseModel):
    """A contributor with an optional start date for filtering commits."""

    name: str
    start_date: datetime.date | None = None


class Config(BaseModel):
    """Configuration for the contributor network visualization.

    Attributes:
        title: Page title for the visualization
        author: Author attribution
        description: Description shown on the page
        organization_name: Name of the organization (e.g., "Development Seed")
        organization_nickname: Short name used in tooltips (e.g., "DevSeed")
        repositories: List of GitHub repos to track (format: "owner/repo")
        contributors: Nested dict of contributor categories, each mapping
                      GitHub username to display name
        contributor_padding: Padding around contributor nodes in pixels
    """

    title: str
    author: str
    description: str
    organization_name: str
    organization_nickname: str = ""
    repositories: list[str]
    contributors: dict[str, dict[str, ContributorEntry]]
    contributor_padding: int = 40

    @field_validator("contributors", mode="before")
    @classmethod
    def normalize_contributors(cls, v: dict) -> dict:
        """Normalize plain string contributor entries into ContributorEntry dicts."""
        normalized: dict[str, dict[str, dict[str, object]]] = {}
        for category, members in v.items():
            normalized[category] = {}
            for login, value in members.items():
                if isinstance(value, str):
                    normalized[category][login] = {"name": value}
                else:
                    normalized[category][login] = value
        return normalized

    def get_contributor_name(self, login: str) -> str:
        """Get display name for a contributor by GitHub login."""
        for category in self.contributors.values():
            if login in category:
                return category[login].name
        raise KeyError(f"Contributor {login!r} not found")

    def get_contributor_start_date(self, login: str) -> datetime.date | None:
        """Get start date for a contributor by GitHub login."""
        for category in self.contributors.values():
            if login in category:
                return category[login].start_date
        raise KeyError(f"Contributor {login!r} not found")

    @property
    def devseed_contributors(self) -> dict[str, str]:
        """Only Development Seed employees."""
        return {
            login: entry.name
            for login, entry in self.contributors.get("devseed", {}).items()
        }

    @property
    def alumni_contributors(self) -> dict[str, str]:
        """Friends and alumni (when enabled)."""
        return {
            login: entry.name
            for login, entry in self.contributors.get("alumni", {}).items()
        }

    @property
    def all_contributors(self) -> dict[str, str]:
        """All contributors across all categories."""
        result = {}
        for category in self.contributors.values():
            for login, entry in category.items():
                result[login] = entry.name
        return result

    @classmethod
    def from_toml(cls, path: Path | str) -> Config:
        """Load configuration from a TOML file."""
        with open(path, "rb") as f:
            return cls.model_validate(tomllib.load(f))
