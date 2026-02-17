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
python3 -m http.server 8000
```

Then open <http://localhost:8000/>

## Discovery Modes

The CLI supports two discovery modes, configured in `config.toml`:

- **`contributor`** (default): Start from known contributors, fetch their repo data.
- **`repository`**: Start from tracked repos, discover all contributors, and interactively classify each as core (sponsored) or community.

Set the mode in `config.toml`:

```toml
[discovery]
mode = "repository"   # or "contributor"
```

## CLI Commands

All commands are run via `uv run contributor-network <command>`.

### `data`

Fetch contribution data from GitHub. Requires a `DIRECTORY` argument for intermediate JSON storage.

**Repository mode** (interactive):

```shell
export GITHUB_TOKEN="your_token_here"
uv run contributor-network data data/ --mode repository
```

This will:
1. Discover all contributors across your tracked repos
2. Prompt you to classify each unknown contributor as core or community
3. Add newly classified core contributors to `[contributors.core]` in `config.toml`
4. Fetch detailed link data for every contributor

Options:
- `--min-contributions N`: Only include contributors with at least N contributions (default: 1)
- `--mode [repository|contributor]`: Override the mode from `config.toml`

**Contributor mode** (non-interactive):

```shell
export GITHUB_TOKEN="your_token_here"
uv run contributor-network data data/
```

Options:
- `--all-contributors`: Include alumni/friends (not just core contributors)
- `--include-community`: Also discover community contributors per repo
- `--max-community-per-repo N`: Cap community contributors per repo (default: 50)

### `csvs`

Generate CSV files from the fetched JSON data:

```shell
uv run contributor-network csvs data/
```

Produces `top_contributors.csv`, `repositories.csv`, and `links.csv` inside `data/`.

### `build`

Build the static site into an output directory:

```shell
uv run contributor-network build data/ build/
```

Copies CSVs, JS, CSS, images, and generates `config.json` for runtime use.

### `list-contributors`

List all configured contributors by category:

```shell
uv run contributor-network list-contributors
```

### `discover`

Find new repositories that core contributors contribute to:

```shell
export GITHUB_TOKEN="your_token_here"
uv run contributor-network discover --min-contributors 2 --limit 50
```

## Full Workflow

### Repository-first (recommended for new setups)

```shell
# 1. Set your GitHub token
export GITHUB_TOKEN="your_token_here"

# 2. Fetch data and classify contributors interactively
uv run contributor-network data data/ --mode repository

# 3. Generate CSVs
uv run contributor-network csvs data/

# 4. Build the site
uv run contributor-network build data/ build/

# 5. Preview locally
cd build/ && python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

### Contributor-first (existing workflow)

```shell
# 1. Set your GitHub token
export GITHUB_TOKEN="your_token_here"

# 2. (Optional) Discover new repos to add
uv run contributor-network discover --min-contributors 2

# 3. Edit config.toml to add/remove repos or contributors

# 4. Fetch data from GitHub
uv run contributor-network data data/

# 5. Generate CSVs
uv run contributor-network csvs data/

# 6. Build the site
uv run contributor-network build data/ build/

# 7. Preview locally
cd build/ && python3 -m http.server 8000
```

## Configuration

Edit `config.toml` to configure:

- **repositories**: List of GitHub repos to track (format: `"owner/repo"`)
- **contributors.core**: Core team contributors shown in the central ring (format: `github_username = "Display Name"`)
- **contributors.alumni**: Friends and alumni (optional)
- **discovery.mode**: `"repository"` or `"contributor"`
- **discovery.fetch_forking_orgs**: Set to `true` to discover which organizations have forked each repo (adds extra API calls)

## Development

### Architecture

The visualization code is organized into modular ES6 modules in `js/`:

```
js/
├── config/          # Configuration (theme, scales)
├── data/            # Data preparation and filtering
├── interaction/     # Mouse hover and click handling
├── layout/          # Canvas sizing, positioning, resize
├── render/          # Drawing functions (shapes, text, labels, tooltips)
├── simulations/     # D3 force simulations (owner, contributor, collaboration, community)
├── state/           # State management (filters, interactions)
├── utils/           # Utilities (helpers, validation, formatters, debug)
└── __tests__/       # Unit tests
```

The main entry point is `js/chart.js` which exports `createContributorNetworkVisual`.

### Running Tests

```shell
npm test
```

Tests use Vitest and cover filtering, validation, and utility functions.

### Making Changes

When modifying the visualization:
1. Edit files in `js/`
2. Changes are immediately available in the browser (no build step needed for dev)
3. Run `python3 -m http.server 8000` from the project root and refresh to see updates
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
