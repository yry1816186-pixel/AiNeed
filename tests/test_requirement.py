"""Unit tests for the Requirement model."""

import pytest

from aineed.requirement import Category, Priority, Requirement


def _make_req(**kwargs) -> Requirement:
    defaults = dict(
        title="Test requirement",
        description="A test description",
    )
    defaults.update(kwargs)
    return Requirement(**defaults)


class TestRequirementDefaults:
    def test_default_priority(self):
        req = _make_req()
        assert req.priority == Priority.MEDIUM

    def test_default_category(self):
        req = _make_req()
        assert req.category == Category.OTHER

    def test_default_tags_are_empty(self):
        req = _make_req()
        assert req.tags == []

    def test_default_accepted_is_none(self):
        req = _make_req()
        assert req.accepted is None


class TestRequirementSerialization:
    def test_to_dict_roundtrip(self):
        req = _make_req(
            title="GPU cluster",
            description="Need a GPU cluster for training.",
            priority=Priority.HIGH,
            category=Category.INFRASTRUCTURE,
            tags=["gpu", "training"],
            accepted=True,
        )
        data = req.to_dict()
        restored = Requirement.from_dict(data)

        assert restored.title == req.title
        assert restored.description == req.description
        assert restored.priority == req.priority
        assert restored.category == req.category
        assert restored.tags == req.tags
        assert restored.accepted == req.accepted

    def test_to_dict_contains_expected_keys(self):
        req = _make_req()
        data = req.to_dict()
        assert set(data.keys()) == {
            "title",
            "description",
            "priority",
            "category",
            "tags",
            "accepted",
        }

    def test_from_dict_uses_defaults_for_missing_fields(self):
        data = {"title": "Minimal", "description": "Minimal req"}
        req = Requirement.from_dict(data)
        assert req.priority == Priority.MEDIUM
        assert req.category == Category.OTHER
        assert req.tags == []
        assert req.accepted is None
