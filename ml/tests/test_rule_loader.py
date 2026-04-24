"""
Tests for FashionRuleLoader, StudioSignalDetector, and studio directory.

Covers: RUL-01 (dynamic rule loading), RUL-02 (filtered injection),
        WKS-01 (signal detection), WKS-03 (studio directory).
"""

import json
import os
import pytest
from unittest.mock import MagicMock

from ml.services.stylist.dialog_state import DialogContext, DialogSlot, DialogState
from ml.services.stylist.rule_loader import FashionRuleLoader
from ml.services.stylist.studio_signal_detector import StudioSignalDetector


# ---------------------------------------------------------------------------
# Test 1: FashionRuleLoader loads all 7 JSON files
# ---------------------------------------------------------------------------

class TestFashionRuleLoaderLoading:
    def test_loads_all_seven_files(self):
        loader = FashionRuleLoader()
        all_rules = loader.get_all_rules()
        # Should load 7 JSON files from ml/data/fashion_rules/
        assert len(all_rules) == 7

    def test_loaded_categories_match_files(self):
        loader = FashionRuleLoader()
        all_rules = loader.get_all_rules()
        expected_categories = {
            "body_type_rules",
            "chinese_occasion_rules",
            "color_season_rules",
            "fabric_rules",
            "item_compatibility",
            "trend_rules",
            "weather_outfit_rules",
        }
        assert set(all_rules.keys()) == expected_categories


# ---------------------------------------------------------------------------
# Test 2: Filter by body_type and occasion
# ---------------------------------------------------------------------------

class TestFashionRuleLoaderFilteredBodyType:
    def test_filter_by_body_type_and_occasion(self):
        loader = FashionRuleLoader()
        rules = loader.get_filtered_rules(
            body_type="hourglass",
            occasion="interview",
        )
        # Should return rules matching hourglass + interview
        assert len(rules) > 0
        for rule in rules:
            if rule.get("body_type"):
                assert rule["body_type"] == "hourglass"
            if rule.get("occasion"):
                assert rule["occasion"] == "interview"

    def test_filter_by_body_type_only(self):
        loader = FashionRuleLoader()
        rules = loader.get_filtered_rules(body_type="hourglass")
        assert len(rules) > 0
        for rule in rules:
            if rule.get("body_type"):
                assert rule["body_type"] == "hourglass"


# ---------------------------------------------------------------------------
# Test 3: Filter by color_season
# ---------------------------------------------------------------------------

class TestFashionRuleLoaderFilteredColorSeason:
    def test_filter_by_color_season(self):
        loader = FashionRuleLoader()
        rules = loader.get_filtered_rules(color_season="spring_warm")
        assert len(rules) > 0
        for rule in rules:
            if rule.get("color_season"):
                assert rule["color_season"] == "spring_warm"

    def test_filter_by_color_season_and_occasion(self):
        loader = FashionRuleLoader()
        rules = loader.get_filtered_rules(
            color_season="spring_warm",
            occasion="casual",
        )
        assert len(rules) > 0


# ---------------------------------------------------------------------------
# Test 4: No filters returns all rules
# ---------------------------------------------------------------------------

class TestFashionRuleLoaderNoFilters:
    def test_no_filters_returns_all(self):
        loader = FashionRuleLoader()
        all_rules = loader.get_all_rules()
        total_rules = sum(len(v) for v in all_rules.values())

        filtered = loader.get_filtered_rules()
        assert len(filtered) == total_rules


# ---------------------------------------------------------------------------
# Test 5: get_category returns specific category
# ---------------------------------------------------------------------------

class TestFashionRuleLoaderGetCategory:
    def test_get_body_type_category(self):
        loader = FashionRuleLoader()
        rules = loader.get_category("body_type_rules")
        assert len(rules) > 0

    def test_get_nonexistent_category_returns_empty(self):
        loader = FashionRuleLoader()
        rules = loader.get_category("nonexistent")
        assert rules == []


# ---------------------------------------------------------------------------
# Test 6: StudioSignalDetector - premium_budget
# ---------------------------------------------------------------------------

class TestStudioSignalPremiumBudget:
    def test_premium_budget_triggered(self):
        detector = StudioSignalDetector()
        ctx = DialogContext(
            state=DialogState.GENERATE,
            slots=DialogSlot(budget={"min": 3000, "max": 5000}),
        )
        signal = detector.detect("给我推荐", ctx)
        assert signal == "premium_budget"

    def test_premium_budget_not_triggered_low(self):
        detector = StudioSignalDetector()
        ctx = DialogContext(
            state=DialogState.GENERATE,
            slots=DialogSlot(budget={"min": 1000, "max": 2000}),
        )
        signal = detector.detect("给我推荐", ctx)
        assert signal is None


# ---------------------------------------------------------------------------
# Test 7: StudioSignalDetector - luxury_budget
# ---------------------------------------------------------------------------

class TestStudioSignalLuxuryBudget:
    def test_luxury_budget_triggered(self):
        detector = StudioSignalDetector()
        ctx = DialogContext(
            state=DialogState.GENERATE,
            slots=DialogSlot(budget={"min": 5000, "max": 10000}),
        )
        signal = detector.detect("给我推荐", ctx)
        assert signal == "luxury_budget"


# ---------------------------------------------------------------------------
# Test 8: StudioSignalDetector - unique_request
# ---------------------------------------------------------------------------

class TestStudioSignalUniqueRequest:
    def test_unique_request_triggered(self):
        detector = StudioSignalDetector()
        ctx = DialogContext()
        signal = detector.detect("我想要独一无二的设计", ctx)
        assert signal == "unique_request"

    def test_unique_request_not_triggered(self):
        detector = StudioSignalDetector()
        ctx = DialogContext()
        signal = detector.detect("我想要一套普通的穿搭", ctx)
        assert signal is None


# ---------------------------------------------------------------------------
# Test 9: StudioSignalDetector - special_event
# ---------------------------------------------------------------------------

class TestStudioSignalSpecialEvent:
    def test_special_event_wedding(self):
        detector = StudioSignalDetector()
        ctx = DialogContext()
        signal = detector.detect("我要参加婚礼", ctx)
        assert signal == "special_event"

    def test_special_event_red_carpet(self):
        detector = StudioSignalDetector()
        ctx = DialogContext()
        signal = detector.detect("走红毯穿什么", ctx)
        assert signal == "special_event"


# ---------------------------------------------------------------------------
# Test 10: StudioSignalDetector - multiple_rejections
# ---------------------------------------------------------------------------

class TestStudioSignalMultipleRejections:
    def test_multiple_rejections_triggered(self):
        detector = StudioSignalDetector()
        ctx = DialogContext(negative_feedback_count=3)
        signal = detector.detect("都不好看", ctx)
        assert signal == "multiple_rejections"

    def test_multiple_rejections_not_triggered(self):
        detector = StudioSignalDetector()
        ctx = DialogContext(negative_feedback_count=2)
        signal = detector.detect("都不好看", ctx)
        assert signal is None


# ---------------------------------------------------------------------------
# Test 11: StudioSignalDetector - normal messages return None
# ---------------------------------------------------------------------------

class TestStudioSignalNormalMessages:
    def test_normal_message_returns_none(self):
        detector = StudioSignalDetector()
        ctx = DialogContext()
        signal = detector.detect("给我推荐一套面试穿搭", ctx)
        assert signal is None


# ---------------------------------------------------------------------------
# Test 12: StudioSignalDetector - get_recommendation_message
# ---------------------------------------------------------------------------

class TestStudioSignalRecommendationMessage:
    def test_premium_budget_message(self):
        detector = StudioSignalDetector()
        msg = detector.get_recommendation_message("premium_budget")
        assert "工作室" in msg
        assert len(msg) > 10

    def test_unknown_signal_returns_default(self):
        detector = StudioSignalDetector()
        msg = detector.get_recommendation_message("unknown_signal")
        assert "工作室" in msg


# ---------------------------------------------------------------------------
# Test 13: Studio directory has correct structure
# ---------------------------------------------------------------------------

class TestStudioDirectory:
    def test_studio_directory_exists(self):
        path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "data", "studio_directory.json",
        )
        assert os.path.exists(path), f"Studio directory not found at {path}"

    def test_studio_directory_has_six_entries(self):
        path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "data", "studio_directory.json",
        )
        with open(path, encoding="utf-8") as f:
            studios = json.load(f)
        assert len(studios) >= 6

    def test_studio_entries_have_required_fields(self):
        path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "data", "studio_directory.json",
        )
        with open(path, encoding="utf-8") as f:
            studios = json.load(f)
        required_fields = ["id", "name", "city", "specialty", "price_range", "occasions"]
        for studio in studios:
            for field in required_fields:
                assert field in studio, f"Studio {studio.get('id', '?')} missing {field}"

    def test_studio_cities_are_varied(self):
        path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "data", "studio_directory.json",
        )
        with open(path, encoding="utf-8") as f:
            studios = json.load(f)
        cities = set(s["city"] for s in studios)
        assert len(cities) >= 3, "Studios should cover at least 3 different cities"
