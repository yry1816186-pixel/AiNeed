"""
Tests for CoordinationModel architecture and training data generation.

Verifies:
  - Model forward pass produces correct output shape and value range
  - Model parameter count falls within 8M-12M range
  - Training data generation produces correct positive/negative samples
  - Train/val/test split ratios are correct
"""

import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
import torch

# Ensure ml package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ml.models.coordination_model import CoordinationModel
from ml.scripts.generate_coordination_training_data import (
    ALL_CATEGORIES,
    CATEGORY_TO_ID,
    TOP_CATEGORIES,
    BOTTOM_CATEGORIES,
    augment_with_fabric_rules,
    generate_negative_samples,
    generate_positive_samples,
    load_compatibility_rules,
    split_data,
)
from ml.models.coordination_model import NUM_CATEGORIES, EMBED_DIM, AUX_DIM as AUG_DIM


# ---------------------------------------------------------------------------
# Model Architecture Tests
# ---------------------------------------------------------------------------


class TestModelForwardPass:
    """Verify model forward pass produces correct shapes and ranges."""

    def setup_method(self) -> None:
        self.model = CoordinationModel()
        self.model.eval()
        self.batch_size = 8

    def test_output_shape(self) -> None:
        """Forward pass should produce (batch,) shaped output."""
        item_a = torch.randint(0, NUM_CATEGORIES, (self.batch_size,))
        item_b = torch.randint(0, NUM_CATEGORIES, (self.batch_size,))
        aux_a = torch.randn(self.batch_size, AUG_DIM)
        aux_b = torch.randn(self.batch_size, AUG_DIM)

        with torch.no_grad():
            output = self.model(item_a, item_b, aux_a, aux_b)

        assert output.shape == (self.batch_size,), (
            f"Expected shape ({self.batch_size},), got {output.shape}"
        )

    def test_output_range(self) -> None:
        """All output values should be in [0, 1] (sigmoid output)."""
        item_a = torch.randint(0, NUM_CATEGORIES, (32,))
        item_b = torch.randint(0, NUM_CATEGORIES, (32,))
        aux_a = torch.randn(32, AUG_DIM)
        aux_b = torch.randn(32, AUG_DIM)

        with torch.no_grad():
            output = self.model(item_a, item_b, aux_a, aux_b)

        assert (output >= 0.0).all(), f"Found negative values: min={output.min()}"
        assert (output <= 1.0).all(), f"Found values > 1: max={output.max()}"

    def test_single_item_batch(self) -> None:
        """Model should work with batch_size=1."""
        item_a = torch.tensor([5])
        item_b = torch.tensor([15])
        aux_a = torch.randn(1, AUG_DIM)
        aux_b = torch.randn(1, AUG_DIM)

        with torch.no_grad():
            output = self.model(item_a, item_b, aux_a, aux_b)

        assert output.shape == (1,)
        assert 0.0 <= output.item() <= 1.0

    def test_gradient_flow(self) -> None:
        """Gradients should flow through the entire model."""
        self.model.train()
        item_a = torch.randint(0, NUM_CATEGORIES, (4,))
        item_b = torch.randint(0, NUM_CATEGORIES, (4,))
        aux_a = torch.randn(4, AUG_DIM)
        aux_b = torch.randn(4, AUG_DIM)
        labels = torch.tensor([1.0, 0.0, 1.0, 0.0])

        output = self.model(item_a, item_b, aux_a, aux_b)
        loss = torch.nn.functional.binary_cross_entropy(output, labels)
        loss.backward()

        # Check that encoder parameters received gradients
        for name, param in self.model.named_parameters():
            if param.requires_grad:
                assert param.grad is not None, f"No gradient for {name}"


class TestModelParameterCount:
    """Verify model has ~10M parameters (8M-12M range)."""

    def test_parameter_count_in_range(self) -> None:
        """Model should have between 8M and 12M parameters."""
        model = CoordinationModel()
        counts = model.count_parameters()

        total = counts["total"]
        assert 8_000_000 <= total <= 12_000_000, (
            f"Parameter count {total} outside acceptable range [8M, 12M]"
        )

    def test_parameter_count_breakdown(self) -> None:
        """Parameter breakdown should sum to total."""
        model = CoordinationModel()
        counts = model.count_parameters()

        component_sum = (
            counts["item_encoder"]
            + counts["cross_attention_blocks"]
            + counts["output_head"]
        )
        assert counts["total"] == component_sum, (
            f"Component sum {component_sum} != total {counts['total']}"
        )

    def test_count_parameters_method(self) -> None:
        """count_parameters() returns expected dict structure."""
        model = CoordinationModel()
        counts = model.count_parameters()

        expected_keys = {
            "item_encoder", "cross_attention_blocks",
            "output_head", "total", "total_millions",
        }
        assert set(counts.keys()) == expected_keys
        assert counts["total_millions"] == round(counts["total"] / 1_000_000, 2)


# ---------------------------------------------------------------------------
# Training Data Tests
# ---------------------------------------------------------------------------


class TestTrainingDataGeneration:
    """Verify training data generation logic."""

    @pytest.fixture
    def sample_rules(self) -> list:
        """Create minimal compatibility rules for testing."""
        return [
            {
                "id": "ic_t_shirt_jeans",
                "top_category": "t_shirt",
                "bottom_category": "jeans",
                "compatibility_score": 0.85,
                "suitable_occasions": ["daily", "casual"],
                "suitable_seasons": ["spring", "summer", "autumn", "winter"],
                "suitable_styles": ["casual", "streetwear"],
            },
            {
                "id": "ic_blazer_trousers",
                "top_category": "blazer",
                "bottom_category": "trousers",
                "compatibility_score": 0.85,
                "suitable_occasions": ["work", "interview"],
                "suitable_seasons": ["autumn", "winter"],
                "suitable_styles": ["business", "formal"],
            },
            {
                "id": "ic_hoodie_joggers",
                "top_category": "hoodie",
                "bottom_category": "joggers",
                "compatibility_score": 0.85,
                "suitable_occasions": ["daily", "casual"],
                "suitable_seasons": ["spring", "summer", "autumn", "winter"],
                "suitable_styles": ["casual", "sporty"],
            },
            {
                "id": "ic_blazer_joggers",
                "top_category": "blazer",
                "bottom_category": "joggers",
                "compatibility_score": 0.25,
                "suitable_occasions": [],
                "suitable_seasons": ["spring", "summer", "autumn", "winter"],
                "suitable_styles": ["casual"],
            },
        ]

    def test_positive_samples_correct(self, sample_rules: list) -> None:
        """Positive samples should only include pairs with score >= 0.7."""
        positives = generate_positive_samples(sample_rules, min_score=0.7)

        assert len(positives) == 3, f"Expected 3 positives, got {len(positives)}"

        for sample in positives:
            assert sample["label"] == 1
            assert sample["score"] >= 0.7
            assert sample["item_a_category"] in CATEGORY_TO_ID
            assert sample["item_b_category"] in CATEGORY_TO_ID
            assert "item_a_category_id" in sample
            assert "item_b_category_id" in sample

    def test_positive_excludes_low_score(self, sample_rules: list) -> None:
        """Pairs with score < 0.7 should be excluded from positives."""
        positives = generate_positive_samples(sample_rules, min_score=0.7)
        categories = {(s["item_a_category"], s["item_b_category"]) for s in positives}

        # blazer+joggers has score 0.25, should NOT be in positives
        assert ("blazer", "joggers") not in categories

    def test_negative_samples_correct(self, sample_rules: list) -> None:
        """Negative samples should not overlap with positive pairs."""
        positives = generate_positive_samples(sample_rules, min_score=0.7)
        negatives = generate_negative_samples(
            positives, ratio=4.0, seed=42, all_rules=sample_rules,
        )

        assert len(negatives) > 0

        positive_pairs = {(s["item_a_category"], s["item_b_category"]) for s in positives}

        for neg in negatives:
            assert neg["label"] == 0
            assert neg["score"] < 0.5
            pair = (neg["item_a_category"], neg["item_b_category"])
            assert pair not in positive_pairs, f"Negative {pair} overlaps with positive"

    def test_negative_ratio(self, sample_rules: list) -> None:
        """Negative count should approximate ratio * positive count."""
        positives = generate_positive_samples(sample_rules, min_score=0.7)
        negatives = generate_negative_samples(
            positives, ratio=4.0, seed=42, all_rules=sample_rules,
        )

        expected = int(len(positives) * 4.0)
        # Allow some tolerance since some random pairs may coincide with known pairs
        assert abs(len(negatives) - expected) <= expected * 0.5


class TestTrainingDataSplit:
    """Verify train/val/test split ratios."""

    def test_split_ratios(self) -> None:
        """Split should approximately follow 80/10/10 ratio."""
        # Create 100 synthetic samples
        samples = []
        for i in range(100):
            samples.append({
                "item_a_category": "t_shirt",
                "item_a_category_id": 0,
                "item_b_category": "jeans",
                "item_b_category_id": 12,
                "item_a_aux": [0.0] * 16,
                "item_b_aux": [0.0] * 16,
                "pair_aux": [0.0] * 16,
                "label": i % 2,
                "score": 0.8 if i % 2 == 0 else 0.2,
                "source": "synthetic",
            })

        train, val, test = split_data(samples, train_ratio=0.8, val_ratio=0.1, test_ratio=0.1)

        assert len(train) == 80
        assert len(val) == 10
        assert len(test) == 10
        assert len(train) + len(val) + len(test) == 100

    def test_split_preserves_all_samples(self) -> None:
        """All samples should be present in exactly one split."""
        samples = [
            {"id": i, "label": i % 2} for i in range(50)
        ]
        train, val, test = split_data(samples)

        all_ids = {s["id"] for s in train + val + test}
        assert len(all_ids) == 50
        assert all_ids == set(range(50))

    def test_split_is_deterministic(self) -> None:
        """Same seed should produce same split."""
        samples = [{"id": i} for i in range(30)]
        train1, val1, test1 = split_data(samples, seed=42)
        train2, val2, test2 = split_data(samples, seed=42)

        assert [s["id"] for s in train1] == [s["id"] for s in train2]
        assert [s["id"] for s in val1] == [s["id"] for s in val2]
        assert [s["id"] for s in test1] == [s["id"] for s in test2]
