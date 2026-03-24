# Contributor Start Dates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-contributor start dates to config so only post-employment commits count as DevSeed contributions.

**Architecture:** New `ContributorEntry` Pydantic model wraps the name + optional start date. Config parses both legacy string and new inline-table formats via a field validator. `Link.from_github()` uses `get_commits(since=...)` and manual counting instead of `contributor.contributions`.

**Tech Stack:** Python, Pydantic, PyGitHub, TOML, pytest

**Spec:** `docs/superpowers/specs/2026-03-24-contributor-start-dates-design.md`

**Note on mocking:** Tests in this plan use `MagicMock` to construct fake PyGitHub objects (Repository, NamedUser, Commit). This is appropriate — `monkeypatch` is for patching functions/attributes on real modules, not for building fake API response objects.

---

### Task 1: ContributorEntry model

**Files:**
- Modify: `python/contributor_network/config.py`
- Test: `python/tests/test_config.py`

- [ ] **Step 1: Write failing tests for ContributorEntry parsing**

In `python/tests/test_config.py`, add tests for both config formats:

```python
import datetime
from contributor_network.config import ContributorEntry


def test_contributor_entry_from_inline_table():
    entry = ContributorEntry(name="Pete Gadomski", start_date=datetime.date(2020, 3, 15))
    assert entry.name == "Pete Gadomski"
    assert entry.start_date == datetime.date(2020, 3, 15)


def test_contributor_entry_without_start_date():
    entry = ContributorEntry(name="Pete Gadomski")
    assert entry.name == "Pete Gadomski"
    assert entry.start_date is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest python/tests/test_config.py -v`
Expected: ImportError — `ContributorEntry` does not exist yet.

- [ ] **Step 3: Implement ContributorEntry model**

In `python/contributor_network/config.py`, add:

```python
import datetime

class ContributorEntry(BaseModel):
    name: str
    start_date: datetime.date | None = None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest python/tests/test_config.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add python/contributor_network/config.py python/tests/test_config.py
git commit -m "feat: add ContributorEntry model"
```

---

### Task 2: Config validator for backwards-compatible parsing

**Files:**
- Modify: `python/contributor_network/config.py`
- Test: `python/tests/test_config.py`

- [ ] **Step 1: Write failing test for mixed-format config parsing**

Create a temporary TOML file in the test that mixes string and inline-table formats:

```python
import datetime

from contributor_network.config import Config


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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest python/tests/test_config.py -v`
Expected: FAIL — `get_contributor_name` and `get_contributor_start_date` don't exist, and the current type `dict[str, dict[str, str]]` can't parse inline tables.

- [ ] **Step 3: Update Config to support both formats**

In `python/contributor_network/config.py`, change the `contributors` type and add a field validator + new methods:

```python
from pydantic import BaseModel, field_validator

class Config(BaseModel):
    # ... existing fields unchanged ...
    contributors: dict[str, dict[str, ContributorEntry]]

    @field_validator("contributors", mode="before")
    @classmethod
    def normalize_contributors(cls, v: dict) -> dict:
        normalized = {}
        for category, members in v.items():
            normalized[category] = {}
            for login, value in members.items():
                if isinstance(value, str):
                    normalized[category][login] = {"name": value}
                else:
                    normalized[category][login] = value
        return normalized

    def get_contributor_name(self, login: str) -> str:
        for category in self.contributors.values():
            if login in category:
                return category[login].name
        raise KeyError(f"Contributor {login!r} not found")

    def get_contributor_start_date(self, login: str) -> datetime.date | None:
        for category in self.contributors.values():
            if login in category:
                return category[login].start_date
        raise KeyError(f"Contributor {login!r} not found")
```

Update `all_contributors`, `devseed_contributors`, and `alumni_contributors` properties to extract names from `ContributorEntry`:

```python
    @property
    def devseed_contributors(self) -> dict[str, str]:
        return {
            login: entry.name
            for login, entry in self.contributors.get("devseed", {}).items()
        }

    @property
    def alumni_contributors(self) -> dict[str, str]:
        return {
            login: entry.name
            for login, entry in self.contributors.get("alumni", {}).items()
        }

    @property
    def all_contributors(self) -> dict[str, str]:
        result = {}
        for category in self.contributors.values():
            for login, entry in category.items():
                result[login] = entry.name
        return result
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest python/tests/test_config.py -v`
Expected: PASS

- [ ] **Step 5: Verify existing config.toml still parses**

Run: `uv run pytest python/tests/test_config.py::test_config -v`
Expected: PASS — the existing all-string config.toml works unchanged.

- [ ] **Step 6: Commit**

```bash
git add python/contributor_network/config.py python/tests/test_config.py
git commit -m "feat: support start_date in contributor config with backwards compat"
```

---

### Task 3: Filter commits by start date in Link model + wire through client/CLI

**Why one task?** `Link.from_github()` changes its return type from `Link` to `Link | None`, which would break `client.py` if committed separately. We change models, client, and CLI together so every commit leaves the codebase in a working state.

**Files:**
- Modify: `python/contributor_network/models.py`
- Modify: `python/contributor_network/client.py`
- Modify: `python/contributor_network/cli.py`
- Create: `python/tests/test_models.py`

- [ ] **Step 1: Write failing tests for Link.from_github with since parameter**

Create `python/tests/test_models.py`:

```python
import datetime
from unittest.mock import MagicMock

from contributor_network.models import Link


def _make_commit(timestamp: datetime.datetime) -> MagicMock:
    commit = MagicMock()
    commit.commit.author.date = timestamp
    return commit


def _make_contributor(login: str, contributions: int) -> MagicMock:
    contributor = MagicMock()
    contributor.login = login
    contributor.contributions = contributions
    return contributor


def test_link_from_github_with_since():
    repo = MagicMock()
    repo.full_name = "org/repo"

    since_date = datetime.date(2023, 1, 1)
    since_dt = datetime.datetime(2023, 1, 1, tzinfo=datetime.timezone.utc)

    commits = [
        _make_commit(datetime.datetime(2023, 6, 15, tzinfo=datetime.timezone.utc)),
        _make_commit(datetime.datetime(2023, 3, 1, tzinfo=datetime.timezone.utc)),
    ]
    paginated = MagicMock()
    paginated.__iter__ = MagicMock(return_value=iter(commits))
    repo.get_commits.return_value = paginated

    contributor = _make_contributor("alice", 999)

    link = Link.from_github(repo, contributor, "Alice", since=since_date)

    repo.get_commits.assert_called_once_with(author="alice", since=since_dt)
    assert link is not None
    assert link.commit_count == 2
    assert link.author_name == "Alice"


def test_link_from_github_without_since():
    repo = MagicMock()
    repo.full_name = "org/repo"

    commits = [
        _make_commit(datetime.datetime(2023, 6, 15, tzinfo=datetime.timezone.utc)),
        _make_commit(datetime.datetime(2020, 1, 1, tzinfo=datetime.timezone.utc)),
    ]
    paginated = MagicMock()
    paginated.__getitem__ = MagicMock(side_effect=lambda i: commits[i])
    paginated.reversed = MagicMock()
    paginated.reversed.__getitem__ = MagicMock(side_effect=lambda i: commits[-(i + 1)])
    repo.get_commits.return_value = paginated

    contributor = _make_contributor("alice", 50)

    link = Link.from_github(repo, contributor, "Alice")

    repo.get_commits.assert_called_once_with(author="alice")
    assert link is not None
    assert link.commit_count == 50


def test_link_from_github_zero_commits_returns_none():
    repo = MagicMock()
    repo.full_name = "org/repo"

    paginated = MagicMock()
    paginated.__iter__ = MagicMock(return_value=iter([]))
    repo.get_commits.return_value = paginated

    contributor = _make_contributor("alice", 10)

    result = Link.from_github(
        repo, contributor, "Alice", since=datetime.date(2025, 1, 1)
    )
    assert result is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest python/tests/test_models.py -v`
Expected: FAIL — `from_github()` doesn't accept `since` parameter.

- [ ] **Step 3: Update Link.from_github() to support since filtering**

In `python/contributor_network/models.py`:

```python
@classmethod
def from_github(
    cls, repo: Repo, contributor: NamedUser, author_name: str,
    since: datetime.date | None = None,
) -> Link | None:
    if since is not None:
        since_dt = datetime.datetime(
            since.year, since.month, since.day,
            tzinfo=datetime.timezone.utc,
        )
        commits_list = list(
            repo.get_commits(author=contributor.login, since=since_dt)
        )
        if not commits_list:
            return None
        commit_count = len(commits_list)
        last_commit = commits_list[0]
        first_commit = commits_list[-1]
    else:
        commits = repo.get_commits(author=contributor.login)
        last_commit = commits[0]
        first_commit = commits.reversed[0]
        commit_count = contributor.contributions

    commit_sec_min = int(first_commit.commit.author.date.timestamp())
    commit_sec_max = int(last_commit.commit.author.date.timestamp())

    contribution_span_days = (commit_sec_max - commit_sec_min) // 86400
    ninety_days_ago = int(
        (datetime.datetime.now() - datetime.timedelta(days=90)).timestamp()
    )
    is_recent = commit_sec_max > ninety_days_ago

    return cls(
        author_name=author_name,
        repo=repo.full_name,
        commit_count=commit_count,
        commit_sec_min=commit_sec_min,
        commit_sec_max=commit_sec_max,
        contribution_span_days=contribution_span_days,
        is_recent_contributor=is_recent,
    )
```

- [ ] **Step 4: Write failing tests for update_from_github with since**

Add to `python/tests/test_models.py`:

```python
def test_update_from_github_with_since_returns_true():
    link = Link(
        author_name="Alice", repo="org/repo",
        commit_count=5, commit_sec_min=1000000, commit_sec_max=2000000,
    )
    repo = MagicMock()
    commits = [
        _make_commit(datetime.datetime(2023, 9, 1, tzinfo=datetime.timezone.utc)),
        _make_commit(datetime.datetime(2023, 6, 1, tzinfo=datetime.timezone.utc)),
    ]
    paginated = MagicMock()
    paginated.__iter__ = MagicMock(return_value=iter(commits))
    paginated.__getitem__ = MagicMock(side_effect=lambda i: commits[i])
    repo.get_commits.return_value = paginated

    contributor = _make_contributor("alice", 999)

    result = link.update_from_github(repo, contributor, since=datetime.date(2023, 1, 1))
    assert result is True
    assert link.commit_count == 2


def test_update_from_github_with_since_zero_commits_returns_false():
    link = Link(
        author_name="Alice", repo="org/repo",
        commit_count=5, commit_sec_min=1000000, commit_sec_max=2000000,
    )
    repo = MagicMock()
    paginated = MagicMock()
    paginated.__iter__ = MagicMock(return_value=iter([]))
    repo.get_commits.return_value = paginated

    contributor = _make_contributor("alice", 10)

    result = link.update_from_github(repo, contributor, since=datetime.date(2025, 1, 1))
    assert result is False
```

- [ ] **Step 5: Update update_from_github()**

```python
def update_from_github(
    self, repo: Repo, contributor: NamedUser,
    since: datetime.date | None = None,
) -> bool:
    if since is not None:
        since_dt = datetime.datetime(
            since.year, since.month, since.day,
            tzinfo=datetime.timezone.utc,
        )
        commits_list = list(
            repo.get_commits(author=contributor.login, since=since_dt)
        )
        if not commits_list:
            return False
        self.commit_count = len(commits_list)
        last_commit = commits_list[0]
        first_commit = commits_list[-1]
        self.commit_sec_min = int(first_commit.commit.author.date.timestamp())
        self.commit_sec_max = int(last_commit.commit.author.date.timestamp())
    else:
        commits = repo.get_commits(author=contributor.login)
        last_commit = commits[0]
        self.commit_count = contributor.contributions
        self.commit_sec_max = int(last_commit.commit.author.date.timestamp())

    self.contribution_span_days = (
        self.commit_sec_max - self.commit_sec_min
    ) // 86400
    ninety_days_ago = int(
        (datetime.datetime.now() - datetime.timedelta(days=90)).timestamp()
    )
    self.is_recent_contributor = self.commit_sec_max > ninety_days_ago
    return True
```

- [ ] **Step 6: Update client.py to handle Link | None and since parameter**

In `python/contributor_network/client.py`:

```python
import datetime

def update_links(
    self,
    repo: Repo,
    contributors: dict[str, str],
    start_dates: dict[str, datetime.date | None] | None = None,
) -> None:
    devseed_count = 0
    for contributor in repo.get_contributors():
        if contributor_name := contributors.get(contributor.login):
            since = (start_dates or {}).get(contributor.login)
            self.update_link(repo, contributor, contributor_name, since=since)
            devseed_count += 1
    self.update_repository_community_stats(repo.full_name, devseed_count)

def update_link(
    self,
    repo: Repo,
    contributor: NamedUser,
    contributor_name: str,
    since: datetime.date | None = None,
) -> None:
    path = self.directory / "links" / repo.full_name / (contributor.login + ".json")
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        link = Link.model_validate_json(path.read_text())
        has_commits = link.update_from_github(repo, contributor, since=since)
        if not has_commits:
            path.unlink()
            return
    else:
        link = Link.from_github(repo, contributor, contributor_name, since=since)
        if link is None:
            return
    path.write_text(link.model_dump_json())
```

- [ ] **Step 7: Update cli.py fetch command to pass start dates**

In `cli.py`, build the `start_dates` dict from config and pass it through. Since `contributors` is already a `dict[str, str]` built from `config.all_contributors` or `config.devseed_contributors`, and `get_contributor_start_date` searches all categories, this works directly:

```python
# In the fetch() function, after building `contributors`:
start_dates: dict[str, datetime.date | None] = {}
for login in contributors:
    start_dates[login] = config.get_contributor_start_date(login)

# In the loop, change:
client.update_links(repo, contributors, start_dates=start_dates)
```

Add `import datetime` to the top of `cli.py`.

- [ ] **Step 8: Run all tests**

Run: `uv run pytest -v`
Expected: PASS

- [ ] **Step 9: Run type checker and linter**

Run: `uv run mypy && uv run ruff check .`
Expected: PASS (or only pre-existing issues)

- [ ] **Step 10: Commit**

```bash
git add python/contributor_network/models.py python/contributor_network/client.py python/contributor_network/cli.py python/tests/test_models.py
git commit -m "feat: filter commits by start date across models, client, and CLI"
```

---

### Task 4: Smoke test with real config.toml

**Files:**
- Modify: `config.toml` (one test contributor only)

- [ ] **Step 1: Convert one contributor to inline-table format as a smoke test**

Pick one contributor (e.g., yourself) and update their entry in `config.toml`:

```toml
aboydnw = { name = "Anthony Boyd", start_date = 2023-01-09 }
```

Leave all other contributors as plain strings.

- [ ] **Step 2: Run the existing config test**

Run: `uv run pytest python/tests/test_config.py::test_config -v`
Expected: PASS — real config.toml parses correctly with mixed formats.

- [ ] **Step 3: Run full test suite**

Run: `uv run pytest -v && npm test`
Expected: PASS

- [ ] **Step 4: Revert the config change**

This was a smoke test. Revert to the original string format — the real start dates will be populated in a separate data-gathering effort.

```bash
git checkout config.toml
```

- [ ] **Step 5: Update documentation**

Update `.claude/CLAUDE.md` to document the new config format under "Add a New Contributor" and note the `start_date` option.

- [ ] **Step 6: Commit documentation update**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: document contributor start_date config format"
```
