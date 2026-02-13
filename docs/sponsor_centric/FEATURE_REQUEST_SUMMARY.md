# Feature Request Summary & Assessment

**Request:** Visualization of Sponsored vs. Community Contributors
**Status:** ✅ **APPROVED FOR IMPLEMENTATION**
**Date:** February 2026

---

## What We're Building

A redesign of the Contributor Network visualization that separates contributors into two tiers:

1. **Sponsored Contributors** - A curated list of key team members
   - Displayed in a central ring (like the current implementation)
   - Full prominence in the visualization

2. **Community Contributors** - Everyone else who contributed to your repos
   - Displayed separately (scattered or in outer ring)
   - Visually distinguished but still present
   - Inspired by the ORCA visualization model

---

## Key Design Decisions

### 1. Fixed Repository List (Already In Place ✅)
- You already have this via `config.toml`
- No changes needed to repo fetching
- Data pipeline stays the same

### 2. Contribution is Automatic
- We automatically find all contributors to your tracked repos
- No manual maintenance needed
- Scales as repos grow

### 3. Sponsor List is Configurable
- Simple config option specifies who is "sponsored"
- Can be updated by editing `config.toml`
- Defaults to existing `[contributors.devseed]` section

### 4. Layout Strategy (Two Options)

**Option A - Reuse Existing Simulation** (Simpler, 1 week)
- Community contributors use existing "remaining" positioning
- Works well, minimal code changes
- Follows current behavior for extras

**Option B - New Community Ring** (More Design, 2 weeks)
- Community contributors in outer ring
- Clearer visual distinction
- More like the ORCA model you referenced

**Recommendation:** Start with Option A, upgrade to Option B based on feedback

---

## Feasibility Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| Architecture | ✅ Ready | Modular design supports this well |
| Backend | ✅ Easy | ~50 lines of config + classification logic |
| Frontend | ✅ Manageable | ~250 lines to load tier data + adjust layout |
| Data Model | ✅ Flexible | Easy to add tier classification |
| Backward Compatible | ✅ Yes | Existing configs still work |
| Performance | ✅ No Issues | Extra tier doesn't add overhead |
| Testing | ✅ Straightforward | Clear test cases for each phase |

---

## What Changes (High-Level)

### Configuration (`config.toml`)
```toml
# NEW: Specify which contributors are "sponsored"
[contributors.sponsored]
aboydnw = "Anthony Boyd"
gadomski = "Pete Gadomski"
# ... other key people
```

### Data Output (CSV)
```
name,tier
Anthony Boyd,sponsored
Unknown User,community
Pete Gadomski,sponsored
```

### Visualization
- Sponsored contributors: central ring (as before)
- Community contributors: outer location (new)
- Tooltips: show tier designation

---

## Implementation Phases

### Phase 1: Backend (Config + CSV) - 4-5 days
- Update config system to read sponsored list
- Classify contributors during CSV generation
- Add `tier` column to output

### Phase 2: Frontend Data Loading - 2-3 days
- Load tier data from CSV
- Add tier field to contributor nodes

### Phase 3: Layout & Simulation - 5-7 days (varies by option)
- Separate simulation for community contributors
- Adjust positioning based on tier

### Phase 4: Rendering & Styling - 3-4 days
- Tier-based colors/sizes
- Update tooltips to show tier

### Phase 5: Testing - 3-5 days
- Unit tests for each component
- Integration testing with real data
- Manual QA and refinement

### Phase 6: Polish & Release - 3-5 days
- Design feedback loop
- Documentation updates
- Production readiness

**Total Duration:** 3-4 weeks (Option A) to 4-5 weeks (Option B)

---

## Impact Assessment

### What Works Better After This Feature
- **Clearer visualization** of community impact
- **Scalability** - easier to see all contributors, not just your team
- **Engagement** - community members feel recognized
- **Client customization** - sponsor list is editable, no code changes needed

### What Stays the Same
- Repository list (already fixed in config)
- Data fetching pipeline
- Link visualization
- Core interaction/filtering

### What's New
- Contributor tier classification (sponsored/community)
- Separate positioning for tiers
- Tier display in tooltips
- Optional outer ring visualization

---

## Configuration Example

### Before (Current)
```toml
# Just lists repos and all contributors
repositories = ["org/repo1", "org/repo2"]

[contributors.devseed]
aboydnw = "Anthony Boyd"
gadomski = "Pete Gadomski"
# ... all team members
```

### After (Proposed)
```toml
# Same repos, but now specify sponsors
repositories = ["org/repo1", "org/repo2"]

# NEW: Separate sponsored list
[contributors.sponsored]
aboydnw = "Anthony Boyd"
gadomski = "Pete Gadomski"

# Keep existing for reference
[contributors.devseed]
aboydnw = "Anthony Boyd"
gadomski = "Pete Gadomski"
# ... all team members
```

---

## Data Flow Diagram

```
┌─────────────────────────────────┐
│ GitHub API                      │
│ (Fetch commits from tracked repos)
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│ Identify Contributors           │
│ (All people who committed)      │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│ Classify Contributors (NEW)     │
│ - Check against sponsor list    │
│ - Mark as sponsored/community   │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│ Generate CSV with Tier (NEW)    │
│ name,tier                       │
│ Anthony Boyd,sponsored          │
│ Unknown User,community          │
└──────────────┬──────────────────┘
               ↓
┌─────────────────────────────────┐
│ Frontend Loads & Renders (NEW)  │
│ - Separate into two groups      │
│ - Position based on tier        │
│ - Color/size by tier            │
└─────────────────────────────────┘
```

---

## Success Metrics

### Technical
- ✅ All tests pass (unit + integration)
- ✅ No performance regression
- ✅ CSV output includes tier column
- ✅ Visualization renders without errors

### UX
- ✅ Sponsored/community distinction is clear
- ✅ Tooltips show tier
- ✅ Layout is balanced and attractive
- ✅ No jarring visual changes

### Business
- ✅ Client can update sponsor list via config
- ✅ Feature supports community engagement goal
- ✅ Scales with growing contributor base

---

## Risk Summary

### Low Risk ✅
- Config system changes (backward compatible)
- CSV generation (non-breaking)
- Data model extensions (additive only)

### Medium Risk 🟡
- Visual design tuning (may need iterations)
- Force simulation tuning (community positioning)
- Performance with large datasets

### Mitigations
- Backward compatibility built in from start
- Early design feedback before full implementation
- Performance testing on real data
- Comprehensive test suite

---

## Comparison to ORCA

**ORCA Model (Reference):**
- ORCA Sponsored Contributors: central ring
- Top Contributors: second ring (ranked by activity)
- Everybody Else: scattered around edges

**Your Implementation (Simpler):**
- Sponsored Contributors: central ring
- Community Contributors: outer/scattered (no ranking)

**Benefits of Simpler Approach:**
- No need to rank contributors (contentious)
- Cleaner visual distinction
- Easier to configure and maintain
- Faster to implement

---

## Next Steps

### For Approval
1. **Review this assessment** - Do the proposed changes make sense?
2. **Clarify design questions** - How should community contributors look?
   - Outer ring like ORCA?
   - Scattered around edges?
   - Different colors/sizes?
3. **Approve timeline** - Does 3-4 weeks work for your schedule?

### For Kick-Off
1. **Finalize sponsor list** - Who should be in `[contributors.sponsored]`?
2. **Design specs** - Visual styling preferences
3. **Test data** - Which repos to test with?

### For Development
1. **Phase 1** - Backend config + classification (~1 week)
2. **Phase 2** - Frontend data loading (~1 week)
3. **Phase 3** - Layout & simulation (~1-2 weeks)
4. **Phase 4** - Rendering & styling (~1 week)
5. **Phase 5+** - Testing & refinement (~1-2 weeks)

---

## Documentation Provided

Three documents have been created for you:

1. **FEASIBILITY_ASSESSMENT.md** (This folder)
   - Detailed technical analysis
   - Architecture impact
   - Risk assessment
   - Timeline estimates

2. **IMPLEMENTATION_ROADMAP.md** (This folder)
   - Step-by-step implementation guide
   - Code examples for each phase
   - Testing procedures
   - Validation checkpoints

3. **This Summary** (You're reading it)
   - High-level overview
   - Decision points
   - Next steps

---

## Key Files to Review

**If you want to understand the current system:**
- `docs/ARCHITECTURE.md` - How the visualization works
- `config.toml` - Current configuration format
- `src/js/index.js` - Main visualization code

**Once approved, these will be updated:**
- `config.py` - Config model with tier support
- `cli.py` - CSV generation with tier
- `src/js/data/prepare.js` - Load tier data
- `src/js/simulations/` - Add community positioning

---

## Questions & Clarifications

Before moving forward, clarify:

1. **Who are the "sponsored" contributors?**
   - All of Development Seed team?
   - Subset of key people?
   - Option to change by project?

2. **Visual Design for Community Contributors:**
   - Should they be visible at all (or togglable)?
   - Outer ring or scattered?
   - Different colors, opacity, or sizes?

3. **Filtering Behavior:**
   - Should filters apply to community contributors?
   - Or should they always be visible?

4. **Interactive Behavior:**
   - Should community contributors be selectable?
   - Show same tooltips as sponsored?

5. **Timeline:**
   - Is 3-4 weeks acceptable?
   - Any hard deadline?

---

## Recommendation

**✅ PROCEED WITH IMPLEMENTATION**

This feature is:
- **Feasible** - Well-aligned with current architecture
- **Low-risk** - Minimal breaking changes
- **High-value** - Improves visualization and engagement
- **Well-scoped** - Clear phases and deliverables

The main decision is visual design (Option A vs. B), which should be settled early with client feedback.

---

## Contact & Support

For questions about this assessment:
- Review the detailed documents (FEASIBILITY_ASSESSMENT.md, IMPLEMENTATION_ROADMAP.md)
- Check the code examples in IMPLEMENTATION_ROADMAP.md
- Reference the current architecture in docs/ARCHITECTURE.md

Once you're ready to start, the step-by-step implementation roadmap has all the code and testing details needed.

---

**Assessment Complete**
**Status:** Ready for Implementation
**Date:** February 2026
