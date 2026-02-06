# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Python CLI tool with a D3.js frontend that generates interactive network visualizations of GitHub contributors. The CLI fetches data from GitHub, generates CSVs, and builds a static site for deployment.

## Commands

### Development

```bash
# Install dependencies
uv sync

# Run CLI commands
uv run contributor-network data         # Fetch contribution data from GitHub
uv run contributor-network csvs         # Generate CSVs from JSON
uv run contributor-network build        # Build static site to dist/
uv run contributor-network discover     # Find new repositories
uv run contributor-network list-contributors  # Display all contributors
```

### Quality Checks

```bash
# Run all checks (as in CI)
uv run ruff format --check .
uv run ruff check .
uv run mypy

# Auto-fix formatting and lint issues
uv run ruff format .
uv run ruff check --fix .

# Run tests
uv run pytest
uv run pytest python/tests/test_config.py::test_function_name  # Single test
```

## Architecture

**Data flow**: GitHub API → Python CLI → JSON files → CSV files → D3.js visualization

### Folder Structure

```
python/                    # Python backend
  contributor_network/     # CLI package
  tests/                   # Python tests
  templates/               # Jinja2 HTML templates
js/                        # JavaScript frontend
  chart.js                 # Main D3.js visualization
  config/                  # Theme and scale configuration
  data/                    # Data preparation and filtering
  render/                  # Canvas rendering modules
  simulations/             # D3 force simulations
  ...
assets/                    # Static assets
  css/                     # Stylesheets
  data/                    # CSV data files
  img/                     # Images
  lib/                     # Vendored D3 libraries
```

### Key Files

- `python/contributor_network/cli.py` - Click-based CLI with 5 subcommands
- `python/contributor_network/config.py` - Pydantic models for TOML configuration
- `python/contributor_network/models.py` - Data models (Link, Repository)
- `python/contributor_network/client.py` - GitHub API client wrapper
- `js/chart.js` - D3.js visualization entry point
- `python/templates/` - Jinja2 HTML templates
- `config.toml`, `veda.toml` - Repository and contributor configuration

## Code Style

- Use `ruff` for linting and formatting
- Type hints required (mypy runs in CI)
- Pydantic for data validation
- Click for CLI commands
