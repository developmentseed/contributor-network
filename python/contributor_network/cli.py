import json
import subprocess
import os
from collections import defaultdict
from csv import DictWriter
from pathlib import Path

import click
from github import Auth, Github

from .client import Client
from .config import Config
from .models import Link, Repository

ROOT = Path(__file__).absolute().parents[2]
DEFAULT_CONFIG_PATH = "config.toml"
directory = click.option(
    "--directory",
    type=click.Path(path_type=Path),
    default=ROOT / "public" / "data",
    help="The data directory",
)
destination = click.option(
    "--destination",
    type=click.Path(path_type=Path),
    default=ROOT / "dist",
    help="The destination for the HTML page assets",
)
config = click.option(
    "-c",
    "--config",
    "config_path",
    type=click.Path(),
    help="Path to the configuration file",
)
github_token = click.option(
    "--github-token", envvar="GITHUB_TOKEN", help="GitHub token"
)
all_contributors = click.option(
    "--all-contributors",
    is_flag=True,
    help="Include all contributor categories (not just core members)",
)


@click.group()
def main():
    """Build the contributor network page."""


@main.command()
@directory
@config
@github_token
@all_contributors
@click.argument("repos", nargs=-1)
def fetch(
    directory: Path,
    config_path: str | None,
    github_token: str | None,
    all_contributors: bool,
    repos: tuple[str, ...],
):
    """Fetch contributor network data from the Github API.

    Optionally pass one or more REPOS (e.g. owner/repo) to fetch only those
    repositories instead of all configured ones.

    This is an expensive operation that involves a lot of network calls to the
    Github API.
    """

    config = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    if repos:
        repositories = list(repos)
        unknown = set(repositories) - set(config.repositories)
        if unknown:
            raise click.UsageError(
                f"Repositories not found in config: {', '.join(sorted(unknown))}"
            )
    else:
        repositories = config.repositories

    if github_token:
        auth: Auth.Auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    client = Client(auth, directory)

    contributors = (
        config.all_contributors if all_contributors else config.core_contributors
    )
    print(f"Building data for {len(contributors)} contributors")

    for repository in repositories:
        print(f"Updating repository: {repository}")
        repo = client.get_repo(repository)
        client.update_repository(repo)
        print(f"Updating links: {repository}")
        client.update_links(repo, contributors)


@main.command()
@directory
@config
@destination
@all_contributors
def build(
    directory: Path, config_path: str | None, destination: Path, all_contributors: bool
) -> None:
    """Build the HTML site."""
    config = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)
    contributors = (
        config.all_contributors if all_contributors else config.core_contributors
    )
    authors = list(contributors.values())
    print(f"Writing CSVs for {len(authors)} contributors")

    (directory / "top_contributors.csv").write_text(
        "\n".join(["author_name"] + authors)
    )

    repositories = []
    for path in (directory / "repositories").glob("**/*.json"):
        repositories.append(
            Repository.model_validate_json(path.read_text()).model_dump(mode="json")
        )
    with open(directory / "repositories.csv", "w") as f:
        fieldnames = list(Repository.model_json_schema()["properties"].keys())
        writer = DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(repositories)

    links = []
    for path in (directory / "links").glob("**/*.json"):
        links.append(Link.model_validate_json(path.read_text()).model_dump(mode="json"))
    with open(directory / "links.csv", "w") as f:
        fieldnames = list(Link.model_json_schema()["properties"].keys())
        writer = DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(links)

    data_dest = directory
    data_dest.mkdir(parents=True, exist_ok=True)

    config_json = {
        "title": config.title,
        "description": config.description,
        "organization_name": config.organization_name,
        "organization_nickname": config.organization_nickname,
        "contributor_padding": config.contributor_padding,
        "contributors": config.all_contributors,
        "branding": {
            "primary_color": config.branding.primary_color,
            "secondary_color": config.branding.secondary_color,
            "text_color": config.branding.text_color,
        },
        "plausible_id": os.environ.get("PLAUSIBLE_ID", ""),
    }
    (data_dest / "config.json").write_text(
        json.dumps(config_json, indent=2, ensure_ascii=False)
    )
    print(f"Generated config.json in {data_dest}")

    print("Running Vite build...")
    subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True)
    print(f"Vite build complete, output in {destination}")


@main.command()
@config
@github_token
@click.option(
    "--min-contributors", default=2, help="Minimum core contributors to show a repo"
)
@click.option("--limit", default=50, help="Maximum number of repos to display")
def discover(
    config_path: str | None, github_token: str | None, min_contributors: int, limit: int
) -> None:
    """Discover repositories that core contributors contribute to.

    This command queries GitHub to find repositories that core contributors
    have contributed to, which are not currently in the configuration.
    Repos with more core contributors are likely more relevant to add.
    """
    config = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    if github_token:
        auth: Auth.Auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    github = Github(auth=auth)
    known_repos = set(config.repositories)
    discovered_repos: dict[str, list[str]] = defaultdict(list)

    contributors = config.core_contributors
    print(f"Discovering repos for {len(contributors)} core contributors...")
    print(f"Known repos: {len(known_repos)}")
    print()

    for username, name in contributors.items():
        print(f"  Checking {name} ({username})...", end=" ", flush=True)
        try:
            user = github.get_user(username)

            # Get repos via events (more accurate than get_repos)
            repos_found = 0
            for event in user.get_events():
                if event.type in ("PushEvent", "PullRequestEvent", "IssuesEvent"):
                    repo_name = event.repo.full_name
                    if (
                        repo_name not in known_repos
                        and username not in discovered_repos[repo_name]
                    ):
                        discovered_repos[repo_name].append(username)
                        repos_found += 1
                # Limit events per user to avoid rate limiting
                if repos_found > 100:
                    break
            print(f"found {repos_found} new repos")
        except Exception as e:
            print(f"error: {e}")

    # Sort by number of core contributors (descending)
    sorted_repos = sorted(
        discovered_repos.items(), key=lambda x: len(x[1]), reverse=True
    )

    # Filter by minimum contributors
    filtered_repos = [
        (repo, users) for repo, users in sorted_repos if len(users) >= min_contributors
    ]

    print()
    print("=" * 60)
    print(f"DISCOVERED REPOSITORIES (min {min_contributors} core contributors)")
    print("=" * 60)
    print()

    if not filtered_repos:
        print(f"No repos found with {min_contributors}+ core contributors.")
        print("Try lowering --min-contributors or check GitHub token permissions.")
        return

    for repo, usernames in filtered_repos[:limit]:
        print(f"  {repo}")
        print(f"    Contributors ({len(usernames)}): {', '.join(usernames)}")
        print()

    print("-" * 60)
    print(f"Total: {len(filtered_repos)} repos with {min_contributors}+ contributors")
    print()
    print("To add a repo, append it to the 'repositories' list in config.toml:")
    print('    "owner/repo-name",')
    print()

    # Also output as TOML-ready format
    print("=" * 60)
    print("TOML-READY FORMAT (copy/paste into config.toml):")
    print("=" * 60)
    for repo, _ in filtered_repos[:limit]:
        print(f'    "{repo}",')


@main.command()
@config
def list_contributors(config_path: str | None) -> None:
    """List all configured contributors and their categories."""
    config = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    print("Core Contributors:")
    print("-" * 40)
    for username, name in sorted(config.core_contributors.items(), key=lambda x: x[1]):
        print(f"  {name} (@{username})")

    print()
    print(f"Total Core: {len(config.core_contributors)}")

    if config.alumni_contributors:
        print()
        print("Alumni/Friends (currently enabled):")
        print("-" * 40)
        for username, name in sorted(
            config.alumni_contributors.items(), key=lambda x: x[1]
        ):
            print(f"  {name} (@{username})")
        print()
        print(f"Total Alumni: {len(config.alumni_contributors)}")
