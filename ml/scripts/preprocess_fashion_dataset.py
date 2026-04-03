"""
数据预处理脚本
将 Fashion Product Images 数据集转换为训练所需格式
"""

import os
import sys
import json
import csv
import random
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict
from tqdm import tqdm

PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_RAW = PROJECT_ROOT / "data" / "raw"
DATA_PROCESSED = PROJECT_ROOT / "ml" / "data" / "processed"

IMAGES_DIR = DATA_RAW / "fashion-dataset-full" / "fashion-dataset" / "images"
STYLES_CSV = DATA_RAW / "styles.csv"
STYLES_DIR = DATA_RAW / "fashion-dataset-full" / "fashion-dataset" / "styles"


def load_styles_csv() -> Dict[int, Dict]:
    """加载 styles.csv 元数据"""
    print("加载 styles.csv...")
    items = {}
    
    with open(STYLES_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in tqdm(reader, desc="读取 CSV"):
            try:
                item_id = int(row['id'])
                items[item_id] = {
                    'id': item_id,
                    'gender': row.get('gender', '').strip(),
                    'masterCategory': row.get('masterCategory', '').strip(),
                    'subCategory': row.get('subCategory', '').strip(),
                    'articleType': row.get('articleType', '').strip(),
                    'baseColour': row.get('baseColour', '').strip(),
                    'season': row.get('season', '').strip(),
                    'year': row.get('year', '').strip(),
                    'usage': row.get('usage', '').strip(),
                    'productDisplayName': row.get('productDisplayName', '').strip(),
                }
            except (ValueError, KeyError) as e:
                continue
    
    print(f"加载 {len(items)} 条记录")
    return items


def filter_valid_items(items: Dict[int, Dict]) -> Dict[int, Dict]:
    """过滤有对应图片的记录"""
    print("过滤有效记录...")
    valid_items = {}
    
    for item_id, item in tqdm(items.items(), desc="检查图片"):
        image_path = IMAGES_DIR / f"{item_id}.jpg"
        if image_path.exists():
            item['image_path'] = str(image_path)
            item['image_exists'] = True
            valid_items[item_id] = item
    
    print(f"有效记录: {len(valid_items)} / {len(items)}")
    return valid_items


def convert_to_training_format(items: Dict[int, Dict]) -> Dict[str, Dict]:
    """转换为训练脚期望的格式"""
    print("转换数据格式...")
    
    category_mapping = {
        'Apparel': 'tops',
        'Accessories': 'accessories',
        'Footwear': 'shoes',
        'Personal Care': 'accessories',
        'Free Items': 'accessories',
        'Sporting Goods': 'sportswear',
        'Home': 'home',
    }
    
    subcategory_mapping = {
        'Topwear': 'tops',
        'Bottomwear': 'bottoms',
        'Dress': 'dresses',
        'Socks': 'accessories',
        'Saree': 'dresses',
        'Kurta': 'tops',
        'Tshirts': 'tops',
        'Shirts': 'tops',
        'Tops': 'tops',
        'Jeans': 'bottoms',
        'Trousers': 'bottoms',
        'Shorts': 'bottoms',
        'Skirts': 'bottoms',
        'Jackets': 'outerwear',
        'Sweaters': 'tops',
        'Sweatshirts': 'tops',
        'Tracksuits': 'sportswear',
        'Sandals': 'shoes',
        'Sports Shoes': 'shoes',
        'Casual Shoes': 'shoes',
        'Heels': 'shoes',
        'Flats': 'shoes',
        'Flip Flops': 'shoes',
        'Formal Shoes': 'shoes',
    }
    
    converted = {}
    
    for item_id, item in tqdm(items.items(), desc="转换格式"):
        master_cat = item.get('masterCategory', '')
        sub_cat = item.get('subCategory', '')
        
        category = subcategory_mapping.get(sub_cat, category_mapping.get(master_cat, 'other'))
        
        style_tags = []
        if item.get('usage'):
            style_tags.append(item['usage'].lower())
        if item.get('articleType'):
            style_tags.append(item['articleType'].lower())
        
        color_tags = []
        if item.get('baseColour'):
            color_tags.append(item['baseColour'].lower())
        
        season_tags = []
        if item.get('season'):
            season_tags.append(item['season'].lower())
        
        occasion_tags = []
        usage = item.get('usage', '').lower()
        if 'casual' in usage or 'casual' in item.get('productDisplayName', '').lower():
            occasion_tags.append('casual')
        if 'formal' in usage or 'formal' in item.get('productDisplayName', '').lower():
            occasion_tags.append('formal')
        if 'sports' in usage or 'sport' in item.get('productDisplayName', '').lower():
            occasion_tags.append('sports')
        if not occasion_tags:
            occasion_tags.append('daily')
        
        gender_map = {
            'Men': 'male',
            'Women': 'female',
            'Boys': 'male',
            'Girls': 'female',
            'Unisex': 'unisex'
        }
        
        converted[str(item_id)] = {
            'id': str(item_id),
            'category': category,
            'style_tags': style_tags,
            'color_tags': color_tags,
            'occasion_tags': occasion_tags,
            'season_tags': season_tags,
            'gender': gender_map.get(item.get('gender', ''), 'unisex'),
            'product_name': item.get('productDisplayName', ''),
            'image_path': item.get('image_path', ''),
            'source': 'fashion_product_images',
            'attributes': {
                'masterCategory': item.get('masterCategory', ''),
                'subCategory': item.get('subCategory', ''),
                'articleType': item.get('articleType', ''),
                'baseColour': item.get('baseColour', ''),
                'season': item.get('season', ''),
                'usage': item.get('usage', ''),
            }
        }
    
    return converted


def generate_outfits(items: Dict[str, Dict], num_outfits: int = 5000) -> Dict[str, Dict]:
    """生成搭配数据"""
    print("生成搭配数据...")
    
    by_category = defaultdict(list)
    by_gender = defaultdict(list)
    by_season = defaultdict(list)
    
    for item_id, item in items.items():
        by_category[item['category']].append(item_id)
        by_gender[item['gender']].append(item_id)
        by_season[item.get('season_tags', ['all'])[0] if item.get('season_tags') else 'all'].append(item_id)
    
    outfits = {}
    outfit_id = 1
    
    category_pairs = [
        ('tops', 'bottoms'),
        ('tops', 'shoes'),
        ('bottoms', 'shoes'),
        ('dresses', 'shoes'),
        ('tops', 'accessories'),
        ('outerwear', 'bottoms'),
    ]
    
    style_keywords = ['casual', 'formal', 'sport', 'vintage', 'modern', 'classic']
    
    for _ in tqdm(range(num_outfits), desc="生成搭配"):
        cat1, cat2 = random.choice(category_pairs)
        
        if cat1 not in by_category or cat2 not in by_category:
            continue
        
        item1_id = random.choice(by_category[cat1])
        item2_id = random.choice(by_category[cat2])
        
        if item1_id == item2_id:
            continue
        
        item1 = items[item1_id]
        item2 = items[item2_id]
        
        if item1['gender'] != item2['gender'] and item1['gender'] != 'unisex' and item2['gender'] != 'unisex':
            continue
        
        compatibility = 0.7 + random.random() * 0.25
        
        if item1.get('season_tags') and item2.get('season_tags'):
            if set(item1['season_tags']) & set(item2['season_tags']):
                compatibility += 0.1
        
        if item1.get('color_tags') and item2.get('color_tags'):
            compatibility += 0.05
        
        compatibility = min(compatibility, 0.98)
        
        style = random.choice(style_keywords)
        occasion = random.choice(['daily', 'casual', 'formal', 'party', 'work', 'weekend'])
        
        outfits[f"outfit_{outfit_id}"] = {
            'items': [item1_id, item2_id],
            'compatibility_score': round(compatibility, 2),
            'style': style,
            'occasion': occasion,
            'season': item1.get('season_tags', ['all'])[0] if item1.get('season_tags') else 'all',
            'gender': item1['gender']
        }
        
        outfit_id += 1
    
    print(f"生成 {len(outfits)} 套搭配")
    return outfits


def generate_stats(items: Dict, outfits: Dict) -> Dict:
    """生成统计信息"""
    categories = defaultdict(int)
    for item in items.values():
        categories[item['category']] += 1
    
    return {
        'total_items': len(items),
        'total_outfits': len(outfits),
        'categories': dict(categories),
        'source': 'fashion_product_images',
        'image_resolution': '1800x2400'
    }


def main():
    print("=" * 60)
    print("  Fashion Product Images 数据预处理")
    print("=" * 60)
    
    items_raw = load_styles_csv()
    
    items_valid = filter_valid_items(items_raw)
    
    items_converted = convert_to_training_format(items_valid)
    
    outfits = generate_outfits(items_converted, num_outfits=10000)
    
    stats = generate_stats(items_converted, outfits)
    
    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    
    print("\n保存处理后的数据...")
    
    with open(DATA_PROCESSED / 'items.json', 'w', encoding='utf-8') as f:
        json.dump(items_converted, f, ensure_ascii=False, indent=2)
    print(f"  items.json: {len(items_converted)} 条")
    
    with open(DATA_PROCESSED / 'outfits.json', 'w', encoding='utf-8') as f:
        json.dump(outfits, f, ensure_ascii=False, indent=2)
    print(f"  outfits.json: {len(outfits)} 套")
    
    with open(DATA_PROCESSED / 'stats.json', 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"  stats.json: {stats}")
    
    print("\n✅ 数据预处理完成!")
    print(f"输出目录: {DATA_PROCESSED}")


if __name__ == "__main__":
    main()
