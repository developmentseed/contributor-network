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
npm run dev
# Open http://localhost:8000/
```

### Fetch Data & Build
```bash
export GITHUB_TOKEN="your_token_here"
uv run contributor-network fetch      # Fetch from GitHub
uv run contributor-network build      # Generate CSVs and config.json
npm run build                         # Build static site to dist/ (Vite)
```

---

## Key Commands

### Development
```bash
# Run CLI commands
uv run contributor-network fetch            # Fetch contribution data from GitHub
uv run contributor-network build            # Generate CSVs and config.json
uv run contributor-network discover         # Find new repositories to track
uv run contributor-network list-contributors # Display all configured contributors

# Frontend development
npm run dev                                # Start Vite dev server
npm test                                   # Run Vitest
npm run build                             # Build frontend (tsc + vite)
npm run typecheck                         # TypeScript type checking
```

### Quality Checks
```bash
# Python
uv run ruff format --check .
uv run ruff check .
uv run mypy
uv run pytest

# TypeScript
npm run typecheck
npm test

# Auto-fix
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

src/                        # TypeScript frontend (built with Vite)
  main.ts                   # App entry point
  chart.ts                  # Main visualization factory
  types.ts                  # Shared TypeScript types
  index.ts                  # Barrel exports
  config/
    theme.ts                # Colors, fonts, layout constants
    scales.ts               # D3 scale factories
  data/
    filter.ts               # Filtering logic
    prepare.ts              # Data preparation for visualization
  interaction/
    hover.ts                # Hover event handling
    click.ts                # Click event handling
    findNode.ts             # Node detection via Delaunay
    zoom.ts                 # Zoom/pan handling
  layout/
    positioning.ts          # Contributor node positioning
    resize.ts               # Canvas resize handling
  render/
    canvas.ts               # Canvas setup
    shapes.ts               # Shape drawing utilities
    text.ts                 # Text rendering
    draw.ts                 # Main draw orchestrator
    tooltip.ts              # Tooltip rendering
    labels.ts               # Node labels
    repoCard.ts             # Repo details card
  simulations/
    ownerSimulation.ts      # Owner node forces
    contributorSimulation.ts # Contributor node forces
    collaborationSimulation.ts # Collaboration link forces
  state/
    filterState.ts          # Filter state
    interactionState.ts     # Hover/click state
  utils/
    helpers.ts              # Math utilities
    formatters.ts           # Date/number formatting
    validation.ts           # Data validation
    debug.ts                # Debug logging
  __tests__/                # Vitest unit tests

public/
  data/                     # JSON/CSV data files (generated)
  css/                      # Stylesheets
  img/                      # Images

index.html                  # Main entry point (Vite processes this)
config.toml                 # Repository and contributor config
tsconfig.json               # TypeScript configuration
vite.config.ts              # Vite build configuration
vitest.config.ts            # Vitest test configuration
```

---

## Key Files

- **`python/contributor_network/cli.py`** - Click-based CLI with 5 subcommands
- **`python/contributor_network/client.py`** - GitHub API client wrapper
- **`python/contributor_network/models.py`** - Pydantic data models (Repo, Link, etc.)
- **`src/chart.ts`** - Main visualization factory (1400+ lines)
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

### TypeScript
- TypeScript with strict mode, built with Vite
- D3 installed via npm (not CDN)
- Modular architecture: each module <300 lines
- Tests with Vitest
- `npm run dev` for development with HMR

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

- All TS modules export **functions, not classes**
- State updates are **immutable** (e.g., `state = setHovered(state, node)`)
- All magic numbers and constants are **centralized** in `src/config/theme.ts`

### Dependencies

**Python:** click, pydantic, pygithub, requests, tomli, pytest

**TypeScript:** d3, d3-delaunay, d3-bboxCollide, vite, vitest, typescript

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

Configured in `src/config/theme.ts`.

---

## Common Tasks

### Add a New Repository to Track
1. Edit `config.toml` - add repo to `[repositories]` section
2. Run `uv run contributor-network fetch` to fetch GitHub data
3. Run `uv run contributor-network build` to generate CSVs and `config.json`
4. Run `npm run build` to rebuild the static site

### Add a New Contributor
1. Edit `config.toml` - add to `[contributors.devseed]` or `[contributors.alumni]`
2. Re-run data fetch and build (above)

### Making Frontend Changes

1. Run `npm run dev` for the Vite dev server with HMR
2. Make changes to files in `src/`
3. Run `npm test` to verify

### Customizing the Visualization

- **Colors & Fonts**: Edit `src/config/theme.ts`
- **Layout Constants**: Edit the `LAYOUT` object in `src/config/theme.ts`
- **Filters Available**: Check `src/state/filterState.ts`
- **Data Filtering Logic**: See `src/data/filter.ts`

### Debug Visualization Issues
- Open DevTools (F12)
- Look for `debug-contributor-network` flag in console
- Check network tab to see what data was loaded
- See `src/utils/debug.ts` for debug utilities

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

### Changes to `src/` aren't showing up
1. Make sure you're running `npm run dev`
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

**Last Updated**: March 2026

---

## Releasing

Both packages (`open-source-contributor-network` on PyPI, `@developmentseed/open-source-contributor-network` on npm) are published together on git tags matching `v*`.

### One-time setup

1. **PyPI trusted publishing** — at https://pypi.org/manage/account/publishing/ add a pending publisher:
   - PyPI Project Name: `open-source-contributor-network`
   - Owner: `developmentseed`
   - Repository: `contributor-network`
   - Workflow name: `release.yml`
   - Environment name: `release`
2. **npm token** — generate an automation token at https://www.npmjs.com/settings/<your-user>/tokens and add it as a repo Actions secret named `NPM_TOKEN`.
3. **GitHub environment** — create a `release` environment in repo Settings → Environments. Optionally require manual approval.

### Cutting a release

1. Align the version in `pyproject.toml` and `package.json` to the target version (both must match).
2. Commit the version bump.
3. Tag and push: `git tag v1.2.3 && git push origin v1.2.3`.
4. The `release.yml` workflow publishes both packages. If either job fails, fix and re-tag at the next version (`v1.2.4`) — republishing the same version is not allowed on either registry.

Pre-release versions (e.g. `v0.1.0-rc1`) are supported for test runs.
