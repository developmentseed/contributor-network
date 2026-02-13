# Roadmap

Project status, planned features, and verification criteria.

---

## Project Status

### Completed
- Core visualization and interactions
- Repository and contributor discovery
- Basic filtering (organization, metrics)
- Data expansion phases 1-2 (metadata and community metrics)
- JavaScript modularization and refactoring
- ORCA code removal and rebrand

### In Progress
- UX and chart readability improvements (font sizes, UI refinement)

### Planned
- See [Current Implementation Batch](#features-current-implementation-batch) and [Longer-Term Enhancements](#longer-term-enhancements) below

---

## Features: Current Implementation Batch

These are the next features planned for the visualization. Implementation details are documented in `IMPLEMENTATION_PLAN.md`.

---

### Feature 1: More Repository Filters 🟡 Ready to Design

**What it does:**
Add filtering UI controls for:
- Minimum stars
- Minimum forks
- Minimum watchers
- Programming language

**Why:**
- Let users explore by project scale
- Filter by tech stack
- Discover active vs abandoned projects
- Show modern tech preferences

**Implementation approach:**

**4a. Extend filter state** (`js/state/filterState.js`)
```javascript
{
  organizations: [],
  starsMin: null,
  forksMin: null,
  watchersMin: null,
  language: null
}
```

**4b. Extend filtering logic** (`js/chart.js` `applyFilters()`)
```javascript
// After org filter, add:
if (activeFilters.starsMin !== null) {
  visibleRepos = visibleRepos.filter(r => r.stars >= activeFilters.starsMin);
}
// Same for forks, watchers, language
```

**4c. Add UI controls** (`index.html`)
- Range sliders for stars, forks, watchers
- Dropdown for language selection
- "Clear All Filters" button

**Verification:**
```
✓ Test each filter independently
✓ Test filters in combination
✓ Verify "Clear All" resets everything
✓ Check language dropdown populated correctly
✓ Test with no repos matching filters
```

**Status:** 🟡 Design ready, implementation ready

---

### Feature 2: Visual Flows Target Specific Repo on Hover/Click 🟡 Ready to Design

**What it does:**
When a contributor is selected (clicked), hovering over different repos shows only the relevant link for that contributor-repo pair, not all their connections.

**Why:**
- Shows specific collaboration pathways
- Less visual noise for highly collaborative contributors
- Better understanding of individual relationships

**Current behavior:**
- Click contributor → select them
- Hover repo → see all their links light up

**Target behavior:**
- Click contributor → select them
- Hover repo → show ONLY link to that specific repo (dimly show others)

**Implementation:**

**6a. Track hovered repo during click state**
```javascript
// In interactionState.js, add:
hoveredRepoWhileClicked: null
```

**6b. Filter links during hover rendering**
When clicked node is contributor and hovered node is repo:
- Find links connecting them
- Draw targeted links at full opacity
- Draw others at ~0.05 opacity (ghost them)

**6c. Handle owner intermediary**
Some links go: contributor → owner → repo
- Need to highlight both segments
- Owner node's neighbor_links contain owner→repo links

**Verification:**
```
✓ Click contributor
✓ Hover different repos
✓ See only relevant link highlighted
✓ Test with owner-grouped repos
✓ Verify clicking away clears state
```

**Status:** 🟡 Design ready, implementation ready

---

### Feature 3: Click Action to Hide Irrelevant Contributors/Repos 🟡 Ready to Design

**What it does:**
When a user clicks a contributor node, the chart hides all unrelated contributors and repos, keeping only the clicked contributor, their linked repos, and any co-contributors on those repos. The details panel expands to show richer information about the selected contributor.

**Why:**
- Declutters the view for highly connected networks
- Lets users focus on one contributor's ecosystem
- Creates space for showing deeper data (commit timelines, repo breakdowns) in the details panel

**Current behavior:**
- Click contributor → Delaunay index narrows to neighbors, main canvas fades to 15% opacity, hover canvas shows the contributor's links and neighbor nodes
- All other nodes remain drawn on the faded main canvas

**Target behavior:**
- Click contributor → the chart rebuilds with only the relevant subset of data visible (similar to how org filtering works), and the details panel shows expanded information
- Click background or press Escape → restore full chart

**Implementation:**

**3a. Add click-filter mode to interaction state** (`js/state/interactionState.js`)
```javascript
// Add to state object:
clickFilterActive: false,
clickFilterContributor: null
```

**3b. Build a click-filter function** (`js/chart.js`)

Model this on the existing `applyFilters()` cascade but driven by a clicked contributor rather than UI controls:

```javascript
function applyClickFilter(contributorNode) {
  // 1. Find all repos linked to this contributor
  const linkedRepoIds = new Set(
    contributorNode.neighbor_links
      .map(l => getLinkNodeId(l.target))
      .filter(id => /* is repo or owner */)
  );
  // 2. Find all contributors who also link to those repos
  // 3. Filter visibleRepos, visibleLinks, visibleContributors
  // 4. Call chart.rebuild() to re-layout with subset
}
```

Key difference from org filtering: this is a *temporary* filter triggered by interaction, not the filter UI. Store the pre-click data snapshot so it can be restored on deselect. The existing `originalContributors/Repos/Links` pattern works here — just avoid overwriting them.

**3c. Wire click handler** (`js/interaction/click.js`)

On contributor click:
1. Set `clickFilterActive = true` and store the contributor
2. Call `applyClickFilter(contributorNode)`
3. Optionally animate the transition (fade out irrelevant nodes before rebuild)

On background click or Escape:
1. Set `clickFilterActive = false`
2. Restore original data arrays
3. Call `chart.rebuild()`

**3d. Expand the details panel** (`js/render/tooltip.js`)

When click-filter is active, render a richer panel for the selected contributor:
- Total commits across all visible repos
- List of repos with individual commit counts
- Date range of activity per repo
- Languages across their repos
- Co-contributors (other contributors sharing repos)

This panel should be drawn on the click canvas so it persists across hover interactions.

**Risks:**
- Rebuild performance: full `chart.rebuild()` re-runs all force simulations. May need to cache simulation results or skip simulations for small subsets.
- State complexity: two filter systems (UI filters + click filter) must compose correctly. Click filter should operate on already-UI-filtered data, not raw originals.

**Verification:**
```
✓ Click contributor → only relevant nodes/links remain
✓ Click background → full chart restores
✓ Details panel shows expanded contributor info
✓ Works correctly when org/metric filters are also active
✓ Clicking a different contributor switches the filter
✓ Zoom/pan state preserved across click-filter transitions
```

**Status:** 🟡 Design ready, implementation ready

---

### Feature 4: Time Range Filter for Commit Activity 🟡 Ready to Design

**What it does:**
Add a time range slider (or dual-handle range input) that filters the visualization to only show commit activity within a selected date window. Repos, links, and contributors outside the time range are hidden.

**Why:**
- Explore how the contributor network evolved over time
- Identify recent vs legacy contributors
- See which repos are actively maintained vs dormant
- Answer questions like "who contributed in the last year?"

**Current data available:**
Each link already has `commit_sec_min` and `commit_sec_max` (Unix timestamps for earliest and latest commit by that contributor on that repo). Repos have `createdAt` and `updatedAt` dates. This is enough for time-range filtering without new data collection.

**Limitation:** The CSV stores one `commit_count` per contributor-repo pair with no per-period breakdown. When filtering by time range, you can determine *whether* a contributor was active on a repo during the window (their min/max overlaps), but cannot recalculate the exact commit count within that window. Display the full commit count with a note like "active during this period" or fetch granular data (see below).

**Implementation:**

**4a. Extend filter state** (`js/state/filterState.js`)
```javascript
{
  // ... existing fields
  timeRangeMin: null,  // Date object or null (no filter)
  timeRangeMax: null,  // Date object or null
}
```

Update `hasActiveFilters()` to check these fields.

**4b. Add time-range filtering to the cascade** (`js/chart.js` `applyFilters()`)

Insert after repo filtering but before the link cascade:
```javascript
// Filter links by time overlap with selected range
if (activeFilters.timeRangeMin !== null || activeFilters.timeRangeMax !== null) {
  visibleLinks = visibleLinks.filter(link => {
    const linkMin = link.commit_sec_min;
    const linkMax = link.commit_sec_max;
    // Check overlap: link's range intersects filter range
    if (activeFilters.timeRangeMin && linkMax < activeFilters.timeRangeMin) return false;
    if (activeFilters.timeRangeMax && linkMin > activeFilters.timeRangeMax) return false;
    return true;
  });
  // Re-derive visible repos from remaining links
  const repoIdsFromLinks = new Set(visibleLinks.map(l => l.repo));
  visibleRepos = visibleRepos.filter(r => repoIdsFromLinks.has(r.repo));
}
// Existing contributor cascade (Step 3) handles the rest
```

Note: the time filter operates on *links* first (not repos), since the temporal data lives on links. Then repos without any visible links are removed. The existing contributor cascade then removes contributors without visible links.

**4c. Build the UI control** (`index.html`)

Add a dual-handle range slider below the existing filters:
- Compute global min/max dates from all links' `commit_sec_min`/`commit_sec_max` during data load
- Use two `<input type="range">` elements (or a library like noUiSlider) mapping to the date range
- Display selected range as formatted dates (e.g., "Jan 2020 — Mar 2025")
- On change, call `contributorNetworkVisual.setRepoFilter('timeRangeMin', date)` and `setRepoFilter('timeRangeMax', date)`

**4d. Add chart API** (`js/chart.js`)

The existing `chart.setRepoFilter(name, value)` pattern from Feature 1 works here — just ensure it handles Date values. Add a convenience method:
```javascript
chart.setTimeRange = function(minDate, maxDate) {
  activeFilters.timeRangeMin = minDate;
  activeFilters.timeRangeMax = maxDate;
  chart.rebuild();
  return chart;
};
```

**Optional enhancement:** For richer granularity, expand the Python data pipeline (`python/client.py`) to fetch weekly or monthly commit counts per contributor-repo pair. This would allow showing *how many* commits occurred in the selected window rather than just whether activity overlapped. This is a separate data expansion task (see `DATA_EXPANSION_PLAN.md` Phases 3-4).

**Verification:**
```
✓ Slider range matches actual data timespan
✓ Narrowing range hides repos/contributors with no activity in window
✓ Widening range back to full restores all data
✓ Composes correctly with org and metric filters
✓ Edge case: single-day range still works
✓ Edge case: range that excludes all data shows empty state gracefully
```

**Status:** 🟡 Design ready, implementation ready

---

### Feature 5: More Evenly Spaced Orgs/Repos 🔴 Needs Design

**What it does:**
Improve the positioning of organization and repository nodes so they are more uniformly distributed across the available space, reducing visual clutter and overlap.

**Why:**
- Current layout produces clusters with large gaps elsewhere
- Owner-grouped repos can pile up near certain contributors
- Shared/collaboration repos in the center can overlap heavily
- Better spacing makes the chart easier to read at a glance

**Current architecture:**
Repo positioning uses three independent force simulations that run sequentially:

1. **Owner simulation** (`js/simulations/ownerSimulation.js`): Groups repos by owner. Creates a local force simulation per owner that pulls repos toward an owner centroid. Repos are attracted to their owner node with a centering force.

2. **Contributor simulation** (`js/simulations/contributorSimulation.js`): For repos linked to a single contributor (not shared), runs a per-contributor force simulation that positions repos in a cloud around that contributor. Uses `d3.forceCollide` and `d3.forceRadial` to keep repos near (but not on top of) their contributor.

3. **Collaboration simulation** (`js/simulations/collaborationSimulation.js`): For repos linked to multiple contributors, positions them in the central area using `d3.forceCenter(0,0)`, `d3.forceCollide`, and link forces pulling toward connected contributor nodes.

Each simulation runs independently with its own alpha/decay parameters. Results are merged into the final node positions. There is also `d3-bboxCollide` for label collision avoidance.

**Why this is hard:**
- Three independent simulations don't coordinate — a repo positioned by the contributor sim may overlap with one positioned by the collaboration sim
- Force simulation tuning is iterative and visual — small parameter changes cascade unpredictably
- "Even spacing" is subjective and depends on the dataset

**Implementation approach:**

**5a. Unify collision detection across simulations**

After all three simulations complete, add a final "reconciliation" pass that applies global collision forces to all repo nodes together. In `js/chart.js` after the simulation calls:

```javascript
// After all simulations complete, run a short global collision pass
const allRepoNodes = nodes.filter(n => n.type === "repo" || n.type === "owner");
const reconciliation = d3.forceSimulation(allRepoNodes)
  .force("collide", d3.forceCollide().radius(d => d.r + 8).strength(0.7))
  .force("containment", d3.forceRadial(
    RADIUS_CONTRIBUTOR * 0.85, 0, 0  // keep repos inside the contributor ring
  ).strength(0.05))
  .alpha(0.3)
  .alphaDecay(0.05)
  .stop();

for (let i = 0; i < 100; i++) reconciliation.tick();
// Copy reconciled positions back to nodes
```

**5b. Tune per-simulation parameters**

In each simulation file, adjust:
- **Owner sim**: Increase `forceCollide` radius between owner groups to prevent inter-group overlap. Add a weak `forceRadial` to distribute owner groups around a ring between contributors and center.
- **Contributor sim**: Increase the radial band where per-contributor repos sit. Currently repos cluster tightly; widen the angular spread.
- **Collaboration sim**: Add `d3.forceManyBody().strength(-30)` to push shared repos apart from each other. Increase `forceCollide` padding.

**5c. Consider angular partitioning**

For a more structured layout, assign each contributor an angular "sector" and constrain their linked repos to that sector:
```javascript
// Each contributor already has an angle from ring positioning
// Use that angle ± half the contributor's angular allocation
// as bounds for a forceRadial + angular constraint
```
This prevents repos from drifting into other contributors' territory. Implementation requires a custom force function since D3 doesn't have built-in angular constraints.

**5d. Add `d3-bboxCollide` for all nodes**

Currently `d3-bboxCollide` is used for label collision. Extend it to also handle node-to-node overlap for repos:
```javascript
.force("bbox", d3.bboxCollide(d => {
  const pad = 4;
  return [[-d.r - pad, -d.r - pad], [d.r + pad, d.r + pad]];
}))
```

**Risks:**
- High iteration cost: tuning forces requires visual feedback loops, not just code changes
- Dataset-dependent: parameters that work for 50 repos may fail for 200
- Performance: adding a reconciliation simulation increases layout computation time
- May require multiple rounds of parameter adjustment after initial implementation

**Verification:**
```
✓ No node-on-node overlaps (repos don't sit on top of each other)
✓ Owner groups visually distinct and separated
✓ Central collaboration repos spread out, not piled in center
✓ Repos stay inside the contributor ring boundary
✓ Layout looks reasonable across different datasets/filter states
✓ Rebuild after filtering still produces even spacing
✓ Performance: layout completes in <2 seconds for current dataset
```

**Status:** 🔴 Needs further design iteration and visual tuning

---

## Longer-Term Enhancements

### Additional Metrics 📊 Planned

**What:** Expand data collection beyond raw commits to provide richer insights
- Weekly commit heatmaps and contributor activity timelines
- Code frequency (additions/deletions over time)
- PR count and merge rates
- Per-contributor PR/issue counts
- Review participation

**Value:** Very High - Enables temporal visualizations and highlights quality contributions beyond commit counts

**Implementation:** See `DATA_EXPANSION_PLAN.md` Phases 3-4

**Effort:** 2-4 days

---

### Advanced Health Metrics 📈 Planned

**What:** Health and impact metrics for deeper project insights
- Release frequency
- Issue response time
- Documentation scores
- Cross-repo contributor presence

**Value:** Medium-High - Polish and deeper insights

**Implementation:** See `DATA_EXPANSION_PLAN.md` Phase 5

**Effort:** 2-3 days

---

### Mobile Responsiveness 📱 Future

**What:** Optimize for small screens and touch interaction

**Current:** Desktop-first design, not optimized for mobile

**Why:** People want to share/view on phones

**Approach:**
- Responsive canvas sizing
- Touch event handlers (instead of mouse)
- Simplified tooltips for small screens
- Portrait vs landscape support

**Status:** Not started (lower priority)

---

### Export & Sharing 💾 Future

**What:** Users can export the visualization or share filtered views

**Options:**
- Export as PNG/SVG
- Shareable URL with filters preserved
- Embed widget for other sites

**Status:** Not started (lower priority)

---

### Replicable for Other Organizations 🔧 Future

**What:** Make the tool easy to fork, configure, and deploy for any organization's open-source portfolio

- Configurable branding (colors, logos, typography)
- Organization-agnostic data pipeline (minimal config to point at a different org)
- Streamlined setup for new deployments
- Clear documentation for customization and deployment
- Potential packaging as a reusable template or library

**Status:** Not started

---

## How to Contribute

**Want to work on a feature?**

1. Read this document for the overview
2. Check `DEVELOPMENT_GUIDE.md` for detailed instructions on how to contribute
3. Read `ARCHITECTURE.md` to understand the codebase
4. Reference the verification criteria when testing

**Found a bug or have an idea?**

Open an issue on GitHub with:
- What you observed
- What you expected
- Steps to reproduce
- Suggested fix (if you have one)

---

**Last Updated**: February 2026
