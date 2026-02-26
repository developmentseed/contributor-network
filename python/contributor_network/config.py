"""Configuration management for the contributor network visualization.

All configuration lives in a single ``config.toml``:

- ``repositories``: list of GitHub repos (owner/repo)
- ``[contributors.devseed]``, ``[contributors.alumni]``, etc.: contributor
  groups mapping GitHub username to display name
- ``[visualization]``: frontend display settings

Contributors are classified as ``core`` (first group) or ``community``
(all other groups). Use ``contributor-network bootstrap`` to generate
a config.toml from a list of repos or contributors.
"""

from __future__ import annotations

import tomllib
from enum import Enum
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


class ContributorType(str, Enum):
    """Classification of a contributor."""

    CORE = "core"
    COMMUNITY = "community"


class ContributorEntry(BaseModel):
    """A contributor parsed from config.toml."""

    username: str
    type: ContributorType
    name: str


class VisualizationConfig(BaseModel):
    """Frontend display settings stored in ``[visualization]``."""

    show_community_contributors: bool = True
    show_repo_details: bool = True
    max_forks_to_display: int = 10


class Config(BaseModel):
    """Top-level configuration loaded from ``config.toml``.

    Attributes:
        title: Page title for the visualization.
        organization_name: Name of the organization.
        description: Description shown on the page.
        author: Author attribution.
        repositories: List of GitHub repos to track (owner/repo).
        contributors: Nested dict of contributor groups, each mapping
                      GitHub username to display name. The first group
                      is treated as "core"; remaining groups are "community".
        contributor_padding: Padding around contributor nodes in pixels.
        visualization: Frontend display settings.
    """

    title: str
    organization_name: str
    description: str = ""
    author: str = ""
    repositories: list[str] = Field(default_factory=list)
    contributors: dict[str, dict[str, str]] = Field(default_factory=dict)
    contributor_padding: int = 40
    visualization: VisualizationConfig = Field(default_factory=VisualizationConfig)

    # ------------------------------------------------------------------
    # Accessors
    # ------------------------------------------------------------------

    def load_repositories(self) -> list[str]:
        """Return the configured repository list."""
        return list(self.repositories)

    def load_contributors(self) -> list[ContributorEntry]:
        """Return all contributors as typed entries.

        The first contributor group in config.toml is ``core``;
        all subsequent groups are ``community``.
        """
        entries: list[ContributorEntry] = []
        groups = list(self.contributors.items())
        for i, (_, members) in enumerate(groups):
            ctype = ContributorType.CORE if i == 0 else ContributorType.COMMUNITY
            for username, name in members.items():
                entries.append(
                    ContributorEntry(username=username, type=ctype, name=name)
                )
        return entries

    @property
    def core_contributors(self) -> dict[str, str]:
        """Map of username -> display name for core contributors."""
        return {
            c.username: c.name
            for c in self.load_contributors()
            if c.type == ContributorType.CORE
        }

    @property
    def community_contributors(self) -> dict[str, str]:
        """Map of username -> display name for community contributors."""
        return {
            c.username: c.name
            for c in self.load_contributors()
            if c.type == ContributorType.COMMUNITY
        }

    @property
    def all_contributors(self) -> dict[str, str]:
        """Map of username -> display name for every contributor."""
        return {c.username: c.name for c in self.load_contributors()}

    @property
    def devseed_contributors(self) -> dict[str, str]:
        """Only the first contributor group (backward compat)."""
        return self.contributors.get("devseed", {})

    @property
    def alumni_contributors(self) -> dict[str, str]:
        """Friends and alumni (when enabled)."""
        return self.contributors.get("alumni", {})

    # ------------------------------------------------------------------
    # Factory
    # ------------------------------------------------------------------

    @classmethod
    def from_toml(cls, path: Path | str) -> Config:
        """Load configuration from a TOML file."""
        path = Path(path)
        with open(path, "rb") as f:
            data: dict[str, Any] = tomllib.load(f)
        instance = cls.model_validate(data)
        object.__setattr__(instance, "_config_path", path.resolve())
        return instance
