import json
import shutil
from csv import DictWriter
from pathlib import Path

import click
from github import Auth

from .client import Client
from .config import Config
from .models import Link, Repository

ROOT = Path(__file__).absolute().parents[2]
DEFAULT_CONFIG_PATH = "config.toml"
directory = click.argument("directory", type=click.Path(path_type=Path))
config = click.option(
    "-c",
    "--config",
    "config_path",
    type=click.Path(),
    help="Path to the configuration file",
)


@click.group()
def main():
    """Build the contributor network page."""


@main.command()
@directory
@config
@click.option("--github-token", envvar="GITHUB_TOKEN", help="GitHub token")
@click.option(
    "--all-contributors",
    is_flag=True,
    help="Include alumni and friends (not just DevSeed employees)",
)
def data(
    directory: Path,
    config_path: str | None,
    github_token: str | None,
    all_contributors: bool,
):
    """Build the contributor network data."""

    config = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    if github_token:
        auth: Auth.Auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    client = Client(auth, directory)

    # Use all contributors or just DevSeed employees
    contributors = (
        config.all_contributors if all_contributors else config.devseed_contributors
    )
    print(f"Building data for {len(contributors)} contributors")

    for repository in config.repositories:
        print(f"Updating repository: {repository}")
        repo = client.get_repo(repository)
        client.update_repository(repo)
        print(f"Updating links: {repository}")
        client.update_links(repo, contributors)


@main.command()
@directory
@config
@click.option(
    "--all-contributors",
    is_flag=True,
    help="Include alumni and friends (not just DevSeed employees)",
)
def csvs(directory: Path, config_path: str | None, all_contributors: bool) -> None:
    """Write the CSVs."""

    config = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)
    contributors = (
        config.all_contributors if all_contributors else config.devseed_contributors
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


@main.command()
@directory
@click.argument("destination", type=click.Path(path_type=Path))
@config
def build(directory: Path, destination: Path, config_path: str | None) -> None:
    """Build the HTML site."""

    config = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    destination.mkdir(parents=True, exist_ok=True)

    # Copy assets directory structure
    assets_dest = destination / "assets"
    assets_dest.mkdir(parents=True, exist_ok=True)

    # Copy CSS
    css_dest = assets_dest / "css"
    css_dest.mkdir(parents=True, exist_ok=True)
    shutil.copy(ROOT / "assets" / "css" / "style.css", css_dest / "style.css")

    # Copy lib (D3 libraries)
    lib_dest = assets_dest / "lib"
    lib_dest.mkdir(parents=True, exist_ok=True)
    for path in (ROOT / "assets" / "lib").glob("**/*.js"):
        shutil.copy(path, lib_dest / path.name)

    # Copy images
    img_dest = assets_dest / "img"
    img_dest.mkdir(parents=True, exist_ok=True)
    for path in (ROOT / "assets" / "img").glob("**/*.*"):
        shutil.copy(path, img_dest / path.name)

    # Copy data files
    data_dest = assets_dest / "data"
    data_dest.mkdir(parents=True, exist_ok=True)
    for file_name in ["top_contributors.csv", "repositories.csv", "links.csv"]:
        shutil.copy(directory / file_name, data_dest / file_name)

    # Copy JS modules
    js_dest = destination / "js"
    js_dest.mkdir(parents=True, exist_ok=True)
    js_source = ROOT / "js"
    if js_source.exists():
        shutil.copytree(js_source, js_dest, dirs_exist_ok=True)
        print(f"Copied js modules to {js_dest}")
    else:
        print("Warning: js directory not found")

    # Generate config.json from config.toml for runtime loading
    config_json = {
        "title": config.title,
        "author": config.author,
        "description": config.description,
        "organization_name": config.organization_name,
        "contributor_padding": config.contributor_padding,
        "contributors": config.all_contributors,
    }
    (data_dest / "config.json").write_text(
        json.dumps(config_json, indent=2, ensure_ascii=False)
    )
    print(f"Generated config.json in {data_dest}")

    # Copy the single index.html (no more Jinja template rendering)
    shutil.copy(ROOT / "index.html", destination / "index.html")
    print(f"Copied index.html to {destination}")


@main.command()
@config
@click.option("--github-token", envvar="GITHUB_TOKEN", help="GitHub token")
@click.option(
    "--min-contributors", default=2, help="Minimum DevSeed contributors to show a repo"
)
@click.option("--limit", default=50, help="Maximum number of repos to display")
def discover(
    config_path: str | None, github_token: str | None, min_contributors: int, limit: int
) -> None:
    """Discover repositories that DevSeed employees contribute to.

    This command queries GitHub to find repositories that DevSeed employees
    have contributed to, which are not currently in the configuration.
    Repos with more DevSeed contributors are likely more relevant to add.
    """
    from collections import defaultdict

    from github import Github

    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    if github_token:
        auth: Auth.Auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    github = Github(auth=auth)
    known_repos = set(cfg.repositories)
    discovered_repos: dict[str, list[str]] = defaultdict(list)

    contributors = cfg.devseed_contributors
    print(f"Discovering repos for {len(contributors)} DevSeed contributors...")
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

    # Sort by number of DevSeed contributors (descending)
    sorted_repos = sorted(
        discovered_repos.items(), key=lambda x: len(x[1]), reverse=True
    )

    # Filter by minimum contributors
    filtered_repos = [
        (repo, users) for repo, users in sorted_repos if len(users) >= min_contributors
    ]

    print()
    print("=" * 60)
    print(f"DISCOVERED REPOSITORIES (min {min_contributors} DevSeed contributors)")
    print("=" * 60)
    print()

    if not filtered_repos:
        print(f"No repos found with {min_contributors}+ DevSeed contributors.")
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
@click.option("--github-token", envvar="GITHUB_TOKEN", help="GitHub token")
def list_contributors(config_path: str | None, github_token: str | None) -> None:
    """List all configured contributors and their categories."""
    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    print("DevSeed Contributors:")
    print("-" * 40)
    for username, name in sorted(cfg.devseed_contributors.items(), key=lambda x: x[1]):
        print(f"  {name} (@{username})")

    print()
    print(f"Total DevSeed: {len(cfg.devseed_contributors)}")

    if cfg.alumni_contributors:
        print()
        print("Alumni/Friends (currently enabled):")
        print("-" * 40)
        for username, name in sorted(
            cfg.alumni_contributors.items(), key=lambda x: x[1]
        ):
            print(f"  {name} (@{username})")
        print()
        print(f"Total Alumni: {len(cfg.alumni_contributors)}")
