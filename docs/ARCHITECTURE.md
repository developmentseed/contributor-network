# Architecture Overview

How the codebase is organized and how the different pieces fit together.

---

## High-Level Data Flow

```
GitHub API
    ↓
Python CLI (client.py)
    ↓
JSON Files (assets/data/)
    ↓
CSV Generation (csvs command)
    ↓
D3.js Visualization (index.html)
    ↓
Interactive Web App
```

---

## Project Organization

### Python Backend

**Purpose:** Fetch data from GitHub, validate it, generate CSVs, and build the static site.

**Key files:**
- `python/contributor_network/cli.py` - All CLI commands (Click-based)
- `python/contributor_network/client.py` - GitHub API wrapper (uses PyGithub)
- `python/contributor_network/config.py` - Configuration models (Pydantic)
- `python/contributor_network/models.py` - Data models (Repository, Link, Contributor)

**Architecture:**
```
CLI (cli.py)
  ↓
Client (client.py) ← Queries GitHub API
  ↓
Models (models.py) ← Validates & structures data
  ↓
Config (config.py) ← Loads from config.toml
  ↓
JSON files / CSVs / Templates
```

**Data Flow for `data` command:**
1. Load repositories from `config.toml`
2. For each repo, query GitHub API (client.py)
3. Fetch contributions, commit dates, repository metadata
4. Validate data with Pydantic models (models.py)
5. Save to JSON files in `assets/data/`

### JavaScript Frontend

**Purpose:** Load CSV data, prepare it for visualization, render with D3.js, handle interactions.

**Architecture Status:** Modular ES6 modules

**Organization:**
```
src/js/
├── config/           # Configuration (theme, scales, constants)
├── data/             # Data loading, filtering, preparation
├── interaction/      # Mouse/keyboard event handlers
├── layout/           # Canvas sizing, node positioning
├── render/           # Drawing functions (shapes, text, labels, etc.)
├── simulations/      # D3 force simulations
├── state/            # State management (filters, hover/click state)
└── utils/            # Helpers (formatters, validation, debugging)
```

**Current State:**
- ✅ 29 modules extracted
- ✅ 4,642 lines in modular files
- 🟡 Main orchestrator still contains ~2,059 lines
- 🟡 Largest remaining extraction: `prepareData()` (~515 lines)

---

## Key Concepts

### Nodes

Three types of nodes in the visualization:

1. **Contributors** - Team members (arranged in a circle)
   - Position: Alphabetically around outer ring
   - Color: Based on organization
   - Size: Based on total contributions

2. **Repositories** - GitHub projects
   - Position: Determined by force simulation (depends on collaboration pattern)
   - Color: Coded by ownership type
   - Grouped by: Single owner, single contributor, multiple contributors

3. **Owners** - Repository owners (intermediary nodes when repos grouped by owner)
   - Position: Calculated to be between repos and contributors
   - Purpose: Organize related repos visually

### Links

Connections between nodes:

- **Contributor → Owner → Repository** (when repos grouped by owner)
- **Contributor → Repository** (direct links)
- Width: Based on commit count
- Opacity: Based on recency of contribution

### Force Simulations

D3.js force simulations position nodes without overlapping:

1. **Owner Simulation** - Repos with single owner (25% of repos)
   - Pulls repos toward owner
   - Prevents overlap

2. **Contributor Simulation** - Repos with single DevSeed contributor (50%)
   - Pulls repos toward contributor
   - Uses strong charge force to prevent clustering

3. **Collaboration Simulation** - Repos with multiple contributors (20%)
   - Centers at origin
   - Balances contributors' influence
   - Tighter clustering

4. **Remaining Simulation** - Contributors outside main circle
   - Positioned in outer ring
   - Separated from main visualization

---

## Configuration

### `config.toml` Structure

```toml
[repositories]
"owner/repo-name" = "Display Name"
"another-owner/project" = "Another Project"

[contributors.devseed]
github_username = "Display Name"
another_username = "Another Name"

[contributors.alumni]
old_member = "Old Member Name"
```

### Data Models (`models.py`)

**Repository:**
- ID, full name, URL
- Metrics: stars, forks, watchers, open issues
- Metadata: languages, topics, license, created/updated dates
- Community: total contributors, DevSeed contributors, community ratio

**Link** (Contributor → Repository relationship):
- Contributor & repo IDs
- Commit count and dates (first/last)
- Contribution span (days)
- Recency flag

---

## State Management

### Filter State

Managed in `src/js/state/filterState.js`

```javascript
{
  organizations: [],  // Selected org filters
  starsMin: null,
  forksMin: null,
  watchersMin: null,
  language: null
}
```

### Interaction State

Managed in `src/js/state/interactionState.js`

```javascript
{
  hoverActive: false,
  hoveredNode: null,
  clickActive: false,
  clickedNode: null,
  delaunay: null  // For mouse position detection
}
```

---

## Data Processing Pipeline

### 1. Loading (`src/js/visualization/index.js`)
- Fetch CSV files (repositories.csv, contributors.csv)
- Parse into objects
- Build node and link objects

### 2. Preparation (`src/js/data/prepare.js` - currently in progress to extract)
- Create node objects from data
- Build link arrays
- Calculate positions
- Determine colors based on metadata

### 3. Filtering (`src/js/data/filter.js`)
- Apply active filters (organization, stars, language, etc.)
- Cascade: filter repos → filter links → filter contributors
- Rebuild only affected links

### 4. Simulation (`src/js/simulations/`)
- Run D3 force simulations to position nodes
- Multiple simulations based on repo grouping
- Calculate contributor ring positions

### 5. Rendering (`src/js/render/`)
- Draw nodes (circles with optional patterns)
- Draw links (curved paths with gradients)
- Draw labels (rotated for contributor ring)
- Draw tooltips on hover/click

### 6. Interaction (`src/js/interaction/`)
- Track mouse position with Delaunay triangulation
- Trigger hover state on node entry
- Handle click for selection
- Filter links shown on hover

---

## Rendering Pipeline

### Canvas Layers

The visualization uses multiple canvas layers (composited in HTML):

1. **Main canvas** - Nodes and links (performance-critical)
2. **Tooltip canvas** - Hover/click information cards
3. **Label canvas** - Node labels
4. **Hover canvas** - Temporary highlighting

### Drawing Performance

**Why Canvas instead of SVG?**
- 200+ interactive nodes + 500+ links would be slow in SVG
- Canvas provides better performance for this density
- D3 force simulation updates positions ~60 times per second

**Optimization strategies:**
- Request animation frame batching
- Partial redraws (only affected regions)
- Delaunay triangulation for fast node detection

---

## Refactoring Status

### What's Been Modularized ✅

| Area | Lines | Status |
|------|-------|--------|
| Config | 240 | ✅ Complete |
| Data filtering | 217 | ✅ Complete |
| State | 173 | ✅ Complete |
| Simulations | 529 | ✅ Complete |
| Interaction | 239 | ✅ Complete |
| Render (shapes, text, tooltips) | 1,474 | ✅ Complete |
| Layout | 329 | ✅ Complete |
| Utils | 606 | ✅ Complete |
| **Total Modular** | **4,642** | ✅ **Complete** |

### What Still Needs Work 🟡

| Task | Lines | Priority |
|------|-------|----------|
| Extract `prepareData()` | ~515 | High |
| Extract `positionContributorNodes()` | ~117 | High |
| Simplify main `draw()` | ~166 | High |
| Extract helper functions | ~100 | Medium |
| **Total Remaining** | **~898** | |

**Target:** Main `index.js` from 2,059 lines → ~300-400 lines (thin orchestrator)

---

## JavaScript Module Structure

### Current Organization

```
src/js/
├── config/
│   ├── theme.js (119 lines)      # Colors, fonts, layout constants
│   └── scales.js (121 lines)     # D3 scale factories
├── data/
│   └── filter.js (217 lines)     # Filtering logic
├── state/
│   ├── filterState.js (67 lines) # Filter state
│   └── interactionState.js (106 lines) # Hover/click state
├── simulations/
│   ├── ownerSimulation.js (125 lines)
│   ├── contributorSimulation.js (132 lines)
│   ├── collaborationSimulation.js (188 lines)
│   ├── remainingSimulation.js (84 lines)
│   └── index.js (12 lines)       # Re-exports
├── interaction/
│   ├── hover.js (87 lines)
│   ├── click.js (85 lines)
│   └── findNode.js (67 lines)
├── layout/
│   └── resize.js (122 lines)
├── render/
│   ├── canvas.js (207 lines)
│   ├── shapes.js (277 lines)
│   ├── text.js (275 lines)
│   ├── tooltip.js (533 lines)    # Largest module
│   ├── labels.js (141 lines)
│   └── repoCard.js (248 lines)
├── utils/
│   ├── helpers.js (121 lines)
│   ├── formatters.js (153 lines)
│   ├── validation.js (185 lines)
│   └── debug.js (147 lines)
└── visualization/
    └── index.js (14 lines)       # Exports
```

---

## Theme & Customization

### Colors (in `src/js/config/theme.js`)

**Brand Colors:**
- Grenadier Orange (#CF3F02)
- Aquamarine Blue (#2E86AB)
- Base Gray (#443F3F)

**Node Colors:**
- Contributors: Varied by organization (from color palette)
- Repositories: Coded by ownership pattern (single owner, single contributor, shared)
- Owners: Gray/neutral

**Link Colors:**
- Gradient from contributor color to repo color
- Opacity: Based on recency (recent = more opaque)

### Font Configuration

```javascript
FONTS = {
  family: "...",
  baseSizeContributor: 11,  // To be increased to ~14
  baseSizeRepo: 10,         // To be increased to ~13
  baseSizeOwner: 12         // To be increased to ~15
}
```

---

## Dependencies

### Python
- `click` - CLI framework
- `pydantic` - Data validation
- `pygithub` - GitHub API client
- `requests` - HTTP library
- `tomli` - TOML parsing
- `pytest` - Testing

### JavaScript
- `d3` - Visualization and force simulations
- `vitest` - Testing framework
- ~~esbuild~~ - Bundling (in package.json, but not active build)

---

## How It All Fits Together

**User visits the site:**

1. **index.html** loads JavaScript modules from `src/js/`
2. **visualization/index.js** creates a chart function
3. Chart function:
   - Loads CSV data from `assets/data/`
   - Calls `prepareData()` to transform raw data into nodes/links
   - Runs force simulations to position nodes
   - Sets up event handlers (hover, click)
   - Starts animation loop

4. **Animation loop** (`draw()` function):
   - Updates node positions (from force simulation)
   - Redraws canvas
   - Shows/hides tooltips based on interaction state

5. **User interaction**:
   - Mouse move → detect node via Delaunay triangulation
   - Mouse over node → highlight and show tooltip
   - Click node → select for detailed view
   - Change filter → re-run cascade, rebuild visualization

6. **Data refresh** (happens offline):
   - User runs `uv run contributor-network data`
   - GitHub data fetched and validated
   - User runs `uv run contributor-network csvs`
   - CSV files updated in `assets/data/`
   - Next page refresh loads new data

---

## Common Patterns

### Module Pattern

All modules export functions, not classes:

```javascript
// src/js/utils/formatters.js
export function formatDate(timestamp) { /* ... */ }
export function formatNumber(num) { /* ... */ }
```

```javascript
// Usage in another module
import { formatDate } from '../utils/formatters.js';
const dateStr = formatDate(timestamp);
```

### State Management

Simple, predictable state updates:

```javascript
// Create initial state
let state = createInteractionState();

// Update immutably
state = setHovered(state, hoveredNode);
state = setClicked(state, clickedNode);
```

### Configuration

All magic numbers and constants centralized:

```javascript
// In config/theme.js
export const COLORS = { /* ... */ };
export const LAYOUT = { /* ... */ };
export const FONTS = { /* ... */ };
```

---

## Next Steps for Refactoring

**High Priority:**
1. Extract `prepareData()` → `data/prepare.js` (~515 lines)
2. Extract `positionContributorNodes()` → `layout/positioning.js` (~117 lines)
3. Simplify main `draw()` function

**Medium Priority:**
4. Extract `drawHoverState()` → `render/hoverState.js`
5. Extract remaining helper functions

**Result:** Main orchestrator becomes ~300 lines (thin coordinating layer)

---

**Last Updated**: February 2026
