"""
SASRec Training Script
Trains SASRec model on interactions.json and saves to models/sasrec/
"""

import os
import sys
import json
import torch
import torch.nn as nn
import numpy as np
from collections import defaultdict
from pathlib import Path
from datetime import datetime

# Add parent to path so we can import from inference
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "inference"))

from sasrec_server import SASRecConfig, SASRecModel


def load_interactions(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_user_sequences(interactions: list, item2idx: dict):
    user_seqs = defaultdict(list)
    for inter in interactions:
        uid = inter["user_id"]
        iid = inter["item_id"]
        if iid in item2idx:
            user_seqs[uid].append({
                "item_idx": item2idx[iid],
                "timestamp": inter.get("timestamp", 0),
                "type": inter.get("type", "view"),
            })
    for uid in user_seqs:
        user_seqs[uid].sort(key=lambda x: x["timestamp"])
    return user_seqs


def create_training_pairs(user_seqs: dict, max_seq_len: int = 50):
    sequences = []
    targets = []
    for uid, items in user_seqs.items():
        item_ids = [it["item_idx"] for it in items]
        if len(item_ids) < 2:
            continue
        for i in range(1, len(item_ids)):
            seq = item_ids[:i]
            target = item_ids[i]
            if len(seq) > max_seq_len:
                seq = seq[-max_seq_len:]
            sequences.append(seq)
            targets.append(target)
    return sequences, targets


def pad_sequence(seq: list, max_len: int, pad_val: int = 0):
    if len(seq) >= max_len:
        return seq[-max_len:]
    return [pad_val] * (max_len - len(seq)) + seq


def train_epoch(model, optimizer, sequences, targets, config, device, batch_size=64):
    model.train()
    total_loss = 0.0
    n_batches = 0

    indices = np.random.permutation(len(sequences))

    for start in range(0, len(indices), batch_size):
        batch_idx = indices[start : start + batch_size]
        batch_seqs = [sequences[i] for i in batch_idx]
        batch_targets = [targets[i] for i in batch_idx]

        padded = [pad_sequence(s, config.max_seq_len) for s in batch_seqs]
        seq_tensor = torch.tensor(padded, dtype=torch.long, device=device)
        target_tensor = torch.tensor(batch_targets, dtype=torch.long, device=device)

        optimizer.zero_grad()

        seq_output = model(seq_tensor)
        seq_output = seq_output[:, -1, :]

        all_item_emb = model.item_embedding.weight
        logits = torch.matmul(seq_output, all_item_emb.t())

        loss = nn.functional.cross_entropy(logits, target_tensor)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()

        total_loss += loss.item()
        n_batches += 1

    return total_loss / max(n_batches, 1)


def evaluate(model, sequences, targets, config, device, batch_size=128):
    model.eval()
    hits = 0
    total = 0

    with torch.no_grad():
        for start in range(0, len(sequences), batch_size):
            batch_seqs = sequences[start : start + batch_size]
            batch_targets = targets[start : start + batch_size]

            padded = [pad_sequence(s, config.max_seq_len) for s in batch_seqs]
            seq_tensor = torch.tensor(padded, dtype=torch.long, device=device)
            target_tensor = torch.tensor(batch_targets, dtype=torch.long, device=device)

            seq_output = model(seq_tensor)
            seq_output = seq_output[:, -1, :]

            all_item_emb = model.item_embedding.weight
            logits = torch.matmul(seq_output, all_item_emb.t())

            top10 = logits.topk(10, dim=-1).indices
            for i in range(len(batch_targets)):
                if target_tensor[i].item() in top10[i].tolist():
                    hits += 1
                total += 1

    return hits / max(total, 1)


def main():
    print("=" * 50)
    print("  SASRec Training")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    project_root = Path(__file__).parent.parent.parent  # ml/scripts/.. -> project root
    data_path = project_root / "data" / "processed" / "interactions.json"
    output_dir = Path(__file__).parent.parent / "models" / "sasrec"  # ml/models/sasrec
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nLoading data from {data_path}...")
    interactions = load_interactions(str(data_path))
    print(f"  {len(interactions)} interactions loaded")

    all_items = sorted(set(inter["item_id"] for inter in interactions))
    item2idx = {iid: idx + 1 for idx, iid in enumerate(all_items)}
    idx2item = {v: k for k, v in item2idx.items()}
    print(f"  {len(item2idx)} unique items")

    print("\nBuilding user sequences...")
    user_seqs = build_user_sequences(interactions, item2idx)
    print(f"  {len(user_seqs)} users with sequences")

    sequences, targets = create_training_pairs(user_seqs, max_seq_len=50)
    print(f"  {len(sequences)} training pairs")

    split = int(len(sequences) * 0.9)
    train_seqs, train_tgts = sequences[:split], targets[:split]
    val_seqs, val_tgts = sequences[split:], targets[split:]
    print(f"  Train: {len(train_seqs)}, Val: {len(val_seqs)}")

    num_items = len(item2idx) + 1
    config = SASRecConfig(
        item_num=num_items,
        max_seq_len=50,
        hidden_size=128,
        num_heads=2,
        num_blocks=2,
        dropout=0.2,
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\nDevice: {device}")
    print(f"Items: {num_items}, Hidden: {config.hidden_size}, Heads: {config.num_heads}")

    model = SASRecModel(config).to(device)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"Parameters: {total_params:,}")

    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)

    num_epochs = 15
    batch_size = 64
    best_hit10 = 0.0

    print(f"\nTraining {num_epochs} epochs, batch_size={batch_size}...")
    for epoch in range(num_epochs):
        t0 = datetime.now()
        train_loss = train_epoch(
            model, optimizer, train_seqs, train_tgts, config, device, batch_size
        )
        scheduler.step()

        hit10 = evaluate(model, val_seqs, val_tgts, config, device)
        elapsed = (datetime.now() - t0).total_seconds()

        print(
            f"  Epoch {epoch+1:2d}/{num_epochs} | "
            f"Loss: {train_loss:.4f} | "
            f"Hit@10: {hit10:.4f} | "
            f"LR: {scheduler.get_last_lr()[0]:.6f} | "
            f"{elapsed:.1f}s"
        )

        if hit10 > best_hit10:
            best_hit10 = hit10
            torch.save(model.state_dict(), output_dir / "model.pt")
            print(f"    -> Best model saved (Hit@10={hit10:.4f})")

    config_data = {
        "item_num": num_items,
        "max_seq_len": config.max_seq_len,
        "hidden_size": config.hidden_size,
        "num_heads": config.num_heads,
        "num_blocks": config.num_blocks,
        "dropout": config.dropout,
    }
    with open(output_dir / "config.json", "w") as f:
        json.dump(config_data, f, indent=2)

    metadata = {str(idx): {"original_id": idx2item[idx]} for idx in idx2item}
    with open(output_dir / "item_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nTraining complete!")
    print(f"  Best Hit@10: {best_hit10:.4f}")
    print(f"  Model saved: {output_dir / 'model.pt'}")
    print(f"  Config saved: {output_dir / 'config.json'}")


if __name__ == "__main__":
    main()
