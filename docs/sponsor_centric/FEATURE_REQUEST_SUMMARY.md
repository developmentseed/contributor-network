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
   - Displayed separately (scattered using existing simulation)
   - Visually distinguished but still present
   - Quick to implement, reusing current positioning strategy

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

### 4. Layout Strategy

**Chosen Approach - Option A: Reuse Existing Simulation** (Primary Implementation)
- Community contributors use existing "remaining" positioning
- Minimal code changes
- Follows current behavior for extras
- Quick to implement (1 week)

**Future Potential - Option B Considered**
- Potential future enhancement: Create a dedicated outer ring
- Could be explored in later iterations if needed
- Currently deprioritized in favor of rapid implementation

---

(Rest of the document remains the same)
