# Implementation Roadmap: Tiered Contributor Visualization

**For:** Feature Request - Sponsored vs. Community Contributor Visualization
**Status:** Ready to Start
**Last Updated:** February 2026

---

## Overview

This document provides a step-by-step implementation guide for adding tiered contributor visualization to the Contributor Network project. It's based on the Feasibility Assessment and includes specific code examples, testing approaches, and validation checkpoints.

---

## Phase 1: Backend Configuration & Data Model

### Objective
Enable the system to classify contributors as "sponsored" or "community" and output this classification in the CSV data.

---

### Sprint 1.1: Update Configuration System

#### Task 1.1.1: Modify `config.py`

**File:** `python/contributor_network/config.py`

**Current state:** Config reads `[repositories]` and `[contributors.devseed]`, `[contributors.alumni]`

**Changes needed:**
1. Add optional `sponsored_contributors` field to Config model
2. Provide logic to extract sponsored list from config

**Implementation:**

```python
from pydantic import BaseModel, Field

class Config(BaseModel):
    """Project configuration from config.toml"""
    title: str
    author: str
    description: str
    organization_name: str
    repositories: list[str]
    contributors: dict[str, dict[str, str]]  # Existing: { "devseed": {...}, "alumni": {...} }
    # NEW FIELD:
    sponsored_contributor_group: str = Field(
        default="devseed",
        description="Which contributor group to use as 'sponsored' (e.g., 'devseed', 'sponsored')"
    )

    def get_sponsored_usernames(self) -> list[str]:
        """Extract list of sponsored contributor usernames.

        Falls back to devseed if specified group doesn't exist.
        """
        group = self.contributors.get(self.sponsored_contributor_group)
        if group is None:
            # Fallback to devseed if not found
            group = self.contributors.get("devseed", {})
        return list(group.keys())
```

**Testing:**
```python
# In python/tests/test_config.py
def test_get_sponsored_usernames():
    config = Config(
        title="Test",
        author="Test",
        description="Test",
        organization_name="Test Org",
        repositories=["org/repo"],
        contributors={
            "devseed": {"user1": "User One", "user2": "User Two"},
            "sponsored": {"user1": "User One"}
        },
        sponsored_contributor_group="sponsored"
    )
    assert config.get_sponsored_usernames() == ["user1"]

def test_sponsored_fallback_to_devseed():
    config = Config(
        title="Test",
        organization_name="Test Org",
        repositories=["org/repo"],
        contributors={"devseed": {"user1": "User One"}},
        sponsored_contributor_group="nonexistent"  # Group doesn't exist
    )
    assert config.get_sponsored_usernames() == ["user1"]  # Falls back to devseed
```

---

#### Task 1.1.2: Update `config.toml`

**File:** `config.toml`

**Current state:**
```toml
[contributors.devseed]
aboydnw = "Anthony Boyd"
gadomski = "Pete Gadomski"
# ... more contributors
```

**Changes needed:**
1. Add optional `[contributors.sponsored]` section (example)
2. Add config field pointing to it

**Implementation:**

```toml
title = "The Development Seed Contributor Network"
author = "Pete Gadomski"
description = "An interactive visualization of contributors to Development Seed code and their connections to other repositories"
organization_name = "Development Seed"

# NEW: Specify which contributor group to treat as "sponsored"
# Options: "devseed", "sponsored", or any group name in [contributors.*]
sponsored_contributor_group = "devseed"

repositories = [
    # ... existing repos
]

# Existing contributors section (used for sponsored if sponsored_contributor_group = "devseed")
[contributors.devseed]
aboydnw = "Anthony Boyd"
gadomski = "Pete Gadomski"
# ... rest of existing contributors

# NEW: Optional separate sponsored group (uncomment to use)
# [contributors.sponsored]
# aboydnw = "Anthony Boyd"
# gadomski = "Pete Gadomski"
# # ... subset of key contributors
```

---

### Sprint 1.2: Add Contributor Tier to Data Model

#### Task 1.2.1: Extend `models.py`

**File:** `python/contributor_network/models.py`

**Current state:** Has `Repository` and `Link` models, but no explicit Contributor model

**Changes needed:**
1. Add `Contributor` model with tier field
2. Or add tier to existing data structures

**Implementation:**

Option A: Add new Contributor model
```python
from enum import Enum

class ContributorTier(str, Enum):
    """Classification of contributor type"""
    SPONSORED = "sponsored"
    COMMUNITY = "community"

class Contributor(BaseModel):
    """A person who contributed to tracked repositories"""
    github_username: str
    display_name: str
    tier: ContributorTier
    total_commits: int = 0
    first_commit_date: datetime.datetime | None = None
    last_commit_date: datetime.datetime | None = None
    repo_count: int = 0  # Number of repos contributed to
```

Option B: Store tier in CSV with simpler structure
```python
# Simple dict for CSV writing
contributor_row = {
    "name": "Anthony Boyd",
    "tier": "sponsored",
    "commit_count": 42,
    "repo_count": 8
}
```

**Recommendation:** Use **Option B** (simpler, less refactoring)

---

### Sprint 1.3: Update CLI to Classify Contributors

#### Task 1.3.1: Modify `csvs` Command in `cli.py`

**File:** `python/contributor_network/cli.py`

**Current state:** `csvs` command reads JSON and generates CSV files

**Changes needed:**
1. Load sponsored contributors list from config
2. Classify each contributor as they're written to CSV
3. Add `tier` column to `contributors.csv`

**Implementation:**

```python
@cli.command()
@click.argument("data_dir", type=click.Path(exists=True))
@click.argument("csv_dir", type=click.Path())
def csvs(data_dir: str, csv_dir: str) -> None:
    """Generate CSV files from JSON data."""
    config = Config.from_toml("config.toml")

    # Load JSON data
    repos_json = json.loads(Path(f"{data_dir}/repositories.json").read_text())
    links_json = json.loads(Path(f"{data_dir}/links.json").read_text())

    # NEW: Get sponsored contributors list
    sponsored_usernames = config.get_sponsored_usernames()

    # Collect unique contributors and classify them
    contributors_map = {}  # {username: {"name": str, "tier": str}}

    for link in links_json:
        username = link["author_name"]
        if username not in contributors_map:
            # Classify contributor
            tier = "sponsored" if username in sponsored_usernames else "community"
            contributors_map[username] = {
                "name": username,  # Could lookup display name from config
                "tier": tier
            }

    # Write contributors.csv with tier column
    csv_path = Path(csv_dir) / "contributors.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["name", "tier"])
        writer.writeheader()
        for contributor in sorted(contributors_map.values(), key=lambda x: x["name"]):
            writer.writerow(contributor)

    # ... rest of CSV generation (repositories, links, etc.)
    click.echo(f"Generated {csv_path}")
```

**Testing:**
```python
# In python/tests/test_cli.py
def test_csvs_includes_tier_column(tmp_path, mock_json_data):
    """Verify csvs command outputs tier column"""
    # Setup
    data_dir = tmp_path / "data"
    csv_dir = tmp_path / "csv"
    data_dir.mkdir()
    csv_dir.mkdir()

    # Create mock data
    (data_dir / "repositories.json").write_text(json.dumps([...]))
    (data_dir / "links.json").write_text(json.dumps([
        {"author_name": "aboydnw", "repo": "org/repo", ...},
        {"author_name": "unknown_user", "repo": "org/repo", ...}
    ]))

    # Run command
    runner = CliRunner()
    result = runner.invoke(csvs, [str(data_dir), str(csv_dir)])
    assert result.exit_code == 0

    # Verify output
    csv_path = csv_dir / "contributors.csv"
    with open(csv_path) as f:
        rows = list(csv.DictReader(f))

    # Check sponsored classification
    aboydnw = [r for r in rows if r["name"] == "aboydnw"][0]
    assert aboydnw["tier"] == "sponsored"

    # Check community classification
    unknown = [r for r in rows if r["name"] == "unknown_user"][0]
    assert unknown["tier"] == "community"
```

---

### Phase 1 Validation Checklist

- [ ] `config.py` accepts `sponsored_contributor_group` field
- [ ] `config.py` provides `get_sponsored_usernames()` method
- [ ] `config.toml` can be parsed without errors
- [ ] `csvs` command generates `contributors.csv` with `tier` column
- [ ] All tests pass: `pytest python/tests/`
- [ ] Sponsored contributors marked as "sponsored"
- [ ] Community contributors marked as "community"
- [ ] CSV format is valid (parseable by JavaScript)

---

## Phase 2: Frontend Data Loading

### Objective
Load the new `tier` field from CSV and add it to contributor node objects in the visualization.

---

### Sprint 2.1: Enhance Data Preparation

#### Task 2.1.1: Update `prepareData()` (extract if needed)

**File:** `src/js/data/prepare.js` (or `src/js/index.js` if not yet extracted)

**Current state:** Reads CSV data, creates node and link objects

**Changes needed:**
1. Load `tier` column from `contributors.csv`
2. Add `tier` field to contributor nodes
3. Optionally: separate into `sponsoredNodes` and `communityNodes` arrays

**Implementation:**

```javascript
/**
 * Load and prepare contributor data
 * @param {Object} csvData - Parsed CSV data { contributors: [...], links: [...], repositories: [...] }
 * @returns {Object} Prepared nodes { sponsoredContributors, communityContributors, repositories, links }
 */
export function prepareContributorTiers(csvData) {
  const { contributors, links } = csvData;

  // Separate contributors by tier
  const sponsoredContributors = contributors
    .filter(c => c.tier === "sponsored")
    .map(c => ({
      id: c.name,
      name: c.name,
      type: "contributor",
      tier: "sponsored",
      isSponsored: true,
      links: []  // Will be populated by link matching
    }));

  const communityContributors = contributors
    .filter(c => c.tier === "community" || !c.tier)  // Default to community if tier missing
    .map(c => ({
      id: c.name,
      name: c.name,
      type: "contributor",
      tier: "community",
      isSponsored: false,
      links: []
    }));

  return {
    sponsoredContributors,
    communityContributors,
    totalContributors: {
      sponsored: sponsoredContributors.length,
      community: communityContributors.length
    }
  };
}

/**
 * Classify a contributor by name
 * @param {string} name - Contributor name/username
 * @param {string[]} sponsoredNames - List of sponsored contributor names
 * @returns {string} "sponsored" or "community"
 */
export function classifyContributor(name, sponsoredNames) {
  return sponsoredNames.includes(name) ? "sponsored" : "community";
}
```

**Testing:**
```javascript
// src/js/__tests__/data/prepare.test.js
import { prepareContributorTiers } from '../../../data/prepare.js';

describe('prepareContributorTiers', () => {
  test('separates sponsored and community contributors', () => {
    const csvData = {
      contributors: [
        { name: "aboydnw", tier: "sponsored" },
        { name: "unknown", tier: "community" }
      ],
      links: [],
      repositories: []
    };

    const result = prepareContributorTiers(csvData);

    expect(result.sponsoredContributors).toHaveLength(1);
    expect(result.sponsoredContributors[0].name).toBe("aboydnw");
    expect(result.communityContributors).toHaveLength(1);
    expect(result.communityContributors[0].name).toBe("unknown");
  });

  test('defaults missing tier to community', () => {
    const csvData = {
      contributors: [
        { name: "user1" }  // No tier field
      ],
      links: [],
      repositories: []
    };

    const result = prepareContributorTiers(csvData);

    expect(result.communityContributors).toHaveLength(1);
    expect(result.communityContributors[0].tier).toBe("community");
  });
});
```

---

### Phase 2 Validation Checklist

- [ ] Data loading includes `tier` column from CSV
- [ ] Contributor nodes have `tier` field populated
- [ ] Tests pass: `npm test`
- [ ] Manual check: Log node data in browser console, verify tier values
- [ ] No console errors when loading visualization

---

## Phase 3: Layout & Simulation

### Objective
Position sponsored and community contributors differently in the visualization.

---

### Sprint 3.1: Design Community Contributor Layout

#### Decision: Which Simulation Strategy?

Before coding, decide between:

**Option A: Reuse Existing "Remaining" Simulation**
- Community contributors use same `remainingSimulation` as extras
- **Pros:** Minimal code changes, 1 week
- **Cons:** Less visual distinction

**Option B: Create New Community Ring Simulation**
- Community contributors in outer ring with repulsion
- **Pros:** Clearer visual distinction, looks like ORCA
- **Cons:** 2 weeks development + tuning

**Recommendation:** Start with **Option A**, upgrade to **Option B** based on feedback.

---

#### Task 3.1.1: Separate Node Groups (Option A)

**File:** `src/js/data/prepare.js` or `src/js/index.js`

**Changes:**
1. Create two separate arrays: `sponsoredNodes`, `communityNodes`
2. Run contributor ring simulation on sponsored only
3. Run remaining simulation on community

**Implementation:**

```javascript
// In main visualization setup
async function initializeVisualization() {
  const data = await loadData();
  const { sponsoredContributors, communityContributors, repositories, links } =
    prepareContributorTiers(data);

  // Create node arrays
  const allNodes = [];
  const nodeMap = new Map();

  // Add sponsored contributors (ring)
  sponsoredContributors.forEach((contributor, index) => {
    const node = {
      ...contributor,
      index: allNodes.length,
      x: Math.cos((index / sponsoredContributors.length) * 2 * Math.PI) * RING_RADIUS,
      y: Math.sin((index / sponsoredContributors.length) * 2 * Math.PI) * RING_RADIUS
    };
    allNodes.push(node);
    nodeMap.set(contributor.id, node);
  });

  // Add community contributors (to be positioned by simulation)
  communityContributors.forEach(contributor => {
    const node = {
      ...contributor,
      index: allNodes.length,
      x: Math.random() * 200 - 100,  // Random position, will be adjusted
      y: Math.random() * 200 - 100
    };
    allNodes.push(node);
    nodeMap.set(contributor.id, node);
  });

  // Add repositories
  repositories.forEach(repo => {
    const node = {
      ...repo,
      index: allNodes.length,
      x: 0,
      y: 0
    };
    allNodes.push(node);
    nodeMap.set(repo.id, node);
  });

  // Run simulations
  const sponsoredSimulation = runContributorRingSimulation(
    allNodes.filter(n => n.tier === "sponsored")
  );

  const communitySimulation = runRemainingSimulation(
    allNodes.filter(n => n.tier === "community"),
    repositories
  );

  // Store for rendering
  return { allNodes, nodeMap, links, simulations: [sponsoredSimulation, communitySimulation] };
}
```

---

#### Task 3.1.2: Create Community Ring Simulation (Option B)

**File:** `src/js/simulations/communitySimulation.js` (NEW)

**Purpose:** Position community contributors in outer ring with visual separation

**Implementation:**

```javascript
import * as d3 from 'd3';

/**
 * Run force simulation for community contributors
 * Places them in outer ring, separated from sponsored contributors and repos
 *
 * @param {Array} communityNodes - Community contributor nodes
 * @param {number} radius - Distance from center (further than sponsored ring)
 * @returns {d3.Simulation}
 */
export function runCommunitySimulation(communityNodes, radius = 400) {
  if (communityNodes.length === 0) return null;

  const simulation = d3.forceSimulation(communityNodes)
    .force('radial', d3.forceRadial(node => {
      // Pull community contributors toward outer ring
      return radius;
    }).strength(0.5))
    .force('collide', d3.forceCollide(40))  // Prevent overlap
    .force('charge', d3.forceManyBody().strength(-50))  // Gentle repulsion
    .stop();

  // Run simulation to stable state
  for (let i = 0; i < 300; i++) {
    simulation.tick();
  }

  return simulation;
}
```

**Configuration in theme:**
```javascript
// src/js/config/theme.js
export const LAYOUT = {
  // ... existing
  COMMUNITY_RING_RADIUS: 400,  // Further from center than sponsored ring (e.g., 150-200)
  COMMUNITY_NODE_RADIUS: 35    // Slightly smaller than sponsored nodes
};
```

---

### Phase 3 Validation Checklist

- [ ] Sponsored contributors render in ring (unchanged from current)
- [ ] Community contributors render in separate location
- [ ] No overlap between nodes
- [ ] Force simulations are stable (not jumping around)
- [ ] Performance is acceptable (60fps on average machine)
- [ ] Manual inspection: Load visualization, inspect node positions in console

---

## Phase 4: Rendering & Styling

### Objective
Make visual distinction between sponsored and community contributors clear and attractive.

---

### Sprint 4.1: Tier-Based Node Styling

#### Task 4.1.1: Update `shapes.js`

**File:** `src/js/render/shapes.js`

**Changes:**
1. Add tier-based color scheme
2. Optionally: different node sizes based on tier

**Implementation:**

```javascript
/**
 * Get node color based on tier and other properties
 * @param {Object} node - Node object with tier, organization, etc.
 * @returns {string} RGB/hex color
 */
export function getNodeColor(node) {
  if (node.type === 'contributor') {
    if (node.tier === 'sponsored') {
      // Use existing color scheme for sponsored
      return getContributorColor(node);
    } else {
      // Community contributors: slightly muted
      const baseColor = getContributorColor(node);
      return adjustColorOpacity(baseColor, 0.7);  // 70% opacity
    }
  }

  // Repositories and other nodes unchanged
  return getRepositoryColor(node);
}

/**
 * Get node radius based on tier and commit count
 * @param {Object} node - Node object
 * @returns {number} Radius in pixels
 */
export function getNodeRadius(node) {
  if (node.type !== 'contributor') {
    return RADIUS.REPO;
  }

  // Scale by contribution count
  const baseRadius = node.tier === 'sponsored'
    ? RADIUS.CONTRIBUTOR
    : RADIUS.CONTRIBUTOR * 0.85;  // Community slightly smaller

  return baseRadius * getContributionScale(node.totalCommits);
}
```

**Update theme colors:**
```javascript
// src/js/config/theme.js
export const COLORS = {
  // ... existing
  COMMUNITY_CONTRIBUTOR_OPACITY: 0.7,
  COMMUNITY_NODE_STROKE: '#999999'
};
```

---

#### Task 4.1.2: Update Tooltip Display

**File:** `src/js/render/tooltip.js`

**Changes:**
1. Show tier in tooltip
2. Different styling for community contributors

**Implementation:**

```javascript
/**
 * Create tooltip content for a node
 * @param {Object} node - Node object
 * @returns {string} HTML for tooltip
 */
export function createTooltipContent(node) {
  if (node.type === 'contributor') {
    const tierBadge = node.tier === 'sponsored'
      ? '<span class="tier-badge sponsored">Sponsored Contributor</span>'
      : '<span class="tier-badge community">Community Contributor</span>';

    return `
      <div class="tooltip-content">
        <h3>${node.name}</h3>
        ${tierBadge}
        <p>Commits: ${node.totalCommits}</p>
        <p>Repositories: ${node.repoCount}</p>
      </div>
    `;
  }

  // ... rest of tooltip logic
}
```

**CSS styling:**
```css
/* assets/css/style.css (add to existing) */
.tier-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: bold;
  margin: 4px 0;
}

.tier-badge.sponsored {
  background-color: #CF3F02;  /* Grenadier orange */
  color: white;
}

.tier-badge.community {
  background-color: #2E86AB;  /* Aquamarine blue */
  color: white;
}
```

---

### Phase 4 Validation Checklist

- [ ] Sponsored contributors display with primary color scheme
- [ ] Community contributors display with secondary/muted colors
- [ ] Tooltips show correct tier designation
- [ ] Visual distinction is clear but not jarring
- [ ] Node sizes appropriate for both tiers
- [ ] All text renders correctly (no overlaps)

---

## Phase 5: Testing & Validation

### Objective
Ensure the feature works correctly across the entire pipeline.

---

### Sprint 5.1: Comprehensive Testing

#### Task 5.1.1: Unit Tests

```bash
# Backend
pytest python/tests/test_config.py -v
pytest python/tests/test_cli.py::test_csvs_includes_tier_column -v

# Frontend
npm test -- src/js/__tests__/data/prepare.test.js
npm test -- src/js/__tests__/simulations/community.test.js
```

---

#### Task 5.1.2: Integration Testing

**Full pipeline test:**

```bash
# 1. Set up test data
cp config.toml config.test.toml

# 2. Update config to include test repos (fewer = faster)
# Modify config.test.toml to test with just 2-3 repos

# 3. Fetch data
export GITHUB_TOKEN="..."
uv run contributor-network data --config config.test.toml

# 4. Generate CSVs
uv run contributor-network csvs assets/data assets/csv

# 5. Verify CSV format
head -5 assets/csv/contributors.csv
# Should see: name,tier

# 6. Build site
uv run contributor-network build assets/csv dist

# 7. Check generated files
ls -la assets/csv/contributors.csv
grep "sponsored\|community" assets/csv/contributors.csv | head -5

# 8. Open in browser
python -m http.server 8000
# Visit http://localhost:8000/index.html
```

---

#### Task 5.1.3: Manual Testing Checklist

**Visual Inspection:**
- [ ] Visualization loads without errors (check console)
- [ ] Sponsored contributors appear in central ring
- [ ] Community contributors appear in different location
- [ ] Node colors are appropriate
- [ ] Links render correctly (from both tiers)
- [ ] Hover tooltips show tier
- [ ] Click tooltips show all details

**Performance:**
- [ ] Smooth animation on hover (no lag)
- [ ] Panning/zooming responsive
- [ ] 60fps maintained during interaction
- [ ] Initial load < 2 seconds

**Data Accuracy:**
- [ ] Sponsored contributors match config
- [ ] Community count = total - sponsored
- [ ] All contributors from tracked repos appear
- [ ] No duplicate contributors
- [ ] All links present

---

### Phase 5 Validation Checklist

- [ ] All unit tests pass
- [ ] Integration test completes without errors
- [ ] CSV output is valid and readable
- [ ] Visualization renders correctly in browser
- [ ] Console has no errors/warnings
- [ ] Sponsored/community distinction is clear
- [ ] Performance is acceptable

---

## Phase 6: Refinement & Polish

### Objective
Gather feedback and make final adjustments for production readiness.

---

### Sprint 6.1: Design Feedback

**Review items:**
1. Are community contributors too faded/invisible?
2. Should there be labels for community contributors?
3. Is the outer ring position the best choice?
4. Should community contributors be interactive?

**Potential refinements:**
- Adjust colors/opacity based on feedback
- Add optional community contributor labels
- Explore alternative positioning (scatter vs. ring)
- Add filtering option (show/hide community)

---

### Sprint 6.2: Documentation

**Update docs:**
1. Update `ARCHITECTURE.md` with new simulation type
2. Add section to `DEVELOPMENT_GUIDE.md` explaining tier system
3. Document config options in `PRD.md`

---

### Sprint 6.3: Production Release Prep

**Before deploy:**
- [ ] All tests pass in CI
- [ ] Code review completed
- [ ] Performance benchmarked (no regression)
- [ ] Accessibility checked (color contrast, etc.)
- [ ] Backward compatibility verified
- [ ] Update `CHANGELOG.md`
- [ ] Tag release version

---

## Success Criteria (Final)

### Functional Requirements
- ✅ Configuration system supports sponsored contributor list
- ✅ CSV output includes tier classification
- ✅ Frontend loads and displays tier data
- ✅ Visualization positions contributors based on tier
- ✅ Tooltips show contributor tier

### Quality Requirements
- ✅ All tests pass (unit + integration)
- ✅ No console errors
- ✅ 60fps performance maintained
- ✅ Backward compatible with existing configs
- ✅ Code documented and maintainable

### User Experience Requirements
- ✅ Sponsored contributors clearly distinguished from community
- ✅ Visualization remains fast and responsive
- ✅ Data is accurate and complete
- ✅ Tooltips provide helpful information

---

## Risk Mitigation

### Risk: Performance Degradation
- **Mitigation:** Profile before/after, ensure force simulations run at 60fps
- **Monitoring:** Use DevTools performance tab, test with 100+ contributors

### Risk: Incorrect Contributor Classification
- **Mitigation:** Add comprehensive tests, manual verification
- **Monitoring:** Export CSV and spot-check classified contributors

### Risk: Design Doesn't Meet Expectations
- **Mitigation:** Get design approval before Phase 3-4
- **Monitoring:** Show wireframes/mockups early

### Risk: Data Pipeline Breaks
- **Mitigation:** Backward compatibility in config parsing
- **Monitoring:** Test with multiple config formats

---

## Timeline

| Phase | Sprint | Duration | Effort |
|-------|--------|----------|---------|
| 1 | 1.1-1.3 | 4-5 days | 2 dev days |
| 2 | 2.1 | 2-3 days | 1 dev day |
| 3 | 3.1 (Option A) | 3-4 days | 1-2 dev days |
| 3 | 3.1 (Option B) | 5-7 days | 3-4 dev days |
| 4 | 4.1-4.2 | 3-4 days | 1-2 dev days |
| 5 | 5.1-5.3 | 3-5 days | 1-2 dev days |
| 6 | 6.1-6.3 | 3-5 days | 1-2 dev days |
| **TOTAL (Option A)** | | **3-4 weeks** | **8-14 dev days** |
| **TOTAL (Option B)** | | **4-5 weeks** | **12-18 dev days** |

---

## Appendix: Command Reference

### Run Full Data Pipeline
```bash
# Fetch from GitHub
export GITHUB_TOKEN="..."
uv run contributor-network data

# Generate CSVs with tier classification
uv run contributor-network csvs assets/data assets/csv

# Build visualization
uv run contributor-network build assets/csv dist

# Serve locally
python -m http.server 8000
# Open http://localhost:8000
```

### Run Tests
```bash
# Python tests
pytest python/tests/ -v
pytest python/tests/test_config.py::test_get_sponsored_usernames -v

# JavaScript tests
npm test
npm test -- --watch
```

### Debug Visualization
```javascript
// In browser console:
window.DEBUG_CONTRIBUTOR_NETWORK = true;
// Look for debug logs in console

// Inspect node data:
console.log(window.vizData.nodes);

// Check tier classification:
window.vizData.nodes.filter(n => n.type === 'contributor').map(n => ({ name: n.name, tier: n.tier }))
```

---

**Last Updated:** February 2026
**Status:** Ready to Implement
