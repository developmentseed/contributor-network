# JavaScript Refactoring Progress & Roadmap

Current status of the JavaScript modularization effort.

---

## Overall Progress: 60% Complete ✅

| Metric | Before | Current | Target | Status |
|--------|--------|---------|--------|--------|
| Main file size | 3,400+ lines | 2,059 lines | ~300-400 lines | 🟡 In Progress |
| Modular files | 0 | 29 modules | 29+ modules | ✅ Complete |
| Total modular code | 0 lines | 4,642 lines | ~4,500 lines | ✅ Complete |
| Largest module | N/A | 533 lines (tooltip.js) | <300 lines | 🟡 Needs work |

---

## What's Been Done ✅

### Phase 1: Configuration & Constants
- ✅ `src/js/config/theme.js` - Colors, fonts, layout constants (119 lines)
- ✅ `src/js/config/scales.js` - D3 scale factories (121 lines)
- **Result:** Centralized configuration, easy to customize

### Phase 2: State Management
- ✅ `src/js/state/filterState.js` - Filter state management (67 lines)
- ✅ `src/js/state/interactionState.js` - Hover/click state (106 lines)
- **Result:** Clear separation of state concerns

### Phase 3: Force Simulations
- ✅ `src/js/simulations/ownerSimulation.js` (125 lines)
- ✅ `src/js/simulations/contributorSimulation.js` (132 lines)
- ✅ `src/js/simulations/collaborationSimulation.js` (188 lines)
- ✅ `src/js/simulations/remainingSimulation.js` (84 lines)
- **Result:** 529 lines extracted, easier to test and modify

### Phase 4: Interaction Handlers
- ✅ `src/js/interaction/hover.js` - Mouse hover handling (87 lines)
- ✅ `src/js/interaction/click.js` - Click handling (85 lines)
- ✅ `src/js/interaction/findNode.js` - Node detection via Delaunay (67 lines)
- **Result:** Separated event logic from rendering

### Phase 5: Render Functions
- ✅ `src/js/render/shapes.js` - Shape drawing (277 lines)
- ✅ `src/js/render/text.js` - Text utilities (275 lines)
- ✅ `src/js/render/tooltip.js` - Tooltip rendering (533 lines) ⚠️
- ✅ `src/js/render/labels.js` - Node labels (141 lines)
- ✅ `src/js/render/repoCard.js` - Repo card rendering (248 lines)
- ✅ `src/js/render/canvas.js` - Canvas setup (207 lines)
- **Result:** Rendering logic broken down by component

### Phase 6: Layout & Utilities
- ✅ `src/js/layout/resize.js` - Resize handling (122 lines)
- ✅ `src/js/utils/helpers.js` - Math utilities (121 lines)
- ✅ `src/js/utils/formatters.js` - Date/number formatting (153 lines)
- ✅ `src/js/utils/validation.js` - Data validation (185 lines)
- ✅ `src/js/utils/debug.js` - Debug logging (147 lines)
- **Result:** Utilities organized by concern

### Phase 7: Data Management
- ✅ `src/js/data/filter.js` - Filtering logic (217 lines)
- **Result:** Pure functions for data transformation

---

## What Still Needs Work 🟡

### High Priority

**1. Extract `prepareData()` function** (~515 lines)
- **Location:** Currently in main `index.js`, lines 683-1198
- **Should move to:** `src/js/data/prepare.js`
- **What it does:** Transforms raw CSV data into nodes and links
- **Complexity:** High - depends on many local variables
- **Effort:** 4-6 hours
- **Why important:** Largest single extraction remaining, holds up refactoring

**2. Extract `positionContributorNodes()` function** (~117 lines)
- **Location:** Currently in main `index.js`, lines 1212-1310
- **Should move to:** `src/js/layout/positioning.js`
- **What it does:** Calculates contributor ring positions
- **Complexity:** Medium - clear inputs/outputs
- **Effort:** 2-3 hours
- **Why important:** Separates layout logic from main orchestrator

**3. Simplify `draw()` function** (~166 lines)
- **Location:** Currently in main `index.js`, lines 448-514
- **Should move to:** `src/js/render/draw.js` or keep as thin orchestrator
- **What it does:** Main drawing loop, calls render functions
- **Complexity:** Medium - mostly orchestration
- **Effort:** 2-3 hours
- **Why important:** Main loop should be readable at a glance

### Medium Priority

**4. Extract `drawHoverState()` function** (~130 lines)
- **Location:** Currently in main `index.js`, lines 1538-1668
- **Should move to:** `src/js/render/hoverState.js`
- **Complexity:** Medium
- **Effort:** 2 hours

**5. Extract helper functions** (~100 lines spread across code)
- `isValidContributor()` - Validation helper
- `syncDelaunayVars()` - Delaunay state sync
- `calculateEdgeCenters()` - Link path calculations
- `calculateLinkGradient()` - Gradient colors
- **Should move to:** `src/js/utils/` modules

**6. Remove wrapper functions** (~50 lines)
- Temporary compatibility layer after migration
- Can be removed once main extraction complete

### Lower Priority

**7. Extract canvas setup code** (~60 lines)
- Already partially in `canvas.js`
- Can move remaining setup to initialization module

---

## Detailed Extraction Roadmap

### Step 1: Extract `prepareData()` → `src/js/data/prepare.js`

**What to do:**
1. Create new file `src/js/data/prepare.js`
2. Move `prepareData()` function from main `index.js`
3. Extract helper functions it depends on
4. Import it in main `index.js`
5. Update tests to test the module directly
6. Verify build still works

**Dependencies to handle:**
- Uses colors from `theme.js` (import them)
- Uses scales from `scales.js` (import them)
- Uses validation from `validation.js` (import them)
- Creates objects with specific structure (document in JSDoc)

**Expected after extraction:**
- Main `index.js` shrinks by ~515 lines
- Easier to test data transformation separately
- Clearer data flow from CSV → nodes/links

### Step 2: Extract `positionContributorNodes()` → `src/js/layout/positioning.js`

**What to do:**
1. Create new file `src/js/layout/positioning.js`
2. Move `positionContributorNodes()` function
3. Import from main `index.js`
4. Add unit tests for positioning logic

**Dependencies:**
- Layout constants from `theme.js` (already exported)
- Math utilities from `helpers.js` (import as needed)

**Expected after extraction:**
- Clear separation of layout vs rendering
- Easier to test position calculations
- Could support alternative layout algorithms in future

### Step 3: Simplify `draw()` function

**What to do:**
1. Review current `draw()` - what's orchestration vs. logic?
2. Extract logic into separate modules where applicable
3. Reduce `draw()` to simple: get state → call render functions → schedule next frame
4. Consider creating `src/js/render/draw.js` for orchestration

**Expected after extraction:**
- Main loop readable in 5-10 lines
- Each frame clearly shows: what updates, what renders
- Easier to understand frame-by-frame flow

---

## Module Size Targets

After all extractions, target <300 lines per file:

| File | Current | Target |
|------|---------|--------|
| `src/js/data/prepare.js` | N/A | ~400 lines |
| `src/js/layout/positioning.js` | N/A | ~100 lines |
| `src/js/render/draw.js` | N/A | ~100 lines |
| `src/js/render/hoverState.js` | N/A | ~120 lines |
| Main `index.js` | 2,059 | ~300-400 lines |
| All other modules | Various | <300 lines ✅ |

---

## Testing Strategy

### Current Test Coverage

- 75 tests across extracted modules
- Tests for filtering, validation, formatting, helpers
- Vitest framework

### Testing New Extractions

When extracting new functions:
1. Write unit tests *first* if not already present
2. Test the extracted function in isolation
3. Test integration with dependent modules
4. Run full test suite to ensure no regressions

**Example for `prepareData()`:**
```javascript
// src/js/data/__tests__/prepare.test.js
import { prepareData } from '../prepare.js';

describe('prepareData', () => {
  it('transforms raw data into nodes and links', () => {
    const raw = { /* ... */ };
    const result = prepareData(raw, config);
    expect(result.nodes).toBeDefined();
    expect(result.links).toBeDefined();
  });
});
```

---

## Implementation Timeline

| Task | Effort | Estimated Duration |
|------|--------|-------------------|
| Extract `prepareData()` | High | 4-6 hours |
| Extract `positionContributorNodes()` | Medium | 2-3 hours |
| Simplify `draw()` | Medium | 2-3 hours |
| Extract `drawHoverState()` | Medium | 2 hours |
| Extract helpers & cleanup | Low-Med | 2-3 hours |
| **Total** | **High** | **12-18 hours** |

**Recommended breakdown:**
- Session 1: Extract `prepareData()` (largest impact)
- Session 2: Extract positioning & simplify draw
- Session 3: Polish remaining functions

---

## Migration Checklist

For each extraction, follow this checklist:

- [ ] Create new module file
- [ ] Copy code to new file
- [ ] Identify and resolve dependencies
- [ ] Add JSDoc comments
- [ ] Write or update unit tests
- [ ] Update main `index.js` to import
- [ ] Run full test suite: `npm test`
- [ ] Verify build: `npm run build`
- [ ] Test in browser (visual regression)
- [ ] Commit with clear message

**Commit message template:**
```
refactor(js): Extract [function_name] to [new_module]

- Moved [function_name] from index.js to [new_module]
- Reduces index.js by [X] lines
- Adds [Y] lines to [new_module]
- All tests passing
```

---

## Benefits of Completing This

✅ **Main orchestrator becomes readable** - ~300 lines instead of 2,000+

✅ **Each module has single responsibility** - Easier to understand

✅ **Improved testability** - Can test functions in isolation

✅ **Better git history** - Smaller, focused commits

✅ **Easier code review** - <300 lines per module is reviewable in 10-15 min

✅ **Reduced maintenance burden** - Clearer code, fewer dependencies per file

✅ **Foundation for future work** - Makes adding features easier

---

## How to Track Progress

1. Check the line count in main `index.js`: `wc -l src/js/index.js`
2. Run tests after each extraction: `npm test`
3. Check module sizes: `wc -l src/js/*/`
4. Monitor with git history: `git log --oneline src/js/`

---

## Questions to Ask When Extracting

- **Does this function have a single, clear responsibility?** ✓
- **Can it be tested independently?** (If not, break it down)
- **Does it depend on many external variables?** (If yes, pass as parameters)
- **Is it more than 200 lines?** (If yes, consider breaking further)
- **Will other modules want to use this?** (If yes, export clearly)

---

**Last Updated**: February 2026
