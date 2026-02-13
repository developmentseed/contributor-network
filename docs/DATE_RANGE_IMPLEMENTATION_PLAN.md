# Date Range Implementation Plan

Granular commit counts over time, enabling dynamic link/flow sizing based on commit activity within a selected date window.

---

## Goal

When a user selects a time range, the visualization should reflect the actual commit count within that window — not just whether activity overlapped. Link widths, contributor node sizes, and flow visuals should all scale to the filtered commit counts. This also lays the groundwork for a future animation feature that steps through time.

---

## Current State

### Data Pipeline

The Python CLI (`python/contributor_network/cli.py`) fetches commit data via PyGithub. The `data` command calls `Link.from_github()` for each contributor-repo pair, which:

1. Calls `repo.get_commits(author=contributor.login)` to get all commits
2. Extracts only three values: first commit timestamp, last commit timestamp, total count
3. Discards individual commit dates

The raw temporal data passes through the code but is not stored.

### Link Model (`python/contributor_network/models.py`)

```
author_name: str
repo: str
commit_count: int
commit_sec_min: int       # Unix timestamp of first commit
commit_sec_max: int       # Unix timestamp of last commit
contribution_span_days: int
is_recent_contributor: bool
```

### CSV Output (`links.csv`)

One row per contributor-repo pair. 369 rows for the current dataset. Contains the aggregate `commit_count` with no temporal breakdown.

### JavaScript Consumption

`d3.csv()` loads `links.csv`. `prepare.js` parses `commit_count` as a number and uses it to scale link widths via `scale_link_width`. Contributor radii are scaled by `total_commits` (sum of their link commit counts).

---

## Changes Required

### 1. Python: Collect Monthly Commit Histograms

**File:** `python/contributor_network/models.py`

Add a new field to the `Link` model:

```python
commit_histogram: dict[str, int] = {}  # {"2024-01": 5, "2024-02": 12, ...}
```

**File:** `python/contributor_network/cli.py` (inside `Link.from_github()` or `update_links()`)

The method already iterates all commits to compute the total count. During that iteration, extract each commit's `author.date`, format as `YYYY-MM`, and bucket:

```python
from collections import defaultdict

histogram = defaultdict(int)
for commit in repo.get_commits(author=login):
    date = commit.commit.author.date  # datetime object
    month_key = date.strftime("%Y-%m")
    histogram[month_key] += 1

link.commit_histogram = dict(histogram)
```

This adds zero extra API calls. The commit objects are already being fetched.

**Existing fields are unchanged.** `commit_count`, `commit_sec_min`, `commit_sec_max`, `contribution_span_days`, and `is_recent_contributor` remain as-is for backward compatibility.

---

### 2. New CSV: `commit_activity.csv`

**File:** `python/contributor_network/cli.py` (inside the `csvs` command)

Create a fourth CSV file with one row per contributor-repo-month:

```
author_name,repo,month,commit_count
Vincent Sarago,developmentseed/titiler,2024-01,12
Vincent Sarago,developmentseed/titiler,2024-02,8
Vincent Sarago,developmentseed/titiler,2024-03,15
Kyle Barron,stac-utils/rustac,2024-01,22
...
```

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `author_name` | string | Contributor display name (matches `links.csv`) |
| `repo` | string | Full repo name `owner/repo` (matches `links.csv`) |
| `month` | string | `YYYY-MM` format |
| `commit_count` | int | Number of commits in that month |

**Generation logic:**

```python
# Inside the csvs command, after writing links.csv:
activity_rows = []
for link_file in links_dir.glob("*.json"):
    link = Link.model_validate_json(link_file.read_text())
    for month, count in link.commit_histogram.items():
        activity_rows.append({
            "author_name": link.author_name,
            "repo": link.repo,
            "month": month,
            "commit_count": count,
        })

# Sort for readability
activity_rows.sort(key=lambda r: (r["author_name"], r["repo"], r["month"]))

# Write CSV
with open(output_dir / "commit_activity.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["author_name", "repo", "month", "commit_count"])
    writer.writeheader()
    writer.writerows(activity_rows)
```

**Expected size:** ~369 links × ~30 months average = ~11,000 rows. Well within browser limits.

**Also update the `build` command** to copy `commit_activity.csv` to `assets/data/` alongside the other CSVs.

---

### 3. JavaScript: Load and Index the Activity Data

**File:** `index.html`

Add the fourth CSV to the existing `Promise.all`:

```javascript
const promises = [
    d3.csv('assets/data/top_contributors.csv'),
    d3.csv('assets/data/repositories.csv'),
    d3.csv('assets/data/links.csv'),
    d3.csv('assets/data/commit_activity.csv')   // NEW
];
```

Pass `values[3]` through to the chart constructor.

**File:** `js/chart.js`

Build a lookup map during initialization, keyed by `author_name~repo`:

```javascript
// Build activity index: "author_name~repo" → Map<month, count>
const activityIndex = new Map();
activityData.forEach(row => {
    const key = `${row.author_name}~${row.repo}`;
    if (!activityIndex.has(key)) {
        activityIndex.set(key, new Map());
    }
    activityIndex.get(key).set(row.month, +row.commit_count);
});
```

**File:** `js/data/prepare.js`

During link normalization, attach the histogram to each link:

```javascript
// After parsing commit_count, commit_sec_min, commit_sec_max:
const linkKey = `${d.contributor_name}~${d.repo}`;
d.commit_histogram = activityIndex.get(linkKey) || new Map();
```

---

### 4. Time Range Filtering with Accurate Counts

**File:** `js/chart.js` (inside `applyFilters()`)

Replace the overlap-based time filter described in the roadmap (Feature 4) with a count-based filter:

```javascript
if (activeFilters.timeRangeMin !== null || activeFilters.timeRangeMax !== null) {
    visibleLinks = visibleLinks.map(link => {
        // Sum commits only within the selected month range
        let filteredCount = 0;
        for (const [month, count] of link.commit_histogram.entries()) {
            // Parse "YYYY-MM" to a comparable date (first of month)
            const monthDate = new Date(month + "-01");
            if (activeFilters.timeRangeMin && monthDate < activeFilters.timeRangeMin) continue;
            if (activeFilters.timeRangeMax && monthDate > activeFilters.timeRangeMax) continue;
            filteredCount += count;
        }
        // Return a copy with the filtered count
        return { ...link, commit_count: filteredCount };
    }).filter(link => link.commit_count > 0);  // Remove links with zero commits in range

    // Re-derive visible repos from remaining links
    const repoIdsFromLinks = new Set(visibleLinks.map(l => l.repo));
    visibleRepos = visibleRepos.filter(r => repoIdsFromLinks.has(r.repo));
}
```

The existing cascade (Steps 3-4 in `applyFilters()`) then handles filtering contributors and re-filtering links.

---

### 5. Dynamic Link Width Scaling

**File:** `js/data/prepare.js` (inside scale domain calculation)

The `scale_link_width` domain is currently set once from the global max `commit_count`. After time-range filtering replaces commit counts, the domain must update.

**Recommended approach — fixed domain with context:**

Keep the global max as the scale domain so link widths are always relative to the full dataset. A link that had 100 commits total but only 10 in the selected range will appear proportionally thinner. This makes comparisons across time ranges meaningful.

```javascript
// During prepareData(), the domain is set from current (possibly filtered) data:
const maxCommitCount = d3.max(links, d => d.commit_count);
scale_link_width.domain([1, 10, maxCommitCount]);
```

This already happens in `prepareData()` which runs during `chart.rebuild()`. Since `commit_count` values are replaced by the filtered counts before `prepareData()` runs, the scale will use the filtered max. If you want a fixed global reference instead, store `originalMaxCommitCount` before any filtering and use that as the domain ceiling.

---

### 6. Dynamic Contributor Node Sizing

**File:** `js/data/prepare.js`

Contributor radius is scaled by `total_commits`, which is calculated as the sum of their link `commit_count` values. Since links now carry filtered counts after Step 4, this recalculation happens naturally during `prepareData()`:

```javascript
// Already exists in prepare.js — recalculates from current link data:
contributors.forEach(d => {
    d.total_commits = d3.sum(
        d.links_original.filter(l => /* link is visible */),
        l => l.commit_count
    );
});
```

Verify that `links_original` on each contributor is updated to reference the filtered links (not the pre-filter originals). If `links_original` still points to unfiltered data, either update it during `applyFilters()` or compute `total_commits` from `visibleLinks` instead.

---

### 7. Owner Node Aggregation

**File:** `js/data/prepare.js`

Owner nodes aggregate stats from their child repos. When link counts change, the owner-level aggregations (total commits through that owner) should reflect the filtered values. The existing owner link deduplication and aggregation in `prepareData()` (lines 364-436) already sums `commit_count` from the current links, so this should work automatically. Verify by checking that owner link widths shrink when the time range narrows.

---

## Animation Hook (Future)

With monthly histograms on each link, animation becomes a UI controller problem:

```javascript
// Pseudocode for animation controller
const months = getAllMonthsSorted();  // ["2019-06", "2019-07", ...]
let frameIndex = 0;

function animateFrame() {
    const currentMonth = months[frameIndex];
    chart.setTimeRange(
        new Date(months[0] + "-01"),      // Cumulative: from start
        new Date(currentMonth + "-01")     // Up to current frame
    );
    frameIndex++;
    if (frameIndex < months.length) {
        requestAnimationFrame(animateFrame);
    }
}
```

Nodes appear when their first commit month is reached. Links grow as commit counts accumulate. The ring fills up over time. No additional data pipeline changes are needed — only a UI play/pause/scrub control and the animation loop.

---

## Implementation Order

1. **Python model change** — add `commit_histogram` field to Link
2. **Python CLI change** — bucket commits by month during `Link.from_github()`
3. **CSV generation** — write `commit_activity.csv` in the `csvs` command
4. **Build command** — copy new CSV to `assets/data/`
5. **Re-run data collection** — `python -m contributor_network data` then `csvs` then `build`
6. **JS data loading** — load fourth CSV, build activity index
7. **JS data preparation** — attach histograms to link objects
8. **Time range filtering** — implement count-based filtering in `applyFilters()`
9. **Scale updates** — verify link widths and contributor radii update correctly
10. **UI slider** — build the time range control (see Feature 4 in ROADMAP.md)

Steps 1-5 are Python/data work (~half day). Steps 6-10 are JS/visualization work (~1-2 days), mostly layered on top of the Feature 4 time range slider from the roadmap.

---

## Risks and Considerations

**API rate limits:** No additional API calls are needed. The commit data is already being fetched — we're just retaining the dates instead of discarding them.

**Data freshness:** Existing JSON files in `links/` won't have `commit_histogram` until re-fetched. The field defaults to `{}` so old data won't break, but will produce empty histograms. A full re-fetch is needed for complete temporal data.

**Month boundary precision:** Commits are bucketed by calendar month (UTC). A commit at 11:59pm on Jan 31 and one at 12:01am on Feb 1 land in different buckets. This is acceptable for the visualization's granularity.

**Scale behavior:** When the time range is very narrow (e.g., one month), most links will have small counts and the scale domain shrinks. This can make thin links appear thick. Consider setting a minimum domain ceiling (e.g., 10) to prevent scale distortion on narrow ranges.

**Backward compatibility:** `links.csv` is unchanged. The new `commit_activity.csv` is additive. If the JS can't find it, fall back to the overlap-based filtering described in the ROADMAP.md Feature 4 entry.

---

**Last Updated**: February 2026
