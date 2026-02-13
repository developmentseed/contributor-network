# Feasibility Assessment: Contributor Network Visualization Redesign

**Date:** February 2026
**Requested By:** Client Feature Request
**Assessment Author:** Claude

---

## Executive Summary

**Status:** ✅ **HIGHLY FEASIBLE**

The proposed redesign—shifting from a search-based model to a fixed repository list with tiered contributor visualization (inspired by ORCA)—is well-aligned with the current architecture and achievable with moderate effort.

**Key Findings:**
- Current data pipeline already supports a fixed repository list (via `config.toml`)
- Visualization architecture is modular and flexible enough to accommodate a new layout strategy
- Data model supports contributor classification (sponsored vs. community)
- Primary changes are **isolated to Python backend and JavaScript layout/rendering layers**

**Estimated Scope:** 3-4 weeks of development
**Risk Level:** Low to Medium
**Technical Debt Impact:** Minimal (improves code organization)

---

## Current State Analysis

### What Works in Your Favor

1. **Fixed Repository List Already in Place**
   - `config.toml` defines exactly which repositories to track
   - Python backend (`client.py`, `cli.py`) already fetches only these repos
   - No changes needed to data fetching logic

2. **Flexible Data Models**
   - `Repository` model stores all needed metadata
   - `Link` model tracks contributor-to-repo relationships
   - Easy to add contributor classification (sponsored/community)

3. **Modular JavaScript Architecture**
   - Data preparation is being extracted (`prepareData()`)
   - Force simulations are modular (can add new simulation types)
   - Render pipeline supports multiple visualization strategies
   - State management is clean and isolated

4. **Clear Separation of Concerns**
   - Python: Data fetching, validation, CSV generation
   - JavaScript: Visualization, interaction, rendering
   - No tight coupling between layers

### Current Constraints

1. **Visualization Assumes All Contributors Are "Sponsored"**
   - Current layout places all contributors in a fixed ring
   - No concept of "community contributors" vs "sponsored contributors"
   - Links from all contributors treated equally

2. **Force Simulations Built for Current Model**
   - 4 existing simulations: owner, contributor, collaboration, remaining
   - "Remaining" simulation places extra contributors in outer ring
   - This is actually close to what you need for community contributors!

3. **Configuration System**
   - Only supports one contributor list: `[contributors.devseed]`
   - Would need to add a new section for "sponsored contributors"
   - Requires minor refactoring of `config.py`

---

## Proposed Implementation Model

### Overview

```
BEFORE (Current):
┌─────────────────────┐
│  Fixed Repo List    │
│  (config.toml)      │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Fetch All Commits  │
│  From These Repos   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  ALL Contributors   │
│  in Ring (Circular) │
└─────────────────────┘


AFTER (Proposed):
┌──────────────────────────────────────┐
│  Fixed Repo List  +  Sponsored List  │
│  (config.toml)                       │
└──────────────────┬───────────────────┘
                   ↓
┌──────────────────────────────────────┐
│  Fetch Commits From Fixed Repos      │
│  (unchanged)                         │
└──────────────────┬───────────────────┘
                   ↓
       ┌───────────┴───────────┐
       ↓                       ↓
┌──────────────────┐  ┌─────────────────┐
│  Sponsored Contribs  │  Community Contribs │
│  (Ring Layout)       │  (Scattered Layout) │
└──────────────────┘  └─────────────────┘
```

### New Data Structure

#### 1. Configuration (`config.toml`)

Add a new section for sponsored contributors (can reference existing `[contributors.devseed]` or create a new one):

```toml
# Repositories to track (unchanged)
repositories = [
    "developmentseed/titiler",
    "developmentseed/lonboard",
    # ... rest of repos
]

# NEW: Define which contributors are "sponsored" (vs. community)
[contributors.sponsored]
# These are the people you want to highlight
aboydnw = "Anthony Boyd"
gadomski = "Pete Gadomski"
# ... other sponsored contributors

# Existing section (can be repurposed or kept for reference)
[contributors.devseed]
aboydnw = "Anthony Boyd"
# ... all devseed members
```

#### 2. Config Model Enhancement (`config.py`)

Add support for reading sponsored contributors list:

```python
class Config(BaseModel):
    organization_name: str
    repositories: list[str]
    contributors: dict[str, dict[str, str]]  # existing structure
    # Could add:
    # sponsored_contributors: list[str]  # GitHub usernames
```

#### 3. CSV Output Enhancement

Add a `contributor_tier` column to `contributors.csv`:

```csv
name,tier
Anthony Boyd,sponsored
Unknown Contributor,community
Pete Gadomski,sponsored
```

This allows the frontend to classify contributors without additional data fetching.

---

## Implementation Steps

### Phase 1: Backend (Python) - 1-2 weeks

**Goal:** Classify contributors as sponsored or community, output classification in CSV.

#### Step 1.1: Update Config Model
- Add `sponsored_contributors` field to `Config` class in `config.py`
- Update `config.toml` parser to read new `[contributors.sponsored]` section
- Maintain backward compatibility with existing configs

**Files to modify:**
- `python/contributor_network/config.py` (+20 lines)
- `config.toml` (+8 lines)

**Tests to add:**
- Test parsing of new config section
- Test handling of missing sponsored section (fallback)

#### Step 1.2: Classify Contributors During Data Processing
- In `cli.py`, after fetching contributor data, classify each as:
  - ✅ `sponsored` if in `[contributors.sponsored]` list
  - ⚠️ `community` if not sponsored but contributed to tracked repos

**Files to modify:**
- `python/contributor_network/cli.py` (+15 lines in csvs command)
- `python/contributor_network/models.py` (add tier field to Contributor model, +5 lines)

**New function:**
```python
def classify_contributors(contributors: list[str], sponsored_list: list[str]) -> dict[str, str]:
    """Return dict mapping contributor name → tier (sponsored/community)"""
    return {
        name: "sponsored" if name in sponsored_list else "community"
        for name in contributors
    }
```

#### Step 1.3: Update CSV Generation
- Modify `csvs` command to include `tier` column in output

**Files to modify:**
- `python/contributor_network/cli.py` (+5 lines in csvs command)

**Tests:**
- Verify sponsored contributors are marked correctly
- Verify community contributors are marked correctly
- Verify CSV format is valid

---

### Phase 2: Frontend (JavaScript) - 2-3 weeks

**Goal:** Load tier data and adjust visualization layout/positioning based on contributor tier.

#### Step 2.1: Load Contributor Tier Data
- Modify data loading to read `tier` column from `contributors.csv`
- Store tier info in contributor node objects

**Files to modify:**
- `src/js/data/prepare.js` (extract from index.js if not done, +10 lines)
  - Add tier field to contributor node: `{ id, name, tier, ... }`

**Code pattern:**
```javascript
function prepareContributors(csvData) {
  return csvData.map(row => ({
    id: row.name,
    name: row.name,
    tier: row.tier, // NEW: "sponsored" or "community"
    // ... existing fields
  }));
}
```

#### Step 2.2: Create Community Contributor Layout Strategy
This is the **key visualization change**. You have two options:

**Option A: Use Existing "Remaining" Simulation** (Easier, 1 week)
- Reuse the existing `remainingSimulation.js` for community contributors
- Position sponsored contributors in the ring (as now)
- Community contributors positioned scattered around (as now done for extras)
- **Pros:** Minimal code changes, reuses tested simulation
- **Cons:** Less artistic control over community placement

**Option B: Create Custom "Community Ring" Simulation** (More Control, 2 weeks)
- Build new force simulation that:
  - Places community contributors in a **second, outer ring**
  - Creates gentle repulsion between them (no overlap)
  - Maintains some visual coherence while showing they're "different"
- **Pros:** Clear visual distinction, looks like ORCA
- **Cons:** New simulation to test and tune

**Recommendation:** Start with **Option A** (reuse existing), then upgrade to **Option B** if client wants more visual distinction.

**Files to create/modify:**
- Option A: `src/js/data/prepare.js` (+20 lines to separate sponsored/community)
- Option B: `src/js/simulations/communityContributorSimulation.js` (+150 lines)

#### Step 2.3: Separate Nodes by Tier
- Modify `prepareData()` to create two arrays:
  - `sponsoredNodes`: contributors in tier === "sponsored"
  - `communityNodes`: contributors in tier === "community"

**Files to modify:**
- `src/js/data/prepare.js` (+15 lines)

#### Step 2.4: Apply Different Simulations
- Run **contributor ring simulation** on sponsored contributors (existing)
- Run **community simulation** on community contributors (new or reused)

**Files to modify:**
- `src/js/index.js` or simulation orchestrator (~30 lines to manage two simulation groups)

#### Step 2.5: Update Rendering
- Render both groups with visual distinction (optional):
  - Different colors/opacity for community contributors?
  - Different node sizes?
  - Labels only for sponsored, icons for community?

**Files to modify:**
- `src/js/render/shapes.js` (+10 lines to handle tier-based styling)
- `src/js/config/theme.js` (add community contributor colors, +5 lines)

#### Step 2.6: Update Tooltips & Interaction
- Tooltip should show tier: "Community Contributor" vs "Sponsored Contributor"
- Links should still show contribution metrics (unchanged)

**Files to modify:**
- `src/js/render/tooltip.js` (+5 lines to display tier)

---

## Detailed File-by-File Changes

### Backend

| File | Change | Lines |
|------|--------|-------|
| `config.toml` | Add `[contributors.sponsored]` section | +8 |
| `python/contributor_network/config.py` | Add `sponsored_contributors` field | +20 |
| `python/contributor_network/models.py` | Add `tier` field to contributor model | +5 |
| `python/contributor_network/cli.py` | Update `csvs` command to output tier | +15 |
| **Backend Total** | | **~48 lines** |

### Frontend

| File | Change | Lines |
|------|--------|-------|
| `src/js/data/prepare.js` | Separate sponsored/community nodes | +25 |
| `src/js/simulations/communitySimulation.js` | NEW: Community contributor layout | +150 (or 0 if reusing existing) |
| `src/js/config/theme.js` | Add community contributor colors | +5 |
| `src/js/render/shapes.js` | Tier-based node styling | +10 |
| `src/js/render/tooltip.js` | Display tier in tooltip | +5 |
| `src/js/index.js` | Orchestrate two simulation groups | +30 |
| **Frontend Total** | | **~225 lines** |

### Tests

| File | Testing |
|------|---------|
| `python/tests/test_config.py` | Config parsing with new section |
| `python/tests/test_cli.py` | CSV generation includes tier column |
| `src/js/__tests__/data/prepare.test.js` | Contributor classification (new file) |
| `src/js/__tests__/simulations/community.test.js` | Community simulation behavior (new file) |

---

## Migration Path & Backward Compatibility

### Option 1: Graceful Degradation (Recommended)
If `[contributors.sponsored]` section is missing in `config.toml`:
- Treat **all current contributors as sponsored** (maintains current behavior)
- No community contributors shown (or empty set)
- Existing visualizations continue to work

```python
def get_sponsored_contributors(config: Config) -> list[str]:
    # Fallback to [contributors.devseed] if no [contributors.sponsored]
    return config.contributors.get("sponsored", config.contributors.get("devseed", []))
```

### Option 2: Version-Gated Feature
Add feature flag: `use_tiered_contributors: bool` in config
- When `false`: Use old model (all contributors in ring)
- When `true`: Use new model (sponsored vs community)

**Recommendation:** Go with **Option 1** for simplicity. It's backward compatible and requires no flag changes.

---

## Risk Assessment

### Low Risk ✅
- **Data model changes:** Well-isolated, tested with existing test suite
- **Config changes:** Simple new section, backwards compatible
- **CSV generation:** Just adding one column

### Medium Risk 🟡
- **Force simulation tuning:** Community contributor positioning may need tweaking for aesthetics
- **Visual design:** Different look may need polish/refinement
  - What colors for community contributors?
  - Should they be smaller/larger?
  - Labels for community contribs?

### High Risk ❌
- **None identified** — architecture is solid, changes are non-breaking

---

## Testing Strategy

### Backend Testing (Python)
```bash
# 1. Config parsing
pytest python/tests/test_config.py::test_parse_sponsored_contributors

# 2. Contributor classification
pytest python/tests/test_cli.py::test_csvs_includes_tier_column

# 3. CSV format validation
# Verify tier column exists in contributors.csv
# Verify all contributors have a tier value
```

### Frontend Testing (JavaScript)
```bash
# 1. Data preparation
npm test -- src/js/__tests__/data/prepare.test.js

# 2. Simulation
npm test -- src/js/__tests__/simulations/community.test.js

# 3. Manual testing (local)
npm run build
python -m http.server 8000
# Navigate to http://localhost:8000
# Inspect:
# - Are sponsored contributors in the ring?
# - Are community contributors scattered/in outer ring?
# - Do tooltips show correct tier?
# - Do links show correctly from community contribs?
```

### Integration Testing
```bash
# Full pipeline
uv run contributor-network data       # Fetch from GitHub
uv run contributor-network csvs       # Generate CSVs with tiers
uv run contributor-network build assets/data dist  # Build site
# Open dist/index.html and verify visualization
```

---

## Success Criteria

1. ✅ **Configuration:** `config.toml` supports `[contributors.sponsored]` section
2. ✅ **Data:** CSV output includes `tier` column with "sponsored" or "community" values
3. ✅ **Visualization:**
   - Sponsored contributors appear in main ring
   - Community contributors appear in different layout (outer ring or scattered)
4. ✅ **UX:** Tooltips clearly show contributor tier
5. ✅ **Performance:** No regression in load time or interaction smoothness
6. ✅ **Backward Compatibility:** Existing configs still work without modification

---

## Known Unknowns & Questions

1. **Visual Design of Community Contributors**
   - Should they be in a second ring? Scattered?
   - Different colors/sizes?
   - Should they have labels or just be nodes?

2. **Filtering Behavior**
   - Should filters (by org, stars, language) apply to community contributors?
   - Or should community contributors always be visible?

3. **Link Styling**
   - Should links from community contributors look different?
   - Less prominent? Different color gradient?

4. **Mobile Responsiveness**
   - How should community ring render on small screens?
   - Should it collapse or reflow?

**Recommendation:** Implement Phase 1-2 first, then gather feedback on these design questions.

---

## Timeline Estimate

| Phase | Task | Duration | Dependencies |
|-------|------|----------|---|
| 1 | Backend: Config + Classification | 4-5 days | None |
| 2 | Frontend: Data Loading | 2-3 days | Phase 1 |
| 3 | Frontend: Layout/Simulation | 5-7 days | Phase 2 |
| 4 | Frontend: Rendering | 3-4 days | Phase 3 |
| 5 | Testing & Polish | 3-5 days | Phases 1-4 |
| 6 | Feedback & Refinement | 3-5 days | Phase 5 |
| **Total** | | **3-4 weeks** | |

---

## Architectural Decisions & Tradeoffs

### Decision 1: Where to Classify Contributors?

**Options:**
- A) Python (during CSV generation) ✅ **CHOSEN**
- B) JavaScript (during visualization initialization)

**Reasoning:**
- **A** is better because:
  - Classification is deterministic, no need to recalculate in browser
  - Reduces JavaScript complexity
  - Easier to test and debug
  - Data is authoritative at source

### Decision 2: One Ring or Two?

**Options:**
- A) Sponsored in ring, community scattered (like ORCA) ✅ **CHOSEN**
- B) Sponsored in inner ring, community in outer ring
- C) Sponsored prominent (larger), community faded

**Reasoning:**
- **A** follows the ORCA model you referenced
- Visually distinguishes groups while maintaining spatial context
- Easiest to implement (reuses existing "remaining" simulation)

### Decision 3: Backward Compatibility Strategy

**Options:**
- A) Graceful degradation (treat all as sponsored if no tier defined) ✅ **CHOSEN**
- B) Strict version check (fail if tier missing)
- C) Feature flag (new flag in config)

**Reasoning:**
- **A** is safest for existing users
- No migration burden
- Config can be updated at user's pace

---

## Comparison to ORCA Implementation

The original ORCA visualization (which inspired this request) uses:
- **"ORCA Sponsored" ring:** Core team members
- **"Top Contributors" ring:** Most active community members
- **"Everybody Else" scattered:** Other contributors

**Your implementation will be simpler:**
- **Sponsored ring:** Configured list of key contributors
- **Community scattered:** Everyone else who contributed to your repos

**Advantages over ORCA:**
- Smaller, faster dataset (only tracked repos vs. all repos)
- Simpler logic (binary tier vs. three tiers + ranking)
- Easier to configure and maintain

---

## Next Steps

### If You Want to Proceed:

1. **Clarify Design Questions** (1-2 days)
   - How should community contributors look? (colors, sizes, layout)
   - Should they have labels?
   - Any specific positioning preference?

2. **Review Proposed Config Structure** (1 day)
   - Does the `[contributors.sponsored]` section match your needs?
   - Any other metadata to classify contributors?

3. **Kick Off Development** (3-4 weeks)
   - Start with Phase 1 (backend)
   - Then Phase 2-3 (frontend layout)
   - Iterate on design feedback

4. **Gather Client Feedback** (Ongoing)
   - Show wireframes before implementation
   - Iterate on visual design
   - Test with real data

### If You Want to Explore Further:

- **Spike 1:** Prototype community contributor simulation (2-3 days)
  - Build quick proof-of-concept with mock data
  - Test different layout strategies
  - Show client visual options

- **Spike 2:** Test with production data (1-2 days)
  - Run on actual Development Seed repos + contributors
  - Ensure performance is acceptable
  - Validate contributor classification accuracy

---

## Summary

**This feature is highly feasible and aligns well with your architecture.** The main work is:

1. **Backend:** ~50 lines to add contributor classification to config + CSV
2. **Frontend:** ~250 lines to load tier data, adjust layout, and render differently

The modular architecture you've built makes it easy to add a new visualization strategy without touching core data pipelines. Force simulations are already modular, so adding/modifying contributor layout is straightforward.

**Recommendation:** Proceed with implementation. Start with Phase 1 (backend), gather design feedback on visual style, then implement Phase 2-3 (frontend) with clear specs.

---

**Last Updated:** February 2026
**Status:** Ready for Implementation Planning
