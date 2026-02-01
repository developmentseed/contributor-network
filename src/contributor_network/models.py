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
    # Phase 1: Computed contribution metrics
    contribution_span_days: int = 0
    is_recent_contributor: bool = False

    @classmethod
    def from_github(cls, repo: Repo, contributor: NamedUser, author_name: str) -> Link:
        commits = repo.get_commits(author=contributor.login)
        last_commit = commits[0]
        first_commit = commits.reversed[0]
        commit_sec_min = int(first_commit.commit.author.date.timestamp())
        commit_sec_max = int(last_commit.commit.author.date.timestamp())

        # Compute derived fields
        contribution_span_days = (commit_sec_max - commit_sec_min) // 86400
        ninety_days_ago = int((datetime.datetime.now() - datetime.timedelta(days=90)).timestamp())
        is_recent = commit_sec_max > ninety_days_ago

        return cls(
            author_name=author_name,
            repo=repo.full_name,
            commit_count=contributor.contributions,
            commit_sec_min=commit_sec_min,
            commit_sec_max=commit_sec_max,
            contribution_span_days=contribution_span_days,
            is_recent_contributor=is_recent,
        )

    def update_from_github(self, repo: Repo, contributor: NamedUser) -> None:
        commits = repo.get_commits(author=contributor.login)
        last_commit = commits[0]
        self.commit_count = contributor.contributions
        self.commit_sec_max = int(last_commit.commit.author.date.timestamp())

        # Recompute derived fields
        self.contribution_span_days = (self.commit_sec_max - self.commit_sec_min) // 86400
        ninety_days_ago = int((datetime.datetime.now() - datetime.timedelta(days=90)).timestamp())
        self.is_recent_contributor = self.commit_sec_max > ninety_days_ago


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
    # Phase 1: Quick wins - additional metadata
    repo_watchers: int = 0
    repo_open_issues: int = 0
    repo_license: str | None = None
    repo_topics: str = ""
    repo_has_discussions: bool = False
    repo_has_wiki: bool = False
    repo_default_branch: str = "main"
    repo_archived: bool = False

    @classmethod
    def from_github(cls, repo: Repo) -> Repository:
        # Get license safely (may be None)
        license_id = None
        if repo.license:
            license_id = repo.license.spdx_id

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
            # Phase 1 fields
            repo_watchers=repo.subscribers_count,
            repo_open_issues=repo.open_issues_count,
            repo_license=license_id,
            repo_topics=",".join(repo.get_topics()),
            repo_has_discussions=repo.has_discussions,
            repo_has_wiki=repo.has_wiki,
            repo_default_branch=repo.default_branch,
            repo_archived=repo.archived,
        )
