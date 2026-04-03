"""
增强版数据生成器
生成更大规模的合成数据用于训练测试
"""

import json
import os
import random
import numpy as np
from pathlib import Path
from typing import Dict, List
from dataclasses import dataclass, field, asdict
from tqdm import tqdm


@dataclass
class ClothingItem:
    item_id: str
    name: str
    category: str
    price: float
    colors: List[str]
    styles: List[str]
    occasions: List[str]
    seasons: List[str]
    patterns: List[str]
    materials: List[str]
    fit: str
    brand: str
    attributes: Dict = field(default_factory=dict)


@dataclass
class User:
    user_id: str
    age: int
    gender: str
    height: float
    weight: float
    body_type: str
    skin_tone: str
    color_season: str
    style_preferences: List[str]
    budget_range: List[float]
    favorite_brands: List[str]
    occasions: List[str]


@dataclass
class Outfit:
    outfit_id: str
    items: List[str]
    compatibility_score: float
    style: str
    occasion: str
    season: str
    user_id: str = None


class EnhancedDataGenerator:
    """增强版数据生成器"""
    
    CATEGORIES = {
        "tops": ["t-shirt", "shirt", "blouse", "sweater", "hoodie", "cardigan", "tank_top", "polo"],
        "bottoms": ["jeans", "trousers", "shorts", "skirt", "leggings", "chinos"],
        "dresses": ["casual_dress", "formal_dress", "maxi_dress", "mini_dress", "midi_dress"],
        "outerwear": ["jacket", "coat", "blazer", "vest", "windbreaker", "trench_coat"],
        "footwear": ["sneakers", "boots", "heels", "flats", "sandals", "loafers"],
        "accessories": ["bag", "hat", "scarf", "belt", "watch", "sunglasses", "jewelry"]
    }
    
    STYLES = ["casual", "formal", "business", "sporty", "streetwear", "minimalist", 
              "bohemian", "vintage", "romantic", "edgy", "classic", "trendy"]
    
    OCCASIONS = ["daily", "work", "date", "party", "sport", "travel", "wedding", 
                 "interview", "beach", "gym", "dinner", "meeting"]
    
    SEASONS = ["spring", "summer", "autumn", "winter", "all_season"]
    
    COLORS = {
        "neutral": ["black", "white", "gray", "beige", "navy", "brown"],
        "warm": ["red", "orange", "yellow", "coral", "pink", "burgundy"],
        "cool": ["blue", "green", "purple", "teal", "lavender", "mint"],
        "earth": ["olive", "rust", "camel", "terracotta", "forest_green"]
    }
    
    PATTERNS = ["solid", "striped", "plaid", "floral", "geometric", "polka_dot", 
                "animal_print", "abstract", "checkered", "paisley"]
    
    MATERIALS = ["cotton", "silk", "wool", "linen", "denim", "leather", 
                 "polyester", "velvet", "chiffon", "cashmere", "suede"]
    
    FITS = ["slim", "regular", "loose", "oversized", "fitted"]
    
    BODY_TYPES = ["rectangle", "triangle", "inverted_triangle", "hourglass", "oval"]
    
    SKIN_TONES = ["fair", "light", "medium", "olive", "tan", "dark"]
    
    COLOR_SEASONS = ["spring", "summer", "autumn", "winter"]
    
    BRANDS = {
        "luxury": ["Gucci", "Prada", "Louis Vuitton", "Chanel", "Dior"],
        "premium": ["Ralph Lauren", "Tommy Hilfiger", "Calvin Klein", "Michael Kors"],
        "mid_range": ["Zara", "H&M", "Uniqlo", "Gap", "COS"],
        "budget": ["Primark", "Shein", "Forever 21", "ASOS"]
    }
    
    def __init__(self, output_dir: str = "data/processed"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.items: Dict[str, ClothingItem] = {}
        self.users: Dict[str, User] = {}
        self.outfits: Dict[str, Outfit] = {}
        self.interactions: List[Dict] = []
    
    def generate_items(self, num_items: int = 5000):
        """生成商品数据"""
        print(f"生成 {num_items} 件商品...")
        
        brand_list = []
        for brands in self.BRANDS.values():
            brand_list.extend(brands)
        
        item_id = 0
        for category, types in self.CATEGORIES.items():
            items_per_category = num_items // len(self.CATEGORIES)
            
            for _ in range(items_per_category):
                item_type = random.choice(types)
                brand_tier = random.choice(list(self.BRANDS.keys()))
                brand = random.choice(self.BRANDS[brand_tier])
                
                color_category = random.choice(list(self.COLORS.keys()))
                colors = random.sample(self.COLORS[color_category], k=random.randint(1, 2))
                
                styles = random.sample(self.STYLES, k=random.randint(1, 3))
                occasions = random.sample(self.OCCASIONS, k=random.randint(1, 3))
                seasons = random.sample(self.SEASONS, k=random.randint(1, 2))
                
                if brand_tier == "luxury":
                    price = random.uniform(500, 5000)
                elif brand_tier == "premium":
                    price = random.uniform(100, 500)
                elif brand_tier == "mid_range":
                    price = random.uniform(30, 150)
                else:
                    price = random.uniform(10, 50)
                
                item = ClothingItem(
                    item_id=f"item_{item_id:05d}",
                    name=f"{brand} {item_type.replace('_', ' ').title()}",
                    category=category,
                    price=round(price, 2),
                    colors=colors,
                    styles=styles,
                    occasions=occasions,
                    seasons=seasons,
                    patterns=random.sample(self.PATTERNS, k=random.randint(1, 2)),
                    materials=random.sample(self.MATERIALS, k=random.randint(1, 2)),
                    fit=random.choice(self.FITS),
                    brand=brand,
                    attributes={
                        "body_type_fit": random.sample(self.BODY_TYPES, k=random.randint(2, 4)),
                        "color_seasons": random.sample(self.COLOR_SEASONS, k=random.randint(2, 3)),
                        "tags": [f"tag_{i}" for i in random.sample(range(100), 5)]
                    }
                )
                
                self.items[item.item_id] = item
                item_id += 1
        
        print(f"生成完成: {len(self.items)} 件商品")
    
    def generate_users(self, num_users: int = 1000):
        """生成用户数据"""
        print(f"生成 {num_users} 个用户...")
        
        for i in tqdm(range(num_users)):
            gender = random.choice(["male", "female"])
            
            if gender == "male":
                height = random.uniform(1.65, 1.95)
                weight = random.uniform(60, 100)
            else:
                height = random.uniform(1.50, 1.80)
                weight = random.uniform(45, 80)
            
            budget_min = random.choice([50, 100, 200, 500])
            budget_max = budget_min * random.uniform(3, 10)
            
            brand_tier = random.choice(list(self.BRANDS.keys()))
            favorite_brands = random.sample(self.BRANDS[brand_tier], k=random.randint(2, 4))
            
            user = User(
                user_id=f"user_{i:05d}",
                age=random.randint(18, 65),
                gender=gender,
                height=round(height, 2),
                weight=round(weight, 1),
                body_type=random.choice(self.BODY_TYPES),
                skin_tone=random.choice(self.SKIN_TONES),
                color_season=random.choice(self.COLOR_SEASONS),
                style_preferences=random.sample(self.STYLES, k=random.randint(2, 4)),
                budget_range=[round(budget_min, 2), round(budget_max, 2)],
                favorite_brands=favorite_brands,
                occasions=random.sample(self.OCCASIONS, k=random.randint(2, 4))
            )
            
            self.users[user.user_id] = user
        
        print(f"生成完成: {len(self.users)} 个用户")
    
    def generate_outfits(self, num_outfits: int = 10000):
        """生成搭配数据"""
        print(f"生成 {num_outfits} 套搭配...")
        
        items_by_category = {}
        for item_id, item in self.items.items():
            if item.category not in items_by_category:
                items_by_category[item.category] = []
            items_by_category[item.category].append(item_id)
        
        for i in tqdm(range(num_outfits)):
            outfit_items = []
            
            if "tops" in items_by_category:
                outfit_items.append(random.choice(items_by_category["tops"]))
            
            if "bottoms" in items_by_category:
                outfit_items.append(random.choice(items_by_category["bottoms"]))
            
            if random.random() > 0.5 and "outerwear" in items_by_category:
                outfit_items.append(random.choice(items_by_category["outerwear"]))
            
            if random.random() > 0.6 and "footwear" in items_by_category:
                outfit_items.append(random.choice(items_by_category["footwear"]))
            
            if random.random() > 0.8 and "accessories" in items_by_category:
                outfit_items.append(random.choice(items_by_category["accessories"]))
            
            if len(outfit_items) < 2:
                continue
            
            item_objs = [self.items[i] for i in outfit_items]
            
            common_styles = set(item_objs[0].styles)
            for item in item_objs[1:]:
                common_styles &= set(item.styles)
            
            if common_styles:
                style = random.choice(list(common_styles))
                base_score = 0.7
            else:
                style = random.choice(self.STYLES)
                base_score = 0.5
            
            common_occasions = set(item_objs[0].occasions)
            for item in item_objs[1:]:
                common_occasions &= set(item.occasions)
            
            if common_occasions:
                occasion = random.choice(list(common_occasions))
                base_score += 0.1
            else:
                occasion = random.choice(self.OCCASIONS)
            
            common_seasons = set(item_objs[0].seasons)
            for item in item_objs[1:]:
                common_seasons &= set(item.seasons)
            
            if common_seasons:
                season = random.choice(list(common_seasons))
                base_score += 0.05
            else:
                season = random.choice(self.SEASONS)
            
            compatibility = min(base_score + random.uniform(-0.1, 0.2), 1.0)
            
            outfit = Outfit(
                outfit_id=f"outfit_{i:05d}",
                items=outfit_items,
                compatibility_score=round(compatibility, 3),
                style=style,
                occasion=occasion,
                season=season,
                user_id=random.choice(list(self.users.keys())) if random.random() > 0.3 else None
            )
            
            self.outfits[outfit.outfit_id] = outfit
        
        print(f"生成完成: {len(self.outfits)} 套搭配")
    
    def generate_interactions(self, num_interactions: int = 50000):
        """生成用户交互数据"""
        print(f"生成 {num_interactions} 条交互记录...")
        
        interaction_types = ["view", "like", "try_on", "purchase", "add_to_cart"]
        
        for _ in tqdm(range(num_interactions)):
            user_id = random.choice(list(self.users.keys()))
            item_id = random.choice(list(self.items.keys()))
            
            interaction = {
                "user_id": user_id,
                "item_id": item_id,
                "type": random.choice(interaction_types),
                "timestamp": random.randint(1609459200, 1704067200),
                "rating": random.randint(1, 5) if random.random() > 0.5 else None
            }
            
            self.interactions.append(interaction)
        
        print(f"生成完成: {len(self.interactions)} 条交互记录")
    
    def save_all(self):
        """保存所有数据"""
        print("保存数据...")
        
        items_data = {}
        for item_id, item in self.items.items():
            items_data[item_id] = asdict(item)
        
        with open(self.output_dir / "items.json", "w", encoding="utf-8") as f:
            json.dump(items_data, f, ensure_ascii=False, indent=2)
        
        users_data = {}
        for user_id, user in self.users.items():
            users_data[user_id] = asdict(user)
        
        with open(self.output_dir / "users.json", "w", encoding="utf-8") as f:
            json.dump(users_data, f, ensure_ascii=False, indent=2)
        
        outfits_data = {}
        for outfit_id, outfit in self.outfits.items():
            outfits_data[outfit_id] = asdict(outfit)
        
        with open(self.output_dir / "outfits.json", "w", encoding="utf-8") as f:
            json.dump(outfits_data, f, ensure_ascii=False, indent=2)
        
        with open(self.output_dir / "interactions.json", "w", encoding="utf-8") as f:
            json.dump(self.interactions, f, ensure_ascii=False, indent=2)
        
        stats = {
            "total_items": len(self.items),
            "total_users": len(self.users),
            "total_outfits": len(self.outfits),
            "total_interactions": len(self.interactions),
            "category_distribution": {},
            "style_distribution": {},
            "brand_distribution": {},
            "price_stats": {
                "min": min(i.price for i in self.items.values()),
                "max": max(i.price for i in self.items.values()),
                "mean": sum(i.price for i in self.items.values()) / len(self.items)
            }
        }
        
        for item in self.items.values():
            stats["category_distribution"][item.category] = \
                stats["category_distribution"].get(item.category, 0) + 1
            
            for style in item.styles:
                stats["style_distribution"][style] = \
                    stats["style_distribution"].get(style, 0) + 1
            
            stats["brand_distribution"][item.brand] = \
                stats["brand_distribution"].get(item.brand, 0) + 1
        
        with open(self.output_dir / "stats.json", "w", encoding="utf-8") as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        
        print(f"\n数据保存完成!")
        print(f"  商品: {stats['total_items']}")
        print(f"  用户: {stats['total_users']}")
        print(f"  搭配: {stats['total_outfits']}")
        print(f"  交互: {stats['total_interactions']}")
        print(f"  价格范围: ${stats['price_stats']['min']:.2f} - ${stats['price_stats']['max']:.2f}")


def main():
    generator = EnhancedDataGenerator("data/processed")
    
    generator.generate_items(num_items=5000)
    generator.generate_users(num_users=1000)
    generator.generate_outfits(num_outfits=10000)
    generator.generate_interactions(num_interactions=50000)
    generator.save_all()
    
    print("\n✅ 数据生成完成! 可以开始训练模型了。")


if __name__ == "__main__":
    main()
