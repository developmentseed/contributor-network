# Development Seed Contributor Network

The code behind <https://developmentseed.org/contributor-network>.

<img src="./assets/img/site-image.jpg" height="600px" />

This visual is derived from the excellent [ORCA top-contributor-network](https://github.com/nbremer/ORCA/tree/main/top-contributor-network) by Nadieh Bremer.

## Usage

To view the site on http://localhost:8000:

```sh
python -m http.server 8000
```

## Creating your own contributor network

1. **Fork or clone** the repository.
2. **Bootstrap config** from a list of repos or contributors:

```shell
uv run contributor-network bootstrap repos.txt --organization "My Org"
```

3. **Edit `config.toml`** to adjust organization, repos, and contributors.
4. **Run the CLI** to fetch data and build:

```shell
export GITHUB_TOKEN="your_token_here"
uv run contributor-network build dist
```

5. **Deploy** the `dist/` directory to any static host, or preview locally.

## Development

Get [uv](https://docs.astral.sh/uv/getting-started/installation/) and a GitHub personal access token with `public_repo` scope (e.g. via `gh auth token` if you have the [Github CLI](https://cli.github.com/)).

Rebuild the site from existing data (JS-only changes):

```sh
uv run contributor-network build --skip-fetch
```

Full build (fetch + generate + assemble):

```sh
export GITHUB_TOKEN="your_token_here"
uv run contributor-network build dist
```

Discover repos your contributors work on:

```shell
uv run contributor-network discover from-contributors --min-contributors 2
```

Discover community contributors from tracked repos:

```shell
uv run contributor-network discover from-repositories --min-contributions 5
```

List contributors:

```shell
uv run contributor-network list-contributors
```

### Full workflow

```shell
# 1. Set your GitHub token
export GITHUB_TOKEN="your_token_here"

# 2. (Optional) Discover new repos or contributors
uv run contributor-network discover from-contributors --min-contributors 2

# 3. Edit config.toml to add/remove repos or contributors

# 4. Build (fetch + CSVs + site)
uv run contributor-network build dist

# 5. Preview locally
cd dist && python -m http.server 8000
```

### Tests

```shell
npm test
uv run pytest
```

### Lints

```shell
uv run ruff check --fix
uv run ruff format
```

## Configuration

Edit `config.toml` to configure:

- **repositories**: List of GitHub repos to track (format: `"owner/repo"`)
- **contributors.devseed**: Current DevSeed employees (format: `github_username = "Display Name"`)
- **contributors.alumni**: Friends and alumni (commented out by default)

## Branding

This visualization uses the Development Seed brand colors:
- **Grenadier** (#CF3F02): Primary orange accent
- **Aquamarine** (#2E86AB): Secondary blue
- **Base** (#443F3F): Text color

## License

This work was copied-and-modified from <https://github.com/nbremer/ORCA> and is licensed under the same (MPL).
