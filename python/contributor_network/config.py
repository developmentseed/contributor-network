"""Configuration management for the contributor network visualization.

The config supports categorizing contributors into groups (e.g., "core" for current
employees, "alumni" for past contributors). This allows filtering the visualization
to show only active team members while preserving historical data.

Supports two discovery modes:
- contributor: Start from known contributors, discover their repos (default)
- repository: Start from tracked repos, discover all contributors
"""

from __future__ import annotations

import tomllib
from enum import Enum
from pathlib import Path

from pydantic import BaseModel, Field


class DiscoveryMode(str, Enum):
    """Data discovery strategy.

    - CONTRIBUTOR: Existing workflow — start from known contributors.
    - REPOSITORY: New workflow — start from tracked repos, discover all
      contributors and classify them as sponsored or community.
    """

    CONTRIBUTOR = "contributor"
    REPOSITORY = "repository"


class DiscoveryConfig(BaseModel):
    """Settings for the discovery mode and extended metrics.

    Attributes:
        mode: Discovery strategy for data fetching.
        fetch_forking_orgs: Whether to discover which organizations have
            forked each tracked repository (requires extra API calls).
    """

    mode: DiscoveryMode = DiscoveryMode.CONTRIBUTOR
    fetch_forking_orgs: bool = False


class Config(BaseModel):
    """Configuration for the contributor network visualization.

    Attributes:
        title: Page title for the visualization
        author: Author attribution
        description: Description shown on the page
        organization_name: Name of the organization (e.g., "Development Seed")
        repositories: List of GitHub repos to track (format: "owner/repo")
        contributors: Nested dict of contributor categories, each mapping
                      GitHub username to display name
        contributor_padding: Padding around contributor nodes in pixels
        discovery: Discovery mode and metric settings.
    """

    title: str
    author: str = ""
    description: str
    organization_name: str
    repositories: list[str]
    contributors: dict[str, dict[str, str]]  # Nested: {"core": {...}, "alumni": {...}}
    contributor_padding: int = 40
    discovery: DiscoveryConfig = Field(default_factory=DiscoveryConfig)

    @property
    def discovery_mode(self) -> DiscoveryMode:
        """Shortcut to the active discovery mode."""
        return self.discovery.mode

    @property
    def is_repository_mode(self) -> bool:
        """True when running in repository-first discovery mode."""
        return self.discovery.mode == DiscoveryMode.REPOSITORY

    @property
    def core_contributors(self) -> dict[str, str]:
        """Core team contributors."""
        return self.contributors.get("core", {})

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

    @property
    def sponsored_contributors(self) -> dict[str, str]:
        """Contributors designated as 'sponsored' (prominent in the ring).

        Returns the [contributors.core] group. These are the contributors
        shown prominently in the central ring of the visualization.
        """
        return self.core_contributors

    @property
    def sponsored_usernames(self) -> set[str]:
        """Set of GitHub usernames that are sponsored contributors."""
        return set(self.sponsored_contributors.keys())

    def is_sponsored(self, username: str) -> bool:
        """Check if a GitHub username belongs to a sponsored contributor."""
        return username in self.sponsored_usernames

    @classmethod
    def from_toml(cls, path: Path | str) -> Config:
        """Load configuration from a TOML file."""
        with open(path, "rb") as f:
            return cls.model_validate(tomllib.load(f))
