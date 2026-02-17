"""CLI commands for the contributor network visualization.

Workflow overview
-----------------
1. Populate ``repositories.txt`` and ``contributors.csv`` — either
   manually or via ``discover from-repositories`` / ``discover from-contributors``.
2. ``data``  — fetch detailed GitHub data (JSONs) for every repo+contributor.
3. ``csvs``  — convert the JSONs into the three CSVs the frontend needs.
4. ``build`` — assemble the static site.
"""

import csv
import json
import shutil
from collections import defaultdict
from pathlib import Path

import click
from github import Auth

from .client import Client
from .config import Config, ContributorType

ROOT = Path(__file__).absolute().parents[2]
DEFAULT_CONFIG_PATH = "config.toml"

# Shared CLI decorators
directory = click.argument("directory", type=click.Path(path_type=Path))
config_option = click.option(
    "-c",
    "--config",
    "config_path",
    type=click.Path(),
    help="Path to config.toml",
)


# ================================================================
# Top-level group
# ================================================================


@click.group()
def main():
    """Build the contributor network page."""


# ================================================================
# discover  (subgroup)
# ================================================================


@main.group()
def discover():
    """Discover contributors or repositories from GitHub."""


@discover.command("from-repositories")
@config_option
@click.option("--github-token", envvar="GITHUB_TOKEN", help="GitHub token")
@click.option(
    "--min-contributions",
    default=1,
    help="Minimum contributions to include a contributor",
)
def discover_from_repos(
    config_path: str | None,
    github_token: str | None,
    min_contributions: int,
) -> None:
    """Discover contributors for repositories listed in repositories.txt.

    \b
    Workflow:
      1. Read repositories from repositories.txt
      2. Query GitHub for all contributors to each repo
      3. Interactively classify each new contributor as core or community
      4. Save/update contributors.csv
    """
    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)
    repositories = cfg.load_repositories()

    if not repositories:
        click.echo("No repositories found in repositories.txt")
        return

    if github_token:
        auth: Auth.Auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    # We only need a GitHub client — no directory for JSON storage
    from github import Github

    github = Github(auth=auth)

    click.echo(f"Discovering contributors across {len(repositories)} repos...")
    if min_contributions > 1:
        click.echo(f"Minimum contributions threshold: {min_contributions}")

    # Aggregate contributors across all repos
    all_contributors: dict[str, dict] = {}
    for repo_name in repositories:
        click.echo(f"  Scanning {repo_name}...")
        try:
            repo = github.get_repo(repo_name)
            for contributor in repo.get_contributors():
                username = contributor.login
                if username not in all_contributors:
                    all_contributors[username] = {
                        "login": username,
                        "name": contributor.name or username,
                        "total_contributions": contributor.contributions,
                        "repositories": [repo_name],
                    }
                else:
                    existing = all_contributors[username]
                    existing["total_contributions"] += contributor.contributions
                    if repo_name not in existing["repositories"]:
                        existing["repositories"].append(repo_name)
        except Exception as e:
            click.echo(f"  Error scanning {repo_name}: {e}")

    # Filter by minimum contributions
    discovered = [
        c
        for c in all_contributors.values()
        if c["total_contributions"] >= min_contributions
    ]
    click.echo(f"Discovered {len(discovered)} contributors")

    # Load existing contributors to auto-classify known ones
    existing_entries = cfg.load_contributors()
    known_usernames = {e.username: e for e in existing_entries}

    # Interactive classification for unknown contributors
    remaining = [c for c in discovered if c["login"] not in known_usernames]
    remaining.sort(key=lambda c: c["total_contributions"], reverse=True)

    click.echo()
    click.echo("=" * 60)
    click.echo("CONTRIBUTOR CLASSIFICATION")
    click.echo("=" * 60)
    click.echo(
        f"Total discovered: {len(discovered)}  |  "
        f"Already classified: {len(known_usernames)}  |  "
        f"To classify: {len(remaining)}"
    )

    new_entries: list[dict[str, str]] = []
    for contributor in remaining:
        username = contributor["login"]
        name = contributor.get("name", username)
        contributions = contributor["total_contributions"]
        repos = contributor["repositories"]

        click.echo()
        click.echo("-" * 40)
        click.echo(f"  Username:      {username}")
        click.echo(f"  Name:          {name}")
        click.echo(f"  Contributions: {contributions}")
        click.echo(f"  Repositories:  {', '.join(repos[:5])}")
        if len(repos) > 5:
            click.echo(f"                 & {len(repos) - 5} more")

        is_core = click.confirm(f"  Classify {username} as core?", default=False)
        contributor_type = "core" if is_core else "community"
        new_entries.append(
            {"username": username, "type": contributor_type, "name": name}
        )

    # Merge with existing entries and write
    merged: list[dict[str, str]] = [
        {"username": e.username, "type": e.type.value, "name": e.name}
        for e in existing_entries
    ]
    merged.extend(new_entries)

    csv_path = cfg._resolve(cfg.contributors_path)
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["username", "type", "name"])
        writer.writeheader()
        writer.writerows(sorted(merged, key=lambda r: r["username"]))

    core_count = sum(1 for r in merged if r["type"] == "core")
    community_count = len(merged) - core_count
    click.echo()
    click.echo("=" * 60)
    click.echo("CLASSIFICATION COMPLETE")
    click.echo("=" * 60)
    click.echo(f"  Core:      {core_count}")
    click.echo(f"  Community: {community_count}")
    click.echo(f"  Total: {len(merged)}")
    click.echo(f"  Saved to {csv_path}")


@discover.command("from-contributors")
@config_option
@click.option("--github-token", envvar="GITHUB_TOKEN", help="GitHub token")
@click.option(
    "--type",
    "contributor_type",
    type=click.Choice(["core", "all"]),
    default="core",
    help="Which contributors to scan (default: core only)",
)
@click.option(
    "--min-contributors",
    default=2,
    help="Minimum core contributors to include a repo",
)
@click.option("--limit", default=50, help="Maximum number of repos to output")
def discover_from_contributors(
    config_path: str | None,
    github_token: str | None,
    contributor_type: str,
    min_contributors: int,
    limit: int,
) -> None:
    """Discover repositories contributed to by listed contributors.

    \b
    Workflow:
      1. Read contributors from contributors.csv
      2. Filter by type (core or all)
      3. Query GitHub for repos each contributor has contributed to
      4. Save to repositories.txt
    """
    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    if contributor_type == "core":
        contributors = cfg.core_contributors
    else:
        contributors = cfg.all_contributors

    if not contributors:
        click.echo("No contributors found in contributors.csv")
        return

    if github_token:
        auth: Auth.Auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    from github import Github

    github = Github(auth=auth)

    # Read existing repos to distinguish known from new
    existing_repos = set(cfg.load_repositories())
    discovered_repos: dict[str, list[str]] = defaultdict(list)

    click.echo(f"Discovering repos for {len(contributors)} contributors...")
    click.echo(f"Known repos: {len(existing_repos)}")
    click.echo()

    for username, name in contributors.items():
        click.echo(f"  Checking {name} ({username})...", end=" ", flush=True)
        try:
            user = github.get_user(username)
            repos_found = 0
            for event in user.get_events():
                if event.type in ("PushEvent", "PullRequestEvent", "IssuesEvent"):
                    repo_name = event.repo.full_name
                    if (
                        repo_name not in existing_repos
                        and username not in discovered_repos[repo_name]
                    ):
                        discovered_repos[repo_name].append(username)
                        repos_found += 1
                if repos_found > 100:
                    break
            click.echo(f"found {repos_found} new repos")
        except Exception as e:
            click.echo(f"error: {e}")

    # Sort by contributor count
    sorted_repos = sorted(
        discovered_repos.items(), key=lambda x: len(x[1]), reverse=True
    )
    filtered_repos = [
        (repo, users) for repo, users in sorted_repos if len(users) >= min_contributors
    ]

    click.echo()
    click.echo("=" * 60)
    click.echo(f"DISCOVERED REPOSITORIES (min {min_contributors} contributors)")
    click.echo("=" * 60)

    if not filtered_repos:
        click.echo(f"No repos found with {min_contributors}+ contributors.")
        return

    for repo, usernames in filtered_repos[:limit]:
        click.echo(f"  {repo}")
        click.echo(f"    Contributors ({len(usernames)}): {', '.join(usernames)}")

    # Ask whether to append to repositories.txt
    click.echo()
    if click.confirm("Append these to repositories.txt?", default=True):
        repos_path = cfg._resolve(cfg.repositories_path)
        existing_lines = set()
        if repos_path.exists():
            existing_lines = {
                line.strip()
                for line in repos_path.read_text().splitlines()
                if line.strip()
            }
        with open(repos_path, "a") as f:
            added = 0
            for repo, _ in filtered_repos[:limit]:
                if repo not in existing_lines:
                    f.write(repo + "\n")
                    added += 1
        click.echo(f"Added {added} repos to {repos_path}")


# ================================================================
# data
# ================================================================


@main.command()
@directory
@config_option
@click.option("--github-token", envvar="GITHUB_TOKEN", help="GitHub token")
@click.option(
    "--include-community",
    is_flag=True,
    help="Include community (non-core) contributors when fetching link data",
)
@click.option(
    "--fetch-forking-orgs",
    is_flag=True,
    help="Discover which organizations have forked each repo (extra API calls)",
)
def data(
    directory: Path,
    config_path: str | None,
    github_token: str | None,
    include_community: bool,
    fetch_forking_orgs: bool,
) -> None:
    """Fetch contribution data from GitHub into JSON files.

    Reads repositories from repositories.txt and contributors from
    contributors.csv, then fetches detailed commit/link data for each
    contributor-repo pair.
    """
    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)
    repositories = cfg.load_repositories()
    all_entries = cfg.load_contributors()

    # Build the contributor map based on flags
    if include_community:
        contributors = {e.username: e.name for e in all_entries}
    else:
        contributors = {
            e.username: e.name
            for e in all_entries
            if e.type == ContributorType.CORE
        }

    core_usernames = cfg.core_usernames

    if not repositories:
        click.echo("No repositories found in repositories.txt")
        return
    if not contributors:
        click.echo("No contributors found in contributors.csv")
        return

    if github_token:
        auth: Auth.Auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    client = Client(auth, directory)

    click.echo(
        f"Fetching data for {len(repositories)} repos, {len(contributors)} contributors"
    )

    for repository in repositories:
        click.echo(f"Updating repository: {repository}")
        repo = client.get_repo(repository)
        client.update_repository(repo)

        click.echo("  Updating links...")
        client.update_links(
            repo, contributors, core_usernames=core_usernames
        )

        if fetch_forking_orgs:
            client.update_repository_forking_orgs(repo)

    click.echo("Done fetching data.")


# ================================================================
# csvs
# ================================================================


@main.command()
@directory
@config_option
def csvs(directory: Path, config_path: str | None) -> None:
    """Generate visualization CSVs from fetched JSON data.

    Produces top_contributors.csv, repositories.csv, and links.csv
    inside the given DIRECTORY.
    """
    from .models import Link, Repository

    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)
    contributors = cfg.all_contributors

    # Load all link JSONs
    links = []
    for path in (directory / "links").glob("**/*.json"):
        links.append(Link.model_validate_json(path.read_text()).model_dump(mode="json"))

    # Build contributor list with tier: core or community
    all_author_names: dict[str, str] = {}
    for name in contributors.values():
        all_author_names[name] = "core"

    # Community contributors discovered from link data
    for link in links:
        name = link["author_name"]
        if name not in all_author_names:
            all_author_names[name] = link.get("tier", "community")

    core_count = sum(1 for t in all_author_names.values() if t == "core")
    community_count = sum(
        1 for t in all_author_names.values() if t == "community"
    )
    click.echo(
        f"Writing CSVs for {len(all_author_names)} contributors "
        f"({core_count} core, {community_count} community)"
    )

    # top_contributors.csv
    with open(directory / "top_contributors.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["author_name", "tier"])
        writer.writeheader()
        for name, tier in sorted(all_author_names.items()):
            writer.writerow({"author_name": name, "tier": tier})

    # repositories.csv
    repositories = []
    for path in (directory / "repositories").glob("**/*.json"):
        repositories.append(
            Repository.model_validate_json(path.read_text()).model_dump(mode="json")
        )
    with open(directory / "repositories.csv", "w", newline="") as f:
        fieldnames = list(Repository.model_json_schema()["properties"].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(repositories)

    # links.csv — remap tier from author lookup for consistency
    for link in links:
        author = link["author_name"]
        if author in all_author_names:
            link["tier"] = all_author_names[author]
    with open(directory / "links.csv", "w", newline="") as f:
        fieldnames = list(Link.model_json_schema()["properties"].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(links)


# ================================================================
# build
# ================================================================


@main.command()
@directory
@click.argument("destination", type=click.Path(path_type=Path))
@config_option
def build(directory: Path, destination: Path, config_path: str | None) -> None:
    """Build the static HTML site."""
    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    destination.mkdir(parents=True, exist_ok=True)

    # Copy assets
    assets_dest = destination / "assets"
    assets_dest.mkdir(parents=True, exist_ok=True)

    css_dest = assets_dest / "css"
    css_dest.mkdir(parents=True, exist_ok=True)
    shutil.copy(ROOT / "assets" / "css" / "style.css", css_dest / "style.css")

    lib_dest = assets_dest / "lib"
    lib_dest.mkdir(parents=True, exist_ok=True)
    for path in (ROOT / "assets" / "lib").glob("**/*.js"):
        shutil.copy(path, lib_dest / path.name)

    img_dest = assets_dest / "img"
    img_dest.mkdir(parents=True, exist_ok=True)
    for path in (ROOT / "assets" / "img").glob("**/*.*"):
        shutil.copy(path, img_dest / path.name)

    data_dest = assets_dest / "data"
    data_dest.mkdir(parents=True, exist_ok=True)
    for file_name in ["top_contributors.csv", "repositories.csv", "links.csv"]:
        shutil.copy(directory / file_name, data_dest / file_name)

    js_dest = destination / "js"
    js_dest.mkdir(parents=True, exist_ok=True)
    js_source = ROOT / "js"
    if js_source.exists():
        shutil.copytree(js_source, js_dest, dirs_exist_ok=True)
        click.echo(f"Copied js modules to {js_dest}")

    # Generate config.json for the frontend
    config_json = {
        "title": cfg.title,
        "description": cfg.description,
        "organization_name": cfg.organization,
        "contributor_padding": cfg.contributor_padding,
        "contributors": cfg.all_contributors,
        "core_contributors": cfg.core_contributors,
        "visualization": cfg.visualization.model_dump(),
    }
    (data_dest / "config.json").write_text(
        json.dumps(config_json, indent=2, ensure_ascii=False)
    )
    click.echo(f"Generated config.json in {data_dest}")

    shutil.copy(ROOT / "index.html", destination / "index.html")
    click.echo(f"Copied index.html to {destination}")


# ================================================================
# list-contributors
# ================================================================


@main.command()
@config_option
def list_contributors(config_path: str | None) -> None:
    """List all contributors from contributors.csv."""
    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)
    entries = cfg.load_contributors()

    core = [e for e in entries if e.type == ContributorType.CORE]
    community = [e for e in entries if e.type == ContributorType.COMMUNITY]

    click.echo("Core Contributors:")
    click.echo("-" * 40)
    for e in sorted(core, key=lambda x: x.name):
        click.echo(f"  {e.name} (@{e.username})")
    click.echo(f"\nTotal Core: {len(core)}")

    if community:
        click.echo()
        click.echo("Community Contributors:")
        click.echo("-" * 40)
        for e in sorted(community, key=lambda x: x.name):
            click.echo(f"  {e.name} (@{e.username})")
        click.echo(f"\nTotal Community: {len(community)}")
