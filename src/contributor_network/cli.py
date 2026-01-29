import datetime
import shutil
from csv import DictWriter
from pathlib import Path

import click
from github import Auth
from jinja2 import Environment, FileSystemLoader

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
@click.option("--all-contributors", is_flag=True, help="Include alumni and friends (not just DevSeed employees)")
def data(directory: Path, config_path: str | None, github_token: str | None, all_contributors: bool):
    """Build the contributor network data."""

    config = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    if github_token:
        auth: Auth.Auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    client = Client(auth, directory)

    # Use all contributors or just DevSeed employees
    contributors = config.all_contributors if all_contributors else config.devseed_contributors
    print(f"Building data for {len(contributors)} contributors (DevSeed only: {not all_contributors})")

    for repository in config.repositories:
        print(f"Updating repository: {repository}")
        repo = client.get_repo(repository)
        client.update_repository(repo)
        print(f"Updating links: {repository}")
        client.update_links(repo, contributors)


@main.command()
@directory
@config
@click.option("--all-contributors", is_flag=True, help="Include alumni and friends (not just DevSeed employees)")
def csvs(directory: Path, config_path: str | None, all_contributors: bool) -> None:
    """Write the CSVs."""

    config = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)
    contributors = config.all_contributors if all_contributors else config.devseed_contributors
    authors = list(contributors.values())
    print(f"Writing CSVs for {len(authors)} contributors (DevSeed only: {not all_contributors})")

    (directory / "top_contributors.csv").write_text(
        "\n".join(["author_name"] + authors)
    )

    repositories = [
        Repository(
            repo=config.central_repository,
            repo_stars=0,
            repo_forks=0,
            repo_createdAt=datetime.datetime.now(),
            repo_updatedAt=datetime.datetime.now(),
            repo_total_commits=0,
            repo_url="https://github.com/developmentseed/contributor-network",
            repo_description=config.description,
            repo_languages="",
        ).model_dump(mode="json")
    ]
    for path in (directory / "repositories").glob("**/*.json"):
        repositories.append(
            Repository.model_validate_json(path.read_text()).model_dump(mode="json")
        )
    with open(directory / "repositories.csv", "w") as f:
        fieldnames = list(Repository.model_json_schema()["properties"].keys())
        writer = DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(repositories)

    links = [
        Link(
            author_name=name,
            repo=config.central_repository,
            commit_count=1,
            commit_sec_min=int(datetime.datetime.now().timestamp()),
            commit_sec_max=int(datetime.datetime.now().timestamp()),
        ).model_dump(mode="json")
        for name in contributors.values()
    ]
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
    for file_name in ["top_contributors.csv", "repositories.csv", "links.csv"]:
        shutil.copy(directory / file_name, destination / file_name)
    shutil.copy(ROOT / "index.js", destination / "index.js")
    shutil.copy(ROOT / "css" / "style.css", destination / "style.css")
    for path in (ROOT / "lib").glob("**/*.js"):
        shutil.copy(path, destination / path.name)
    for path in (ROOT / "img").glob("**/*.*"):
        shutil.copy(path, destination / path.name)

    environment = Environment(loader=FileSystemLoader(ROOT / "templates"))
    template = environment.get_template("index.html.jinja")
    (destination / "index.html").write_text(
        template.render(
            title=config.title,
            author=config.author,
            description=config.description,
            central_repository=config.central_repository,
            contributor_padding=config.contributor_padding,
        )
    )


@main.command()
@config
@click.option("--github-token", envvar="GITHUB_TOKEN", help="GitHub token")
@click.option("--min-contributors", default=2, help="Minimum DevSeed contributors to show a repo")
@click.option("--limit", default=50, help="Maximum number of repos to display")
def discover(config_path: str | None, github_token: str | None, min_contributors: int, limit: int) -> None:
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

            # Get repos the user has contributed to via events (more accurate than get_repos)
            repos_found = 0
            for event in user.get_events():
                if event.type in ("PushEvent", "PullRequestEvent", "IssuesEvent"):
                    repo_name = event.repo.full_name
                    if repo_name not in known_repos and username not in discovered_repos[repo_name]:
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
        discovered_repos.items(),
        key=lambda x: len(x[1]),
        reverse=True
    )

    # Filter by minimum contributors
    filtered_repos = [(repo, users) for repo, users in sorted_repos if len(users) >= min_contributors]

    print()
    print("=" * 60)
    print(f"DISCOVERED REPOSITORIES (min {min_contributors} DevSeed contributors)")
    print("=" * 60)
    print()

    if not filtered_repos:
        print(f"No repositories found with at least {min_contributors} DevSeed contributors.")
        print("Try lowering --min-contributors or check if the GitHub token has sufficient permissions.")
        return

    for repo, usernames in filtered_repos[:limit]:
        print(f"  {repo}")
        print(f"    Contributors ({len(usernames)}): {', '.join(usernames)}")
        print()

    print("-" * 60)
    print(f"Total: {len(filtered_repos)} repos with {min_contributors}+ DevSeed contributors")
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
        for username, name in sorted(cfg.alumni_contributors.items(), key=lambda x: x[1]):
            print(f"  {name} (@{username})")
        print()
        print(f"Total Alumni: {len(cfg.alumni_contributors)}")
