"""
Pre-Training Data Validation Script

Validates coordination training data before training to catch quality issues:
  - P0: All-zero auxiliary vectors (model trains on zero signal)
  - P1: Missing expected fields
  - P2: Category coverage across splits
  - Label balance

Usage:
  python -m ml.features.validate_data
  python -m ml.features.validate_data --fix
"""

import json
import argparse
import sys
from pathlib import Path
from typing import List, Dict

from ml.features.feature_extractor import (
    validate_dataset,
    extract_item_aux,
    extract_pair_aux_from_rule,
    CATEGORY_TO_ID,
)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "coordination_training"

SPLITS = ["train", "val", "test"]


def load_data(split_name: str) -> List[Dict]:
    path = DATA_DIR / f"{split_name}.json"
    if not path.exists():
        print(f"[ERROR] Missing data file: {path}")
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def fix_all_zero_aux(data: List[Dict]) -> List[Dict]:
    """Replace all-zero item aux vectors with real category-derived features."""
    fixed_count = 0
    for sample in data:
        item_a_aux = sample.get("item_a_aux", [])
        item_b_aux = sample.get("item_b_aux", [])

        if all(v == 0.0 for v in item_a_aux):
            cat_a = sample.get("item_a_category", "")
            if cat_a in CATEGORY_TO_ID:
                sample["item_a_aux"] = extract_item_aux(cat_a)
                fixed_count += 1

        if all(v == 0.0 for v in item_b_aux):
            cat_b = sample.get("item_b_category", "")
            if cat_b in CATEGORY_TO_ID:
                sample["item_b_aux"] = extract_item_aux(cat_b)
                fixed_count += 1
    return data, fixed_count


def fix_all_zero_pair_aux(data: List[Dict]) -> List[Dict]:
    """Replace all-zero pair aux with score-derived defaults."""
    fixed_count = 0
    for sample in data:
        pair_aux = sample.get("pair_aux", [])
        if all(v == 0.0 for v in pair_aux):
            score = sample.get("score", 0.5)
            sample["pair_aux"] = extract_pair_aux_from_rule(
                compatibility_score=score,
            )
            fixed_count += 1
    return data, fixed_count


def save_data(split_name: str, data: List[Dict]) -> None:
    path = DATA_DIR / f"{split_name}.json"
    backup_path = DATA_DIR / f"{split_name}.json.bak"
    if path.exists():
        path.rename(backup_path)
        print(f"  Backed up to {backup_path.name}")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(data)} samples to {path.name}")


def main():
    parser = argparse.ArgumentParser(
        description="Validate coordination training data quality"
    )
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Automatically fix all-zero aux vectors by deriving real features",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with error code on validation failure",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("Coordination Training Data Validation")
    print("=" * 60)
    print()

    all_valid = True
    overall = {
        "total_samples": 0,
        "all_zero_item_a": 0,
        "all_zero_item_b": 0,
        "all_zero_pair": 0,
    }

    for split_name in SPLITS:
        print(f"--- {split_name.upper()} ---")
        data = load_data(split_name)

        if not data:
            all_valid = False
            print()
            continue

        result = validate_dataset(data)
        overall["total_samples"] += result["total_samples"]
        overall["all_zero_item_a"] += result["all_zero_item_a_aux"]
        overall["all_zero_item_b"] += result["all_zero_item_b_aux"]
        overall["all_zero_pair"] += result["all_zero_pair_aux"]

        print(f"  Samples: {result['total_samples']}")
        print(f"  Labels: {result['label_distribution']}")
        print(f"  All-zero item_a_aux: {result['all_zero_item_a_aux']}")
        print(f"  All-zero item_b_aux: {result['all_zero_item_b_aux']}")
        print(f"  All-zero pair_aux: {result['all_zero_pair_aux']}")

        if result["issues"]:
            print(f"  [ISSUES]")
            for issue in result["issues"]:
                print(f"    - {issue}")
            all_valid = False

        if result["missing_fields"]:
            print(f"  [MISSING METADATA] {result['missing_fields']}")
            print(f"    These fields are not present in the data. Rich features cannot be derived.")
            print(f"    Current fix: features derived from category name only.")

        if args.fix and (
            result["all_zero_item_a_aux"] > 0
            or result["all_zero_item_b_aux"] > 0
            or result["all_zero_pair_aux"] > 0
        ):
            print(f"  [FIXING] Auto-fixing all-zero aux vectors...")
            data, fixed_a = fix_all_zero_aux(data)
            data, fixed_p = fix_all_zero_pair_aux(data)
            print(f"  Fixed {fixed_a} item aux + {fixed_p} pair aux vectors")
            save_data(split_name, data)

        print()

    # Summary
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Total samples: {overall['total_samples']}")
    print(f"  All-zero item_a_aux: {overall['all_zero_item_a']}/{overall['total_samples']}")
    print(f"  All-zero item_b_aux: {overall['all_zero_item_b']}/{overall['total_samples']}")
    print(f"  All-zero pair_aux: {overall['all_zero_pair']}/{overall['total_samples']}")

    if overall["all_zero_item_a"] > 0 or overall["all_zero_item_b"] > 0:
        print()
        print("  [CRITICAL P0 BUG DETECTED]")
        print(f"  {overall['all_zero_item_a']} item_a_aux and {overall['all_zero_item_b']} item_b_aux")
        print(f"  are all-zero across all splits.")
        print(f"  The model auxiliary feature pathway receives NO SIGNAL.")
        print(f"  Training on this data would produce arbitrary weights.")
        print()
        if not args.fix:
            print(f"  ACTION: Run with --fix to auto-repair, or re-run data generation:")
            print(f"    python -m ml.features.validate_data --fix")
            print(f"    python -m ml.scripts.generate_coordination_training_data")

    if args.strict and not all_valid:
        sys.exit(1)

    if all_valid:
        print()
        print("  All validation checks passed.")


if __name__ == "__main__":
    main()
