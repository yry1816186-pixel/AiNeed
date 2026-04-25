"""
Preference Model v1 — Dual-Tower Architecture

5M parameter preference model using dual-tower (user + item) architecture
with a cross-layer for interaction modeling.

Architecture:
  - UserTower: 4 categorical features -> 128-dim embedding
  - ItemTower: 1152-dim SigLIP embedding + attributes -> 128-dim embedding
  - PreferenceModel: dual-tower + cross layer -> preference score

Training: BPR loss with negative sampling
Serving: FastAPI endpoints for predict/train/status

Usage:
  # Start the preference model service
  python ml/services/recommender/preference_model.py --port 8100

  # Or import and use programmatically
  from ml.services.recommender.preference_model import PreferenceModel
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import torch
import torch.nn as nn
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Categorical vocabulary sizes (configurable via environment or defaults)
BODY_TYPE_VOCAB = [
    "hourglass", "rectangle", "pear", "apple", "inverted-triangle",
    "triangle", "oval", "athletic", "petite", "tall",
]
STYLE_VOCAB = [
    "minimalist", "classic", "bohemian", "streetwear", "romantic",
    "preppy", "sporty", "vintage", "avant-garde", "casual",
    "elegant", "grunge", "punk", "chic", "tomboy",
]
BUDGET_VOCAB = [
    "budget", "affordable", "mid-range", "premium", "luxury",
]
SCENARIO_VOCAB = [
    "commute", "date", "interview", "business", "street",
    "party", "sport", "casual", "vacation", "formal",
    "campus", "workout", "daily", "travel", "wedding",
]

EMBEDDING_DIM = 32  # Per categorical feature
USER_EMB_DIM = 128  # 4 features * 32 dim
ITEM_INPUT_DIM = 1154  # 1152 (SigLIP) + 1 (category) + 1 (price)
ITEM_EMB_DIM = 128
SIGLIP_DIM = 1152


class UserTower(nn.Module):
    """User representation tower.

    Input: 4 categorical features (bodyType, styleExpression, budget, scenario)
    Each feature is embedded into 32-dim, concatenated to 128-dim.
    FC layers: 128 -> 128 -> 128 with ReLU + BatchNorm.
    Output: 128-dim user embedding.
    """

    def __init__(
        self,
        body_type_vocab_size: int = len(BODY_TYPE_VOCAB),
        style_vocab_size: int = len(STYLE_VOCAB),
        budget_vocab_size: int = len(BUDGET_VOCAB),
        scenario_vocab_size: int = len(SCENARIO_VOCAB),
        embedding_dim: int = EMBEDDING_DIM,
    ):
        super().__init__()
        self.body_type_emb = nn.Embedding(body_type_vocab_size, embedding_dim)
        self.style_emb = nn.Embedding(style_vocab_size, embedding_dim)
        self.budget_emb = nn.Embedding(budget_vocab_size, embedding_dim)
        self.scenario_emb = nn.Embedding(scenario_vocab_size, embedding_dim)

        input_dim = embedding_dim * 4  # 128
        self.fc1 = nn.Linear(input_dim, 128)
        self.bn1 = nn.BatchNorm1d(128)
        self.fc2 = nn.Linear(128, 128)
        self.bn2 = nn.BatchNorm1d(128)
        self.dropout = nn.Dropout(0.2)

    def forward(self, body_type_idx, style_idx, budget_idx, scenario_idx):
        # Embed each categorical feature
        body_emb = self.body_type_emb(body_type_idx)      # (B, 32)
        style_emb = self.style_emb(style_idx)              # (B, 32)
        budget_emb = self.budget_emb(budget_idx)            # (B, 32)
        scenario_emb = self.scenario_emb(scenario_idx)      # (B, 32)

        # Concatenate embeddings
        x = torch.cat([body_emb, style_emb, budget_emb, scenario_emb], dim=-1)  # (B, 128)

        # FC layers
        x = F.relu(self.bn1(self.fc1(x)))
        x = self.dropout(x)
        x = F.relu(self.bn2(self.fc2(x)))

        # L2 normalize for cosine similarity
        x = F.normalize(x, p=2, dim=-1)
        return x


class ItemTower(nn.Module):
    """Item representation tower.

    Input: FashionSigLIP embedding (1152 dim) + category(1) + price(1) = 1154 features
    FC layers: 1154 -> 512 -> 256 -> 128 with ReLU + BatchNorm.
    Output: 128-dim item embedding.
    """

    def __init__(
        self,
        siglip_dim: int = SIGLIP_DIM,
        embedding_dim: int = ITEM_EMB_DIM,
    ):
        super().__init__()
        input_dim = siglip_dim + 2  # 1152 + category_idx + normalized_price

        self.fc1 = nn.Linear(input_dim, 512)
        self.bn1 = nn.BatchNorm1d(512)
        self.fc2 = nn.Linear(512, 256)
        self.bn2 = nn.BatchNorm1d(256)
        self.fc3 = nn.Linear(256, embedding_dim)
        self.bn3 = nn.BatchNorm1d(embedding_dim)
        self.dropout = nn.Dropout(0.2)

    def forward(self, siglip_embedding, category_idx, normalized_price):
        # Concatenate SigLIP embedding with categorical features
        x = torch.cat([siglip_embedding, category_idx.unsqueeze(-1), normalized_price.unsqueeze(-1)], dim=-1)

        # FC layers
        x = F.relu(self.bn1(self.fc1(x)))
        x = self.dropout(x)
        x = F.relu(self.bn2(self.fc2(x)))
        x = self.dropout(x)
        x = F.relu(self.bn3(self.fc3(x)))

        # L2 normalize for cosine similarity
        x = F.normalize(x, p=2, dim=-1)
        return x


class PreferenceModel(nn.Module):
    """Dual-tower preference model with cross-layer interaction.

    Architecture:
      - user_tower: UserTower -> 128-dim user embedding
      - item_tower: ItemTower -> 128-dim item embedding
      - cross_layer: Linear(256, 128) -> ReLU -> Linear(128, 1) -> sigmoid
    """

    def __init__(
        self,
        body_type_vocab_size: int = len(BODY_TYPE_VOCAB),
        style_vocab_size: int = len(STYLE_VOCAB),
        budget_vocab_size: int = len(BUDGET_VOCAB),
        scenario_vocab_size: int = len(SCENARIO_VOCAB),
        siglip_dim: int = SIGLIP_DIM,
        embedding_dim: int = ITEM_EMB_DIM,
    ):
        super().__init__()
        self.user_tower = UserTower(
            body_type_vocab_size=body_type_vocab_size,
            style_vocab_size=style_vocab_size,
            budget_vocab_size=budget_vocab_size,
            scenario_vocab_size=scenario_vocab_size,
        )
        self.item_tower = ItemTower(
            siglip_dim=siglip_dim,
            embedding_dim=embedding_dim,
        )

        # Cross interaction layer
        self.cross_fc1 = nn.Linear(embedding_dim * 2, 128)
        self.cross_fc2 = nn.Linear(128, 1)

    def forward(
        self,
        body_type_idx,
        style_idx,
        budget_idx,
        scenario_idx,
        siglip_embedding,
        category_idx,
        normalized_price,
    ):
        # Get tower embeddings
        user_emb = self.user_tower(body_type_idx, style_idx, budget_idx, scenario_idx)  # (B, 128)
        item_emb = self.item_tower(siglip_embedding, category_idx, normalized_price)    # (B, 128)

        # Cross interaction
        cross_input = torch.cat([user_emb, item_emb], dim=-1)  # (B, 256)
        cross_hidden = F.relu(self.cross_fc1(cross_input))      # (B, 128)
        score = torch.sigmoid(self.cross_fc2(cross_hidden))      # (B, 1)

        return score.squeeze(-1), user_emb, item_emb

    def predict(
        self,
        body_type_idx,
        style_idx,
        budget_idx,
        scenario_idx,
        siglip_embedding,
        category_idx,
        normalized_price,
    ):
        """Predict preference score (inference mode)."""
        self.eval()
        with torch.no_grad():
            score, _, _ = self.forward(
                body_type_idx, style_idx, budget_idx, scenario_idx,
                siglip_embedding, category_idx, normalized_price,
            )
        return score


def count_parameters(model: nn.Module) -> int:
    """Count total trainable parameters."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


# Vocabulary index mappers
BODY_TYPE_TO_IDX = {v: i for i, v in enumerate(BODY_TYPE_VOCAB)}
STYLE_TO_IDX = {v: i for i, v in enumerate(STYLE_VOCAB)}
BUDGET_TO_IDX = {v: i for i, v in enumerate(BUDGET_VOCAB)}
SCENARIO_TO_IDX = {v: i for i, v in enumerate(SCENARIO_VOCAB)}

# Category vocabulary for items
CATEGORY_VOCAB = [
    "tops", "bottoms", "dresses", "outerwear", "footwear",
    "accessories", "bags", "jewelry", "hats", "scarves",
    "activewear", "swimwear", "lingerie", "suits", "knitwear",
]
CATEGORY_TO_IDX = {v: i for i, v in enumerate(CATEGORY_VOCAB)}


def encode_user_features(
    body_type: str,
    style_expression: str,
    budget: str,
    scenario: str,
) -> Dict[str, int]:
    """Encode user categorical features to indices."""
    return {
        "body_type_idx": BODY_TYPE_TO_IDX.get(body_type.lower(), 0),
        "style_idx": STYLE_TO_IDX.get(style_expression.lower(), 0),
        "budget_idx": BUDGET_TO_IDX.get(budget.lower(), 0),
        "scenario_idx": SCENARIO_TO_IDX.get(scenario.lower(), 0),
    }


def encode_item_features(
    category: str,
    price: float,
    max_price: float = 10000.0,
) -> Dict[str, Any]:
    """Encode item features to model input format."""
    return {
        "category_idx": CATEGORY_TO_IDX.get(category.lower(), 0),
        "normalized_price": min(price / max_price, 1.0),
    }


# ============================================================================
# FastAPI Service
# ============================================================================

_model: Optional[PreferenceModel] = None
_model_path: Optional[Path] = None
_training_status: Dict[str, Any] = {
    "status": "idle",
    "last_train_time": None,
    "samples_processed": 0,
    "epochs_completed": 0,
}


def get_model() -> PreferenceModel:
    """Get or initialize the preference model."""
    global _model
    if _model is None:
        _model = PreferenceModel()
        # Try to load saved model
        default_path = Path(__file__).parent.parent.parent / "models" / "preference_model" / "model.pt"
        if default_path.exists():
            _model.load_state_dict(torch.load(default_path, map_location="cpu"))
            logger.info(f"Loaded preference model from {default_path}")
        else:
            logger.info("Initialized new preference model (no saved weights found)")
    return _model


def create_app():
    """Create FastAPI application for preference model service."""
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel, Field

    app = FastAPI(
        title="Preference Model Service",
        description="Dual-tower preference model for fashion recommendation",
        version="1.0.0",
    )

    class PredictRequest(BaseModel):
        userId: str = Field(..., description="User ID")
        itemId: str = Field(..., description="Item ID")
        bodyType: str = Field(default="hourglass", description="User body type")
        styleExpression: str = Field(default="minimalist", description="User style expression")
        budget: str = Field(default="mid-range", description="User budget level")
        scenario: str = Field(default="daily", description="Target scenario")
        category: str = Field(default="tops", description="Item category")
        price: float = Field(default=200.0, description="Item price")
        siglipEmbedding: Optional[List[float]] = Field(default=None, description="FashionSigLIP embedding (1152-dim)")

    class PredictResponse(BaseModel):
        userId: str
        itemId: str
        score: float
        model_version: str = "1.0.0"

    class TrainRequest(BaseModel):
        samples: List[Dict[str, Any]] = Field(..., description="Training samples")
        epochs: int = Field(default=5, description="Number of training epochs")
        learningRate: float = Field(default=0.001, description="Learning rate")

    class TrainResponse(BaseModel):
        status: str
        samples_processed: int
        epochs_completed: int
        final_loss: float

    class StatusResponse(BaseModel):
        status: str
        model_loaded: bool
        parameters: int
        last_train_time: Optional[str]
        samples_processed: int
        epochs_completed: int

    @app.post("/preference/predict", response_model=PredictResponse)
    async def predict_preference(request: PredictRequest):
        """Predict preference score for a user-item pair."""
        model = get_model()

        # Encode user features
        user_features = encode_user_features(
            request.bodyType, request.styleExpression,
            request.budget, request.scenario,
        )

        # Encode item features
        item_features = encode_item_features(request.category, request.price)

        # Prepare SigLIP embedding (use zeros if not provided)
        if request.siglipEmbedding and len(request.siglipEmbedding) == SIGLIP_DIM:
            siglip_emb = torch.tensor([request.siglipEmbedding], dtype=torch.float32)
        else:
            siglip_emb = torch.zeros(1, SIGLIP_DIM)

        # Build tensors
        body_type_idx = torch.tensor([user_features["body_type_idx"]], dtype=torch.long)
        style_idx = torch.tensor([user_features["style_idx"]], dtype=torch.long)
        budget_idx = torch.tensor([user_features["budget_idx"]], dtype=torch.long)
        scenario_idx = torch.tensor([user_features["scenario_idx"]], dtype=torch.long)
        category_idx = torch.tensor([item_features["category_idx"]], dtype=torch.long)
        normalized_price = torch.tensor([item_features["normalized_price"]], dtype=torch.float32)

        score = model.predict(
            body_type_idx, style_idx, budget_idx, scenario_idx,
            siglip_emb, category_idx, normalized_price,
        )

        return PredictResponse(
            userId=request.userId,
            itemId=request.itemId,
            score=round(score.item(), 4),
        )

    @app.post("/preference/train", response_model=TrainResponse)
    async def train_model(request: TrainRequest):
        """Train the preference model with provided samples."""
        global _training_status

        model = get_model()
        model.train()

        optimizer = torch.optim.Adam(model.parameters(), lr=request.learningRate)

        # Build training tensors from samples
        samples = request.samples
        if len(samples) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 training samples")

        # Prepare batch tensors
        body_type_idxs = []
        style_idxs = []
        budget_idxs = []
        scenario_idxs = []
        siglip_embs = []
        category_idxs = []
        normalized_prices = []
        labels = []

        for sample in samples:
            uf = encode_user_features(
                sample.get("bodyType", "hourglass"),
                sample.get("styleExpression", "minimalist"),
                sample.get("budget", "mid-range"),
                sample.get("scenario", "daily"),
            )
            itf = encode_item_features(
                sample.get("category", "tops"),
                sample.get("price", 200.0),
            )

            body_type_idxs.append(uf["body_type_idx"])
            style_idxs.append(uf["style_idx"])
            budget_idxs.append(uf["budget_idx"])
            scenario_idxs.append(uf["scenario_idx"])
            category_idxs.append(itf["category_idx"])
            normalized_prices.append(itf["normalized_price"])
            labels.append(sample.get("label", 0.5))

            emb = sample.get("siglipEmbedding")
            if emb and len(emb) == SIGLIP_DIM:
                siglip_embs.append(emb)
            else:
                siglip_embs.append([0.0] * SIGLIP_DIM)

        body_type_t = torch.tensor(body_type_idxs, dtype=torch.long)
        style_t = torch.tensor(style_idxs, dtype=torch.long)
        budget_t = torch.tensor(budget_idxs, dtype=torch.long)
        scenario_t = torch.tensor(scenario_idxs, dtype=torch.long)
        siglip_t = torch.tensor(siglip_embs, dtype=torch.float32)
        category_t = torch.tensor(category_idxs, dtype=torch.long)
        price_t = torch.tensor(normalized_prices, dtype=torch.float32)
        labels_t = torch.tensor(labels, dtype=torch.float32)

        final_loss = 0.0
        for epoch in range(request.epochs):
            optimizer.zero_grad()

            scores, user_emb, item_emb = model(
                body_type_t, style_t, budget_t, scenario_t,
                siglip_t, category_t, price_t,
            )

            # BPR loss with negative sampling
            # Positive pairs: (user, item) with label=1
            # Negative pairs: (user, item) with label=0
            pos_mask = labels_t == 1.0
            neg_mask = labels_t == 0.0

            if pos_mask.any() and neg_mask.any():
                pos_scores = scores[pos_mask]
                neg_scores = scores[neg_mask]

                # BPR: maximize margin between positive and negative scores
                # Expand for pairwise comparison
                bpr_loss = -torch.log(torch.sigmoid(pos_scores.unsqueeze(1) - neg_scores.unsqueeze(0)) + 1e-8)
                loss = bpr_loss.mean()
            else:
                # Fallback to MSE if no positive/negative pairs
                loss = F.mse_loss(scores, labels_t)

            loss.backward()
            optimizer.step()
            final_loss = loss.item()

        _training_status = {
            "status": "trained",
            "last_train_time": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "samples_processed": len(samples),
            "epochs_completed": request.epochs,
        }

        return TrainResponse(
            status="completed",
            samples_processed=len(samples),
            epochs_completed=request.epochs,
            final_loss=round(final_loss, 4),
        )

    @app.get("/preference/status", response_model=StatusResponse)
    async def get_status():
        """Get model status and training info."""
        model = get_model()
        return StatusResponse(
            status=_training_status["status"],
            model_loaded=True,
            parameters=count_parameters(model),
            last_train_time=_training_status.get("last_train_time"),
            samples_processed=_training_status.get("samples_processed", 0),
            epochs_completed=_training_status.get("epochs_completed", 0),
        )

    return app


def main():
    """Start the preference model FastAPI service."""
    parser = argparse.ArgumentParser(description="Preference Model Service")
    parser.add_argument("--port", type=int, default=8100, help="Service port")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Service host")
    parser.add_argument("--save", type=str, default=None, help="Save model to path after initialization")
    parser.add_argument("--load", type=str, default=None, help="Load model from path")
    args = parser.parse_args()

    # Pre-load model if --load specified
    global _model, _model_path
    if args.load:
        _model_path = Path(args.load)
        _model = PreferenceModel()
        _model.load_state_dict(torch.load(_model_path, map_location="cpu"))
        logger.info(f"Loaded model from {_model_path}")

    # Initialize model and print parameter count
    model = get_model()
    param_count = count_parameters(model)
    logger.info(f"PreferenceModel initialized with {param_count:,} parameters (~{param_count/1e6:.1f}M)")

    # Save model if --save specified
    if args.save:
        save_path = Path(args.save)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(model.state_dict(), save_path)
        logger.info(f"Model saved to {save_path}")

    # Start FastAPI server
    import uvicorn
    app = create_app()
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
