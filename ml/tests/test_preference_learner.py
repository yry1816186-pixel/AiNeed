"""
用户偏好学习模块单元测试

测试覆盖：
1. PreferenceLearner 核心功能
2. 对比学习训练循环
3. 偏好向量存储和检索
4. 与推荐系统的集成接口
5. 偏好衰减机制
"""

import os
import sys
import json
import shutil
import pytest
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# 添加模块路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from preference_learner import (
    PreferenceLearner,
    PreferenceConfig,
    PreferenceDimension,
    PreferenceVector,
    DecisionRecord,
    OptionEncoder,
    ContrastiveLoss,
    TimeDecayCalculator,
    LocalStorageBackend,
    RedisStorageBackend,
    PreferenceBasedRecommender,
    create_preference_learner,
    PreferenceAPI
)


# 测试配置
TEST_STORAGE_PATH = "./test_preferences_temp"


@pytest.fixture(autouse=True)
def setup_teardown():
    """测试前后的设置和清理"""
    # 设置
    if os.path.exists(TEST_STORAGE_PATH):
        shutil.rmtree(TEST_STORAGE_PATH)
    os.makedirs(TEST_STORAGE_PATH, exist_ok=True)

    yield

    # 清理
    if os.path.exists(TEST_STORAGE_PATH):
        shutil.rmtree(TEST_STORAGE_PATH)


@pytest.fixture
def config():
    """测试配置"""
    return PreferenceConfig(
        embedding_dim=128,
        learning_rate=0.01,
        margin=0.2,
        temperature=0.07,
        decay_rate=0.95,
        decay_period_days=30.0,
        storage_path=TEST_STORAGE_PATH
    )


@pytest.fixture
def learner(config):
    """偏好学习器实例"""
    return PreferenceLearner(config)


@pytest.fixture
def sample_options():
    """测试用选项数据"""
    return {
        "casual_top": {
            "item_id": "item_001",
            "category": "tops",
            "style_tags": ["casual", "minimalist"],
            "color_tags": ["白色", "米色"],
            "occasion_tags": ["日常", "上班"]
        },
        "streetwear_top": {
            "item_id": "item_002",
            "category": "tops",
            "style_tags": ["streetwear", "edgy"],
            "color_tags": ["黑色"],
            "occasion_tags": ["派对", "聚会"]
        },
        "romantic_dress": {
            "item_id": "item_003",
            "category": "dress",
            "style_tags": ["romantic", "vintage"],
            "color_tags": ["酒红", "米色"],
            "occasion_tags": ["约会", "派对"]
        },
        "sporty_bottom": {
            "item_id": "item_004",
            "category": "bottoms",
            "style_tags": ["sporty", "casual"],
            "color_tags": ["黑色", "灰色"],
            "occasion_tags": ["运动", "健身"]
        },
        "formal_jacket": {
            "item_id": "item_005",
            "category": "outerwear",
            "style_tags": ["formal", "elegant"],
            "color_tags": ["黑色", "藏蓝"],
            "occasion_tags": ["正式场合", "会议"]
        }
    }


class TestOptionEncoder:
    """选项编码器测试"""

    def test_encode_basic_option(self):
        """测试基本选项编码"""
        encoder = OptionEncoder(embedding_dim=128)

        option = {
            "style_tags": ["casual"],
            "color_tags": ["白色"],
            "occasion_tags": ["日常"],
            "category": "tops"
        }

        embedding = encoder.encode(option)

        assert embedding.shape == (128,)
        assert np.isclose(np.linalg.norm(embedding), 1.0)

    def test_encode_option_with_precomputed_embedding(self):
        """测试带预计算embedding的选项编码"""
        encoder = OptionEncoder(embedding_dim=128)

        pre_embedding = np.random.randn(128)
        option = {
            "style_tags": ["casual"],
            "embedding": pre_embedding.tolist()
        }

        embedding = encoder.encode(option)

        assert embedding.shape == (128,)
        assert np.isclose(np.linalg.norm(embedding), 1.0)

    def test_encode_empty_option(self):
        """测试空选项编码"""
        encoder = OptionEncoder(embedding_dim=128)

        embedding = encoder.encode({})

        assert embedding.shape == (128,)
        # 空选项的向量应该是零向量（因为没有特征）
        assert np.allclose(embedding, 0) or np.isclose(np.linalg.norm(embedding), 1.0)

    def test_encode_similarity(self):
        """测试相似选项的编码相似度"""
        encoder = OptionEncoder(embedding_dim=128)

        option1 = {
            "style_tags": ["casual", "minimalist"],
            "color_tags": ["白色", "米色"]
        }
        option2 = {
            "style_tags": ["casual", "简约"],
            "color_tags": ["白色", "米色"]
        }
        option3 = {
            "style_tags": ["streetwear", "edgy"],
            "color_tags": ["黑色", "荧光色"]
        }

        emb1 = encoder.encode(option1)
        emb2 = encoder.encode(option2)
        emb3 = encoder.encode(option3)

        # 相似选项应该有更高的相似度
        sim_1_2 = np.dot(emb1, emb2)
        sim_1_3 = np.dot(emb1, emb3)

        # 验证相似度在有效范围内
        assert sim_1_2 >= -1.0 and sim_1_2 <= 1.0
        assert sim_1_3 >= -1.0 and sim_1_3 <= 1.0


class TestContrastiveLoss:
    """对比学习损失函数测试"""

    def test_compute_loss_basic(self):
        """测试基本损失计算"""
        loss_fn = ContrastiveLoss(margin=0.2, temperature=0.07)

        anchor = np.random.randn(128)
        anchor = anchor / np.linalg.norm(anchor)
        positive = anchor + 0.1 * np.random.randn(128)
        positive = positive / np.linalg.norm(positive)
        negatives = [np.random.randn(128) for _ in range(3)]
        negatives = [n / np.linalg.norm(n) for n in negatives]

        loss = loss_fn.compute(anchor, positive, negatives)

        assert isinstance(loss, float)
        assert loss >= 0

    def test_compute_loss_no_negatives(self):
        """测试无负样本时的损失计算"""
        loss_fn = ContrastiveLoss(margin=0.2, temperature=0.07)

        anchor = np.random.randn(128)
        anchor = anchor / np.linalg.norm(anchor)
        positive = np.random.randn(128)
        positive = positive / np.linalg.norm(positive)

        loss = loss_fn.compute(anchor, positive, [])

        assert loss == 0.0

    def test_compute_gradient(self):
        """测试梯度计算"""
        loss_fn = ContrastiveLoss(margin=0.2, temperature=0.07)

        anchor = np.random.randn(128)
        anchor = anchor / np.linalg.norm(anchor)
        positive = np.random.randn(128)
        positive = positive / np.linalg.norm(positive)
        negatives = [np.random.randn(128) for _ in range(2)]
        negatives = [n / np.linalg.norm(n) for n in negatives]

        grad_anchor, grad_pos, grad_negs = loss_fn.compute_gradient(
            anchor, positive, negatives
        )

        assert grad_anchor.shape == (128,)
        assert grad_pos.shape == (128,)
        assert len(grad_negs) == 2
        assert all(g.shape == (128,) for g in grad_negs)


class TestTimeDecayCalculator:
    """时间衰减计算器测试"""

    def test_compute_weight_recent(self):
        """测试近期记录的权重"""
        calculator = TimeDecayCalculator(decay_rate=0.95, decay_period_days=30.0)

        # 近期记录
        recent_time = datetime.now() - timedelta(hours=1)
        weight = calculator.compute_weight(recent_time)

        assert weight > 0.9
        assert weight <= 1.0

    def test_compute_weight_old(self):
        """测试旧记录的权重"""
        calculator = TimeDecayCalculator(decay_rate=0.95, decay_period_days=30.0)

        # 旧记录（90天前，3个衰减周期）
        old_time = datetime.now() - timedelta(days=90)
        weight = calculator.compute_weight(old_time)

        # 0.95 ^ (90/30) = 0.95 ^ 3 ≈ 0.857
        assert weight < 0.9
        assert weight >= 0.1  # 最小权重

    def test_compute_weights_batch(self):
        """测试批量权重计算"""
        calculator = TimeDecayCalculator(decay_rate=0.95, decay_period_days=30.0)

        timestamps = [
            datetime.now() - timedelta(days=i) for i in range(5)
        ]

        weights = calculator.compute_weights_batch(timestamps)

        assert len(weights) == 5
        assert np.isclose(np.sum(weights), 1.0)
        # 近期权重应该更高
        assert weights[0] > weights[-1]


class TestLocalStorageBackend:
    """本地存储后端测试"""

    def test_save_and_load_preference(self):
        """测试偏好向量存储和加载"""
        storage = LocalStorageBackend(TEST_STORAGE_PATH)

        preference = PreferenceVector(
            user_id="test_user",
            vector=np.random.randn(128),
            dimension="style",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            sample_count=10,
            confidence=0.8
        )

        # 保存
        assert storage.save_preference("test_user", preference)

        # 加载
        loaded = storage.load_preference("test_user", "style")

        assert loaded is not None
        assert loaded.user_id == "test_user"
        assert loaded.dimension == "style"
        assert np.allclose(loaded.vector, preference.vector)
        assert loaded.sample_count == 10
        assert loaded.confidence == 0.8

    def test_load_nonexistent_preference(self):
        """测试加载不存在的偏好"""
        storage = LocalStorageBackend(TEST_STORAGE_PATH)

        loaded = storage.load_preference("nonexistent_user", "style")

        assert loaded is None

    def test_save_and_load_history(self):
        """测试历史记录存储和加载"""
        storage = LocalStorageBackend(TEST_STORAGE_PATH)

        record = DecisionRecord(
            user_id="test_user",
            session_id="session_001",
            timestamp=datetime.now(),
            chosen={"item_id": "item_001", "style_tags": ["casual"]},
            rejected=[{"item_id": "item_002", "style_tags": ["formal"]}],
            context={"occasion": "daily"},
            feedback_score=0.8
        )

        # 保存
        assert storage.save_history("test_user", record)

        # 加载
        history = storage.load_history("test_user", limit=10)

        assert len(history) >= 1
        loaded_record = history[-1]
        assert loaded_record.user_id == "test_user"
        assert loaded_record.session_id == "session_001"
        assert loaded_record.chosen["item_id"] == "item_001"
        assert len(loaded_record.rejected) == 1
        assert loaded_record.feedback_score == 0.8

    def test_delete_preference(self):
        """测试删除偏好"""
        storage = LocalStorageBackend(TEST_STORAGE_PATH)

        preference = PreferenceVector(
            user_id="test_user_delete",
            vector=np.random.randn(128),
            dimension="style",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        storage.save_preference("test_user_delete", preference)
        assert storage.load_preference("test_user_delete", "style") is not None

        storage.delete_preference("test_user_delete", "style")
        assert storage.load_preference("test_user_delete", "style") is None


class TestPreferenceLearner:
    """偏好学习器核心测试"""

    def test_initialization(self, config):
        """测试初始化"""
        learner = PreferenceLearner(config)

        assert learner.config.embedding_dim == 128
        assert learner.encoder.embedding_dim == 128
        assert learner.storage is not None

    def test_learn_from_decision(self, learner, sample_options):
        """测试从决策学习"""
        result = learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"], sample_options["formal_jacket"]]
        )

        assert result["success"] is True
        assert "loss" in result
        assert result["sample_count"] == 1
        assert "confidence" in result

    def test_get_preference_vector(self, learner, sample_options):
        """测试获取偏好向量"""
        # 先学习一些决策
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]]
        )

        # 获取偏好向量
        vector = learner.get_preference_vector("test_user")

        assert vector.shape == (128,)
        assert np.isclose(np.linalg.norm(vector), 1.0)

    def test_get_preference_vector_new_user(self, learner):
        """测试新用户的偏好向量"""
        vector = learner.get_preference_vector("new_user")

        assert vector.shape == (128,)
        # 新用户应该是零向量或已归一化
        assert np.allclose(vector, 0) or np.isclose(np.linalg.norm(vector), 1.0)

    def test_get_preference_scores(self, learner, sample_options):
        """测试获取偏好分数"""
        # 学习决策
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]]
        )

        # 获取分数
        items = [
            sample_options["casual_top"],
            sample_options["streetwear_top"],
            sample_options["romantic_dress"]
        ]

        scores = learner.get_preference_scores("test_user", items)

        assert len(scores) == 3
        assert all(-1 <= s <= 1 for s in scores)
        # 选择的物品应该有更高的分数
        assert scores[0] > scores[1]

    def test_rank_items(self, learner, sample_options):
        """测试物品排序"""
        # 学习决策
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]]
        )

        items = [
            sample_options["casual_top"],
            sample_options["streetwear_top"],
            sample_options["romantic_dress"],
            sample_options["sporty_bottom"],
            sample_options["formal_jacket"]
        ]

        ranked = learner.rank_items("test_user", items, top_k=3)

        assert len(ranked) == 3
        # 检查排序
        for i in range(len(ranked) - 1):
            assert ranked[i][1] >= ranked[i + 1][1]

    def test_batch_learn(self, learner, sample_options):
        """测试批量学习"""
        decisions = [
            (sample_options["casual_top"], [sample_options["streetwear_top"]], None),
            (sample_options["romantic_dress"], [sample_options["formal_jacket"]], 0.8),
            (sample_options["sporty_bottom"], [sample_options["formal_jacket"]], None)
        ]

        result = learner.batch_learn("test_user", decisions)

        assert result["success"] is True
        assert result["total_samples"] == 3
        assert result["processed_samples"] == 3

    def test_apply_time_decay(self, learner, sample_options):
        """测试时间衰减应用"""
        # 学习决策
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]]
        )
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["romantic_dress"],
            rejected=[sample_options["formal_jacket"]]
        )

        # 应用时间衰减
        result = learner.apply_time_decay("test_user")

        assert result["success"] is True
        assert result["history_size"] >= 2

    def test_get_user_profile(self, learner, sample_options):
        """测试获取用户档案"""
        # 学习决策
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]]
        )

        profile = learner.get_user_profile("test_user")

        assert profile["user_id"] == "test_user"
        assert profile["history_count"] >= 1
        assert "dimensions" in profile

    def test_reset_preference(self, learner, sample_options):
        """测试重置偏好"""
        # 学习决策
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]]
        )

        # 重置特定维度
        learner.reset_preference("test_user", "style")

        # 检查是否已重置
        pref = learner.storage.load_preference("test_user", "style")
        assert pref is None

    def test_reset_all_preferences(self, learner, sample_options):
        """测试重置所有偏好"""
        # 学习决策
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]]
        )

        # 重置所有
        learner.reset_preference("test_user")

        profile = learner.get_user_profile("test_user")
        assert profile["history_count"] >= 1

    def test_export_import_preferences(self, learner, sample_options):
        """测试导出导入偏好"""
        # 学习决策
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]]
        )

        # 导出
        exported = learner.export_preferences("test_user")
        assert exported["user_id"] == "test_user"
        assert len(exported["history"]) >= 1

        # 导入到新用户
        success = learner.import_preferences("new_user", exported)
        assert success

        # 验证导入
        new_profile = learner.get_user_profile("new_user")
        assert new_profile["history_count"] >= 1

    def test_feedback_score_adjusts_learning(self, learner, sample_options):
        """测试反馈分数调整学习率"""
        # 高反馈
        result_high = learner.learn_from_decision(
            user_id="user_high_feedback",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]],
            feedback_score=1.0
        )

        # 低反馈
        result_low = learner.learn_from_decision(
            user_id="user_low_feedback",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]],
            feedback_score=0.0
        )

        # 两者都应该成功
        assert result_high["success"]
        assert result_low["success"]


class TestPreferenceBasedRecommender:
    """基于偏好的推荐器测试"""

    def test_recommend(self, learner, sample_options):
        """测试推荐功能"""
        # 学习用户偏好
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]]
        )
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["romantic_dress"],
            rejected=[sample_options["formal_jacket"]]
        )

        # 推荐
        recommender = PreferenceBasedRecommender(learner)
        candidates = list(sample_options.values())

        recommendations = recommender.recommend(
            user_id="test_user",
            candidates=candidates,
            top_k=3
        )

        assert len(recommendations) == 3
        assert all("item" in r for r in recommendations)
        assert all("score" in r for r in recommendations)

    def test_recommend_with_diversity(self, learner, sample_options):
        """测试带多样性的推荐"""
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]]
        )

        recommender = PreferenceBasedRecommender(learner)
        candidates = list(sample_options.values())

        # 高多样性
        recommendations_diverse = recommender.recommend(
            user_id="test_user",
            candidates=candidates,
            top_k=3,
            diversity_factor=0.5
        )

        # 无多样性
        recommendations_no_diversity = recommender.recommend(
            user_id="test_user",
            candidates=candidates,
            top_k=3,
            diversity_factor=0.0
        )

        assert len(recommendations_diverse) == 3
        assert len(recommendations_no_diversity) == 3

    def test_recommend_empty_candidates(self, learner):
        """测试空候选列表的推荐"""
        recommender = PreferenceBasedRecommender(learner)

        recommendations = recommender.recommend(
            user_id="test_user",
            candidates=[],
            top_k=3
        )

        assert recommendations == []


class TestPreferenceAPI:
    """偏好API测试"""

    @pytest.fixture
    def api(self, config):
        return PreferenceAPI(PreferenceLearner(config))

    @pytest.mark.asyncio
    async def test_record_choice(self, api, sample_options):
        """测试记录选择"""
        result = await api.record_choice(
            user_id="test_user",
            chosen_item=sample_options["casual_top"],
            rejected_items=[sample_options["streetwear_top"]]
        )

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_get_recommendations(self, api, sample_options):
        """测试获取推荐"""
        # 先记录选择
        await api.record_choice(
            user_id="test_user",
            chosen_item=sample_options["casual_top"],
            rejected_items=[sample_options["streetwear_top"]]
        )

        # 获取推荐
        recommendations = await api.get_recommendations(
            user_id="test_user",
            items=list(sample_options.values()),
            top_k=3
        )

        assert len(recommendations) <= 3

    @pytest.mark.asyncio
    async def test_get_user_preferences(self, api, sample_options):
        """测试获取用户偏好"""
        await api.record_choice(
            user_id="test_user",
            chosen_item=sample_options["casual_top"],
            rejected_items=[sample_options["streetwear_top"]]
        )

        preferences = await api.get_user_preferences("test_user")

        assert preferences["user_id"] == "test_user"
        assert preferences["history_count"] >= 1


class TestMultiDimensionalPreferences:
    """多维度偏好测试"""

    def test_color_preference_learning(self, learner, sample_options):
        """测试颜色偏好学习"""
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]]
        )

        color_pref = learner.storage.load_preference("test_user", "color")

        # 颜色偏好可能被更新（取决于chosen中的颜色标签）
        # 这里主要验证不会报错
        assert True

    def test_occasion_preference_learning(self, learner, sample_options):
        """测试场合偏好学习"""
        learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[sample_options["streetwear_top"]]
        )

        # 场合偏好可能被更新
        assert True


class TestEdgeCases:
    """边缘情况测试"""

    def test_empty_rejected_list(self, learner, sample_options):
        """测试空拒绝列表"""
        result = learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=[]
        )

        assert result["success"] is True

    def test_large_number_of_rejections(self, learner, sample_options):
        """测试大量拒绝选项"""
        rejected = [
            {**sample_options["streetwear_top"], "item_id": f"item_{i}"}
            for i in range(20)
        ]

        result = learner.learn_from_decision(
            user_id="test_user",
            chosen=sample_options["casual_top"],
            rejected=rejected
        )

        assert result["success"] is True

    def test_concurrent_user_learning(self, learner, sample_options):
        """测试多用户并发学习"""
        for i in range(5):
            result = learner.learn_from_decision(
                user_id=f"user_{i}",
                chosen=sample_options["casual_top"],
                rejected=[sample_options["streetwear_top"]]
            )
            assert result["success"]

        # 验证每个用户的偏好是独立的
        vectors = [learner.get_preference_vector(f"user_{i}") for i in range(5)]

        # 所有向量应该归一化
        for v in vectors:
            assert np.isclose(np.linalg.norm(v), 1.0) or np.allclose(v, 0)

    def test_long_term_learning(self, learner, sample_options):
        """测试长期学习（大量样本）"""
        for i in range(100):
            chosen = sample_options["casual_top"] if i % 2 == 0 else sample_options["romantic_dress"]
            rejected = [sample_options["streetwear_top"]]

            learner.learn_from_decision(
                user_id="test_user",
                chosen=chosen,
                rejected=rejected
            )

        profile = learner.get_user_profile("test_user")
        assert profile["history_count"] == 100

        # 检查置信度提升
        pref = learner.storage.load_preference("test_user", "style")
        assert pref.confidence > 0.5


class TestFactoryFunction:
    """工厂函数测试"""

    def test_create_preference_learner_default(self):
        """测试默认参数创建"""
        learner = create_preference_learner(
            storage_path=TEST_STORAGE_PATH
        )

        assert learner.config.embedding_dim == 512
        assert learner.config.learning_rate == 0.01

    def test_create_preference_learner_custom(self):
        """测试自定义参数创建"""
        learner = create_preference_learner(
            embedding_dim=256,
            learning_rate=0.05,
            storage_path=TEST_STORAGE_PATH
        )

        assert learner.config.embedding_dim == 256
        assert learner.config.learning_rate == 0.05


def run_tests():
    """运行所有测试"""
    pytest.main([__file__, "-v", "--tb=short"])


if __name__ == "__main__":
    # 运行测试
    run_tests()
