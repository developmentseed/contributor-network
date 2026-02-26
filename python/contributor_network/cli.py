"""CLI commands for the contributor network visualization.

Workflow overview
-----------------
1. Edit ``config.toml`` — or use ``bootstrap`` to generate one.
2. ``build`` — fetch GitHub data, generate CSVs, and assemble the static site.
"""

import csv
import json
import re
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Any

import click
from github import Auth

from .client import Client
from .config import Config, ContributorType
from .models import Link, Repository

ROOT = Path(__file__).absolute().parents[2]
DEFAULT_CONFIG_PATH = "config.toml"

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
@click.option(
    "--classify",
    is_flag=True,
    help="Interactively classify each new contributor as core or community"
    " (default: auto-assign community)",
)
def discover_from_repos(
    config_path: str | None,
    github_token: str | None,
    min_contributions: int,
    classify: bool,
) -> None:
    """Discover community contributors from tracked repositories.

    \b
    Scans each repository for contributors not yet in config.toml
    and prints them. Use --classify to interactively decide core
    vs community for each.
    """
    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)
    repositories = cfg.load_repositories()

    if not repositories:
        click.echo("No repositories in config.toml")
        return

    if github_token:
        auth: Auth.Auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    from github import Github

    github = Github(auth=auth)

    click.echo(f"Discovering contributors across {len(repositories)} repos...")
    if min_contributions > 1:
        click.echo(f"Minimum contributions threshold: {min_contributions}")

    all_found: dict[str, dict[str, Any]] = {}
    for repo_name in repositories:
        click.echo(f"  Scanning {repo_name}...")
        try:
            repo = github.get_repo(repo_name)
            for contributor in repo.get_contributors():
                username = contributor.login
                if username not in all_found:
                    all_found[username] = {
                        "login": username,
                        "name": contributor.name or username,
                        "total_contributions": contributor.contributions,
                        "repositories": [repo_name],
                    }
                else:
                    existing = all_found[username]
                    existing["total_contributions"] += contributor.contributions
                    if repo_name not in existing["repositories"]:
                        existing["repositories"].append(repo_name)
        except Exception as e:
            click.echo(f"  Error scanning {repo_name}: {e}")

    discovered = [
        c for c in all_found.values() if c["total_contributions"] >= min_contributions
    ]
    click.echo(f"Discovered {len(discovered)} contributors")

    known_usernames = set(cfg.all_contributors.keys())
    remaining = [c for c in discovered if c["login"] not in known_usernames]
    remaining.sort(key=lambda c: c["total_contributions"], reverse=True)

    if not remaining:
        click.echo("No new contributors found.")
        return

    click.echo()
    click.echo("=" * 60)
    if classify:
        click.echo("CONTRIBUTOR CLASSIFICATION")
    else:
        click.echo("NEW COMMUNITY CONTRIBUTORS")
    click.echo("=" * 60)
    click.echo(
        f"Total discovered: {len(discovered)}  |  "
        f"Already known: {len(known_usernames)}  |  "
        f"New: {len(remaining)}"
    )

    for c in remaining:
        username = c["login"]
        name = c.get("name", username)
        contributions = c["total_contributions"]
        repos = c["repositories"]

        if classify:
            click.echo()
            click.echo("-" * 40)
            click.echo(f"  Username:      {username}")
            click.echo(f"  Name:          {name}")
            click.echo(f"  Contributions: {contributions}")
            click.echo(f"  Repositories:  {', '.join(repos[:5])}")
        else:
            click.echo(f"  {username} ({name}) — {contributions} contributions")

    click.echo()
    click.echo("Add these to [contributors.community] in config.toml.")


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
    Scans GitHub events for each contributor and finds repos not yet
    in config.toml.
    """
    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    if contributor_type == "core":
        contributors = cfg.core_contributors
    else:
        contributors = cfg.all_contributors

    if not contributors:
        click.echo("No contributors in config.toml")
        return

    if github_token:
        auth: Auth.Auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    from github import Github

    github = Github(auth=auth)

    existing_repos = set(cfg.load_repositories())
    discovered_repos: dict[str, list[str]] = defaultdict(list)

    click.echo(f"Discovering repos for {len(contributors)} contributors...")
    click.echo(f"Known repos: {len(existing_repos)}")
    click.echo()

    for username, name in contributors.items():
        click.echo(f"  Checking {name} ({username})...", nl=False)
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
            click.echo(f" found {repos_found} new repos")
        except Exception as e:
            click.echo(f" error: {e}")

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

    click.echo()
    click.echo("Add these to 'repositories' in config.toml:")
    for repo, _ in filtered_repos[:limit]:
        click.echo(f'    "{repo}",')


# ================================================================
# build  (unified: fetch + csvs + assemble)
# ================================================================


def _fetch_data(
    cfg: Config,
    data_dir: Path,
    github_token: str | None,
    all_contributors: bool,
    fetch_forking_orgs: bool = False,
) -> None:
    """Fetch contribution data from GitHub into JSON files."""
    repositories = cfg.load_repositories()
    contributors = cfg.all_contributors if all_contributors else cfg.core_contributors
    core_usernames = cfg.core_usernames

    if not repositories:
        click.echo("No repositories in config.toml")
        return
    if not contributors:
        click.echo("No contributors in config.toml")
        return

    if github_token:
        auth: Auth.Auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    client = Client(auth, data_dir)

    click.echo(
        f"Fetching data for {len(repositories)} repos, {len(contributors)} contributors"
    )

    for repository in repositories:
        click.echo(f"Updating repository: {repository}")
        repo = client.get_repo(repository)
        client.update_repository(repo)

        click.echo("  Updating links...")
        client.update_links(repo, contributors, core_usernames=core_usernames)

        if fetch_forking_orgs:
            client.update_repository_forking_orgs(repo)

    click.echo("Done fetching data.")


def _generate_csvs(cfg: Config, data_dir: Path) -> None:
    """Generate visualization CSVs and config.json from fetched JSON data."""
    core_names = set(cfg.core_contributors.values())

    links = []
    for path in (data_dir / "links").glob("**/*.json"):
        links.append(Link.model_validate_json(path.read_text()).model_dump(mode="json"))

    for link in links:
        if link["author_name"] in core_names:
            link["tier"] = "core"
        else:
            link["tier"] = "community"

    core_count = sum(1 for lnk in links if lnk["tier"] == "core")
    community_count = sum(1 for lnk in links if lnk["tier"] == "community")
    unique_authors = {lnk["author_name"] for lnk in links}
    click.echo(
        f"Writing CSVs: {len(unique_authors)} contributors "
        f"({core_count} core links, {community_count} community links)"
    )

    repositories = []
    for path in (data_dir / "repositories").glob("**/*.json"):
        repositories.append(
            Repository.model_validate_json(path.read_text()).model_dump(mode="json")
        )
    with open(data_dir / "repositories.csv", "w", newline="") as f:
        fieldnames = list(Repository.model_json_schema()["properties"].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(repositories)

    with open(data_dir / "links.csv", "w", newline="") as f:
        fieldnames = list(Link.model_json_schema()["properties"].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(links)

    config_json = {
        "title": cfg.title,
        "description": cfg.description,
        "organization_name": cfg.organization_name,
        "contributor_padding": cfg.contributor_padding,
        "contributors": cfg.all_contributors,
        "core_contributors": cfg.core_contributors,
        "visualization": cfg.visualization.model_dump(),
    }
    (data_dir / "config.json").write_text(
        json.dumps(config_json, indent=2, ensure_ascii=False)
    )
    click.echo(f"Generated config.json in {data_dir}")


def _assemble_site(cfg: Config, data_dir: Path, destination: Path) -> None:
    """Copy assets, data, JS, and HTML into the output directory."""
    destination.mkdir(parents=True, exist_ok=True)

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
    for name in (
        "top_contributors.csv",
        "repositories.csv",
        "links.csv",
        "config.json",
    ):
        src = data_dir / name
        if src.exists():
            shutil.copy(src, data_dest / name)

    js_dest = destination / "js"
    js_dest.mkdir(parents=True, exist_ok=True)
    js_source = ROOT / "js"
    if js_source.exists():
        shutil.copytree(js_source, js_dest, dirs_exist_ok=True)
        click.echo(f"Copied js modules to {js_dest}")

    shutil.copy(ROOT / "index.html", destination / "index.html")
    click.echo(f"Copied site to {destination}")


@main.command()
@click.argument(
    "destination",
    type=click.Path(path_type=Path),
    default="dist",
    required=False,
)
@config_option
@click.option(
    "-d",
    "--data-dir",
    type=click.Path(path_type=Path),
    default=ROOT / "assets" / "data",
    show_default=True,
    help="Directory for intermediate JSON and CSV data",
)
@click.option("--github-token", envvar="GITHUB_TOKEN", help="GitHub token")
@click.option(
    "--all-contributors",
    is_flag=True,
    help="Include all contributor groups when fetching link data",
)
@click.option(
    "--fetch-forking-orgs",
    is_flag=True,
    help="Discover which organizations have forked each repo (extra API calls)",
)
@click.option(
    "--skip-fetch",
    is_flag=True,
    help="Skip the GitHub API fetch step (reuse existing JSON data)",
)
@click.option(
    "--csvs-only",
    is_flag=True,
    help="Only regenerate CSVs from existing data",
)
def build(
    destination: Path,
    config_path: str | None,
    data_dir: Path,
    github_token: str | None,
    all_contributors: bool,
    fetch_forking_orgs: bool,
    skip_fetch: bool,
    csvs_only: bool,
) -> None:
    """Fetch data, generate CSVs, and build the static site.

    \b
    Steps:
      1. Fetch contribution data from GitHub (skip with --skip-fetch)
      2. Generate repositories.csv and links.csv from JSON data
      3. Assemble the static site into DESTINATION

    Use --csvs-only to quickly regenerate CSVs after editing config.toml.
    """
    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    dest = Path(destination)
    if not dest.is_absolute():
        dest = Path.cwd() / dest

    if csvs_only:
        _generate_csvs(cfg, data_dir)
        click.echo(f"Data updated in {data_dir}/")
        return

    if skip_fetch:
        click.echo("Skipping GitHub fetch (--skip-fetch)")
    else:
        _fetch_data(cfg, data_dir, github_token, all_contributors, fetch_forking_orgs)

    _generate_csvs(cfg, data_dir)

    _assemble_site(cfg, data_dir, dest)

    click.echo()
    click.echo(f"Build complete! Site written to {dest}/")
    click.echo(f"Preview: cd {dest} && python3 -m http.server 8000")


# ================================================================
# list-contributors
# ================================================================


@main.command()
@config_option
def list_contributors(config_path: str | None) -> None:
    """List all contributors from config.toml."""
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


# ================================================================
# bootstrap
# ================================================================

TOML_TEMPLATE = """\
author = ""
description = ""
organization = "{organization}"
{repos_section}
[contributors.core]
{contributors_section}
"""


def _detect_format(path: Path) -> str:
    """Detect whether a file contains repos or contributors."""
    with open(path) as f:
        first_line = f.readline().strip()
    if "," in first_line:
        return "contributors"
    if re.match(r"^[\w.-]+/[\w.-]+$", first_line):
        return "repos"
    return "contributors" if "," in path.read_text() else "repos"


def _read_repos_file(path: Path) -> list[str]:
    repos: list[str] = []
    with open(path) as f:
        for line in f:
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                repos.append(stripped)
    return repos


def _read_contributors_file(path: Path) -> dict[str, str]:
    contributors: dict[str, str] = {}
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            username = row.get("username", "").strip()
            name = row.get("name", username).strip()
            if username:
                contributors[username] = name
    return contributors


@main.command()
@click.argument("infile", type=click.Path(exists=True, path_type=Path))
@click.option(
    "-o",
    "--output",
    "output_path",
    type=click.Path(path_type=Path),
    default="config.toml",
    show_default=True,
    help="Path for the generated config.toml",
)
@click.option(
    "--organization",
    "--org",
    "organization",
    default="My Organization",
    show_default=True,
    help="Organization name used for chart heading and page title",
)
def bootstrap(infile: Path, output_path: Path, organization: str) -> None:
    """Generate a config.toml from a list of repos or contributors.

    \b
    INFILE can be:
      - A repos file: one owner/repo per line
      - A contributors CSV: username,type,name (header required)

    The format is auto-detected. After bootstrapping, run
    'discover' to fill in the other side.
    """
    fmt = _detect_format(infile)

    if fmt == "repos":
        repos = _read_repos_file(infile)
        repos_lines = "repositories = [\n"
        for r in repos:
            repos_lines += f'    "{r}",\n'
        repos_lines += "]"
        contributors_section = (
            '# Run "contributor-network discover" to find contributors'
        )
        click.echo(f"Detected repos file with {len(repos)} repositories")
    else:
        contributors = _read_contributors_file(infile)
        repos_lines = (
            "repositories = [\n"
            '    # Run "contributor-network discover" to find repositories\n'
            "]"
        )
        contrib_lines: list[str] = []
        for username, name in contributors.items():
            contrib_lines.append(f'{username} = "{name}"')
        contributors_section = "\n".join(contrib_lines) if contrib_lines else ""
        click.echo(f"Detected contributors file with {len(contributors)} contributors")

    content = TOML_TEMPLATE.format(
        organization=organization,
        repos_section=repos_lines,
        contributors_section=contributors_section,
    )

    output_path.write_text(content)
    click.echo(f"Wrote {output_path}")
    click.echo()
    if fmt == "repos":
        click.echo("Next: run 'contributor-network discover' to find contributors")
    else:
        click.echo("Next: run 'contributor-network discover' to find repositories")
