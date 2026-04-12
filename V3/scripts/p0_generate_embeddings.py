#!/usr/bin/env python3
"""AiNeed V3 - Phase 0: Embedding Generation Script

Generates text embeddings using BGE-M3 model for fashion rules and item descriptions.
Outputs in a format compatible with Qdrant vector database import.

Features:
  - Uses sentence-transformers to load BGE-M3 model
  - Batch processing with configurable batch size
  - GPU acceleration when CUDA is available
  - Progress bar via tqdm
  - Qdrant-compatible output format (JSON with id + vector + payload)
  - Resumable: skips already-processed IDs
"""

import argparse
import json
import logging
import sys
import time
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
KG_DIR = PROJECT_ROOT / "data" / "knowledge-graph"

DEFAULT_MODEL = "BAAI/bge-m3"
DEFAULT_BATCH_SIZE = 64
DEFAULT_DIMENSION = 1024

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def check_cuda() -> bool:
    try:
        import torch
        available = torch.cuda.is_available()
        if available:
            device_name = torch.cuda.get_device_name(0)
            logger.info("CUDA available: %s", device_name)
        else:
            logger.info("CUDA not available, using CPU")
        return available
    except ImportError:
        logger.warning("PyTorch not installed, cannot check CUDA")
        return False


def load_model(model_name: str, device: str):
    logger.info("Loading model: %s (device=%s)", model_name, device)
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(model_name, device=device)
        logger.info("Model loaded successfully. Max seq length: %d", model.max_seq_length)
        return model
    except ImportError:
        logger.error(
            "sentence-transformers not installed. "
            "Install with: pip install sentence-transformers"
        )
        sys.exit(1)
    except Exception as e:
        logger.error("Failed to load model %s: %s", model_name, e)
        sys.exit(1)


def load_fashion_rules(path: Path) -> list[dict]:
    if not path.exists():
        logger.warning("File not found: %s", path)
        return []

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        logger.error("Expected JSON array in %s", path)
        return []

    logger.info("Loaded %d rules from %s", len(data), path.name)
    return data


def load_annotated_items(path: Path) -> list[dict]:
    if not path.exists():
        logger.warning("File not found: %s", path)
        return []

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        logger.info("Loaded %d items from %s", len(data), path.name)
        return data
    if isinstance(data, dict):
        items = data.get("items", [])
        logger.info("Loaded %d items from %s", len(items), path.name)
        return items

    logger.error("Unexpected data format in %s", path)
    return []


def build_text_from_rule(rule: dict) -> str:
    parts = []
    cat = rule.get("category", "")
    condition = rule.get("condition", {})
    recommendation = rule.get("recommendation", "")
    source = rule.get("source", "")

    cat_chinese = {
        "color_harmony": "色彩搭配",
        "body_type": "体型搭配",
        "occasion": "场合搭配",
        "style_mix": "风格混搭",
        "seasonal": "季节搭配",
    }

    parts.append(f"分类: {cat_chinese.get(cat, cat)}")

    if isinstance(condition, dict):
        cond_parts = []
        for k, v in condition.items():
            cond_parts.append(f"{k}={v}")
        if cond_parts:
            parts.append("条件: " + ", ".join(cond_parts))

    parts.append(f"建议: {recommendation}")
    if source:
        parts.append(f"来源: {source}")

    return " | ".join(parts)


def build_text_from_item(item: dict) -> str:
    parts = []
    name = item.get("name", "") or item.get("title", "")
    desc = item.get("description", "") or ""
    category = item.get("category", "") or ""
    brand = item.get("brand", "") or ""
    tags = item.get("tags", []) or item.get("style_tags", [])

    if name:
        parts.append(name)
    if category:
        parts.append(f"分类: {category}")
    if brand:
        parts.append(f"品牌: {brand}")
    if desc:
        parts.append(desc)
    if tags:
        parts.append("标签: " + ", ".join(tags) if isinstance(tags, list) else str(tags))

    return " | ".join(parts)


def load_progress(output_path: Path) -> set[str]:
    if not output_path.exists():
        return set()

    processed_ids = set()
    try:
        with open(output_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    if "id" in record:
                        processed_ids.add(str(record["id"]))
                except json.JSONDecodeError:
                    continue
    except OSError:
        return set()

    logger.info("Found %d already-processed IDs in %s", len(processed_ids), output_path.name)
    return processed_ids


def generate_embeddings(
    model,
    texts: list[str],
    ids: list[str],
    payloads: list[dict],
    batch_size: int,
    output_path: Path,
    processed_ids: set[str],
) -> int:
    try:
        from tqdm import tqdm
    except ImportError:
        def tqdm(iterable, **kwargs):
            return iterable

    pending_indices = []
    for i, rid in enumerate(ids):
        if str(rid) not in processed_ids:
            pending_indices.append(i)

    if not pending_indices:
        logger.info("All items already processed. Nothing to do.")
        return 0

    logger.info("Processing %d items (%d already done)", len(pending_indices), len(processed_ids))

    total_written = 0
    start_time = time.time()

    with open(output_path, "a" if processed_ids else "w", encoding="utf-8") as f:
        for batch_start in tqdm(
            range(0, len(pending_indices), batch_size),
            desc="Generating embeddings",
            unit="batch",
        ):
            batch_indices = pending_indices[batch_start:batch_start + batch_size]
            batch_texts = [texts[i] for i in batch_indices]
            batch_ids = [ids[i] for i in batch_indices]
            batch_payloads = [payloads[i] for i in batch_indices]

            try:
                embeddings = model.encode(
                    batch_texts,
                    batch_size=len(batch_texts),
                    show_progress_bar=False,
                    normalize_embeddings=True,
                )
            except Exception as e:
                logger.error("Encoding failed for batch starting at %d: %s", batch_start, e)
                continue

            if hasattr(embeddings, "cpu"):
                embeddings = embeddings.cpu().numpy()
            if hasattr(embeddings, "tolist"):
                embeddings_list = embeddings.tolist()
            else:
                embeddings_list = [list(emb) for emb in embeddings]

            for j, (rid, emb, payload) in enumerate(zip(batch_ids, embeddings_list, batch_payloads)):
                record = {
                    "id": str(rid),
                    "vector": emb,
                    "payload": payload,
                }
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
                total_written += 1

            if total_written % (batch_size * 10) == 0:
                elapsed = time.time() - start_time
                rate = total_written / elapsed if elapsed > 0 else 0
                logger.info(
                    "Progress: %d/%d (%.1f items/s)",
                    total_written, len(pending_indices), rate,
                )

    elapsed = time.time() - start_time
    rate = total_written / elapsed if elapsed > 0 else 0
    logger.info(
        "Completed: %d embeddings generated in %.1fs (%.1f items/s)",
        total_written, elapsed, rate,
    )
    return total_written


def verify_output(output_path: Path, expected_dim: int) -> dict[str, Any]:
    if not output_path.exists():
        return {"valid": False, "error": "Output file not found"}

    total = 0
    dim_ok = 0
    dim_mismatch = 0
    parse_errors = 0

    with open(output_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
                total += 1
                vector = record.get("vector", [])
                if len(vector) == expected_dim:
                    dim_ok += 1
                else:
                    dim_mismatch += 1
            except json.JSONDecodeError:
                parse_errors += 1

    return {
        "valid": total > 0 and dim_mismatch == 0 and parse_errors == 0,
        "total_records": total,
        "dimension_ok": dim_ok,
        "dimension_mismatch": dim_mismatch,
        "parse_errors": parse_errors,
        "expected_dimension": expected_dim,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate text embeddings for fashion data")
    parser.add_argument(
        "--model", type=str, default=DEFAULT_MODEL,
        help=f"Model name or path (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--batch-size", type=int, default=DEFAULT_BATCH_SIZE,
        help=f"Batch size for encoding (default: {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument(
        "--dimension", type=int, default=DEFAULT_DIMENSION,
        help=f"Expected embedding dimension (default: {DEFAULT_DIMENSION})",
    )
    parser.add_argument(
        "--device", type=str, default="auto",
        help="Device: auto/cuda/cpu (default: auto)",
    )
    parser.add_argument(
        "--input", type=str, default=None,
        help="Input JSON file (default: auto-detect from data/processed and data/knowledge-graph)",
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Output JSONL file (default: data/processed/text_embeddings.jsonl)",
    )
    parser.add_argument(
        "--source", choices=["rules", "items", "all"], default="all",
        help="Data source to embed: rules, items, or all (default: all)",
    )
    parser.add_argument(
        "--no-resume", action="store_true",
        help="Do not resume from previous output, start fresh",
    )
    parser.add_argument(
        "--verify", action="store_true",
        help="Verify output after generation",
    )
    args = parser.parse_args()

    logger.info("=== AiNeed V3 - Phase 0 Embedding Generation ===")

    device = args.device
    if device == "auto":
        device = "cuda" if check_cuda() else "cpu"

    model = load_model(args.model, device)

    output_path = Path(args.output) if args.output else PROCESSED_DIR / "text_embeddings.jsonl"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    all_texts: list[str] = []
    all_ids: list[str] = []
    all_payloads: list[dict] = []

    if args.source in ("rules", "all"):
        rules_paths = [
            PROCESSED_DIR / "fashion_rules.json",
            KG_DIR / "fashion-rules.json",
        ]
        for rp in rules_paths:
            rules = load_fashion_rules(rp)
            for rule in rules:
                rule_id = rule.get("id", f"rule_{len(all_ids)}")
                text = build_text_from_rule(rule)
                all_texts.append(text)
                all_ids.append(str(rule_id))
                all_payloads.append({
                    "source": rp.name,
                    "category": rule.get("category", ""),
                    "type": "rule",
                })

    if args.source in ("items", "all"):
        items_path = Path(args.input) if args.input else PROCESSED_DIR / "annotated_items.json"
        items = load_annotated_items(items_path)
        for item in items:
            item_id = item.get("id", f"item_{len(all_ids)}")
            text = build_text_from_item(item)
            all_texts.append(text)
            all_ids.append(str(item_id))
            all_payloads.append({
                "source": items_path.name,
                "category": item.get("category", ""),
                "type": "item",
            })

    if not all_texts:
        logger.error("No data to embed. Check input files.")
        sys.exit(1)

    logger.info("Total texts to embed: %d", len(all_texts))

    processed_ids: set[str] = set()
    if not args.no_resume:
        processed_ids = load_progress(output_path)

    total_written = generate_embeddings(
        model=model,
        texts=all_texts,
        ids=all_ids,
        payloads=all_payloads,
        batch_size=args.batch_size,
        output_path=output_path,
        processed_ids=processed_ids,
    )

    if args.verify:
        logger.info("Verifying output...")
        result = verify_output(output_path, args.dimension)
        if result["valid"]:
            logger.info(
                "Verification passed: %d records, all %d-dimensional",
                result["total_records"], args.dimension,
            )
        else:
            logger.error(
                "Verification failed: %s",
                json.dumps(result, indent=2),
            )
            sys.exit(1)

    logger.info("Output saved to: %s", output_path)
    logger.info("Total embeddings written: %d", total_written)


if __name__ == "__main__":
    main()
