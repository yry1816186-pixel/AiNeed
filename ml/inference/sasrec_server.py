"""
SASRec Recommendation Server
序列推荐推理服务 - 基于自注意力机制的序列推荐模型
提供个性化商品推荐、序列行为预测等功能
"""

import os
import json
import logging
import time
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
from pathlib import Path

import torch
import torch.nn as nn
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_LOADED = False
GPU_AVAILABLE = False
DEVICE = None

try:
    GPU_AVAILABLE = torch.cuda.is_available()
    DEVICE = torch.device("cuda" if GPU_AVAILABLE else "cpu")
    logger.info(f"CUDA available: {GPU_AVAILABLE}, Device: {DEVICE}")
except Exception as e:
    logger.warning(f"CUDA check failed: {e}")
    DEVICE = torch.device("cpu")


class SASRecConfig:
    def __init__(
        self,
        item_num: int = 50000,
        max_seq_len: int = 50,
        hidden_size: int = 128,
        num_heads: int = 2,
        num_blocks: int = 2,
        dropout: float = 0.2,
    ):
        self.item_num = item_num
        self.max_seq_len = max_seq_len
        self.hidden_size = hidden_size
        self.num_heads = num_heads
        self.num_blocks = num_blocks
        self.dropout = dropout


class SASRecModel(nn.Module):
    def __init__(self, config: SASRecConfig):
        super().__init__()
        self.config = config
        
        self.item_embedding = nn.Embedding(
            config.item_num + 1, 
            config.hidden_size, 
            padding_idx=0
        )
        
        self.position_embedding = nn.Embedding(
            config.max_seq_len + 1, 
            config.hidden_size
        )
        
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=config.hidden_size,
            nhead=config.num_heads,
            dim_feedforward=config.hidden_size * 4,
            dropout=config.dropout,
            activation="gelu",
            batch_first=True,
        )
        
        self.transformer_encoder = nn.TransformerEncoder(
            encoder_layer,
            num_layers=config.num_blocks,
        )
        
        self.layer_norm = nn.LayerNorm(config.hidden_size)
        self.dropout = nn.Dropout(config.dropout)
        
        self._init_weights()

    def _init_weights(self):
        nn.init.normal_(self.item_embedding.weight, std=0.02)
        nn.init.normal_(self.position_embedding.weight, std=0.02)

    def forward(self, item_seq: torch.Tensor, mask: Optional[torch.Tensor] = None):
        batch_size, seq_len = item_seq.shape
        
        positions = torch.arange(seq_len, device=item_seq.device).unsqueeze(0).expand(batch_size, -1)
        
        x = self.item_embedding(item_seq) + self.position_embedding(positions)
        x = self.dropout(x)
        x = self.layer_norm(x)
        
        if mask is not None:
            x = x.masked_fill(mask.unsqueeze(-1) == 0, 0)
        
        attention_mask = torch.triu(
            torch.ones(seq_len, seq_len, device=item_seq.device) * float("-inf"),
            diagonal=1
        )
        
        x = self.transformer_encoder(x, mask=attention_mask)
        
        return x

    def predict(self, item_seq: torch.Tensor, candidate_items: torch.Tensor):
        seq_output = self.forward(item_seq)
        seq_output = seq_output[:, -1, :]
        
        candidate_emb = self.item_embedding(candidate_items)
        
        scores = torch.matmul(seq_output.unsqueeze(1), candidate_emb.transpose(1, 2)).squeeze(1)
        
        return scores


class RecommendationRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    item_sequence: List[int] = Field(..., description="Sequence of item IDs the user has interacted with")
    candidate_items: Optional[List[int]] = Field(None, description="Candidate items to rank")
    top_k: int = Field(10, description="Number of recommendations to return")
    include_scores: bool = Field(False, description="Include prediction scores")


class RecommendationResponse(BaseModel):
    success: bool
    recommendations: List[int]
    scores: Optional[List[float]] = None
    processing_time: float
    error: Optional[str] = None


class BatchRecommendationRequest(BaseModel):
    user_sequences: Dict[str, List[int]] = Field(..., description="User ID to item sequence mapping")
    top_k: int = Field(10, description="Number of recommendations per user")


class BatchRecommendationResponse(BaseModel):
    success: bool
    recommendations: Dict[str, List[int]]
    processing_time: float
    error: Optional[str] = None


class StatusResponse(BaseModel):
    available: bool
    model_loaded: bool
    gpu_available: bool
    item_num: int
    embedding_size: int
    error: Optional[str] = None


class ItemEmbeddingRequest(BaseModel):
    item_ids: List[int] = Field(..., description="Item IDs to get embeddings for")


class ItemEmbeddingResponse(BaseModel):
    success: bool
    embeddings: Dict[str, List[float]]
    processing_time: float


class SASRecService:
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or os.environ.get(
            "SASREC_MODEL_PATH", "./models/sasrec"
        )
        self.config = SASRecConfig()
        self.model = None
        self.model_error: Optional[str] = None
        self.item_metadata: Dict[int, Dict] = {}
        self._load_model()
        self._load_metadata()

    def _load_model(self):
        global MODEL_LOADED

        model_file = Path(self.model_path) / "model.pt"
        config_file = Path(self.model_path) / "config.json"
        model_dir = Path(self.model_path)

        MODEL_LOADED = False
        self.model = None
        self.model_error = None

        if not model_dir.exists():
            self.model_error = f"Model directory not found: {model_dir}"
            logger.error(self.model_error)
            return

        if config_file.exists():
            try:
                with open(config_file, "r") as f:
                    config_data = json.load(f)
                    self.config = SASRecConfig(**config_data)
                logger.info(f"Loaded config from {config_file}")
            except Exception as e:
                logger.warning(f"Failed to load config: {e}")

        if not model_file.exists():
            self.model_error = f"Model weight file not found: {model_file}"
            logger.error(self.model_error)
            return

        try:
            model = SASRecModel(self.config)
            state_dict = torch.load(model_file, map_location=DEVICE, weights_only=True)
            model.load_state_dict(state_dict)
            model.to(DEVICE)
            model.eval()
            self.model = model
            MODEL_LOADED = True
            logger.info(f"Loaded model from {model_file}")
        except Exception as e:
            self.model_error = f"Failed to load model weights: {e}"
            logger.error(self.model_error)
            self.model = None

    def _load_metadata(self):
        metadata_file = Path(self.model_path) / "item_metadata.json"
        
        if metadata_file.exists():
            try:
                with open(metadata_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item_id_str, meta in data.items():
                        self.item_metadata[int(item_id_str)] = meta
                logger.info(f"Loaded metadata for {len(self.item_metadata)} items")
            except Exception as e:
                logger.warning(f"Failed to load metadata: {e}")

    def recommend(
        self, 
        item_sequence: List[int], 
        candidate_items: Optional[List[int]] = None,
        top_k: int = 10,
        include_scores: bool = False
    ) -> Dict[str, Any]:
        if self.model is None:
            raise RuntimeError("Model not initialized")
        
        seq_len = len(item_sequence)
        if seq_len == 0:
            return {"recommendations": [], "scores": [] if include_scores else None}
        
        padded_seq = [0] * (self.config.max_seq_len - seq_len) + item_sequence[-self.config.max_seq_len:]
        
        item_tensor = torch.tensor([padded_seq], dtype=torch.long, device=DEVICE)
        
        if candidate_items is None:
            candidate_items = list(range(1, min(1000, self.config.item_num)))
        
        candidate_tensor = torch.tensor([candidate_items], dtype=torch.long, device=DEVICE)
        
        with torch.no_grad():
            scores = self.model.predict(item_tensor, candidate_tensor)
            scores = scores.squeeze(0).cpu().numpy()
        
        top_indices = np.argsort(scores)[::-1][:top_k]
        recommendations = [candidate_items[i] for i in top_indices]
        
        result = {"recommendations": recommendations}
        if include_scores:
            result["scores"] = [float(scores[i]) for i in top_indices]
        
        return result

    def get_item_embeddings(self, item_ids: List[int]) -> Dict[int, List[float]]:
        if self.model is None:
            raise RuntimeError("Model not initialized")
        
        item_tensor = torch.tensor(item_ids, dtype=torch.long, device=DEVICE)
        
        with torch.no_grad():
            embeddings = self.model.item_embedding(item_tensor).cpu().numpy()
        
        return {item_id: emb.tolist() for item_id, emb in zip(item_ids, embeddings)}


service: Optional[SASRecService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global service
    logger.info("Initializing SASRec Service...")
    service = SASRecService()
    logger.info(f"SASRec Service initialized. Model loaded: {MODEL_LOADED}")
    yield


app = FastAPI(
    title="AiNeed SASRec Recommendation Service",
    description="序列推荐推理服务 - 基于自注意力机制的个性化推荐",
    version="1.0.0",
    lifespan=lifespan
)

allowed_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "X-Requested-With",
    ],
)


@app.get("/health", response_model=StatusResponse)
async def health_check():
    return StatusResponse(
        available=MODEL_LOADED and service is not None and service.model is not None,
        model_loaded=MODEL_LOADED,
        gpu_available=GPU_AVAILABLE,
        item_num=service.config.item_num if service else 0,
        embedding_size=service.config.hidden_size if service else 0,
        error=service.model_error if service else "SASRec service not initialized",
    )


@app.post("/api/recommend", response_model=RecommendationResponse)
async def recommend(request: RecommendationRequest):
    if service is None or not MODEL_LOADED or service.model is None:
        raise HTTPException(status_code=503, detail="SASRec service not initialized")

    start_time = time.time()

    try:
        result = service.recommend(
            item_sequence=request.item_sequence,
            candidate_items=request.candidate_items,
            top_k=request.top_k,
            include_scores=request.include_scores
        )

        return RecommendationResponse(
            success=True,
            recommendations=result["recommendations"],
            scores=result.get("scores"),
            processing_time=time.time() - start_time
        )

    except Exception as e:
        logger.error(f"Recommendation failed: {e}")
        return RecommendationResponse(
            success=False,
            recommendations=[],
            processing_time=time.time() - start_time,
            error=str(e)
        )


@app.post("/api/recommend/batch", response_model=BatchRecommendationResponse)
async def batch_recommend(request: BatchRecommendationRequest):
    if service is None or not MODEL_LOADED or service.model is None:
        raise HTTPException(status_code=503, detail="SASRec service not initialized")

    start_time = time.time()
    recommendations = {}

    try:
        for user_id, item_sequence in request.user_sequences.items():
            result = service.recommend(
                item_sequence=item_sequence,
                top_k=request.top_k
            )
            recommendations[user_id] = result["recommendations"]

        return BatchRecommendationResponse(
            success=True,
            recommendations=recommendations,
            processing_time=time.time() - start_time
        )

    except Exception as e:
        logger.error(f"Batch recommendation failed: {e}")
        return BatchRecommendationResponse(
            success=False,
            recommendations={},
            processing_time=time.time() - start_time,
            error=str(e)
        )


@app.post("/api/embeddings", response_model=ItemEmbeddingResponse)
async def get_embeddings(request: ItemEmbeddingRequest):
    if service is None or not MODEL_LOADED or service.model is None:
        raise HTTPException(status_code=503, detail="SASRec service not initialized")

    start_time = time.time()

    try:
        embeddings = service.get_item_embeddings(request.item_ids)
        
        return ItemEmbeddingResponse(
            success=True,
            embeddings={str(k): v for k, v in embeddings.items()},
            processing_time=time.time() - start_time
        )

    except Exception as e:
        logger.error(f"Embedding extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/items/{item_id}/metadata")
async def get_item_metadata(item_id: int):
    if service is None or not MODEL_LOADED or service.model is None:
        raise HTTPException(status_code=503, detail="SASRec service not initialized")

    metadata = service.item_metadata.get(item_id)
    if metadata is None:
        raise HTTPException(status_code=404, detail="Item metadata not found")

    return {"item_id": item_id, "metadata": metadata}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("SASREC_PORT", 8002))
    host = os.environ.get("SASREC_HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
