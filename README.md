# Development Seed Contributor Network

The code behind <https://developmentseed.org/contributor-network>.

<img src="./assets/img/site-image.jpg" height="600px" />

This visual is derived from the excellent [ORCA top-contributor-network](https://github.com/nbremer/ORCA/tree/main/top-contributor-network) by Nadieh Bremer.

## Quick Start

### Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) for Python package management
- A GitHub personal access token with `public_repo` scope

### View Locally

```shell
python -m http.server 8000
```

Then open <http://localhost:8000/> (the root index.html)

## CLI Commands

All commands are run via `uv run contributor-network <command>`.

### `list-contributors`

List all configured contributors by category:

```shell
uv run contributor-network list-contributors
```

### `discover`

Find new repositories that DevSeed employees contribute to:

```shell
export GITHUB_TOKEN="your_token_here"
uv run contributor-network discover --min-contributors 2 --limit 50
```

This queries GitHub to find repos where multiple DevSeed employees have contributed, which are not yet in the configuration.

### `data`

Fetch contribution data from GitHub for all configured repositories:

```shell
export GITHUB_TOKEN="your_token_here"
uv run contributor-network assets/data assets/data
```

Options:
- `--all-contributors`: Include alumni/friends (not just current DevSeed employees)

### `csvs`

Generate CSV files from the fetched JSON data:

```shell
uv run contributor-network csvs assets/data
```

### `build`

Build the static site to the `dist/` folder:

```shell
uv run contributor-network build assets/data dist
```

## Full Workflow

To update the visualization with new data:

```shell
# 1. Set your GitHub token
export GITHUB_TOKEN="your_token_here"

# 2. (Optional) Discover new repos to add
uv run contributor-network discover --min-contributors 2

# 3. Edit config.toml to add/remove repos or contributors

# 4. Fetch data from GitHub
uv run contributor-network assets/data assets/data

# 5. Generate CSVs
uv run contributor-network csvs assets/data

# 6. Build the site
uv run contributor-network build assets/data dist

# 7. Preview locally
cd dist && python -m http.server 8000
```

## Configuration

Edit `config.toml` to configure:

- **repositories**: List of GitHub repos to track (format: `"owner/repo"`)
- **contributors.devseed**: Current DevSeed employees (format: `github_username = "Display Name"`)
- **contributors.alumni**: Friends and alumni (commented out by default)

## Development

### Architecture

The visualization code is organized into modular ES6 modules in `src/js/`:

```
src/js/
├── config/          # Configuration (theme, scales)
├── data/            # Data filtering and utilities
├── interaction/     # Mouse hover and click handling
├── layout/          # Canvas sizing and layout
├── render/          # Drawing functions (shapes, text, labels)
├── simulations/     # D3 force simulations
├── state/           # State management
├── utils/           # Utilities (helpers, validation, formatters, debug)
└── __tests__/       # Unit tests
```

The main entry point is `index.js` which:
1. Loads dependencies (D3, etc.)
2. Imports all modular components
3. Exports `createContributorNetworkVisual` function

The visualization is used in `dist/index.html` to render the interactive network.

### Running Tests

```shell
npm test
```

Tests use Vitest and cover filtering, validation, and utility functions.

### Making Changes

When modifying the visualization:
1. Edit files in `src/js/`
2. Changes are immediately available in the browser (no build step needed)
3. Refresh `http://localhost:8000/` to see updates
4. Run `npm test` to verify changes don't break tests

### Code Quality

```shell
uv sync
uv run ruff check --fix
uv run ruff format
uv run pytest
```

### Automated Rebuilds

We use [workflow dispatch](https://github.com/developmentseed/contributor-network/actions/workflows/build.yml) to rebuild the source data manually.

## Branding

This visualization uses the Development Seed brand colors:
- **Grenadier** (#CF3F02): Primary orange accent
- **Aquamarine** (#2E86AB): Secondary blue
- **Base** (#443F3F): Text color

## License

This work was copied-and-modified from <https://github.com/nbremer/ORCA> and is licensed under the same (MPL).
