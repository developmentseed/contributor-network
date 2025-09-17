import datetime
import shutil
from csv import DictWriter
from pathlib import Path

import click
from github import Auth
from jinja2 import Environment, FileSystemLoader

from .client import Client
from .config import Config
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


@click.group()
def main():
    """Build the contributor network page."""


@main.command()
@directory
@config
@click.option("--github-token", envvar="GITHUB_TOKEN", help="GitHub token")
def data(directory: Path, config_path: str | None, github_token: str | None):
    """Build the contributor network data."""

    config = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    if github_token:
        auth = Auth.Token(github_token)
    else:
        auth = Auth.NetrcAuth()

    client = Client(auth, directory)

    for repository in config.repositories:
        print(f"Updating repository: {repository}")
        repo = client.get_repo(repository)
        client.update_repository(repo)
        print(f"Updating links: {repository}")
        client.update_links(repo, config.contributors)


@main.command()
@directory
@config
def csvs(directory: Path, config_path: str | None) -> None:
    """Write the CSVs."""

    config = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)
    authors = list(config.contributors.values())

    (directory / "top_contributors.csv").write_text(
        "\n".join(["author_name"] + authors)
    )

    repositories = [
        Repository(
            repo=config.central_repository,
            repo_stars=0,
            repo_forks=0,
            repo_createdAt=datetime.datetime.now(),
            repo_updatedAt=datetime.datetime.now(),
            repo_total_commits=0,
            repo_url="https://github.com/developmentseed/contributor-network",
            repo_description=config.description,
            repo_languages="",
        ).model_dump(mode="json")
    ]
    for path in (directory / "repositories").glob("**/*.json"):
        repositories.append(
            Repository.model_validate_json(path.read_text()).model_dump(mode="json")
        )
    with open(directory / "repositories.csv", "w") as f:
        fieldnames = list(Repository.model_json_schema()["properties"].keys())
        writer = DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(repositories)

    links = [
        Link(
            author_name=name,
            repo=config.central_repository,
            commit_count=1,
            commit_sec_min=int(datetime.datetime.now().timestamp()),
            commit_sec_max=int(datetime.datetime.now().timestamp()),
        ).model_dump(mode="json")
        for name in config.contributors.values()
    ]
    for path in (directory / "links").glob("**/*.json"):
        links.append(Link.model_validate_json(path.read_text()).model_dump(mode="json"))
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

    config = Config.from_toml(config_path or DEFAULT_CONFIG_PATH)

    destination.mkdir(parents=True, exist_ok=True)
    for file_name in ["top_contributors.csv", "repositories.csv", "links.csv"]:
        shutil.copy(directory / file_name, destination / file_name)
    shutil.copy(ROOT / "index.js", destination / "index.js")
    shutil.copy(ROOT / "css" / "style.css", destination / "style.css")
    for path in (ROOT / "lib").glob("**/*.js"):
        shutil.copy(path, destination / path.name)
    for path in (ROOT / "img").glob("**/*.*"):
        shutil.copy(path, destination / path.name)

    environment = Environment(loader=FileSystemLoader(ROOT / "templates"))
    template = environment.get_template("index.html.jinja")
    (destination / "index.html").write_text(
        template.render(
            title=config.title,
            author=config.author,
            description=config.description,
            central_repository=config.central_repository,
            contributor_padding=config.contributor_padding,
        )
    )
