# Visualization Design Guide: Sponsored vs. Community Contributors

**Purpose:** Help you visualize and decide on the design for the tiered contributor visualization
**Status:** Design Decision Document
**Date:** February 2026

---

## Current Visualization (No Tiers)

```
                    All Contributors in Ring

                        USER A (15)

            USER B (8)               USER C (12)

    USER D (6)              [Center]                 USER E (9)

        USER F (20)                                 USER G (4)

            USER H (2)              USER I (18)

                        USER J (7)

        [Repositories with links to all contributors]
```

**Current Behavior:**
- All tracked contributors shown in fixed ring
- Repositories positioned based on force simulation
- Links show commit relationships
- No distinction between different contributor types

---

## Proposed Design Option A: Outer Scattered Layout

Uses existing "remaining" simulation to position community contributors.

```
                    Sponsored in Ring

                        ALICE (15)

            BOB (8)              [SPONSOR]        CHARLIE (12)

    DAVE (6)              [Center]                EVE (9)

        FRANK (20)              [REPOS]          GRACE (4)

            HENRY (2)         [SPONSOR]        IRIS (18)

                        JACK (7)


    [Community scattered around/outside:]

        Unknown1 •    Unknown2 •    Unknown3 •

    Unknown4 •              Unknown5 •


        Unknown6 •    Unknown7 •
```

**Characteristics:**
- Sponsored contributors: Central ring (prominent)
- Community contributors: Scattered around edges (visible but secondary)
- Visual hierarchy: Ring = important, scattered = supporting
- Reference: Current "extra contributors" positioning

**Pros:**
- Minimal code changes (reuse existing simulation)
- Quick to implement (1 week)
- Clear visual hierarchy
- Familiar pattern (already used for extras)

**Cons:**
- Community contributors may feel "random"
- Less organized appearance
- Harder to see all community members at once

---

## Proposed Design Option B: Outer Ring Layout

Creates second ring for community contributors.

```
            ╔═══════════════════════════════════════════════╗
            ║                                               ║
            ║   Unknown3 •     Unknown2 •     Unknown1 •    ║
            ║                                               ║
            ║   Unknown7 •                      Unknown4 •   ║
            ║                                               ║
            ║   Unknown6 •     Unknown5 •                    ║
            ║                                               ║
            ║         COMMUNITY RING (Outer)                ║
            ║                                               ║
            ╚═════════════════════════════════════════════╝

                        ALICE (15)

            BOB (8)              [SPONSOR]        CHARLIE (12)

    DAVE (6)              [Center]                EVE (9)

        FRANK (20)              [REPOS]          GRACE (4)

            HENRY (2)         [SPONSOR]        IRIS (18)

                        JACK (7)

            ╚═════════════════════════════════════════════╝
            ║         SPONSORED RING (Inner)             ║
            ║                                             ║
            ║   Named contributors arranged in circle    ║
            ║                                             ║
            ╚═════════════════════════════════════════════╝
```

**Characteristics:**
- Sponsored contributors: Inner ring (very prominent)
- Community contributors: Outer ring (visible, organized)
- Visual hierarchy: Ring position = importance
- Reference: ORCA visualization model

**Pros:**
- Clear visual distinction (two rings)
- Organized appearance
- Like ORCA model (recognizable pattern)
- Community members still visible/accessible

**Cons:**
- More implementation effort (custom simulation)
- Longer development (2 weeks)
- May feel visually cluttered
- Requires tuning for attractive layout

---

## Color & Style Design

### Sponsored Contributor Styling

```
┌─────────────────────┐
│ Sponsored Contrib   │
│                     │
│      ●●●●●●●●       │  ← Circle node
│      ● Anthony ●    │     (orange, full opacity)
│      ●●●●●●●●       │
│                     │
│  14 commits         │  ← Label
│  5 repositories     │
└─────────────────────┘

Color: Grenadier Orange (#CF3F02) - Your brand color
Size: Default (e.g., 40px radius)
Opacity: 100%
Border: 2px solid darker orange
Label: Visible in ring
```

### Community Contributor Styling

```
┌─────────────────────┐
│ Community Contrib   │
│                     │
│       ○○○○○○○       │  ← Circle node
│       ○ Unknown ○   │     (muted blue, 70% opacity)
│       ○○○○○○○       │
│                     │
│  2 commits          │  ← Label (lighter)
│  1 repository       │
└─────────────────────┘

Color: Aquamarine Blue (#2E86AB) - Secondary brand color
Size: 85% of default (e.g., 34px radius)
Opacity: 70% (muted appearance)
Border: 1px solid lighter blue
Label: Visible but lighter
```

### Comparison Visual

```
Sponsored (Full prominence)    Community (Secondary prominence)

        ●●●●●●●                       ○○○○○○○
       ●  (40px) ●                   ○  (34px) ○
       ●  100%   ●                   ○  70%    ○
        ●●●●●●●                       ○○○○○○○
     Orange                        Blue
     Bold                          Muted
```

---

## Link Styling (From Contributors to Repos)

### Sponsored Contributor Links
```
[SPONSOR] ═══════════════════ [REPO]
  Orange      Bold, Full       Gray/Blue
              Opacity          Color
```

- Start color: Grenadier orange
- Width: Based on commit count (thicker = more commits)
- Opacity: 100% for recent contributions, 70% for old

### Community Contributor Links
```
[COMMUNITY] - - - - - - - - - [REPO]
  Blue        Dashed, 70%     Gray/Blue
              Opacity         Color
```

- Start color: Aquamarine blue (muted)
- Width: Based on commit count
- Opacity: 70% (less prominent)
- Optional: Dashed line to indicate secondary contributor

---

## Tooltip Design

### Sponsored Contributor Tooltip

```
╔════════════════════════════╗
║ Anthony Boyd               ║
║ ┌──────────────────────┐   ║
║ │ SPONSORED CONTRIBUTOR│   ║ ← Orange badge
║ └──────────────────────┘   ║
║                            ║
║ Contributions: 14 commits  ║
║ Repositories: 5            ║
║ First Commit: Jan 2024     ║
║ Last Commit: Feb 2026      ║
╚════════════════════════════╝
```

### Community Contributor Tooltip

```
╔════════════════════════════╗
║ Unknown Contributor        ║
║ ┌──────────────────────┐   ║
║ │ COMMUNITY CONTRIBUTOR│   ║ ← Blue badge
║ └──────────────────────┘   ║
║                            ║
║ Contributions: 2 commits   ║
║ Repositories: 1            ║
║ First Commit: Jun 2024     ║
║ Last Commit: Oct 2025      ║
╚════════════════════════════╝
```

---

## Layout Comparison: Before vs. After

### Before (Current - No Tiers)

```
INPUT:
- List of repos (fixed)
- All contributors to those repos
- No classification

PROCESSING:
- Fetch all commits
- Identify all contributors
- No separation/grouping

OUTPUT:
Users in Ring      [All same visual style]
● User A
● User B
● User C
  [etc - could be 50+ nodes]

[Repos in center, connected to all]

RESULT:
- Can't tell which contributors are important
- Hard to see community impact
- Visual clutter with many users
```

### After (New - With Tiers)

```
INPUT:
- List of repos (fixed)
- All contributors to those repos
- Sponsor list (config)

PROCESSING:
- Fetch all commits
- Identify all contributors
- Classify as sponsored/community

OUTPUT:
Sponsored         Community
(Central Ring)    (Outer Ring)
● Alice           ○ Unknown1
● Bob             ○ Unknown2
● Charlie         ○ Unknown3
[5-10 important]  [30-100 rest]

[Repos connected to both]

RESULT:
- Clear hierarchy (ring position = importance)
- Easier to see community involvement
- Organized appearance
- Sponsored contributors highlighted
```

---

## Decision Matrix

### Option A (Scattered Community)

| Aspect | Rating | Notes |
|--------|--------|-------|
| Visual Clarity | ⭐⭐⭐ | Good - clear hierarchy |
| Implementation | ⭐⭐⭐⭐⭐ | Very easy - reuse existing |
| Development Time | ⭐⭐⭐⭐⭐ | 1 week |
| Aesthetics | ⭐⭐⭐ | Good but less organized |
| ORCA Similarity | ⭐⭐ | Loose reference |
| Community Recognition | ⭐⭐⭐ | Community still visible |
| Scalability | ⭐⭐⭐ | Fine for 50-100 community |

### Option B (Outer Ring)

| Aspect | Rating | Notes |
|--------|--------|-------|
| Visual Clarity | ⭐⭐⭐⭐ | Excellent - two-ring system |
| Implementation | ⭐⭐⭐ | Moderate - custom simulation |
| Development Time | ⭐⭐⭐ | 2 weeks |
| Aesthetics | ⭐⭐⭐⭐⭐ | Beautiful - professional |
| ORCA Similarity | ⭐⭐⭐⭐⭐ | Direct match |
| Community Recognition | ⭐⭐⭐⭐⭐ | Prominent - organized ring |
| Scalability | ⭐⭐⭐⭐ | Better for 100+ community |

---

## Mobile Responsiveness

### Desktop (Current)

```
┌──────────────────────────────────┐
│  Visualization (1200x800)        │
│  ┌──────────────────────────────┐│
│  │  Central ring layout         ││
│  │  Full visualization visible  ││
│  │  All nodes labeled           ││
│  │  Hover tooltips work         ││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │ Filters & Legend             ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘
```

### Tablet (Moderate Screen)

```
┌─────────────────────────┐
│  Visualization (600x500)│
│  ┌───────────────────────┐
│  │ Smaller nodes         │
│  │ Some labels removed   │
│  │ Zoom still works      │
│  └───────────────────────┘
│  ┌───────────────────────┐
│  │ Filters & Legend      │
│  │ (Simplified)          │
│  └───────────────────────┘
└─────────────────────────┘
```

### Mobile (Small Screen)

```
┌────────────┐
│  MOBILE    │
│  (360x640)│
│ ┌────────┐│
│ │ Viz    ││ ← Smaller
│ │(scalable)
│ │ Tap=||
│ │ (no hover)
│ └────────┘│
│ ┌────────┐│
│ │Legend  ││ ← Stacked
│ │Filters ││   Vertical
│ └────────┘│
└────────────┘
```

**Recommendation:** Start with desktop/tablet optimization. Mobile can be Phase 2.

---

## Animation & Interaction

### Hover Behavior

```
User hovers on node:
  1. Node: Slight grow animation (5% larger)
  2. Links: Highlight connected links (higher opacity)
  3. Tooltip: Appears near cursor
  4. Related nodes: Fade other nodes to 30% opacity

User moves away:
  1. Node: Shrink back to normal
  2. Links: Return to default opacity
  3. Tooltip: Fade out
  4. Related nodes: Fade back to 100%

Duration: 200ms smooth transitions
```

### Click Behavior

```
User clicks node:
  1. Node: Expand/highlight (visual "selection")
  2. Tooltip: Show detailed info
  3. Links: All links from node highlighted
  4. Related nodes: Highlight connected nodes
  5. Lock state until click elsewhere or Escape

User clicks elsewhere:
  1. Deselect node
  2. Return to default view
```

---

## Filtering Behavior

### Current Filtering
- Filter by organization
- Filter by stars
- Filter by language
- Results: Hides repos, cascades to hide links/contributors

### Proposed Filtering (After New Feature)

**Option 1: Tier-Aware Filtering**
```
- Sponsored contributors: Always visible (never filtered)
- Community contributors: Can be hidden if filters exclude their repos
- Repos: Can be filtered
- Links: Show based on visible repo/contributor combination
```

**Option 2: Tier Toggle**
```
- Checkbox: "Show community contributors" (default: ON)
- When OFF: Hide all community nodes, show only sponsored
- Useful for focused view on key contributors
- Fast way to simplify visualization
```

**Recommendation:** Implement Option 1 initially, add Option 2 in Phase 2 if requested.

---

## Performance Considerations

### Data Size Impact
```
Scenario 1: Small Project
- 10 repos, 30 contributors (20 sponsored)
- Current: ~30 nodes + ~100 links
- After: No change in data size
- Performance: Excellent

Scenario 2: Medium Project
- 50 repos, 150 contributors (20 sponsored)
- Current: ~150 nodes + ~500 links
- After: No change in data size
- Performance: Good

Scenario 3: Large Project
- 75 repos, 300+ contributors (20 sponsored)
- Current: ~300 nodes + ~1000 links
- After: No change in data size
- Performance: Monitor, may need optimization
```

### Optimization Strategies
1. Lazy load community contributor details
2. Use simplified tooltips for community (load on demand)
3. Batch force simulation calculations
4. Render community nodes at lower detail initially

---

## Color Accessibility

### Current Colors
- Grenadier Orange (#CF3F02)
- Aquamarine Blue (#2E86AB)
- Base Gray (#443F3F)

### Contrast Ratios
- Orange on white: 5.2:1 ✅ (WCAG AA)
- Blue on white: 5.1:1 ✅ (WCAG AA)
- Gray on white: 6.8:1 ✅ (WCAG AAA)

### Colorblind-Friendly Design
- Don't rely on color alone
- Use size/shape/position for distinction
- Add tier badges (text) to distinguish
- Links: Use both color gradient and stroke width

### Recommended Accessibility Features
1. Tier badge labels (text not just color)
2. High contrast borders on nodes
3. Alternative icons for colorblind users
4. Keyboard navigation support

---

## Design Decision Template

Use this to document your final choice:

```
DESIGN DECISION: [Option A / Option B]

RATIONALE:
- Why this option?
- What makes it right for your use case?
- What are the key benefits?

VISUAL SPECIFICATIONS:
- Sponsored node color: [color]
- Community node color: [color]
- Opacity differences: [specs]
- Size differences: [specs]
- Labels: [visible/hidden/conditional]

COMMUNITY POSITIONING:
- Layout: [scattered/ring/other]
- Distance from center: [radius]
- Interaction behavior: [behavior]

TOOLTIPS:
- Show tier? [yes/no]
- Tier badge style: [style]
- Information shown: [fields]

FILTERS:
- Community visible by default? [yes/no]
- Can be filtered out? [yes/no]
- Always show sponsored? [yes/no]

TIMELINE:
- Design approval: [date]
- Development start: [date]
- Target launch: [date]
```

---

## Example: Completed Decision Document

```
DESIGN DECISION: Option B (Outer Ring)

RATIONALE:
- Matches ORCA model (client familiar with it)
- Professional appearance
- Clear visual hierarchy
- Scales well with large communities

VISUAL SPECIFICATIONS:
- Sponsored node color: #CF3F02 (Grenadier Orange)
- Community node color: #2E86AB (Aquamarine Blue)
- Community opacity: 75%
- Community size: 85% of sponsored
- All nodes labeled (adjustable font size by tier)

COMMUNITY POSITIONING:
- Layout: Outer ring
- Distance from center: 400px (vs 150px for sponsored)
- Gentle repulsion between community nodes (no overlap)
- Radial positioning (angle-based like sponsored ring)

TOOLTIPS:
- Show tier? Yes
- Tier badge style: Colored pill with text
- Information shown: Name, Tier, Commits, Repos, Dates

FILTERS:
- Community visible by default? Yes
- Can be filtered out? Yes (via repo filters)
- Always show sponsored? Yes (never hidden)

TIMELINE:
- Design approval: Feb 14, 2026
- Development start: Feb 17, 2026
- Target launch: Mar 14, 2026 (4 weeks)
```

---

## Next Steps

1. **Choose Option A or Option B**
   - Or propose a hybrid/custom approach

2. **Finalize Color Scheme**
   - Confirm using existing brand colors
   - Or propose alternatives

3. **Specify Tier Labels/Badging**
   - How should tiers be shown?
   - Text, icons, colors, or combinations?

4. **Decide on Community Visibility**
   - Always shown?
   - Togglable?
   - Filtered by default?

5. **Approve Timeline**
   - Option A: 3 weeks
   - Option B: 4 weeks
   - With feedback loops: add 1 week

Once these decisions are made, the implementation roadmap can proceed with certainty.

---

**This guide is ready for design discussion and feedback.**

**Last Updated:** February 2026
