import datetime
from pathlib import Path

from contributor_network.config import Config, ContributorEntry


def test_config() -> None:
    Config.from_toml(Path(__file__).parents[2] / "config.toml")


def test_contributor_entry_from_inline_table():
    entry = ContributorEntry(name="Pete Gadomski", start_date=datetime.date(2020, 3, 15))
    assert entry.name == "Pete Gadomski"
    assert entry.start_date == datetime.date(2020, 3, 15)


def test_contributor_entry_without_start_date():
    entry = ContributorEntry(name="Pete Gadomski")
    assert entry.name == "Pete Gadomski"
    assert entry.start_date is None
