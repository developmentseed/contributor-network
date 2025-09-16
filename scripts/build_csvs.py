import csv
import datetime
from csv import DictWriter
from pathlib import Path

from devseed_contributor_network.constants import AUTHORS
from devseed_contributor_network.models import Link, Repository

DATA = Path(__file__).parents[1] / "data"
MAGIC_REPO = "developmentseed/developmentseed.org"


def main() -> None:
    repositories = []
    for path in (DATA / "repos").glob("**/*.json"):
        with open(path) as f:
            repository = Repository.model_validate_json(f.read())
            repositories.append(repository.model_dump())
    links = []
    for path in (DATA / "links").glob("**/*.json"):
        with open(path) as f:
            link = Link.model_validate_json(f.read())
            links.append(link.model_dump())

    # Magic repo hack
    top_contributors = list()
    for author_name in AUTHORS.values():
        top_contributors.append(author_name)
        links.append(
            Link(
                author_name=author_name,
                repo=MAGIC_REPO,
                commit_count=1,
                commit_sec_min=int(datetime.datetime.now().timestamp()),
                commit_sec_max=int(datetime.datetime.now().timestamp()),
            ).model_dump()
        )
    repositories.append(
        Repository(
            repo=MAGIC_REPO,
            repo_stars=0,
            repo_forks=0,
            repo_url="https://developmentseed.org",
            repo_createdAt=datetime.datetime.now(),
            repo_updatedAt=datetime.datetime.now(),
            repo_description="Winning with open data",
            repo_total_commits=len(top_contributors),
            repo_languages="",
        ).model_dump()
    )

    with open(DATA / "repositories.csv", "w") as f:
        fieldnames = list(Repository.model_json_schema()["properties"].keys())
        writer = DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(repositories)
    with open(DATA / "top_contributors.csv", "w") as f:
        writer = csv.writer(f)
        writer.writerow(["author_name"])
        for name in top_contributors:
            writer.writerow([name])
    with open(DATA / "links.csv", "w") as f:
        fieldnames = list(Link.model_json_schema()["properties"].keys())
        writer = DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(links)


if __name__ == "__main__":
    main()
