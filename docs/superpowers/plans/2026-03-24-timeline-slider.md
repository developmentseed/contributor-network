# Timeline Slider — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect monthly commit histograms per link and add a timeline slider + preset buttons so users can watch the contributor network evolve over time.

**Architecture:** The Python backend collects per-month commit counts during the `fetch` pass (iterating commits is already required by Phase 1's start-date filtering). A new `monthly_commits` field on each Link stores a `{YYYY-MM: count}` dict. On the frontend, a timeline slider and preset buttons ("Last year", "Last 2 years", "All time") filter repos and links using the existing dim/undim pattern — repos outside the time window are grayed out, contributors remain constant in the ring.

**Tech Stack:** Python (Pydantic, PyGitHub), TypeScript (D3.js, HTML range input), Vite

**Depends on:** Phase 1 (Contributor Start Dates) must be complete. This plan assumes `Link.from_github()` already iterates commits via `list()` when `since` is provided.

---

## Slider UX Specification

The timeline slider controls "show contributions from this month onward to the present." It is a single-thumb range input:

- **Left edge:** Earliest month across all link data (e.g., `2018-01`)
- **Right edge / default:** Current month (e.g., `2026-03`)
- **Dragging left:** Expands the time window further into the past (shows more)
- **Dragging right:** Narrows the window to only recent contributions (shows less)
- **Default position:** All the way to the left (= "All time", everything visible)

Preset buttons set the slider to fixed positions:
- **"Last year"** — slider jumps to 12 months ago
- **"Last 2 years"** — slider jumps to 24 months ago
- **"All time"** — slider returns to the left edge

When the slider moves, the active preset button updates to match (or none are active if the slider is between presets).

**Debouncing:** Slider `input` events fire on every pixel of movement. Debounce the filter update by 50ms so the draw loop doesn't thrash during a fast drag.

---

## Timeline Filtering Logic

Timeline filtering works differently from org/metric filters — it's **link-first** rather than repo-first:

1. For each link, check if any of its `monthly_commits` keys fall within `[timelineStart, currentMonth]`
2. Links with no matching months → dimmed (same as `filteredOut = true`)
3. Repos where ALL links are dimmed → repo also dimmed
4. Contributors remain constant (never dimmed by timeline)
5. Links without `monthly_commits` data (legacy, no start date) → **included** when timeline is "All time", **dimmed** when any time filter is active (we can't prove they were active in the window)

This composes with existing org/metric filters: a link must pass **both** the existing filters AND the timeline filter to be visible.

---

### Task 1: Add monthly_commits field to Link model

**Files:**
- Modify: `python/contributor_network/models.py`
- Modify: `python/tests/test_models.py`

- [ ] **Step 1: Write failing test for monthly_commits in Link.from_github**

Add to `python/tests/test_models.py`:

```python
def test_link_from_github_collects_monthly_histogram():
    repo = MagicMock()
    repo.full_name = "org/repo"

    commits = [
        _make_commit(datetime.datetime(2023, 6, 20, tzinfo=datetime.timezone.utc)),
        _make_commit(datetime.datetime(2023, 6, 5, tzinfo=datetime.timezone.utc)),
        _make_commit(datetime.datetime(2023, 3, 10, tzinfo=datetime.timezone.utc)),
    ]
    paginated = MagicMock()
    paginated.__iter__ = MagicMock(return_value=iter(commits))
    repo.get_commits.return_value = paginated

    contributor = _make_contributor("alice", 3)

    link = Link.from_github(repo, contributor, "Alice", since=datetime.date(2023, 1, 1))

    assert link is not None
    assert link.monthly_commits == {"2023-03": 1, "2023-06": 2}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest python/tests/test_models.py::test_link_from_github_collects_monthly_histogram -v`
Expected: FAIL — `monthly_commits` field doesn't exist.

- [ ] **Step 3: Add monthly_commits field and collection logic**

In `python/contributor_network/models.py`, add the field to `Link`:

```python
class Link(BaseModel):
    # ... existing fields ...
    monthly_commits: dict[str, int] = {}
```

In `from_github()`, in the `since is not None` branch (which already does `commits_list = list(...)`), build the histogram:

```python
monthly: dict[str, int] = {}
for commit in commits_list:
    key = commit.commit.author.date.strftime("%Y-%m")
    monthly[key] = monthly.get(key, 0) + 1
```

Pass `monthly_commits=monthly` to the constructor. The `since is None` branch leaves `monthly_commits` as the default empty dict.

- [ ] **Step 4: Run tests**

Run: `uv run pytest python/tests/test_models.py -v`
Expected: PASS

- [ ] **Step 5: Add same histogram collection to update_from_github()**

In the `since is not None` branch of `update_from_github()`, rebuild `self.monthly_commits` from `commits_list` using the same loop.

- [ ] **Step 6: Write test for update_from_github histogram**

```python
def test_update_from_github_rebuilds_monthly_histogram():
    link = Link(
        author_name="Alice", repo="org/repo",
        commit_count=5, commit_sec_min=1000000, commit_sec_max=2000000,
    )
    repo = MagicMock()
    commits = [
        _make_commit(datetime.datetime(2023, 9, 1, tzinfo=datetime.timezone.utc)),
        _make_commit(datetime.datetime(2023, 9, 15, tzinfo=datetime.timezone.utc)),
        _make_commit(datetime.datetime(2023, 6, 1, tzinfo=datetime.timezone.utc)),
    ]
    paginated = MagicMock()
    paginated.__iter__ = MagicMock(return_value=iter(commits))
    paginated.__getitem__ = MagicMock(side_effect=lambda i: commits[i])
    repo.get_commits.return_value = paginated

    contributor = _make_contributor("alice", 999)
    link.update_from_github(repo, contributor, since=datetime.date(2023, 1, 1))

    assert link.monthly_commits == {"2023-06": 1, "2023-09": 2}
```

- [ ] **Step 7: Run all tests**

Run: `uv run pytest -v`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add python/contributor_network/models.py python/tests/test_models.py
git commit -m "feat: collect monthly commit histograms in Link model"
```

---

### Task 2: Serialize monthly_commits to CSV correctly

**Files:**
- Modify: `python/contributor_network/cli.py`
- Modify: `python/tests/test_models.py` (optional verification)

- [ ] **Step 1: Understand the problem**

The `DictWriter` in `cli.py:build()` writes each field via `str()`. A Python dict like `{"2023-03": 1}` would be written as `{'2023-03': 1}` — single quotes, not valid JSON. The frontend needs valid JSON to `JSON.parse()`.

- [ ] **Step 2: Add a Pydantic serializer to Link.monthly_commits**

In `python/contributor_network/models.py`, use a `@field_serializer` to ensure the dict is JSON-encoded when dumped:

```python
import json
from pydantic import field_serializer

class Link(BaseModel):
    # ... existing fields ...
    monthly_commits: dict[str, int] = {}

    @field_serializer("monthly_commits")
    @classmethod
    def serialize_monthly_commits(cls, v: dict[str, int]) -> str:
        return json.dumps(v) if v else "{}"
```

This means `model_dump(mode="json")` will produce a JSON string for this field, which `DictWriter` writes directly into the CSV cell.

- [ ] **Step 3: Write a test to verify serialization**

```python
import json

def test_link_monthly_commits_serializes_as_json_string():
    link = Link(
        author_name="Alice", repo="org/repo",
        commit_count=2, commit_sec_min=1000000, commit_sec_max=2000000,
        monthly_commits={"2023-03": 1, "2023-06": 1},
    )
    dumped = link.model_dump(mode="json")
    assert isinstance(dumped["monthly_commits"], str)
    assert json.loads(dumped["monthly_commits"]) == {"2023-03": 1, "2023-06": 1}
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add python/contributor_network/models.py python/tests/test_models.py
git commit -m "feat: serialize monthly_commits as JSON string for CSV"
```

---

### Task 3: Parse monthly_commits on the frontend

**Files:**
- Modify: `src/types.ts`
- Modify: `src/data/prepare.ts`
- Test: `src/__tests__/prepare.test.ts` (create or modify)

- [ ] **Step 1: Add monthly_commits to LinkData type**

In `src/types.ts`, add to `LinkData`:

```typescript
monthly_commits?: Record<string, number>;
```

- [ ] **Step 2: Parse the field during data preparation**

In `src/data/prepare.ts`, inside the link processing loop (around line 250, after `commit_sec_min`/`commit_sec_max` parsing), add:

```typescript
if (typeof (d as any).monthly_commits === "string" && (d as any).monthly_commits) {
  try {
    d.monthly_commits = JSON.parse((d as any).monthly_commits);
  } catch {
    d.monthly_commits = {};
  }
}
```

- [ ] **Step 3: Propagate monthly_commits through owner-node link aggregation**

In `src/data/prepare.ts`, when links are restructured into contributor→owner and owner→repo links (around lines 400-455), `monthly_commits` must be aggregated alongside `commit_count`, `commit_sec_min`, and `commit_sec_max`.

For the `d3.rollup` aggregations, merge histograms:

```typescript
function mergeMonthlyCommits(links: LinkData[]): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const link of links) {
    if (link.monthly_commits) {
      for (const [month, count] of Object.entries(link.monthly_commits)) {
        merged[month] = (merged[month] || 0) + count;
      }
    }
  }
  return merged;
}
```

Add `monthly_commits: mergeMonthlyCommits(value)` to each aggregated link object.

- [ ] **Step 4: Write test for parsing and merging**

```typescript
test("mergeMonthlyCommits combines histograms", () => {
  const links = [
    { monthly_commits: { "2023-03": 5, "2023-06": 2 } },
    { monthly_commits: { "2023-03": 1, "2023-09": 3 } },
  ] as LinkData[];
  const merged = mergeMonthlyCommits(links);
  expect(merged).toEqual({ "2023-03": 6, "2023-06": 2, "2023-09": 3 });
});
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/data/prepare.ts src/__tests__/
git commit -m "feat: parse and aggregate monthly_commits on frontend"
```

---

### Task 4: Timeline filter state

**Files:**
- Modify: `src/types.ts`
- Modify: `src/state/filterState.ts`
- Test: `src/__tests__/filterState.test.ts` (create or modify)

- [ ] **Step 1: Add timeline fields to FilterState**

In `src/types.ts`:

```typescript
export interface FilterState {
  organizations: string[];
  starsMin: number | null;
  forksMin: number | null;
  timelineStart: string | null;  // "YYYY-MM" format, null = no filter (all time)
}
```

Note: no `timelineEnd` — the end is always the current month.

- [ ] **Step 2: Update createFilterState() and related functions**

In `src/state/filterState.ts`, add `timelineStart: null` to defaults. Add:

```typescript
export function setTimelineStart(
  state: FilterState,
  start: string | null,
): FilterState {
  state.timelineStart = start;
  return state;
}
```

Update `clearFilters()` to reset `timelineStart = null`. Update `hasActiveFilters()` to include `state.timelineStart !== null`.

- [ ] **Step 3: Write tests**

```typescript
test("setTimelineStart sets the start month", () => {
  const state = createFilterState();
  setTimelineStart(state, "2024-01");
  expect(state.timelineStart).toBe("2024-01");
});

test("clearFilters resets timeline", () => {
  const state = createFilterState();
  setTimelineStart(state, "2024-01");
  clearFilters(state);
  expect(state.timelineStart).toBeNull();
});

test("hasActiveFilters detects timeline", () => {
  const state = createFilterState();
  expect(hasActiveFilters(state)).toBe(false);
  setTimelineStart(state, "2024-01");
  expect(hasActiveFilters(state)).toBe(true);
});
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/state/filterState.ts src/__tests__/
git commit -m "feat: add timeline start to filter state"
```

---

### Task 5: Timeline filtering logic

**Files:**
- Modify: `src/data/filter.ts`
- Test: `src/__tests__/filter.test.ts` (create or modify)

- [ ] **Step 1: Write failing tests for timeline link filtering**

```typescript
import { isLinkActiveInTimeline } from "../data/filter";

test("link with commits in range is active", () => {
  const link = {
    monthly_commits: { "2023-03": 5, "2023-06": 2 },
    commit_count: 7,
  } as LinkData;
  expect(isLinkActiveInTimeline(link, "2023-01")).toBe(true);
});

test("link with commits only before range is inactive", () => {
  const link = {
    monthly_commits: { "2022-01": 3, "2022-06": 1 },
    commit_count: 4,
  } as LinkData;
  expect(isLinkActiveInTimeline(link, "2023-01")).toBe(false);
});

test("link without monthly_commits is inactive when timeline filter active", () => {
  const link = { commit_count: 5 } as LinkData;
  expect(isLinkActiveInTimeline(link, "2023-01")).toBe(false);
});

test("link without monthly_commits is active when no timeline filter", () => {
  const link = { commit_count: 5 } as LinkData;
  expect(isLinkActiveInTimeline(link, null)).toBe(true);
});
```

- [ ] **Step 2: Implement isLinkActiveInTimeline**

In `src/data/filter.ts`:

```typescript
export function isLinkActiveInTimeline(
  link: LinkData,
  timelineStart: string | null,
): boolean {
  if (timelineStart === null) return true;
  if (!link.monthly_commits) return false;
  return Object.keys(link.monthly_commits).some(
    (month) => month >= timelineStart,
  );
}
```

- [ ] **Step 3: Integrate into applyFilters()**

Timeline filtering happens **after** existing org/metric filters, but it filters links rather than repos. In `applyFilters()`, after the existing filter chain:

```typescript
// Apply timeline filter to links
if (activeFilters.timelineStart) {
  visibleLinks = visibleLinks.filter((link) =>
    isLinkActiveInTimeline(link, activeFilters.timelineStart),
  );

  // Repos with zero remaining links get dimmed
  const reposWithLinks = new Set(visibleLinks.map((l) => l.repo));
  visibleRepos = visibleRepos.filter((r) => reposWithLinks.has(r.repo));

  // Recalculate visible contributors from remaining links
  const contributorsWithLinks = new Set(
    visibleLinks.map((l) => l.author_name!),
  );
  // Note: contributors remain in the ring but repos/links dim.
  // The contributor filtering only affects which contributors have connections,
  // not whether they're shown.
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/filter.ts src/__tests__/
git commit -m "feat: add timeline-based link filtering"
```

---

### Task 6: Timeline slider UI

**Files:**
- Modify: `index.html`
- Create: `src/interaction/timeline.ts`
- Modify: `src/chart.ts`
- Modify: `public/css/` (relevant stylesheet)

- [ ] **Step 1: Add slider HTML**

Add a range input and preset buttons to `index.html`, near the existing filter controls:

```html
<div id="timeline-controls">
  <input type="range" id="timeline-slider" min="0" max="100" value="0" step="1" />
  <span id="timeline-label">All time</span>
  <div id="timeline-presets">
    <button data-preset="1y">Last year</button>
    <button data-preset="2y">Last 2 years</button>
    <button data-preset="all" class="active">All time</button>
  </div>
</div>
```

Note: `value="0"` = all the way left = "All time" (default).

- [ ] **Step 2: Write unit tests for timeline logic**

Create `src/__tests__/timeline.test.ts`:

```typescript
import { sliderToMonth, monthToSlider, computeMonthRange } from "../interaction/timeline";

test("computeMonthRange extracts global min/max", () => {
  const links = [
    { monthly_commits: { "2020-01": 1, "2022-06": 2 } },
    { monthly_commits: { "2021-03": 1, "2023-12": 1 } },
  ] as LinkData[];
  const range = computeMonthRange(links);
  expect(range.min).toBe("2020-01");
  expect(range.max).toBe("2023-12");
});

test("sliderToMonth maps 0 to min month", () => {
  expect(sliderToMonth(0, "2020-01", "2024-01")).toBe("2020-01");
});

test("sliderToMonth maps 100 to max month", () => {
  expect(sliderToMonth(100, "2020-01", "2024-01")).toBe("2024-01");
});

test("monthToSlider round-trips correctly", () => {
  const pos = monthToSlider("2022-01", "2020-01", "2024-01");
  const month = sliderToMonth(pos, "2020-01", "2024-01");
  expect(month).toBe("2022-01");
});
```

- [ ] **Step 3: Implement timeline module**

Create `src/interaction/timeline.ts`:

```typescript
import type { LinkData } from "../types";

export interface MonthRange {
  min: string;  // "YYYY-MM"
  max: string;  // "YYYY-MM"
  totalMonths: number;
}

export function computeMonthRange(links: LinkData[]): MonthRange {
  let min = "9999-99";
  let max = "0000-00";
  for (const link of links) {
    if (!link.monthly_commits) continue;
    for (const month of Object.keys(link.monthly_commits)) {
      if (month < min) min = month;
      if (month > max) max = month;
    }
  }
  // Calculate total months between min and max
  const [minY, minM] = min.split("-").map(Number);
  const [maxY, maxM] = max.split("-").map(Number);
  const totalMonths = (maxY - minY) * 12 + (maxM - minM);
  return { min, max, totalMonths };
}

export function sliderToMonth(
  value: number, // 0-100
  minMonth: string,
  maxMonth: string,
): string {
  const [minY, minM] = minMonth.split("-").map(Number);
  const [maxY, maxM] = maxMonth.split("-").map(Number);
  const totalMonths = (maxY - minY) * 12 + (maxM - minM);
  const offset = Math.round((value / 100) * totalMonths);
  const month = minM - 1 + offset; // 0-indexed
  const y = minY + Math.floor(month / 12);
  const m = (month % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function monthToSlider(
  month: string,
  minMonth: string,
  maxMonth: string,
): number {
  const [tY, tM] = month.split("-").map(Number);
  const [minY, minM] = minMonth.split("-").map(Number);
  const [maxY, maxM] = maxMonth.split("-").map(Number);
  const totalMonths = (maxY - minY) * 12 + (maxM - minM);
  if (totalMonths === 0) return 0;
  const offset = (tY - minY) * 12 + (tM - minM);
  return Math.round((offset / totalMonths) * 100);
}
```

Export a `createTimeline()` function that:
- Calls `computeMonthRange()` to get the global range
- Wires the slider's `input` event (debounced at 50ms) to call `onChange(sliderToMonth(...))`
- Wires preset buttons: "Last year" → `monthToSlider(12 months ago)`, etc.
- Syncs the active preset button class when slider moves
- Updates the label text (e.g., "Since Mar 2023" or "All time")

```typescript
export interface TimelineController {
  setPreset(preset: "1y" | "2y" | "all"): void;
  destroy(): void;
}

export function createTimeline(
  links: LinkData[],
  onChange: (timelineStart: string | null) => void,
): TimelineController {
  const range = computeMonthRange(links);
  const slider = document.getElementById("timeline-slider") as HTMLInputElement;
  const label = document.getElementById("timeline-label")!;
  const presetButtons = document.querySelectorAll<HTMLButtonElement>("#timeline-presets button");

  let debounceTimer: ReturnType<typeof setTimeout>;

  function updateFromSlider() {
    const value = Number(slider.value);
    if (value === 0) {
      onChange(null); // All time
      label.textContent = "All time";
    } else {
      const month = sliderToMonth(value, range.min, range.max);
      onChange(month);
      label.textContent = `Since ${formatMonth(month)}`;
    }
    syncPresetButtons(Number(slider.value));
  }

  slider.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateFromSlider, 50);
  });

  // Wire preset buttons...
  // Return controller...
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/interaction/timeline.ts src/__tests__/timeline.test.ts
git commit -m "feat: implement timeline slider module with month mapping"
```

---

### Task 7: Wire timeline into chart.ts

**Files:**
- Modify: `src/chart.ts`
- Modify: `public/css/` (relevant stylesheet)

- [ ] **Step 1: Initialize timeline controller after data loads**

In `src/chart.ts`, after the data is prepared and the filter manager is created, initialize the timeline:

```typescript
import { createTimeline } from "./interaction/timeline";

// After data loads:
const timeline = createTimeline(originalData.links, (timelineStart) => {
  filterManager.setTimelineStart(timelineStart);
  // This triggers the existing onChange → applyFilters → draw pipeline
});
```

Add `setTimelineStart` to the `FilterManager` interface in `src/data/filter.ts`.

- [ ] **Step 2: Style the timeline controls**

Add CSS to match the existing filter UI:
- Slider fills the available width below the chart
- Preset buttons are inline, pill-shaped, with `.active` highlighting
- Match colors from `src/config/theme.ts`

- [ ] **Step 3: Verify dim/undim animation works with timeline**

The existing filter transition animation (from chart-animations PR) should trigger automatically when timeline filters change, since it's driven by the same `applyFilters → draw` pipeline. No new animation code should be needed.

Start dev server: `npm run dev`
Use Playwright MCP to take screenshots of timeline in various positions.

- [ ] **Step 4: Run all tests**

Run: `npm test && uv run pytest -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/chart.ts public/css/ index.html
git commit -m "feat: wire timeline slider into chart with styling"
```

---

### Task 8: Final integration and cleanup

- [ ] **Step 1: Run full test suite**

Run: `npm test && uv run pytest -v`
Expected: PASS

- [ ] **Step 2: Run type checker and linter**

Run: `npm run typecheck && uv run mypy && uv run ruff check .`
Expected: PASS

- [ ] **Step 3: Visual QA with Playwright**

Navigate to the dev server and take screenshots:
1. Default state (All time, slider at 0) — should look identical to current
2. "Last year" preset — only recent repos lit up, older ones dimmed
3. "Last 2 years" preset
4. Slider dragged to middle — partial network
5. Slider all the way right — minimal network (only current month)

- [ ] **Step 4: Update documentation**

Update `.claude/CLAUDE.md`:
- Add timeline slider to the "Customizing the Visualization" section
- Document the `monthly_commits` field in data flow notes
- Add `timelineStart` to the FilterState documentation

- [ ] **Step 5: Commit**

```bash
git add .claude/CLAUDE.md src/ public/ index.html python/
git commit -m "chore: final polish and documentation for timeline slider"
```
