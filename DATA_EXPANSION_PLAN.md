# GitHub Data Expansion Plan

## Goals

1. **Showcase OSS Impact** - Demonstrate the value and reach of repositories DevSeed contributes to
2. **Prove Community Effort** - Show that these are truly community-driven projects, not just DevSeed initiatives
3. **Track Contributions Over Time** - Visualize when and how DevSeed has contributed to the ecosystem
4. **Identify Active vs Stale Projects** - Help prioritize where effort is being spent

## Current State

### Repository Data Collected
| Field | Source | Purpose |
|-------|--------|---------|
| `repo_stars` | `repo.stargazers_count` | Popularity metric |
| `repo_forks` | `repo.forks_count` | Ecosystem reach |
| `repo_createdAt` | `repo.created_at` | Project age |
| `repo_updatedAt` | `repo.updated_at` | Recent activity indicator |
| `repo_total_commits` | `repo.get_commits().totalCount` | Development effort |
| `repo_languages` | `repo.get_languages()` | Tech stack |
| `repo_description` | `repo.description` | Context |

### Contributor Link Data Collected
| Field | Source | Purpose |
|-------|--------|---------|
| `commit_count` | `contributor.contributions` | Individual contribution size |
| `commit_sec_min` | First commit timestamp | When contributor started |
| `commit_sec_max` | Last commit timestamp | Most recent activity |

---

## Phase 1: Quick Wins

**Effort: Minimal** - Same API calls, just extracting more fields
**Value: High** - Immediately enriches the visualization

### Repository Fields

| Field | PyGithub Property | Value | Notes |
|-------|-------------------|-------|-------|
| `watchers_count` | `repo.subscribers_count` | Shows sustained interest beyond "star and forget" | Free with existing call |
| `open_issues_count` | `repo.open_issues_count` | Indicates active project with ongoing work | Free with existing call |
| `license` | `repo.license.spdx_id` | OSS credibility, helps filtering | Free with existing call |
| `topics` | `repo.get_topics()` | Categorization, ecosystem mapping | 1 extra lightweight call |
| `has_discussions` | `repo.has_discussions` | Community engagement indicator | Free with existing call |
| `has_wiki` | `repo.has_wiki` | Documentation investment | Free with existing call |
| `default_branch` | `repo.default_branch` | Useful for links | Free with existing call |
| `archived` | `repo.archived` | Filter out inactive projects | Free with existing call |

### Contributor Link Fields

| Field | Derivation | Value | Notes |
|-------|------------|-------|-------|
| `contribution_span_days` | `commit_sec_max - commit_sec_min` | Shows long-term stewardship | Computed from existing data |
| `is_recent_contributor` | `commit_sec_max > (now - 90 days)` | Identifies active vs historical | Computed from existing data |

### Implementation

```python
# models.py - Repository additions
repo_watchers: int              # repo.subscribers_count
repo_open_issues: int           # repo.open_issues_count
repo_license: str | None        # repo.license.spdx_id if repo.license else None
repo_topics: str                # ",".join(repo.get_topics())
repo_has_discussions: bool      # repo.has_discussions
repo_archived: bool             # repo.archived

# models.py - Link additions (computed)
contribution_span_days: int     # (commit_sec_max - commit_sec_min) // 86400
is_recent_contributor: bool     # commit_sec_max > (now - 90 days).timestamp()
```

---

## Phase 2: Community Metrics

**Effort: Low-Medium** - One additional API call per repo
**Value: Very High** - Directly addresses "community effort" goal

### Repository Fields

| Field | PyGithub Property | Value | Notes |
|-------|-------------------|-------|-------|
| `total_contributors` | `repo.get_contributors().totalCount` | Proves community involvement | 1 call per repo |
| `devseed_contributor_count` | Count from existing links | Context for DevSeed's role | Computed |
| `external_contributor_count` | `total - devseed` | Community health metric | Computed |
| `community_ratio` | `external / total` | Key "community effort" metric | Computed |

### Derived Metrics

| Metric | Calculation | Value |
|--------|-------------|-------|
| **Bus Factor Indicator** | If `devseed_contributor_count == 1` and that person has >80% commits | Risk indicator |
| **Community Health Score** | `(external_contributors / total) * 100` | Higher = more community-driven |

### Implementation

```python
# models.py additions
repo_total_contributors: int
repo_devseed_contributors: int
repo_external_contributors: int
repo_community_ratio: float     # external / total

# client.py - new method
def get_contributor_stats(self, repo: Repo, devseed_usernames: set[str]) -> dict:
    contributors = list(repo.get_contributors())
    total = len(contributors)
    devseed = sum(1 for c in contributors if c.login in devseed_usernames)
    return {
        "total": total,
        "devseed": devseed,
        "external": total - devseed,
        "ratio": (total - devseed) / total if total > 0 else 0
    }
```

---

## Phase 3: Timeline Data

**Effort: Medium** - Uses GitHub Statistics API, may need retry logic
**Value: Very High** - Enables rich temporal visualizations

### GitHub Statistics API Overview

GitHub pre-computes repository statistics and caches them. First request may return `202 Accepted` (computing), requiring a retry after a few seconds.

### Repository Timeline Fields

| Field | PyGithub Method | Value | Notes |
|-------|-----------------|-------|-------|
| `weekly_commits` | `repo.get_stats_commit_activity()` | Activity heatmap, trend lines | 52 weeks of data |
| `owner_vs_community_weekly` | `repo.get_stats_participation()` | Shows community growth over time | 52 weeks, split by owner |
| `code_frequency` | `repo.get_stats_code_frequency()` | Additions/deletions over time | Shows sustained development |

### Contributor Timeline Fields

| Field | PyGithub Method | Value | Notes |
|-------|-----------------|-------|-------|
| `weekly_activity` | `repo.get_stats_contributors()` | Per-contributor commit timeline | Full history |
| `lines_added_total` | Sum from weekly data | Code contribution size | More meaningful than commits |
| `lines_deleted_total` | Sum from weekly data | Refactoring/maintenance work | Shows cleanup effort |
| `active_weeks_count` | Count weeks with commits > 0 | Consistency of contribution | Sustained vs burst |
| `first_contribution_week` | First week with activity | When they joined | More precise than first commit |
| `last_contribution_week` | Last week with activity | Current status | More precise than last commit |

### Data Structures

```python
# Weekly commit activity (repo-level)
weekly_commits: list[WeeklyCommit]  # stored as JSON string in CSV

class WeeklyCommit(BaseModel):
    week: int           # Unix timestamp (start of week)
    total: int          # Total commits that week
    days: list[int]     # Commits per day [Sun, Mon, ..., Sat]

# Participation split (repo-level)
class ParticipationStats(BaseModel):
    owner_total: int
    community_total: int
    owner_weekly: list[int]     # 52 weeks
    community_weekly: list[int] # 52 weeks

# Contributor timeline (link-level)
class ContributorWeeklyStats(BaseModel):
    week: int           # Unix timestamp
    commits: int
    additions: int
    deletions: int
```

### Implementation Notes

```python
# client.py - with retry logic for stats API
import time

def get_stats_with_retry(self, repo: Repo, stat_method: str, max_retries: int = 3):
    """GitHub stats API returns 202 while computing. Retry until ready."""
    for attempt in range(max_retries):
        result = getattr(repo, stat_method)()
        if result is not None:
            return result
        time.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s
    return None
```

---

## Phase 4: PR and Issue Activity

**Effort: Medium-High** - Requires additional API calls, potentially many for active repos
**Value: High** - PRs often more meaningful than raw commits

### Repository Fields

| Field | PyGithub Method | Value | Notes |
|-------|-----------------|-------|-------|
| `total_prs` | `repo.get_pulls(state='all').totalCount` | Development activity | 1 call |
| `open_prs` | `repo.get_pulls(state='open').totalCount` | Current activity | 1 call |
| `merged_prs_30d` | Search API with date filter | Recent momentum | More expensive |
| `pr_merge_rate` | `merged / total` | Project health | Computed |
| `avg_pr_time_to_merge` | Requires iterating PRs | Maintainer responsiveness | Expensive |

### Contributor Fields

| Field | Method | Value | Notes |
|-------|--------|-------|-------|
| `prs_opened` | Search API: `author:{user} type:pr` | Contribution beyond commits | Per-user search |
| `prs_merged` | Search API with `is:merged` | Accepted contributions | Per-user search |
| `issues_opened` | Search API: `author:{user} type:issue` | Community engagement | Per-user search |
| `reviews_given` | GraphQL API | Quality contribution | Complex |

### API Cost Considerations

- **Search API**: 30 requests/minute (authenticated)
- **GraphQL**: More efficient for complex queries, 5000 points/hour
- **Recommendation**: Batch contributor queries, cache aggressively

### Implementation Approach

```python
# Use search API for contributor PR/issue counts
def get_contributor_activity(self, username: str, repo_full_name: str) -> dict:
    # PRs authored in this repo
    prs = self.github.search_issues(
        f"repo:{repo_full_name} author:{username} type:pr"
    )

    # Issues authored in this repo
    issues = self.github.search_issues(
        f"repo:{repo_full_name} author:{username} type:issue"
    )

    return {
        "prs_total": prs.totalCount,
        "issues_total": issues.totalCount,
    }
```

---

## Phase 5: Advanced Metrics

**Effort: High** - Complex calculations, GraphQL, or external data
**Value: Medium-High** - Nice-to-have polish

### Repository Health Metrics

| Metric | Calculation | Value |
|--------|-------------|-------|
| **Release Frequency** | `repo.get_releases()` + date analysis | Project maturity |
| **Issue Response Time** | Avg time from issue open to first comment | Maintainer engagement |
| **PR Review Turnaround** | Avg time from PR open to first review | Community responsiveness |
| **Documentation Score** | Check for README length, CONTRIBUTING, CODE_OF_CONDUCT | Project professionalism |

### Contributor Impact Metrics

| Metric | Calculation | Value |
|--------|-------------|-------|
| **Code Review Activity** | GraphQL: `pullRequestReviews` | Quality contribution |
| **Cross-Repo Presence** | Count repos contributed to | Ecosystem influence |
| **Mentorship Indicator** | Reviews given vs commits made | Senior contributor signal |

### External Data Sources

| Source | Data Available | Integration |
|--------|----------------|-------------|
| **npm/PyPI downloads** | Package popularity | API calls to registries |
| **GitHub Sponsors** | Funding status | GraphQL API |
| **Dependent repos** | `repo.get_network_count()` | Shows downstream impact |

---

## Implementation Phases Summary

| Phase | New Fields | API Calls Added | Effort | Value |
|-------|------------|-----------------|--------|-------|
| **1: Quick Wins** | 8 repo, 2 link | ~1 per repo | 1-2 hours | High |
| **2: Community** | 4 repo | 1 per repo | 2-3 hours | Very High |
| **3: Timeline** | 3 repo, 6 link | 3 per repo (with retry) | 4-6 hours | Very High |
| **4: PR/Issues** | 5 repo, 4 link | 2-4 per repo + per contributor | 1-2 days | High |
| **5: Advanced** | Variable | Variable | 2-3 days | Medium |

---

## Rate Limit Considerations

| API Type | Limit (Authenticated) | Mitigation |
|----------|----------------------|------------|
| REST API | 5,000/hour | Cache responses, batch where possible |
| Search API | 30/minute | Queue searches, respect rate limits |
| GraphQL | 5,000 points/hour | Use for complex queries only |
| Statistics API | Subject to REST limit | Implement retry logic for 202 responses |

### Recommendations

1. **Cache aggressively** - Repository data changes slowly, cache for 24h minimum
2. **Incremental updates** - Only fetch new data since last run
3. **Batch operations** - Group API calls, respect rate limits
4. **Store raw responses** - Keep JSON files for debugging and re-processing

---

## Visualization Opportunities

With expanded data, new visualization options become possible:

| Data | Visualization | Goal Addressed |
|------|---------------|----------------|
| Timeline data | Stacked area chart of commits over time | Show sustained contribution |
| Community ratio | Pie/donut chart per repo | Prove community effort |
| Contributor spans | Gantt-style timeline | Show long-term stewardship |
| Cross-repo activity | Network graph thickness | Show ecosystem presence |
| Activity heatmap | Calendar view | Identify active periods |

---

## Next Steps

1. **Phase 1**: Add quick-win fields to models, update CLI
2. **Phase 2**: Add contributor counting, compute community ratios
3. **Phase 3**: Integrate statistics API with retry logic
4. Review visualization needs before Phase 4+

---

*Document created: January 2026*
*For: Development Seed Contributor Network Tool*
