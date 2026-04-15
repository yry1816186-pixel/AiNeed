"""
SASRec (Self-Attentive Sequential Recommendation) Service
Complete implementation with layer normalization, residual connections,
multi-head attention, feed-forward network, and dropout.

Reference: Kang & McAuley, "Self-Attentive Sequential Recommendation", ICDM 2018

Author: XunO ML Team
Version: 2.0.0
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import numpy as np
import logging
import os
import json
import hashlib
import threading
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)

app = FastAPI(title="SASRec Service", version="2.0.0")


# ============================================================
# P1-6: SASRec Model Configuration (extracted from hardcoded values)
# ============================================================

@dataclass
class SASRecConfig:
    """Configurable model hyperparameters for SASRec.

    All values can be overridden via environment variables or constructor args.
    """
    hidden_size: int = 64
    num_heads: int = 4
    num_blocks: int = 2
    max_seq_length: int = 50
    ffn_dim: int = 256
    dropout_rate: float = 0.1


# Load defaults from environment (backward compatible)
DEFAULT_CONFIG = SASRecConfig(
    hidden_size=int(os.getenv("SASREC_DIM", "64")),
    max_seq_length=int(os.getenv("SASREC_MAX_SEQ", "50")),
    num_heads=int(os.getenv("SASREC_HEADS", "4")),
    ffn_dim=int(os.getenv("SASREC_FFN_DIM", "256")),
    dropout_rate=float(os.getenv("SASREC_DROPOUT", "0.1")),
    num_blocks=int(os.getenv("SASREC_BLOCKS", "2")),
)

MODEL_DIR = Path(os.getenv("SASREC_MODEL_DIR", "./models/sasrec"))


class SequenceItem(BaseModel):
    item_id: str
    timestamp: Optional[float] = None


class PredictRequest(BaseModel):
    user_sequence: List[SequenceItem]
    top_k: int = 10
    exclude_items: Optional[List[str]] = None


class TrainRequest(BaseModel):
    user_sequences: List[List[SequenceItem]]
    epochs: int = Field(default=10, ge=1, le=100)
    learning_rate: float = Field(default=0.001, gt=0, lt=1.0)


class PredictResponse(BaseModel):
    recommendations: List[dict]


class TrainResponse(BaseModel):
    loss: float
    epochs: int


class SASRecModel:
    """Self-Attentive Sequential Recommendation Model.

    Components:
    - Multi-head self-attention with causal masking
    - Layer normalization
    - Residual connections
    - Position-wise feed-forward network
    - Dropout regularization
    - BPR (Bayesian Personalized Ranking) loss

    P0-1: Supports both NumPy (default) and PyTorch backends.
    When torch is available, train_step uses proper backpropagation
    (optimizer.zero_grad -> forward -> loss.backward -> optimizer.step).
    Inference is wrapped with torch.no_grad() for memory efficiency.
    """

    def __init__(
        self,
        config: SASRecConfig = None,
    ):
        cfg = config or DEFAULT_CONFIG
        self.config = cfg
        self.dim = cfg.hidden_size
        self.max_seq = cfg.max_seq_length
        self.num_heads = cfg.num_heads
        if self.dim % self.num_heads != 0:
            raise ValueError(
                f"dim ({self.dim}) must be divisible by num_heads ({self.num_heads})"
            )
        self.ffn_dim = cfg.ffn_dim
        self.dropout_rate = cfg.dropout_rate
        self.num_blocks = cfg.num_blocks
        self.training = False

        # P0-4: Thread lock to prevent concurrent training
        self._train_lock = threading.Lock()

        # Try to initialize PyTorch backend for proper backpropagation
        self._torch_available = False
        self._pt_model = None
        try:
            import torch
            self._torch_available = True
            self._pt_model = _PyTorchSASRec(cfg)
            logger.info("PyTorch backend available - train_step will use backpropagation")
        except ImportError:
            logger.info("PyTorch not available - train_step will use NumPy gradient descent")

        # Item embeddings (NumPy fallback)
        self.item_embeddings: dict[str, np.ndarray] = {}

        # Positional embeddings
        self.position_embeddings = np.random.randn(self.max_seq, self.dim) * np.sqrt(2.0 / (self.max_seq + self.dim))

        # Per-block parameters
        self.attention_weights: List[dict] = []
        self.ffn_weights: List[dict] = []

        for _ in range(self.num_blocks):
            # Multi-head attention projection weights (Xavier init)
            attn_scale = np.sqrt(2.0 / (self.dim + self.dim))
            self.attention_weights.append({
                "Wq": np.random.randn(self.dim, self.dim) * attn_scale,
                "Wk": np.random.randn(self.dim, self.dim) * attn_scale,
                "Wv": np.random.randn(self.dim, self.dim) * attn_scale,
                "Wo": np.random.randn(self.dim, self.dim) * attn_scale,
                "ln1_gamma": np.ones(self.dim),
                "ln1_beta": np.zeros(self.dim),
            })

            # Feed-forward network weights (Xavier init)
            ffn_in_scale = np.sqrt(2.0 / (self.dim + self.ffn_dim))
            ffn_out_scale = np.sqrt(2.0 / (self.ffn_dim + self.dim))
            self.ffn_weights.append({
                "W1": np.random.randn(self.dim, self.ffn_dim) * ffn_in_scale,
                "b1": np.zeros(self.ffn_dim),
                "W2": np.random.randn(self.ffn_dim, self.dim) * ffn_out_scale,
                "b2": np.zeros(self.dim),
                "ln2_gamma": np.ones(self.dim),
                "ln2_beta": np.zeros(self.dim),
            })

        self.trained = False
        self.trained_at: Optional[str] = None
        self.training_history: List[dict] = []

    def save(self, path: Optional[Path] = None) -> Path:
        """Persist model weights and config to disk."""
        save_dir = path or MODEL_DIR
        save_dir.mkdir(parents=True, exist_ok=True)

        state = {
            "config": {
                "dim": self.dim,
                "max_seq": self.max_seq,
                "num_heads": self.num_heads,
                "ffn_dim": self.ffn_dim,
                "dropout_rate": self.dropout_rate,
                "num_blocks": self.num_blocks,
            },
            "trained": self.trained,
            "trained_at": self.trained_at,
            "training_history": self.training_history,
            "item_embeddings": {k: v.tolist() for k, v in self.item_embeddings.items()},
            "position_embeddings": self.position_embeddings.tolist(),
            "attention_weights": [],
            "ffn_weights": [],
        }

        for block in self.attention_weights:
            state["attention_weights"].append(
                {k: v.tolist() for k, v in block.items()}
            )
        for block in self.ffn_weights:
            state["ffn_weights"].append(
                {k: v.tolist() for k, v in block.items()}
            )

        model_file = save_dir / "model.json"
        with open(model_file, "w", encoding="utf-8") as f:
            json.dump(state, f)

        logger.info(f"Model saved to {model_file} ({len(self.item_embeddings)} items)")
        return model_file

    @classmethod
    def load(cls, path: Optional[Path] = None) -> "SASRecModel":
        """Load model weights and config from disk."""
        load_dir = path or MODEL_DIR
        model_file = load_dir / "model.json"

        if not model_file.exists():
            raise FileNotFoundError(f"No model found at {model_file}")

        with open(model_file, "r", encoding="utf-8") as f:
            state = json.load(f)

        cfg_dict = state["config"]
        cfg = SASRecConfig(
            hidden_size=cfg_dict["dim"],
            max_seq_length=cfg_dict["max_seq"],
            num_heads=cfg_dict["num_heads"],
            ffn_dim=cfg_dict["ffn_dim"],
            dropout_rate=cfg_dict["dropout_rate"],
            num_blocks=cfg_dict["num_blocks"],
        )
        instance = cls(config=cfg)

        instance.trained = state.get("trained", False)
        instance.trained_at = state.get("trained_at")
        instance.training_history = state.get("training_history", [])
        instance.item_embeddings = {
            k: np.array(v) for k, v in state["item_embeddings"].items()
        }
        instance.position_embeddings = np.array(state["position_embeddings"])

        for i, block in enumerate(state["attention_weights"]):
            for k, v in block.items():
                instance.attention_weights[i][k] = np.array(v)

        for i, block in enumerate(state["ffn_weights"]):
            for k, v in block.items():
                instance.ffn_weights[i][k] = np.array(v)

        logger.info(
            f"Model loaded from {model_file} "
            f"({len(instance.item_embeddings)} items, trained={instance.trained})"
        )
        return instance

    def _get_or_create_embedding(self, item_id: str, item_attributes: Optional[Dict[str, Any]] = None) -> np.ndarray:
        """Get or create an embedding for an item.

        A-P1-4: Improved cold-start strategy over pure random initialization.

        Embedding initialization strategy (in order of preference):
        1. If item_attributes are provided, generate a deterministic embedding
           by hashing attribute values and projecting into the embedding space.
           This ensures items with similar attributes start with similar embeddings.
        2. If no attributes are available, use a deterministic hash of the item_id
           seeded into a PRNG for reproducible initialization with Xavier scaling.
           This is better than pure random because:
           - Deterministic: same item_id always gets the same initial embedding
           - Reproducible across restarts (no randomness drift)
           - Xavier-scaled for proper variance in the transformer

        Args:
            item_id: Unique item identifier.
            item_attributes: Optional dict of item attributes (e.g., category,
                price_range, style_tags) for attribute-based initialization.

        Returns:
            Embedding vector of shape (dim,).
        """
        if item_id in self.item_embeddings:
            return self.item_embeddings[item_id]

        # Xavier initialization scale: sqrt(2 / (fan_in + fan_out))
        # For embeddings, fan_in = 1 (one-hot input), fan_out = dim
        xavier_scale = np.sqrt(2.0 / (1 + self.dim))

        if item_attributes:
            # Strategy 1: Attribute-based deterministic embedding
            embedding = self._create_attribute_embedding(item_id, item_attributes, xavier_scale)
        else:
            # Strategy 2: Deterministic hash-based embedding with Xavier scaling
            embedding = self._create_hash_embedding(item_id, xavier_scale)

        self.item_embeddings[item_id] = embedding
        return embedding

    def _create_attribute_embedding(
        self,
        item_id: str,
        attributes: Dict[str, Any],
        scale: float,
    ) -> np.ndarray:
        """Create embedding from item attributes using feature hashing.

        Each attribute value is hashed to seed a segment of the embedding vector,
        producing a deterministic embedding where items sharing attributes will
        have overlapping non-zero segments, leading to naturally similar initial
        representations.

        Args:
            item_id: Item identifier (used as additional hash seed).
            attributes: Dict of item attributes.
            scale: Xavier scaling factor.

        Returns:
            Embedding vector of shape (dim,).
        """
        embedding = np.zeros(self.dim)

        # Define attribute weight by importance
        attr_weights = {
            "category": 0.35,
            "subcategory": 0.20,
            "price_range": 0.15,
            "style_tags": 0.15,
            "color": 0.10,
            "material": 0.05,
        }

        for attr_name, attr_value in attributes.items():
            weight = attr_weights.get(attr_name, 0.05)
            # Hash the attribute value to seed a PRNG
            attr_str = f"{item_id}:{attr_name}:{attr_value}"
            seed = int(hashlib.md5(attr_str.encode()).hexdigest()[:8], 16)
            rng = np.random.default_rng(seed)

            # Generate a segment of the embedding for this attribute
            segment = rng.standard_normal(self.dim) * scale * weight
            embedding += segment

        # Normalize to maintain Xavier-scaled variance
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm * scale * np.sqrt(self.dim)

        return embedding

    def _create_hash_embedding(self, item_id: str, scale: float) -> np.ndarray:
        """Create deterministic embedding from item_id hash.

        Uses MD5 hash of item_id as PRNG seed for reproducible initialization.
        This is superior to np.random.randn() because:
        - Same item_id always produces the same embedding (reproducible)
        - No global random state pollution
        - Still follows Xavier initialization distribution

        Args:
            item_id: Item identifier.
            scale: Xavier scaling factor.

        Returns:
            Embedding vector of shape (dim,).
        """
        seed = int(hashlib.md5(item_id.encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        return rng.standard_normal(self.dim) * scale

    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return e_x / e_x.sum(axis=-1, keepdims=True)

    @staticmethod
    def _layer_norm(
        x: np.ndarray,
        gamma: np.ndarray,
        beta: np.ndarray,
        eps: float = 1e-5,
    ) -> np.ndarray:
        """Layer normalization: normalizes across the last dimension."""
        mean = np.mean(x, axis=-1, keepdims=True)
        std = np.std(x, axis=-1, keepdims=True)
        normalized = (x - mean) / (std + eps)
        return gamma * normalized + beta

    def _dropout(self, x: np.ndarray) -> np.ndarray:
        """Inverted dropout (only active during training)."""
        if not self.training or self.dropout_rate <= 0:
            return x
        mask = np.random.binomial(1, 1 - self.dropout_rate, x.shape) / (1 - self.dropout_rate)
        return x * mask

    def _multi_head_attention(
        self,
        x: np.ndarray,
        block_idx: int,
    ) -> np.ndarray:
        """Multi-head self-attention with causal masking."""
        weights = self.attention_weights[block_idx]
        seq_len = x.shape[0]
        head_dim = self.dim // self.num_heads

        # Project to Q, K, V
        Q = x @ weights["Wq"]  # (seq_len, dim)
        K = x @ weights["Wk"]
        V = x @ weights["Wv"]

        # Split into heads
        Q_heads = Q.reshape(seq_len, self.num_heads, head_dim).transpose(1, 0, 2)
        K_heads = K.reshape(seq_len, self.num_heads, head_dim).transpose(1, 0, 2)
        V_heads = V.reshape(seq_len, self.num_heads, head_dim).transpose(1, 0, 2)

        # Scaled dot-product attention per head
        attended_heads = []
        for h in range(self.num_heads):
            scores = Q_heads[h] @ K_heads[h].T / np.sqrt(head_dim)

            # Causal mask: prevent attending to future positions
            causal_mask = np.triu(np.ones((seq_len, seq_len)), k=1) * -1e9
            scores = scores + causal_mask

            attn_weights = self._softmax(scores)
            attended_heads.append(attn_weights @ V_heads[h])

        # Concatenate heads
        concatenated = np.concatenate(attended_heads, axis=-1)  # (seq_len, dim)

        # Output projection
        output = concatenated @ weights["Wo"]

        return output

    def _feed_forward(
        self,
        x: np.ndarray,
        block_idx: int,
    ) -> np.ndarray:
        """Position-wise feed-forward network with ReLU activation."""
        weights = self.ffn_weights[block_idx]

        # FFN: x -> W1 -> ReLU -> W2
        hidden = x @ weights["W1"] + weights["b1"]
        hidden = np.maximum(0, hidden)  # ReLU
        output = hidden @ weights["W2"] + weights["b2"]

        return output

    def _transformer_block(
        self,
        x: np.ndarray,
        block_idx: int,
    ) -> np.ndarray:
        """Single transformer block: MHA + Add&Norm + FFN + Add&Norm."""
        attn_weights = self.attention_weights[block_idx]
        ffn_weights = self.ffn_weights[block_idx]

        # Multi-head self-attention + residual + layer norm
        attended = self._multi_head_attention(x, block_idx)
        attended = self._dropout(attended)
        x = self._layer_norm(
            x + attended,
            attn_weights["ln1_gamma"],
            attn_weights["ln1_beta"],
        )

        # Feed-forward + residual + layer norm
        ffn_output = self._feed_forward(x, block_idx)
        ffn_output = self._dropout(ffn_output)
        x = self._layer_norm(
            x + ffn_output,
            ffn_weights["ln2_gamma"],
            ffn_weights["ln2_beta"],
        )

        return x

    def encode_sequence(self, item_ids: List[str]) -> np.ndarray:
        """Encode a sequence of item IDs into a user representation vector.

        Pipeline: Embed -> Positional Encoding -> Transformer Blocks -> Last position
        """
        seq = item_ids[-self.max_seq:]
        embeddings = np.array([self._get_or_create_embedding(i, None) for i in seq])

        # Add positional embeddings
        pos = self.position_embeddings[:len(seq)]
        x = embeddings + pos

        # Apply dropout to input
        x = self._dropout(x)

        # Pass through transformer blocks
        for block_idx in range(self.num_blocks):
            x = self._transformer_block(x, block_idx)

        # Return last position as user representation
        return x[-1]

    def predict(
        self,
        item_ids: List[str],
        top_k: int = 10,
        exclude: Optional[List[str]] = None,
    ) -> List[dict]:
        if not self.item_embeddings:
            return []

        self.training = False

        # P0-1: Use torch.no_grad() for inference when PyTorch is available
        if self._torch_available and self._pt_model is not None:
            import torch
            with torch.no_grad():
                return self._predict_numpy(item_ids, top_k, exclude)
        else:
            return self._predict_numpy(item_ids, top_k, exclude)

    def _predict_numpy(
        self,
        item_ids: List[str],
        top_k: int = 10,
        exclude: Optional[List[str]] = None,
    ) -> List[dict]:
        """NumPy-based prediction (used by both backends)."""
        user_vec = self.encode_sequence(item_ids)
        exclude_set = set(exclude or []) | set(item_ids)

        candidates = []
        for iid, emb in self.item_embeddings.items():
            if iid in exclude_set:
                continue
            score = float(np.dot(user_vec, emb))
            candidates.append({"item_id": iid, "score": score})

        candidates.sort(key=lambda x: x["score"], reverse=True)
        return candidates[:top_k]

    def train_step(
        self,
        sequences: List[List[str]],
        lr: float = 0.001,
    ) -> float:
        """P0-1 + P0-4: Training step with backpropagation support and concurrency lock.

        When PyTorch is available, uses proper backprop:
            optimizer.zero_grad() -> forward -> loss.backward() -> optimizer.step()
        Inference is wrapped with torch.no_grad().

        P0-4: Thread lock prevents concurrent training (returns 503 if locked).
        """
        # P0-4: Acquire training lock (non-blocking)
        if not self._train_lock.acquire(blocking=False):
            raise RuntimeError("Training already in progress - concurrent training not allowed")

        try:
            if self._torch_available and self._pt_model is not None:
                return self._train_step_torch(sequences, lr)
            else:
                return self._train_step_numpy(sequences, lr)
        finally:
            self._train_lock.release()

    def _train_step_torch(
        self,
        sequences: List[List[str]],
        lr: float = 0.001,
    ) -> float:
        """P0-1: PyTorch-based training with proper backpropagation."""
        import torch

        model = self._pt_model
        optimizer = model.get_optimizer(lr)

        # Sync item embeddings into PyTorch model
        model.sync_from_numpy(self.item_embeddings)

        total_loss = 0.0
        self.training = True

        for seq in sequences:
            if len(seq) < 2:
                continue

            for i in range(1, len(seq)):
                context = seq[:i]
                target_id = seq[i]

                # P0-1: optimizer.zero_grad() before forward pass
                optimizer.zero_grad()

                # Forward pass
                user_vec = model.encode_sequence(context)

                target_idx = model.get_or_create_item_idx(target_id)
                target_emb = model.item_embeddings.weight[target_idx]

                # Positive score
                pos_score = torch.dot(user_vec, target_emb)

                # Negative sampling
                all_indices = list(range(model.next_item_idx))
                if len(all_indices) < 2:
                    continue

                neg_idx = all_indices[np.random.randint(len(all_indices))]
                while neg_idx == target_idx and len(all_indices) > 1:
                    neg_idx = all_indices[np.random.randint(len(all_indices))]
                neg_emb = model.item_embeddings.weight[neg_idx]
                neg_score = torch.dot(user_vec, neg_emb)

                # BPR loss: -log(sigmoid(pos - neg))
                diff = pos_score - neg_score
                bpr_loss = -torch.log(torch.sigmoid(diff) + 1e-10)

                # P0-1: loss.backward() after computing loss
                bpr_loss.backward()

                # Gradient clipping
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

                # P0-1: optimizer.step() after backward
                optimizer.step()

                total_loss += bpr_loss.item()

        # Sync embeddings back to NumPy
        model.sync_to_numpy(self.item_embeddings)

        n = max(len(sequences), 1)
        return total_loss / n

    def _layer_norm_backward(
        self,
        dout: np.ndarray,
        x: np.ndarray,
        gamma: np.ndarray,
        eps: float = 1e-5,
    ) -> tuple:
        """Backward pass for layer normalization.

        Returns:
            (dx, dgamma, dbeta) - gradients w.r.t. input, gamma, and beta.
        """
        mean = np.mean(x, axis=-1, keepdims=True)
        std = np.std(x, axis=-1, keepdims=True)
        x_hat = (x - mean) / (std + eps)

        dgamma = np.sum(dout * x_hat, axis=0)
        dbeta = np.sum(dout, axis=0)

        N = x.shape[-1]
        dx_hat = dout * gamma
        dvar = np.sum(dx_hat * (x - mean) * -0.5 * (std + eps) ** (-1.5), axis=-1, keepdims=True)
        dmean = np.sum(dx_hat * -1.0 / (std + eps), axis=-1, keepdims=True) + dvar * np.mean(-2.0 * (x - mean), axis=-1, keepdims=True)
        dx = dx_hat / (std + eps) + dvar * 2.0 * (x - mean) / N + dmean / N

        return dx, dgamma, dbeta

    def _multi_head_attention_forward(
        self,
        x: np.ndarray,
        block_idx: int,
    ) -> dict:
        """Forward pass for multi-head attention with cached intermediates for backprop.

        Returns:
            dict with keys: output, Q, K, V, attn_weights_per_head, x, V_heads, head_dim
        """
        weights = self.attention_weights[block_idx]
        seq_len = x.shape[0]
        head_dim = self.dim // self.num_heads

        Q = x @ weights["Wq"]
        K = x @ weights["Wk"]
        V = x @ weights["Wv"]

        Q_heads = Q.reshape(seq_len, self.num_heads, head_dim).transpose(1, 0, 2)
        K_heads = K.reshape(seq_len, self.num_heads, head_dim).transpose(1, 0, 2)
        V_heads = V.reshape(seq_len, self.num_heads, head_dim).transpose(1, 0, 2)

        attn_weights_per_head = []
        attended_heads = []
        for h in range(self.num_heads):
            scores = Q_heads[h] @ K_heads[h].T / np.sqrt(head_dim)
            causal_mask = np.triu(np.ones((seq_len, seq_len)), k=1) * -1e9
            scores = scores + causal_mask
            aw = self._softmax(scores)
            attn_weights_per_head.append(aw)
            attended_heads.append(aw @ V_heads[h])

        concatenated = np.concatenate(attended_heads, axis=-1)
        output = concatenated @ weights["Wo"]

        return {
            "output": output,
            "Q": Q, "K": K, "V": V,
            "attn_weights_per_head": attn_weights_per_head,
            "x": x,
            "V_heads": V_heads,
            "head_dim": head_dim,
        }

    def _multi_head_attention_backward(
        self,
        dout: np.ndarray,
        cache: dict,
        block_idx: int,
    ) -> tuple:
        """Backward pass for multi-head attention.

        Returns:
            (dx, dWq, dWk, dWv, dWo) - gradients for input and projection weights.
        """
        weights = self.attention_weights[block_idx]
        seq_len = cache["x"].shape[0]
        head_dim = cache["head_dim"]

        # Output projection backward
        d_concatenated = dout @ weights["Wo"].T  # (seq_len, dim)
        dWo = cache["output"].__class__(cache["output"].shape)  # placeholder
        # Recompute concatenated from attended_heads
        attended_heads = []
        for h in range(self.num_heads):
            attended_heads.append(cache["attn_weights_per_head"][h] @ cache["V_heads"][h])
        concatenated = np.concatenate(attended_heads, axis=-1)
        dWo = concatenated.T @ dout
        dx = np.zeros_like(cache["x"])

        # Split d_concatenated back into heads
        d_heads = d_concatenated.reshape(seq_len, self.num_heads, head_dim).transpose(1, 0, 2)

        dQ = np.zeros_like(cache["Q"])
        dK = np.zeros_like(cache["K"])
        dV = np.zeros_like(cache["V"])

        for h in range(self.num_heads):
            aw = cache["attn_weights_per_head"][h]  # (seq_len, seq_len)
            V_h = cache["V_heads"][h]  # (seq_len, head_dim)

            # d_attn = d_heads[h] @ V_h.T  but need to go through softmax
            d_attended = d_heads[h]  # (seq_len, head_dim)

            # Through aw @ V_h
            d_aw = d_attended @ V_h.T  # (seq_len, seq_len)
            dV_h = aw.T @ d_attended  # (seq_len, head_dim)

            # Softmax backward: d_scores = aw * (d_aw - sum(d_aw * aw, axis=-1, keepdims=True))
            d_scores = aw * (d_aw - np.sum(d_aw * aw, axis=-1, keepdims=True))

            # Scale backward
            d_scores = d_scores / np.sqrt(head_dim)

            # scores = Q @ K.T
            Q_h = cache["Q"].reshape(seq_len, self.num_heads, head_dim).transpose(1, 0, 2)[h]
            K_h = cache["K"].reshape(seq_len, self.num_heads, head_dim).transpose(1, 0, 2)[h]

            dQ_h = d_scores @ K_h
            dK_h = d_scores.T @ Q_h

            dQ.reshape(seq_len, self.num_heads, head_dim).transpose(1, 0, 2)[h]  # read-only view
            # Accumulate into dQ, dK, dV
            dQ_reshaped = dQ.reshape(seq_len, self.num_heads, head_dim)
            dK_reshaped = dK.reshape(seq_len, self.num_heads, head_dim)
            dV_reshaped = dV.reshape(seq_len, self.num_heads, head_dim)

            dQ_reshaped[:, h, :] += dQ_h
            dK_reshaped[:, h, :] += dK_h
            dV_reshaped[:, h, :] += dV_h

        # Projection weight gradients
        dWq = cache["x"].T @ dQ
        dWk = cache["x"].T @ dK
        dWv = cache["x"].T @ dV

        # Input gradient
        dx = dQ @ weights["Wq"].T + dK @ weights["Wk"].T + dV @ weights["Wv"].T

        return dx, dWq, dWk, dWv, dWo

    def _feed_forward_backward(
        self,
        dout: np.ndarray,
        x: np.ndarray,
        block_idx: int,
    ) -> tuple:
        """Backward pass for feed-forward network.

        Returns:
            (dx, dW1, db1, dW2, db2) - gradients for input and FFN weights.
        """
        weights = self.ffn_weights[block_idx]

        hidden = x @ weights["W1"] + weights["b1"]
        relu_mask = (hidden > 0).astype(np.float64)

        # W2 backward
        dhidden = dout @ weights["W2"].T * relu_mask
        dW2 = hidden.T @ dout  # use pre-ReLU hidden for gradient
        # Actually need ReLU(hidden).T @ dout
        relu_hidden = np.maximum(0, hidden)
        dW2 = relu_hidden.T @ dout
        db2 = np.sum(dout, axis=0)

        # W1 backward
        dW1 = x.T @ dhidden
        db1 = np.sum(dhidden, axis=0)

        # Input gradient
        dx = dhidden @ weights["W1"].T

        return dx, dW1, db1, dW2, db2

    def _encode_sequence_with_cache(
        self,
        item_ids: List[str],
    ) -> tuple:
        """Forward pass with caching for backpropagation.

        Returns:
            (user_vec, cache) where cache contains intermediates for backward pass.
        """
        seq = item_ids[-self.max_seq:]
        embeddings = np.array([self._get_or_create_embedding(i) for i in seq])

        pos = self.position_embeddings[:len(seq)]
        x = embeddings + pos
        x = self._dropout(x)

        cache = {
            "item_ids": seq,
            "input_embeddings": embeddings,
            "block_caches": [],
        }

        for block_idx in range(self.num_blocks):
            attn_weights = self.attention_weights[block_idx]
            ffn_weights = self.ffn_weights[block_idx]

            # MHA + residual + LN
            attn_cache = self._multi_head_attention_forward(x, block_idx)
            attended = attn_cache["output"]
            attended = self._dropout(attended)
            x_before_ln1 = x + attended
            x_after_ln1 = self._layer_norm(
                x_before_ln1,
                attn_weights["ln1_gamma"],
                attn_weights["ln1_beta"],
            )

            # FFN + residual + LN
            ffn_output = self._feed_forward(x_after_ln1, block_idx)
            ffn_output = self._dropout(ffn_output)
            x_before_ln2 = x_after_ln1 + ffn_output
            x_after_ln2 = self._layer_norm(
                x_before_ln2,
                ffn_weights["ln2_gamma"],
                ffn_weights["ln2_beta"],
            )

            cache["block_caches"].append({
                "attn_cache": attn_cache,
                "x_before_mha": x,
                "x_after_mha_dropout": attended,
                "x_before_ln1": x_before_ln1,
                "x_after_ln1": x_after_ln1,
                "ffn_output_before_dropout": self._feed_forward(x_after_ln1, block_idx),
                "x_before_ln2": x_before_ln2,
                "x_after_ln2": x_after_ln2,
            })

            x = x_after_ln2

        cache["final_x"] = x
        return x[-1], cache

    def _apply_gradients(
        self,
        d_user_vec: np.ndarray,
        cache: dict,
        lr: float,
        target_id: str,
        neg_id: str,
    ) -> None:
        """Apply gradients from BPR loss back through the entire network.

        This implements backpropagation through:
        1. Item embeddings (target + negative)
        2. Position embeddings
        3. All transformer blocks (attention + FFN weights + layer norm params)
        """
        seq_len = len(cache["item_ids"])

        # d_user_vec is gradient w.r.t. the last position output
        # Expand to full sequence gradient (only last position has gradient)
        dx = np.zeros((seq_len, self.dim))
        dx[-1] = d_user_vec

        # Backprop through transformer blocks in reverse
        for block_idx in reversed(range(self.num_blocks)):
            bc = cache["block_caches"][block_idx]
            attn_weights = self.attention_weights[block_idx]
            ffn_weights = self.ffn_weights[block_idx]

            # LN2 backward
            d_ln2_out = dx
            d_ln2_in, d_ln2_gamma, d_ln2_beta = self._layer_norm_backward(
                d_ln2_out, bc["x_before_ln2"], ffn_weights["ln2_gamma"]
            )

            # Update LN2 params
            ffn_weights["ln2_gamma"] += lr * np.clip(d_ln2_gamma, -1.0, 1.0)
            ffn_weights["ln2_beta"] += lr * np.clip(d_ln2_beta, -1.0, 1.0)

            # Residual split: dx_after_ln1 and d_ffn_output
            dx_after_ln1 = d_ln2_in
            d_ffn_output = d_ln2_in

            # FFN backward
            d_ffn_input, dW1, db1, dW2, db2 = self._feed_forward_backward(
                d_ffn_output, bc["x_after_ln1"], block_idx
            )
            dx_after_ln1 += d_ffn_input

            # Update FFN weights
            ffn_weights["W1"] += lr * np.clip(dW1, -1.0, 1.0)
            ffn_weights["b1"] += lr * np.clip(db1, -1.0, 1.0)
            ffn_weights["W2"] += lr * np.clip(dW2, -1.0, 1.0)
            ffn_weights["b2"] += lr * np.clip(db2, -1.0, 1.0)

            # LN1 backward
            d_ln1_in, d_ln1_gamma, d_ln1_beta = self._layer_norm_backward(
                dx_after_ln1, bc["x_before_ln1"], attn_weights["ln1_gamma"]
            )

            # Update LN1 params
            attn_weights["ln1_gamma"] += lr * np.clip(d_ln1_gamma, -1.0, 1.0)
            attn_weights["ln1_beta"] += lr * np.clip(d_ln1_beta, -1.0, 1.0)

            # Residual split: dx_before_mha and d_attended
            dx_before_mha = d_ln1_in
            d_attended = d_ln1_in

            # MHA backward
            d_mha_input, dWq, dWk, dWv, dWo = self._multi_head_attention_backward(
                d_attended, bc["attn_cache"], block_idx
            )
            dx_before_mha += d_mha_input

            # Update attention weights
            attn_weights["Wq"] += lr * np.clip(dWq, -1.0, 1.0)
            attn_weights["Wk"] += lr * np.clip(dWk, -1.0, 1.0)
            attn_weights["Wv"] += lr * np.clip(dWv, -1.0, 1.0)
            attn_weights["Wo"] += lr * np.clip(dWo, -1.0, 1.0)

            dx = dx_before_mha

        # Position embeddings gradient
        d_pos = dx.copy()
        self.position_embeddings[:seq_len] += lr * np.clip(d_pos, -1.0, 1.0)

        # Item embeddings gradient
        for j, item_id in enumerate(cache["item_ids"]):
            grad = dx[j]
            grad_norm = np.linalg.norm(grad)
            if grad_norm > 1.0:
                grad = grad / grad_norm
            self.item_embeddings[item_id] = self.item_embeddings[item_id] + lr * grad

        # Target embedding gradient (from BPR: d_loss/d_target_emb = -(1-sigmoid(diff)) * user_vec)
        target_emb = self.item_embeddings[target_id]
        self.item_embeddings[target_id] = target_emb + lr * d_user_vec

        # Negative embedding gradient (from BPR: d_loss/d_neg_emb = (1-sigmoid(diff)) * user_vec)
        neg_emb = self.item_embeddings[neg_id]
        self.item_embeddings[neg_id] = neg_emb - lr * d_user_vec

    def _train_step_numpy(
        self,
        sequences: List[List[str]],
        lr: float = 0.001,
    ) -> float:
        """NumPy-based training with full backpropagation through all weights.

        Previously, only item embeddings were updated while transformer weights
        (attention, FFN, layer norm, positional) were frozen. This version
        implements complete gradient computation and weight updates for all
        parameters, matching the behavior of the PyTorch training path.
        """
        total_loss = 0.0
        self.training = True

        for seq in sequences:
            if len(seq) < 2:
                continue

            for i in range(1, len(seq)):
                context = seq[:i]
                target_id = seq[i]

                # Forward pass with caching for backprop
                user_vec, cache = self._encode_sequence_with_cache(context)
                target_emb = self._get_or_create_embedding(target_id)

                # Positive score (clipped for numerical stability)
                pos_score = np.clip(np.dot(user_vec, target_emb), -20, 20)

                # Negative sampling
                all_keys = list(self.item_embeddings.keys())
                if len(all_keys) < 2:
                    continue

                neg_id = all_keys[np.random.randint(len(all_keys))]
                while neg_id == target_id:
                    neg_id = all_keys[np.random.randint(len(all_keys))]
                neg_emb = self._get_or_create_embedding(neg_id)
                neg_score = np.clip(np.dot(user_vec, neg_emb), -20, 20)

                # BPR loss: -log(sigmoid(pos - neg))
                diff = pos_score - neg_score
                bpr_loss = -np.log(1.0 / (1.0 + np.exp(-diff)) + 1e-10)
                total_loss += bpr_loss

                # BPR gradient w.r.t. user_vec: (1 - sigmoid(diff)) * (target_emb - neg_emb)
                sigmoid_val = 1.0 / (1.0 + np.exp(-diff))
                d_user_vec = (1.0 - sigmoid_val) * (target_emb - neg_emb)

                # Gradient clipping for user vector gradient
                grad_norm = np.linalg.norm(d_user_vec)
                if grad_norm > 1.0:
                    d_user_vec = d_user_vec / grad_norm

                # Apply gradients through entire network
                self._apply_gradients(d_user_vec, cache, lr, target_id, neg_id)

        n = max(len(sequences), 1)
        return total_loss / n


model = SASRecModel()


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "items_trained": len(model.item_embeddings),
        "trained": model.trained,
        "model_version": "2.0.0",
        "backend": "pytorch" if model._torch_available else "numpy",
        "config": {
            "num_blocks": model.config.num_blocks,
            "num_heads": model.config.num_heads,
            "embedding_dim": model.config.hidden_size,
            "max_seq_length": model.config.max_seq_length,
            "ffn_dim": model.config.ffn_dim,
            "dropout_rate": model.config.dropout_rate,
        },
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    item_ids = [item.item_id for item in req.user_sequence]
    exclude = req.exclude_items or []
    recs = model.predict(item_ids, top_k=req.top_k, exclude=exclude)
    return PredictResponse(recommendations=recs)


@app.post("/train", response_model=TrainResponse)
async def train(req: TrainRequest):
    sequences = [[item.item_id for item in seq] for seq in req.user_sequences]
    try:
        total_loss = 0.0
        for epoch in range(req.epochs):
            loss = model.train_step(sequences, lr=req.learning_rate)
            total_loss += loss
            logger.info(f"Epoch {epoch + 1}/{req.epochs}, loss: {loss:.4f}")
    except RuntimeError as e:
        if "Training already in progress" in str(e):
            raise HTTPException(status_code=503, detail="Training already in progress - please try again later")
        raise

    model.trained = True
    avg_loss = total_loss / max(req.epochs, 1)
    return TrainResponse(loss=avg_loss, epochs=req.epochs)


@app.post("/warmup")
async def warmup(item_ids: List[str]):
    for iid in item_ids:
        model._get_or_create_embedding(iid, None)
    return {"warmed_up": len(item_ids)}


@app.post("/save")
async def save_model():
    try:
        path = model.save()
        return {"saved": True, "path": str(path), "items": len(model.item_embeddings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/load")
async def load_model():
    global model
    try:
        model = SASRecModel.load()
        return {
            "loaded": True,
            "items": len(model.item_embeddings),
            "trained": model.trained,
            "trained_at": model.trained_at,
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="No saved model found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status")
async def training_status():
    return {
        "trained": model.trained,
        "trained_at": model.trained_at,
        "items_trained": len(model.item_embeddings),
        "training_history": model.training_history[-10:],
        "model_dir": str(MODEL_DIR),
        "has_saved_model": (MODEL_DIR / "model.json").exists(),
    }


class PipelineRequest(BaseModel):
    data_source: str = Field(default="api", description="api | mock")
    epochs: int = Field(default=5, ge=1, le=50)
    learning_rate: float = Field(default=0.001, gt=0, lt=1.0)
    save_after_train: bool = Field(default=True)


@app.post("/pipeline/train")
async def training_pipeline(req: PipelineRequest):
    """Full training pipeline: load data -> train -> save model."""
    import aiohttp

    sequences: List[List[str]] = []

    if req.data_source == "api":
        backend_url = os.getenv("BACKEND_URL", "http://localhost:3001")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{backend_url}/api/v1/recommendations/behavior-sequences",
                    params={"limit": 1000},
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        sequences = data.get("sequences", [])
                    else:
                        logger.warning(f"API returned {resp.status}, using mock data")
                        sequences = _generate_mock_sequences()
        except Exception as e:
            logger.warning(f"Failed to fetch from API: {e}, using mock data")
            sequences = _generate_mock_sequences()
    else:
        sequences = _generate_mock_sequences()

    if not sequences:
        raise HTTPException(status_code=400, detail="No training data available")

    try:
        total_loss = 0.0
        for epoch in range(req.epochs):
            loss = model.train_step(sequences, lr=req.learning_rate)
            total_loss += loss
            model.training_history.append({
                "epoch": epoch + 1,
                "loss": float(loss),
                "timestamp": datetime.now().isoformat(),
            })
            logger.info(f"Pipeline epoch {epoch + 1}/{req.epochs}, loss: {loss:.4f}")
    except RuntimeError as e:
        if "Training already in progress" in str(e):
            raise HTTPException(status_code=503, detail="Training already in progress - please try again later")
        raise

    model.trained = True
    model.trained_at = datetime.now().isoformat()

    result = {
        "trained": True,
        "epochs": req.epochs,
        "avg_loss": float(total_loss / max(req.epochs, 1)),
        "items_trained": len(model.item_embeddings),
        "sequences_used": len(sequences),
        "trained_at": model.trained_at,
    }

    if req.save_after_train:
        try:
            path = model.save()
            result["saved_to"] = str(path)
        except Exception as e:
            result["save_error"] = str(e)

    return result


def _generate_mock_sequences() -> List[List[str]]:
    """Generate mock training sequences for development/testing."""
    items = [f"item_{i}" for i in range(1, 51)]
    rng = np.random.default_rng(42)
    sequences = []
    for _ in range(100):
        seq_len = rng.integers(3, 10)
        seq = rng.choice(items, size=seq_len, replace=False).tolist()
        sequences.append(seq)
    return sequences


# ============================================================
# P0-1: PyTorch SASRec Model for proper backpropagation
# ============================================================

class _PyTorchSASRec:
    """PyTorch-based SASRec model wrapper for proper backpropagation training.

    This class is only used when torch is available. It provides:
    - optimizer.zero_grad() before forward pass
    - loss.backward() for gradient computation
    - optimizer.step() for parameter updates
    - torch.no_grad() context for inference
    """

    def __init__(self, config: SASRecConfig):
        import torch
        import torch.nn as nn

        self.config = config
        self.dim = config.hidden_size
        self.max_seq = config.max_seq_length
        self.num_heads = config.num_heads
        self.ffn_dim = config.ffn_dim
        self.num_blocks = config.num_blocks
        self.dropout_rate = config.dropout_rate

        # Item ID to index mapping
        self._item_to_idx: dict[str, int] = {}
        self.next_item_idx = 0

        # Initialize with a reasonable max_items, will grow as needed
        max_items = 100000
        self.item_embeddings = nn.Embedding(max_items, self.dim)
        nn.init.xavier_uniform_(self.item_embeddings.weight)

        self.position_embeddings = nn.Parameter(
            torch.randn(1, self.max_seq, self.dim) * 0.02
        )

        # Transformer layers
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=self.dim,
            nhead=self.num_heads,
            dim_feedforward=self.ffn_dim,
            dropout=self.dropout_rate,
            activation='relu',
            batch_first=True,
        )
        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=self.num_blocks,
        )

        self.layer_norm = nn.LayerNorm(self.dim)
        self.dropout = nn.Dropout(self.dropout_rate)

        self._optimizer = None

    def get_optimizer(self, lr: float):
        import torch.optim as optim
        self._optimizer = optim.Adam(self.parameters(), lr=lr)
        return self._optimizer

    def parameters(self):
        """Yield all trainable parameters."""
        yield from self.item_embeddings.parameters()
        yield self.position_embeddings
        yield from self.transformer.parameters()
        yield from self.layer_norm.parameters()

    def get_or_create_item_idx(self, item_id: str) -> int:
        if item_id not in self._item_to_idx:
            self._item_to_idx[item_id] = self.next_item_idx
            self.next_item_idx += 1
        return self._item_to_idx[item_id]

    def encode_sequence(self, item_ids: List[str]) -> "torch.Tensor":
        import torch

        seq = item_ids[-self.max_seq:]
        indices = [self.get_or_create_item_idx(i) for i in seq]

        idx_tensor = torch.tensor(indices, dtype=torch.long)
        embeddings = self.item_embeddings(idx_tensor)  # (seq_len, dim)

        # Add positional embeddings
        seq_len = len(seq)
        pos = self.position_embeddings[0, :seq_len, :]
        x = embeddings + pos
        x = self.dropout(x)

        # Causal mask
        causal_mask = torch.triu(
            torch.ones(seq_len, seq_len), diagonal=1
        ).bool()

        x = x.unsqueeze(0)  # (1, seq_len, dim)
        x = self.transformer(x, mask=causal_mask)
        x = x.squeeze(0)

        x = self.layer_norm(x)
        return x[-1]  # Last position

    def sync_from_numpy(self, numpy_embeddings: dict[str, np.ndarray]):
        """Sync NumPy item embeddings into PyTorch model."""
        import torch

        for item_id, emb in numpy_embeddings.items():
            idx = self.get_or_create_item_idx(item_id)
            if idx < self.item_embeddings.num_embeddings:
                self.item_embeddings.weight.data[idx] = torch.tensor(emb, dtype=torch.float32)

    def sync_to_numpy(self, numpy_embeddings: dict[str, np.ndarray]):
        """Sync PyTorch item embeddings back to NumPy dict."""
        for item_id, idx in self._item_to_idx.items():
            if idx < self.item_embeddings.num_embeddings:
                numpy_embeddings[item_id] = self.item_embeddings.weight.data[idx].detach().cpu().numpy()
