from pathlib import Path

import pytest
from contributor_network.cli import render_index_html
from contributor_network.config import Config


def test_render_index_html_substitutes_meta_tags():
    config = Config.from_toml(Path(__file__).parents[2] / "config.toml")
    html = render_index_html(config)

    assert "<title>The Development Seed Contributor Network</title>" in html
    assert (
        '<meta property="og:url" content="https://developmentseed.org/contributor-network/">'
        in html
    )
    assert (
        '<meta property="og:image" content="https://developmentseed.org/contributor-network/site-image.jpg">'
        in html
    )
    assert '<meta name="theme-color" content="#CF3F02">' in html
    assert "{{" not in html
    assert "{%" not in html


def test_render_index_html_escapes_html_in_config_values(tmp_path):
    bad = tmp_path / "bad.toml"
    bad.write_text(
        'title = "X"\n'
        'description = "<script>alert(1)</script>"\n'
        'organization_name = "Z"\n'
        "repositories = []\n"
        "[contributors.core]\n"
    )
    config = Config.from_toml(bad)
    html = render_index_html(config)

    assert "<script>alert(1)</script>" not in html
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html


def test_render_index_html_raises_when_render_kwargs_drift_from_template():
    """StrictUndefined: if `cli.render_index_html` ever stops passing a variable
    the template references, rendering fails loudly instead of silently emitting
    an empty string."""
    from contributor_network import cli
    from jinja2 import (
        Environment,
        FileSystemLoader,
        StrictUndefined,
        UndefinedError,
    )

    env = Environment(
        loader=FileSystemLoader(cli.TEMPLATES_DIR),
        autoescape=True,
        undefined=StrictUndefined,
    )
    template = env.get_template("index.html.j2")

    with pytest.raises(UndefinedError):
        template.render(description="x", og_url="", og_image="", theme_color="")
