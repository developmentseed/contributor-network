import subprocess
from pathlib import Path

import pytest
from click.testing import CliRunner
from contributor_network.cli import main


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    d = tmp_path / "data"
    (d / "repositories").mkdir(parents=True)
    (d / "links").mkdir(parents=True)
    return d


@pytest.fixture
def config_path(tmp_path: Path) -> Path:
    path = tmp_path / "config.toml"
    path.write_text(
        'title = "Test Network"\n'
        'description = "Test description"\n'
        'organization_name = "Test Org"\n'
        "repositories = []\n"
        "\n"
        "[contributors.core]\n"
        'alice = "Alice"\n'
    )
    return path


def test_build_generates_data_files_without_invoking_npm(
    data_dir: Path, config_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fail_if_called(*args: object, **kwargs: object) -> None:
        pytest.fail(f"subprocess.run should not be called, got args={args}")

    monkeypatch.setattr(subprocess, "run", fail_if_called)

    runner = CliRunner()
    result = runner.invoke(
        main,
        ["build", "--directory", str(data_dir), "--config", str(config_path)],
    )

    assert result.exit_code == 0, result.output
    assert (data_dir / "top_contributors.csv").exists()
    assert (data_dir / "repositories.csv").exists()
    assert (data_dir / "links.csv").exists()
    assert (data_dir / "config.json").exists()
