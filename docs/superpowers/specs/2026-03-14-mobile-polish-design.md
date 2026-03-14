# Mobile Polish Design

**Date:** 2026-03-14
**Branch:** task/mobile-responsiveness
**Status:** Approved

## Overview

Three targeted improvements to the mobile experience following the initial mobile responsiveness work. Each is independent and ships as its own commit.

## Change 1: Remove Zoom Controls

The on-screen +/reset/− zoom buttons added in the mobile commits are removed. Touch-based pinch-to-zoom and drag-to-pan (provided natively by D3's zoom behavior) remain fully functional.

**Files affected:**
- `index.html` — delete `#zoom-controls` div and its 3 child buttons
- `public/css/style.css` — delete `#zoom-controls`, `#zoom-controls button`, `#zoom-controls button:active` rules (~30 lines)
- `src/interaction/zoom.ts` — delete `getZoomCenter()` helper and the three button `onclick` handlers (lines 65–99); all other zoom logic stays

## Change 2: Fix Filter Panel Flash of Content (FOUC)

The filter panel currently collapses on mobile via a JavaScript init block that runs after page load, causing filters to briefly flash visible before collapsing. The fix moves the initial collapsed state into the HTML so it is correct from first paint.

**Files affected:**
- `index.html` — set `aria-expanded="false"` on `#filter-toggle` and add `class="collapsed"` to `#filter-header`
- `src/main.ts` — delete the JS init block (lines 172–175) that redundantly sets collapsed state at runtime

The toggle event listener logic is unchanged.

## Change 3: Shared Mobile Breakpoint Constant

The value `768` (the mobile breakpoint in pixels) is hardcoded in three separate JS files. Centralizing it reduces the risk of inconsistency if the breakpoint is ever changed.

**Files affected:**
- `src/config/theme.ts` — add `export const MOBILE_BREAKPOINT = 768`
- `src/interaction/zoom.ts` — import and use `MOBILE_BREAKPOINT`
- `src/render/labels.ts` — import and use `MOBILE_BREAKPOINT`
- `src/main.ts` — import and use `MOBILE_BREAKPOINT`

The CSS breakpoint in `public/css/style.css` remains as the raw value `768px`. CSS cannot consume TypeScript constants; keeping them in sync by convention is standard practice.

## Out of Scope

- **`touchmove` hover handler:** Adding a `touchmove` listener to enable tooltip tracking as the finger slides was considered but deferred. The current tap-to-hover behavior is intentional and avoids conflicts with D3's pan gesture.
