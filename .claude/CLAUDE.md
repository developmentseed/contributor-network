# Contributor Network - Developer Guide

**Start here.** This file provides quick orientation for anyone working with this codebase.

> **Important for AI agents:** When you make changes to the codebase, update the relevant documentation in `.claude/` and `README.md` to reflect those changes. Keep `README.md` short, concise, and human-readable -- it is the public-facing project overview. This file (`CLAUDE.md`) is the detailed reference for developers and agents.

## What Is This?

An interactive D3.js web visualization of Development Seed's contributions to open-source projects. Shows the relationships between team members, repositories, and collaborators.

**Live**: https://developmentseed.org/contributor-network

**Repo**: https://github.com/developmentseed/contributor-network

---

## For New Developers

**First read**: [`PRD.md`](./PRD.md) (5 min) - Understand what this product is and why it exists.

---

## Quick Start

### Prerequisites
- [uv](https://docs.astral.sh/uv/getting-started/installation/) for Python
- [Node.js](https://nodejs.org/) 18+ for JavaScript
- GitHub personal access token with `public_repo` scope

### Installation
```bash
uv sync              # Install Python dependencies
npm install          # Install JavaScript dependencies
```

### View Locally
```bash
python -m http.server 8000
# Open http://localhost:8000/
```

### Fetch Data & Build
```bash
export GITHUB_TOKEN="your_token_here"
uv run contributor-network data       # Fetch from GitHub
uv run contributor-network csvs       # Generate CSVs
uv run contributor-network build assets/data dist  # Build static site
```

---

## Key Commands

### Development
```bash
# Run CLI commands
uv run contributor-network data             # Fetch contribution data from GitHub
uv run contributor-network csvs             # Generate CSVs from JSON
uv run contributor-network build assets/data dist   # Build static site to dist/
uv run contributor-network discover         # Find new repositories to track
uv run contributor-network list-contributors # Display all configured contributors

# JavaScript testing
npm test                                    # Run Vitest
npm run build                              # Bundle JavaScript
```

### Quality Checks
```bash
# Python: as in CI
uv run ruff format --check .
uv run ruff check .
uv run mypy
uv run pytest

# Auto-fix issues
uv run ruff format .
uv run ruff check --fix .
```

---

## Project Structure

```
python/                     # Python backend (CLI)
  contributor_network/      # Main package
    cli.py                  # Click CLI commands
    client.py               # GitHub API wrapper
    config.py               # Pydantic config models
    models.py               # Data models
  tests/                    # Python tests
  templates/                # Jinja2 HTML templates

src/js/                     # JavaScript frontend (modular)
  index.js                  # Barrel exports (re-exports all modules)
  visualization/
    index.js                # Main visualization factory
  config/
    theme.js                # Colors, fonts, layout constants
    scales.js               # D3 scale factories
  data/
    filter.js               # Filtering logic
  interaction/
    hover.js                # Hover event handling
    click.js                # Click event handling
    findNode.js             # Node detection via Delaunay
  layout/
    resize.js               # Canvas resize handling
  render/
    canvas.js               # Canvas setup
    shapes.js               # Shape drawing utilities
    text.js                 # Text rendering
    tooltip.js              # Tooltip rendering
    labels.js               # Node labels
    repoCard.js             # Repo details card
  simulations/
    ownerSimulation.js      # Owner node forces
    contributorSimulation.js # Contributor node forces
    collaborationSimulation.js # Collaboration link forces
    remainingSimulation.js  # Remaining/community node forces
  state/
    filterState.js          # Filter state
    interactionState.js     # Hover/click state
  utils/
    helpers.js              # Math utilities
    formatters.js           # Date/number formatting
    validation.js           # Data validation
    debug.js                # Debug logging
  __tests__/                # Unit tests

assets/
  data/                     # JSON data files (generated)
  css/                      # Stylesheets
  img/                      # Images

index.html                  # Main entry point
config.toml                 # Repository and contributor config
```

---

## Key Files

- **`python/contributor_network/cli.py`** - Click-based CLI with 5 subcommands
- **`python/contributor_network/client.py`** - GitHub API client wrapper
- **`python/contributor_network/models.py`** - Pydantic data models (Repo, Link, etc.)
- **`src/js/index.js`** - Main visualization orchestrator (still being refactored)
- **`config.toml`** - Configuration: which repos to track, who are contributors
- **`index.html`** - Static HTML that loads the visualization

---

## Code Standards

### Python
- Type hints required (mypy validates in CI)
- Formatted with `ruff` (not black)
- Pydantic for data validation
- Click for CLI commands
- Docstrings on public functions

### JavaScript
- ES6 modules (no transpilation)
- Modular architecture: each module <300 lines
- JSDoc comments on exported functions
- Tests with Vitest
- No external build step for development (changes auto-available in browser)

---

## Architecture Notes

### Data Flow

```
GitHub API → Python CLI (client.py) → JSON files → CSV generation → D3.js visualization → Interactive web app
```

Inside the Python backend: `CLI (cli.py) → Client (client.py) → Models (models.py) → Config (config.py) → JSON/CSV output`

### Data Storage

Data is stored as JSON and CSV files (not a database). This keeps the project as a simple static site with no infrastructure to manage -- files are human-readable, version-controllable, and work offline. If the project grows past ~200 repositories or ~500 contributors, consider migrating to SQLite, then PostgreSQL. See `DATA_EXPANSION_PLAN.md` for details.

### Visualization Concepts

**Node types:**
- **Contributors** -- team members, arranged alphabetically in an outer ring, sized by total contributions
- **Repositories** -- GitHub projects, positioned by force simulation, color-coded by ownership type
- **Owners** -- intermediary nodes that visually group repos by their owner

**Links** connect contributors to repositories (sometimes through owner nodes). Link width reflects commit count; opacity reflects recency of contribution.

**Simulations**: Four separate D3 force simulations, each tuned for a different repo grouping pattern:
- **ownerSimulation** -- repos owned by the organization
- **contributorSimulation** -- repos with a single DevSeed contributor
- **collaborationSimulation** -- repos shared between multiple DevSeed contributors
- **remainingSimulation** -- community contributors outside the main circle

### Rendering Pipeline

The frontend processes data in this order: **Load → Prepare → Filter → Simulate → Render → Interact**

The visualization uses multiple composited canvas layers for performance: main (nodes + links), tooltip, labels, and hover highlighting. Canvas is used instead of SVG because 200+ nodes and 500+ links would be too slow as DOM elements.

### Code Patterns

- All JS modules export **functions, not classes**
- State updates are **immutable** (e.g., `state = setHovered(state, node)`)
- All magic numbers and constants are **centralized** in `config/theme.js`

### Dependencies

**Python:** click, pydantic, pygithub, requests, tomli, pytest

**JavaScript:** d3, vitest

---

## Documentation Structure

| Document | Purpose | Read When |
|----------|---------|-----------|
| **README.md** (root) | Project overview, CLI reference, full workflows | Understanding the product and CLI usage |
| **PRD.md** | Product requirements and vision | First - understand the *why* |
| **DATA_EXPANSION_PLAN.md** | Data collection phases (1-5) with details | Adding new data fields |

---

## Branding

Development Seed colors:
- **Grenadier** (#CF3F02): Primary orange accent
- **Aquamarine** (#2E86AB): Secondary blue
- **Base** (#443F3F): Text color

Configured in `src/js/config/theme.js`.

---

## Common Tasks

### Add a New Repository to Track
1. Edit `config.toml` - add repo to `[repositories]` section
2. Run `uv run contributor-network data` to fetch GitHub data
3. Run `uv run contributor-network csvs` to generate CSVs
4. Run `uv run contributor-network build assets/data dist` to rebuild site

### Add a New Contributor
1. Edit `config.toml` - add to `[contributors.devseed]` or `[contributors.alumni]`
2. Re-run data fetch and build (above)

### Making Frontend Changes

JavaScript files in `src/js/` are auto-available to the browser without a build step during development.

1. Make changes to files in `src/js/`
2. Refresh http://localhost:8000/ in your browser
3. Run tests to verify: `npm test`

**Note:** If you modify `src/js/chart.js` (the main visualization), it compiles to `chart.js` in the root. If you add new modules to `src/js/`, export them from `src/js/index.js`.

### Customizing the Visualization

- **Colors & Fonts**: Edit `src/js/config/theme.js`
- **Layout Constants**: Edit the `LAYOUT` object in `src/js/config/theme.js`
- **Filters Available**: Check `src/js/state/filterState.js`
- **Data Filtering Logic**: See `src/js/data/filter.js`

### Debug Visualization Issues
- Open DevTools (F12)
- Look for `debug-contributor-network` flag in console
- Check network tab to see what data was loaded
- See `src/js/utils/debug.js` for debug utilities

### Debug Python Issues

```bash
# Run a specific test with verbose output
uv run pytest python/tests/test_file.py -v -s
```

The `-s` flag shows print statements and logging output.

### Run Tests
```bash
# Python
uv run pytest
uv run pytest python/tests/test_config.py::test_function_name  # Single test

# JavaScript
npm test
npm test -- --watch
```

---

## Troubleshooting

### "GitHub API rate limit exceeded"
- Make sure you're using a GitHub token: `export GITHUB_TOKEN="your_token"`
- Unauthenticated requests have a much lower limit (60/hour vs 5,000/hour)
- Wait an hour for the limit to reset, or wait for exponential backoff retry logic

### `uv: command not found`
```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or on macOS with Homebrew
brew install uv
```

### Changes to `src/js/` aren't showing up
1. Make sure you're running `python -m http.server 8000`
2. Hard-refresh your browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. Check that the file was actually saved

### Tests are failing
```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Or for Python
uv run pytest -v
```

---

## Need Help?

- **Project overview and CLI usage?** → `README.md` (root)
- **What are we building next?** → `DATA_EXPANSION_PLAN.md`
- **What's the product for?** → `PRD.md`

---

**Last Updated**: February 2026
