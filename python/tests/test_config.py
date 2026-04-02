from pathlib import Path

from contributor_network.config import Config


def test_config() -> None:
    Config.from_toml(Path(__file__).parents[2] / "config.toml")
