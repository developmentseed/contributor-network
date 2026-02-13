# Development Guide

How to set up your local environment, run the project, and make changes.

---

## Prerequisites

Before getting started, install:

- **[uv](https://docs.astral.sh/uv/getting-started/installation/)** - Fast Python package manager (required)
- **[Node.js](https://nodejs.org/)** 18+ - For JavaScript tooling
- **[Git](https://git-scm.com/)** - For version control
- **GitHub personal access token** - With `public_repo` scope (for fetching data)

### Getting a GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "contributor-network")
4. Check `public_repo` scope
5. Generate and copy the token
6. Store it somewhere safe (you'll use it for the `data` command)

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/developmentseed/contributor-network.git
cd contributor-network
```

### 2. Install Python Dependencies

```bash
uv sync
```

This installs all Python dependencies specified in `pyproject.toml` into a virtual environment.

### 3. Install JavaScript Dependencies

```bash
npm install
```

This installs D3.js, Vitest, and other frontend tooling.

---

## Running Locally

### Option A: View the Current Build

If you already have data in `assets/data/`, you can view the built site locally:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/ in your browser.

### Option B: Full Workflow - Fetch Data & Build

To update the visualization with fresh GitHub data:

```bash
# 1. Set your GitHub token
export GITHUB_TOKEN="your_token_here"

# 2. (Optional) Discover new repos that multiple team members contribute to
uv run contributor-network discover --min-contributors 2

# 3. Edit config.toml to add/remove repos or contributors

# 4. Fetch data from GitHub
uv run contributor-network data assets/data assets/data

# 5. Generate CSV files
uv run contributor-network csvs assets/data

# 6. Build the static site
uv run contributor-network build assets/data dist

# 7. View the built site
cd dist && python -m http.server 8000
# Open http://localhost:8000/
```

---

## Development Workflows

### Making Frontend Changes

The JavaScript files in `src/js/` are auto-available to the browser without a build step during development.

**Workflow:**
1. Make changes to files in `src/js/`
2. Refresh http://localhost:8000/ in your browser
3. See changes immediately (no build required)
4. Run tests to verify: `npm test`

**Special cases:**
- If you modify `src/js/chart.js` (the main visualization), it compiles to `chart.js` in the root
- If you add new modules to `src/js/`, export them from `src/js/index.js`

### Making Backend Changes

Python CLI changes take effect immediately (no build step needed).

**Workflow:**
1. Make changes to `python/contributor_network/`
2. Re-run the CLI command: `uv run contributor-network <command>`
3. Changes are reflected
4. Run tests: `uv run pytest`

### Adding a New Repository to Track

1. **Get the repo URL** - e.g., `owner/repo-name`
2. **Edit `config.toml`**:
   ```toml
   [repositories]
   "owner/repo-name" = "Display Name"
   ```
3. **Fetch fresh data**:
   ```bash
   export GITHUB_TOKEN="your_token_here"
   uv run contributor-network data assets/data assets/data
   ```
4. **Regenerate CSVs**:
   ```bash
   uv run contributor-network csvs assets/data
   ```
5. **Rebuild the site**:
   ```bash
   uv run contributor-network build assets/data dist
   ```

### Adding a New Contributor

1. **Edit `config.toml`**:
   ```toml
   [contributors.devseed]
   github_username = "Display Name"

   # Or for alumni/external:
   [contributors.alumni]
   github_username = "Display Name"
   ```
2. **Fetch data and rebuild** (same as above)

### Customizing the Visualization

**Colors & Fonts**: Edit `src/js/config/theme.js`

**Layout Constants**: Edit the `LAYOUT` object in `src/js/config/theme.js`

**Filters Available**: Check `src/js/state/filterState.js` to see what filters are available

**Data Filtering Logic**: See `src/js/data/filter.js` for how filters are applied

---

## Quality Checks & Tests

### Python Quality Checks

```bash
# Format check (no changes)
uv run ruff format --check .

# Lint check (no changes)
uv run ruff check .

# Type checking
uv run mypy

# Run tests
uv run pytest

# Run a specific test
uv run pytest python/tests/test_config.py::test_function_name
```

### Auto-Fix Python Issues

```bash
# Auto-format all files
uv run ruff format .

# Auto-fix fixable lint issues
uv run ruff check --fix .
```

### JavaScript Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-run on file changes)
npm test -- --watch

# Run a specific test file
npm test -- src/js/__tests__/filter.test.js
```

### Run All Checks (As in CI)

```bash
# Python
uv run ruff format --check .
uv run ruff check .
uv run mypy
uv run pytest

# JavaScript
npm test
```

---

## CLI Commands Reference

### `list-contributors`

List all configured contributors by category:

```bash
uv run contributor-network list-contributors
```

**Output**: Shows current DevSeed, alumni, and external contributors.

### `discover`

Find new repositories where multiple DevSeed employees have contributed:

```bash
export GITHUB_TOKEN="your_token_here"
uv run contributor-network discover --min-contributors 2 --limit 50
```

**Options:**
- `--min-contributors N` - Minimum number of DevSeed contributors in repo (default: 2)
- `--limit N` - Limit results to N repos (default: 50)

**Output**: Shows repos not yet in `config.toml` where DevSeed has activity.

### `data`

Fetch contribution data from GitHub for all configured repositories:

```bash
export GITHUB_TOKEN="your_token_here"
uv run contributor-network data assets/data assets/data
```

**Arguments:**
- First arg: Input directory (where to save JSON data) - usually `assets/data`
- Second arg: Output directory (for this command, same as input) - usually `assets/data`

**Options:**
- `--all-contributors` - Include alumni/friends, not just current DevSeed employees

**Output**: Creates JSON files for each repository with contribution data.

### `csvs`

Generate CSV files from the fetched JSON data:

```bash
uv run contributor-network csvs assets/data
```

**Argument:** Directory containing JSON files (usually `assets/data`)

**Output:** Creates:
- `repositories.csv` - Repository metadata
- `contributors.csv` - Contributor-to-repo relationships

### `build`

Build the static site to deploy:

```bash
uv run contributor-network build assets/data dist
```

**Arguments:**
- First arg: Data directory (`assets/data`)
- Second arg: Output directory (`dist`)

**Output:** Creates `dist/` with static HTML/CSS/JS ready to deploy.

---

## Project Structure for Developers

### Python Backend

```
python/
├── contributor_network/
│   ├── __init__.py
│   ├── cli.py              # Click CLI commands (entry point)
│   ├── client.py           # GitHub API wrapper (uses PyGithub)
│   ├── config.py           # Pydantic config models
│   ├── models.py           # Data models (Repo, Link, etc.)
│   └── __main__.py         # CLI entry point
├── templates/
│   └── index.html.j2       # Jinja2 template for index.html
└── tests/
    └── test_*.py           # Unit tests
```

**Key entry points:**
- `python/contributor_network/cli.py` - All CLI commands defined here
- `python/contributor_network/client.py` - GitHub API integration
- `python/contributor_network/models.py` - Data structure definitions

### JavaScript Frontend

```
src/js/
├── index.js                # Barrel exports (re-exports all modules)
├── visualization/
│   └── index.js           # Main visualization factory
├── config/                 # Configuration
│   ├── theme.js           # Colors, fonts, layout constants
│   └── scales.js          # D3 scale factories
├── data/                   # Data operations
│   └── filter.js          # Filtering logic
├── interaction/            # Event handlers
│   ├── hover.js           # Hover event handling
│   ├── click.js           # Click event handling
│   └── findNode.js        # Node detection via Delaunay
├── layout/                 # Layout & positioning
│   └── resize.js          # Canvas resize handling
├── render/                 # Drawing functions
│   ├── canvas.js          # Canvas setup
│   ├── shapes.js          # Shape drawing utilities
│   ├── text.js            # Text rendering
│   ├── tooltip.js         # Tooltip rendering
│   ├── labels.js          # Node labels
│   └── repoCard.js        # Repo details card
├── simulations/            # D3 force simulations
│   ├── ownerSimulation.js
│   ├── contributorSimulation.js
│   ├── collaborationSimulation.js
│   └── remainingSimulation.js
├── state/                  # State management
│   ├── filterState.js     # Filter state
│   └── interactionState.js # Hover/click state
├── utils/                  # Utilities
│   ├── helpers.js         # Math utilities
│   ├── formatters.js      # Date/number formatting
│   ├── validation.js      # Data validation
│   └── debug.js           # Debug logging
└── __tests__/              # Unit tests
```

---

## Debugging Tips

### JavaScript Debugging

**In Browser DevTools:**
1. Open DevTools (F12)
2. Check the Console for errors
3. Look for debug output (the code logs with `debug-contributor-network` flag)
4. Inspect the Network tab to see what data was loaded
5. Check the Elements tab to inspect the canvas and DOM

**Enable Debug Logging:**
```javascript
// In the browser console
localStorage.setItem('debug', 'debug-contributor-network');
// Reload the page
```

**Check Loaded Data:**
```javascript
// In the browser console
// After the visualization loads, you can access:
console.log(window.data);  // Raw data
console.log(window.nodes); // Processed nodes
```

### Python Debugging

**Add print statements:**
```python
# In Python code
print(f"Debug: {variable_name}")  # Will show in terminal

# Or use logging
import logging
logger = logging.getLogger(__name__)
logger.debug(f"Debug message: {value}")
```

**Run a specific test with output:**
```bash
uv run pytest python/tests/test_file.py -v -s
```

The `-s` flag shows print statements and logging output.

---

## Common Issues & Solutions

### Issue: "GitHub API rate limit exceeded"

**Solution:**
- Make sure you're using a GitHub token: `export GITHUB_TOKEN="your_token"`
- Unauthenticated requests have a much lower limit (60/hour vs 5,000/hour)
- Wait an hour for the limit to reset, or wait for exponential backoff retry logic

### Issue: `uv: command not found`

**Solution:**
```bash
# Install uv if you haven't
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or on macOS with homebrew
brew install uv
```

### Issue: Changes to `src/js/` aren't showing up

**Solution:**
1. Make sure you're running `python -m http.server 8000`
2. Hard-refresh your browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. Check that the file was actually saved

### Issue: Tests are failing

**Solution:**
```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Or for Python
uv run pytest -v
```

---

## Where to Get Help

- **Setup problems**: Check this file first
- **Code structure questions**: See `ARCHITECTURE.md`
- **What should I work on next?**: See `roadmap.md`
- **How does filtering work?**: See the code comments in `src/js/data/filter.js`
- **Data expansion ideas**: See `DATA_EXPANSION_PLAN.md`

---

**Last Updated**: February 2026
