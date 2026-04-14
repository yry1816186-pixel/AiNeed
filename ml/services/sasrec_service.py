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
from typing import List, Optional
import numpy as np
import logging
import os

logger = logging.getLogger(__name__)

app = FastAPI(title="SASRec Service", version="2.0.0")

EMBEDDING_DIM = int(os.getenv("SASREC_DIM", "64"))
MAX_SEQ_LEN = int(os.getenv("SASREC_MAX_SEQ", "50"))
NUM_HEADS = int(os.getenv("SASREC_HEADS", "4"))
FFN_DIM = int(os.getenv("SASREC_FFN_DIM", "256"))
DROPOUT_RATE = float(os.getenv("SASREC_DROPOUT", "0.1"))
NUM_BLOCKS = int(os.getenv("SASREC_BLOCKS", "2"))


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
    """

    def __init__(
        self,
        dim: int = EMBEDDING_DIM,
        max_seq: int = MAX_SEQ_LEN,
        num_heads: int = NUM_HEADS,
        ffn_dim: int = FFN_DIM,
        dropout_rate: float = DROPOUT_RATE,
        num_blocks: int = NUM_BLOCKS,
    ):
        self.dim = dim
        self.max_seq = max_seq
        self.num_heads = num_heads
        if self.dim % self.num_heads != 0:
            raise ValueError(
                f"dim ({self.dim}) must be divisible by num_heads ({self.num_heads})"
            )
        self.ffn_dim = ffn_dim
        self.dropout_rate = dropout_rate
        self.num_blocks = num_blocks
        self.training = False

        # Item embeddings
        self.item_embeddings: dict[str, np.ndarray] = {}

        # Positional embeddings
        self.position_embeddings = np.random.randn(max_seq, dim) * np.sqrt(2.0 / (max_seq + dim))

        # Per-block parameters
        self.attention_weights: List[dict] = []
        self.ffn_weights: List[dict] = []

        for _ in range(num_blocks):
            # Multi-head attention projection weights (Xavier init)
            attn_scale = np.sqrt(2.0 / (dim + dim))
            self.attention_weights.append({
                "Wq": np.random.randn(dim, dim) * attn_scale,
                "Wk": np.random.randn(dim, dim) * attn_scale,
                "Wv": np.random.randn(dim, dim) * attn_scale,
                "Wo": np.random.randn(dim, dim) * attn_scale,
                "ln1_gamma": np.ones(dim),
                "ln1_beta": np.zeros(dim),
            })

            # Feed-forward network weights (Xavier init)
            ffn_in_scale = np.sqrt(2.0 / (dim + ffn_dim))
            ffn_out_scale = np.sqrt(2.0 / (ffn_dim + dim))
            self.ffn_weights.append({
                "W1": np.random.randn(dim, ffn_dim) * ffn_in_scale,
                "b1": np.zeros(ffn_dim),
                "W2": np.random.randn(ffn_dim, dim) * ffn_out_scale,
                "b2": np.zeros(dim),
                "ln2_gamma": np.ones(dim),
                "ln2_beta": np.zeros(dim),
            })

        self.trained = False

    def _get_or_create_embedding(self, item_id: str) -> np.ndarray:
        if item_id not in self.item_embeddings:
            scale = np.sqrt(2.0 / self.dim)
            self.item_embeddings[item_id] = np.random.randn(self.dim) * scale
        return self.item_embeddings[item_id]

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
        embeddings = np.array([self._get_or_create_embedding(i) for i in seq])

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
        total_loss = 0.0
        self.training = True

        for seq in sequences:
            if len(seq) < 2:
                continue

            for i in range(1, len(seq)):
                context = seq[:i]
                target_id = seq[i]

                # Forward pass
                user_vec = self.encode_sequence(context)
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

                # Gradient update for target embedding
                sigmoid_val = 1.0 / (1.0 + np.exp(-diff))
                grad = (1.0 - sigmoid_val) * user_vec
                self.item_embeddings[target_id] = target_emb + lr * grad
                # Gradient clipping to prevent explosion
                grad_norm = np.linalg.norm(grad)
                if grad_norm > 1.0:
                    self.item_embeddings[target_id] = (
                        target_emb + lr * grad / grad_norm
                    )

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
        "num_blocks": NUM_BLOCKS,
        "num_heads": NUM_HEADS,
        "embedding_dim": EMBEDDING_DIM,
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
    total_loss = 0.0
    for epoch in range(req.epochs):
        loss = model.train_step(sequences, lr=req.learning_rate)
        total_loss += loss
        logger.info(f"Epoch {epoch + 1}/{req.epochs}, loss: {loss:.4f}")

    model.trained = True
    avg_loss = total_loss / max(req.epochs, 1)
    return TrainResponse(loss=avg_loss, epochs=req.epochs)


@app.post("/warmup")
async def warmup(item_ids: List[str]):
    for iid in item_ids:
        model._get_or_create_embedding(iid)
    return {"warmed_up": len(item_ids)}
