# Contributor Network - Developer Guide

**Start here.** This file provides quick orientation for anyone working with this codebase.

## What Is This?

An interactive D3.js web visualization of Development Seed's contributions to open-source projects. Shows the relationships between team members, repositories, and collaborators.

**Live**: https://developmentseed.org/contributor-network

**Repo**: https://github.com/developmentseed/contributor-network

---

## For New Developers

**First read**: [`PRD.md`](./PRD.md) (5 min) - Understand what this product is and why it exists.

**Then read**: [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md) (10 min) - Set up your local environment.

**Then explore**: [`ARCHITECTURE.md`](./ARCHITECTURE.md) (15 min) - Understand how the code is organized.

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
  index.js                  # Barrel exports
  config/                   # Theme, scales, constants
  data/                     # Data filtering and prep
  interaction/              # Hover, click handlers
  layout/                   # Sizing, positioning
  render/                   # Drawing (shapes, text, labels, tooltips)
  simulations/              # D3 force simulations
  state/                    # State management
  utils/                    # Helpers, formatters, validation
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

## Documentation Structure

| Document | Purpose | Read When |
|----------|---------|-----------|
| **PRD.md** | Product requirements and vision | First - understand the *why* |
| **DEVELOPMENT_GUIDE.md** | Setup, workflows, local development | Setting up your environment |
| **ARCHITECTURE.md** | Code organization, current state | Understanding code structure |
| **JAVASCRIPT_REFACTORING.md** | JS modularization progress and roadmap | Working on frontend code |
| **roadmap.md** | Project status, planned features, and implementation status | Planning new work |
| **DATA_EXPANSION_PLAN.md** | Data collection phases (1-5) with details | Adding new data fields |
| **DECISIONS.md** | Architectural decisions and tradeoffs | Curious about design choices |

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

### Debug Visualization Issues
- Open DevTools (F12)
- Look for `debug-contributor-network` flag in console
- Check network tab to see what data was loaded
- See `src/js/utils/debug.js` for debug utilities

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

## Current Project Status

See [`roadmap.md`](./roadmap.md) for full project status, planned features, and roadmap details.

---

## Need Help?

- **Setting up?** → `DEVELOPMENT_GUIDE.md`
- **How does the code work?** → `ARCHITECTURE.md`
- **What are we building next?** → `roadmap.md` or `DATA_EXPANSION_PLAN.md`
- **Why was a decision made?** → `DECISIONS.md`
- **What's the product for?** → `PRD.md`

---

**Last Updated**: February 2026
