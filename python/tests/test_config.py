from pathlib import Path

from contributor_network.config import Config


def test_config() -> None:
    Config.from_toml(Path(__file__).parents[2] / "config.toml")


def test_branding_defaults() -> None:
    config = Config.from_toml(Path(__file__).parents[2] / "config.toml")
    assert config.branding is not None
    assert config.branding.primary_color == "#CF3F02"
    assert config.branding.secondary_color == "#2E86AB"
    assert config.branding.text_color == "#443F3F"


def test_plausible_id() -> None:
    config = Config.from_toml(Path(__file__).parents[2] / "config.toml")
    assert config.plausible_id == "wDy59K3C3ZYelSSItouzN"


def test_core_contributors() -> None:
    config = Config.from_toml(Path(__file__).parents[2] / "config.toml")
    assert len(config.core_contributors) > 0
    assert "gadomski" in config.core_contributors
