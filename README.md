# Development Seed contributor network

The code behind <https://developmentseed.org/contributor-network>.

![A splash of the page](./img/site-image.jpg)

This visual is derived from the excellent <https://github.com/nbremer/ORCA/tree/main/top-contributor-network>.

## Rebuilding

We use [workflow dispatch](https://github.com/developmentseed/contributor-network/actions/workflows/build.yml) to rebuild the source data.
Right now this is manual, but eventually we'd like to set this up on a schedule: <https://github.com/developmentseed/contributor-network/issues/8>.

## Development

To view things locally:

```shell
python -m http.server
```

This will open the page on <http://localhost:8000/>.

To check the Python files, get [uv](https://docs.astral.sh/uv/getting-started/installation/), then:

```shell
uv sync
uv run ruff check --fix
uv run ruff format
```

To add new repos or contributors, see [constants.py](src/devseed_contributor_network/constants.py)

### Rebuilding locally

To build the data locally, set up [.netrc authentication for Github](https://pygithub.readthedocs.io/en/stable/examples/Authentication.html#netrc-authentication).
Then:

```shell
rm -rf data  # We don't re-fetch data from Github if it already exists on the local filesystem
uv run python scripts/fetch_data.py
uv run python scripts/build_csvs.py
```

## License

This work was copied-and-modified from <https://github.com/nbremer/ORCA> and is licensed under the same (MPL).
