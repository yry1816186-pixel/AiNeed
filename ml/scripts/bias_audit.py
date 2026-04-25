"""
Bias Audit Script for Recommendation System

Audits recommendation results across 5 diverse user profiles to detect
algorithmic bias. Measures whether different profiles receive meaningfully
different recommendations for the same scene.

Metrics:
  - Category distribution: should differ by styleExpression
  - Price range distribution: should differ by profile
  - Jaccard similarity of recommended item sets: should be < 0.5 between different profiles

Output:
  - Per-profile recommendation summary
  - Cross-profile similarity matrix
  - Bias score (0 = no bias, 1 = all profiles get same results)
  - PASS/WARN/FAIL verdict

Usage:
  python ml/scripts/bias_audit.py --api-url http://localhost:3001 --scene 通勤
  python ml/scripts/bias_audit.py --api-url http://localhost:3001 --scene 通勤 --output ml/data/bias_audit_report.json
"""

import argparse
import json
import logging
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import httpx

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# 5 test profiles covering diverse body types, style expressions, and scenarios
PROFILES = {
    "default": {
        "bodyType": "hourglass",
        "styleExpression": "minimalist",
        "primaryScenarios": ["commute", "date"],
    },
    "professional": {
        "bodyType": "rectangle",
        "styleExpression": "classic",
        "primaryScenarios": ["interview", "business"],
    },
    "creative": {
        "bodyType": "pear",
        "styleExpression": "bohemian",
        "primaryScenarios": ["street", "party"],
    },
    "sporty": {
        "bodyType": "apple",
        "styleExpression": "streetwear",
        "primaryScenarios": ["sport", "casual"],
    },
    "romantic": {
        "bodyType": "inverted-triangle",
        "styleExpression": "romantic",
        "primaryScenarios": ["date", "vacation"],
    },
}


def jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
    """Compute Jaccard similarity between two sets."""
    if not set_a and not set_b:
        return 1.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)


def fetch_recommendations(
    api_url: str,
    profile_name: str,
    profile: Dict[str, Any],
    scene: str,
    limit: int = 20,
    timeout: float = 30.0,
) -> Optional[List[Dict]]:
    """Call the recommendation API with a given profile and scene.

    Uses a mock user ID derived from the profile name to simulate
    different user contexts.
    """
    user_id = f"bias-audit-{profile_name}"

    # Build the request payload matching the RecommendationRequest interface
    payload = {
        "userId": user_id,
        "context": {
            "occasion": scene,
        },
        "options": {
            "limit": limit,
        },
        # Profile overrides for bias testing
        "profileOverride": {
            "bodyType": profile["bodyType"],
            "styleExpression": profile["styleExpression"],
            "primaryScenarios": profile["primaryScenarios"],
        },
    }

    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(
                f"{api_url}/api/v1/recommendations/bias-audit",
                json=payload,
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("items", [])
            elif response.status_code == 404:
                # Fallback: try the standard recommendation endpoint
                response = client.post(
                    f"{api_url}/api/v1/recommendations",
                    json={
                        "userId": user_id,
                        "context": {"occasion": scene},
                        "options": {"limit": limit},
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("items", [])
            logger.warning(f"API returned status {response.status_code} for profile '{profile_name}'")
            return None
    except httpx.ConnectError:
        logger.error(f"Cannot connect to API at {api_url}. Is the backend running?")
        return None
    except Exception as e:
        logger.error(f"Error fetching recommendations for profile '{profile_name}': {e}")
        return None


def compute_category_distribution(items: List[Dict]) -> Dict[str, float]:
    """Compute category distribution as normalized frequencies."""
    if not items:
        return {}
    categories = [item.get("category", "unknown") for item in items]
    counter = Counter(categories)
    total = len(categories)
    return {cat: count / total for cat, count in counter.items()}


def compute_price_distribution(items: List[Dict], bins: int = 5) -> Dict[str, float]:
    """Compute price range distribution across bins."""
    if not items:
        return {}
    prices = [item.get("price", 0) for item in items if item.get("price", 0) > 0]
    if not prices:
        return {}

    min_price = min(prices)
    max_price = max(prices)
    bin_width = (max_price - min_price) / bins if max_price > min_price else 1

    counter = Counter()
    for price in prices:
        bin_idx = min(int((price - min_price) / bin_width), bins - 1)
        bin_label = f"{min_price + bin_idx * bin_width:.0f}-{min_price + (bin_idx + 1) * bin_width:.0f}"
        counter[bin_label] += 1

    total = len(prices)
    return {label: count / total for label, count in counter.items()}


def compute_bias_score(
    profile_results: Dict[str, Dict[str, Any]],
    profile_names: List[str],
) -> float:
    """Compute overall bias score.

    Bias score = average Jaccard similarity across all profile pairs.
    0 = perfect diversity (no bias), 1 = all profiles get identical results.
    """
    item_sets = {}
    for name in profile_names:
        items = profile_results[name].get("items", [])
        item_sets[name] = set(item.get("id", "") for item in items if item.get("id"))

    if len(item_sets) < 2:
        return 0.0

    similarities = []
    names = list(item_sets.keys())
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            sim = jaccard_similarity(item_sets[names[i]], item_sets[names[j]])
            similarities.append(sim)

    return sum(similarities) / len(similarities) if similarities else 0.0


def build_similarity_matrix(
    profile_results: Dict[str, Dict[str, Any]],
    profile_names: List[str],
) -> Dict[str, Dict[str, float]]:
    """Build pairwise Jaccard similarity matrix across profiles."""
    item_sets = {}
    for name in profile_names:
        items = profile_results[name].get("items", [])
        item_sets[name] = set(item.get("id", "") for item in items if item.get("id"))

    matrix = {}
    for name_a in profile_names:
        matrix[name_a] = {}
        for name_b in profile_names:
            if name_a == name_b:
                matrix[name_a][name_b] = 1.0
            else:
                matrix[name_a][name_b] = round(
                    jaccard_similarity(item_sets.get(name_a, set()), item_sets.get(name_b, set())),
                    4,
                )
    return matrix


def run_audit(api_url: str, scene: str, limit: int = 20) -> Dict[str, Any]:
    """Run the full bias audit across all profiles."""
    profile_names = list(PROFILES.keys())
    profile_results: Dict[str, Dict[str, Any]] = {}

    logger.info(f"Starting bias audit with scene='{scene}', limit={limit}")
    logger.info(f"Testing {len(profile_names)} profiles: {', '.join(profile_names)}")

    # Fetch recommendations for each profile
    for name in profile_names:
        profile = PROFILES[name]
        logger.info(f"Fetching recommendations for profile '{name}' "
                     f"(bodyType={profile['bodyType']}, style={profile['styleExpression']})...")

        items = fetch_recommendations(api_url, name, profile, scene, limit)

        if items is not None:
            cat_dist = compute_category_distribution(items)
            price_dist = compute_price_distribution(items)
            profile_results[name] = {
                "items": items,
                "category_distribution": cat_dist,
                "price_distribution": price_dist,
                "item_count": len(items),
            }
            logger.info(f"  Received {len(items)} items. Top categories: {list(cat_dist.keys())[:3]}")
        else:
            profile_results[name] = {
                "items": [],
                "category_distribution": {},
                "price_distribution": {},
                "item_count": 0,
                "error": "Failed to fetch recommendations",
            }
            logger.warning(f"  No results for profile '{name}'")

    # Compute similarity matrix
    similarity_matrix = build_similarity_matrix(profile_results, profile_names)
    logger.info("Cross-profile Jaccard similarity matrix:")
    for name_a in profile_names:
        row = "  " + "  ".join(f"{similarity_matrix[name_a][name_b]:.3f}" for name_b in profile_names)
        logger.info(f"  {name_a}: {row}")

    # Compute bias score
    bias_score = compute_bias_score(profile_results, profile_names)
    logger.info(f"Bias score: {bias_score:.4f}")

    # Determine verdict
    if bias_score < 0.3:
        verdict = "PASS"
    elif bias_score <= 0.6:
        verdict = "WARN"
    else:
        verdict = "FAIL"
    logger.info(f"Verdict: {verdict}")

    # Build per-profile summaries
    profile_summaries = {}
    for name in profile_names:
        result = profile_results[name]
        profile_summaries[name] = {
            "bodyType": PROFILES[name]["bodyType"],
            "styleExpression": PROFILES[name]["styleExpression"],
            "primaryScenarios": PROFILES[name]["primaryScenarios"],
            "itemCount": result.get("item_count", 0),
            "categoryDistribution": result.get("category_distribution", {}),
            "priceDistribution": result.get("price_distribution", {}),
            "error": result.get("error"),
        }

    # Build audit report
    report = {
        "audit_timestamp": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "scene": scene,
        "limit": limit,
        "profiles_tested": len(profile_names),
        "profile_summaries": profile_summaries,
        "similarity_matrix": similarity_matrix,
        "bias_score": round(bias_score, 4),
        "verdict": verdict,
        "thresholds": {
            "pass": "< 0.3",
            "warn": "0.3 - 0.6",
            "fail": "> 0.6",
        },
    }

    return report


def main():
    parser = argparse.ArgumentParser(description="Bias audit for recommendation system")
    parser.add_argument("--api-url", type=str, default="http://localhost:3001",
                        help="Backend API base URL")
    parser.add_argument("--scene", type=str, default="通勤",
                        help="Scene/occasion to test (same for all profiles)")
    parser.add_argument("--limit", type=int, default=20,
                        help="Number of recommendations per profile")
    parser.add_argument("--output", type=str, default="ml/data/bias_audit_report.json",
                        help="Output path for audit report JSON")
    args = parser.parse_args()

    report = run_audit(args.api_url, args.scene, args.limit)

    # Write report
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    logger.info(f"Audit report saved to {output_path}")

    # Print summary
    print("\n" + "=" * 60)
    print("BIAS AUDIT SUMMARY")
    print("=" * 60)
    print(f"Scene: {report['scene']}")
    print(f"Profiles tested: {report['profiles_tested']}")
    print(f"Bias score: {report['bias_score']:.4f}")
    print(f"Verdict: {report['verdict']}")
    print("=" * 60)

    # Exit with non-zero if FAIL
    if report["verdict"] == "FAIL":
        sys.exit(1)


if __name__ == "__main__":
    main()
