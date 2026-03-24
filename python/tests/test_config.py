import datetime
from pathlib import Path

from contributor_network.config import Config, ContributorEntry


def test_config() -> None:
    Config.from_toml(Path(__file__).parents[2] / "config.toml")


def test_contributor_entry_from_inline_table():
    entry = ContributorEntry(
        name="Pete Gadomski", start_date=datetime.date(2020, 3, 15)
    )
    assert entry.name == "Pete Gadomski"
    assert entry.start_date == datetime.date(2020, 3, 15)


def test_contributor_entry_without_start_date():
    entry = ContributorEntry(name="Pete Gadomski")
    assert entry.name == "Pete Gadomski"
    assert entry.start_date is None


def test_config_mixed_contributor_formats(tmp_path):
    toml_content = """
title = "Test"
author = "Test"
description = "Test"
organization_name = "Test"
repositories = []

[contributors.devseed]
alice = "Alice Smith"
bob = { name = "Bob Jones", start_date = 2022-06-01 }
"""
    config_file = tmp_path / "config.toml"
    config_file.write_text(toml_content)
    config = Config.from_toml(config_file)

    assert config.get_contributor_name("alice") == "Alice Smith"
    assert config.get_contributor_start_date("alice") is None
    assert config.get_contributor_name("bob") == "Bob Jones"
    assert config.get_contributor_start_date("bob") == datetime.date(2022, 6, 1)


def test_config_all_contributors_returns_name_dict(tmp_path):
    toml_content = """
title = "Test"
author = "Test"
description = "Test"
organization_name = "Test"
repositories = []

[contributors.devseed]
alice = "Alice Smith"
bob = { name = "Bob Jones", start_date = 2022-06-01 }
"""
    config_file = tmp_path / "config.toml"
    config_file.write_text(toml_content)
    config = Config.from_toml(config_file)

    result = config.all_contributors
    assert result == {"alice": "Alice Smith", "bob": "Bob Jones"}
