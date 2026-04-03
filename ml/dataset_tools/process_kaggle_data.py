"""
处理下载的Kaggle数据集
将Fashion Product Images转换为训练格式
"""

import os
import json
import pandas as pd
from pathlib import Path
from typing import Dict, List
from PIL import Image
import shutil
from tqdm import tqdm


class FashionDataProcessor:
    """Fashion Product Images 数据处理器"""
    
    CATEGORY_MAP = {
        'Apparel': {
            'Topwear': 'tops',
            'Bottomwear': 'bottoms',
            'Dress': 'dresses',
            'Innerwear': 'tops',
            'Nightwear': 'tops',
            'Socks': 'accessories',
            'Loungewear': 'tops',
            'Apparel Set': 'tops',
        },
        'Accessories': {
            'Watches': 'accessories',
            'Belts': 'accessories',
            'Bags': 'accessories',
            'Jewellery': 'accessories',
            'Eyewear': 'accessories',
            'Headwear': 'accessories',
            'Scarves': 'accessories',
            'Gloves': 'accessories',
            'Ties': 'accessories',
            'Cufflinks': 'accessories',
            'Wallets': 'accessories',
            'Umbrellas': 'accessories',
            'Shoe Accessories': 'accessories',
            'Sports Accessories': 'accessories',
            'Stoles': 'accessories',
            'Mufflers': 'accessories',
        },
        'Footwear': {
            'Shoes': 'footwear',
            'Sandals': 'footwear',
            'Flip Flops': 'footwear',
            'Socks': 'accessories',
        },
        'Personal Care': {
            'Fragrance': 'accessories',
            'Nails': 'accessories',
            'Lips': 'accessories',
            'Hair': 'accessories',
            'Makeup': 'accessories',
            'Skin Care': 'accessories',
            'Bath and Body': 'accessories',
        },
        'Free Items': {
            'Free Items': 'accessories',
            'Vouchers': 'accessories',
        },
        'Sporting Goods': {
            'Sports Equipment': 'accessories',
        },
    }
    
    STYLE_MAP = {
        'Casual': 'casual',
        'Formal': 'formal',
        'Sports': 'sporty',
        'Ethnic': 'bohemian',
        'Smart Casual': 'casual',
        'Party': 'trendy',
        'Work': 'business',
        'Travel': 'casual',
    }
    
    SEASON_MAP = {
        'Summer': 'summer',
        'Winter': 'winter',
        'Spring': 'spring',
        'Fall': 'autumn',
        'Autumn': 'autumn',
    }
    
    def __init__(self, raw_dir: str, processed_dir: str):
        self.raw_dir = Path(raw_dir)
        self.processed_dir = Path(processed_dir)
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        
        self.items: Dict[str, dict] = {}
        self.outfits: Dict[str, dict] = {}
        self.users: Dict[str, dict] = {}
    
    def process_styles_csv(self):
        """处理styles.csv文件"""
        styles_path = self.raw_dir / 'styles.csv'
        
        if not styles_path.exists():
            print(f"styles.csv not found at {styles_path}")
            return
        
        print("Processing styles.csv...")
        
        df = pd.read_csv(styles_path, on_bad_lines='skip')
        
        images_dir = self.raw_dir / 'images'
        
        for _, row in tqdm(df.iterrows(), total=len(df)):
            item_id = str(row['id'])
            
            image_path = images_dir / f"{item_id}.jpg"
            if not image_path.exists():
                continue
            
            master_cat = row.get('masterCategory', 'Apparel')
            sub_cat = row.get('subCategory', 'Topwear')
            
            category = self.CATEGORY_MAP.get(master_cat, {}).get(sub_cat, 'accessories')
            
            base_color = str(row.get('baseColour', '')).lower() if pd.notna(row.get('baseColour')) else ''
            season = str(row.get('season', '')).lower() if pd.notna(row.get('season')) else ''
            usage = str(row.get('usage', '')).lower() if pd.notna(row.get('usage')) else ''
            gender = str(row.get('gender', '')).lower() if pd.notna(row.get('gender')) else ''
            
            style = self.STYLE_MAP.get(usage.title() if usage else '', 'casual')
            mapped_season = self.SEASON_MAP.get(season.title() if season else '', 'all_season')
            
            article_type = str(row.get('articleType', '')).lower() if pd.notna(row.get('articleType')) else ''
            product_name = str(row.get('productDisplayName', '')) if pd.notna(row.get('productDisplayName')) else ''
            
            item = {
                "item_id": item_id,
                "name": product_name,
                "category": category,
                "image_path": str(image_path),
                "attributes": {
                    "style": [style] if style else [],
                    "occasions": [],
                    "seasons": [mapped_season] if mapped_season else [],
                    "patterns": [],
                    "materials": [],
                    "colors": [base_color] if base_color else [],
                    "fit": "regular",
                    "article_type": article_type,
                    "gender": gender,
                },
                "price": 0,
                "brand": "Unknown"
            }
            
            self.items[item_id] = item
        
        print(f"Processed {len(self.items)} items from styles.csv")
    
    def generate_outfits_from_items(self, num_outfits: int = 5000):
        """基于商品生成搭配组合"""
        import random
        
        print(f"Generating {num_outfits} outfits...")
        
        items_by_category = {}
        for item_id, item in self.items.items():
            cat = item['category']
            if cat not in items_by_category:
                items_by_category[cat] = []
            items_by_category[cat].append(item_id)
        
        outfit_id = 0
        for _ in tqdm(range(num_outfits)):
            outfit_items = []
            
            if 'tops' in items_by_category and items_by_category['tops']:
                outfit_items.append(random.choice(items_by_category['tops']))
            
            if 'bottoms' in items_by_category and items_by_category['bottoms']:
                outfit_items.append(random.choice(items_by_category['bottoms']))
            
            if random.random() > 0.5 and 'footwear' in items_by_category:
                outfit_items.append(random.choice(items_by_category['footwear']))
            
            if random.random() > 0.7 and 'accessories' in items_by_category:
                outfit_items.append(random.choice(items_by_category['accessories']))
            
            if len(outfit_items) < 2:
                continue
            
            outfit = {
                "outfit_id": f"outfit_{outfit_id:05d}",
                "items": outfit_items,
                "compatibility_score": round(random.uniform(0.5, 1.0), 3),
                "style": random.choice(["casual", "formal", "sporty", "streetwear"]),
                "occasion": random.choice(["daily", "work", "party", "sport"]),
                "season": random.choice(["spring", "summer", "autumn", "winter"])
            }
            
            self.outfits[f"outfit_{outfit_id:05d}"] = outfit
            outfit_id += 1
        
        print(f"Generated {len(self.outfits)} outfits")
    
    def save_processed_data(self):
        """保存处理后的数据"""
        print("Saving processed data...")
        
        with open(self.processed_dir / "items.json", "w", encoding="utf-8") as f:
            json.dump(self.items, f, ensure_ascii=False, indent=2)
        
        with open(self.processed_dir / "outfits.json", "w", encoding="utf-8") as f:
            json.dump(self.outfits, f, ensure_ascii=False, indent=2)
        
        stats = {
            "total_items": len(self.items),
            "total_outfits": len(self.outfits),
            "category_distribution": {},
            "style_distribution": {}
        }
        
        for item in self.items.values():
            cat = item['category']
            stats['category_distribution'][cat] = stats['category_distribution'].get(cat, 0) + 1
            
            for style in item['attributes'].get('style', []):
                stats['style_distribution'][style] = stats['style_distribution'].get(style, 0) + 1
        
        with open(self.processed_dir / "stats.json", "w", encoding="utf-8") as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        
        print(f"Saved to {self.processed_dir}")
        print(f"Items: {stats['total_items']}")
        print(f"Outfits: {stats['total_outfits']}")


def main():
    processor = FashionDataProcessor(
        raw_dir="data/raw",
        processed_dir="data/processed"
    )
    
    processor.process_styles_csv()
    processor.generate_outfits_from_items(5000)
    processor.save_processed_data()
    
    print("\n✅ Data processing complete!")


if __name__ == "__main__":
    main()
