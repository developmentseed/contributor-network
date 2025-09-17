from __future__ import annotations

import datetime

from github.NamedUser import NamedUser
from github.Repository import Repository as Repo
from pydantic import BaseModel


class Link(BaseModel):
    author_name: str
    repo: str
    commit_count: int
    commit_sec_min: int
    commit_sec_max: int

    @classmethod
    def from_github(cls, repo: Repo, contributor: NamedUser, author_name: str) -> Link:
        commits = repo.get_commits(author=contributor.login)
        last_commit = commits[0]
        first_commit = commits.reversed[0]
        return cls(
            author_name=author_name,
            repo=repo.full_name,
            commit_count=contributor.contributions,
            commit_sec_min=int(first_commit.commit.author.date.timestamp()),
            commit_sec_max=int(last_commit.commit.author.date.timestamp()),
        )

    def update_from_github(self, repo: Repo, contributor: NamedUser) -> None:
        commits = repo.get_commits(author=contributor.login)
        last_commit = commits[0]
        self.commit_count = contributor.contributions
        self.commit_sec_max = int(last_commit.commit.author.date.timestamp())


class Repository(BaseModel):
    repo: str
    repo_stars: int
    repo_forks: int
    repo_createdAt: datetime.datetime
    repo_updatedAt: datetime.datetime
    repo_total_commits: int
    repo_url: str
    repo_description: str | None
    repo_languages: str

    @classmethod
    def from_github(cls, repo: Repo) -> Repository:
        return cls(
            repo=repo.full_name,
            repo_stars=repo.stargazers_count,
            repo_forks=repo.forks_count,
            repo_createdAt=repo.created_at,
            repo_updatedAt=repo.updated_at,
            repo_total_commits=repo.get_commits().totalCount,
            repo_url=repo.html_url,
            repo_description=repo.description,
            repo_languages=",".join(repo.get_languages().keys()),
        )
