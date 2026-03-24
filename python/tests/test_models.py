import datetime
from unittest.mock import MagicMock

from contributor_network.models import Link


def _make_commit(timestamp: datetime.datetime) -> MagicMock:
    commit = MagicMock()
    commit.commit.author.date = timestamp
    return commit


def _make_contributor(login: str, contributions: int) -> MagicMock:
    contributor = MagicMock()
    contributor.login = login
    contributor.contributions = contributions
    return contributor


def test_link_from_github_with_since():
    repo = MagicMock()
    repo.full_name = "org/repo"

    since_date = datetime.date(2023, 1, 1)
    since_dt = datetime.datetime(2023, 1, 1, tzinfo=datetime.timezone.utc)

    commits = [
        _make_commit(datetime.datetime(2023, 6, 15, tzinfo=datetime.timezone.utc)),
        _make_commit(datetime.datetime(2023, 3, 1, tzinfo=datetime.timezone.utc)),
    ]
    paginated = MagicMock()
    paginated.__iter__ = MagicMock(return_value=iter(commits))
    repo.get_commits.return_value = paginated

    contributor = _make_contributor("alice", 999)

    link = Link.from_github(repo, contributor, "Alice", since=since_date)

    repo.get_commits.assert_called_once_with(author="alice", since=since_dt)
    assert link is not None
    assert link.commit_count == 2
    assert link.author_name == "Alice"


def test_link_from_github_without_since():
    repo = MagicMock()
    repo.full_name = "org/repo"

    commits = [
        _make_commit(datetime.datetime(2023, 6, 15, tzinfo=datetime.timezone.utc)),
        _make_commit(datetime.datetime(2020, 1, 1, tzinfo=datetime.timezone.utc)),
    ]
    paginated = MagicMock()
    paginated.__getitem__ = MagicMock(side_effect=lambda i: commits[i])
    paginated.reversed = MagicMock()
    paginated.reversed.__getitem__ = MagicMock(side_effect=lambda i: commits[-(i + 1)])
    repo.get_commits.return_value = paginated

    contributor = _make_contributor("alice", 50)

    link = Link.from_github(repo, contributor, "Alice")

    repo.get_commits.assert_called_once_with(author="alice")
    assert link is not None
    assert link.commit_count == 50


def test_link_from_github_zero_commits_returns_none():
    repo = MagicMock()
    repo.full_name = "org/repo"

    paginated = MagicMock()
    paginated.__iter__ = MagicMock(return_value=iter([]))
    repo.get_commits.return_value = paginated

    contributor = _make_contributor("alice", 10)

    result = Link.from_github(
        repo, contributor, "Alice", since=datetime.date(2025, 1, 1)
    )
    assert result is None


def test_update_from_github_with_since_returns_true():
    link = Link(
        author_name="Alice",
        repo="org/repo",
        commit_count=5,
        commit_sec_min=1000000,
        commit_sec_max=2000000,
    )
    repo = MagicMock()
    commits = [
        _make_commit(datetime.datetime(2023, 9, 1, tzinfo=datetime.timezone.utc)),
        _make_commit(datetime.datetime(2023, 6, 1, tzinfo=datetime.timezone.utc)),
    ]
    paginated = MagicMock()
    paginated.__iter__ = MagicMock(return_value=iter(commits))
    paginated.__getitem__ = MagicMock(side_effect=lambda i: commits[i])
    repo.get_commits.return_value = paginated

    contributor = _make_contributor("alice", 999)

    result = link.update_from_github(repo, contributor, since=datetime.date(2023, 1, 1))
    assert result is True
    assert link.commit_count == 2


def test_update_from_github_with_since_zero_commits_returns_false():
    link = Link(
        author_name="Alice",
        repo="org/repo",
        commit_count=5,
        commit_sec_min=1000000,
        commit_sec_max=2000000,
    )
    repo = MagicMock()
    paginated = MagicMock()
    paginated.__iter__ = MagicMock(return_value=iter([]))
    repo.get_commits.return_value = paginated

    contributor = _make_contributor("alice", 10)

    result = link.update_from_github(repo, contributor, since=datetime.date(2025, 1, 1))
    assert result is False
