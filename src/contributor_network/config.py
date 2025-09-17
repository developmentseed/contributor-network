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
    contributors: dict[str, str]
    contributor_padding: int = 40

    @classmethod
    def from_toml(cls, path: Path | str) -> Config:
        """Load configuration from a TOML file."""
        with open(path, "rb") as f:
            return cls.model_validate(tomllib.load(f))
