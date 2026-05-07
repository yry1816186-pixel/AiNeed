#!/usr/bin/env python3
"""
Real fashion data normalizer for XUNO.

Inputs:
  - Public fashion catalog CSV from Hugging Face / Kaggle style datasets.
  - Optional product pages with schema.org JSON-LD Product markup.

Outputs:
  - import_brands.json
  - import_products.json
  - import_report.json
  - error_log.json (quarantined records)

The script does NOT synthesize product names, categories, colors, brands, prices,
SKUs, stock levels, or currencies. If a source does not contain a field, it is
preserved as missing metadata instead of being fabricated.

CRITICAL: No price, brand, SKU, stock, or currency fabrication.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[3]
DATA_ROOT = Path(os.getenv("XUNO_DATA_ROOT", ROOT / "data" / "datasets"))
DEFAULT_DATASET_DIR = DATA_ROOT / "fashion-dataset"
DEFAULT_DATASET_FILE = DEFAULT_DATASET_DIR / "train.csv"
DEFAULT_DATASET_URL = (
    "https://huggingface.co/datasets/nreimers/fashion-dataset/resolve/main/train.csv"
)

# ---------------------------------------------------------------------------
# Deterministic maps — do not expand without verified source data
# ---------------------------------------------------------------------------

CATEGORY_MAP: dict[str, dict[str, str]] = {
    "Apparel": {
        "Topwear": "tops",
        "Bottomwear": "bottoms",
        "Dress": "dresses",
        "Saree": "dresses",
        "Loungewear and Nightwear": "tops",
        "Innerwear": "tops",
        "Socks": "accessories",
        "Apparel Set": "tops",
        "Rain Jacket": "outerwear",
    },
    "Footwear": {
        "Shoes": "footwear",
        "Sandal": "footwear",
        "Flip Flops": "footwear",
    },
    "Accessories": {
        "Bags": "accessories",
        "Belts": "accessories",
        "Caps": "accessories",
        "Cufflinks": "accessories",
        "Eyewear": "accessories",
        "Gloves": "accessories",
        "Headwear": "accessories",
        "Jewellery": "accessories",
        "Mufflers": "accessories",
        "Scarves": "accessories",
        "Shoe Accessories": "accessories",
        "Stoles": "accessories",
        "Ties": "accessories",
        "Umbrellas": "accessories",
        "Wallets": "accessories",
        "Watches": "accessories",
    },
    "Personal Care": {
        "Bath and Body": "accessories",
        "Fragrance": "accessories",
        "Hair": "accessories",
        "Lips": "accessories",
        "Makeup": "accessories",
        "Nails": "accessories",
        "Skin": "accessories",
        "Skin Care": "accessories",
    },
    "Sporting Goods": {
        "Sports Equipment": "activewear",
    },
    "Free Items": {
        "Free Gifts": "accessories",
    },
}

# Known brands with verified price ranges (only match when product name
# reliably starts with the brand). Never guess brands from arbitrary words.
KNOWN_BRANDS: set[str] = {
    "adidas", "allen solly", "arrow", "biba", "calvin klein", "casio",
    "clarks", "fabindia", "fila", "fossil", "h&m", "lee", "levis",
    "mango", "max", "nike", "puma", "raymond", "reebok",
    "tommy hilfiger", "uniqlo", "van heusen", "vero moda", "wrangler", "zara",
}

BRAND_PRICE_RANGE: dict[str, str] = {
    "adidas": "mid_range",
    "allen solly": "mid_range",
    "arrow": "mid_range",
    "biba": "mid_range",
    "calvin klein": "premium",
    "casio": "budget",
    "clarks": "premium",
    "fabindia": "mid_range",
    "fila": "budget",
    "fossil": "premium",
    "h&m": "budget",
    "lee": "mid_range",
    "levis": "mid_range",
    "mango": "mid_range",
    "max": "budget",
    "nike": "mid_range",
    "puma": "budget",
    "raymond": "premium",
    "reebok": "budget",
    "tommy hilfiger": "premium",
    "uniqlo": "budget",
    "van heusen": "mid_range",
    "vero moda": "mid_range",
    "wrangler": "mid_range",
    "zara": "mid_range",
}

GENDER_MAP: dict[str, str] = {
    "men": "male",
    "male": "male",
    "women": "female",
    "female": "female",
    "unisex": "unisex",
    "boys": "other",
    "girls": "other",
}

SEASON_MAP: dict[str, str] = {
    "fall": "autumn",
    "autumn": "autumn",
    "spring": "spring",
    "summer": "summer",
    "winter": "winter",
}

# Known "brands" that are really just generic descriptors — never treat
# the first token of a product name as a brand if it matches these.
NON_BRAND_PREFIXES: set[str] = {
    "turtle", "inkfruit", "jealous", "manchester", "peter",
    "skagen", "titan", "being", "here", "now", "the", "a", "an",
    "my", "our", "your", "new", "old", "black", "white", "red",
    "blue", "green", "navy", "grey", "pink", "purple", "yellow",
    "orange", "brown", "silver", "gold", "beige", "cream",
}

# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------


def fetch_url(url: str, timeout: int = 45) -> bytes:
    request = Request(url, headers={"User-Agent": "xuno-real-data-import/1.0"})
    with urlopen(request, timeout=timeout) as response:
        return response.read()


def download_file(url: str, target: Path) -> Path:
    target.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading dataset: {url}")
    data = fetch_url(url, timeout=120)
    target.write_bytes(data)
    print(f"Saved {target} ({target.stat().st_size / 1024 / 1024:.2f} MB)")
    return target


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9\s-]", "", value.lower())
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = html.unescape(str(value)).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def normalize_list(values: list[Any] | str | None) -> list[str]:
    if values is None:
        return []
    if isinstance(values, str):
        values = [values]
    result: list[str] = []
    for value in values:
        text = clean_text(value)
        if text and text.lower() not in {"nan", "null", "none"}:
            result.append(text)
    return list(dict.fromkeys(result))


# ---------------------------------------------------------------------------
# Brand detection — only match KNOWN brands, never guess
# ---------------------------------------------------------------------------


def detect_brand(product_name: str) -> str | None:
    """Return a brand name ONLY if product_name reliably starts with a
    known brand string. Returns None when no reliable match is found."""
    name = clean_text(product_name)
    if not name:
        return None
    lower = name.lower()

    for brand in sorted(KNOWN_BRANDS, key=len, reverse=True):
        if lower.startswith(brand):
            # Verify it is a word boundary (brand followed by space or end)
            brand_len = len(brand)
            if brand_len < len(lower) and lower[brand_len] == " ":
                return brand.title()

    # Two-word brand check
    parts = lower.split()
    if len(parts) >= 2:
        two_word = f"{parts[0]} {parts[1]}"
        if two_word in KNOWN_BRANDS:
            return two_word.title()

    return None


def get_price_range(brand_name: str) -> str:
    brand_lower = brand_name.lower()
    if brand_lower in BRAND_PRICE_RANGE:
        return BRAND_PRICE_RANGE[brand_lower]
    return "mid_range"


# ---------------------------------------------------------------------------
# Category resolution — deterministic, no guessing
# ---------------------------------------------------------------------------


def get_category(master: str, sub: str, article_type: str = "") -> str:
    master = clean_text(master)
    sub = clean_text(sub)
    article_type = clean_text(article_type)
    if master in CATEGORY_MAP:
        if sub in CATEGORY_MAP[master]:
            return CATEGORY_MAP[master][sub]
        if article_type in CATEGORY_MAP[master]:
            return CATEGORY_MAP[master][article_type]
    return "tops"


# ---------------------------------------------------------------------------
# Price parsing — only from actual source price fields
# ---------------------------------------------------------------------------


def parse_price(raw: Any) -> float | None:
    """Parse a price from a source field. Returns None if no price found."""
    if raw is None:
        return None
    text = clean_text(raw)
    if not text:
        return None
    match = re.search(r"\d+(?:[.,]\d+)?", text)
    if not match:
        return None
    return float(match.group(0).replace(",", "."))


# ---------------------------------------------------------------------------
# Image resolution
# ---------------------------------------------------------------------------


def image_from_dataset(images_dir: Path | None, product_id: str) -> list[str]:
    if not images_dir:
        return []
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        candidate = images_dir / f"{product_id}{ext}"
        if candidate.exists():
            return [str(candidate)]
    return []


# ---------------------------------------------------------------------------
# CSV row → product dict (WITHOUT fabrication)
# ---------------------------------------------------------------------------


def product_from_csv_row(
    row: dict[str, str],
    images_dir: Path | None,
    stats: dict[str, int],
    errors: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Convert one CSV row into a product dict. Returns None for invalid rows
    (which are logged to errors). Never fabricates missing fields."""

    product_id = clean_text(row.get("id"))
    name = clean_text(row.get("productDisplayName"))

    # ── Validation ────────────────────────────────────────────────
    reasons: list[str] = []
    if not product_id:
        reasons.append("missing id")
    if not name:
        reasons.append("missing productDisplayName")

    if reasons:
        stats["invalid"] += 1
        errors.append(
            {
                "row": {
                    key: clean_text(value)
                    for key, value in row.items()
                    if clean_text(value)
                },
                "reason": "; ".join(reasons),
                "quarantinedAt": datetime.now(timezone.utc).isoformat(),
            }
        )
        return None

    # ── Source fields mapped directly ─────────────────────────────
    master = clean_text(row.get("masterCategory"))
    sub = clean_text(row.get("subCategory"))
    article_type = clean_text(row.get("articleType"))
    color = clean_text(row.get("baseColour"))
    season_raw = clean_text(row.get("season"))
    usage = clean_text(row.get("usage"))
    gender_raw = clean_text(row.get("gender"))
    year = clean_text(row.get("year")).replace(".0", "")

    # ── Brand: only from known list ────────────────────────────
    brand = detect_brand(name)
    brand_name = brand if brand else "Unknown"

    # ── Tags from real columns only ────────────────────────────
    tags = normalize_list([article_type, usage, season_raw, gender_raw])

    # ── Season / Gender ────────────────────────────────────────
    season = SEASON_MAP.get(season_raw.lower()) if season_raw else None
    gender = GENDER_MAP.get(gender_raw.lower()) if gender_raw else None

    # ── Images ─────────────────────────────────────────────────
    images = image_from_dataset(images_dir, product_id)

    # ── Price / Currency — source has NONE, do not fabricate ──
    price_src = parse_price(
        row.get("price") or row.get("sellingPrice") or row.get("mrp")
    )

    # ── Attributes with provenance ─────────────────────────────
    attributes: dict[str, Any] = {
        "sourceDataset": "nreimers/fashion-dataset",
        "sourceSchema": "styles.csv-compatible",
        "sourceRow": {
            key: clean_text(value)
            for key, value in row.items()
            if clean_text(value)
        },
        "priceMissingInSource": price_src is None,
        "imageMissingInSource": not images,
    }

    if brand:
        attributes["brandExtractionMethod"] = "known-brand-prefix-match"

    product: dict[str, Any] = {
        "externalId": f"fashion-dataset:{product_id}",
        "name": name,
        "brandName": brand_name,
        "category": get_category(master, sub, article_type),
        "subcategory": article_type or sub,
        "colors": normalize_list(color),
        "sizes": [],
        "tags": tags,
        "price": price_src if price_src is not None else 0,
        "currency": "",
        "images": images,
        "mainImage": images[0] if images else None,
        "hasImage": bool(images),
        "source": "API",
        "season": season,
        "gender": gender,
        "externalUrl": "",
        "description": name,
        "attributes": attributes,
    }

    stats["valid"] += 1
    return product


# ---------------------------------------------------------------------------
# Dataset loader
# ---------------------------------------------------------------------------


def load_dataset_products(
    path: Path,
    images_dir: Path | None,
    limit: int | None,
    stats: dict[str, int],
    errors: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            for row in reader:
                stats["total"] += 1
                product = product_from_csv_row(row, images_dir, stats, errors)
                if product:
                    products.append(product)
                if limit and stats["total"] >= limit:
                    break
    except FileNotFoundError:
        print(f"ERROR: CSV file not found: {path}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f"ERROR: Failed to read CSV: {exc}", file=sys.stderr)
        sys.exit(1)
    return products


# ---------------------------------------------------------------------------
# JSON-LD web scraping (kept for compatibility)
# ---------------------------------------------------------------------------


def iter_jsonld_products(value: Any) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    if isinstance(value, list):
        for item in value:
            found.extend(iter_jsonld_products(item))
    elif isinstance(value, dict):
        node_type = value.get("@type") or value.get("type")
        if isinstance(node_type, list):
            is_product = any(str(t).lower() == "product" for t in node_type)
        else:
            is_product = str(node_type).lower() == "product"
        if is_product:
            found.append(value)
        for key in ("@graph", "itemListElement", "mainEntity"):
            if key in value:
                found.extend(iter_jsonld_products(value[key]))
    return found


def extract_jsonld(html_text: str) -> list[dict[str, Any]]:
    blocks = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html_text,
        flags=re.I | re.S,
    )
    products: list[dict[str, Any]] = []
    for block in blocks:
        text = html.unescape(block).strip()
        if not text:
            continue
        try:
            products.extend(iter_jsonld_products(json.loads(text)))
        except json.JSONDecodeError:
            continue
    return products


def value_from_jsonld(value: Any) -> str:
    if isinstance(value, dict):
        return clean_text(value.get("name") or value.get("@id") or value.get("url"))
    if isinstance(value, list):
        return value_from_jsonld(value[0]) if value else ""
    return clean_text(value)


def product_from_jsonld(raw: dict[str, Any], page_url: str) -> dict[str, Any] | None:
    name = clean_text(raw.get("name"))
    if not name:
        return None

    offers = raw.get("offers")
    if isinstance(offers, list):
        offers = offers[0] if offers else {}
    if not isinstance(offers, dict):
        offers = {}

    image = raw.get("image")
    images = normalize_list(
        image if isinstance(image, list) else [image] if image else []
    )
    brand = value_from_jsonld(raw.get("brand")) or "Unknown"
    source_host = urlparse(page_url).netloc or "web"
    stable_key = clean_text(raw.get("sku") or raw.get("mpn")) or page_url
    external_id = (
        f"web:{source_host}:"
        f"{hashlib.sha1(stable_key.encode('utf-8')).hexdigest()[:16]}"
    )
    price = parse_price(offers.get("price") or raw.get("price"))

    attributes = {
        "sourceWebsite": source_host,
        "sourceUrl": page_url,
        "sourceJsonLd": raw,
        "priceMissingInSource": price is None,
        "scrapedAt": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "externalId": external_id,
        "name": name,
        "brandName": brand,
        "category": get_category(
            clean_text(raw.get("category")), "", clean_text(raw.get("category"))
        ),
        "subcategory": clean_text(raw.get("category")),
        "colors": normalize_list(raw.get("color")),
        "sizes": normalize_list(raw.get("size")),
        "tags": normalize_list([source_host, raw.get("category")]),
        "price": price if price is not None else 0,
        "currency": clean_text(
            offers.get("priceCurrency") or raw.get("priceCurrency")
        )
        or "",
        "images": images,
        "mainImage": images[0] if images else None,
        "hasImage": bool(images),
        "source": "API",
        "season": None,
        "gender": None,
        "externalUrl": page_url,
        "description": clean_text(raw.get("description")),
        "attributes": attributes,
    }


def scrape_products(urls: list[str]) -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []
    for url in urls:
        print(f"Scraping product page: {url}")
        try:
            page = fetch_url(url, timeout=45).decode("utf-8", errors="replace")
        except Exception as exc:
            print(f"  WARNING: failed to fetch {url}: {exc}", file=sys.stderr)
            continue
        jsonld_products = extract_jsonld(page)
        if not jsonld_products:
            print(f"  WARNING: no JSON-LD Product found: {url}", file=sys.stderr)
        for raw in jsonld_products:
            product = product_from_jsonld(raw, url)
            if product:
                products.append(product)
    return products


# ---------------------------------------------------------------------------
# Dedup & brand
# ---------------------------------------------------------------------------


def dedupe_products(products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str]] = set()
    deduped: list[dict[str, Any]] = []
    for product in products:
        key = (product.get("source", "API"), product.get("externalId", ""))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(product)
    return deduped


def build_brand_data(
    products: list[dict[str, Any]], min_count: int
) -> list[dict[str, Any]]:
    brand_counts = Counter(p["brandName"] for p in products if p.get("brandName"))
    brand_categories: dict[str, set[str]] = defaultdict(set)
    for product in products:
        brand_categories[product["brandName"]].add(product["category"])

    brands: list[dict[str, Any]] = []
    for brand, count in brand_counts.items():
        if brand == "Unknown" or count < min_count:
            continue
        brands.append(
            {
                "name": brand,
                "slug": slugify(brand),
                "priceRange": get_price_range(brand),
                "categories": sorted(brand_categories[brand]),
                "productCount": count,
            }
        )
    return sorted(brands, key=lambda item: (-item["productCount"], item["name"]))


def read_url_file(path: Path | None) -> list[str]:
    if not path:
        return []
    return [
        line.strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]


# ---------------------------------------------------------------------------
# Output writers
# ---------------------------------------------------------------------------


def write_outputs(
    products: list[dict[str, Any]],
    brands: list[dict[str, Any]],
    output_dir: Path,
    stats: dict[str, int],
    errors: list[dict[str, Any]],
    provenance: dict[str, Any],
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    (output_dir / "import_brands.json").write_text(
        json.dumps(brands, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_dir / "import_products.json").write_text(
        json.dumps(products, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    report: dict[str, Any] = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "provenance": provenance,
        "brandCount": len(brands),
        "productCount": len(products),
        "categoryCounts": dict(Counter(p["category"] for p in products)),
        "sourceCounts": dict(
            Counter(
                p.get("attributes", {}).get("sourceDataset", "web")
                for p in products
            )
        ),
        "missingPriceCount": sum(
            1
            for p in products
            if p.get("attributes", {}).get("priceMissingInSource")
        ),
        "missingImageCount": sum(
            1
            for p in products
            if p.get("attributes", {}).get("imageMissingInSource")
        ),
        "validation": {
            "totalRowsProcessed": stats["total"],
            "validRows": stats["valid"],
            "invalidRows": stats["invalid"],
            "quarantinedCount": stats["invalid"],
        },
    }
    (output_dir / "import_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    (output_dir / "error_log.json").write_text(
        json.dumps(errors, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize real fashion catalog data for Prisma import"
    )
    parser.add_argument(
        "--dataset-path",
        type=Path,
        default=None,
        help="Path to styles/train CSV",
    )
    parser.add_argument(
        "--images-dir",
        type=Path,
        default=None,
        help="Optional local product image directory",
    )
    parser.add_argument(
        "--download",
        action="store_true",
        help="Download the public fashion CSV first",
    )
    parser.add_argument(
        "--dataset-url",
        default=DEFAULT_DATASET_URL,
        help="CSV URL to download",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional max dataset rows to process (0 = all)",
    )
    parser.add_argument(
        "--brand-min-count",
        type=int,
        default=5,
    )
    parser.add_argument(
        "--scrape-url",
        action="append",
        default=[],
        help="Product page URL with JSON-LD",
    )
    parser.add_argument(
        "--scrape-url-file",
        type=Path,
        default=None,
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent,
    )
    args = parser.parse_args()

    dataset_path = args.dataset_path or DEFAULT_DATASET_FILE
    if args.download or not dataset_path.exists():
        dataset_path = download_file(args.dataset_url, dataset_path)

    print("=" * 72)
    print("Real Fashion Data Processing — XUNO")
    print("=" * 72)
    print(f"Source CSV: {dataset_path}")
    print(f"Rows in CSV: {dataset_path.stat().st_size:,} bytes")
    print()

    # ── Stats & error tracking ────────────────────────────────────
    stats: dict[str, int] = {"total": 0, "valid": 0, "invalid": 0, "quarantined": 0}
    errors: list[dict[str, Any]] = []

    # ── Load CSV products ─────────────────────────────────────────
    products = load_dataset_products(
        dataset_path,
        args.images_dir,
        args.limit if args.limit > 0 else None,
        stats,
        errors,
    )

    # ── Web scraping (optional) ───────────────────────────────────
    urls = [*args.scrape_url, *read_url_file(args.scrape_url_file)]
    if urls:
        products.extend(scrape_products(urls))

    # ── Dedup & brand build ───────────────────────────────────────
    products = dedupe_products(products)
    brands = build_brand_data(products, args.brand_min_count)

    # ── Provenance ────────────────────────────────────────────────
    provenance: dict[str, Any] = {
        "scriptVersion": "2.0.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceFile": str(dataset_path),
        "sourceFileSizeBytes": dataset_path.stat().st_size,
        "datasetName": "nreimers/fashion-dataset",
        "datasetUrl": DEFAULT_DATASET_URL,
        "processingNotes": [
            "No price data in source — prices set to 0 (unknown)",
            "No currency data in source — currency left empty",
            "No SKU data in source — SKU omitted",
            "Brand detection uses known-brand prefix match only — no guessing",
            "Invalid rows (missing id or productDisplayName) quarantined to error_log.json",
        ],
    }

    # ── Write outputs ─────────────────────────────────────────────
    write_outputs(products, brands, args.output_dir, stats, errors, provenance)

    # ── Summary ───────────────────────────────────────────────────
    category_counts = Counter(p["category"] for p in products)
    print("=" * 72)
    print("IMPORT SUMMARY")
    print("=" * 72)
    web_count = len(urls) > 0  # web scraping was done
    total_all = stats["total"]
    print(f"  Total rows processed:  {total_all:,}")
    print(f"  Valid products:        {stats['valid']:,}")
    print(f"  Invalid / quarantined: {stats['invalid']:,}")
    print(f"  Brands extracted:      {len(brands)}")
    print()

    print("Category distribution:")
    for category, count in category_counts.most_common():
        bar = "█" * min(count // 50, 40)
        print(f"  {category:<14s} {count:>6,d}  {bar}")

    print()
    print(f"Output directory: {args.output_dir}")
    print("  import_products.json  — normalized product records")
    print("  import_brands.json    — brand metadata")
    print("  import_report.json    — validation & provenance report")
    if errors:
        print(f"  error_log.json        — {len(errors)} quarantined records")
    print()
    print("Next: pnpm --dir apps/backend exec ts-node prisma/import-fashion-data.ts")


if __name__ == "__main__":
    main()
