"""
Coordination Model Training Data Generator

Generates positive and negative item compatibility pairs from fashion rules,
producing train/val/test splits for the CoordinationModel dual-tower network.

Data sources:
  - ml/data/fashion_rules/item_compatibility.json (primary positive samples)
  - ml/data/fashion_rules/fabric_rules.json (augmentation, optional)

Usage:
  python -m ml.scripts.generate_coordination_training_data
"""

import json
import random
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RULES_DIR = DATA_DIR / "fashion_rules"
OUTPUT_DIR = DATA_DIR / "coordination_training"

# All unique categories extracted from item_compatibility.json
ALL_CATEGORIES: List[str] = [
    # Tops
    "t_shirt", "shirt", "blouse", "sweater", "hoodie",
    "blazer", "jacket", "coat", "cardigan", "vest",
    "crop_top", "tank_top",
    # Bottoms
    "jeans", "trousers", "shorts",
    "skirt_mini", "skirt_midi", "skirt_maxi",
    "leggings", "wide_leg_pants", "culottes", "joggers",
]

TOP_CATEGORIES: List[str] = [
    "t_shirt", "shirt", "blouse", "sweater", "hoodie",
    "blazer", "jacket", "coat", "cardigan", "vest",
    "crop_top", "tank_top",
]

BOTTOM_CATEGORIES: List[str] = [
    "jeans", "trousers", "shorts",
    "skirt_mini", "skirt_midi", "skirt_maxi",
    "leggings", "wide_leg_pants", "culottes", "joggers",
]

CATEGORY_TO_ID: Dict[str, int] = {cat: idx for idx, cat in enumerate(ALL_CATEGORIES)}

SEASON_ENCODING = {
    "spring": [1, 0, 0, 0],
    "summer": [0, 1, 0, 0],
    "autumn": [0, 0, 1, 0],
    "winter": [0, 0, 0, 1],
}

STYLE_ENCODING = {
    "casual": 0, "smart_casual": 1, "business": 2, "formal": 3,
    "elegant": 4, "romantic": 5, "bohemian": 6, "streetwear": 7,
    "sporty": 8, "minimalist": 9,
}


def load_compatibility_rules(path: Optional[Path] = None) -> List[Dict]:
    """Load item compatibility rules from JSON file."""
    if path is None:
        path = RULES_DIR / "item_compatibility.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_fabric_rules(path: Optional[Path] = None) -> Optional[Dict]:
    """Load fabric rules from JSON file."""
    if path is None:
        path = RULES_DIR / "fabric_rules.json"
    if not path.exists():
        logger.info("fabric_rules.json not found, skipping fabric augmentation")
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _encode_aux_features(rule: Dict) -> List[float]:
    """Encode auxiliary features: style match count + season overlap count.

    Returns a 16-dimensional vector:
      - 10 dims: style multi-hot (one per style category)
      - 4 dims: season multi-hot for top item
      - 2 dims: [top_formality_approx, bottom_formality_approx] placeholder
    """
    styles = rule.get("suitable_styles", [])
    style_vec = [0.0] * 10
    for s in styles:
        if s in STYLE_ENCODING:
            style_vec[STYLE_ENCODING[s]] = 1.0

    seasons = rule.get("suitable_seasons", [])
    season_vec = [0.0] * 4
    for s in seasons:
        if s in SEASON_ENCODING:
            idx = ["spring", "summer", "autumn", "winter"].index(s)
            season_vec[idx] = 1.0

    # Two placeholder formality indicators
    occasion_count = len(rule.get("suitable_occasions", []))
    formality_indicator = [occasion_count / 5.0, rule.get("compatibility_score", 0.5)]

    return style_vec + season_vec + formality_indicator


def generate_positive_samples(
    rules: List[Dict],
    min_score: float = 0.7,
) -> List[Dict]:
    """Extract positive sample pairs from compatibility rules with score >= min_score."""
    samples = []
    for rule in rules:
        score = rule.get("compatibility_score", 0.0)
        if score < min_score:
            continue

        top_cat = rule.get("top_category", "")
        bottom_cat = rule.get("bottom_category", "")

        if top_cat not in CATEGORY_TO_ID or bottom_cat not in CATEGORY_TO_ID:
            logger.warning(f"Unknown category in rule {rule.get('id')}: {top_cat}/{bottom_cat}")
            continue

        aux = _encode_aux_features(rule)

        samples.append({
            "item_a_category": top_cat,
            "item_a_category_id": CATEGORY_TO_ID[top_cat],
            "item_b_category": bottom_cat,
            "item_b_category_id": CATEGORY_TO_ID[bottom_cat],
            "item_a_aux": [0.0] * 16,  # per-item aux, populated at training time
            "item_b_aux": [0.0] * 16,
            "pair_aux": aux,
            "label": 1,
            "score": score,
            "source": "item_compatibility",
        })

    logger.info(f"Generated {len(samples)} positive samples (score >= {min_score})")
    return samples


def generate_negative_samples(
    positive_samples: List[Dict],
    ratio: float = 4.0,
    seed: int = 42,
    all_rules: Optional[List[Dict]] = None,
) -> List[Dict]:
    """Generate negative samples from low-score rule pairs and random combinations.

    Strategy:
      1. Use rule pairs with compatibility_score < 0.5 as hard negatives.
      2. If more negatives needed, generate random top/bottom combos that
         are not in the positive set.

    Args:
        positive_samples: List of positive sample dicts.
        ratio: Number of negative samples per positive sample.
        seed: Random seed for reproducibility.
        all_rules: Optional pre-loaded rules. If None, loads from default path.
    """
    rng = random.Random(seed)
    rules = all_rules if all_rules is not None else load_compatibility_rules()

    # Build set of positive pairs for exclusion
    positive_pairs = set()
    for s in positive_samples:
        key = (s["item_a_category"], s["item_b_category"])
        positive_pairs.add(key)

    num_negatives = int(len(positive_samples) * ratio)
    negatives = []

    # Phase 1: Use low-score rule pairs as hard negatives
    for rule in rules:
        score = rule.get("compatibility_score", 0.0)
        top_cat = rule.get("top_category", "")
        bottom_cat = rule.get("bottom_category", "")
        key = (top_cat, bottom_cat)

        if key in positive_pairs:
            continue
        if top_cat not in CATEGORY_TO_ID or bottom_cat not in CATEGORY_TO_ID:
            continue

        negatives.append({
            "item_a_category": top_cat,
            "item_a_category_id": CATEGORY_TO_ID[top_cat],
            "item_b_category": bottom_cat,
            "item_b_category_id": CATEGORY_TO_ID[bottom_cat],
            "item_a_aux": [0.0] * 16,
            "item_b_aux": [0.0] * 16,
            "pair_aux": [0.0] * 16,
            "label": 0,
            "score": score,
            "source": "low_score_rule",
        })

    logger.info(f"  Phase 1 (hard negatives from rules): {len(negatives)}")

    # Phase 2: Generate random combinations if more negatives needed
    if len(negatives) < num_negatives:
        # All known rule pairs (positive + hard negative)
        all_known_pairs = set()
        for rule in rules:
            all_known_pairs.add(
                (rule.get("top_category", ""), rule.get("bottom_category", ""))
            )
        for n in negatives:
            all_known_pairs.add((n["item_a_category"], n["item_b_category"]))

        attempts = 0
        max_attempts = num_negatives * 20

        while len(negatives) < num_negatives and attempts < max_attempts:
            attempts += 1
            top = rng.choice(TOP_CATEGORIES)
            bottom = rng.choice(BOTTOM_CATEGORIES)

            if (top, bottom) in all_known_pairs:
                continue
            if top not in CATEGORY_TO_ID or bottom not in CATEGORY_TO_ID:
                continue

            neg_score = rng.uniform(0.0, 0.3)

            negatives.append({
                "item_a_category": top,
                "item_a_category_id": CATEGORY_TO_ID[top],
                "item_b_category": bottom,
                "item_b_category_id": CATEGORY_TO_ID[bottom],
                "item_a_aux": [0.0] * 16,
                "item_b_aux": [0.0] * 16,
                "pair_aux": [0.0] * 16,
                "label": 0,
                "score": neg_score,
                "source": "random_negative",
            })

        logger.info(f"  Phase 2 (random negatives): {len(negatives)} total")

    logger.info(
        f"Generated {len(negatives)} negative samples "
        f"(ratio={ratio}, attempts={attempts})"
    )
    return negatives


def augment_with_fabric_rules(
    samples: List[Dict],
    fabric_data: Optional[Dict] = None,
) -> List[Dict]:
    """Augment training data with additional positive samples derived from fabric rules.

    Creates synthetic positive pairs by pairing categories recommended for the same
    body type and similar formality levels. Only adds if fabric_data is available.
    """
    if fabric_data is None:
        logger.info("No fabric data provided, skipping augmentation")
        return samples

    fabrics = fabric_data.get("fabrics", [])
    augmented = list(samples)
    added = 0

    # Group fabrics by formality tier
    formal_fabrics = [f for f in fabrics if f["properties"].get("formality", 0) >= 0.7]
    casual_fabrics = [f for f in fabrics if f["properties"].get("formality", 0) < 0.7]

    # Create positive pairs between formal tops and formal bottoms
    for _ in range(min(50, len(formal_fabrics) * 5)):
        top_cat = random.choice(["shirt", "blouse", "blazer", "coat"])
        bottom_cat = random.choice(["trousers", "wide_leg_pants", "skirt_midi"])
        key = (top_cat, bottom_cat)
        if key not in {(s["item_a_category"], s["item_b_category"]) for s in augmented}:
            augmented.append({
                "item_a_category": top_cat,
                "item_a_category_id": CATEGORY_TO_ID[top_cat],
                "item_b_category": bottom_cat,
                "item_b_category_id": CATEGORY_TO_ID[bottom_cat],
                "item_a_aux": [0.0] * 16,
                "item_b_aux": [0.0] * 16,
                "pair_aux": [0.0] * 16,
                "label": 1,
                "score": 0.75,
                "source": "fabric_augmentation",
            })
            added += 1

    # Create positive pairs between casual tops and casual bottoms
    for _ in range(min(50, len(casual_fabrics) * 5)):
        top_cat = random.choice(["t_shirt", "hoodie", "tank_top", "crop_top"])
        bottom_cat = random.choice(["jeans", "shorts", "joggers", "skirt_mini"])
        key = (top_cat, bottom_cat)
        if key not in {(s["item_a_category"], s["item_b_category"]) for s in augmented}:
            augmented.append({
                "item_a_category": top_cat,
                "item_a_category_id": CATEGORY_TO_ID[top_cat],
                "item_b_category": bottom_cat,
                "item_b_category_id": CATEGORY_TO_ID[bottom_cat],
                "item_a_aux": [0.0] * 16,
                "item_b_aux": [0.0] * 16,
                "pair_aux": [0.0] * 16,
                "label": 1,
                "score": 0.75,
                "source": "fabric_augmentation",
            })
            added += 1

    logger.info(f"Augmented with {added} fabric-derived positive samples")
    return augmented


def split_data(
    samples: List[Dict],
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
    test_ratio: float = 0.1,
    seed: int = 42,
) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """Split samples into train/val/test sets."""
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6

    rng = random.Random(seed)
    shuffled = list(samples)
    rng.shuffle(shuffled)

    n = len(shuffled)
    train_end = int(n * train_ratio)
    val_end = train_end + int(n * val_ratio)

    train = shuffled[:train_end]
    val = shuffled[train_end:val_end]
    test = shuffled[val_end:]

    logger.info(f"Split: train={len(train)}, val={len(val)}, test={len(test)}")
    return train, val, test


def save_splits(
    train: List[Dict],
    val: List[Dict],
    test: List[Dict],
    output_dir: Optional[Path] = None,
) -> None:
    """Save train/val/test splits to JSON files."""
    if output_dir is None:
        output_dir = OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)

    for name, data in [("train", train), ("val", val), ("test", test)]:
        path = output_dir / f"{name}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved {len(data)} samples to {path}")

    # Save metadata
    metadata = {
        "total_samples": len(train) + len(val) + len(test),
        "train_size": len(train),
        "val_size": len(val),
        "test_size": len(test),
        "num_categories": len(ALL_CATEGORIES),
        "categories": ALL_CATEGORIES,
        "category_to_id": CATEGORY_TO_ID,
        "top_categories": TOP_CATEGORIES,
        "bottom_categories": BOTTOM_CATEGORIES,
    }
    meta_path = output_dir / "metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    logger.info(f"Saved metadata to {meta_path}")


def main() -> None:
    """Generate all training data, shuffle, split, and save."""
    logger.info("=" * 60)
    logger.info("Coordination Training Data Generation")
    logger.info("=" * 60)

    # Step 1: Load rules
    rules = load_compatibility_rules()
    logger.info(f"Loaded {len(rules)} compatibility rules")

    # Step 2: Generate positive samples
    positives = generate_positive_samples(rules, min_score=0.7)

    # Step 3: Generate negative samples
    negatives = generate_negative_samples(positives, ratio=4.0)

    # Step 4: Combine
    all_samples = positives + negatives
    logger.info(f"Total samples before augmentation: {len(all_samples)}")

    # Step 5: Optional fabric augmentation
    fabric_data = load_fabric_rules()
    all_samples = augment_with_fabric_rules(all_samples, fabric_data)
    logger.info(f"Total samples after augmentation: {len(all_samples)}")

    # Step 6: Shuffle and split
    train, val, test = split_data(all_samples)

    # Step 7: Save
    save_splits(train, val, test)

    logger.info("=" * 60)
    logger.info("Data generation complete!")
    logger.info(f"  Train: {len(train)}")
    logger.info(f"  Val:   {len(val)}")
    logger.info(f"  Test:  {len(test)}")
    logger.info(f"  Output: {OUTPUT_DIR}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
