import json
import shutil
from csv import DictWriter
from pathlib import Path

import click
from github import Auth

from .client import Client
from .config import Config, DiscoveryMode
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


# ================================================================
# Helper functions for the repository-first interactive workflow
# ================================================================


def interactive_sponsorship_classification(
    contributors: list[dict],
    known_sponsored: set[str],
) -> list[str]:
    """Interactively classify contributors as sponsored or community.

    Contributors already in the known_sponsored set are auto-classified
    and skipped in the interactive prompt.

    Args:
        contributors: List of contributor dicts from
            ``Client.discover_contributors_for_repositories()``.
        known_sponsored: Set of GitHub usernames already configured
            as sponsored in config.toml.

    Returns:
        List of GitHub usernames the user confirmed as sponsored
        (includes previously-known ones).
    """
    sponsored: list[str] = list(known_sponsored)

    # Sort by total contributions descending so the most active appear first
    remaining = [c for c in contributors if c["login"] not in known_sponsored]
    remaining.sort(key=lambda c: c["total_contributions"], reverse=True)

    click.echo()
    click.echo("=" * 60)
    click.echo("CONTRIBUTOR CLASSIFICATION")
    click.echo("=" * 60)
    click.echo(
        f"Total discovered: {len(contributors)}  |  "
        f"Already sponsored: {len(known_sponsored)}  |  "
        f"To classify: {len(remaining)}"
    )

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

        is_sponsored = click.confirm(
            f"  Classify {username} as sponsored?", default=False
        )
        if is_sponsored:
            sponsored.append(username)

    # Summary
    newly_added = len(sponsored) - len(known_sponsored)
    click.echo()
    click.echo("=" * 60)
    click.echo("CLASSIFICATION SUMMARY")
    click.echo("=" * 60)
    click.echo(f"  Previously sponsored: {len(known_sponsored)}")
    click.echo(f"  Newly sponsored:      {newly_added}")
    click.echo(f"  Total sponsored:      {len(sponsored)}")
    click.echo(f"  Community:            {len(contributors) - len(sponsored)}")

    return sponsored


def update_config_with_sponsored_contributors(
    config_path: str,
    sponsored_usernames: list[str],
    contributor_names: dict[str, str],
) -> None:
    """Add newly-classified sponsored contributors to [contributors.core].

    Reads the existing config to find which usernames are already in the
    ``[contributors.core]`` section, then appends only the new ones.

    Args:
        config_path: Path to the config.toml file.
        sponsored_usernames: List of GitHub usernames classified as
            sponsored.
        contributor_names: Mapping of username -> display name from
            the discovery results.
    """
    import tomllib

    path = Path(config_path)

    # Parse existing core usernames
    with open(path, "rb") as f:
        data = tomllib.load(f)
    existing_core = set(data.get("contributors", {}).get("core", {}).keys())

    new_usernames = [u for u in sponsored_usernames if u not in existing_core]

    if not new_usernames:
        click.echo("No new core contributors to add to config.toml")
        return

    # Append new entries under [contributors.core]
    # We append after the last line of the file; TOML allows additional
    # keys for an already-opened table as long as we don't re-declare it.
    lines = []
    for username in sorted(new_usernames):
        display = contributor_names.get(username, username)
        lines.append(f'{username} = "{display}"')

    # Read file, find the [contributors.core] section, and insert after
    # its last key so the TOML stays well-formed.
    existing_lines = path.read_text().splitlines()
    insert_idx = None
    in_core_section = False

    for i, line in enumerate(existing_lines):
        stripped = line.strip()
        if stripped == "[contributors.core]":
            in_core_section = True
            insert_idx = i + 1
            continue
        if in_core_section:
            # Another section header ends [contributors.core]
            if stripped.startswith("["):
                break
            # Track the last non-empty line in the section
            if stripped and not stripped.startswith("#"):
                insert_idx = i + 1

    if insert_idx is not None:
        for j, new_line in enumerate(lines):
            existing_lines.insert(insert_idx + j, new_line)
        path.write_text("\n".join(existing_lines) + "\n")
    else:
        # Fallback: [contributors.core] not found, append it
        with open(path, "a") as f:
            f.write("\n[contributors.core]\n")
            f.write("\n".join(lines) + "\n")

    click.echo(f"Added {len(new_usernames)} core contributors to {path.name}")


# ================================================================
# CLI Commands
# ================================================================


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
    help="Include alumni and friends (not just core contributors)",
)
@click.option(
    "--include-community",
    is_flag=True,
    help="Also discover and include community (non-sponsored) contributors",
)
@click.option(
    "--max-community-per-repo",
    default=50,
    help="Maximum community contributors to discover per repo",
)
@click.option(
    "--mode",
    type=click.Choice(["repository", "contributor"]),
    default=None,
    help="Override the discovery mode from config.toml",
)
@click.option(
    "--min-contributions",
    default=1,
    help="Minimum contributions to include a contributor (repository mode)",
)
def data(
    directory: Path,
    config_path: str | None,
    github_token: str | None,
    all_contributors: bool,
    include_community: bool,
    max_community_per_repo: int,
    mode: str | None,
    min_contributions: int,
):
    """Build the contributor network data.

    Supports two workflows:

    \b
    repository mode (set via config.toml or --mode):
      1. Discovers ALL contributors across tracked repos
      2. Prompts you to classify each as sponsored or community
      3. Updates config.toml with new sponsored contributors
      4. Fetches detailed link data for every contributor

    \b
    contributor mode (default):
      Existing workflow — fetches data for configured contributors only.
      Use --include-community to also discover community contributors.
    """

    resolved_config_path = config_path or DEFAULT_CONFIG_PATH
    cfg = Config.from_toml(resolved_config_path)

    # Allow CLI --mode to override config.toml
    if mode is not None:
        cfg.discovery.mode = DiscoveryMode(mode)

    if github_token:
        auth: Auth.Auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    client = Client(auth, directory)
    effective_fetch_forking_orgs = cfg.discovery.fetch_forking_orgs

    print(f"Mode: {cfg.discovery_mode.value}")

    # ============================================================
    # Repository-first workflow
    # ============================================================
    if cfg.is_repository_mode:
        print(f"Discovering contributors across {len(cfg.repositories)} repos...")
        if min_contributions > 1:
            print(f"Minimum contributions threshold: {min_contributions}")

        # Phase 1: Batch discover all contributors
        discovered = client.discover_contributors_for_repositories(
            cfg.repositories, min_contributions=min_contributions
        )
        print(f"Discovered {len(discovered)} contributors")

        # Phase 2: Interactive classification
        known_sponsored = cfg.sponsored_usernames
        sponsored_usernames_list = interactive_sponsorship_classification(
            discovered, known_sponsored
        )
        sponsored_set = set(sponsored_usernames_list)

        # Phase 3: Update config.toml with newly classified sponsors
        contributor_names = {c["login"]: c["name"] for c in discovered}
        update_config_with_sponsored_contributors(
            resolved_config_path, sponsored_usernames_list, contributor_names
        )

        # Phase 4: Fetch detailed link data for every repo + contributor
        # We iterate repo.get_contributors() (not get_user()) because
        # only the contributors endpoint provides contribution counts.
        for repository in cfg.repositories:
            print(f"Updating repository: {repository}")
            repo = client.get_repo(repository)
            client.update_repository(repo)

            # Build a lookup of discovered contributors for this repo
            repo_contributor_names = {
                c["login"]: c["name"]
                for c in discovered
                if repository in c["repositories"]
            }

            print(f"  Updating links for {len(repo_contributor_names)} contributors")
            try:
                for gh_contributor in repo.get_contributors():
                    username = gh_contributor.login
                    if username not in repo_contributor_names:
                        continue
                    display_name = repo_contributor_names[username]
                    tier = "sponsored" if username in sponsored_set else "community"
                    try:
                        client.update_link(
                            repo, gh_contributor, display_name, tier=tier
                        )
                    except Exception as e:
                        print(f"  Skipping {username}: {e}")
            except Exception as e:
                print(f"  Error fetching contributors for {repository}: {e}")

            if effective_fetch_forking_orgs:
                client.update_repository_forking_orgs(repo)

    # ============================================================
    # Contributor-first workflow (existing behavior)
    # ============================================================
    else:
        contributors = (
            cfg.all_contributors if all_contributors else cfg.core_contributors
        )
        sponsored_usernames = cfg.sponsored_usernames
        effective_include_community = include_community

        print(f"Building data for {len(contributors)} core contributors")
        if effective_include_community:
            print("Community contributor discovery enabled")
        if effective_fetch_forking_orgs:
            print("Forking organization discovery enabled")

        for repository in cfg.repositories:
            print(f"Updating repository: {repository}")
            repo = client.get_repo(repository)
            client.update_repository(repo)
            print(f"Updating links: {repository}")
            client.update_links(
                repo, contributors, sponsored_usernames=sponsored_usernames
            )

            if effective_include_community:
                known_usernames = set(contributors.keys())
                community = client.discover_community_contributors(
                    repo,
                    known_usernames,
                    max_community=max_community_per_repo,
                )
                if community:
                    print(f"  Discovered {len(community)} community contributors")
                    client.update_community_links(repo, community)

            if effective_fetch_forking_orgs:
                client.update_repository_forking_orgs(repo)


@main.command()
@directory
@config
@click.option(
    "--all-contributors",
    is_flag=True,
    help="Include alumni and friends (not just core contributors)",
)
def csvs(directory: Path, config_path: str | None, all_contributors: bool) -> None:
    """Write the CSVs.

    Generates:
    - top_contributors.csv: contributor names and tier (sponsored/community)
    - repositories.csv: repository metadata
    - links.csv: contributor-to-repo links with tier field
    """

    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)
    contributors = cfg.all_contributors if all_contributors else cfg.core_contributors
    # Load all links to discover community contributor names
    links = []
    for path in (directory / "links").glob("**/*.json"):
        links.append(Link.model_validate_json(path.read_text()).model_dump(mode="json"))

    # Build the full contributor list: sponsored + community (from link data)
    # Sponsored contributors come from the config
    all_author_names: dict[str, str] = {}  # author_name -> tier
    for name in contributors.values():
        all_author_names[name] = "sponsored"

    # Community contributors are discovered from link data
    for link in links:
        name = link["author_name"]
        if name not in all_author_names:
            all_author_names[name] = link.get("tier", "community")

    sponsored_count = sum(1 for t in all_author_names.values() if t == "sponsored")
    community_count = sum(1 for t in all_author_names.values() if t == "community")
    print(
        f"Writing CSVs for {len(all_author_names)} contributors "
        f"({sponsored_count} sponsored, {community_count} community)"
    )

    # Write top_contributors.csv with tier column
    with open(directory / "top_contributors.csv", "w") as f:
        writer = DictWriter(f, fieldnames=["author_name", "tier"])
        writer.writeheader()
        for name, tier in sorted(all_author_names.items()):
            writer.writerow({"author_name": name, "tier": tier})

    # Write repositories.csv (unchanged)
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

    # Write links.csv (now includes tier field via the model)
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

    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

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
        "title": cfg.title,
        "author": cfg.author,
        "description": cfg.description,
        "organization_name": cfg.organization_name,
        "contributor_padding": cfg.contributor_padding,
        "contributors": cfg.all_contributors,
        "sponsored_contributors": cfg.sponsored_contributors,
        "discovery_mode": cfg.discovery_mode.value,
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

    contributors = cfg.core_contributors
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
@click.option("--github-token", envvar="GITHUB_TOKEN", help="GitHub token")
def list_contributors(config_path: str | None, github_token: str | None) -> None:
    """List all configured contributors and their categories."""
    cfg = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    print("Core Contributors:")
    print("-" * 40)
    for username, name in sorted(cfg.core_contributors.items(), key=lambda x: x[1]):
        print(f"  {name} (@{username})")

    print()
    print(f"Total Core: {len(cfg.core_contributors)}")

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
