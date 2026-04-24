"""
ChineseFashionCLIP Benchmark Evaluation

Compares original FashionCLIP vs fine-tuned ChineseFashionCLIP on Chinese fashion queries.
Evaluates Recall@K (K=1,5,10) and Mean Reciprocal Rank (MRR).

Usage:
  python ml/scripts/benchmark_fashionclip.py
  python ml/scripts/benchmark_fashionclip.py --finetuned-path ml/models/chinese-fashion-clip/best_model
  python ml/scripts/benchmark_fashionclip.py --output-dir ml/models/chinese-fashion-clip/benchmark
"""

import argparse
import json
import logging
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


BENCHMARK_QUERIES = [
    {"query": "互联网公司面试穿搭 男", "relevant_occasions": ["interview"], "relevant_genders": ["male"],
     "relevant_categories": ["suit", "dress_shirt", "trousers", "blazer", "tie", "leather_shoes"]},
    {"query": "面试穿什么 女生", "relevant_occasions": ["interview"], "relevant_genders": ["female"],
     "relevant_categories": ["blazer", "blouse", "trousers", "pencil_skirt", "mid_heel_shoes"]},
    {"query": "约会穿搭 女 暖色调", "relevant_occasions": ["date"], "relevant_genders": ["female"],
     "relevant_categories": ["dress", "knit_cardigan", "skirt", "heels", "blouse", "coat"]},
    {"query": "男生约会穿什么", "relevant_occasions": ["date"], "relevant_genders": ["male"],
     "relevant_categories": ["knit_sweater", "chinos", "casual_shirt", "jacket", "sneakers", "coat"]},
    {"query": "冬季旅行穿搭", "relevant_occasions": ["travel"], "relevant_genders": ["male", "female"],
     "relevant_categories": ["jacket", "coat", "windbreaker", "hoodie", "jeans", "sneakers"]},
    {"query": "夏日清爽穿搭 女", "relevant_occasions": ["commute", "date"], "relevant_genders": ["female"],
     "relevant_categories": ["blouse", "dress", "skirt", "midi_skirt", "knit_top"]},
    {"query": "Smart Casual 通勤", "relevant_occasions": ["commute"], "relevant_genders": ["male", "female"],
     "relevant_categories": ["blazer", "chinos", "casual_shirt", "loafers", "sweater"]},
    {"query": "职场女性通勤穿搭", "relevant_occasions": ["commute"], "relevant_genders": ["female"],
     "relevant_categories": ["blazer", "blouse", "trousers", "midi_skirt", "loafers", "knit_top"]},
    {"query": "商务正装 男 面试", "relevant_occasions": ["interview"], "relevant_genders": ["male"],
     "relevant_categories": ["suit", "dress_shirt", "tie", "trousers", "leather_shoes"]},
    {"query": "温柔约会穿搭 女", "relevant_occasions": ["date"], "relevant_genders": ["female"],
     "relevant_categories": ["dress", "knit_cardigan", "skirt", "blouse", "coat"]},
    {"query": "户外旅行穿什么", "relevant_occasions": ["travel"], "relevant_genders": ["male", "female"],
     "relevant_categories": ["jacket", "windbreaker", "hoodie", "jeans", "sneakers", "t_shirt"]},
    {"query": "简约通勤 男", "relevant_occasions": ["commute"], "relevant_genders": ["male"],
     "relevant_categories": ["blazer", "chinos", "polo_shirt", "casual_shirt", "loafers", "sweater"]},
    {"query": "面试正装 女", "relevant_occasions": ["interview"], "relevant_genders": ["female"],
     "relevant_categories": ["blazer", "blouse", "trousers", "pencil_skirt", "mid_heel_shoes"]},
    {"query": "浪漫约会穿搭", "relevant_occasions": ["date"], "relevant_genders": ["female"],
     "relevant_categories": ["dress", "heels", "blouse", "knit_cardigan", "skirt"]},
    {"query": "轻装旅行 男", "relevant_occasions": ["travel"], "relevant_genders": ["male"],
     "relevant_categories": ["jacket", "hoodie", "jeans", "t_shirt", "sneakers", "windbreaker"]},
    {"query": "都市通勤穿搭 女", "relevant_occasions": ["commute"], "relevant_genders": ["female"],
     "relevant_categories": ["blazer", "trousers", "blouse", "midi_skirt", "loafers", "knit_top"]},
    {"query": "金融行业面试穿搭", "relevant_occasions": ["interview"], "relevant_genders": ["male", "female"],
     "relevant_categories": ["suit", "dress_shirt", "blazer", "trousers", "tie", "leather_shoes"]},
    {"query": "文艺约会穿搭 男", "relevant_occasions": ["date"], "relevant_genders": ["male"],
     "relevant_categories": ["casual_shirt", "chinos", "knit_sweater", "jacket", "sneakers"]},
    {"query": "运动旅行穿搭 女", "relevant_occasions": ["travel"], "relevant_genders": ["female"],
     "relevant_categories": ["jacket", "sneakers", "jeans", "t_shirt", "windbreaker"]},
    {"query": "知性通勤穿搭 女", "relevant_occasions": ["commute"], "relevant_genders": ["female"],
     "relevant_categories": ["blazer", "blouse", "trousers", "midi_skirt", "loafers"]},
    {"query": "暖男约会穿搭", "relevant_occasions": ["date"], "relevant_genders": ["male"],
     "relevant_categories": ["knit_sweater", "chinos", "casual_shirt", "coat"]},
    {"query": "休闲旅行穿搭", "relevant_occasions": ["travel"], "relevant_genders": ["male", "female"],
     "relevant_categories": ["t_shirt", "jeans", "sneakers", "jacket", "hoodie"]},
    {"query": "面试穿搭 稳重", "relevant_occasions": ["interview"], "relevant_genders": ["male", "female"],
     "relevant_categories": ["suit", "blazer", "dress_shirt", "trousers", "tie"]},
    {"query": "甜美约会穿搭 女", "relevant_occasions": ["date"], "relevant_genders": ["female"],
     "relevant_categories": ["dress", "skirt", "knit_cardigan", "blouse", "heels"]},
    {"query": "商务休闲通勤 男", "relevant_occasions": ["commute"], "relevant_genders": ["male"],
     "relevant_categories": ["blazer", "chinos", "polo_shirt", "casual_shirt", "loafers"]},
    {"query": "干练面试穿搭 女", "relevant_occasions": ["interview"], "relevant_genders": ["female"],
     "relevant_categories": ["blazer", "trousers", "blouse", "pencil_skirt", "mid_heel_shoes"]},
    {"query": "冬季约会穿搭", "relevant_occasions": ["date"], "relevant_genders": ["male", "female"],
     "relevant_categories": ["coat", "knit_sweater", "knit_cardigan", "jacket"]},
    {"query": "城市漫步穿搭", "relevant_occasions": ["travel", "commute"], "relevant_genders": ["male", "female"],
     "relevant_categories": ["jacket", "jeans", "sneakers", "casual_shirt", "t_shirt"]},
    {"query": "互联网公司通勤穿搭", "relevant_occasions": ["commute"], "relevant_genders": ["male", "female"],
     "relevant_categories": ["blazer", "chinos", "casual_shirt", "polo_shirt", "loafers", "sweater"]},
    {"query": "法式约会穿搭 女", "relevant_occasions": ["date"], "relevant_genders": ["female"],
     "relevant_categories": ["dress", "blouse", "skirt", "heels", "coat"]},
]


def load_catalog(data_dir: str) -> List[Dict]:
    """Load the product catalog from annotations."""
    annotations_path = Path(data_dir) / "annotations.json"
    if annotations_path.exists():
        with open(annotations_path, encoding="utf-8") as f:
            return json.load(f)
    logger.warning(f"No annotations found at {annotations_path}, using empty catalog")
    return []


def is_relevant(item: Dict, query_spec: Dict) -> bool:
    """Check if an item is relevant for a query."""
    occasion_match = item.get("occasion", "") in query_spec["relevant_occasions"]
    gender_match = item.get("gender", "") in query_spec["relevant_genders"]
    category_match = item.get("category", "") in query_spec["relevant_categories"]
    return occasion_match and gender_match and category_match


def compute_recall_at_k(ranked_items: List[Dict], query_spec: Dict, k: int) -> float:
    """Compute Recall@K for a single query."""
    relevant_in_top_k = sum(1 for item in ranked_items[:k] if is_relevant(item, query_spec))
    total_relevant = sum(1 for item in ranked_items if is_relevant(item, query_spec))
    if total_relevant == 0:
        return 0.0
    return relevant_in_top_k / total_relevant


def compute_mrr(ranked_items: List[Dict], query_spec: Dict) -> float:
    """Compute Mean Reciprocal Rank for a single query."""
    for rank, item in enumerate(ranked_items, start=1):
        if is_relevant(item, query_spec):
            return 1.0 / rank
    return 0.0


def compute_precision_at_k(ranked_items: List[Dict], query_spec: Dict, k: int) -> float:
    """Compute Precision@K for a single query."""
    relevant_in_top_k = sum(1 for item in ranked_items[:k] if is_relevant(item, query_spec))
    return relevant_in_top_k / k


def evaluate_model(model_name: str, model_path: str, catalog: List[Dict],
                   queries: List[Dict], device: str = "cpu") -> Dict:
    """Evaluate a model on all benchmark queries."""
    import torch
    from transformers import CLIPModel, CLIPProcessor

    logger.info(f"Loading model: {model_name} from {model_path}")
    model = CLIPModel.from_pretrained(model_path, local_files_only=True)
    processor = CLIPProcessor.from_pretrained(model_path, local_files_only=True)
    model.to(device)
    model.eval()

    catalog_texts = [
        f"{item.get('chinese_description', '')} {item.get('occasion_cn', '')} {item.get('category_cn', '')} {' '.join(item.get('colors_cn', []))}"
        for item in catalog
    ]

    logger.info(f"Encoding {len(catalog_texts)} catalog items...")
    catalog_embeddings = []
    batch_size = 64
    for i in range(0, len(catalog_texts), batch_size):
        batch = catalog_texts[i:i + batch_size]
        inputs = processor(text=batch, return_tensors="pt", padding=True, truncation=True, max_length=77)
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.no_grad():
            features = model.get_text_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)
        catalog_embeddings.append(features.cpu().numpy())
    catalog_embeddings = np.concatenate(catalog_embeddings, axis=0)

    all_recalls = {1: [], 5: [], 10: []}
    all_mrrs = []
    all_precisions = {1: [], 5: [], 10: []}
    per_query_results = []

    for query_spec in queries:
        query = query_spec["query"]
        inputs = processor(text=[query], return_tensors="pt", padding=True, truncation=True, max_length=77)
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.no_grad():
            query_feat = model.get_text_features(**inputs)
        query_feat = query_feat / query_feat.norm(dim=-1, keepdim=True)
        query_emb = query_feat.cpu().numpy()

        similarities = np.dot(catalog_embeddings, query_emb.T).flatten()
        ranked_indices = np.argsort(similarities)[::-1]
        ranked_items = [catalog[idx] for idx in ranked_indices]

        r1 = compute_recall_at_k(ranked_items, query_spec, 1)
        r5 = compute_recall_at_k(ranked_items, query_spec, 5)
        r10 = compute_recall_at_k(ranked_items, query_spec, 10)
        mrr = compute_mrr(ranked_items, query_spec)
        p1 = compute_precision_at_k(ranked_items, query_spec, 1)
        p5 = compute_precision_at_k(ranked_items, query_spec, 5)
        p10 = compute_precision_at_k(ranked_items, query_spec, 10)

        all_recalls[1].append(r1)
        all_recalls[5].append(r5)
        all_recalls[10].append(r10)
        all_mrrs.append(mrr)
        all_precisions[1].append(p1)
        all_precisions[5].append(p5)
        all_precisions[10].append(p10)

        top5_names = [item.get("chinese_description", "")[:40] for item in ranked_items[:5]]
        per_query_results.append({
            "query": query,
            "recall@1": round(r1, 4),
            "recall@5": round(r5, 4),
            "recall@10": round(r10, 4),
            "mrr": round(mrr, 4),
            "top5": top5_names,
        })

    metrics = {
        "model_name": model_name,
        "model_path": model_path,
        "num_queries": len(queries),
        "num_catalog": len(catalog),
        "recall@1": round(float(np.mean(all_recalls[1])), 4),
        "recall@5": round(float(np.mean(all_recalls[5])), 4),
        "recall@10": round(float(np.mean(all_recalls[10])), 4),
        "mrr": round(float(np.mean(all_mrrs)), 4),
        "precision@1": round(float(np.mean(all_precisions[1])), 4),
        "precision@5": round(float(np.mean(all_precisions[5])), 4),
        "precision@10": round(float(np.mean(all_precisions[10])), 4),
    }

    return metrics, per_query_results


def print_comparison(results: List[Dict]) -> None:
    """Print a formatted comparison table."""
    print("\n" + "=" * 80)
    print("ChineseFashionCLIP Benchmark Results")
    print("=" * 80)

    header = f"{'Model':<35} {'R@1':>8} {'R@5':>8} {'R@10':>8} {'P@1':>8} {'P@5':>8} {'MRR':>8}"
    print(header)
    print("-" * 80)

    for r in results:
        row = (
            f"{r['model_name']:<35} "
            f"{r['recall@1']:>8.2%} "
            f"{r['recall@5']:>8.2%} "
            f"{r['recall@10']:>8.2%} "
            f"{r['precision@1']:>8.2%} "
            f"{r['precision@5']:>8.2%} "
            f"{r['mrr']:>8.4f}"
        )
        print(row)

    if len(results) >= 2:
        baseline = results[0]
        finetuned = results[1]
        print("\n" + "-" * 80)
        print("Improvement (Fine-tuned vs Original):")
        for metric in ["recall@1", "recall@5", "recall@10", "precision@1", "precision@5", "mrr"]:
            base_val = baseline[metric]
            ft_val = finetuned[metric]
            if base_val > 0:
                pct_change = (ft_val - base_val) / base_val * 100
                sign = "+" if pct_change >= 0 else ""
                print(f"  {metric:<15}: {base_val:.4f} -> {ft_val:.4f} ({sign}{pct_change:.1f}%)")
            else:
                print(f"  {metric:<15}: {base_val:.4f} -> {ft_val:.4f}")

    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(description="Benchmark FashionCLIP vs ChineseFashionCLIP")
    parser.add_argument("--base-model", type=str, default="patrickjohncyh/fashion-clip",
                        help="Original FashionCLIP model path")
    parser.add_argument("--finetuned-path", type=str,
                        default="ml/models/chinese-fashion-clip/best_model",
                        help="Fine-tuned ChineseFashionCLIP model path")
    parser.add_argument("--data-dir", type=str, default="ml/data/chinese_fashion",
                        help="Data directory with catalog annotations")
    parser.add_argument("--output-dir", type=str,
                        default="ml/models/chinese-fashion-clip/benchmark",
                        help="Output directory for benchmark results")
    parser.add_argument("--device", type=str, default="auto",
                        help="Device: auto, cuda, cpu")
    args = parser.parse_args()

    if args.device == "auto":
        try:
            import torch
            args.device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            args.device = "cpu"

    catalog = load_catalog(args.data_dir)
    if not catalog:
        logger.error("No catalog data found. Run prepare_finetune_data.py first.")
        sys.exit(1)

    logger.info(f"Loaded {len(catalog)} catalog items")
    logger.info(f"Running {len(BENCHMARK_QUERIES)} benchmark queries")

    all_results = []
    all_per_query = {}

    logger.info("Evaluating original FashionCLIP...")
    base_metrics, base_per_query = evaluate_model(
        "FashionCLIP (Original)", args.base_model, catalog, BENCHMARK_QUERIES, args.device
    )
    all_results.append(base_metrics)
    all_per_query["original"] = base_per_query

    finetuned_path = Path(args.finetuned_path)
    if finetuned_path.exists() and (finetuned_path / "config.json").exists():
        logger.info("Evaluating ChineseFashionCLIP (Fine-tuned)...")
        ft_metrics, ft_per_query = evaluate_model(
            "ChineseFashionCLIP (Fine-tuned)", str(finetuned_path),
            catalog, BENCHMARK_QUERIES, args.device
        )
        all_results.append(ft_metrics)
        all_per_query["finetuned"] = ft_per_query
    else:
        logger.warning(f"Fine-tuned model not found at {finetuned_path}, skipping comparison")

    print_comparison(all_results)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    summary_path = output_dir / "benchmark_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    logger.info(f"Benchmark summary saved to {summary_path}")

    detail_path = output_dir / "benchmark_per_query.json"
    with open(detail_path, "w", encoding="utf-8") as f:
        json.dump(all_per_query, f, ensure_ascii=False, indent=2)
    logger.info(f"Per-query results saved to {detail_path}")


if __name__ == "__main__":
    main()
