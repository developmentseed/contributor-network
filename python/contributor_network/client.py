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
                        "core" if contributor.login in core_usernames else "community"
                    )
                self.update_link(repo, contributor, contributor_name, tier=tier)
                core_count += 1

        self.update_repository_community_stats(repo.full_name, core_count)

    def discover_community_contributors(
        self,
        repo: Repo,
        known_usernames: set[str],
        *,
        max_community: int = 100,
    ) -> list[tuple[NamedUser, str]]:
        """Discover contributors to a repo who are not in the known set.

        Returns:
            List of (NamedUser, display_name) tuples for community contributors.
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
        """Create/update link data for community contributors."""
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
        """Discover organizations that have forked this repository."""
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
        """Fetch forking organizations and persist to the repository JSON."""
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
        """Update the link for a single contributor to a single repository."""
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
