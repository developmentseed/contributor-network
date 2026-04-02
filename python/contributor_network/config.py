"""Configuration management for the contributor network visualization.

The config supports categorizing contributors into groups (e.g., "devseed" for current
employees, "alumni" for past contributors). This allows filtering the visualization
to show only active team members while preserving historical data.
"""

from __future__ import annotations

import tomllib
from pathlib import Path

from pydantic import BaseModel


class BrandingConfig(BaseModel):
    """Branding configuration for the visualization."""

    primary_color: str = "#CF3F02"
    secondary_color: str = "#2E86AB"
    text_color: str = "#443F3F"


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
        branding: Colors for the visualization
        analytics_id: Plausible analytics ID (blank to disable)
    """

    title: str
    author: str
    description: str
    organization_name: str
    organization_nickname: str = ""
    analytics_id: str = ""
    repositories: list[str]
    contributors: dict[str, dict[str, str]]  # Nested: {"core": {...}, "alumni": {...}}
    contributor_padding: int = 40
    branding: BrandingConfig = BrandingConfig()

    @property
    def core_contributors(self) -> dict[str, str]:
        """Core contributors (supports 'core' and legacy 'devseed' category keys)."""
        return self.contributors.get("core", self.contributors.get("devseed", {}))

    @property
    def devseed_contributors(self) -> dict[str, str]:
        """Only Development Seed employees."""
        return self.core_contributors

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
