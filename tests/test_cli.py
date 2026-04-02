"""Unit tests for the CLI."""

import json
from pathlib import Path

import pytest

from aineed.cli import main


def _run(*args, store: Path) -> int:
    return main(["--store", str(store)] + list(args))


class TestCliAdd:
    def test_add_returns_zero(self, tmp_path):
        store = tmp_path / "reqs.json"
        rc = _run("add", "My req", "Some description", store=store)
        assert rc == 0

    def test_add_creates_store_file(self, tmp_path):
        store = tmp_path / "reqs.json"
        _run("add", "R1", "Desc", store=store)
        assert store.exists()

    def test_add_persists_data(self, tmp_path):
        store = tmp_path / "reqs.json"
        _run("add", "R1", "Desc", "--priority", "high", "--category", "data", store=store)
        data = json.loads(store.read_text())
        assert len(data) == 1
        assert data[0]["title"] == "R1"
        assert data[0]["priority"] == "high"
        assert data[0]["category"] == "data"

    def test_add_with_tags(self, tmp_path):
        store = tmp_path / "reqs.json"
        _run("add", "Tagged", "Desc", "--tags", "gpu", "cloud", store=store)
        data = json.loads(store.read_text())
        assert data[0]["tags"] == ["gpu", "cloud"]


class TestCliList:
    def test_list_empty_returns_zero(self, tmp_path, capsys):
        store = tmp_path / "reqs.json"
        rc = _run("list", store=store)
        assert rc == 0
        captured = capsys.readouterr()
        assert "No requirements found" in captured.out

    def test_list_shows_added_requirement(self, tmp_path, capsys):
        store = tmp_path / "reqs.json"
        _run("add", "GPU cluster", "Need GPUs", store=store)
        _run("list", store=store)
        captured = capsys.readouterr()
        assert "GPU cluster" in captured.out

    def test_list_filter_by_priority(self, tmp_path, capsys):
        store = tmp_path / "reqs.json"
        _run("add", "LowReq", "low desc", "--priority", "low", store=store)
        _run("add", "HighReq", "high desc", "--priority", "high", store=store)
        capsys.readouterr()  # discard output from add commands
        _run("list", "--priority", "high", store=store)
        captured = capsys.readouterr()
        assert "HighReq" in captured.out
        assert "LowReq" not in captured.out


class TestCliRemove:
    def test_remove_existing_returns_zero(self, tmp_path):
        store = tmp_path / "reqs.json"
        _run("add", "ToRemove", "Desc", store=store)
        rc = _run("remove", "ToRemove", store=store)
        assert rc == 0

    def test_remove_missing_returns_nonzero(self, tmp_path):
        store = tmp_path / "reqs.json"
        rc = _run("remove", "DoesNotExist", store=store)
        assert rc != 0

    def test_remove_actually_deletes(self, tmp_path):
        store = tmp_path / "reqs.json"
        _run("add", "Gone", "Desc", store=store)
        _run("remove", "Gone", store=store)
        data = json.loads(store.read_text())
        assert data == []


class TestCliExport:
    def test_export_to_stdout(self, tmp_path, capsys):
        store = tmp_path / "reqs.json"
        _run("add", "E1", "Desc", store=store)
        capsys.readouterr()  # discard output from add command
        rc = _run("export", store=store)
        assert rc == 0
        captured = capsys.readouterr()
        data = json.loads(captured.out)
        assert data[0]["title"] == "E1"

    def test_export_to_file(self, tmp_path):
        store = tmp_path / "reqs.json"
        out_file = tmp_path / "out.json"
        _run("add", "E2", "Desc", store=store)
        _run("export", "--output", str(out_file), store=store)
        data = json.loads(out_file.read_text())
        assert data[0]["title"] == "E2"


class TestCliVersion:
    def test_version_raises_system_exit(self):
        with pytest.raises(SystemExit) as exc_info:
            main(["--version"])
        assert exc_info.value.code == 0


class TestCliNoCommand:
    def test_no_command_returns_zero(self, tmp_path):
        store = tmp_path / "reqs.json"
        rc = _run(store=store)
        assert rc == 0
