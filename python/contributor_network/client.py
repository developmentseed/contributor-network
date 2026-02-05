from pathlib import Path

from github import Github
from github.Auth import Auth
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

    def update_links(self, repo: Repo, contributors: dict[str, str]) -> None:
        """Update the links for a single repository."""
        devseed_count = 0
        for contributor in repo.get_contributors():
            if contributor_name := contributors.get(contributor.login):
                self.update_link(repo, contributor, contributor_name)
                devseed_count += 1

        # Update repository with community stats (Phase 2)
        self.update_repository_community_stats(repo.full_name, devseed_count)

    def update_repository_community_stats(
        self, repo_full_name: str, devseed_count: int
    ) -> None:
        """Update the community stats for a repository after processing contributors."""
        path = self.directory / "repositories" / (repo_full_name + ".json")
        if path.exists():
            repository = Repository.model_validate_json(path.read_text())
            repository.update_community_stats(devseed_count)
            path.write_text(repository.model_dump_json())

    def update_link(
        self, repo: Repo, contributor: NamedUser, contributor_name: str
    ) -> None:
        """Update the link for a single contributor to a single repository."""
        path = self.directory / "links" / repo.full_name / (contributor.login + ".json")
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            link = Link.model_validate_json(path.read_text())
            link.update_from_github(repo, contributor)
        else:
            link = Link.from_github(repo, contributor, contributor_name)
        path.write_text(link.model_dump_json())
