import csv
import os
import sys
import json
import re
from collections import defaultdict
import requests
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATASET_PATH = r"C:\xuno\datasets\fashion-dataset\fashion-dataset\styles.csv"
IMAGES_PATH = r"C:\xuno\datasets\fashion-dataset\fashion-dataset\images"
API_BASE = "http://127.0.0.1:3001/api/v1"

CATEGORY_MAP = {
    "Apparel": {
        "Topwear": "tops",
        "Bottomwear": "bottoms",
        "Dress": "dresses",
        "Innerwear": "tops",
        "Saree": "dresses",
        "Loungewear and Nightwear": "tops",
        "Socks": "accessories",
        "Apparel Set": "tops",
    },
    "Footwear": {
        "Shoes": "footwear",
        "Sandal": "footwear",
        "Flip Flops": "footwear",
    },
    "Accessories": {
        "Watches": "accessories",
        "Bags": "accessories",
        "Belts": "accessories",
        "Jewellery": "accessories",
        "Eyewear": "accessories",
        "Scarves": "accessories",
        "Shoe Accessories": "accessories",
        "Cufflinks": "accessories",
        "Ties": "accessories",
        "Gloves": "accessories",
        "Mufflers": "accessories",
        "Wallets": "accessories",
        "Caps": "accessories",
        "Umbrellas": "accessories",
        "Headwear": "accessories",
        "Accessories": "accessories",
        "Stoles": "accessories",
    },
    "Personal Care": {
        "Fragrance": "accessories",
        "Lips": "accessories",
        "Nails": "accessories",
        "Makeup": "accessories",
        "Hair": "accessories",
        "Skin": "accessories",
        "Skin Care": "accessories",
        "Bath and Body": "accessories",
    },
    "Free Items": {
        "Free Gifts": "accessories",
    },
    "Sporting Goods": {
        "Sports Equipment": "activewear",
    },
}

BRAND_PRICE_MAP = {
    "puma": "budget",
    "nike": "mid_range",
    "adidas": "mid_range",
    "reebok": "budget",
    "fila": "budget",
    "levis": "mid_range",
    "wrangler": "mid_range",
    "lee": "mid_range",
    "pepe jeans": "mid_range",
    "flying machine": "mid_range",
    "arrow": "mid_range",
    "peter england": "budget",
    "john players": "budget",
    "van heusen": "mid_range",
    "allen solly": "mid_range",
    "park avenue": "mid_range",
    "raymond": "premium",
    "blackberrys": "mid_range",
    "w": "budget",
    "fabindia": "mid_range",
    "biba": "mid_range",
    "w for woman": "budget",
    "jealous 21": "budget",
    "only": "mid_range",
    "vero moda": "mid_range",
    "and": "budget",
    "global desi": "budget",
    "max": "budget",
    "roadster": "budget",
    "h&m": "budget",
    "uniqlo": "budget",
    "zara": "mid_range",
    "mango": "mid_range",
    "forever 21": "budget",
    "tommy hilfiger": "premium",
    "calvin klein": "premium",
    "nautica": "mid_range",
    "gap": "mid_range",
    "gas": "mid_range",
    "timberland": "premium",
    "clarks": "premium",
    "catwalk": "mid_range",
    "crocs": "mid_range",
    "fossil": "premium",
    "titan": "mid_range",
    "casio": "budget",
    "skagen": "mid_range",
    "police": "mid_range",
    "carrera": "mid_range",
    "maxima": "budget",
    "g-shock": "mid_range",
    "casio edifice": "mid_range",
}

def extract_brand(product_name):
    if not product_name:
        return "Unknown"
    parts = product_name.split()
    if len(parts) >= 2:
        brand_candidate = parts[0]
        if len(parts) >= 3 and parts[1].lower() in ["for", "men", "women", "unisex", "kids", "boys", "girls"]:
            return brand_candidate.title()
        if parts[1].lower() in ["men", "women", "unisex", "kids", "boys", "girls"]:
            return brand_candidate.title()
        two_word_brand = f"{parts[0]} {parts[1]}"
        if two_word_brand.lower() in BRAND_PRICE_MAP:
            return two_word_brand.title()
        return brand_candidate.title()
    return parts[0].title() if parts else "Unknown"

def get_category(master, sub):
    if master in CATEGORY_MAP:
        if sub in CATEGORY_MAP[master]:
            return CATEGORY_MAP[master][sub]
    return "tops"

def get_price_range(brand_name):
    brand_lower = brand_name.lower()
    if brand_lower in BRAND_PRICE_MAP:
        return BRAND_PRICE_MAP[brand_lower]
    for key, value in BRAND_PRICE_MAP.items():
        if key in brand_lower or brand_lower in key:
            return value
    return "mid_range"

def generate_slug(name):
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', name.lower())
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')

def generate_sku(product_id, category):
    return f"FN-{category.upper()[:3]}-{product_id}"

def estimate_price(brand_name, category, usage):
    base_prices = {
        "tops": 399,
        "bottoms": 599,
        "dresses": 799,
        "outerwear": 1299,
        "footwear": 899,
        "accessories": 499,
        "activewear": 599,
        "swimwear": 399,
    }
    base = base_prices.get(category, 499)
    brand_lower = brand_name.lower()
    if brand_lower in ["puma", "nike", "adidas", "reebok", "fila"]:
        base = int(base * 1.3)
    elif brand_lower in ["tommy hilfiger", "calvin klein", "raymond", "clarks", "fossil"]:
        base = int(base * 2.5)
    elif brand_lower in ["levis", "wrangler", "arrow", "van heusen", "allen solly"]:
        base = int(base * 1.5)
    if usage and usage.lower() == "formal":
        base = int(base * 1.3)
    elif usage and usage.lower() == "sports":
        base = int(base * 1.4)
    return base

def main():
    print("=" * 60)
    print("Fashion Dataset Import Script")
    print("=" * 60)
    
    if not os.path.exists(DATASET_PATH):
        print(f"ERROR: Dataset not found at {DATASET_PATH}")
        return
    
    products = []
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            products.append(row)
    
    print(f"Total products in dataset: {len(products)}")
    
    brands = defaultdict(lambda: {"count": 0, "categories": set(), "products": []})
    valid_products = []
    
    for p in products:
        master = p.get('masterCategory', '')
        sub = p.get('subCategory', '')
        if master in CATEGORY_MAP or master in ['Apparel', 'Footwear', 'Accessories']:
            brand = extract_brand(p.get('productDisplayName', ''))
            brands[brand]["count"] += 1
            brands[brand]["categories"].add(master)
            brands[brand]["products"].append(p)
            valid_products.append(p)
    
    print(f"Valid products for import: {len(valid_products)}")
    print(f"Unique brands extracted: {len(brands)}")
    
    print("\nTop 20 brands by product count:")
    sorted_brands = sorted(brands.items(), key=lambda x: x[1]["count"], reverse=True)[:20]
    for brand, data in sorted_brands:
        print(f"  {brand}: {data['count']} products")
    
    print("\n" + "=" * 60)
    print("Creating import data...")
    print("=" * 60)
    
    brand_data = []
    for brand_name, data in brands.items():
        if data["count"] >= 5:
            slug = generate_slug(brand_name)
            price_range = get_price_range(brand_name)
            brand_data.append({
                "name": brand_name,
                "slug": slug,
                "priceRange": price_range,
                "categories": list(data["categories"]),
                "productCount": data["count"]
            })
    
    print(f"Brands to import (with 5+ products): {len(brand_data)}")
    
    product_data = []
    for p in valid_products:
        product_id = p.get('id', '')
        name = p.get('productDisplayName', 'Unknown Product')
        brand = extract_brand(name)
        master = p.get('masterCategory', '')
        sub = p.get('subCategory', '')
        category = get_category(master, sub)
        color = p.get('baseColour', '')
        season = p.get('season', '')
        year = p.get('year', '')
        usage = p.get('usage', '')
        gender = p.get('gender', '')
        
        tags = []
        if season:
            tags.append(season)
        if year:
            tags.append(year)
        if usage:
            tags.append(usage)
        if gender:
            tags.append(gender)
        
        price = estimate_price(brand, category, usage)
        
        image_file = os.path.join(IMAGES_PATH, f"{product_id}.jpg")
        has_image = os.path.exists(image_file)
        
        product_data.append({
            "externalId": product_id,
            "name": name,
            "brandName": brand,
            "category": category,
            "subcategory": sub,
            "colors": [color] if color else [],
            "tags": tags,
            "price": price,
            "currency": "CNY",
            "hasImage": has_image,
            "attributes": {
                "gender": gender,
                "season": season,
                "year": year,
                "usage": usage,
                "masterCategory": master,
                "subCategory": sub,
                "baseColour": color
            }
        })
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    brands_file = os.path.join(output_dir, "import_brands.json")
    with open(brands_file, 'w', encoding='utf-8') as f:
        json.dump(brand_data, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(brand_data)} brands to {brands_file}")
    
    products_file = os.path.join(output_dir, "import_products.json")
    with open(products_file, 'w', encoding='utf-8') as f:
        json.dump(product_data, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(product_data)} products to {products_file}")
    
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total brands: {len(brand_data)}")
    print(f"Total products: {len(product_data)}")
    
    category_counts = defaultdict(int)
    for p in product_data:
        category_counts[p["category"]] += 1
    
    print("\nProducts by category:")
    for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count}")
    
    images_available = sum(1 for p in product_data if p["hasImage"])
    print(f"\nProducts with images: {images_available}")
    
    print("\nNext step: Run 'npx tsx prisma/import-fashion-data.ts' to import to database")

if __name__ == "__main__":
    main()
