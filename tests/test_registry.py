"""Unit tests for the Registry."""

import json
from pathlib import Path

import pytest

from aineed.registry import Registry
from aineed.requirement import Category, Priority, Requirement


def _req(title: str, **kwargs) -> Requirement:
    return Requirement(title=title, description=f"Description of {title}", **kwargs)


class TestRegistryBasicOperations:
    def test_empty_registry_has_length_zero(self):
        r = Registry()
        assert len(r) == 0

    def test_add_increases_length(self):
        r = Registry()
        r.add(_req("A"))
        assert len(r) == 1

    def test_all_returns_copies_of_requirements(self):
        r = Registry()
        req = _req("B")
        r.add(req)
        assert r.all() == [req]

    def test_remove_existing_returns_true(self):
        r = Registry()
        r.add(_req("C"))
        assert r.remove("C") is True
        assert len(r) == 0

    def test_remove_missing_returns_false(self):
        r = Registry()
        assert r.remove("missing") is False

    def test_find_returns_correct_requirement(self):
        r = Registry()
        req = _req("D")
        r.add(req)
        assert r.find("D") is req

    def test_find_returns_none_when_missing(self):
        r = Registry()
        assert r.find("not here") is None

    def test_iter(self):
        r = Registry()
        r.add(_req("E"))
        r.add(_req("F"))
        titles = [req.title for req in r]
        assert titles == ["E", "F"]


class TestRegistryFilter:
    def setup_method(self):
        self.r = Registry()
        self.r.add(_req("low-other", priority=Priority.LOW))
        self.r.add(_req("high-data", priority=Priority.HIGH, category=Category.DATA))
        self.r.add(_req("medium-model", category=Category.MODEL))
        tagged = _req("tagged")
        tagged.tags = ["gpu"]
        self.r.add(tagged)

    def test_filter_by_priority(self):
        results = self.r.filter(priority=Priority.HIGH)
        assert len(results) == 1
        assert results[0].title == "high-data"

    def test_filter_by_category(self):
        results = self.r.filter(category=Category.DATA)
        assert len(results) == 1
        assert results[0].title == "high-data"

    def test_filter_by_tag(self):
        results = self.r.filter(tag="gpu")
        assert len(results) == 1
        assert results[0].title == "tagged"

    def test_filter_by_predicate(self):
        results = self.r.filter(predicate=lambda req: "model" in req.title)
        assert len(results) == 1
        assert results[0].title == "medium-model"

    def test_filter_no_criteria_returns_all(self):
        assert len(self.r.filter()) == 4

    def test_filter_combined(self):
        results = self.r.filter(
            priority=Priority.HIGH, category=Category.DATA
        )
        assert len(results) == 1


class TestRegistryPersistence:
    def test_save_and_load(self, tmp_path):
        store = tmp_path / "reqs.json"
        r = Registry()
        r.add(
            _req(
                "Save me",
                priority=Priority.CRITICAL,
                category=Category.ETHICS,
            )
        )
        r.save(store)
        assert store.exists()

        loaded = Registry.load(store)
        assert len(loaded) == 1
        req = loaded.find("Save me")
        assert req is not None
        assert req.priority == Priority.CRITICAL
        assert req.category == Category.ETHICS

    def test_saved_file_is_valid_json(self, tmp_path):
        store = tmp_path / "reqs.json"
        r = Registry()
        r.add(_req("JSON test"))
        r.save(store)
        data = json.loads(store.read_text())
        assert isinstance(data, list)
        assert data[0]["title"] == "JSON test"
