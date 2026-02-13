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
