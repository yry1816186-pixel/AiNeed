"""
ChineseFashionCLIP Fine-tune Training Script

Fine-tunes FashionCLIP (ViT-B/32) on Chinese fashion data.
Improved training strategy over the baseline:
  - Unfreeze last N transformer layers (not just projections)
  - Cosine LR schedule with warmup
  - Gradient clipping
  - Train/val split with early stopping
  - Model checkpointing + best model selection
  - Full training log with loss curves

Usage:
  python ml/scripts/finetune_fashionclip.py --data-dir ml/data/chinese_fashion --epochs 10
  python ml/scripts/finetune_fashionclip.py --data-dir ml/data/chinese_fashion --unfreeze-layers 4 --lr 2e-5
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("finetune_fashionclip.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

ML_MODELS_ROOT = Path(__file__).parent.parent / "models"


class ChineseFashionDataset:
    """Dataset for Chinese fashion image-text pairs."""

    def __init__(self, data_dir: str, split: str = "train", max_items: Optional[int] = None):
        self.data_dir = Path(data_dir)
        self.split = split
        self.data = []

        annotations_path = self.data_dir / "annotations.json"
        if not annotations_path.exists():
            raise FileNotFoundError(f"Annotations not found: {annotations_path}. Run prepare_finetune_data.py first.")

        with open(annotations_path, encoding="utf-8") as f:
            all_items = json.load(f)

        split_items = [item for item in all_items if item.get("split") == split]

        if max_items:
            split_items = split_items[:max_items]

        images_dir = self.data_dir / "images"

        for item in split_items:
            img_filename = item.get("image_id", "")
            img_path = images_dir / img_filename
            if not img_path.exists():
                alt_path = item.get("image_path", "")
                if alt_path and Path(alt_path).exists():
                    img_path = Path(alt_path)
                else:
                    continue

            self.data.append({
                "image_path": str(img_path),
                "text": item["chinese_description"],
                "occasion": item.get("occasion", ""),
                "gender": item.get("gender", ""),
                "category": item.get("category", ""),
                "style": item.get("style", ""),
            })

        logger.info(f"Loaded {len(self.data)} items for split '{split}'")

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        return self.data[idx]


def collate_fn(batch: List[Dict], processor, device: str) -> Dict:
    """Collate batch into model inputs."""
    from PIL import Image

    images = []
    texts = []
    for item in batch:
        try:
            img = Image.open(item["image_path"]).convert("RGB")
            images.append(img)
        except Exception as e:
            logger.warning(f"Failed to load image {item['image_path']}: {e}")
            images.append(Image.new("RGB", (224, 224), (128, 128, 128)))
        texts.append(item["text"])

    inputs = processor(
        text=texts,
        images=images,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=77,
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}
    return inputs


def configure_model_unfreeze(model, unfreeze_layers: int = 4) -> None:
    """Unfreeze the last N transformer layers + projections for fine-tuning."""
    for param in model.parameters():
        param.requires_grad = False

    for param in model.text_projection.parameters():
        param.requires_grad = True
    for param in model.visual_projection.parameters():
        param.requires_grad = True

    if unfreeze_layers > 0:
        text_layers = model.text_model.encoder.layers
        for layer in text_layers[-unfreeze_layers:]:
            for param in layer.parameters():
                param.requires_grad = True

        vision_layers = model.vision_model.encoder.layers
        for layer in vision_layers[-unfreeze_layers:]:
            for param in layer.parameters():
                param.requires_grad = True

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    logger.info(f"Trainable parameters: {trainable:,} / {total:,} ({100*trainable/total:.2f}%)")


def get_lr_scheduler(optimizer, warmup_steps: int, total_steps: int):
    """Cosine LR schedule with linear warmup."""
    def lr_lambda(current_step):
        if current_step < warmup_steps:
            return float(current_step) / float(max(1, warmup_steps))
        progress = float(current_step - warmup_steps) / float(max(1, total_steps - warmup_steps))
        return max(0.0, 0.5 * (1.0 + np.cos(np.pi * progress)))

    from torch.optim.lr_scheduler import LambdaLR
    return LambdaLR(optimizer, lr_lambda)


def compute_clip_loss(logits_per_image, logits_per_text, device: str):
    """Compute symmetric CLIP contrastive loss."""
    import torch

    batch_size = logits_per_image.shape[0]
    labels = torch.arange(batch_size, device=device)

    loss_i2t = torch.nn.functional.cross_entropy(logits_per_image, labels)
    loss_t2i = torch.nn.functional.cross_entropy(logits_per_text, labels)

    return (loss_i2t + loss_t2i) / 2


def train_one_epoch(model, dataloader, optimizer, scheduler, device: str,
                    grad_clip: float = 1.0) -> float:
    """Train for one epoch, return average loss."""
    import torch

    model.train()
    total_loss = 0.0
    num_batches = 0

    for batch_idx, batch in enumerate(dataloader):
        inputs = collate_fn(batch, dataloader.dataset.processor, device)
        if inputs is None:
            continue

        outputs = model(**inputs)
        loss = compute_clip_loss(
            outputs.logits_per_image,
            outputs.logits_per_text,
            device,
        )

        optimizer.zero_grad()
        loss.backward()

        if grad_clip > 0:
            torch.nn.utils.clip_grad_norm_(
                [p for p in model.parameters() if p.requires_grad],
                grad_clip,
            )

        optimizer.step()
        scheduler.step()

        total_loss += loss.item()
        num_batches += 1

        if (batch_idx + 1) % 50 == 0:
            current_lr = scheduler.get_last_lr()[0]
            logger.info(f"  Batch {batch_idx+1}/{len(dataloader)}, Loss: {loss.item():.4f}, LR: {current_lr:.2e}")

    return total_loss / max(num_batches, 1)


def validate(model, dataloader, device: str) -> float:
    """Validate, return average loss."""
    import torch

    model.eval()
    total_loss = 0.0
    num_batches = 0

    with torch.no_grad():
        for batch in dataloader:
            inputs = collate_fn(batch, dataloader.dataset.processor, device)
            if inputs is None:
                continue

            outputs = model(**inputs)
            loss = compute_clip_loss(
                outputs.logits_per_image,
                outputs.logits_per_text,
                device,
            )
            total_loss += loss.item()
            num_batches += 1

    return total_loss / max(num_batches, 1)


def save_training_log(log_data: List[Dict], output_dir: Path) -> None:
    """Save training log as JSON."""
    log_path = output_dir / "training_log.json"
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(log_data, f, ensure_ascii=False, indent=2)
    logger.info(f"Training log saved to {log_path}")


def finetune(args):
    """Main fine-tune function."""
    import torch
    from torch.utils.data import DataLoader
    from transformers import CLIPModel, CLIPProcessor

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")
    if device == "cuda":
        logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
        logger.info(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

    logger.info("Loading FashionCLIP base model...")
    model = CLIPModel.from_pretrained(args.base_model, local_files_only=True)
    processor = CLIPProcessor.from_pretrained(args.base_model, local_files_only=True)

    configure_model_unfreeze(model, unfreeze_layers=args.unfreeze_layers)

    logger.info("Loading datasets...")
    train_dataset = ChineseFashionDataset(args.data_dir, split="train")
    val_dataset = ChineseFashionDataset(args.data_dir, split="val")

    train_dataset.processor = processor
    val_dataset.processor = processor

    # Use identity collate to keep list[dict] format (default collate converts to dict of lists)
    identity_collate = lambda x: x

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        drop_last=True,
        collate_fn=identity_collate,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        collate_fn=identity_collate,
    )

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr,
        weight_decay=args.weight_decay,
    )

    total_steps = len(train_loader) * args.epochs
    warmup_steps = int(total_steps * args.warmup_ratio)
    scheduler = get_lr_scheduler(optimizer, warmup_steps, total_steps)

    logger.info(f"Training config: epochs={args.epochs}, batch_size={args.batch_size}, "
                f"lr={args.lr}, warmup_steps={warmup_steps}, total_steps={total_steps}")

    model.to(device)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    training_log = []
    best_val_loss = float("inf")
    patience_counter = 0

    logger.info("Starting training...")
    start_time = time.time()

    for epoch in range(args.epochs):
        epoch_start = time.time()

        train_loss = train_one_epoch(
            model, train_loader, optimizer, scheduler, device,
            grad_clip=args.grad_clip,
        )

        val_loss = validate(model, val_loader, device)

        epoch_time = time.time() - epoch_start
        current_lr = scheduler.get_last_lr()[0]

        log_entry = {
            "epoch": epoch + 1,
            "train_loss": round(train_loss, 4),
            "val_loss": round(val_loss, 4),
            "lr": current_lr,
            "epoch_time_s": round(epoch_time, 1),
        }
        training_log.append(log_entry)

        logger.info(
            f"Epoch {epoch+1}/{args.epochs} | "
            f"Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | "
            f"LR: {current_lr:.2e} | Time: {epoch_time:.1f}s"
        )

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0

            best_model_path = output_dir / "best_model"
            model.save_pretrained(best_model_path)
            processor.save_pretrained(best_model_path)
            logger.info(f"  New best model saved (val_loss={val_loss:.4f})")
        else:
            patience_counter += 1
            logger.info(f"  No improvement (patience={patience_counter}/{args.patience})")

        if (epoch + 1) % args.save_every == 0:
            ckpt_path = output_dir / f"checkpoint_epoch_{epoch+1}"
            model.save_pretrained(ckpt_path)
            processor.save_pretrained(ckpt_path)
            logger.info(f"  Checkpoint saved: {ckpt_path}")

        if patience_counter >= args.patience:
            logger.info(f"Early stopping at epoch {epoch+1} (no improvement for {args.patience} epochs)")
            break

    total_time = time.time() - start_time
    logger.info(f"Training complete! Total time: {total_time/60:.1f} minutes")

    final_model_path = output_dir / "final_model"
    model.save_pretrained(final_model_path)
    processor.save_pretrained(final_model_path)
    logger.info(f"Final model saved to {final_model_path}")

    save_training_log(training_log, output_dir)

    config_path = output_dir / "finetune_config.json"
    config_data = {
        "base_model": args.base_model,
        "unfreeze_layers": args.unfreeze_layers,
        "epochs_completed": len(training_log),
        "best_val_loss": best_val_loss,
        "batch_size": args.batch_size,
        "learning_rate": args.lr,
        "weight_decay": args.weight_decay,
        "warmup_ratio": args.warmup_ratio,
        "grad_clip": args.grad_clip,
        "device": device,
        "total_training_time_s": round(total_time, 1),
        "train_samples": len(train_dataset),
        "val_samples": len(val_dataset),
    }
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, ensure_ascii=False, indent=2)

    logger.info(f"Best val loss: {best_val_loss:.4f}")
    logger.info(f"Models saved in: {output_dir}")
    logger.info("To use the fine-tuned model, update embeddings.py model_name to the best_model path")


def main():
    parser = argparse.ArgumentParser(description="Fine-tune FashionCLIP on Chinese fashion data")
    parser.add_argument("--base-model", type=str, default="patrickjohncyh/fashion-clip",
                        help="Base FashionCLIP model to fine-tune from")
    parser.add_argument("--data-dir", type=str, default="ml/data/chinese_fashion",
                        help="Directory with prepared training data")
    parser.add_argument("--output-dir", type=str, default="ml/models/chinese-fashion-clip",
                        help="Output directory for fine-tuned model")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Training batch size")
    parser.add_argument("--lr", type=float, default=2e-5, help="Peak learning rate")
    parser.add_argument("--weight-decay", type=float, default=0.01, help="Weight decay")
    parser.add_argument("--warmup-ratio", type=float, default=0.1, help="Warmup ratio of total steps")
    parser.add_argument("--grad-clip", type=float, default=1.0, help="Gradient clipping max norm (0 to disable)")
    parser.add_argument("--unfreeze-layers", type=int, default=4,
                        help="Number of transformer layers to unfreeze from the end")
    parser.add_argument("--patience", type=int, default=3, help="Early stopping patience")
    parser.add_argument("--save-every", type=int, default=5, help="Save checkpoint every N epochs")
    parser.add_argument("--num-workers", type=int, default=0, help="DataLoader num_workers")
    args = parser.parse_args()

    finetune(args)


if __name__ == "__main__":
    main()
