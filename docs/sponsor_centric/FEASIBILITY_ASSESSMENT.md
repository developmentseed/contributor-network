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

(Most of the document remains the same, but with the following changes in key sections)

### Decision 2: One Ring or Two?

**Options:**
- A) Sponsored in ring, community scattered (using existing simulation) ✅ **CHOSEN**
- B) Sponsored in inner ring, community in outer ring
- C) Sponsored prominent (larger), community faded

**Reasoning:**
- **Option A** leverages existing "remaining" simulation
- Minimal code changes required
- Follows current behavior for extra contributors
- Quick to implement with current architecture
- Provides clear visual distinction between sponsored and community contributors

### Development Strategy: Option A (Existing Simulation)

**Primary Implementation Approach:**
- Reuse existing `remainingSimulation.js`
- Position sponsored contributors in central ring
- Scatter community contributors using existing logic
- Minimal modifications to current visualization code

**Benefits:**
- Fastest path to implementation (1 week)
- Low risk of introducing new bugs
- Maintains current performance characteristics
- Easy to iterate and improve in future versions

**Future Potential:**
- If client wants more refined positioning, can upgrade to Option B later
- Current approach provides a solid, functional first iteration

(Rest of the document remains the same)
