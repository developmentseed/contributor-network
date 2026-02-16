# Bug Analysis: Hover/Click Hit Detection Offset After Filter Removal

## Summary
When applying and then removing a filter, the hover/click interactive zones for contributor nodes become offset from their visual positions. This is a **scale factor (SF) synchronization issue** between node positioning and hit detection.

## Root Cause

The bug occurs due to a race condition in the `rebuild()` function where the scale factor (`SF`) may change between when contributor nodes are positioned and when the Delaunay triangulation is created for hit detection.

### The Problem Flow

1. **Filter is applied** → fewer contributors visible
   - `positionContributorNodes()` positions contributors with initial SF
   - `RADIUS_CONTRIBUTOR` is calculated for the filtered set
   - `resize()` is called and calculates SF based on:
     ```javascript
     let OUTER_RING = RADIUS_CONTRIBUTOR + (CONTRIBUTOR_RING_WIDTH / 2) * 2;
     if (state.WIDTH / 2 < OUTER_RING * state.SF) {
       state.SF = state.WIDTH / (2 * OUTER_RING);  // May REDUCE SF
     }
     ```
   - Delaunay is created from positioned nodes with this SF value
   - **Hover works correctly** ✓

2. **Filter is removed** → all contributors visible again
   - `rebuild()` is called
   - `positionContributorNodes()` positions ALL contributors (larger set)
   - New `RADIUS_CONTRIBUTOR` is calculated (likely larger)
   - **But**: nodes are positioned using the OLD SF value from step 1
   - `setupHover()` is called BEFORE `resize()` - it captures the current config with OLD SF
   - `resize()` is called and recalculates SF:
     - With MORE contributors, `OUTER_RING` becomes larger
     - This might cause SF to be adjusted DIFFERENTLY than before
     - **New Delaunay is created with adjusted node positions, but setupHover still has old SF config**
   - **Hover fails** - the hit detection zone is offset from the visual position ✗

### Why Only Contributor Nodes Are Affected

- Contributor nodes have their positions directly calculated by `positionContributorNodes()`
- Their radius (`RADIUS_CONTRIBUTOR`) directly affects the `OUTER_RING` calculation
- Org/repo nodes are positioned by force simulations, which are less sensitive to the overall scale

## The Specific Code Issue

**File:** `js/chart.js`, lines 1359-1364

```javascript
// Line 1359: setupHover() is called HERE
setupHover();
setupClick();
setupZoom();

// Line 1364: resize() is called LATER
chart.resize();
```

**Inside `setupHover()` (line 897-904):**
```javascript
const config = {
  PIXEL_RATIO,
  WIDTH,
  HEIGHT,
  SF,  // ← Captured at this moment
  RADIUS_CONTRIBUTOR,
  CONTRIBUTOR_RING_WIDTH,
  sqrt
};
```

**Inside `resize()` (via handleResize, line 101-104 in resize.js):**
```javascript
state.SF = state.WIDTH / DEFAULT_SIZE;
let OUTER_RING = RADIUS_CONTRIBUTOR + (CONTRIBUTOR_RING_WIDTH / 2) * 2;
if (state.WIDTH / 2 < OUTER_RING * state.SF) {
  state.SF = state.WIDTH / (2 * OUTER_RING);  // May change SF
}
```

The issue: `setupHover()` uses `config` with an OLD SF, but `findNode()` uses this stale SF for coordinate transformation while the Delaunay was created with NEW positions calculated under a DIFFERENT SF.

## Coordinate Transformation Impact

In `js/interaction/findNode.js` (lines 30-38):
```javascript
if (zoomTransform && zoomTransform.k !== 1) {
  const mxDevice = mx * PIXEL_RATIO;
  const myDevice = my * PIXEL_RATIO;
  mx = ((mxDevice - zoomTransform.x * PIXEL_RATIO) / zoomTransform.k - WIDTH / 2) / SF;
  my = ((myDevice - zoomTransform.y * PIXEL_RATIO) / zoomTransform.k - HEIGHT / 2) / SF;
} else {
  mx = (mx * PIXEL_RATIO - WIDTH / 2) / SF;  // ← Uses config.SF from setupHover
  my = (my * PIXEL_RATIO - HEIGHT / 2) / SF;
}
```

If `SF` changed between node positioning and hit detection, these coordinate transformations produce incorrect visualization-space coordinates, causing the offset.

## Solution Options

### Option 1: Recalculate SF Before Positioning (Recommended)
Move the SF calculation to happen BEFORE `positionContributorNodes()`:
- Calculate what the SF WILL BE after resize
- Position contributors based on that SF
- When resize() happens, use the same calculated SF
- Delaunay will be created from correctly-positioned nodes

**Location:** `js/chart.js` in `rebuild()` function

### Option 2: Call setupHover/setupClick After resize()
Swap the order so interaction handlers are set up AFTER resize():
```javascript
// Instead of:
setupHover();  setupClick();  setupZoom();  chart.resize();

// Do this:
chart.resize();  setupHover();  setupClick();  setupZoom();
```
This ensures setupHover() captures the FINAL SF value.

### Option 3: Use Live Config References
Instead of capturing config values in setupHover(), pass the chart object itself and have findNode access config values directly at the time of lookup. This ensures it always uses current values.

## Testing Strategy

To verify the fix:
1. Open the visualization
2. Apply a filter that significantly reduces contributors (e.g., from 20 to 3)
3. Hover over contributor nodes - should work ✓
4. Remove the filter to show all contributors again
5. Hover over contributor nodes - should now work (currently fails) ✓
6. Hover over org/repo nodes - should continue to work ✓
7. Test with multiple filter applications and removals

## Files Involved
- `js/chart.js` - Main rebuild() function, setupHover() function
- `js/layout/resize.js` - handleResize() where SF is calculated
- `js/layout/positioning.js` - positionContributorNodes() positions nodes
- `js/interaction/findNode.js` - Uses SF for coordinate transformation
- `js/interaction/hover.js` - Sets up hover interaction with config
