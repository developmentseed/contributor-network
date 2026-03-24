# Contributor Start Dates Design — Phase 1 of Time-Based Data

**Date:** 2026-03-24
**Scope:** Add per-contributor start dates to config, filter GitHub commits to only count post-start-date contributions
**Depends on:** Nothing — independent of chart animations work

---

## Context

The contributor network visualization currently counts all commits by a contributor to a repository, regardless of when those commits were made. If someone joined DevSeed in 2022 but the repo has their commits from 2018 (pre-DevSeed open-source work), those are incorrectly attributed as DevSeed contributions. This phase adds a `start_date` per contributor so only commits after their start at DevSeed are counted.

This is Phase 1 of a two-phase time-based data effort:
- **Phase 1 (this spec):** Start dates for data accuracy
- **Phase 2 (future spec):** Monthly commit histograms + timeline slider UI

---

## Config Change

### Before

```toml
[contributors.devseed]
gadomski = "Pete Gadomski"
aboydnw = "Anthony Boyd"
```

### After

```toml
[contributors.devseed]
gadomski = { name = "Pete Gadomski", start_date = 2020-03-15 }
aboydnw = { name = "Anthony Boyd", start_date = 2023-01-09 }
```

TOML supports native date types, so `start_date = 2020-03-15` requires no quotes.

### Backwards Compatibility

Contributors without a start date yet (plain string values) continue to work — all their commits are counted as before. This allows incremental population of start dates without breaking the data pipeline. The `Config` model uses a Pydantic `@field_validator` to normalize both formats into `ContributorEntry` objects.

---

## Backend Changes

### `config.py`

The `contributors` field changes from `dict[str, dict[str, str]]` to support both formats:
- Plain string: `"Pete Gadomski"` (legacy, no date filtering)
- Inline table: `{ name = "Pete Gadomski", start_date = 2020-03-15 }`

A new Pydantic model handles the inline table:

```python
class ContributorEntry(BaseModel):
    name: str
    start_date: datetime.date | None = None
```

`Config` uses `contributors: dict[str, dict[str, ContributorEntry]]` with a validator that coerces plain strings into `ContributorEntry(name=string_value)`.

`Config` exposes:
- `get_contributor_name(login) -> str` — returns the display name
- `get_contributor_start_date(login) -> datetime.date | None` — returns the start date or None
- `all_contributors` — still returns `dict[str, str]` (login -> name) for compatibility with existing callers (`client.py:update_links()`, `cli.py:fetch()`, `cli.py:list_contributors()`)

### `models.py` — `Link.from_github()`

Accepts an optional `since: datetime.date` parameter. When provided:
- Passes `since` as a `datetime.datetime` (midnight UTC) to `repo.get_commits(author=login, since=since)` — PyGitHub's `get_commits()` requires `datetime`, not `date`
- **Counts commits manually** by iterating the filtered paginated list, because `contributor.contributions` (from PyGitHub) returns the all-time total and cannot be filtered by date
- `commit_sec_min` reflects the earliest post-start-date commit
- `commit_sec_max` reflects the latest post-start-date commit
- `commit_count` reflects only post-start-date commits
- Derived fields (`contribution_span_days`, `is_recent_contributor`) are computed from filtered data

If `since` filtering results in zero commits, the link is not created.

### `models.py` — `Link.update_from_github()`

Also accepts the optional `since` parameter. Uses `get_commits(since=...)` and manual counting, same as `from_github()`. Returns a boolean indicating whether the link still has commits. If zero post-start-date commits remain, the caller deletes the existing link JSON file.

### `client.py`

`update_link()` and `update_links()` accept and pass through the start date to `Link.from_github()` / `Link.update_from_github()`. If `update_from_github()` returns `False` (zero filtered commits), `update_link()` deletes the existing link JSON file.

### `cli.py`

The `fetch` command passes start dates from the config through to `client.update_links()`. Uses `config.get_contributor_start_date(login)` to look up the date for each contributor.

### API Rate Limit Impact

Counting commits manually via `get_commits(since=...)` uses paginated API calls (30 commits per page). For a contributor with 200 post-start-date commits on a repo, that's ~7 API calls per link instead of the current ~2. With ~50 contributors across ~80 repos, worst case is a few thousand extra API calls — well within the 5,000/hour authenticated rate limit, but worth noting. The existing exponential backoff retry logic handles any rate limit hits.

---

## What Does NOT Change

- **Frontend:** No changes. The visualization renders more accurate data automatically.
- **CSV generation:** No changes. CSVs are generated from the filtered JSON.
- **Repository model:** No changes.
- **Link JSON schema:** No new fields. Existing fields (`commit_sec_min`, `commit_sec_max`, `commit_count`, etc.) now reflect post-start-date data.

---

## Data Re-fetch

After populating start dates in `config.toml`, a full data re-fetch is required:

```bash
uv run contributor-network fetch
uv run contributor-network csvs
```

The `fetch` command will re-fetch commits with the start date filter applied. Existing link JSON files will be overwritten with filtered data.

---

## Testing

- Unit test: `ContributorEntry` model parses both string and inline table formats
- Unit test: `Config` validator normalizes plain strings into `ContributorEntry` objects
- Unit test: `Config.get_contributor_name()` and `get_contributor_start_date()` return correct values for both formats
- Unit test: `Link.from_github()` with a `since` date counts only filtered commits (mock `repo.get_commits(since=...)`)
- Unit test: `Link.from_github()` without a `since` date behaves as before
- Unit test: Zero post-start-date commits returns no link (caller handles `None` or empty)

---

## Open Questions

None — design is straightforward. Phase 2 (histograms + timeline slider) will be specced separately.
