"""
增强版数据集下载和处理流水线
支持多种公开数据集的下载、处理和格式转换
"""

import os
import json
import zipfile
import tarfile
import hashlib
import asyncio
import aiohttp
import aiofiles
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import shutil
from PIL import Image
import numpy as np
from tqdm import tqdm
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class DatasetInfo:
    name: str
    description: str
    size: str
    download_url: str
    license: str
    paper_url: Optional[str] = None
    num_images: int = 0
    num_outfits: int = 0
    categories: List[str] = None
    
    def __post_init__(self):
        if self.categories is None:
            self.categories = []


class DatasetRegistry:
    AVAILABLE_DATASETS = {
        "deepfashion2": DatasetInfo(
            name="DeepFashion2",
            description="80万+服装图像，含关键点、属性、分割标注",
            size="~30GB",
            download_url="https://github.com/switchablenorms/DeepFashion2",
            license="CC BY 4.0",
            paper_url="https://arxiv.org/abs/1901.07973",
            num_images=800000,
            categories=["tops", "bottoms", "dresses", "outerwear", "footwear", "accessories"]
        ),
        "polyvore": DatasetInfo(
            name="Polyvore Outfits",
            description="21889套搭配组合，含风格标签和兼容性评分",
            size="~2GB",
            download_url="https://www.kaggle.com/datasets/detecting/ployvore-dataset",
            license="CC BY-NC 4.0",
            paper_url="https://arxiv.org/abs/1704.02044",
            num_images=100000,
            num_outfits=21889,
            categories=["tops", "bottoms", "dresses", "outerwear", "footwear", "accessories"]
        ),
        "fashiongen": DatasetInfo(
            name="FashionGen",
            description="60万服装图像，含详细文本描述",
            size="~15GB",
            download_url="https://fashion-gen.com",
            license="Research Use",
            paper_url="https://arxiv.org/abs/1806.08317",
            num_images=600000,
            categories=["tops", "bottoms", "dresses", "outerwear", "footwear"]
        ),
        "iqon3000": DatasetInfo(
            name="IQON3000",
            description="3000用户搭配数据，含用户偏好",
            size="~5GB",
            download_url="https://github.com/miuspo6/IQON3000",
            license="MIT",
            paper_url="https://dl.acm.org/doi/10.1145/3394171.3413953",
            num_images=100000,
            num_outfits=30000,
            categories=["tops", "bottoms", "dresses", "outerwear", "footwear", "accessories"]
        ),
        "modanet": DatasetInfo(
            name="ModaNet",
            description="5万图像，多类别服装分割标注",
            size="~3GB",
            download_url="https://github.com/switchablenorms/ModaNet",
            license="CC BY 4.0",
            paper_url="https://arxiv.org/abs/1807.01394",
            num_images=55000,
            categories=["tops", "bottoms", "dresses", "outerwear", "footwear", "accessories", "bags"]
        ),
        "fashionai": DatasetInfo(
            name="FashionAI",
            description="阿里巴巴服装属性识别数据集",
            size="~5GB",
            download_url="https://tianchi.aliyun.com/dataset/dataDetail?dataId=115",
            license="Research Use",
            num_images=100000,
            categories=["tops", "bottoms", "dresses", "outerwear"]
        ),
        "deepfashion": DatasetInfo(
            name="DeepFashion",
            description="服装属性预测和跨域检索",
            size="~25GB",
            download_url="http://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html",
            license="Research Use",
            paper_url="https://arxiv.org/abs/1606.06557",
            num_images=800000,
            categories=["tops", "bottoms", "dresses", "outerwear"]
        ),
        "vitonhd": DatasetInfo(
            name="VITON-HD",
            description="高质量虚拟试衣数据集",
            size="~15GB",
            download_url="https://github.com/shadow2496/VITON-HD",
            license="CC BY-NC 4.0",
            paper_url="https://arxiv.org/abs/2103.16874",
            num_images=13600,
            categories=["tops"]
        )
    }

    @classmethod
    def list_datasets(cls) -> Dict[str, DatasetInfo]:
        return cls.AVAILABLE_DATASETS

    @classmethod
    def get_dataset(cls, name: str) -> Optional[DatasetInfo]:
        return cls.AVAILABLE_DATASETS.get(name.lower())


@dataclass
class ProcessedItem:
    item_id: str
    image_path: str
    category: str
    style_tags: List[str]
    color_tags: List[str]
    occasion_tags: List[str]
    season_tags: List[str]
    pattern: str
    material: str
    fit: str
    length: str
    neckline: str
    sleeve_length: str
    attributes: Dict[str, Any]
    embedding: Optional[List[float]] = None


@dataclass
class ProcessedOutfit:
    outfit_id: str
    item_ids: List[str]
    style_tags: List[str]
    occasion_tags: List[str]
    season_tags: List[str]
    compatibility_score: float
    popularity_score: float
    source: str


class DatasetDownloader:
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = Path(data_dir)
        self.raw_dir = self.data_dir / "raw"
        self.processed_dir = self.data_dir / "processed"
        self.cache_dir = self.data_dir / "cache"
        
        for d in [self.raw_dir, self.processed_dir, self.cache_dir]:
            d.mkdir(parents=True, exist_ok=True)

    async def download_file(
        self,
        url: str,
        output_path: Path,
        chunk_size: int = 8192
    ) -> bool:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        logger.error(f"Failed to download {url}: HTTP {response.status}")
                        return False
                    
                    total_size = int(response.headers.get('content-length', 0))
                    
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    with tqdm(
                        total=total_size,
                        unit='B',
                        unit_scale=True,
                        desc=output_path.name
                    ) as pbar:
                        async with aiofiles.open(output_path, 'wb') as f:
                            async for chunk in response.content.iter_chunked(chunk_size):
                                await f.write(chunk)
                                pbar.update(len(chunk))
                    
                    logger.info(f"Downloaded: {output_path}")
                    return True
                    
        except Exception as e:
            logger.error(f"Download error: {e}")
            return False

    def extract_archive(self, archive_path: Path, output_dir: Path) -> bool:
        try:
            if archive_path.suffix == '.zip':
                with zipfile.ZipFile(archive_path, 'r') as zf:
                    zf.extractall(output_dir)
            elif archive_path.suffix in ['.tar', '.gz', '.tgz']:
                with tarfile.open(archive_path, 'r:*') as tf:
                    tf.extractall(output_dir)
            else:
                logger.error(f"Unsupported archive format: {archive_path.suffix}")
                return False
            
            logger.info(f"Extracted: {archive_path} -> {output_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Extraction error: {e}")
            return False

    def calculate_md5(self, file_path: Path) -> str:
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    async def download_kaggle_dataset(self, dataset_path: str, output_name: str) -> Path:
        import subprocess
        
        output_dir = self.raw_dir / output_name
        output_dir.mkdir(exist_ok=True)
        
        try:
            result = subprocess.run(
                ["kaggle", "datasets", "download", "-d", dataset_path, "-p", str(output_dir), "--unzip"],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info(f"Kaggle dataset downloaded: {dataset_path}")
            else:
                logger.error(f"Kaggle download failed: {result.stderr}")
                
        except FileNotFoundError:
            logger.error("Kaggle CLI not found. Please install: pip install kaggle")
        
        return output_dir

    def get_dataset_instructions(self, dataset_name: str) -> str:
        instructions = {
            "deepfashion2": """
DeepFashion2 下载说明：
1. 访问 https://github.com/switchablenorms/DeepFashion2
2. 按照说明下载数据集
3. 解压到 data/raw/deepfashion2/
4. 目录结构：
   - data/raw/deepfashion2/train/image/
   - data/raw/deepfashion2/train/annos/
   - data/raw/deepfashion2/validation/image/
   - data/raw/deepfashion2/validation/annos/
""",
            "polyvore": """
Polyvore 下载说明：
1. 访问 https://www.kaggle.com/datasets/detecting/ployvore-dataset
2. 使用 Kaggle CLI 或网页下载
3. 解压到 data/raw/polyvore/
4. 或者运行: python -m ml.dataset_tools.enhanced_data_pipeline --download-kaggle polyvore
""",
            "fashiongen": """
FashionGen 下载说明：
1. 访问 https://fashion-gen.com
2. 申请数据集访问权限
3. 下载后解压到 data/raw/fashiongen/
""",
            "iqon3000": """
IQON3000 下载说明：
1. 访问 https://github.com/miuspo6/IQON3000
2. 按照说明下载数据集
3. 解压到 data/raw/iqon3000/
"""
        }
        
        return instructions.get(dataset_name.lower(), "请查看数据集官方页面获取下载说明。")


class DataProcessor:
    CATEGORY_MAPPING = {
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
        "shoes": "footwear",
        "boots": "footwear",
        "sneakers": "footwear",
        "heels": "footwear",
        "bag": "accessories",
        "hat": "accessories",
        "scarf": "accessories",
        "jewelry": "accessories",
        "sunglasses": "accessories",
        "watch": "accessories",
    }

    STYLE_MAPPING = {
        "casual": ["casual", "daily", "comfortable", "relaxed"],
        "formal": ["formal", "business", "professional", "office"],
        "sporty": ["sporty", "athletic", "active", "gym", "workout"],
        "streetwear": ["streetwear", "urban", "trendy", "hiphop", "street"],
        "minimalist": ["minimalist", "simple", "clean", "basic"],
        "bohemian": ["bohemian", "boho", "hippie", "folk"],
        "vintage": ["vintage", "retro", "classic", "old-school"],
        "romantic": ["romantic", "feminine", "soft", "girly"],
        "edgy": ["edgy", "rock", "punk", "alternative"],
        "elegant": ["elegant", "chic", "sophisticated", "refined"],
        "preppy": ["preppy", "collegiate", "ivy-league", "school"],
        "korean": ["korean", "k-pop", "k-style", "k-fashion"],
        "japanese": ["japanese", "j-style", "harajuku", "tokyo"],
        "french": ["french", "parisian", "european", "chic"],
    }

    OCCASION_MAPPING = {
        "daily": ["daily", "casual", "everyday", "day-to-day"],
        "work": ["work", "office", "business", "professional"],
        "date": ["date", "romantic", "evening", "dinner"],
        "party": ["party", "club", "nightlife", "celebration"],
        "sport": ["sport", "gym", "workout", "exercise", "athletic"],
        "travel": ["travel", "vacation", "holiday", "trip"],
        "wedding": ["wedding", "formal", "ceremony"],
        "beach": ["beach", "swim", "summer", "vacation"],
    }

    SEASON_MAPPING = {
        "spring": ["spring", "springtime"],
        "summer": ["summer", "hot", "warm"],
        "autumn": ["autumn", "fall"],
        "winter": ["winter", "cold", "snow"],
    }

    def __init__(self, raw_dir: str, processed_dir: str):
        self.raw_dir = Path(raw_dir)
        self.processed_dir = Path(processed_dir)
        self.items: Dict[str, ProcessedItem] = {}
        self.outfits: Dict[str, ProcessedOutfit] = {}
        self.users: Dict[str, Dict] = {}

    def process_deepfashion2(self, annotation_dir: Path, image_dir: Path) -> int:
        logger.info(f"Processing DeepFashion2: {annotation_dir}")
        
        processed_count = 0
        
        for anno_file in tqdm(list(annotation_dir.glob("*.json")), desc="Processing annotations"):
            try:
                with open(anno_file, 'r') as f:
                    annos = json.load(f)
                
                for item_id, anno in annos.items():
                    if isinstance(anno, list):
                        for i, item_anno in enumerate(anno):
                            item = self._process_df2_item(f"{item_id}_{i}", item_anno, image_dir)
                            if item:
                                self.items[item.item_id] = item
                                processed_count += 1
                    else:
                        item = self._process_df2_item(item_id, anno, image_dir)
                        if item:
                            self.items[item.item_id] = item
                            processed_count += 1
                            
            except Exception as e:
                logger.error(f"Error processing {anno_file}: {e}")
        
        logger.info(f"Processed {processed_count} items from DeepFashion2")
        return processed_count

    def _process_df2_item(self, item_id: str, anno: Dict, image_dir: Path) -> Optional[ProcessedItem]:
        try:
            image_name = anno.get('image_name') or anno.get('file_name', '')
            image_path = image_dir / image_name
            
            if not image_path.exists():
                return None
            
            category_id = anno.get('category_id', 0)
            category_name = anno.get('category_name', 'unknown')
            category = self.CATEGORY_MAPPING.get(category_name, 'accessories')
            
            style_tags = self._extract_tags(anno.get('style', []), self.STYLE_MAPPING)
            occasion_tags = self._extract_tags(anno.get('occasion', []), self.OCCASION_MAPPING)
            season_tags = self._extract_tags(anno.get('season', []), self.SEASON_MAPPING)
            
            color_tags = anno.get('color', [])
            if isinstance(color_tags, str):
                color_tags = [color_tags]
            
            return ProcessedItem(
                item_id=item_id,
                image_path=str(image_path),
                category=category,
                style_tags=style_tags,
                color_tags=color_tags,
                occasion_tags=occasion_tags,
                season_tags=season_tags,
                pattern=anno.get('pattern', ['solid'])[0] if anno.get('pattern') else 'solid',
                material=anno.get('material', ['cotton'])[0] if anno.get('material') else 'cotton',
                fit=anno.get('fit', 'regular'),
                length=anno.get('length', 'regular'),
                neckline=anno.get('neckline', 'unknown'),
                sleeve_length=anno.get('sleeve_length', 'unknown'),
                attributes={
                    'bounding_box': anno.get('bounding_box'),
                    'keypoints': anno.get('keypoints', {}),
                    'segmentation': anno.get('segmentation'),
                    'scale': anno.get('scale'),
                    'occlusion': anno.get('occlusion'),
                    'zoom_in': anno.get('zoom_in'),
                    'viewpoint': anno.get('viewpoint'),
                }
            )
            
        except Exception as e:
            logger.error(f"Error processing item {item_id}: {e}")
            return None

    def process_polyvore(self, data_dir: Path) -> int:
        logger.info(f"Processing Polyvore: {data_dir}")
        
        processed_count = 0
        
        outfits_file = data_dir / "outfits.json"
        if outfits_file.exists():
            with open(outfits_file, 'r') as f:
                outfits_data = json.load(f)
            
            for outfit_id, outfit in tqdm(outfits_data.items(), desc="Processing outfits"):
                processed_outfit = self._process_polyvore_outfit(outfit_id, outfit, data_dir)
                if processed_outfit:
                    self.outfits[outfit_id] = processed_outfit
                    processed_count += 1
        
        items_file = data_dir / "items.json"
        if items_file.exists():
            with open(items_file, 'r') as f:
                items_data = json.load(f)
            
            for item_id, item in tqdm(items_data.items(), desc="Processing items"):
                processed_item = self._process_polyvore_item(item_id, item, data_dir)
                if processed_item:
                    self.items[item_id] = processed_item
        
        logger.info(f"Processed {processed_count} outfits from Polyvore")
        return processed_count

    def _process_polyvore_outfit(self, outfit_id: str, outfit: Dict, data_dir: Path) -> Optional[ProcessedOutfit]:
        try:
            items = outfit.get('items', [])
            if len(items) < 2:
                return None
            
            item_ids = [item.get('item_id', '') for item in items]
            
            style_tags = outfit.get('style', [])
            if isinstance(style_tags, str):
                style_tags = [style_tags]
            style_tags = self._extract_tags(style_tags, self.STYLE_MAPPING)
            
            occasion_tags = self._extract_tags([outfit.get('occasion', 'daily')], self.OCCASION_MAPPING)
            season_tags = self._extract_tags([outfit.get('season', 'all')], self.SEASON_MAPPING)
            
            likes = outfit.get('likes', 0)
            views = outfit.get('views', 0)
            popularity_score = likes / max(views, 1) * 100
            
            return ProcessedOutfit(
                outfit_id=outfit_id,
                item_ids=item_ids,
                style_tags=style_tags,
                occasion_tags=occasion_tags,
                season_tags=season_tags,
                compatibility_score=outfit.get('compatibility', 0.8),
                popularity_score=popularity_score,
                source='polyvore'
            )
            
        except Exception as e:
            logger.error(f"Error processing outfit {outfit_id}: {e}")
            return None

    def _process_polyvore_item(self, item_id: str, item: Dict, data_dir: Path) -> Optional[ProcessedItem]:
        try:
            image_path = data_dir / "images" / f"{item_id}.jpg"
            if not image_path.exists():
                image_path = data_dir / "images" / f"{item_id}.png"
            
            category = self.CATEGORY_MAPPING.get(item.get('category', ''), 'accessories')
            
            style_tags = self._extract_tags(item.get('style', []), self.STYLE_MAPPING)
            color_tags = item.get('colors', [])
            if isinstance(color_tags, str):
                color_tags = [color_tags]
            
            return ProcessedItem(
                item_id=item_id,
                image_path=str(image_path),
                category=category,
                style_tags=style_tags,
                color_tags=color_tags,
                occasion_tags=item.get('occasions', ['daily']),
                season_tags=item.get('seasons', ['spring', 'summer', 'autumn', 'winter']),
                pattern=item.get('pattern', 'solid'),
                material=item.get('material', 'unknown'),
                fit=item.get('fit', 'regular'),
                length=item.get('length', 'regular'),
                neckline=item.get('neckline', 'unknown'),
                sleeve_length=item.get('sleeve_length', 'unknown'),
                attributes={
                    'name': item.get('name'),
                    'brand': item.get('brand'),
                    'price': item.get('price'),
                    'description': item.get('description'),
                }
            )
            
        except Exception as e:
            logger.error(f"Error processing item {item_id}: {e}")
            return None

    def process_iqon3000(self, data_dir: Path) -> int:
        logger.info(f"Processing IQON3000: {data_dir}")
        
        processed_count = 0
        
        outfits_dir = data_dir / "outfits"
        if outfits_dir.exists():
            for user_dir in tqdm(list(outfits_dir.iterdir()), desc="Processing users"):
                if user_dir.is_dir():
                    for outfit_dir in user_dir.iterdir():
                        if outfit_dir.is_dir():
                            outfit = self._process_iqon_outfit(outfit_dir)
                            if outfit:
                                self.outfits[outfit.outfit_id] = outfit
                                processed_count += 1
        
        logger.info(f"Processed {processed_count} outfits from IQON3000")
        return processed_count

    def _process_iqon_outfit(self, outfit_dir: Path) -> Optional[ProcessedOutfit]:
        try:
            outfit_id = f"{outfit_dir.parent.name}_{outfit_dir.name}"
            
            item_ids = []
            for item_file in outfit_dir.glob("*.jpg"):
                item_id = item_file.stem
                item_ids.append(item_id)
                
                self.items[item_id] = ProcessedItem(
                    item_id=item_id,
                    image_path=str(item_file),
                    category='unknown',
                    style_tags=[],
                    color_tags=[],
                    occasion_tags=['daily'],
                    season_tags=[],
                    pattern='solid',
                    material='unknown',
                    fit='regular',
                    length='regular',
                    neckline='unknown',
                    sleeve_length='unknown',
                    attributes={}
                )
            
            meta_file = outfit_dir / "meta.json"
            if meta_file.exists():
                with open(meta_file, 'r') as f:
                    meta = json.load(f)
            else:
                meta = {}
            
            return ProcessedOutfit(
                outfit_id=outfit_id,
                item_ids=item_ids,
                style_tags=meta.get('style', []),
                occasion_tags=meta.get('occasion', ['daily']),
                season_tags=meta.get('season', []),
                compatibility_score=0.8,
                popularity_score=meta.get('likes', 0),
                source='iqon3000'
            )
            
        except Exception as e:
            logger.error(f"Error processing outfit {outfit_dir}: {e}")
            return None

    def _extract_tags(self, raw_tags: List, mapping: Dict) -> List[str]:
        extracted = set()
        
        for tag in raw_tags:
            tag_lower = tag.lower()
            for mapped_tag, keywords in mapping.items():
                if any(kw in tag_lower for kw in keywords):
                    extracted.add(mapped_tag)
                    break
        
        return list(extracted)

    def generate_synthetic_data(
        self,
        num_items: int = 10000,
        num_outfits: int = 5000,
        num_users: int = 1000
    ) -> None:
        logger.info(f"Generating synthetic data: {num_items} items, {num_outfits} outfits, {num_users} users")
        
        categories = ["tops", "bottoms", "dresses", "outerwear", "footwear", "accessories"]
        styles = list(self.STYLE_MAPPING.keys())
        colors = ["black", "white", "gray", "navy", "blue", "red", "pink", "green", "yellow", "brown", "beige"]
        occasions = list(self.OCCASION_MAPPING.keys())
        seasons = list(self.SEASON_MAPPING.keys())
        patterns = ["solid", "striped", "plaid", "floral", "polka_dot", "geometric", "animal_print"]
        materials = ["cotton", "polyester", "silk", "wool", "denim", "linen", "leather"]
        fits = ["slim", "regular", "loose", "oversized"]
        lengths = ["mini", "knee", "midi", "maxi"]
        necklines = ["round", "v_neck", "square", "boat", "collar", "turtleneck"]
        sleeve_lengths = ["sleeveless", "short", "three_quarter", "long"]

        for i in range(num_items):
            item_id = f"syn_item_{i:06d}"
            category = np.random.choice(categories)
            
            num_styles = np.random.randint(1, 4)
            num_colors = np.random.randint(1, 4)
            num_occasions = np.random.randint(1, 3)
            num_seasons = np.random.randint(1, 3)
            
            self.items[item_id] = ProcessedItem(
                item_id=item_id,
                image_path=f"synthetic/images/{category}/{item_id}.jpg",
                category=category,
                style_tags=list(np.random.choice(styles, size=num_styles, replace=False)),
                color_tags=list(np.random.choice(colors, size=num_colors, replace=False)),
                occasion_tags=list(np.random.choice(occasions, size=num_occasions, replace=False)),
                season_tags=list(np.random.choice(seasons, size=num_seasons, replace=False)),
                pattern=np.random.choice(patterns),
                material=np.random.choice(materials),
                fit=np.random.choice(fits),
                length=np.random.choice(lengths),
                neckline=np.random.choice(necklines),
                sleeve_length=np.random.choice(sleeve_lengths),
                attributes={
                    'synthetic': True,
                    'quality_score': float(np.random.uniform(0.5, 1.0))
                }
            )

        items_by_category = {}
        for item_id, item in self.items.items():
            cat = item.category
            if cat not in items_by_category:
                items_by_category[cat] = []
            items_by_category[cat].append(item_id)

        for i in range(num_outfits):
            outfit_id = f"syn_outfit_{i:06d}"
            outfit_items = []
            
            outfit_styles = list(np.random.choice(styles, size=2, replace=False))
            
            if 'tops' in items_by_category:
                outfit_items.append(np.random.choice(items_by_category['tops']))
            if 'bottoms' in items_by_category:
                outfit_items.append(np.random.choice(items_by_category['bottoms']))
            if np.random.random() > 0.5 and 'outerwear' in items_by_category:
                outfit_items.append(np.random.choice(items_by_category['outerwear']))
            if np.random.random() > 0.7 and 'accessories' in items_by_category:
                outfit_items.append(np.random.choice(items_by_category['accessories']))
            
            if len(outfit_items) < 2:
                continue
            
            self.outfits[outfit_id] = ProcessedOutfit(
                outfit_id=outfit_id,
                item_ids=outfit_items,
                style_tags=outfit_styles,
                occasion_tags=list(np.random.choice(occasions, size=2, replace=False)),
                season_tags=list(np.random.choice(seasons, size=2, replace=False)),
                compatibility_score=float(np.random.uniform(0.6, 1.0)),
                popularity_score=float(np.random.uniform(0, 100)),
                source='synthetic'
            )

        body_types = ["rectangle", "hourglass", "triangle", "inverted_triangle", "oval"]
        skin_tones = ["fair", "light", "medium", "olive", "tan", "dark"]
        
        for i in range(num_users):
            user_id = f"syn_user_{i:06d}"
            
            self.users[user_id] = {
                'user_id': user_id,
                'body_type': np.random.choice(body_types),
                'skin_tone': np.random.choice(skin_tones),
                'style_preferences': list(np.random.choice(styles, size=3, replace=False)),
                'occasion_preferences': list(np.random.choice(occasions, size=2, replace=False)),
                'color_preferences': list(np.random.choice(colors, size=3, replace=False)),
                'budget': float(np.random.uniform(100, 2000)),
                'height': float(np.random.uniform(150, 190)),
                'weight': float(np.random.uniform(40, 100)),
                'age': int(np.random.uniform(18, 60)),
                'favorite_items': list(np.random.choice(list(self.items.keys()), size=min(10, len(self.items)), replace=False)),
                'favorite_outfits': list(np.random.choice(list(self.outfits.keys()), size=min(5, len(self.outfits)), replace=False)),
            }

        logger.info(f"Generated {len(self.items)} items, {len(self.outfits)} outfits, {len(self.users)} users")

    def save_processed_data(self) -> None:
        output_dir = self.processed_dir
        output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info("Saving processed data...")
        
        items_data = {k: asdict(v) for k, v in self.items.items()}
        with open(output_dir / "items.json", 'w', encoding='utf-8') as f:
            json.dump(items_data, f, ensure_ascii=False, indent=2)
        
        outfits_data = {k: asdict(v) for k, v in self.outfits.items()}
        with open(output_dir / "outfits.json", 'w', encoding='utf-8') as f:
            json.dump(outfits_data, f, ensure_ascii=False, indent=2)
        
        with open(output_dir / "users.json", 'w', encoding='utf-8') as f:
            json.dump(self.users, f, ensure_ascii=False, indent=2)
        
        stats = {
            "total_items": len(self.items),
            "total_outfits": len(self.outfits),
            "total_users": len(self.users),
            "category_distribution": {},
            "style_distribution": {},
            "source_distribution": {},
            "processed_at": datetime.now().isoformat()
        }
        
        for item in self.items.values():
            stats['category_distribution'][item.category] = stats['category_distribution'].get(item.category, 0) + 1
            for style in item.style_tags:
                stats['style_distribution'][style] = stats['style_distribution'].get(style, 0) + 1
        
        for outfit in self.outfits.values():
            stats['source_distribution'][outfit.source] = stats['source_distribution'].get(outfit.source, 0) + 1
        
        with open(output_dir / "stats.json", 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Saved to {output_dir}")
        logger.info(f"Stats: {stats['total_items']} items, {stats['total_outfits']} outfits, {stats['total_users']} users")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="增强版数据集处理工具")
    parser.add_argument("--action", choices=["list", "download", "process", "generate", "all"],
                       default="list", help="执行的操作")
    parser.add_argument("--dataset", default="all", help="数据集名称")
    parser.add_argument("--raw-dir", default="./data/raw", help="原始数据目录")
    parser.add_argument("--processed-dir", default="./data/processed", help="处理后数据目录")
    parser.add_argument("--num-items", type=int, default=10000, help="合成数据商品数量")
    parser.add_argument("--num-outfits", type=int, default=5000, help="合成数据搭配数量")
    parser.add_argument("--num-users", type=int, default=1000, help="合成数据用户数量")
    
    args = parser.parse_args()
    
    if args.action == "list":
        print("\n可用数据集:")
        print("-" * 80)
        for name, info in DatasetRegistry.list_datasets().items():
            print(f"\n{name}:")
            print(f"  名称: {info.name}")
            print(f"  描述: {info.description}")
            print(f"  大小: {info.size}")
            print(f"  图片数: {info.num_images:,}")
            print(f"  搭配数: {info.num_outfits:,}")
            print(f"  许可: {info.license}")
            print(f"  下载: {info.download_url}")
        print("-" * 80)
    
    elif args.action == "download":
        downloader = DatasetDownloader(args.raw_dir)
        dataset_info = DatasetRegistry.get_dataset(args.dataset)
        
        if dataset_info:
            print(downloader.get_dataset_instructions(args.dataset))
        else:
            print(f"未知数据集: {args.dataset}")
    
    elif args.action == "generate":
        processor = DataProcessor(args.raw_dir, args.processed_dir)
        processor.generate_synthetic_data(
            num_items=args.num_items,
            num_outfits=args.num_outfits,
            num_users=args.num_users
        )
        processor.save_processed_data()
    
    elif args.action == "process":
        processor = DataProcessor(args.raw_dir, args.processed_dir)
        
        raw_path = Path(args.raw_dir)
        
        if (raw_path / "deepfashion2").exists():
            processor.process_deepfashion2(
                raw_path / "deepfashion2" / "train" / "annos",
                raw_path / "deepfashion2" / "train" / "image"
            )
        
        if (raw_path / "polyvore").exists():
            processor.process_polyvore(raw_path / "polyvore")
        
        if (raw_path / "iqon3000").exists():
            processor.process_iqon3000(raw_path / "iqon3000")
        
        processor.save_processed_data()
    
    elif args.action == "all":
        processor = DataProcessor(args.raw_dir, args.processed_dir)
        processor.generate_synthetic_data(
            num_items=args.num_items,
            num_outfits=args.num_outfits,
            num_users=args.num_users
        )
        processor.save_processed_data()


if __name__ == "__main__":
    main()
