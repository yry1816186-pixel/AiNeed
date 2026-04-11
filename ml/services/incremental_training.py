"""
增量训练流水线
支持持续学习、迁移学习和模型更新
包含经验回放机制防止灾难性遗忘
"""

import os
import sys
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader, ConcatDataset
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict, field
from datetime import datetime
import numpy as np
from tqdm import tqdm
import logging
import copy
import random
import pickle

sys.path.insert(0, str(Path(__file__).parent.parent))

from transformers import CLIPModel, CLIPProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ExperienceReplayBuffer:
    """
    Experience Replay Buffer for Catastrophic Forgetting Prevention.

    Stores samples from previous training tasks and replays them
    during incremental training to maintain knowledge of old tasks.

    This implements the Experience Replay (ER) strategy for continual learning.
    """

    def __init__(
        self,
        max_size: int = 1000,
        sampling_strategy: str = "reservoir"
    ):
        """
        Initialize the experience replay buffer.

        Args:
            max_size: Maximum number of samples to store
            sampling_strategy: Strategy for sampling ('reservoir', 'fifo', 'priority')
        """
        self.max_size = max_size
        self.sampling_strategy = sampling_strategy
        self._buffer: List[Dict[str, Any]] = []
        self._item_counts: Dict[str, int] = {}  # Track samples per style/category
        self._total_seen = 0

    def add_samples(
        self,
        items: List[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Add samples to the buffer using reservoir sampling.

        Args:
            items: List of training items to add
            metadata: Optional metadata about the source task

        Returns:
            Number of samples actually added to buffer
        """
        added = 0

        for item in items:
            self._total_seen += 1

            # Add metadata if provided
            if metadata:
                item = {**item, "_replay_metadata": metadata}

            if len(self._buffer) < self.max_size:
                # Buffer not full, add directly
                self._buffer.append(item)
                self._update_counts(item, 1)
                added += 1
            elif self.sampling_strategy == "reservoir":
                # Reservoir sampling: replace random item with probability max_size/total_seen
                j = random.randint(0, self._total_seen - 1)
                if j < self.max_size:
                    # Remove old item from counts
                    self._update_counts(self._buffer[j], -1)
                    self._buffer[j] = item
                    self._update_counts(item, 1)
                    added += 1
            elif self.sampling_strategy == "fifo":
                # First-in-first-out: remove oldest
                removed = self._buffer.pop(0)
                self._update_counts(removed, -1)
                self._buffer.append(item)
                self._update_counts(item, 1)
                added += 1

        logger.debug(f"Replay buffer: added {added} samples, total={len(self._buffer)}")
        return added

    def sample(self, n: int, balanced: bool = True) -> List[Dict[str, Any]]:
        """
        Sample n items from the buffer.

        Args:
            n: Number of samples to retrieve
            balanced: If True, try to balance across categories/styles

        Returns:
            List of sampled items
        """
        if len(self._buffer) == 0:
            return []

        n = min(n, len(self._buffer))

        if not balanced or not self._item_counts:
            # Simple random sampling
            return random.sample(self._buffer, n)

        # Balanced sampling across categories
        samples = []
        categories = list(self._item_counts.keys())

        # Calculate samples per category
        samples_per_cat = max(1, n // len(categories)) if categories else n

        category_items = {}
        for item in self._buffer:
            cat = item.get("category", "unknown")
            if cat not in category_items:
                category_items[cat] = []
            category_items[cat].append(item)

        for cat in categories:
            if cat in category_items and category_items[cat]:
                cat_samples = random.sample(
                    category_items[cat],
                    min(samples_per_cat, len(category_items[cat]))
                )
                samples.extend(cat_samples)

        # Fill remaining with random samples if needed
        if len(samples) < n:
            remaining = random.sample(
                self._buffer,
                min(n - len(samples), len(self._buffer))
            )
            samples.extend(remaining)

        return samples[:n]

    def _update_counts(self, item: Dict[str, Any], delta: int):
        """Update category/style counts"""
        cat = item.get("category", "unknown")
        self._item_counts[cat] = self._item_counts.get(cat, 0) + delta
        if self._item_counts[cat] <= 0:
            self._item_counts.pop(cat, None)

    def __len__(self) -> int:
        return len(self._buffer)

    def get_stats(self) -> Dict[str, Any]:
        """Get buffer statistics"""
        return {
            "total_samples": len(self._buffer),
            "max_size": self.max_size,
            "total_seen": self._total_seen,
            "sampling_strategy": self.sampling_strategy,
            "category_distribution": dict(self._item_counts)
        }

    def save(self, path: str):
        """Save buffer to disk"""
        data = {
            "buffer": self._buffer,
            "item_counts": self._item_counts,
            "total_seen": self._total_seen,
            "max_size": self.max_size,
            "sampling_strategy": self.sampling_strategy
        }
        with open(path, 'wb') as f:
            pickle.dump(data, f)
        logger.info(f"Replay buffer saved to {path}")

    def load(self, path: str):
        """Load buffer from disk"""
        if not Path(path).exists():
            logger.warning(f"Replay buffer file not found: {path}")
            return

        with open(path, 'rb') as f:
            import collections

            class _ReplayBufferUnpickler(pickle.Unpickler):
                """Restrict unpickling to safe types only."""
                _ALLOWED = {
                    "dict", "list", "tuple", "str", "int", "float",
                    "bool", "NoneType", "bytes", "set", "frozenset",
                }

                def find_class(self, module, name):
                    if name in self._ALLOWED or f"{module}.{name}" in self._ALLOWED:
                        return super().find_class(module, name)
                    raise pickle.UnpicklingError(
                        f"Global '{module}.{name}' is not allowed"
                    )

            data = _ReplayBufferUnpickler(f).load()

        self._buffer = data.get("buffer", [])
        self._item_counts = data.get("item_counts", {})
        self._total_seen = data.get("total_seen", 0)
        self.max_size = data.get("max_size", self.max_size)
        self.sampling_strategy = data.get("sampling_strategy", self.sampling_strategy)
        logger.info(f"Replay buffer loaded from {path}: {len(self._buffer)} samples")


@dataclass
class IncrementalTrainingConfig:
    base_model_path: str = "./models/clip_fashion"
    output_model_path: str = "./models/fashion_clip_incremental"

    learning_rate: float = 1e-6
    batch_size: int = 16
    num_epochs: int = 3
    warmup_ratio: float = 0.1
    max_grad_norm: float = 1.0

    freeze_vision_encoder: bool = True
    freeze_text_encoder: bool = True
    train_projection: bool = True
    train_style_head: bool = True

    style_loss_weight: float = 1.0
    category_loss_weight: float = 0.5
    contrastive_loss_weight: float = 0.5

    early_stopping_patience: int = 3
    min_delta: float = 0.001

    save_every_epoch: bool = True
    eval_every_n_batches: int = 50

    # Experience Replay Buffer settings (for catastrophic forgetting prevention)
    use_replay_buffer: bool = True
    replay_buffer_size: int = 1000
    replay_ratio: float = 0.3  # Ratio of replay samples in each batch
    replay_sampling_strategy: str = "reservoir"  # 'reservoir', 'fifo', 'priority'
    replay_buffer_path: Optional[str] = "./models/replay_buffer.pkl"


class IncrementalFashionDataset(Dataset):
    def __init__(
        self,
        items: List[Dict],
        processor: CLIPProcessor,
        style_labels: Dict[str, int],
        category_labels: Dict[str, int]
    ):
        self.items = items
        self.processor = processor
        self.style_labels = style_labels
        self.category_labels = category_labels
        
        self.style_prompts = self._build_style_prompts()

    def _build_style_prompts(self) -> Dict[str, str]:
        return {
            "casual": "a photo of casual comfortable clothing",
            "formal": "a photo of formal business attire",
            "sporty": "a photo of sporty athletic wear",
            "streetwear": "a photo of trendy streetwear urban fashion",
            "minimalist": "a photo of minimalist simple clean clothing",
            "bohemian": "a photo of bohemian boho style clothing",
            "vintage": "a photo of vintage retro classic fashion",
            "romantic": "a photo of romantic feminine soft style",
            "edgy": "a photo of edgy punk rock alternative fashion",
            "elegant": "a photo of elegant chic sophisticated clothing",
            "korean": "a photo of korean k-pop k-fashion style",
            "japanese": "a photo of japanese harajuku tokyo style",
            "french": "a photo of french parisian chic style",
            "preppy": "a photo of preppy collegiate ivy league style",
        }

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        item = self.items[idx]
        
        image_path = item.get("local_image_path") or item.get("image_path", "")
        
        from PIL import Image
        if image_path and Path(image_path).exists():
            try:
                image = Image.open(image_path).convert("RGB")
            except Exception:
                image = Image.new('RGB', (224, 224), color='white')
        else:
            image = Image.new('RGB', (224, 224), color='white')
        
        style_tags = item.get("style_tags", [])
        style_tag = style_tags[0] if style_tags else "casual"
        
        description_parts = []
        if item.get("color_tags"):
            description_parts.append(item["color_tags"][0])
        if style_tag:
            description_parts.append(self.style_prompts.get(style_tag, style_tag))
        if item.get("title"):
            description_parts.append(item["title"])
        
        description = ", ".join(description_parts) if description_parts else "a photo of clothing"
        
        style_label = self.style_labels.get(style_tag, 0)
        category_label = self.category_labels.get(item.get("category", "tops"), 0)
        
        return {
            "image": image,
            "text": description,
            "style_label": style_label,
            "category_label": category_label,
            "item_id": item.get("item_id", str(idx))
        }


def incremental_collate_fn(batch: List[Dict], processor: CLIPProcessor) -> Dict:
    images = [item["image"] for item in batch]
    texts = [item["text"] for item in batch]
    
    inputs = processor(
        images=images,
        text=texts,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=77
    )
    
    return {
        "pixel_values": inputs["pixel_values"],
        "input_ids": inputs["input_ids"],
        "attention_mask": inputs["attention_mask"],
        "style_labels": torch.tensor([item["style_label"] for item in batch]),
        "category_labels": torch.tensor([item["category_label"] for item in batch]),
        "item_ids": [item["item_id"] for item in batch]
    }


class IncrementalTrainer:
    def __init__(self, config: IncrementalTrainingConfig):
        self.config = config
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.model = None
        self.processor = None
        self.style_classifier = None
        self.category_classifier = None

        # Experience Replay Buffer for catastrophic forgetting prevention
        self.replay_buffer = None
        if config.use_replay_buffer:
            self.replay_buffer = ExperienceReplayBuffer(
                max_size=config.replay_buffer_size,
                sampling_strategy=config.replay_sampling_strategy
            )
            # Load existing buffer if available
            if config.replay_buffer_path:
                self.replay_buffer.load(config.replay_buffer_path)
            logger.info(f"Replay buffer initialized: {self.replay_buffer.get_stats()}")

        self.training_history = {
            "epochs": [],
            "train_loss": [],
            "val_loss": [],
            "style_accuracy": [],
            "category_accuracy": []
        }

        self.best_model_state = None
        self.best_loss = float('inf')
        self.patience_counter = 0

    def load_base_model(self):
        logger.info(f"加载基础模型: {self.config.base_model_path}")
        
        model_path = Path(self.config.base_model_path)
        if model_path.exists():
            self.model = CLIPModel.from_pretrained(str(model_path))
            self.processor = CLIPProcessor.from_pretrained(str(model_path))
        else:
            self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        
        self.model.to(self.device)
        
        projection_dim = self.model.config.projection_dim
        
        self.style_classifier = nn.Sequential(
            nn.Linear(projection_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 15)
        ).to(self.device)
        
        self.category_classifier = nn.Sequential(
            nn.Linear(projection_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 6)
        ).to(self.device)
        
        if self.config.freeze_vision_encoder:
            for param in self.model.vision_model.parameters():
                param.requires_grad = False
        
        if self.config.freeze_text_encoder:
            for param in self.model.text_model.parameters():
                param.requires_grad = False
        
        if not self.config.train_projection:
            for param in self.model.visual_projection.parameters():
                param.requires_grad = False
            for param in self.model.text_projection.parameters():
                param.requires_grad = False
        
        logger.info("模型加载完成")

    def prepare_data(
        self,
        new_items: List[Dict],
        existing_items: Optional[List[Dict]] = None,
        val_ratio: float = 0.1
    ) -> Tuple[DataLoader, DataLoader]:
        style_labels = {
            "casual": 0, "formal": 1, "sporty": 2, "streetwear": 3,
            "minimalist": 4, "bohemian": 5, "vintage": 6, "romantic": 7,
            "edgy": 8, "elegant": 9, "korean": 10, "japanese": 11,
            "french": 12, "preppy": 13, "smart_casual": 14
        }

        category_labels = {
            "tops": 0, "bottoms": 1, "dresses": 2,
            "outerwear": 3, "footwear": 4, "accessories": 5
        }

        # Add new items to replay buffer before training (for future incremental training)
        if self.replay_buffer is not None:
            self.replay_buffer.add_samples(
                new_items,
                metadata={"timestamp": datetime.now().isoformat()}
            )
            logger.info(f"Added {len(new_items)} new items to replay buffer")

        # Combine new items with replay samples if enabled
        all_items = new_items.copy()

        if self.replay_buffer is not None and len(self.replay_buffer) > 0:
            # Sample from replay buffer
            replay_count = int(len(new_items) * self.config.replay_ratio)
            replay_samples = self.replay_buffer.sample(replay_count, balanced=True)
            all_items.extend(replay_samples)
            logger.info(f"Added {len(replay_samples)} replay samples from buffer "
                       f"(ratio={self.config.replay_ratio})")

        if existing_items:
            all_items.extend(existing_items)

        np.random.shuffle(all_items)

        split_idx = int(len(all_items) * (1 - val_ratio))
        train_items = all_items[:split_idx]
        val_items = all_items[split_idx:]

        train_dataset = IncrementalFashionDataset(
            train_items, self.processor, style_labels, category_labels
        )
        val_dataset = IncrementalFashionDataset(
            val_items, self.processor, style_labels, category_labels
        )

        train_loader = DataLoader(
            train_dataset,
            batch_size=self.config.batch_size,
            shuffle=True,
            collate_fn=lambda b: incremental_collate_fn(b, self.processor),
            num_workers=0
        )

        val_loader = DataLoader(
            val_dataset,
            batch_size=self.config.batch_size,
            shuffle=False,
            collate_fn=lambda b: incremental_collate_fn(b, self.processor),
            num_workers=0
        )

        logger.info(f"训练集: {len(train_dataset)}, 验证集: {len(val_dataset)}")
        if self.replay_buffer:
            logger.info(f"Replay buffer stats: {self.replay_buffer.get_stats()}")

        return train_loader, val_loader

    def train(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader
    ) -> Dict[str, float]:
        optimizer = AdamW(
            list(self.model.parameters()) +
            list(self.style_classifier.parameters()) +
            list(self.category_classifier.parameters()),
            lr=self.config.learning_rate
        )
        
        total_steps = len(train_loader) * self.config.num_epochs
        warmup_steps = int(total_steps * self.config.warmup_ratio)
        
        scheduler = CosineAnnealingLR(optimizer, T_max=total_steps)
        
        logger.info("开始增量训练...")
        
        for epoch in range(self.config.num_epochs):
            self.model.train()
            self.style_classifier.train()
            self.category_classifier.train()
            
            epoch_loss = 0.0
            style_correct = 0
            category_correct = 0
            total_samples = 0
            
            progress_bar = tqdm(
                train_loader,
                desc=f"Epoch {epoch + 1}/{self.config.num_epochs}"
            )
            
            for batch_idx, batch in enumerate(progress_bar):
                batch = {k: v.to(self.device) if isinstance(v, torch.Tensor) else v
                        for k, v in batch.items()}
                
                outputs = self.model(
                    pixel_values=batch["pixel_values"],
                    input_ids=batch["input_ids"],
                    attention_mask=batch["attention_mask"],
                    return_dict=True
                )
                
                image_embeds = outputs.image_embeds
                
                style_logits = self.style_classifier(image_embeds)
                category_logits = self.category_classifier(image_embeds)
                
                style_loss = F.cross_entropy(style_logits, batch["style_labels"])
                category_loss = F.cross_entropy(category_logits, batch["category_labels"])
                
                labels = torch.arange(batch["pixel_values"].size(0), device=self.device)
                contrastive_loss = (
                    F.cross_entropy(outputs.logits_per_image / 0.07, labels) +
                    F.cross_entropy(outputs.logits_per_text / 0.07, labels)
                ) / 2
                
                total_loss = (
                    self.config.style_loss_weight * style_loss +
                    self.config.category_loss_weight * category_loss +
                    self.config.contrastive_loss_weight * contrastive_loss
                )
                
                optimizer.zero_grad()
                total_loss.backward()
                
                torch.nn.utils.clip_grad_norm_(
                    list(self.model.parameters()) +
                    list(self.style_classifier.parameters()) +
                    list(self.category_classifier.parameters()),
                    self.config.max_grad_norm
                )
                
                optimizer.step()
                scheduler.step()
                
                epoch_loss += total_loss.item()
                
                with torch.no_grad():
                    style_pred = style_logits.argmax(dim=-1)
                    category_pred = category_logits.argmax(dim=-1)
                    style_correct += (style_pred == batch["style_labels"]).sum().item()
                    category_correct += (category_pred == batch["category_labels"]).sum().item()
                    total_samples += batch["style_labels"].size(0)
                
                progress_bar.set_postfix({
                    "loss": f"{total_loss.item():.4f}",
                    "style_acc": f"{style_correct / total_samples:.4f}"
                })
            
            avg_loss = epoch_loss / len(train_loader)
            style_acc = style_correct / total_samples
            category_acc = category_correct / total_samples
            
            val_loss, val_style_acc, val_category_acc = self.evaluate(val_loader)
            
            self.training_history["epochs"].append(epoch + 1)
            self.training_history["train_loss"].append(avg_loss)
            self.training_history["val_loss"].append(val_loss)
            self.training_history["style_accuracy"].append(val_style_acc)
            self.training_history["category_accuracy"].append(val_category_acc)
            
            logger.info(
                f"Epoch {epoch + 1}: "
                f"train_loss={avg_loss:.4f}, "
                f"val_loss={val_loss:.4f}, "
                f"style_acc={val_style_acc:.4f}, "
                f"category_acc={val_category_acc:.4f}"
            )
            
            if val_loss < self.best_loss - self.config.min_delta:
                self.best_loss = val_loss
                self.best_model_state = {
                    "model": copy.deepcopy(self.model.state_dict()),
                    "style_classifier": copy.deepcopy(self.style_classifier.state_dict()),
                    "category_classifier": copy.deepcopy(self.category_classifier.state_dict())
                }
                self.patience_counter = 0
            else:
                self.patience_counter += 1
                
            if self.patience_counter >= self.config.early_stopping_patience:
                logger.info(f"早停: {self.config.early_stopping_patience} 轮无改善")
                break
            
            if self.config.save_every_epoch:
                self.save_model(f"epoch_{epoch + 1}")
        
        if self.best_model_state:
            self.model.load_state_dict(self.best_model_state["model"])
            self.style_classifier.load_state_dict(self.best_model_state["style_classifier"])
            self.category_classifier.load_state_dict(self.best_model_state["category_classifier"])
        
        self.save_model("best")
        
        return {
            "final_train_loss": avg_loss,
            "final_val_loss": val_loss,
            "style_accuracy": val_style_acc,
            "category_accuracy": val_category_acc
        }

    def evaluate(self, val_loader: DataLoader) -> Tuple[float, float, float]:
        self.model.eval()
        self.style_classifier.eval()
        self.category_classifier.eval()
        
        total_loss = 0.0
        style_correct = 0
        category_correct = 0
        total_samples = 0
        
        with torch.no_grad():
            for batch in val_loader:
                batch = {k: v.to(self.device) if isinstance(v, torch.Tensor) else v
                        for k, v in batch.items()}
                
                outputs = self.model(
                    pixel_values=batch["pixel_values"],
                    input_ids=batch["input_ids"],
                    attention_mask=batch["attention_mask"],
                    return_dict=True
                )
                
                image_embeds = outputs.image_embeds
                
                style_logits = self.style_classifier(image_embeds)
                category_logits = self.category_classifier(image_embeds)
                
                style_loss = F.cross_entropy(style_logits, batch["style_labels"])
                category_loss = F.cross_entropy(category_logits, batch["category_labels"])
                
                total_loss += (style_loss + category_loss).item()
                
                style_pred = style_logits.argmax(dim=-1)
                category_pred = category_logits.argmax(dim=-1)
                style_correct += (style_pred == batch["style_labels"]).sum().item()
                category_correct += (category_pred == batch["category_labels"]).sum().item()
                total_samples += batch["style_labels"].size(0)
        
        avg_loss = total_loss / len(val_loader)
        style_acc = style_correct / total_samples
        category_acc = category_correct / total_samples
        
        return avg_loss, style_acc, category_acc

    def save_model(self, name: str):
        output_path = Path(self.config.output_model_path) / name
        output_path.mkdir(parents=True, exist_ok=True)

        self.model.save_pretrained(str(output_path))
        self.processor.save_pretrained(str(output_path))

        torch.save({
            "style_classifier": self.style_classifier.state_dict(),
            "category_classifier": self.category_classifier.state_dict(),
            "training_history": self.training_history,
            "config": asdict(self.config)
        }, output_path / "additional_heads.pt")

        # Save replay buffer if enabled
        if self.replay_buffer is not None and self.config.replay_buffer_path:
            self.replay_buffer.save(self.config.replay_buffer_path)

        logger.info(f"模型保存到: {output_path}")

    def load_incremental_model(self, model_path: str):
        path = Path(model_path)
        
        self.model = CLIPModel.from_pretrained(str(path))
        self.processor = CLIPProcessor.from_pretrained(str(path))
        self.model.to(self.device)
        
        heads_path = path / "additional_heads.pt"
        if heads_path.exists():
            checkpoint = torch.load(heads_path, map_location=self.device, weights_only=True)
            
            projection_dim = self.model.config.projection_dim
            
            self.style_classifier = nn.Sequential(
                nn.Linear(projection_dim, 256),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(256, 15)
            ).to(self.device)
            
            self.category_classifier = nn.Sequential(
                nn.Linear(projection_dim, 256),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(256, 6)
            ).to(self.device)
            
            self.style_classifier.load_state_dict(checkpoint["style_classifier"])
            self.category_classifier.load_state_dict(checkpoint["category_classifier"])
        
        logger.info(f"加载增量模型: {model_path}")


async def main():
    config = IncrementalTrainingConfig()
    trainer = IncrementalTrainer(config)
    
    trainer.load_base_model()
    
    mock_items = [
        {
            "item_id": f"item_{i:04d}",
            "title": f"测试服装 {i}",
            "style_tags": ["casual", "korean"][i % 2],
            "category": ["tops", "bottoms", "footwear"][i % 3],
            "color_tags": ["black", "white"][i % 2],
            "image_path": ""
        }
        for i in range(100)
    ]
    
    train_loader, val_loader = trainer.prepare_data(mock_items)
    
    results = trainer.train(train_loader, val_loader)
    
    print(f"\n训练结果: {results}")


if __name__ == "__main__":
    asyncio.run(main())
