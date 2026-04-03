"""
数据下载和预处理脚本
自动下载公开数据集并转换为训练格式

Features:
- Idempotent processing (safe to run multiple times)
- Hash-based duplicate detection
- Incremental updates only
"""

import os
import json
import zipfile
import requests
import hashlib
from pathlib import Path
from typing import List, Dict, Set, Optional, Any
import shutil
from PIL import Image
import numpy as np
from tqdm import tqdm
from datetime import datetime


def compute_item_hash(item: Dict[str, Any]) -> str:
    """
    Compute a unique hash for a data item for idempotency checks.

    Args:
        item: Data item dictionary

    Returns:
        SHA256 hash string
    """
    # Create a deterministic string representation
    hash_components = []

    # Use item_id if available
    if "item_id" in item:
        hash_components.append(str(item["item_id"]))

    # Add image path if available
    if "image_path" in item:
        hash_components.append(str(item["image_path"]))

    # Add title for uniqueness
    if "title" in item:
        hash_components.append(str(item["title"]))

    # Add category
    if "category" in item:
        hash_components.append(str(item["category"]))

    # If no unique identifier, use all content
    if not hash_components:
        hash_components.append(json.dumps(item, sort_keys=True))

    content = "|".join(hash_components)
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def load_processed_hashes(processed_dir: Path) -> Set[str]:
    """
    Load set of already processed item hashes for idempotency.

    Args:
        processed_dir: Directory containing processed data

    Returns:
        Set of hash strings for already processed items
    """
    hashes_file = processed_dir / ".processed_hashes.json"

    if hashes_file.exists():
        try:
            with open(hashes_file, 'r', encoding='utf-8') as f:
                return set(json.load(f))
        except (json.JSONDecodeError, IOError):
            return set()

    return set()


def save_processed_hashes(processed_dir: Path, hashes: Set[str]) -> None:
    """
    Save processed item hashes for future runs.

    Args:
        processed_dir: Directory containing processed data
        hashes: Set of hash strings
    """
    hashes_file = processed_dir / ".processed_hashes.json"
    processed_dir.mkdir(parents=True, exist_ok=True)

    with open(hashes_file, 'w', encoding='utf-8') as f:
        json.dump(list(hashes), f)


def load_existing_data(processed_dir: Path) -> tuple:
    """
    Load existing processed data for idempotent updates.

    Args:
        processed_dir: Directory containing processed data

    Returns:
        Tuple of (items dict, outfits dict, users dict)
    """
    items = {}
    outfits = {}
    users = {}

    items_file = processed_dir / "items.json"
    if items_file.exists():
        try:
            with open(items_file, 'r', encoding='utf-8') as f:
                items = json.load(f)
        except (json.JSONDecodeError, IOError):
            items = {}

    outfits_file = processed_dir / "outfits.json"
    if outfits_file.exists():
        try:
            with open(outfits_file, 'r', encoding='utf-8') as f:
                outfits = json.load(f)
        except (json.JSONDecodeError, IOError):
            outfits = {}

    users_file = processed_dir / "users.json"
    if users_file.exists():
        try:
            with open(users_file, 'r', encoding='utf-8') as f:
                users = json.load(f)
        except (json.JSONDecodeError, IOError):
            users = {}

    return items, outfits, users


class DatasetDownloader:
    """数据集下载器"""
    
    DATASETS = {
        "deepfashion2": {
            "url": "https://github.com/switchablenorms/DeepFashion2",
            "description": "80万+服装图像，含关键点和属性标注",
            "size": "~30GB"
        },
        "polyvore": {
            "url": "https://www.kaggle.com/datasets/downloader/polyvore-outfits",
            "description": "21889套搭配组合",
            "size": "~2GB"
        },
        "fashionai": {
            "url": "https://tianchi.aliyun.com/dataset/dataDetail?dataId=115",
            "description": "阿里巴巴服装属性识别数据集",
            "size": "~5GB"
        }
    }
    
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = Path(data_dir)
        self.raw_dir = self.data_dir / "raw"
        self.processed_dir = self.data_dir / "processed"
        
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.processed_dir.mkdir(parents=True, exist_ok=True)
    
    def list_available(self):
        """列出可用数据集"""
        print("\n可用数据集:")
        print("-" * 60)
        for name, info in self.DATASETS.items():
            print(f"  {name}:")
            print(f"    描述: {info['description']}")
            print(f"    大小: {info['size']}")
            print(f"    链接: {info['url']}")
        print("-" * 60)
    
    def download_kaggle_dataset(self, dataset: str, kaggle_path: str):
        """
        下载Kaggle数据集
        需要先配置Kaggle API: https://www.kaggle.com/docs/api
        """
        import subprocess
        
        output_dir = self.raw_dir / dataset
        output_dir.mkdir(exist_ok=True)
        
        print(f"正在下载 {kaggle_path}...")
        subprocess.run([
            "kaggle", "datasets", "download",
            "-d", kaggle_path,
            "-p", str(output_dir),
            "--unzip"
        ], check=True)
        
        print(f"下载完成: {output_dir}")
        return output_dir
    
    def download_github_dataset(self, dataset: str, repo_url: str):
        """下载GitHub数据集"""
        output_dir = self.raw_dir / dataset
        output_dir.mkdir(exist_ok=True)
        
        print(f"请手动下载: {repo_url}")
        print(f"下载后解压到: {output_dir}")
        
        return output_dir


class DataPreprocessor:
    """数据预处理器 - 支持幂等性处理"""

    CATEGORY_MAP = {
        "short_sleeve_top": "tops",
        "long_sleeve_top": "tops",
        "short_sleeve_outwear": "outerwear",
        "long_sleeve_outwear": "outerwear",
        "vest": "tops",
        "sling": "tops",
        "shorts": "bottoms",
        "trousers": "bottoms",
        "skirt": "bottoms",
        "short_sleeve_dress": "dresses",
        "long_sleeve_dress": "dresses",
        "vest_dress": "dresses",
        "sling_dress": "dresses",
    }

    STYLE_MAP = {
        "casual": ["casual", "daily", "comfortable"],
        "formal": ["formal", "business", "professional"],
        "sporty": ["sporty", "athletic", "active"],
        "streetwear": ["streetwear", "urban", "trendy"],
        "minimalist": ["minimalist", "simple", "clean"],
        "bohemian": ["bohemian", "boho", "hippie"],
        "vintage": ["vintage", "retro", "classic"],
        "romantic": ["romantic", "feminine", "soft"],
        "edgy": ["edgy", "rock", "punk"],
        "elegant": ["elegant", "chic", "sophisticated"],
    }

    def __init__(self, raw_dir: str, processed_dir: str, idempotent: bool = True):
        """
        Initialize data preprocessor with idempotency support.

        Args:
            raw_dir: Directory containing raw data
            processed_dir: Directory for processed output
            idempotent: If True, skip already processed items (default: True)
        """
        self.raw_dir = Path(raw_dir)
        self.processed_dir = Path(processed_dir)
        self.idempotent = idempotent

        self.items = {}
        self.outfits = {}
        self.users = {}

        # Load existing data for idempotent updates
        if self.idempotent:
            self._load_existing_data()
            self.processed_hashes = load_processed_hashes(self.processed_dir)
            print(f"Idempotent mode: {len(self.processed_hashes)} items already processed")
        else:
            self.processed_hashes = set()

    def _load_existing_data(self):
        """Load existing processed data for idempotent updates."""
        self.items, self.outfits, self.users = load_existing_data(self.processed_dir)
        print(f"Loaded existing data: {len(self.items)} items, {len(self.outfits)} outfits, {len(self.users)} users")

    def _is_already_processed(self, item: Dict[str, Any]) -> bool:
        """Check if an item has already been processed."""
        if not self.idempotent:
            return False
        item_hash = compute_item_hash(item)
        return item_hash in self.processed_hashes

    def _mark_as_processed(self, item: Dict[str, Any]) -> str:
        """Mark an item as processed and return its hash."""
        item_hash = compute_item_hash(item)
        self.processed_hashes.add(item_hash)
        return item_hash

    def process_deepfashion2(self, annotation_file: str, image_dir: str):
        """
        处理DeepFashion2数据集 - 支持幂等性

        重复运行不会产生重复数据
        """
        print("处理DeepFashion2数据集...")

        with open(annotation_file, 'r') as f:
            annotations = json.load(f)

        new_items = 0
        skipped_items = 0

        for item_id, ann in tqdm(annotations.items()):
            image_path = Path(image_dir) / ann['image_name']

            if not image_path.exists():
                continue

            category = self.CATEGORY_MAP.get(ann['category_name'], 'accessories')

            keypoints = []
            for kp_name, kp_data in ann.get('keypoints', {}).items():
                keypoints.append({
                    "name": kp_name,
                    "x": kp_data['x'],
                    "y": kp_data['y'],
                    "visibility": kp_data.get('visibility', 2)
                })

            attributes = self._extract_attributes(ann)

            item = {
                "item_id": item_id,
                "image_path": str(image_path),
                "category": category,
                "bounding_box": ann.get('bounding_box'),
                "keypoints": keypoints,
                "attributes": attributes,
            }

            # Check idempotency
            if self._is_already_processed(item):
                skipped_items += 1
                continue

            self.items[item_id] = item
            self._mark_as_processed(item)
            new_items += 1

        print(f"处理完成: {new_items} 件新商品, {skipped_items} 件已存在 (跳过)")

    def process_polyvore(self, data_dir: str):
        """
        处理Polyvore搭配数据集 - 支持幂等性
        """
        print("处理Polyvore数据集...")

        outfits_file = Path(data_dir) / "outfits.json"
        if outfits_file.exists():
            with open(outfits_file, 'r') as f:
                outfits_data = json.load(f)

            new_outfits = 0
            skipped_outfits = 0

            for outfit_id, outfit in tqdm(outfits_data.items()):
                items = outfit.get('items', [])
                if len(items) < 2:
                    continue

                processed_outfit = {
                    "outfit_id": outfit_id,
                    "items": [item['item_id'] for item in items],
                    "compatibility_score": outfit.get('compatibility', 0.8),
                    "style_tags": outfit.get('style', []),
                    "occasion": outfit.get('occasion', 'daily'),
                    "season": outfit.get('season', 'all'),
                }

                # Check idempotency
                if self._is_already_processed(processed_outfit):
                    skipped_outfits += 1
                    continue

                self.outfits[outfit_id] = processed_outfit
                self._mark_as_processed(processed_outfit)
                new_outfits += 1

            print(f"处理完成: {new_outfits} 套新搭配, {skipped_outfits} 套已存在 (跳过)")
    
    def _extract_attributes(self, annotation: Dict) -> Dict:
        """提取服装属性"""
        attributes = {
            "style": [],
            "occasions": [],
            "seasons": [],
            "patterns": [],
            "materials": [],
            "colors": [],
            "fit": "regular",
            "length": "regular",
            "neckline": "unknown",
            "sleeve_length": "unknown"
        }
        
        if 'style' in annotation:
            for style in annotation['style']:
                for main_style, keywords in self.STYLE_MAP.items():
                    if any(kw in style.lower() for kw in keywords):
                        if main_style not in attributes['style']:
                            attributes['style'].append(main_style)
        
        if 'occasion' in annotation:
            attributes['occasions'] = annotation['occasion']
        
        if 'season' in annotation:
            attributes['seasons'] = annotation['season']
        
        if 'pattern' in annotation:
            attributes['patterns'] = annotation['pattern']
        
        if 'color' in annotation:
            attributes['colors'] = annotation['color']
        
        if 'fit' in annotation:
            attributes['fit'] = annotation['fit']
        
        return attributes
    
    def generate_synthetic_users(self, num_users: int = 1000):
        """生成合成用户数据用于测试"""
        print(f"生成 {num_users} 个合成用户...")
        
        body_types = ["rectangle", "triangle", "inverted_triangle", "hourglass", "oval"]
        skin_tones = ["fair", "light", "medium", "olive", "tan", "dark"]
        color_seasons = ["spring", "summer", "autumn", "winter"]
        styles = ["casual", "formal", "sporty", "streetwear", "minimalist", 
                  "bohemian", "vintage", "romantic", "edgy", "elegant"]
        occasions = ["daily", "work", "date", "party", "sport", "travel"]
        
        for i in range(num_users):
            user_id = f"user_{i:05d}"
            
            user = {
                "user_id": user_id,
                "body_type": np.random.choice(body_types),
                "skin_tone": np.random.choice(skin_tones),
                "color_season": np.random.choice(color_seasons),
                "style_preferences": list(np.random.choice(styles, size=3, replace=False)),
                "occasion_preferences": list(np.random.choice(occasions, size=2, replace=False)),
                "budget": float(np.random.uniform(100, 2000)),
                "height": float(np.random.uniform(1.5, 1.9)),
                "weight": float(np.random.uniform(45, 90)),
                "age": int(np.random.uniform(18, 60)),
                "favorite_items": list(np.random.choice(list(self.items.keys()), 
                                                        size=min(10, len(self.items)), 
                                                        replace=False)),
                "purchase_history": list(np.random.choice(list(self.items.keys()), 
                                                          size=min(20, len(self.items)), 
                                                          replace=False))
            }
            
            self.users[user_id] = user
        
        print(f"生成完成: {len(self.users)} 个用户")
    
    def generate_synthetic_outfits(self, num_outfits: int = 5000):
        """生成合成搭配数据"""
        print(f"生成 {num_outfits} 套合成搭配...")
        
        items_by_category = {}
        for item_id, item in self.items.items():
            cat = item['category']
            if cat not in items_by_category:
                items_by_category[cat] = []
            items_by_category[cat].append(item_id)
        
        for i in range(num_outfits):
            outfit_id = f"outfit_{i:05d}"
            
            outfit_items = []
            
            if 'tops' in items_by_category and items_by_category['tops']:
                outfit_items.append(np.random.choice(items_by_category['tops']))
            
            if 'bottoms' in items_by_category and items_by_category['bottoms']:
                outfit_items.append(np.random.choice(items_by_category['bottoms']))
            
            if np.random.random() > 0.5 and 'outerwear' in items_by_category:
                outfit_items.append(np.random.choice(items_by_category['outerwear']))
            
            if np.random.random() > 0.7 and 'accessories' in items_by_category:
                outfit_items.append(np.random.choice(items_by_category['accessories']))
            
            if len(outfit_items) < 2:
                continue
            
            outfit = {
                "outfit_id": outfit_id,
                "items": outfit_items,
                "compatibility_score": float(np.random.uniform(0.6, 1.0)),
                "style_tags": list(np.random.choice(
                    ["casual", "formal", "sporty", "streetwear", "minimalist"],
                    size=2, replace=False
                )),
                "occasion": np.random.choice(["daily", "work", "date", "party"]),
                "season": np.random.choice(["spring", "summer", "autumn", "winter"])
            }
            
            self.outfits[outfit_id] = outfit
        
        print(f"生成完成: {len(self.outfits)} 套搭配")
    
    def save_processed_data(self):
        """
        保存处理后的数据 - 支持幂等性

        同时保存处理状态以便下次运行时跳过已处理的数据
        """
        output_dir = self.processed_dir
        output_dir.mkdir(parents=True, exist_ok=True)

        print("保存处理后的数据...")

        with open(output_dir / "items.json", 'w', encoding='utf-8') as f:
            json.dump(self.items, f, ensure_ascii=False, indent=2)

        with open(output_dir / "outfits.json", 'w', encoding='utf-8') as f:
            json.dump(self.outfits, f, ensure_ascii=False, indent=2)

        with open(output_dir / "users.json", 'w', encoding='utf-8') as f:
            json.dump(self.users, f, ensure_ascii=False, indent=2)

        # Save processed hashes for idempotency
        if self.idempotent:
            save_processed_hashes(output_dir, self.processed_hashes)
            print(f"Saved {len(self.processed_hashes)} processed item hashes")

        stats = {
            "total_items": len(self.items),
            "total_outfits": len(self.outfits),
            "total_users": len(self.users),
            "category_distribution": {},
            "style_distribution": {},
            "last_updated": datetime.now().isoformat(),
            "idempotent_mode": self.idempotent
        }

        for item in self.items.values():
            cat = item['category']
            stats['category_distribution'][cat] = stats['category_distribution'].get(cat, 0) + 1

            for style in item['attributes'].get('style', []):
                stats['style_distribution'][style] = stats['style_distribution'].get(style, 0) + 1

        with open(output_dir / "stats.json", 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)

        print(f"保存完成: {output_dir}")
        print(f"统计: {stats['total_items']} 商品, {stats['total_outfits']} 搭配, {stats['total_users']} 用户")


def create_sample_data():
    """创建示例数据用于快速测试"""
    print("创建示例数据...")
    
    preprocessor = DataPreprocessor(
        raw_dir="./data/raw",
        processed_dir="./data/processed"
    )
    
    sample_items = {}
    categories = ["tops", "bottoms", "dresses", "outerwear", "footwear", "accessories"]
    styles = ["casual", "formal", "sporty", "streetwear", "minimalist"]
    colors = ["black", "white", "blue", "red", "gray", "navy", "beige"]
    
    for i in range(100):
        item_id = f"item_{i:04d}"
        category = categories[i % len(categories)]
        
        sample_items[item_id] = {
            "item_id": item_id,
            "image_path": f"images/{category}/{item_id}.jpg",
            "category": category,
            "bounding_box": {"x": 0, "y": 0, "width": 224, "height": 224},
            "keypoints": [],
            "attributes": {
                "style": [styles[i % len(styles)]],
                "occasions": ["daily"],
                "seasons": ["spring", "summer"],
                "patterns": ["solid"],
                "materials": ["cotton"],
                "colors": [colors[i % len(colors)]],
                "fit": "regular",
                "length": "regular",
                "neckline": "round",
                "sleeve_length": "short"
            }
        }
    
    preprocessor.items = sample_items
    
    preprocessor.generate_synthetic_outfits(500)
    preprocessor.generate_synthetic_users(100)
    preprocessor.save_processed_data()
    
    print("示例数据创建完成!")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="服装推荐数据集处理工具")
    parser.add_argument("--action", choices=["list", "download", "process", "sample"],
                       default="sample", help="执行的操作")
    parser.add_argument("--dataset", default="polyvore", help="数据集名称")
    parser.add_argument("--raw-dir", default="./data/raw", help="原始数据目录")
    parser.add_argument("--processed-dir", default="./data/processed", help="处理后数据目录")
    
    args = parser.parse_args()
    
    if args.action == "list":
        downloader = DatasetDownloader()
        downloader.list_available()
    
    elif args.action == "download":
        downloader = DatasetDownloader(args.raw_dir)
        print(f"\n请手动下载数据集:")
        print(f"  DeepFashion2: https://github.com/switchablenorms/DeepFashion2")
        print(f"  Polyvore: https://www.kaggle.com/datasets")
        print(f"\n下载后解压到: {args.raw_dir}")
    
    elif args.action == "process":
        preprocessor = DataPreprocessor(args.raw_dir, args.processed_dir)
        preprocessor.generate_synthetic_users(1000)
        preprocessor.generate_synthetic_outfits(5000)
        preprocessor.save_processed_data()
    
    elif args.action == "sample":
        create_sample_data()
