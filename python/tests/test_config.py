from pathlib import Path

from contributor_network.config import Config


def test_config() -> None:
    Config.from_toml(Path(__file__).parents[2] / "config.toml")


def test_config_meta_fields_have_defaults():
    config = Config.from_toml(Path(__file__).parents[2] / "config.toml")
    assert config.og_url == "https://developmentseed.org/contributor-network/"
    assert (
        config.og_image
        == "https://developmentseed.org/contributor-network/site-image.jpg"
    )
    assert config.theme_color == "#CF3F02"


def test_config_meta_fields_optional_in_toml(tmp_path):
    minimal = tmp_path / "minimal.toml"
    minimal.write_text(
        'title = "X"\n'
        'description = "Y"\n'
        'organization_name = "Z"\n'
        "repositories = []\n"
        "[contributors.core]\n"
    )
    config = Config.from_toml(minimal)
    assert config.og_url == ""
    assert config.og_image == ""
    assert config.resolved_theme_color == "#CF3F02"
    assert config.theme_color == ""
