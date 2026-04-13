from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import logging
import os
from collections import defaultdict

logger = logging.getLogger(__name__)

app = FastAPI(title="SASRec Service", version="1.0.0")

EMBEDDING_DIM = int(os.getenv("SASREC_DIM", "64"))
MAX_SEQ_LEN = int(os.getenv("SASREC_MAX_SEQ", "50"))


class SequenceItem(BaseModel):
    item_id: str
    timestamp: Optional[float] = None


class PredictRequest(BaseModel):
    user_sequence: List[SequenceItem]
    top_k: int = 10
    exclude_items: Optional[List[str]] = None


class TrainRequest(BaseModel):
    user_sequences: List[List[SequenceItem]]
    epochs: int = 10
    learning_rate: float = 0.001


class PredictResponse(BaseModel):
    recommendations: List[dict]


class TrainResponse(BaseModel):
    loss: float
    epochs: int


class SASRecModel:
    def __init__(self, dim: int = EMBEDDING_DIM, max_seq: int = MAX_SEQ_LEN):
        self.dim = dim
        self.max_seq = max_seq
        self.item_embeddings: dict[str, np.ndarray] = {}
        self.position_embeddings = np.random.randn(max_seq, dim) * 0.01
        self.trained = False

    def _get_or_create_embedding(self, item_id: str) -> np.ndarray:
        if item_id not in self.item_embeddings:
            self.item_embeddings[item_id] = np.random.randn(self.dim) * 0.01
        return self.item_embeddings[item_id]

    def _attention(self, seq_embeddings: np.ndarray) -> np.ndarray:
        Q = seq_embeddings
        K = seq_embeddings
        d_k = self.dim
        scores = Q @ K.T / np.sqrt(d_k)
        mask = np.triu(np.ones_like(scores), k=1) * -1e9
        scores = scores + mask
        weights = self._softmax(scores)
        return weights @ seq_embeddings

    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return e_x / e_x.sum(axis=-1, keepdims=True)

    def encode_sequence(self, item_ids: List[str]) -> np.ndarray:
        seq = item_ids[-self.max_seq :]
        embeddings = np.array([self._get_or_create_embedding(i) for i in seq])
        pos = self.position_embeddings[: len(seq)]
        seq_with_pos = embeddings + pos
        attended = self._attention(seq_with_pos)
        return attended[-1]

    def predict(
        self,
        item_ids: List[str],
        top_k: int = 10,
        exclude: Optional[List[str]] = None,
    ) -> List[dict]:
        if not self.item_embeddings:
            return []

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
        for seq in sequences:
            if len(seq) < 2:
                continue
            for i in range(1, len(seq)):
                context = seq[:i]
                target_id = seq[i]
                user_vec = self.encode_sequence(context)
                target_emb = self._get_or_create_embedding(target_id)
                score = np.dot(user_vec, target_emb)
                loss = -np.log(1 / (1 + np.exp(-score)) + 1e-10)
                total_loss += loss

                neg_id = np.random.choice(
                    [k for k in self.item_embeddings if k != target_id]
                    or [target_id]
                )
                neg_emb = self._get_or_create_embedding(neg_id)
                neg_score = np.dot(user_vec, neg_emb)
                neg_loss = -np.log(1 / (1 + np.exp(neg_score)) + 1e-10)
                total_loss += neg_loss

                grad = user_vec * (1 - 1 / (1 + np.exp(-score)))
                self.item_embeddings[target_id] += lr * grad
                self.item_embeddings[target_id] /= np.linalg.norm(
                    self.item_embeddings[target_id]
                ) + 1e-10

        n = max(len(sequences), 1)
        return total_loss / n


model = SASRecModel()


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "items_trained": len(model.item_embeddings),
        "trained": model.trained,
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
