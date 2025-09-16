import os
from pathlib import Path

from github import Auth, Github

from devseed_contributor_network.constants import AUTHORS, REPOSITORIES
from devseed_contributor_network.models import Link, Repository

DATA = Path(__file__).parents[1] / "data"
REPO_DIRECTORY = DATA / "repos"
LINK_DIRECTORY = DATA / "links"


def main() -> None:
    if github_token := os.environ.get("GITHUB_TOKEN"):
        auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()
    github = Github(auth=auth)

    # Fetch repo data
    for repository in REPOSITORIES:
        path = REPO_DIRECTORY / (repository + ".json")
        if path.exists():
            print(f"{repository}.json already exists, skipping")
            continue
        print(f"Fetching {repository}...")
        repo = github.get_repo(repository)
        repo_url = repo.homepage or f"https://github.com/{repo.full_name}"
        contributors = list(repo.get_contributors())
        repo_total_commits = sum((c.contributions for c in contributors))
        r = Repository(
            repo=repo.full_name,
            repo_stars=repo.stargazers_count,
            repo_forks=repo.forks_count,
            repo_createdAt=repo.created_at,
            repo_updatedAt=repo.updated_at,
            repo_total_commits=repo_total_commits,
            repo_url=repo_url,
            repo_description=repo.description,
            repo_languages=",".join(repo.get_languages().keys()),
        )
        path.parent.mkdir(exist_ok=True, parents=True)
        with open(path, "w") as f:
            f.write(r.model_dump_json(indent=2))

        print(f"Fetching links for {repository}...")
        for contributor in contributors:
            if author_name := AUTHORS.get(contributor.login):
                path = LINK_DIRECTORY / repository / (contributor.login + ".json")
                if path.exists():
                    continue
                commits = list(repo.get_commits(author=contributor.login))
                link = Link(
                    author_name=author_name,
                    repo=repository,
                    commit_count=contributor.contributions,
                    commit_sec_min=int(commits[-1].commit.author.date.timestamp()),
                    commit_sec_max=int(commits[0].commit.author.date.timestamp()),
                )
                path.parent.mkdir(exist_ok=True, parents=True)
                with open(path, "w") as f:
                    f.write(link.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
