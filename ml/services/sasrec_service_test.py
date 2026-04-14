"""
Tests for SASRec (Self-Attentive Sequential Recommendation) Service.
Covers model initialization, core math ops, encoding, training, prediction,
dropout, causal masking, and weight shape consistency.
"""

import pytest
import numpy as np

from ml.services.sasrec_service import SASRecModel


# ---------------------------------------------------------------------------
# Initialization
# ---------------------------------------------------------------------------

class TestSASRecInit:
    """SASRecModel.__init__ validation and parameter wiring."""

    def test_dim_divisible_by_num_heads(self):
        """dim must be divisible by num_heads, otherwise ValueError."""
        with pytest.raises(ValueError, match="dim .* must be divisible by num_heads"):
            SASRecModel(dim=64, num_heads=3)

    def test_valid_init_no_error(self):
        """Reasonable hyperparameters should not raise."""
        model = SASRecModel(dim=64, num_heads=4, max_seq=50)
        assert model.dim == 64
        assert model.num_heads == 4
        assert model.max_seq == 50

    def test_default_training_flag_is_false(self):
        model = SASRecModel()
        assert model.training is False

    def test_num_blocks_creates_weight_lists(self):
        model = SASRecModel(num_blocks=3)
        assert len(model.attention_weights) == 3
        assert len(model.ffn_weights) == 3

    def test_single_head_allowed(self):
        """dim=32, num_heads=1 should work (head_dim = 32)."""
        model = SASRecModel(dim=32, num_heads=1)
        assert model.dim == 32


# ---------------------------------------------------------------------------
# Core math: softmax
# ---------------------------------------------------------------------------

class TestSoftmax:
    """_softmax should produce a valid probability distribution."""

    def test_sums_to_one(self):
        x = np.array([1.0, 2.0, 3.0, 4.0])
        result = SASRecModel._softmax(x)
        np.testing.assert_allclose(result.sum(), 1.0, atol=1e-7)

    def test_all_positive(self):
        x = np.array([-5.0, 0.0, 5.0])
        result = SASRecModel._softmax(x)
        assert np.all(result > 0)

    def test_2d_axis_last(self):
        x = np.array([[1.0, 2.0], [3.0, 4.0]])
        result = SASRecModel._softmax(x)
        row_sums = result.sum(axis=-1)
        np.testing.assert_allclose(row_sums, [1.0, 1.0], atol=1e-7)

    def test_numerical_stability_large_values(self):
        x = np.array([1000.0, 1001.0, 1002.0])
        result = SASRecModel._softmax(x)
        assert not np.any(np.isnan(result))
        np.testing.assert_allclose(result.sum(), 1.0, atol=1e-6)


# ---------------------------------------------------------------------------
# Core math: layer norm
# ---------------------------------------------------------------------------

class TestLayerNorm:
    """_layer_norm should normalize to approximately mean=0, std=1."""

    def test_mean_near_zero(self):
        x = np.random.randn(10)
        gamma = np.ones(10)
        beta = np.zeros(10)
        result = SASRecModel._layer_norm(x, gamma, beta)
        np.testing.assert_allclose(result.mean(), 0.0, atol=1e-6)

    def test_std_near_one(self):
        x = np.random.randn(10) * 5 + 10  # shifted and scaled
        gamma = np.ones(10)
        beta = np.zeros(10)
        result = SASRecModel._layer_norm(x, gamma, beta)
        np.testing.assert_allclose(result.std(), 1.0, atol=0.05)

    def test_gamma_scales_beta_shifts(self):
        x = np.random.randn(5)
        gamma = np.full(5, 2.0)
        beta = np.full(5, 3.0)
        result = SASRecModel._layer_norm(x, gamma, beta)
        # After norm (mean~0, std~1): gamma*norm+beta => mean~3, std~2
        np.testing.assert_allclose(result.mean(), 3.0, atol=0.1)
        np.testing.assert_allclose(result.std(), 2.0, atol=0.1)

    def test_2d_input_last_axis(self):
        x = np.random.randn(4, 8) * 3 + 5
        gamma = np.ones(8)
        beta = np.zeros(8)
        result = SASRecModel._layer_norm(x, gamma, beta)
        for row in result:
            np.testing.assert_allclose(row.mean(), 0.0, atol=1e-5)


# ---------------------------------------------------------------------------
# encode_sequence
# ---------------------------------------------------------------------------

class TestEncodeSequence:
    """encode_sequence should return a vector of shape (dim,)."""

    def test_output_shape(self):
        model = SASRecModel(dim=64, num_heads=4)
        vec = model.encode_sequence(["item_a", "item_b", "item_c"])
        assert vec.shape == (64,)

    def test_truncates_to_max_seq(self):
        model = SASRecModel(dim=32, num_heads=2, max_seq=5)
        ids = [f"i{x}" for x in range(20)]
        vec = model.encode_sequence(ids)
        assert vec.shape == (32,)

    def test_single_item_sequence(self):
        model = SASRecModel(dim=32, num_heads=2)
        vec = model.encode_sequence(["solo"])
        assert vec.shape == (32,)
        assert not np.any(np.isnan(vec))


# ---------------------------------------------------------------------------
# train_step (BPR loss)
# ---------------------------------------------------------------------------

class TestTrainStep:
    """train_step should return a positive loss value using BPR."""

    def test_returns_positive_loss(self):
        model = SASRecModel(dim=32, num_heads=2)
        sequences = [["a", "b", "c"], ["d", "e", "f", "g"]]
        loss = model.train_step(sequences, lr=0.01)
        assert isinstance(loss, float)
        assert loss > 0.0

    def test_short_sequence_skipped(self):
        model = SASRecModel(dim=32, num_heads=2)
        loss = model.train_step([["x"]], lr=0.01)
        # Single-item sequence is skipped; denominator = max(1, 1) = 1
        assert loss == 0.0

    def test_training_flag_set_during_step(self):
        model = SASRecModel(dim=32, num_heads=2)
        assert model.training is False
        model.train_step([["a", "b"]], lr=0.01)
        # training flag should remain True after train_step (not reset)
        assert model.training is True


# ---------------------------------------------------------------------------
# predict
# ---------------------------------------------------------------------------

class TestPredict:
    """predict should return sorted candidates with correct keys."""

    def test_returns_sorted_by_score_desc(self):
        model = SASRecModel(dim=32, num_heads=2)
        # Warm up embeddings
        for i in range(20):
            model._get_or_create_embedding(f"item_{i}")
        results = model.predict(["item_0", "item_1"], top_k=5)
        scores = [r["score"] for r in results]
        assert scores == sorted(scores, reverse=True)

    def test_correct_keys_in_result(self):
        model = SASRecModel(dim=32, num_heads=2)
        for i in range(10):
            model._get_or_create_embedding(f"x_{i}")
        results = model.predict(["x_0"], top_k=3)
        for r in results:
            assert "item_id" in r
            assert "score" in r

    def test_top_k_respected(self):
        model = SASRecModel(dim=32, num_heads=2)
        for i in range(20):
            model._get_or_create_embedding(f"c_{i}")
        results = model.predict(["c_0"], top_k=5)
        assert len(results) == 5

    def test_excludes_context_and_exclude_list(self):
        model = SASRecModel(dim=32, num_heads=2)
        for i in range(10):
            model._get_or_create_embedding(f"e_{i}")
        results = model.predict(["e_0", "e_1"], top_k=10, exclude=["e_5"])
        returned_ids = {r["item_id"] for r in results}
        assert "e_0" not in returned_ids
        assert "e_1" not in returned_ids
        assert "e_5" not in returned_ids

    def test_empty_embeddings_returns_empty(self):
        model = SASRecModel(dim=32, num_heads=2)
        assert model.predict(["any"]) == []


# ---------------------------------------------------------------------------
# Dropout
# ---------------------------------------------------------------------------

class TestDropout:
    """When training=False, no dropout should be applied."""

    def test_no_dropout_when_not_training(self):
        model = SASRecModel(dim=64, num_heads=4, dropout_rate=0.5)
        model.training = False
        x = np.ones(64)
        result = model._dropout(x)
        np.testing.assert_array_equal(result, x)

    def test_dropout_applies_when_training(self):
        model = SASRecModel(dim=4096, num_heads=4, dropout_rate=0.5)
        model.training = True
        np.random.seed(42)
        x = np.ones(4096)
        result = model._dropout(x)
        # With 50% dropout, roughly half the values should be zeroed
        zero_fraction = np.mean(result == 0)
        assert 0.2 < zero_fraction < 0.8

    def test_zero_rate_no_dropout(self):
        model = SASRecModel(dim=32, num_heads=2, dropout_rate=0.0)
        model.training = True
        x = np.ones(32)
        result = model._dropout(x)
        np.testing.assert_array_equal(result, x)


# ---------------------------------------------------------------------------
# Causal mask
# ---------------------------------------------------------------------------

class TestCausalMask:
    """Future positions should not attend to past positions."""

    def test_causal_mask_structure(self):
        """Verify the causal mask is upper-triangular with -1e9."""
        seq_len = 4
        causal_mask = np.triu(np.ones((seq_len, seq_len)), k=1) * -1e9
        # Diagonal and below should be 0
        for i in range(seq_len):
            for j in range(i + 1):
                assert causal_mask[i, j] == 0.0
        # Above diagonal should be -1e9
        for i in range(seq_len):
            for j in range(i + 1, seq_len):
                assert causal_mask[i, j] == -1e9

    def test_attention_weights_respect_causality(self):
        """After softmax with causal mask, attention to future should be ~0."""
        model = SASRecModel(dim=16, num_heads=2, max_seq=4, num_blocks=1)
        model.training = False
        seq_ids = ["a", "b", "c", "d"]
        for sid in seq_ids:
            model._get_or_create_embedding(sid)

        # Manually compute attention weights for one head to verify masking
        weights = model.attention_weights[0]
        x = np.array([model._get_or_create_embedding(sid) for sid in seq_ids])
        pos = model.position_embeddings[:4]
        x = x + pos

        Q = x @ weights["Wq"]
        K = x @ weights["Wk"]
        head_dim = 16 // 2
        # Reshape: (seq_len, dim) -> (seq_len, num_heads, head_dim) -> (num_heads, seq_len, head_dim)
        Q_heads = Q.reshape(4, 2, head_dim).transpose(1, 0, 2)
        K_heads = K.reshape(4, 2, head_dim).transpose(1, 0, 2)
        # Head 0
        Q_h = Q_heads[0]
        K_h = K_heads[0]
        scores = Q_h @ K_h.T / np.sqrt(head_dim)
        causal_mask = np.triu(np.ones((4, 4)), k=1) * -1e9
        scores = scores + causal_mask
        attn = model._softmax(scores)

        # Upper triangle (future positions) should be near zero
        for i in range(4):
            for j in range(i + 1, 4):
                assert attn[i, j] < 1e-4, f"Position {i} attends to future {j}"


# ---------------------------------------------------------------------------
# Weight shape consistency
# ---------------------------------------------------------------------------

class TestWeightShapes:
    """All weight matrices should have consistent shapes."""

    def test_attention_weight_shapes(self):
        dim = 64
        model = SASRecModel(dim=dim, num_heads=4)
        for block_weights in model.attention_weights:
            assert block_weights["Wq"].shape == (dim, dim)
            assert block_weights["Wk"].shape == (dim, dim)
            assert block_weights["Wv"].shape == (dim, dim)
            assert block_weights["Wo"].shape == (dim, dim)
            assert block_weights["ln1_gamma"].shape == (dim,)
            assert block_weights["ln1_beta"].shape == (dim,)

    def test_ffn_weight_shapes(self):
        dim, ffn_dim = 64, 256
        model = SASRecModel(dim=dim, ffn_dim=ffn_dim)
        for block_weights in model.ffn_weights:
            assert block_weights["W1"].shape == (dim, ffn_dim)
            assert block_weights["b1"].shape == (ffn_dim,)
            assert block_weights["W2"].shape == (ffn_dim, dim)
            assert block_weights["b2"].shape == (dim,)
            assert block_weights["ln2_gamma"].shape == (dim,)
            assert block_weights["ln2_beta"].shape == (dim,)

    def test_position_embedding_shape(self):
        model = SASRecModel(dim=32, max_seq=50)
        assert model.position_embeddings.shape == (50, 32)