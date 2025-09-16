import datetime

from pydantic import BaseModel


class Link(BaseModel):
    author_name: str
    repo: str
    commit_count: int
    commit_sec_min: int
    commit_sec_max: int


class Repository(BaseModel):
    repo: str
    repo_stars: int
    repo_forks: int
    repo_createdAt: datetime.datetime
    repo_updatedAt: datetime.datetime
    repo_total_commits: int
    repo_url: str
    repo_description: str
    repo_languages: str
