"""
Body Analyzer Unit Tests
体型分析模块的单元测试

Run with: pytest tests/test_body_analyzer.py -v
"""

import pytest
import numpy as np
from PIL import Image
from unittest.mock import Mock, patch, MagicMock

import sys
sys.path.insert(0, '/app/ml')

from services.body_analyzer import (
    BodyAnalyzer,
    BodyAnalyzerService,
    BodyType,
    SkinTone,
    ColorSeason,
    BodyProfile,
    BodyProportions,
    BodyMeasurements,
    Keypoint,
    ClothingAdaptation,
    FitScore,
    MediaPipeProcessor,
    BODY_TYPE_ADAPTATIONS,
    BODY_TYPE_THRESHOLDS,
    CLOTHING_ITEM_FIT_RULES,
    COLOR_SEASON_MATCHES,
    create_body_analyzer,
    create_body_analyzer_service,
    get_body_analyzer,
    get_body_analyzer_service,
)


class TestEnums:
    """测试枚举类型"""

    def test_body_type_values(self):
        """测试体型枚举值"""
        assert BodyType.RECTANGLE.value == "rectangle"
        assert BodyType.HOURGLASS.value == "hourglass"
        assert BodyType.TRIANGLE.value == "triangle"
        assert BodyType.INVERTED_TRIANGLE.value == "inverted_triangle"
        assert BodyType.OVAL.value == "oval"

    def test_skin_tone_values(self):
        """测试肤色枚举值"""
        assert SkinTone.FAIR.value == "fair"
        assert SkinTone.LIGHT.value == "light"
        assert SkinTone.MEDIUM.value == "medium"
        assert SkinTone.OLIVE.value == "olive"
        assert SkinTone.TAN.value == "tan"
        assert SkinTone.DARK.value == "dark"

    def test_color_season_values(self):
        """测试色彩季型枚举值"""
        assert ColorSeason.SPRING.value == "spring"
        assert ColorSeason.SUMMER.value == "summer"
        assert ColorSeason.AUTUMN.value == "autumn"
        assert ColorSeason.WINTER.value == "winter"


class TestDataClasses:
    """测试数据类"""

    def test_keypoint_creation(self):
        """测试关键点数据结构"""
        kp = Keypoint(x=100.0, y=200.0, z=0.5, visibility=0.9, name="nose")
        assert kp.x == 100.0
        assert kp.y == 200.0
        assert kp.z == 0.5
        assert kp.visibility == 0.9
        assert kp.name == "nose"

    def test_body_proportions_to_dict(self):
        """测试身体比例转换为字典"""
        proportions = BodyProportions(
            shoulder_to_hip_ratio=1.05,
            waist_to_hip_ratio=0.8,
            waist_to_shoulder_ratio=0.76,
        )
        d = proportions.to_dict()
        assert d["shoulder_to_hip_ratio"] == 1.05
        assert d["waist_to_hip_ratio"] == 0.8
        assert d["waist_to_shoulder_ratio"] == 0.76

    def test_body_measurements_to_dict(self):
        """测试身体测量转换为字典"""
        measurements = BodyMeasurements(
            shoulder_width=42.0,
            hip_width=40.0,
            estimated_height=175.0,
        )
        d = measurements.to_dict()
        assert d["shoulder_width"] == 42.0
        assert d["hip_width"] == 40.0
        assert d["estimated_height"] == 175.0

    def test_body_profile_to_dict(self):
        """测试身体档案转换为字典"""
        profile = BodyProfile(
            body_type=BodyType.HOURGLASS,
            confidence=0.85,
            keypoints={},
            proportions=BodyProportions(),
            measurements=BodyMeasurements(),
            skin_tone=SkinTone.MEDIUM,
            color_season=ColorSeason.AUTUMN,
        )
        d = profile.to_dict()
        assert d["body_type"] == "hourglass"
        assert d["confidence"] == 0.85
        assert d["skin_tone"] == "medium"
        assert d["color_season"] == "autumn"

    def test_clothing_adaptation_defaults(self):
        """测试服装适配建议的默认值"""
        adaptation = ClothingAdaptation()
        assert adaptation.suitable_styles == []
        assert adaptation.avoid_styles == []
        assert adaptation.emphasis == ""

    def test_fit_score_creation(self):
        """测试适配分数数据结构"""
        score = FitScore(
            overall_score=0.75,
            body_type_score=0.7,
            style_match_score=0.8,
            color_match_score=0.75,
            cut_match_score=0.7,
            details={"test": "value"},
        )
        assert score.overall_score == 0.75
        assert score.details["test"] == "value"


class TestBodyAnalyzer:
    """测试BodyAnalyzer核心类"""

    @pytest.fixture
    def analyzer(self):
        """创建分析器实例"""
        return BodyAnalyzer()

    @pytest.fixture
    def sample_keypoints(self):
        """创建示例关键点"""
        return {
            "nose": Keypoint(x=200, y=50, z=0, visibility=1.0),
            "left_shoulder": Keypoint(x=150, y=150, z=0, visibility=1.0),
            "right_shoulder": Keypoint(x=250, y=150, z=0, visibility=1.0),
            "left_hip": Keypoint(x=170, y=350, z=0, visibility=1.0),
            "right_hip": Keypoint(x=230, y=350, z=0, visibility=1.0),
            "left_waist": Keypoint(x=165, y=250, z=0, visibility=1.0),
            "right_waist": Keypoint(x=235, y=250, z=0, visibility=1.0),
            "left_ankle": Keypoint(x=175, y=600, z=0, visibility=1.0),
            "left_elbow": Keypoint(x=120, y=250, z=0, visibility=1.0),
            "left_wrist": Keypoint(x=100, y=350, z=0, visibility=1.0),
        }

    def test_compute_measurements(self, analyzer, sample_keypoints):
        """测试测量数据计算"""
        measurements = analyzer.compute_measurements(sample_keypoints, 600, 400)

        assert measurements.shoulder_width > 0
        assert measurements.hip_width > 0
        assert measurements.waist_width > 0
        assert measurements.estimated_height > 0

    def test_compute_proportions(self, analyzer):
        """测试比例计算"""
        measurements = BodyMeasurements(
            shoulder_width=40.0,
            hip_width=38.0,
            waist_width=32.0,
            bust_width=35.0,
        )
        proportions = analyzer.compute_proportions(measurements)

        assert abs(proportions.shoulder_to_hip_ratio - 40/38) < 0.01
        assert abs(proportions.waist_to_hip_ratio - 32/38) < 0.01
        assert abs(proportions.waist_to_shoulder_ratio - 32/40) < 0.01

    def test_classify_body_type_hourglass(self, analyzer):
        """测试沙漏型分类"""
        measurements = BodyMeasurements(
            shoulder_width=40.0,
            hip_width=40.0,
            waist_width=28.0,
            bust_width=38.0,
        )
        proportions = BodyProportions(
            shoulder_to_hip_ratio=1.0,
            waist_to_hip_ratio=0.7,
            waist_to_shoulder_ratio=0.7,
        )

        body_type, confidence = analyzer.classify_body_type(measurements, proportions)
        assert body_type == BodyType.HOURGLASS
        assert confidence > 0.5

    def test_classify_body_type_triangle(self, analyzer):
        """测试梨形分类"""
        measurements = BodyMeasurements(
            shoulder_width=35.0,
            hip_width=42.0,
            waist_width=32.0,
        )
        proportions = BodyProportions(
            shoulder_to_hip_ratio=0.83,  # < 0.92
            waist_to_hip_ratio=0.76,
        )

        body_type, confidence = analyzer.classify_body_type(measurements, proportions)
        assert body_type == BodyType.TRIANGLE

    def test_classify_body_type_inverted_triangle(self, analyzer):
        """测试倒三角分类"""
        measurements = BodyMeasurements(
            shoulder_width=45.0,
            hip_width=38.0,
            waist_width=30.0,
        )
        proportions = BodyProportions(
            shoulder_to_hip_ratio=1.18,  # > 1.08
            waist_to_shoulder_ratio=0.67,
        )

        body_type, confidence = analyzer.classify_body_type(measurements, proportions)
        assert body_type == BodyType.INVERTED_TRIANGLE

    def test_classify_body_type_rectangle(self, analyzer):
        """测试矩型分类"""
        measurements = BodyMeasurements(
            shoulder_width=40.0,
            hip_width=40.0,
            waist_width=35.0,
        )
        proportions = BodyProportions(
            shoulder_to_hip_ratio=1.0,
            waist_to_hip_ratio=0.875,
            waist_to_shoulder_ratio=0.875,
        )

        body_type, confidence = analyzer.classify_body_type(measurements, proportions)
        assert body_type in [BodyType.RECTANGLE, BodyType.OVAL]

    def test_get_clothing_adaptations(self, analyzer):
        """测试获取服装适配建议"""
        for body_type in BodyType:
            adaptation = analyzer.get_clothing_adaptations(body_type)
            assert isinstance(adaptation, ClothingAdaptation)
            assert len(adaptation.suitable_styles) > 0
            assert len(adaptation.avoid_styles) > 0
            assert adaptation.emphasis != ""

    def test_get_body_type_info(self, analyzer):
        """测试获取体型详细信息"""
        for body_type in BodyType:
            info = analyzer.get_body_type_info(body_type)
            assert "name" in info
            assert "description" in info
            assert "suitable_styles" in info


class TestFitScoreCalculation:
    """测试适配分数计算"""

    @pytest.fixture
    def analyzer(self):
        return BodyAnalyzer()

    @pytest.fixture
    def sample_profile(self):
        return BodyProfile(
            body_type=BodyType.HOURGLASS,
            confidence=0.85,
            keypoints={},
            proportions=BodyProportions(
                shoulder_to_hip_ratio=1.0,
                waist_to_hip_ratio=0.7,
            ),
            measurements=BodyMeasurements(
                shoulder_width=40.0,
                hip_width=40.0,
                waist_width=28.0,
            ),
            skin_tone=SkinTone.MEDIUM,
            color_season=ColorSeason.AUTUMN,
        )

    @pytest.fixture
    def sample_profile_dict(self):
        """Returns a dictionary representation of the sample profile"""
        return {
            "body_type": "hourglass",
            "confidence": 0.85,
            "proportions": {
                "shoulder_to_hip_ratio": 1.0,
                "waist_to_hip_ratio": 0.7,
                "waist_to_shoulder_ratio": 0.7,
                "bust_to_waist_ratio": 1.0,
                "bust_to_hip_ratio": 0.95,
                "leg_to_torso_ratio": 1.0,
                "arm_to_height_ratio": 0.4,
            },
            "measurements": {
                "shoulder_width": 40.0,
                "hip_width": 40.0,
                "waist_width": 28.0,
                "bust_width": 35.0,
                "torso_height": 50.0,
                "leg_height": 80.0,
                "arm_length": 60.0,
                "estimated_height": 170.0,
            },
            "skin_tone": "medium",
            "color_season": "autumn",
        }

    def test_calculate_fit_score_basic(self, analyzer, sample_profile):
        """测试基本适配分数计算"""
        item = {
            "id": "test_001",
            "name": "Test Dress",
            "category": "dress",
            "style": ["elegant"],
            "colors": ["red"],
            "cut": "fitted",
        }

        score = analyzer.calculate_fit_score(item, sample_profile)
        assert isinstance(score, FitScore)
        assert 0 <= score.overall_score <= 1
        assert 0 <= score.cut_match_score <= 1
        assert 0 <= score.color_match_score <= 1
        assert 0 <= score.style_match_score <= 1

    def test_calculate_fit_score_with_suitable_cut(self, analyzer, sample_profile):
        """测试适合的剪裁获得高分"""
        suitable_item = {
            "id": "suitable_001",
            "name": "Fitted Dress",
            "category": "dress",
            "style": ["收腰", "合身"],
            "colors": ["酒红"],
            "cut": "收腰",
            "attributes": {"cut_keywords": ["收腰", "高腰"]},
        }

        unsuitable_item = {
            "id": "unsuitable_001",
            "name": "Loose Dress",
            "category": "dress",
            "style": ["宽松", "直筒"],
            "colors": ["橙色"],
            "cut": "直筒",
            "attributes": {"cut_keywords": ["直筒", "无腰线"]},
        }

        suitable_score = analyzer.calculate_fit_score(suitable_item, sample_profile)
        unsuitable_score = analyzer.calculate_fit_score(unsuitable_item, sample_profile)

        assert suitable_score.overall_score > unsuitable_score.overall_score

    def test_batch_calculate_fit_scores(self, analyzer, sample_profile):
        """测试批量计算适配分数"""
        items = [
            {"id": "1", "name": "Item 1", "category": "top", "style": ["收腰"], "colors": ["红色"]},
            {"id": "2", "name": "Item 2", "category": "bottom", "style": ["高腰"], "colors": ["蓝色"]},
            {"id": "3", "name": "Item 3", "category": "dress", "style": ["收腰"], "colors": ["酒红"]},
        ]

        results = analyzer.batch_calculate_fit_scores(items, sample_profile)

        assert len(results) == 3
        assert all("fit_score" in r for r in results)
        assert all("recommendation" in r for r in results)

        # 验证已排序
        for i in range(len(results) - 1):
            assert results[i]["fit_score"] >= results[i + 1]["fit_score"]

    def test_get_outfit_combination_score(self, analyzer, sample_profile):
        """测试整套穿搭适配分数"""
        outfit_items = [
            {"id": "top_1", "name": "Top", "category": "top", "style": ["收腰"], "colors": ["酒红"]},
            {"id": "bottom_1", "name": "Bottom", "category": "bottom", "style": ["高腰"], "colors": ["黑色"]},
        ]

        result = analyzer.get_outfit_combination_score(outfit_items, sample_profile)

        assert "overall_score" in result
        assert "items_analysis" in result
        assert "recommendation" in result
        assert len(result["items_analysis"]) == 2


class TestBodyAnalyzerService:
    """测试体型分析服务"""

    @pytest.fixture
    def service(self):
        return BodyAnalyzerService()

    def test_get_recommendations_for_body_type(self, service):
        """测试获取体型推荐"""
        result = service.get_recommendations_for_body_type("hourglass")

        assert result["body_type"] == "hourglass"
        assert "adaptations" in result
        assert "body_type_info" in result

    def test_get_recommendations_with_category(self, service):
        """测试获取特定类别的推荐"""
        result = service.get_recommendations_for_body_type("hourglass", category="dress")

        assert "category_rules" in result
        assert "suitable_for_your_body" in result["category_rules"]

    def test_rank_items_by_fit(self, service):
        """测试商品排序"""
        profile_dict = {
            "body_type": "hourglass",
            "confidence": 0.85,
            "proportions": {
                "shoulder_to_hip_ratio": 1.0,
                "waist_to_hip_ratio": 0.7,
                "waist_to_shoulder_ratio": 0.7,
                "bust_to_waist_ratio": 1.0,
                "bust_to_hip_ratio": 0.95,
                "leg_to_torso_ratio": 1.0,
                "arm_to_height_ratio": 0.4,
            },
            "measurements": {
                "shoulder_width": 40.0,
                "hip_width": 40.0,
                "waist_width": 28.0,
                "bust_width": 35.0,
                "torso_height": 50.0,
                "leg_height": 80.0,
                "arm_length": 60.0,
                "estimated_height": 170.0,
            },
            "skin_tone": "medium",
            "color_season": "autumn",
        }

        items = [
            {"id": "1", "name": "Item 1", "category": "dress", "style": ["收腰"], "colors": ["酒红"]},
            {"id": "2", "name": "Item 2", "category": "dress", "style": ["宽松"], "colors": ["橙色"]},
        ]

        ranked = service.rank_items_by_fit(items, profile_dict)

        assert len(ranked) == 2
        assert ranked[0]["fit_score"] >= ranked[1]["fit_score"]


class TestConfigurationData:
    """测试配置数据"""

    def test_body_type_adaptations_completeness(self):
        """测试体型适配配置完整性"""
        for body_type in BodyType:
            assert body_type in BODY_TYPE_ADAPTATIONS
            config = BODY_TYPE_ADAPTATIONS[body_type]
            assert "suitable_styles" in config
            assert "avoid_styles" in config
            assert "emphasis" in config
            assert "styling_tips" in config
            assert "best_cuts" in config

    def test_clothing_item_fit_rules_completeness(self):
        """测试服装适配规则完整性"""
        required_categories = ["top", "bottom", "dress", "outerwear"]

        for category in required_categories:
            assert category in CLOTHING_ITEM_FIT_RULES
            rules = CLOTHING_ITEM_FIT_RULES[category]
            assert "suitable_for" in rules
            assert "avoid_for" in rules
            assert "score_weights" in rules

            # 检查所有体型都有规则
            for body_type in BodyType:
                assert body_type in rules["suitable_for"]
                assert body_type in rules["avoid_for"]

    def test_color_season_matches_completeness(self):
        """测试色彩季型匹配配置完整性"""
        for season in ColorSeason:
            assert season in COLOR_SEASON_MATCHES
            config = COLOR_SEASON_MATCHES[season]
            assert "best_colors" in config
            assert "avoid_colors" in config
            assert len(config["best_colors"]) > 0


class TestFactoryFunctions:
    """测试工厂函数"""

    def test_create_body_analyzer(self):
        """测试创建分析器"""
        analyzer = create_body_analyzer()
        assert isinstance(analyzer, BodyAnalyzer)

    def test_create_body_analyzer_service(self):
        """测试创建服务"""
        service = create_body_analyzer_service()
        assert isinstance(service, BodyAnalyzerService)

    def test_get_body_analyzer_singleton(self):
        """测试分析器单例"""
        analyzer1 = get_body_analyzer()
        analyzer2 = get_body_analyzer()
        assert analyzer1 is analyzer2

    def test_get_body_analyzer_service_singleton(self):
        """测试服务单例"""
        service1 = get_body_analyzer_service()
        service2 = get_body_analyzer_service()
        assert service1 is service2


class TestEdgeCases:
    """测试边界情况"""

    @pytest.fixture
    def analyzer(self):
        return BodyAnalyzer()

    def test_empty_keypoints(self, analyzer):
        """测试空关键点"""
        measurements = analyzer.compute_measurements({}, 600, 400)
        assert measurements is not None

    def test_zero_proportions(self, analyzer):
        """测试零值比例"""
        measurements = BodyMeasurements(
            shoulder_width=0,
            hip_width=0,
            waist_width=0,
        )
        proportions = analyzer.compute_proportions(measurements)
        # 应该处理除零情况
        assert proportions.shoulder_to_hip_ratio == 1.0  # 默认值

    def test_invalid_body_type_string(self, analyzer):
        """测试无效体型字符串"""
        info = analyzer.get_body_type_info("invalid_type")
        assert info is not None  # 应该返回默认值

    def test_missing_item_fields(self, analyzer):
        """测试缺少字段的单品"""
        profile = BodyProfile(
            body_type=BodyType.HOURGLASS,
            confidence=0.85,
            keypoints={},
            proportions=BodyProportions(),
            measurements=BodyMeasurements(),
        )

        item = {}  # 空单品数据
        score = analyzer.calculate_fit_score(item, profile)
        assert 0 <= score.overall_score <= 1

    def test_empty_outfit_items(self, analyzer):
        """测试空穿搭列表"""
        profile = BodyProfile(
            body_type=BodyType.HOURGLASS,
            confidence=0.85,
            keypoints={},
            proportions=BodyProportions(),
            measurements=BodyMeasurements(),
        )

        result = analyzer.get_outfit_combination_score([], profile)
        assert result["overall_score"] == 0.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
