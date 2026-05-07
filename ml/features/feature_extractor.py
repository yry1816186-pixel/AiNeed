"""
Feature Extractor for Coordination Model

Derives meaningful 16-dimensional auxiliary feature vectors from clothing
category metadata. These features supplement the learned category embedding
with hard-coded domain knowledge about garment properties.

Key principles:
  - Features are derived from real category semantics, NOT random values
  - All features are documented with semantic meaning
  - Supports both training-time extraction (from rules) and inference-time
    extraction (from category name only)

Item-Level 16-Dim Auxiliary Feature Specification (v1.0):
  See: ml/docs/COORDINATION_FEATURE_SPEC.md

Pair-Level 16-Dim Auxiliary Feature Specification (v1.0):
  Style multi-hot (10 dims) + Season one-hot (4 dims) + pair scores (2 dims)
  See: ml/docs/COORDINATION_FEATURE_SPEC.md
"""

from typing import Dict, List, Optional, Set, Tuple

AUX_DIM = 16

CATEGORY_TO_ID: Dict[str, int] = {
    "t_shirt": 0, "shirt": 1, "blouse": 2, "sweater": 3,
    "hoodie": 4, "blazer": 5, "jacket": 6, "coat": 7,
    "cardigan": 8, "vest": 9, "crop_top": 10, "tank_top": 11,
    "jeans": 12, "trousers": 13, "shorts": 14,
    "skirt_mini": 15, "skirt_midi": 16, "skirt_maxi": 17,
    "leggings": 18, "wide_leg_pants": 19, "culottes": 20, "joggers": 21,
    "dress": 22, "sneakers": 23, "heels": 24, "boots": 25,
    "sandals": 26, "flats": 27, "loafers": 28, "bag": 29,
    "hat": 30, "scarf": 31,
}

CATEGORY_GROUPS = {
    "top_basic": {"t_shirt", "tank_top", "crop_top"},
    "top_shirt": {"shirt", "blouse"},
    "knit": {"sweater", "hoodie", "cardigan"},
    "outer": {"blazer", "jacket", "coat", "vest"},
    "pants_casual": {"jeans", "shorts", "joggers", "leggings"},
    "pants_formal": {"trousers", "wide_leg_pants", "culottes"},
    "skirt_short": {"skirt_mini"},
    "skirt_mid": {"skirt_midi"},
    "skirt_long": {"skirt_maxi"},
}

STYLE_ENCODING: Dict[str, int] = {
    "casual": 0, "smart_casual": 1, "business": 2, "formal": 3,
    "elegant": 4, "romantic": 5, "bohemian": 6, "streetwear": 7,
    "sporty": 8, "minimalist": 9,
}

SEASON_ORDER = ["spring", "summer", "autumn", "winter"]

METADATA_FIELDS_REQUIRED = [
    "color", "gender", "season", "fabric_type", "occasion",
    "formality_level", "pattern", "fit_type",
]


def _get_group_index(category_name: str) -> int:
    for idx, (_, members) in enumerate(CATEGORY_GROUPS.items()):
        if category_name in members:
            return idx
    return -1


def _norm(value: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
    clamped = max(min_val, min(max_val, value))
    if max_val == min_val:
        return 0.5
    return (clamped - min_val) / (max_val - min_val)


CATEGORY_PROPERTIES: Dict[str, Dict[str, float]] = {
    "t_shirt": {
        "formality": 0.15, "warmth": 0.2, "coverage": 0.5, "structure": 0.3,
        "length": 0.5, "sleeves": 0.4, "collar": 0.0, "layer": 0.0,
        "versatility": 0.9, "statement": 0.1,
        "spring": 1.0, "summer": 1.0, "autumn": 0.7, "winter": 0.3,
    },
    "shirt": {
        "formality": 0.55, "warmth": 0.25, "coverage": 0.7, "structure": 0.65,
        "length": 0.5, "sleeves": 0.9, "collar": 1.0, "layer": 0.1,
        "versatility": 0.8, "statement": 0.3,
        "spring": 1.0, "summer": 0.8, "autumn": 0.8, "winter": 0.3,
    },
    "blouse": {
        "formality": 0.7, "warmth": 0.15, "coverage": 0.6, "structure": 0.3,
        "length": 0.5, "sleeves": 0.7, "collar": 0.7, "layer": 0.0,
        "versatility": 0.6, "statement": 0.6,
        "spring": 1.0, "summer": 0.9, "autumn": 0.7, "winter": 0.2,
    },
    "sweater": {
        "formality": 0.3, "warmth": 0.85, "coverage": 0.85, "structure": 0.4,
        "length": 0.5, "sleeves": 1.0, "collar": 0.0, "layer": 0.3,
        "versatility": 0.7, "statement": 0.3,
        "spring": 0.8, "summer": 0.1, "autumn": 1.0, "winter": 1.0,
    },
    "hoodie": {
        "formality": 0.05, "warmth": 0.8, "coverage": 0.85, "structure": 0.2,
        "length": 0.5, "sleeves": 1.0, "collar": 0.0, "layer": 0.3,
        "versatility": 0.5, "statement": 0.2,
        "spring": 0.9, "summer": 0.3, "autumn": 1.0, "winter": 0.8,
    },
    "blazer": {
        "formality": 0.9, "warmth": 0.4, "coverage": 0.75, "structure": 0.95,
        "length": 0.5, "sleeves": 1.0, "collar": 1.0, "layer": 0.8,
        "versatility": 0.7, "statement": 0.7,
        "spring": 1.0, "summer": 0.3, "autumn": 0.9, "winter": 0.5,
    },
    "jacket": {
        "formality": 0.45, "warmth": 0.6, "coverage": 0.8, "structure": 0.8,
        "length": 0.5, "sleeves": 1.0, "collar": 0.8, "layer": 0.8,
        "versatility": 0.7, "statement": 0.7,
        "spring": 0.9, "summer": 0.2, "autumn": 1.0, "winter": 0.6,
    },
    "coat": {
        "formality": 0.75, "warmth": 1.0, "coverage": 1.0, "structure": 0.9,
        "length": 0.9, "sleeves": 1.0, "collar": 0.9, "layer": 1.0,
        "versatility": 0.6, "statement": 0.8,
        "spring": 0.4, "summer": 0.0, "autumn": 0.8, "winter": 1.0,
    },
    "cardigan": {
        "formality": 0.35, "warmth": 0.6, "coverage": 0.7, "structure": 0.35,
        "length": 0.5, "sleeves": 1.0, "collar": 0.0, "layer": 0.5,
        "versatility": 0.7, "statement": 0.4,
        "spring": 0.9, "summer": 0.3, "autumn": 1.0, "winter": 0.5,
    },
    "vest": {
        "formality": 0.4, "warmth": 0.35, "coverage": 0.45, "structure": 0.6,
        "length": 0.45, "sleeves": 0.0, "collar": 0.3, "layer": 0.5,
        "versatility": 0.5, "statement": 0.45,
        "spring": 0.8, "summer": 0.5, "autumn": 0.8, "winter": 0.3,
    },
    "crop_top": {
        "formality": 0.2, "warmth": 0.1, "coverage": 0.25, "structure": 0.2,
        "length": 0.1, "sleeves": 0.3, "collar": 0.0, "layer": 0.0,
        "versatility": 0.4, "statement": 0.55,
        "spring": 1.0, "summer": 1.0, "autumn": 0.4, "winter": 0.0,
    },
    "tank_top": {
        "formality": 0.1, "warmth": 0.05, "coverage": 0.3, "structure": 0.15,
        "length": 0.5, "sleeves": 0.0, "collar": 0.0, "layer": 0.0,
        "versatility": 0.6, "statement": 0.15,
        "spring": 0.9, "summer": 1.0, "autumn": 0.5, "winter": 0.0,
    },
    "jeans": {
        "formality": 0.2, "warmth": 0.4, "coverage": 0.9, "structure": 0.7,
        "length": 1.0, "sleeves": 0.0, "collar": 0.0, "layer": 0.0,
        "versatility": 0.95, "statement": 0.2,
        "spring": 1.0, "summer": 0.9, "autumn": 1.0, "winter": 0.8,
    },
    "trousers": {
        "formality": 0.75, "warmth": 0.35, "coverage": 1.0, "structure": 0.8,
        "length": 1.0, "sleeves": 0.0, "collar": 0.0, "layer": 0.0,
        "versatility": 0.7, "statement": 0.3,
        "spring": 1.0, "summer": 0.6, "autumn": 1.0, "winter": 0.5,
    },
    "shorts": {
        "formality": 0.1, "warmth": 0.05, "coverage": 0.3, "structure": 0.4,
        "length": 0.15, "sleeves": 0.0, "collar": 0.0, "layer": 0.0,
        "versatility": 0.5, "statement": 0.15,
        "spring": 0.8, "summer": 1.0, "autumn": 0.4, "winter": 0.0,
    },
    "skirt_mini": {
        "formality": 0.35, "warmth": 0.1, "coverage": 0.3, "structure": 0.3,
        "length": 0.15, "sleeves": 0.0, "collar": 0.0, "layer": 0.0,
        "versatility": 0.5, "statement": 0.6,
        "spring": 0.9, "summer": 1.0, "autumn": 0.5, "winter": 0.1,
    },
    "skirt_midi": {
        "formality": 0.5, "warmth": 0.25, "coverage": 0.65, "structure": 0.3,
        "length": 0.5, "sleeves": 0.0, "collar": 0.0, "layer": 0.0,
        "versatility": 0.7, "statement": 0.4,
        "spring": 1.0, "summer": 0.8, "autumn": 0.9, "winter": 0.3,
    },
    "skirt_maxi": {
        "formality": 0.55, "warmth": 0.3, "coverage": 0.95, "structure": 0.2,
        "length": 1.0, "sleeves": 0.0, "collar": 0.0, "layer": 0.0,
        "versatility": 0.5, "statement": 0.6,
        "spring": 0.9, "summer": 0.8, "autumn": 0.8, "winter": 0.2,
    },
    "leggings": {
        "formality": 0.1, "warmth": 0.25, "coverage": 1.0, "structure": 0.1,
        "length": 1.0, "sleeves": 0.0, "collar": 0.0, "layer": 0.0,
        "versatility": 0.5, "statement": 0.1,
        "spring": 0.9, "summer": 0.5, "autumn": 1.0, "winter": 0.7,
    },
    "wide_leg_pants": {
        "formality": 0.55, "warmth": 0.3, "coverage": 1.0, "structure": 0.45,
        "length": 1.0, "sleeves": 0.0, "collar": 0.0, "layer": 0.0,
        "versatility": 0.6, "statement": 0.5,
        "spring": 1.0, "summer": 0.6, "autumn": 0.9, "winter": 0.4,
    },
    "culottes": {
        "formality": 0.5, "warmth": 0.2, "coverage": 0.7, "structure": 0.4,
        "length": 0.4, "sleeves": 0.0, "collar": 0.0, "layer": 0.0,
        "versatility": 0.5, "statement": 0.5,
        "spring": 0.9, "summer": 0.8, "autumn": 0.7, "winter": 0.2,
    },
    "joggers": {
        "formality": 0.1, "warmth": 0.45, "coverage": 1.0, "structure": 0.2,
        "length": 1.0, "sleeves": 0.0, "collar": 0.0, "layer": 0.0,
        "versatility": 0.5, "statement": 0.1,
        "spring": 0.9, "summer": 0.5, "autumn": 0.9, "winter": 0.6,
    },
    "dress": {
        "formality": 0.5, "warmth": 0.2, "coverage": 0.6, "structure": 0.3,
        "length": 0.5, "sleeves": 0.5, "collar": 0.3, "layer": 0.0,
        "versatility": 0.5, "statement": 0.5,
        "spring": 0.9, "summer": 0.8, "autumn": 0.7, "winter": 0.3,
    },
}

_DEFAULT_PROPS = {
    "formality": 0.4, "warmth": 0.3, "coverage": 0.5, "structure": 0.4,
    "length": 0.5, "sleeves": 0.5, "collar": 0.2, "layer": 0.1,
    "versatility": 0.5, "statement": 0.3,
    "spring": 0.7, "summer": 0.7, "autumn": 0.7, "winter": 0.5,
}


def extract_item_aux(category_name: str) -> List[float]:
    """Extract 16-dimensional auxiliary features for a clothing item.

    Derives real semantic features from the category name using expert-curated
    fashion domain knowledge about garment properties.

    Feature dimensions (see COORDINATION_FEATURE_SPEC.md for full spec):
      [0]: formality score (0.0 casual → 1.0 formal)
      [1]: warmth score (0.0 light → 1.0 warm)
      [2]: body coverage (0.0 minimal → 1.0 full)
      [3]: structure level (0.0 soft/drapey → 1.0 structured)
      [4]: garment class (0.0 top, 0.33 outer, 0.66 pants, 1.0 skirt)
      [5]: length (0.0 short/crop → 1.0 long/full)
      [6]: has_collar (0.0 or 1.0)
      [7]: has_sleeves (0.0 none, 0.5 partial, 1.0 full)
      [8]: versatility score (0.0 niche → 1.0 goes-with-everything)
      [9]: statement_level (0.0 basic → 1.0 standout)
      [10]: season_spring suitability
      [11]: season_summer suitability
      [12]: season_autumn suitability
      [13]: season_winter suitability
      [14]: layer_position (0.0 base → 1.0 outer)
      [15]: group_encoded (categorical group as float 0.0-1.0)

    Args:
        category_name: String name of the clothing category (e.g., "t_shirt").

    Returns:
        List of 16 float values in [0.0, 1.0].
    """
    props = CATEGORY_PROPERTIES.get(category_name, _DEFAULT_PROPS)

    group_idx = _get_group_index(category_name)
    group_encoded = (group_idx / max(len(CATEGORY_GROUPS) - 1, 1)) if group_idx >= 0 else 0.5

    return [
        props["formality"],
        props["warmth"],
        props["coverage"],
        props["structure"],
        _compute_garment_class(category_name),
        props["length"],
        props["collar"],
        props["sleeves"],
        props["versatility"],
        props["statement"],
        props["spring"],
        props["summer"],
        props["autumn"],
        props["winter"],
        props["layer"],
        group_encoded,
    ]


def _compute_garment_class(category_name: str) -> float:
    group = _get_group_index(category_name)
    if group in (0, 1, 2):
        return 0.0
    elif group == 3:
        return 0.33
    elif group in (4, 5):
        return 0.66
    elif group in (6, 7, 8):
        return 1.0
    return 0.25


def get_default_item_aux() -> List[float]:
    """Return a neutral default item aux vector.

    Used when category is unknown or not found in CATEGORY_PROPERTIES.
    The 'dress' category is used as a mid-point proxy.
    """
    return extract_item_aux("dress")


def extract_pair_aux_from_rule(
    suitable_styles: Optional[List[str]] = None,
    suitable_seasons: Optional[List[str]] = None,
    suitable_occasions: Optional[List[str]] = None,
    compatibility_score: Optional[float] = None,
) -> List[float]:
    """Extract 16-dimensional pair-level auxiliary features from a compatibility rule.

    Feature dimensions:
      [0-9]: Style multi-hot encoding (10 styles from STYLE_ENCODING)
      [10-13]: Season multi-hot encoding (spring, summer, autumn, winter)
      [14]: occasion_count / 5.0 (formality indicator)
      [15]: compatibility_score (from rule, or 0.5 default)

    Args:
        suitable_styles: List of style strings.
        suitable_seasons: List of season strings.
        suitable_occasions: List of occasion strings.
        compatibility_score: Float score from the rule.

    Returns:
        List of 16 float values.
    """
    styles = suitable_styles or []
    seasons = suitable_seasons or []
    occasions = suitable_occasions or []

    style_vec = [0.0] * 10
    for s in styles:
        if s in STYLE_ENCODING:
            style_vec[STYLE_ENCODING[s]] = 1.0

    season_vec = [0.0] * 4
    for s in seasons:
        if s in SEASON_ORDER:
            season_vec[SEASON_ORDER.index(s)] = 1.0

    occasion_indicator = min(len(occasions) / 5.0, 1.0)
    score = compatibility_score if compatibility_score is not None else 0.5

    return style_vec + season_vec + [occasion_indicator, score]


def validate_aux_vectors(
    item_a_aux: List[float],
    item_b_aux: List[float],
    strict: bool = True,
) -> Tuple[bool, Optional[str]]:
    """Validate that auxiliary vectors are not all-zero.

    An all-zero auxiliary vector means the model receives no feature signal
    beyond the category embedding, effectively wasting the auxiliary pathway.

    Args:
        item_a_aux: 16-dim auxiliary vector for item A.
        item_b_aux: 16-dim auxiliary vector for item B.
        strict: If True, raise ValueError on all-zero. If False, return (False, msg).

    Returns:
        Tuple of (is_valid, error_message_or_None).

    Raises:
        ValueError: If strict=True and either vector is all zeros.
    """
    zero_a = all(v == 0.0 for v in item_a_aux)
    zero_b = all(v == 0.0 for v in item_b_aux)

    messages = []
    if zero_a:
        messages.append("item_a_aux is all zeros (16 dims)")
    if zero_b:
        messages.append("item_b_aux is all zeros (16 dims)")

    if not messages:
        return True, None

    error_msg = (
        "Auxiliary feature validation failed: " + "; ".join(messages) +
        ". The model auxiliary pathway receives zero information. "
        "Run feature extraction to populate real features from category metadata. "
        "See ml/docs/COORDINATION_FEATURE_SPEC.md for details."
    )

    if strict:
        raise ValueError(error_msg)
    return False, error_msg


def validate_dataset(
    data: List[Dict],
    strict: bool = False,
) -> Dict[str, any]:
    """Validate an entire dataset for data quality issues.

    Checks:
      - All-zero item_a_aux / item_b_aux (the P0 bug)
      - Missing fields
      - Category validity
      - Label distribution

    Args:
        data: List of sample dictionaries.
        strict: If True, raise on first error. If False, collect all issues.

    Returns:
        Dict with validation results: {
            "valid": bool,
            "total_samples": int,
            "all_zero_item_a_aux": int,
            "all_zero_item_b_aux": int,
            "all_zero_pair_aux": int,
            "missing_fields": List[str],
            "invalid_categories": List[str],
            "label_distribution": Dict[int, int],
            "issues": List[str],
        }
    """
    result = {
        "valid": True,
        "total_samples": len(data),
        "all_zero_item_a_aux": 0,
        "all_zero_item_b_aux": 0,
        "all_zero_pair_aux": 0,
        "missing_fields": [],
        "invalid_categories": [],
        "label_distribution": {},
        "issues": [],
    }

    if not data:
        result["issues"].append("Empty dataset")
        result["valid"] = False
        return result

    seen_missing = set()
    seen_invalid_cats = set()
    labels = {}

    for i, sample in enumerate(data):
        label = sample.get("label", -1)
        labels[label] = labels.get(label, 0) + 1

        item_a_aux = sample.get("item_a_aux", [])
        item_b_aux = sample.get("item_b_aux", [])
        pair_aux = sample.get("pair_aux", [])

        if all(v == 0.0 for v in item_a_aux):
            result["all_zero_item_a_aux"] += 1
        if all(v == 0.0 for v in item_b_aux):
            result["all_zero_item_b_aux"] += 1
        if all(v == 0.0 for v in pair_aux):
            result["all_zero_pair_aux"] += 1

        cat_a = sample.get("item_a_category", "")
        cat_b = sample.get("item_b_category", "")
        if cat_a and cat_a not in CATEGORY_PROPERTIES:
            seen_invalid_cats.add(cat_a)
        if cat_b and cat_b not in CATEGORY_PROPERTIES:
            seen_invalid_cats.add(cat_b)

        for field in METADATA_FIELDS_REQUIRED:
            if field not in sample:
                seen_missing.add(field)

    result["label_distribution"] = labels
    result["missing_fields"] = sorted(seen_missing)
    result["invalid_categories"] = sorted(seen_invalid_cats)

    if result["all_zero_item_a_aux"] > 0 or result["all_zero_item_b_aux"] > 0:
        result["issues"].append(
            f"P0 BUG: {result['all_zero_item_a_aux']}/{result['total_samples']} "
            f"item_a_aux and {result['all_zero_item_b_aux']}/{result['total_samples']} "
            f"item_b_aux are all-zero. Model trains with zero auxiliary signal."
        )
        result["valid"] = False

    if result["all_zero_pair_aux"] > result["total_samples"] * 0.5:
        result["issues"].append(
            f"Majority of pair_aux vectors ({result['all_zero_pair_aux']}/{result['total_samples']}) "
            f"are all-zero."
        )

    if result["missing_fields"]:
        result["issues"].append(
            f"Missing item-level metadata fields: {result['missing_fields']}. "
            f"These are needed for rich feature extraction. "
            f"Currently features are derived from category name only."
        )

    if strict and result["issues"]:
        raise ValueError("Dataset validation failed:\n" + "\n".join(result["issues"]))

    return result
