# Mobile Polish Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove erroneous zoom control buttons, fix a filter panel flash-of-content on mobile, and centralize the repeated `768` mobile breakpoint into a shared constant.

**Architecture:** Three independent, surgical changes — each a separate commit. No new abstractions introduced. Changes are deletions and small modifications to existing files.

**Tech Stack:** TypeScript, D3.js, Vite, Vitest, plain CSS

---

## File Structure

| File | Change |
|------|--------|
| `index.html` | Delete `#zoom-controls` div; set filter panel HTML defaults |
| `public/css/style.css` | Delete `#zoom-controls` CSS rules |
| `src/config/theme.ts` | Add `MOBILE_BREAKPOINT` export |
| `src/interaction/zoom.ts` | Delete button handlers; import `MOBILE_BREAKPOINT` |
| `src/render/labels.ts` | Import and use `MOBILE_BREAKPOINT` |
| `src/main.ts` | Delete JS init block; import and use `MOBILE_BREAKPOINT` |

---

## Chunk 1: Remove Zoom Controls

### Task 1: Delete zoom control HTML and CSS

**Files:**
- Modify: `index.html`
- Modify: `public/css/style.css`

- [ ] **Step 1: Delete the `#zoom-controls` div from `index.html`**

  Remove lines 81–85 (the entire `<div id="zoom-controls">` block with its 3 child buttons):

  ```html
  <!-- DELETE THIS BLOCK -->
  <div id="zoom-controls">
      <button id="zoom-in" aria-label="Zoom in">+</button>
      <button id="zoom-reset" aria-label="Reset zoom">&#8634;</button>
      <button id="zoom-out" aria-label="Zoom out">&minus;</button>
  </div>
  ```

- [ ] **Step 2: Delete the `#zoom-controls` CSS rules from `public/css/style.css`**

  Remove the three rule blocks (~lines 377–406):

  ```css
  /* DELETE THESE BLOCKS */
  #zoom-controls { ... }
  #zoom-controls button { ... }
  #zoom-controls button:active { ... }
  ```

- [ ] **Step 3: Verify no broken references**

  Run:
  ```bash
  grep -r "zoom-controls\|zoom-in\|zoom-out\|zoom-reset" index.html public/css/style.css
  ```
  Expected: no output.

- [ ] **Step 4: Commit**

  ```bash
  git add index.html public/css/style.css
  git commit -m "fix: remove zoom control buttons from mobile UI"
  ```

---

### Task 2: Delete zoom button handlers from zoom.ts

**Files:**
- Modify: `src/interaction/zoom.ts`

- [ ] **Step 1: Delete `getZoomCenter()` and all three button handler blocks**

  Remove lines 65–99 from `setupZoom()`. The deleted region starts at the `function getZoomCenter()` declaration and ends after the closing brace of the `if (zoomResetBtn)` block. The `return zoomBehavior` on line 101 and closing brace on line 102 stay.

  Before (lines 65–99):
  ```typescript
  function getZoomCenter(): [number, number] {
    const rect = canvasElement!.getBoundingClientRect();
    return [rect.width / 2, rect.height / 2];
  }

  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomResetBtn = document.getElementById('zoom-reset');

  if (zoomInBtn) {
    zoomInBtn.onclick = () => {
      zoomTarget
        .transition()
        .duration(150)
        .call(zoomBehavior.scaleBy as any, 1.2, getZoomCenter());
    };
  }

  if (zoomOutBtn) {
    zoomOutBtn.onclick = () => {
      zoomTarget
        .transition()
        .duration(150)
        .call(zoomBehavior.scaleBy as any, 1 / 1.2, getZoomCenter());
    };
  }

  if (zoomResetBtn) {
    zoomResetBtn.onclick = () => {
      zoomTarget
        .transition()
        .duration(150)
        .call(zoomBehavior.transform as any, d3.zoomIdentity);
    };
  }
  ```

  After deletion, the `setupZoom` function should end with:
  ```typescript
    return zoomBehavior;
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

  Run:
  ```bash
  npm run typecheck
  ```
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/interaction/zoom.ts
  git commit -m "fix: remove zoom button event handlers"
  ```

---

## Chunk 2: Fix Filter Panel FOUC

### Task 3: Set filter panel collapsed state in HTML

**Files:**
- Modify: `index.html`
- Modify: `src/main.ts`

- [ ] **Step 1: Set HTML defaults so filter panel is collapsed from first paint**

  In `index.html`, change `#filter-toggle` and `#filter-header` as follows:

  Before:
  ```html
  <button id="filter-toggle" aria-expanded="true" aria-controls="filter-header">
      Filters <span id="filter-toggle-icon">&#9650;</span>
  </button>
  <div id="filter-header">
  ```

  After:
  ```html
  <button id="filter-toggle" aria-expanded="false" aria-controls="filter-header">
      Filters <span id="filter-toggle-icon">&#9650;</span>
  </button>
  <div id="filter-header" class="collapsed">
  ```

  Note: On desktop, `.collapsed` has no effect — the CSS only applies `collapsed` styles inside the `@media (max-width: 768px)` block. The toggle event listener reads `aria-expanded` to determine current state, so defaulting to `false` also fixes the toggle direction.

- [ ] **Step 2: Delete the JS init block in `src/main.ts`**

  Find the `if (filterToggle && filterHeader)` block (~lines 169–181). Delete only the inner `if (window.innerWidth <= 768)` block (lines 172–175). Keep the outer `if` guard and the `addEventListener` call.

  Before:
  ```typescript
  const filterToggle = document.getElementById("filter-toggle");
  const filterHeader = document.getElementById("filter-header");
  if (filterToggle && filterHeader) {
    if (window.innerWidth <= 768) {
      filterHeader.classList.add("collapsed");
      filterToggle.setAttribute("aria-expanded", "false");
    }
    filterToggle.addEventListener("click", () => {
      const expanded = filterToggle.getAttribute("aria-expanded") === "true";
      filterToggle.setAttribute("aria-expanded", String(!expanded));
      filterHeader.classList.toggle("collapsed", expanded);
    });
  }
  ```

  After:
  ```typescript
  const filterToggle = document.getElementById("filter-toggle");
  const filterHeader = document.getElementById("filter-header");
  if (filterToggle && filterHeader) {
    filterToggle.addEventListener("click", () => {
      const expanded = filterToggle.getAttribute("aria-expanded") === "true";
      filterToggle.setAttribute("aria-expanded", String(!expanded));
      filterHeader.classList.toggle("collapsed", expanded);
    });
  }
  ```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

  Run:
  ```bash
  npm run typecheck
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add index.html src/main.ts
  git commit -m "fix: default filter panel to collapsed state in HTML to prevent FOUC"
  ```

---

## Chunk 3: Shared Mobile Breakpoint Constant

### Task 4: Add constant and update all consumers

**Files:**
- Modify: `src/config/theme.ts`
- Modify: `src/interaction/zoom.ts`
- Modify: `src/render/labels.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Add `MOBILE_BREAKPOINT` to `src/config/theme.ts`**

  Add at the top of the file (before the first interface declaration):

  ```typescript
  export const MOBILE_BREAKPOINT = 768;
  ```

- [ ] **Step 2: Update `src/interaction/zoom.ts`**

  Add import at the top:
  ```typescript
  import { MOBILE_BREAKPOINT } from '../config/theme';
  ```

  Replace the hardcoded value on line 28:
  ```typescript
  // Before
  const isMobile = window.innerWidth <= 768;

  // After
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  ```

- [ ] **Step 3: Update `src/render/labels.ts`**

  Add import at the top:
  ```typescript
  import { MOBILE_BREAKPOINT } from '../config/theme';
  ```

  Replace the hardcoded value on line 29:
  ```typescript
  // Before
  if ((d.type === 'repo' || d.type === 'owner') && window.innerWidth <= 768) {

  // After
  if ((d.type === 'repo' || d.type === 'owner') && window.innerWidth <= MOBILE_BREAKPOINT) {
  ```

- [ ] **Step 4: Update `src/main.ts`**

  Add import at the top (alongside the existing d3 import):
  ```typescript
  import { MOBILE_BREAKPOINT } from './config/theme';
  ```

  Note: After Task 3 above, `main.ts` no longer references `768` directly — the init block was deleted. Verify with:
  ```bash
  grep "768" src/main.ts
  ```
  Expected: no output. If a reference remains, replace it with `MOBILE_BREAKPOINT`.

- [ ] **Step 5: Verify TypeScript compiles cleanly**

  Run:
  ```bash
  npm run typecheck
  ```
  Expected: no errors.

- [ ] **Step 6: Verify no remaining raw `768` in TS source**

  Run:
  ```bash
  grep -r "768" src/
  ```
  Expected: no output.

- [ ] **Step 7: Run tests**

  Run:
  ```bash
  npm test
  ```
  Expected: all tests pass.

- [ ] **Step 8: Commit**

  ```bash
  git add src/config/theme.ts src/interaction/zoom.ts src/render/labels.ts src/main.ts
  git commit -m "refactor: centralize mobile breakpoint into MOBILE_BREAKPOINT constant"
  ```
