import os
from pathlib import Path

from github import Auth, Github

from devseed_contributor_network.models import Link, Repository

DATA = Path(__file__).parents[1] / "data"
REPO_DIRECTORY = DATA / "repos"
LINK_DIRECTORY = DATA / "links"
REPOSITORIES = [
    "developmentseed/titiler",
    "developmentseed/lonboard",
    "developmentseed/obstore",
    "developmentseed/eoAPI",
    "developmentseed/geojson-pydantic",
    "developmentseed/tipg",
    "developmentseed/rio-viz",
    "developmentseed/rio-stac",
    "developmentseed/osm-seed",
    "developmentseed/morecantile",
    "developmentseed/cql2-rs",
    "developmentseed/stac-auth-proxy",
    "stac-utils/pystac",
    "stac-utils/stac-fastapi",
    "stac-utils/stac-fastapi-pgstac",
    "stac-utils/pgstac",
    "stac-utils/pystac-client",
    "stac-utils/rustac",
    "opengeospatial/geoparquet",
    "radiantearth/stac-spec",
    "radiantearth/stac-api-spec",
    "geoarrow/geoarrow-rs",
    "geoarrow/deck.gl-layers",
    "geoarrow/geoarrow",
    "zarr-developers/VirtualiZarr",
    "zarr-developers/zarr-python",
    "pydata/xarray",
]
AUTHORS = {
    # Friends and alumni
    "jsignell": "Julia Signell",
    "geospatial-jeff": "Jeff Albrecht",
    "cholmes": "Chris Holmes",
    "m-mohr": "Matthias Mohr",
    "matthewhanson": "Matthew Hanson",
    "d-v-b": "Davis Bennett",
    # Development Seed
    "AMSCamacho": "Angela Camacho",
    "AliceR": "Alice Rühl",
    "LanesGood": "Lane Goodman",
    "abarciauskas-bgse": "Aimee Barciauskas",
    "aboydnw": "Anthony Boyd",
    "aliziel": "aliziel",
    "alukach": "Anthony Lukach",
    "anayeaye": "Alexandra Kirk",
    "aripaulg": "aripaulg",
    "batpad": "Sanjay Bhangar",
    "beatrizbsperes": "Beatriz Peres",
    "bitner": "David Bitner",
    "botanical": "Jennifer Tran",
    "briannapagan": "Brianna Pagán",
    "camillecroft": "camillecroft",
    "ceholden": "Chris Holden",
    "chuckwondo": "Chuck Daniels",
    "ciaransweet": "Ciaran Sweet",
    "danielfdsilva": "Daniel da Silva",
    "dannybauman": "Danny Bauman",
    "devseedgit": "Development Seed",
    "dzole0311": "Gjore Milevski",
    "emmalu": "Emma Paz",
    "emmanuelmathot": "Emmanuel Mathot",
    "faustoperez": "Fausto Pérez",
    "gadomski": "Pete Gadomski",
    "geohacker": "Sajjad Anwar",
    "hanbyul-here": "Hanbyul Jo",
    "hrodmn": "Henry Rodman",
    "ianschuler": "Ian Schuler",
    "indraneel": "Indraneel Purohit",
    "ividito": "Isayah Vidito",
    "j08lue": "Jonas",
    "jjfrench": "Jamison French",
    "kamicut": "Marc Farra",
    "kcarini": "Kiri",
    "kevinbullock": "Kevin Bullock",
    "kimmurph": "Kim",
    "kylebarron": "Kyle Barron",
    "leothomas": "Leo Thomas",
    "lillythomas": "Lilly Thomas",
    "maxrjones": "Max Jones",
    "olafveerman": "Olaf Veerman",
    "omniajoe": "Omnia",
    "pantierra": "xıʃǝɟ",
    "ricardoduplos": "Ricardo Duplos",
    "sandrahoang686": "sandrahoang686",
    "sharkinsspatial": "Sean Harkins",
    "sharonwanlu": "SharonLu",
    "smohiudd": "Saadiq Mohiuddin",
    "srmsoumya": "Soumya Ranjan Mohanty",
    "sunu": "Tarashish Mishra",
    "vgeorge": "Vitor George",
    "vincentsarago": "Vincent Sarago",
    "weiji14": "Wei Ji",
    "wildintellect": "Alex I. Mandel",
    "willemarcel": "Wille Marcel",
    "wrynearson": "Will Rynearson",
    "yellowcap": "Daniel Wiesmann",
    "zacdezgeo": "Zac Deziel",
}


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
