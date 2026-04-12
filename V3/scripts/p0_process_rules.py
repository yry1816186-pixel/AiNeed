#!/usr/bin/env python3
"""AiNeed V3 - Phase 0: Fashion Rule Extraction from Raw Datasets

Extracts structured fashion matching rules from Polyvore outfits data
and Amazon Fashion metadata. Outputs rules in the canonical format:
    { id, category, condition, recommendation, confidence, source }

Categories:
    color_harmony / body_type / occasion / style_mix / seasonal
"""

import argparse
import gzip
import json
import logging
import os
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_ROOT / "data" / "raw"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
OUTPUT_FILE = PROCESSED_DIR / "fashion_rules.json"

VALID_CATEGORIES = {"color_harmony", "body_type", "occasion", "style_mix", "seasonal"}
RULE_ID_PREFIX = "p0r"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


def ensure_dirs() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def load_json(path: Path) -> Any:
    logger.info("Loading %s", path)
    if not path.exists():
        logger.warning("File not found: %s", path)
        return None
    if path.suffix == ".gz":
        with gzip.open(path, "rt", encoding="utf-8") as f:
            return json.load(f)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_jsonl(path: Path, limit: int = 0) -> list[dict]:
    logger.info("Loading JSONL %s (limit=%s)", path, limit or "all")
    if not path.exists():
        logger.warning("File not found: %s", path)
        return []
    records = []
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as f:
        for i, line in enumerate(f):
            if limit and i >= limit:
                break
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    logger.info("Loaded %d records from %s", len(records), path.name)
    return records


COLOR_NAMES = {
    "red": "红色", "blue": "蓝色", "green": "绿色", "black": "黑色",
    "white": "白色", "gray": "灰色", "grey": "灰色", "brown": "棕色",
    "pink": "粉色", "purple": "紫色", "orange": "橙色", "yellow": "黄色",
    "navy": "藏蓝", "beige": "米白", "cream": "奶油白", "khaki": "卡其",
    "camel": "驼色", "burgundy": "酒红", "olive": "橄榄绿", "teal": "青色",
    "maroon": "栗色", "coral": "珊瑚色", "tan": "棕褐", "gold": "金色",
    "silver": "银色", "ivory": "象牙白", "charcoal": "炭灰",
    "rust": "铁锈红", "mustard": "芥末黄", "emerald": "翠绿",
    "sage": "鼠尾草绿", "slate": "石板灰", "champagne": "香槟色",
    "mauve": "淡紫", "lavender": "薰衣草紫", "turquoise": "绿松石",
    "cobalt": "钴蓝", "copper": "铜色", "bronze": "青铜色",
    "magenta": "品红", "crimson": "绯红", "scarlet": "猩红",
    "indigo": "靛蓝", "cyan": "青色", "mint": "薄荷绿",
    "blush": "腮红粉", "nude": "裸色", "chocolate": "巧克力棕",
    "cognac": "干邑棕", "chestnut": "栗色", "slate_blue": "石板蓝",
}

SEASON_KEYWORDS = {
    "spring": "spring", "summer": "summer", "fall": "autumn", "autumn": "autumn",
    "winter": "winter", "spring/summer": "spring", "fall/winter": "autumn",
}

OCCASION_KEYWORDS = {
    "casual": "casual", "formal": "formal", "work": "work",
    "office": "work", "business": "work", "party": "party",
    "date": "date", "wedding": "formal", "outdoor": "sport",
    "sport": "sport", "athletic": "sport", "street": "casual",
    "evening": "party", "weekend": "casual", "vacation": "travel",
    "travel": "travel", "beach": "travel",
}

STYLE_KEYWORDS = {
    "vintage": "复古", "retro": "复古", "classic": "经典",
    "minimalist": "极简", "minimal": "极简", "bohemian": "波西米亚",
    "boho": "波西米亚", "preppy": "学院风", "streetwear": "街头",
    "street": "街头", "athleisure": "运动休闲", "chic": "时髦",
    "elegant": "优雅", "romantic": "浪漫", "punk": "朋克",
    "grunge": "垃圾风", "korean": "韩系", "japanese": "日系",
    "chinese": "国潮", "traditional": "传统", "modern": "现代",
    "contemporary": "现代", "sporty": "运动", "casual": "休闲",
    "business": "商务", "professional": "商务",
}


def extract_color_from_text(text: str) -> list[str]:
    if not text:
        return []
    text_lower = text.lower()
    found = []
    for eng, chn in COLOR_NAMES.items():
        if eng in text_lower:
            found.append(chn)
    return found


def extract_season_from_text(text: str) -> str | None:
    if not text:
        return None
    text_lower = text.lower()
    for kw, season in SEASON_KEYWORDS.items():
        if kw in text_lower:
            return season
    return None


def extract_occasion_from_text(text: str) -> str | None:
    if not text:
        return None
    text_lower = text.lower()
    for kw, occasion in OCCASION_KEYWORDS.items():
        if kw in text_lower:
            return occasion
    return None


def extract_style_from_text(text: str) -> str | None:
    if not text:
        return None
    text_lower = text.lower()
    for kw, style in STYLE_KEYWORDS.items():
        if kw in text_lower:
            return style
    return None


def make_rule_id(index: int) -> str:
    return f"{RULE_ID_PREFIX}_{index:05d}"


def extract_color_harmony_rules_from_polyvore(outfits: list[dict]) -> list[dict]:
    logger.info("Extracting color harmony rules from Polyvore outfits...")
    color_pairs = Counter()
    outfit_count = 0

    for outfit in outfits:
        items = outfit.get("items", []) or outfit.get("outfit_items", [])
        if not items:
            continue

        outfit_colors = []
        for item in items:
            name = item.get("name", "") or ""
            desc = item.get("description", "") or ""
            cats = " ".join(item.get("categories", []) or [])
            text = f"{name} {desc} {cats}"
            colors = extract_color_from_text(text)
            outfit_colors.extend(colors)

        unique_colors = list(dict.fromkeys(outfit_colors))
        for i in range(len(unique_colors)):
            for j in range(i + 1, len(unique_colors)):
                pair = tuple(sorted([unique_colors[i], unique_colors[j]]))
                color_pairs[pair] += 1
        outfit_count += 1

    logger.info("Analyzed %d outfits, found %d unique color pairs", outfit_count, len(color_pairs))

    rules = []
    min_freq = max(3, outfit_count // 500)
    for (color_a, color_b), freq in color_pairs.most_common(200):
        if freq < min_freq:
            break
        confidence = min(0.95, 0.5 + (freq / max(outfit_count, 1)) * 0.45)
        rules.append({
            "category": "color_harmony",
            "condition": {"colorA": color_a, "colorB": color_b},
            "recommendation": f"{color_a}与{color_b}搭配在{freq}个时尚搭配中出现，属于高频配色组合",
            "confidence": round(confidence, 2),
            "source": "Polyvore搭配统计",
        })

    logger.info("Extracted %d color harmony rules", len(rules))
    return rules


def extract_style_mix_rules_from_polyvore(outfits: list[dict]) -> list[dict]:
    logger.info("Extracting style mix rules from Polyvore outfits...")
    style_pairs = Counter()

    for outfit in outfits:
        items = outfit.get("items", []) or outfit.get("outfit_items", [])
        if not items:
            continue

        outfit_styles = []
        for item in items:
            name = item.get("name", "") or ""
            desc = item.get("description", "") or ""
            cats = " ".join(item.get("categories", []) or [])
            text = f"{name} {desc} {cats}"
            style = extract_style_from_text(text)
            if style:
                outfit_styles.append(style)

        unique_styles = list(dict.fromkeys(outfit_styles))
        for i in range(len(unique_styles)):
            for j in range(i + 1, len(unique_styles)):
                pair = tuple(sorted([unique_styles[i], unique_styles[j]]))
                style_pairs[pair] += 1

    rules = []
    for (style_a, style_b), freq in style_pairs.most_common(50):
        if freq < 2:
            break
        confidence = min(0.90, 0.5 + freq * 0.05)
        rules.append({
            "category": "style_mix",
            "condition": {"styleA": style_a, "styleB": style_b},
            "recommendation": f"{style_a}与{style_b}风格混搭在{freq}个搭配中出现，可尝试主次搭配",
            "confidence": round(confidence, 2),
            "source": "Polyvore搭配统计",
        })

    logger.info("Extracted %d style mix rules", len(rules))
    return rules


def extract_seasonal_rules_from_polyvore(outfits: list[dict]) -> list[dict]:
    logger.info("Extracting seasonal rules from Polyvore outfits...")
    season_items: dict[str, Counter] = {}
    season_colors: dict[str, Counter] = {}

    for outfit in outfits:
        items = outfit.get("items", []) or outfit.get("outfit_items", [])
        name = outfit.get("name", "") or ""
        desc = outfit.get("description", "") or ""
        outfit_text = f"{name} {desc}"

        season = extract_season_from_text(outfit_text)
        if not season:
            continue

        if season not in season_items:
            season_items[season] = Counter()
            season_colors[season] = Counter()

        for item in items:
            item_name = item.get("name", "") or ""
            cats = item.get("categories", []) or []
            if isinstance(cats, list) and cats:
                cat = cats[-1] if cats else ""
                season_items[season][cat] += 1

            text = f"{item_name} {' '.join(cats)}"
            colors = extract_color_from_text(text)
            for c in colors:
                season_colors[season][c] += 1

    season_chinese = {
        "spring": "春季", "summer": "夏季",
        "autumn": "秋季", "winter": "冬季",
    }

    rules = []
    for season, items_counter in season_items.items():
        cn = season_chinese.get(season, season)
        top_items = items_counter.most_common(10)
        if top_items:
            item_names = "、".join([item for item, _ in top_items[:5]])
            rules.append({
                "category": "seasonal",
                "condition": {"season": season},
                "recommendation": f"{cn}高频搭配单品：{item_names}",
                "confidence": 0.85,
                "source": "Polyvore搭配统计",
            })

        top_colors = season_colors.get(season, Counter()).most_common(8)
        if top_colors:
            color_names = "、".join([c for c, _ in top_colors[:5]])
            rules.append({
                "category": "seasonal",
                "condition": {"season": season, "color": "推荐"},
                "recommendation": f"{cn}推荐色彩：{color_names}",
                "confidence": 0.83,
                "source": "Polyvore搭配统计",
            })

    logger.info("Extracted %d seasonal rules", len(rules))
    return rules


def extract_occasion_rules_from_amazon(reviews: list[dict], meta: list[dict] | None) -> list[dict]:
    logger.info("Extracting occasion rules from Amazon Fashion data...")
    occasion_items: dict[str, Counter] = Counter()
    occasion_counter: dict[str, int] = Counter()

    for review in reviews:
        text = f"{review.get('reviewText', '')} {review.get('summary', '')}"
        occasion = extract_occasion_from_text(text)
        if not occasion:
            continue
        occasion_counter[occasion] += 1
        title = review.get("title", "") or ""
        if title:
            occasion_items[occasion] += 1

    occasion_chinese = {
        "work": "通勤", "casual": "休闲", "formal": "正式",
        "party": "派对", "date": "约会", "sport": "运动",
        "travel": "旅行",
    }

    rules = []
    for occasion, count in occasion_counter.most_common(10):
        cn = occasion_chinese.get(occasion, occasion)
        confidence = min(0.90, 0.6 + count * 0.001)
        rules.append({
            "category": "occasion",
            "condition": {"occasion": occasion},
            "recommendation": f"{cn}场合穿搭在用户评价中高频出现（{count}条提及），注意选择得体搭配",
            "confidence": round(confidence, 2),
            "source": "Amazon Fashion评价统计",
        })

    logger.info("Extracted %d occasion rules from Amazon data", len(rules))
    return rules


def extract_color_rules_from_amazon(meta: list[dict]) -> list[dict]:
    logger.info("Extracting color rules from Amazon Fashion metadata...")
    category_colors: dict[str, Counter] = {}

    for item in meta:
        cats = item.get("category", []) or []
        if not cats:
            continue
        cat = cats[-1] if isinstance(cats, list) else str(cats)
        title = item.get("title", "") or ""
        colors = extract_color_from_text(title)

        if cat not in category_colors:
            category_colors[cat] = Counter()
        for c in colors:
            category_colors[cat][c] += 1

    rules = []
    for cat, color_counter in list(category_colors.items())[:30]:
        top_colors = color_counter.most_common(3)
        if len(top_colors) < 2:
            continue
        color_names = [c for c, _ in top_colors]
        rules.append({
            "category": "color_harmony",
            "condition": {"category": cat, "topColors": color_names},
            "recommendation": f"{cat}类商品中{color_names[0]}与{color_names[1]}是常见配色",
            "confidence": 0.80,
            "source": "Amazon Fashion商品统计",
        })

    logger.info("Extracted %d color rules from Amazon metadata", len(rules))
    return rules


def load_existing_rules() -> list[dict]:
    kg_path = PROJECT_ROOT / "data" / "knowledge-graph" / "fashion-rules.json"
    if kg_path.exists():
        data = load_json(kg_path)
        if isinstance(data, list):
            logger.info("Loaded %d existing rules from knowledge-graph", len(data))
            return data
    return []


def merge_rules(existing: list[dict], new_rules: list[dict]) -> list[dict]:
    existing_keys = set()
    for r in existing:
        cat = r.get("category", "")
        cond = json.dumps(r.get("condition", {}), sort_keys=True, ensure_ascii=False)
        existing_keys.add((cat, cond))

    unique_new = []
    for r in new_rules:
        cat = r.get("category", "")
        cond = json.dumps(r.get("condition", {}), sort_keys=True, ensure_ascii=False)
        if (cat, cond) not in existing_keys:
            unique_new.append(r)
            existing_keys.add((cat, cond))

    logger.info("Merged: %d existing + %d new unique = %d total",
                len(existing), len(unique_new), len(existing) + len(unique_new))
    return existing + unique_new


def assign_ids(rules: list[dict]) -> list[dict]:
    for i, rule in enumerate(rules):
        if "id" not in rule or not rule["id"]:
            rule["id"] = make_rule_id(i)
    return rules


def process_polyvore(limit: int = 0) -> list[dict]:
    polyvore_dir = RAW_DIR / "polyvore"
    rules = []

    for filename in ["outfits.json", "polyvore_outfits.json", "train.json", "disjoint.json"]:
        filepath = polyvore_dir / filename
        if filepath.exists():
            data = load_json(filepath)
            if isinstance(data, list):
                outfits = data[:limit] if limit else data
                rules.extend(extract_color_harmony_rules_from_polyvore(outfits))
                rules.extend(extract_style_mix_rules_from_polyvore(outfits))
                rules.extend(extract_seasonal_rules_from_polyvore(outfits))
                break

    for filename in ["outfits.jsonl", "train.jsonl"]:
        filepath = polyvore_dir / filename
        if filepath.exists():
            outfits = load_jsonl(filepath, limit=limit)
            if outfits:
                rules.extend(extract_color_harmony_rules_from_polyvore(outfits))
                rules.extend(extract_style_mix_rules_from_polyvore(outfits))
                rules.extend(extract_seasonal_rules_from_polyvore(outfits))
                break

    if not rules:
        logger.warning("No Polyvore data found in %s", polyvore_dir)

    return rules


def process_amazon(limit: int = 0) -> list[dict]:
    amazon_dir = RAW_DIR / "amazon"
    rules = []

    for filename in ["Fashion.json.gz", "Fashion.json"]:
        filepath = amazon_dir / filename
        if filepath.exists():
            reviews = load_jsonl(filepath, limit=limit)
            if reviews:
                rules.extend(extract_occasion_rules_from_amazon(reviews, None))
                break

    for filename in ["meta_Fashion.json.gz", "meta_Fashion.json"]:
        filepath = amazon_dir / filename
        if filepath.exists():
            meta = load_jsonl(filepath, limit=limit or 50000)
            if meta:
                rules.extend(extract_color_rules_from_amazon(meta))
                break

    if not rules:
        logger.warning("No Amazon Fashion data found in %s", amazon_dir)

    return rules


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract fashion rules from raw datasets")
    parser.add_argument(
        "--limit", type=int, default=0,
        help="Limit number of raw records to process per dataset (0=all)",
    )
    parser.add_argument(
        "--merge-existing", action="store_true", default=True,
        help="Merge with existing knowledge-graph rules (default: True)",
    )
    parser.add_argument(
        "--no-merge-existing", action="store_false", dest="merge_existing",
        help="Do not merge with existing rules",
    )
    parser.add_argument(
        "--output", type=str, default=str(OUTPUT_FILE),
        help=f"Output file path (default: {OUTPUT_FILE})",
    )
    args = parser.parse_args()

    ensure_dirs()

    output_path = Path(args.output)
    logger.info("=== AiNeed V3 - Phase 0 Rule Extraction ===")
    logger.info("Raw data dir: %s", RAW_DIR)
    logger.info("Output: %s", output_path)

    all_new_rules = []

    polyvore_rules = process_polyvore(limit=args.limit)
    all_new_rules.extend(polyvore_rules)
    logger.info("Polyvore rules: %d", len(polyvore_rules))

    amazon_rules = process_amazon(limit=args.limit)
    all_new_rules.extend(amazon_rules)
    logger.info("Amazon rules: %d", len(amazon_rules))

    if args.merge_existing:
        existing = load_existing_rules()
        final_rules = merge_rules(existing, all_new_rules)
    else:
        final_rules = all_new_rules

    final_rules = assign_ids(final_rules)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(final_rules, f, ensure_ascii=False, indent=2)

    category_counts = Counter(r.get("category", "unknown") for r in final_rules)
    logger.info("=== Extraction Complete ===")
    logger.info("Total rules: %d", len(final_rules))
    for cat, count in sorted(category_counts.items()):
        logger.info("  %s: %d", cat, count)
    logger.info("Output saved to: %s", output_path)


if __name__ == "__main__":
    main()
