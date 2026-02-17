"""Configuration management for the contributor network visualization.

The config is intentionally minimal — just a few settings that point to
external data files:

- ``repositories.txt``: one GitHub repo per line (owner/repo)
- ``contributors.csv``: username, type (core/other), display name

Visualization preferences live under ``[visualization]`` in config.toml.
"""

from __future__ import annotations

import csv
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
    """A single row from contributors.csv."""

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
        organization: Name of the organization (e.g. "Development Seed").
        description: Description shown on the page.
        contributors_path: Path to contributors.csv (relative to config dir).
        repositories_path: Path to repositories.txt (relative to config dir).
        contributor_padding: Padding around contributor nodes in pixels.
        visualization: Frontend display settings.
    """

    title: str
    organization: str
    description: str = ""
    contributors_path: str = "contributors.csv"
    repositories_path: str = "repositories.txt"
    contributor_padding: int = 40
    visualization: VisualizationConfig = Field(default_factory=VisualizationConfig)

    # Resolved at load time — not stored in TOML.
    _config_dir: Path = Path(".")

    # ------------------------------------------------------------------
    # Loaders
    # ------------------------------------------------------------------

    def _resolve(self, relative: str) -> Path:
        """Resolve a path relative to the config file's directory."""
        return self._config_dir / relative

    def load_repositories(self) -> list[str]:
        """Read repository list from ``repositories.txt``.

        Blank lines and lines starting with ``#`` are ignored.
        """
        path = self._resolve(self.repositories_path)
        repos: list[str] = []
        with open(path) as f:
            for line in f:
                stripped = line.strip()
                if stripped and not stripped.startswith("#"):
                    repos.append(stripped)
        return repos

    def load_contributors(self) -> list[ContributorEntry]:
        """Read contributors from the CSV file."""
        path = self._resolve(self.contributors_path)
        entries: list[ContributorEntry] = []
        with open(path, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                entries.append(ContributorEntry(**row))
        return entries

    # ------------------------------------------------------------------
    # Convenience properties (used by CLI / client)
    # ------------------------------------------------------------------

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
    def core_usernames(self) -> set[str]:
        """Set of usernames classified as core contributors."""
        return set(self.core_contributors.keys())

    def is_core(self, username: str) -> bool:
        """Check whether a username is a core contributor."""
        return username in self.core_usernames

    # ------------------------------------------------------------------
    # Factory
    # ------------------------------------------------------------------

    @classmethod
    def from_toml(cls, path: Path | str) -> Config:
        """Load configuration from a TOML file.

        The directory containing the TOML file is used to resolve relative
        paths for ``contributors_path`` and ``repositories_path``.
        """
        path = Path(path)
        with open(path, "rb") as f:
            data: dict[str, Any] = tomllib.load(f)
        instance = cls.model_validate(data)
        # Store the config directory for path resolution
        object.__setattr__(instance, "_config_dir", path.parent.resolve())
        return instance
