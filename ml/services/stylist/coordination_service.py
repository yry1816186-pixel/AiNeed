"""
Coordination Service - FastAPI microservice for item compatibility prediction.

Standalone FastAPI app running on port 8101 that hosts the CoordinationModel.
Provides endpoints for single/batch prediction, training, and model management.

Endpoints:
  POST /coordination/predict       - Single pair prediction
  POST /coordination/predict/batch - Batch predictions
  POST /coordination/train         - Train model on generated data
  GET  /coordination/status        - Model status
  GET  /health                     - Health check

Author: XunO ML Team
Version: 1.0.0
"""

import json
import os
import logging
import threading
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from ml.models.coordination_model import CoordinationModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Coordination Service", version="1.0.0")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "coordination_training"
MODEL_DIR = Path(os.getenv("COORDINATION_MODEL_DIR", str(BASE_DIR / "models" / "saved")))
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "coordination_model.pt"

# Category to ID mapping (~32 categories used in the system)
CATEGORY_TO_ID: Dict[str, int] = {
    # Tops (12)
    "t_shirt": 0, "shirt": 1, "blouse": 2, "sweater": 3,
    "hoodie": 4, "blazer": 5, "jacket": 6, "coat": 7,
    "cardigan": 8, "vest": 9, "crop_top": 10, "tank_top": 11,
    # Bottoms (10)
    "jeans": 12, "trousers": 13, "shorts": 14,
    "skirt_mini": 15, "skirt_midi": 16, "skirt_maxi": 17,
    "leggings": 18, "wide_leg_pants": 19, "culottes": 20, "joggers": 21,
    # Accessories/other (10)
    "dress": 22, "sneakers": 23, "heels": 24, "boots": 25,
    "sandals": 26, "flats": 27, "loafers": 28, "bag": 29,
    "hat": 30, "scarf": 31,
}


# ============================================================
# Global Model State
# ============================================================

_model_lock = threading.Lock()
_model: Optional[CoordinationModel] = None
_model_trained: bool = False
_model_trained_at: Optional[str] = None
_training_in_progress: bool = False


def _get_model() -> CoordinationModel:
    """Get or initialize the global model instance."""
    global _model
    if _model is None:
        _model = CoordinationModel()
        _load_saved_model()
    return _model


def _load_saved_model() -> bool:
    """Load model from disk if a saved model exists."""
    global _model, _model_trained, _model_trained_at
    if MODEL_PATH.exists():
        try:
            state_dict = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
            _model.load_state_dict(state_dict)
            _model_trained = True
            _model_trained_at = datetime.fromtimestamp(
                MODEL_PATH.stat().st_mtime
            ).isoformat()
            logger.info(f"Loaded saved model from {MODEL_PATH}")
            return True
        except Exception as e:
            logger.warning(f"Failed to load saved model: {e}")
    return False


# ============================================================
# Pydantic Request/Response Models
# ============================================================

class PredictRequest(BaseModel):
    """Request for single pair compatibility prediction."""
    item_a_category: str = Field(..., description="Category name for item A")
    item_b_category: str = Field(..., description="Category name for item B")
    item_a_aux: Optional[List[float]] = Field(
        default=None,
        description="16-dim auxiliary features for item A",
    )
    item_b_aux: Optional[List[float]] = Field(
        default=None,
        description="16-dim auxiliary features for item B",
    )


class BatchPredictRequest(BaseModel):
    """Request for batch compatibility prediction."""
    pairs: List[PredictRequest] = Field(..., description="List of item pairs")


class TrainRequest(BaseModel):
    """Request to train the coordination model."""
    epochs: int = Field(default=50, ge=1, le=200, description="Maximum training epochs")
    learning_rate: float = Field(default=0.001, gt=0, lt=0.1, description="Learning rate")
    batch_size: int = Field(default=64, ge=8, le=512, description="Batch size")


class PredictResponse(BaseModel):
    """Single pair prediction result."""
    item_a_category: str
    item_b_category: str
    compatibility_score: float


class BatchPredictResponse(BaseModel):
    """Batch prediction result."""
    predictions: List[PredictResponse]
    count: int


class TrainResponse(BaseModel):
    """Training result with metrics."""
    final_loss: float
    val_accuracy: float
    epochs_run: int
    best_epoch: int
    total_samples: int
    model_path: str


# ============================================================
# PyTorch Dataset
# ============================================================

class CoordinationDataset(Dataset):
    """PyTorch Dataset for coordination training data."""

    def __init__(self, data: List[Dict]) -> None:
        self.data = data

    def __len__(self) -> int:
        return len(self.data)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        sample = self.data[idx]
        return {
            "item_a_category": torch.tensor(sample["item_a_category_id"], dtype=torch.long),
            "item_b_category": torch.tensor(sample["item_b_category_id"], dtype=torch.long),
            "item_a_aux": torch.tensor(
                sample.get("item_a_aux", [0.0] * 16), dtype=torch.float32
            ),
            "item_b_aux": torch.tensor(
                sample.get("item_b_aux", [0.0] * 16), dtype=torch.float32
            ),
            "label": torch.tensor(sample["label"], dtype=torch.float32),
        }


# ============================================================
# Core Training Logic
# ============================================================

def train_model(
    model: CoordinationModel,
    train_data: List[Dict],
    val_data: List[Dict],
    epochs: int = 50,
    learning_rate: float = 0.001,
    batch_size: int = 64,
    patience: int = 5,
) -> Dict:
    """Train the CoordinationModel with full PyTorch training loop.

    Implements:
      - BCELoss + Adam optimizer
      - Validation each epoch
      - Early stopping with patience
      - Best model checkpoint saving

    Args:
        model: CoordinationModel instance.
        train_data: Training samples.
        val_data: Validation samples.
        epochs: Max epochs.
        learning_rate: Adam learning rate.
        batch_size: DataLoader batch size.
        patience: Early stopping patience.

    Returns:
        Dict with training metrics.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    model.train()

    train_dataset = CoordinationDataset(train_data)
    val_dataset = CoordinationDataset(val_data)
    train_loader = DataLoader(
        train_dataset, batch_size=batch_size, shuffle=True, drop_last=False,
    )
    val_loader = DataLoader(
        val_dataset, batch_size=batch_size, shuffle=False, drop_last=False,
    )

    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    criterion = nn.BCELoss()

    best_val_loss = float("inf")
    best_epoch = 0
    epochs_no_improve = 0
    best_state_dict = None
    history = []

    logger.info(
        f"Starting training: {len(train_data)} train, {len(val_data)} val, "
        f"epochs={epochs}, lr={learning_rate}, batch_size={batch_size}, device={device}"
    )

    for epoch in range(1, epochs + 1):
        # --- Training phase ---
        model.train()
        total_loss = 0.0
        num_batches = 0

        for batch in train_loader:
            item_a = batch["item_a_category"].to(device)
            item_b = batch["item_b_category"].to(device)
            aux_a = batch["item_a_aux"].to(device)
            aux_b = batch["item_b_aux"].to(device)
            labels = batch["label"].to(device)

            optimizer.zero_grad()
            preds = model(item_a, item_b, aux_a, aux_b)
            loss = criterion(preds, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            num_batches += 1

        avg_train_loss = total_loss / max(num_batches, 1)

        # --- Validation phase ---
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for batch in val_loader:
                item_a = batch["item_a_category"].to(device)
                item_b = batch["item_b_category"].to(device)
                aux_a = batch["item_a_aux"].to(device)
                aux_b = batch["item_b_aux"].to(device)
                labels = batch["label"].to(device)

                preds = model(item_a, item_b, aux_a, aux_b)
                loss = criterion(preds, labels)
                val_loss += loss.item()

                # Accuracy with 0.5 threshold
                predicted = (preds >= 0.5).float()
                val_correct += (predicted == labels).sum().item()
                val_total += labels.size(0)

        avg_val_loss = val_loss / max(len(val_loader), 1)
        val_accuracy = val_correct / max(val_total, 1)

        history.append({
            "epoch": epoch,
            "train_loss": round(avg_train_loss, 4),
            "val_loss": round(avg_val_loss, 4),
            "val_accuracy": round(val_accuracy, 4),
        })

        logger.info(
            f"Epoch {epoch}/{epochs} - "
            f"train_loss: {avg_train_loss:.4f}, "
            f"val_loss: {avg_val_loss:.4f}, "
            f"val_acc: {val_accuracy:.4f}"
        )

        # --- Early stopping check ---
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            best_epoch = epoch
            epochs_no_improve = 0
            best_state_dict = {
                k: v.cpu().clone() for k, v in model.state_dict().items()
            }
            logger.info(f"  New best model at epoch {epoch} (val_loss={avg_val_loss:.4f})")
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                logger.info(f"  Early stopping at epoch {epoch} (patience={patience})")
                break

    # Restore best model
    if best_state_dict is not None:
        model.load_state_dict(best_state_dict)
        model = model.to(device)

    # Save best model to disk
    torch.save(model.cpu().state_dict(), MODEL_PATH)
    logger.info(f"Saved best model to {MODEL_PATH}")

    final_epoch = epoch
    final_metrics = history[-1] if history else {}

    return {
        "final_loss": final_metrics.get("train_loss", 0.0),
        "val_accuracy": final_metrics.get("val_accuracy", 0.0),
        "epochs_run": final_epoch,
        "best_epoch": best_epoch,
        "total_samples": len(train_data) + len(val_data),
        "model_path": str(MODEL_PATH),
        "history": history,
    }


# ============================================================
# FastAPI Endpoints
# ============================================================

@app.get("/health")
async def health() -> Dict:
    """Health check endpoint."""
    model = _get_model()
    counts = model.count_parameters()
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "trained": _model_trained,
        "trained_at": _model_trained_at,
        "model_version": "1.0.0",
        "parameters": counts,
        "training_in_progress": _training_in_progress,
    }


@app.post("/coordination/predict", response_model=PredictResponse)
async def predict(req: PredictRequest) -> PredictResponse:
    """Predict compatibility score for a single item pair."""
    if req.item_a_category not in CATEGORY_TO_ID:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown category: {req.item_a_category}. "
                   f"Valid: {list(CATEGORY_TO_ID.keys())}",
        )
    if req.item_b_category not in CATEGORY_TO_ID:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown category: {req.item_b_category}. "
                   f"Valid: {list(CATEGORY_TO_ID.keys())}",
        )

    model = _get_model()
    model.eval()

    item_a = torch.tensor([CATEGORY_TO_ID[req.item_a_category]], dtype=torch.long)
    item_b = torch.tensor([CATEGORY_TO_ID[req.item_b_category]], dtype=torch.long)
    aux_a = torch.tensor(
        [req.item_a_aux or [0.0] * 16], dtype=torch.float32
    )
    aux_b = torch.tensor(
        [req.item_b_aux or [0.0] * 16], dtype=torch.float32
    )

    with torch.no_grad():
        score = model(item_a, item_b, aux_a, aux_b).item()

    return PredictResponse(
        item_a_category=req.item_a_category,
        item_b_category=req.item_b_category,
        compatibility_score=round(score, 4),
    )


@app.post("/coordination/predict/batch", response_model=BatchPredictResponse)
async def predict_batch(req: BatchPredictRequest) -> BatchPredictResponse:
    """Predict compatibility scores for multiple item pairs."""
    model = _get_model()
    model.eval()

    predictions = []
    item_a_ids = []
    item_b_ids = []
    aux_a_list = []
    aux_b_list = []

    for pair in req.pairs:
        if pair.item_a_category not in CATEGORY_TO_ID:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown category: {pair.item_a_category}",
            )
        if pair.item_b_category not in CATEGORY_TO_ID:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown category: {pair.item_b_category}",
            )
        item_a_ids.append(CATEGORY_TO_ID[pair.item_a_category])
        item_b_ids.append(CATEGORY_TO_ID[pair.item_b_category])
        aux_a_list.append(pair.item_a_aux or [0.0] * 16)
        aux_b_list.append(pair.item_b_aux or [0.0] * 16)

    item_a = torch.tensor(item_a_ids, dtype=torch.long)
    item_b = torch.tensor(item_b_ids, dtype=torch.long)
    aux_a = torch.tensor(aux_a_list, dtype=torch.float32)
    aux_b = torch.tensor(aux_b_list, dtype=torch.float32)

    with torch.no_grad():
        scores = model(item_a, item_b, aux_a, aux_b).tolist()

    for pair, score in zip(req.pairs, scores):
        predictions.append(PredictResponse(
            item_a_category=pair.item_a_category,
            item_b_category=pair.item_b_category,
            compatibility_score=round(score, 4),
        ))

    return BatchPredictResponse(predictions=predictions, count=len(predictions))


@app.post("/coordination/train", response_model=TrainResponse)
async def train(req: TrainRequest) -> TrainResponse:
    """Train the coordination model on generated data.

    Loads train/val data from ml/data/coordination_training/, runs full
    PyTorch training with BCELoss + Adam, early stopping, and saves
    the best model to ml/models/saved/coordination_model.pt.
    """
    global _model_trained, _model_trained_at, _training_in_progress

    with _model_lock:
        if _training_in_progress:
            raise HTTPException(
                status_code=503,
                detail="Training already in progress - please try again later",
            )
        _training_in_progress = True

    try:
        # Load training data
        train_path = DATA_DIR / "train.json"
        val_path = DATA_DIR / "val.json"

        if not train_path.exists():
            raise HTTPException(
                status_code=400,
                detail="Training data not found. Run generate_coordination_training_data.py first.",
            )

        with open(train_path, "r", encoding="utf-8") as f:
            train_data = json.load(f)

        val_data = []
        if val_path.exists():
            with open(val_path, "r", encoding="utf-8") as f:
                val_data = json.load(f)

        if len(train_data) == 0:
            raise HTTPException(status_code=400, detail="Training data is empty")

        if len(val_data) == 0:
            # Use 10% of training data as validation if no val split
            split_idx = int(len(train_data) * 0.9)
            val_data = train_data[split_idx:]
            train_data = train_data[:split_idx]

        model = _get_model()

        # Run training
        metrics = train_model(
            model=model,
            train_data=train_data,
            val_data=val_data,
            epochs=req.epochs,
            learning_rate=req.learning_rate,
            batch_size=req.batch_size,
        )

        _model_trained = True
        _model_trained_at = datetime.now().isoformat()

        return TrainResponse(
            final_loss=metrics["final_loss"],
            val_accuracy=metrics["val_accuracy"],
            epochs_run=metrics["epochs_run"],
            best_epoch=metrics["best_epoch"],
            total_samples=metrics["total_samples"],
            model_path=metrics["model_path"],
        )

    finally:
        with _model_lock:
            _training_in_progress = False


@app.get("/coordination/status")
async def coordination_status() -> Dict:
    """Get model training status and metadata."""
    model = _get_model()
    counts = model.count_parameters()
    return {
        "model_loaded": model is not None,
        "trained": _model_trained,
        "trained_at": _model_trained_at,
        "parameters": counts,
        "training_in_progress": _training_in_progress,
        "data_dir": str(DATA_DIR),
        "model_path": str(MODEL_PATH),
        "has_training_data": (DATA_DIR / "train.json").exists(),
        "has_saved_model": MODEL_PATH.exists(),
        "categories_count": len(CATEGORY_TO_ID),
    }


# ============================================================
# Entry Point
# ============================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("COORDINATION_SERVICE_PORT", "8101"))
    uvicorn.run(app, host="0.0.0.0", port=port)
