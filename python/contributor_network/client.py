from pathlib import Path

from github import Github
from github.Auth import Auth
from github.GithubException import GithubException, RateLimitExceededException
from github.NamedUser import NamedUser
from github.Repository import Repository as Repo

from .models import Link, Repository


class Client:
    """A client for fetching repos and commit information from Github."""

    def __init__(self, auth: Auth, directory: Path) -> None:
        self.github = Github(auth=auth)
        self.directory = directory.absolute()

    def get_repo(self, repository_name: str) -> Repo:
        """Get a Github repository by name."""
        return self.github.get_repo(repository_name)

    def update_repository(self, repo: Repo) -> None:
        """Update the data for a single repository."""
        repository = Repository.from_github(repo)
        path = self.directory / "repositories" / (repo.full_name + ".json")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(repository.model_dump_json())

    def update_links(
        self,
        repo: Repo,
        contributors: dict[str, str],
        *,
        core_usernames: set[str] | None = None,
    ) -> None:
        """Update the links for a single repository.

        Args:
            repo: GitHub repository object
            contributors: Map of username -> display name for known contributors
            core_usernames: Set of usernames classified as "core".
                If provided, links are tagged with tier="core" or "community".
                If None, all links default to tier="core".
        """
        core_count = 0
        for contributor in repo.get_contributors():
            if contributor_name := contributors.get(contributor.login):
                tier = "core"
                if core_usernames is not None:
                    tier = (
                        "core"
                        if contributor.login in core_usernames
                        else "community"
                    )
                self.update_link(repo, contributor, contributor_name, tier=tier)
                core_count += 1

        # Update repository with community stats
        self.update_repository_community_stats(repo.full_name, core_count)

    def discover_contributors_for_repositories(
        self,
        repositories: list[str],
        *,
        min_contributions: int = 1,
    ) -> list[dict]:
        """Discover contributors across multiple repositories.

        Aggregates contributor data across all listed repositories,
        tracking total contributions and which repos each person
        contributed to.

        Args:
            repositories: List of repository full names (e.g., "owner/repo")
            min_contributions: Minimum total contributions to include

        Returns:
            List of contributor dicts, each with keys:
            - login: GitHub username
            - name: Display name (GitHub name or login fallback)
            - total_contributions: Sum of contributions across all repos
            - repositories: List of repo full names contributed to
        """
        all_contributors: dict[str, dict] = {}

        for repo_name in repositories:
            try:
                repo = self.github.get_repo(repo_name)
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
            except RateLimitExceededException:
                print(f"  Rate limit hit discovering contributors for {repo_name}")
            except GithubException as e:
                print(f"  Error discovering contributors for {repo_name}: {e}")

        # Filter by minimum contributions
        return [
            c
            for c in all_contributors.values()
            if c["total_contributions"] >= min_contributions
        ]

    def discover_community_contributors(
        self,
        repo: Repo,
        known_usernames: set[str],
        *,
        max_community: int = 100,
    ) -> list[tuple[NamedUser, str]]:
        """Discover contributors to a repo who are not in the known set.

        Iterates over the repo's contributor list from the GitHub API and
        returns contributors whose login is not in known_usernames.

        Args:
            repo: GitHub repository object
            known_usernames: Set of usernames already configured (core)
            max_community: Maximum community contributors to return per repo

        Returns:
            List of (NamedUser, display_name) tuples for community contributors.
            The display_name is the user's GitHub name or login as fallback.
        """
        community: list[tuple[NamedUser, str]] = []
        try:
            for contributor in repo.get_contributors():
                if contributor.login in known_usernames:
                    continue
                display_name = contributor.name or contributor.login
                community.append((contributor, display_name))
                if len(community) >= max_community:
                    break
        except RateLimitExceededException:
            print(f"  Rate limit hit discovering contributors for {repo.full_name}")
        except GithubException as e:
            print(f"  Error discovering contributors for {repo.full_name}: {e}")
        return community

    def update_community_links(
        self,
        repo: Repo,
        community_contributors: list[tuple[NamedUser, str]],
    ) -> None:
        """Create/update link data for community contributors.

        Args:
            repo: GitHub repository object
            community_contributors: List of (NamedUser, display_name) tuples
        """
        for contributor, display_name in community_contributors:
            try:
                self.update_link(repo, contributor, display_name, tier="community")
            except GithubException as e:
                print(f"  Skipping community contributor {contributor.login}: {e}")

    def update_repository_community_stats(
        self, repo_full_name: str, core_count: int
    ) -> None:
        """Update the community stats for a repository after processing contributors."""
        path = self.directory / "repositories" / (repo_full_name + ".json")
        if path.exists():
            repository = Repository.model_validate_json(path.read_text())
            repository.update_community_stats(core_count)
            path.write_text(repository.model_dump_json())

    def discover_forking_organizations(self, repo: Repo) -> list[str]:
        """Discover organizations that have forked this repository.

        Iterates the fork list and collects unique organization logins.

        Args:
            repo: GitHub repository object

        Returns:
            Sorted list of unique organization names that have forked the repo.
        """
        org_names: list[str] = []
        try:
            for fork in repo.get_forks():
                if fork.owner.type == "Organization":
                    org_names.append(fork.owner.login)
        except RateLimitExceededException:
            print(f"  Rate limit hit discovering forks for {repo.full_name}")
        except GithubException as e:
            print(f"  Error discovering forks for {repo.full_name}: {e}")
        return sorted(set(org_names))

    def update_repository_forking_orgs(self, repo: Repo) -> None:
        """Fetch forking organizations and persist to the repository JSON.

        Args:
            repo: GitHub repository object
        """
        orgs = self.discover_forking_organizations(repo)
        path = self.directory / "repositories" / (repo.full_name + ".json")
        if path.exists():
            repository = Repository.model_validate_json(path.read_text())
            repository.update_forking_organizations(orgs)
            path.write_text(repository.model_dump_json())
            if orgs:
                print(f"  Forking orgs for {repo.full_name}: {', '.join(orgs)}")

    def update_link(
        self,
        repo: Repo,
        contributor: NamedUser,
        contributor_name: str,
        *,
        tier: str = "core",
    ) -> None:
        """Update the link for a single contributor to a single repository.

        Args:
            repo: GitHub repository object
            contributor: GitHub user object
            contributor_name: Display name for the contributor
            tier: "core" or "community"
        """
        path = self.directory / "links" / repo.full_name / (contributor.login + ".json")
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            link = Link.model_validate_json(path.read_text())
            link.update_from_github(repo, contributor)
            link.tier = tier
        else:
            link = Link.from_github(repo, contributor, contributor_name)
            link.tier = tier
        path.write_text(link.model_dump_json())
