"""
服装数据集标注工具
支持关键点标注、属性标注、搭配标注
"""

import json
import os
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional
from enum import Enum


class ClothingCategory(Enum):
    TOPS = "tops"
    BOTTOMS = "bottoms"
    DRESSES = "dresses"
    OUTERWEAR = "outerwear"
    FOOTWEAR = "footwear"
    ACCESSORIES = "accessories"


class BodyType(Enum):
    RECTANGLE = "rectangle"
    TRIANGLE = "triangle"
    INVERTED_TRIANGLE = "inverted_triangle"
    HOURGLASS = "hourglass"
    OVAL = "oval"


class ColorSeason(Enum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"


@dataclass
class Keypoint:
    name: str
    x: float
    y: float
    visibility: int = 2  # 0=不可见, 1=遮挡, 2=可见


@dataclass
class BoundingBox:
    x: float
    y: float
    width: float
    height: float


@dataclass
class ClothingAttributes:
    style: List[str] = field(default_factory=list)
    occasions: List[str] = field(default_factory=list)
    seasons: List[str] = field(default_factory=list)
    patterns: List[str] = field(default_factory=list)
    materials: List[str] = field(default_factory=list)
    colors: List[str] = field(default_factory=list)
    fit: str = ""
    length: str = ""
    neckline: str = ""
    sleeve_length: str = ""


@dataclass
class ClothingItemAnnotation:
    item_id: str
    image_path: str
    category: str
    bounding_box: Optional[BoundingBox] = None
    keypoints: List[Keypoint] = field(default_factory=list)
    attributes: ClothingAttributes = field(default_factory=ClothingAttributes)
    embedding: Optional[List[float]] = None
    

@dataclass
class OutfitAnnotation:
    outfit_id: str
    items: List[str]  # item_ids
    compatibility_score: float  # 0-1
    style_tags: List[str] = field(default_factory=list)
    occasion: str = ""
    season: str = ""


@dataclass
class UserPreferenceAnnotation:
    user_id: str
    body_type: Optional[str] = None
    skin_tone: Optional[str] = None
    color_season: Optional[str] = None
    style_preferences: List[str] = field(default_factory=list)
    favorite_items: List[str] = field(default_factory=list)
    purchase_history: List[str] = field(default_factory=list)


CLOTHING_KEYPOINTS = {
    "tops": [
        "left_shoulder", "right_shoulder",
        "left_sleeve_top", "right_sleeve_top",
        "left_sleeve_bottom", "right_sleeve_bottom",
        "left_hem", "right_hem",
        "neckline_left", "neckline_right",
        "center_front"
    ],
    "bottoms": [
        "left_waist", "right_waist",
        "left_hip", "right_hip",
        "left_hem", "right_hem",
        "center_waist", "center_hem"
    ],
    "dresses": [
        "left_shoulder", "right_shoulder",
        "left_sleeve_top", "right_sleeve_top",
        "left_waist", "right_waist",
        "left_hem", "right_hem",
        "neckline_left", "neckline_right",
        "center_front"
    ],
    "footwear": [
        "toe_left", "toe_right",
        "heel_left", "heel_right",
        "ankle_left", "ankle_right",
        "center_top"
    ]
}

STYLE_CATEGORIES = [
    "casual", "formal", "business", "sporty", "bohemian",
    "minimalist", "streetwear", "vintage", "romantic",
    "edgy", "classic", "trendy", "chic", "elegant"
]

OCCASION_CATEGORIES = [
    "daily", "work", "date", "party", "sport",
    "travel", "wedding", "interview", "beach", "gym"
]

PATTERN_CATEGORIES = [
    "solid", "striped", "plaid", "floral", "geometric",
    "polka_dot", "animal_print", "abstract", "checkered"
]

MATERIAL_CATEGORIES = [
    "cotton", "silk", "wool", "linen", "denim",
    "leather", "polyester", "velvet", "chiffon", "cashmere"
]

COLOR_PALETTE = [
    "black", "white", "gray", "navy", "blue", "red", "pink",
    "green", "yellow", "orange", "purple", "brown", "beige",
    "burgundy", "teal", "coral", "mint", "lavender", "gold", "silver"
]


class DatasetAnnotationTool:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.items: Dict[str, ClothingItemAnnotation] = {}
        self.outfits: Dict[str, OutfitAnnotation] = {}
        self.users: Dict[str, UserPreferenceAnnotation] = {}
        
        os.makedirs(output_dir, exist_ok=True)
    
    def add_item(self, annotation: ClothingItemAnnotation):
        self.items[annotation.item_id] = annotation
    
    def add_outfit(self, annotation: OutfitAnnotation):
        self.outfits[annotation.outfit_id] = annotation
    
    def add_user(self, annotation: UserPreferenceAnnotation):
        self.users[annotation.user_id] = annotation
    
    def save(self):
        items_data = {
            item_id: self._item_to_dict(item) 
            for item_id, item in self.items.items()
        }
        
        with open(os.path.join(self.output_dir, "items.json"), "w", encoding="utf-8") as f:
            json.dump(items_data, f, ensure_ascii=False, indent=2)
        
        outfits_data = {
            outfit_id: asdict(outfit) 
            for outfit_id, outfit in self.outfits.items()
        }
        
        with open(os.path.join(self.output_dir, "outfits.json"), "w", encoding="utf-8") as f:
            json.dump(outfits_data, f, ensure_ascii=False, indent=2)
        
        users_data = {
            user_id: asdict(user) 
            for user_id, user in self.users.items()
        }
        
        with open(os.path.join(self.output_dir, "users.json"), "w", encoding="utf-8") as f:
            json.dump(users_data, f, ensure_ascii=False, indent=2)
        
        self._save_category_stats()
    
    def _item_to_dict(self, item: ClothingItemAnnotation) -> dict:
        data = asdict(item)
        if item.bounding_box:
            data["bounding_box"] = asdict(item.bounding_box)
        data["keypoints"] = [asdict(kp) for kp in item.keypoints]
        data["attributes"] = asdict(item.attributes)
        return data
    
    def _save_category_stats(self):
        stats = {
            "total_items": len(self.items),
            "total_outfits": len(self.outfits),
            "total_users": len(self.users),
            "category_distribution": {},
            "style_distribution": {},
            "color_distribution": {},
        }
        
        for item in self.items.values():
            cat = item.category
            stats["category_distribution"][cat] = stats["category_distribution"].get(cat, 0) + 1
            
            for style in item.attributes.style:
                stats["style_distribution"][style] = stats["style_distribution"].get(style, 0) + 1
            
            for color in item.attributes.colors:
                stats["color_distribution"][color] = stats["color_distribution"].get(color, 0) + 1
        
        with open(os.path.join(self.output_dir, "stats.json"), "w", encoding="utf-8") as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)


def create_sample_dataset():
    tool = DatasetAnnotationTool("./sample_dataset")
    
    item1 = ClothingItemAnnotation(
        item_id="item_001",
        image_path="images/top_001.jpg",
        category="tops",
        bounding_box=BoundingBox(x=100, y=150, width=200, height=300),
        keypoints=[
            Keypoint("left_shoulder", 120, 180, 2),
            Keypoint("right_shoulder", 280, 180, 2),
            Keypoint("neckline_left", 180, 160, 2),
            Keypoint("neckline_right", 220, 160, 2),
        ],
        attributes=ClothingAttributes(
            style=["casual", "minimalist"],
            occasions=["daily", "work"],
            seasons=["spring", "summer"],
            patterns=["solid"],
            materials=["cotton"],
            colors=["white"],
            fit="regular",
            length="regular",
            neckline="round",
            sleeve_length="short"
        )
    )
    tool.add_item(item1)
    
    item2 = ClothingItemAnnotation(
        item_id="item_002",
        image_path="images/bottom_001.jpg",
        category="bottoms",
        attributes=ClothingAttributes(
            style=["casual"],
            occasions=["daily"],
            seasons=["spring", "summer", "autumn"],
            patterns=["solid"],
            materials=["denim"],
            colors=["blue"],
            fit="regular",
            length="long"
        )
    )
    tool.add_item(item2)
    
    outfit = OutfitAnnotation(
        outfit_id="outfit_001",
        items=["item_001", "item_002"],
        compatibility_score=0.85,
        style_tags=["casual", "minimalist"],
        occasion="daily",
        season="summer"
    )
    tool.add_outfit(outfit)
    
    user = UserPreferenceAnnotation(
        user_id="user_001",
        body_type="hourglass",
        skin_tone="medium",
        color_season="summer",
        style_preferences=["casual", "minimalist", "classic"],
        favorite_items=["item_001"],
        purchase_history=["item_001", "item_002"]
    )
    tool.add_user(user)
    
    tool.save()
    print("Sample dataset created in ./sample_dataset")


if __name__ == "__main__":
    create_sample_dataset()
