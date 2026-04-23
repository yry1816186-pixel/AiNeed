"""
ChineseFashionCLIP Fine-tune Data Preparation

Generates a Chinese fashion image-text dataset for FashionCLIP fine-tuning.
Supports two modes:
  1. --mode mock     : Generate synthetic Chinese fashion data (no images needed, uses color blocks)
  2. --mode real     : Load real images from data/raw/ directories with Chinese annotations

Minimum viable dataset: 5000 image-text pairs covering 4 occasions x 2 genders.
"""

import argparse
import json
import os
import sys
import random
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from ml.config.paths import ModelPaths

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"
FINETUNE_DIR = DATA_DIR / "chinese_fashion"
IMAGES_DIR = FINETUNE_DIR / "images"

OCCASIONS = ["interview", "date", "travel", "commute"]
GENDERS = ["male", "female"]

OCCASION_CONFIG = {
    "interview": {
        "name_cn": "面试",
        "name_en": "Interview",
        "formality": "formal",
        "male_categories": ["suit", "dress_shirt", "trousers", "blazer", "tie", "leather_shoes"],
        "female_categories": ["blazer", "blouse", "trousers", "pencil_skirt", "mid_heel_shoes"],
        "male_colors": ["navy", "charcoal", "white", "light_blue", "grey"],
        "female_colors": ["navy", "black", "white", "beige", "blush"],
        "male_styles": ["商务正装", "Smart Casual", "商务休闲", "简约通勤"],
        "female_styles": ["职场优雅", "Smart Casual", "知性通勤", "简约干练"],
        "male_desc_templates": [
            "适合互联网公司面试的{style}穿搭，{color}{category}搭配{color2}{category2}，专业又不失亲和力",
            "面试正装选择，{color}{category}配{color2}{category2}，展现稳重可靠的形象",
            "{style}风格面试穿搭，{color}{category}与{color2}{category2}的组合，适合金融/咨询行业",
            "面试季必备穿搭，{color}{category}搭配{color2}{category2}，得体大方",
        ],
        "female_desc_templates": [
            "面试穿搭推荐，{style}风格，{color}{category}搭配{color2}{category2}，优雅又专业",
            "适合面试的{style}穿搭，{color}{category}配{color2}{category2}，展现职场女性魅力",
            "面试着装指南，{color}{category}与{color2}{category2}，知性大方不失气场",
            "职场面试穿搭，{style}风格，{color}{category}搭配{color2}{category2}，干练优雅",
        ],
    },
    "date": {
        "name_cn": "约会",
        "name_en": "Date",
        "formality": "semi_formal",
        "male_categories": ["knit_sweater", "chinos", "casual_shirt", "jacket", "sneakers", "coat"],
        "female_categories": ["dress", "knit_cardigan", "skirt", "heels", "blouse", "coat"],
        "male_colors": ["burgundy", "navy", "olive", "cream", "camel"],
        "female_colors": ["blush", "burgundy", "cream", "sage_green", "dusty_rose"],
        "male_styles": ["温柔暖男", "都市雅痞", "清新文艺", "简约质感"],
        "female_styles": ["温柔浪漫", "法式优雅", "甜美可爱", "知性气质"],
        "male_desc_templates": [
            "约会穿搭推荐，{style}风格，{color}{category}搭配{color2}{category2}，温暖有质感",
            "浪漫约会穿搭，{color}{category}配{color2}{category2}，展现{style}魅力",
            "约会季穿搭指南，{color}{category}与{color2}{category2}，{style}风格加分",
            "约会场合穿搭，{style}风，{color}{category}搭配{color2}{category2}，暖色调营造温柔氛围",
        ],
        "female_desc_templates": [
            "约会穿搭推荐，{style}风格，{color}{category}搭配{color2}{category2}，浪漫又温柔",
            "约会场合穿搭，{color}{category}配{color2}{category2}，{style}气质满分",
            "约会季穿搭指南，{color}{category}与{color2}{category2}，{style}风格，暖色调提升好感度",
            "浪漫约会穿搭，{style}风，{color}{category}搭配{color2}{category2}，温柔甜美",
        ],
    },
    "travel": {
        "name_cn": "旅行",
        "name_en": "Travel",
        "formality": "casual",
        "male_categories": ["jacket", "hoodie", "jeans", "t_shirt", "sneakers", "windbreaker"],
        "female_categories": ["jacket", "sneakers", "jeans", "t_shirt", "windbreaker", "backpack"],
        "male_colors": ["olive", "navy", "khaki", "grey", "black"],
        "female_colors": ["white", "khaki", "navy", "sage_green", "denim_blue"],
        "male_styles": ["户外机能", "城市漫游", "休闲运动", "轻装旅行"],
        "female_styles": ["休闲运动", "城市漫步", "户外轻旅", "舒适随性"],
        "male_desc_templates": [
            "旅行穿搭推荐，{style}风格，{color}{category}搭配{color2}{category2}，舒适又实用",
            "冬季旅行穿搭，{color}{category}配{color2}{category2}，{style}风格，保暖又时尚",
            "旅行穿搭指南，{color}{category}与{color2}{category2}，{style}风，轻装上阵",
            "旅行场合穿搭，{color}{category}搭配{color2}{category2}，{style}风格，方便活动又好看",
        ],
        "female_desc_templates": [
            "旅行穿搭推荐，{style}风格，{color}{category}搭配{color2}{category2}，舒适又好看",
            "旅行穿搭指南，{color}{category}配{color2}{category2}，{style}风，轻便又时尚",
            "冬季旅行穿搭，{color}{category}与{color2}{category2}，{style}风格，保暖舒适",
            "旅行场合穿搭，{color}{category}搭配{color2}{category2}，{style}风，方便活动",
        ],
    },
    "commute": {
        "name_cn": "通勤",
        "name_en": "Commute",
        "formality": "smart_casual",
        "male_categories": ["blazer", "chinos", "polo_shirt", "casual_shirt", "loafers", "sweater"],
        "female_categories": ["blazer", "blouse", "trousers", "midi_skirt", "loafers", "knit_top"],
        "male_colors": ["navy", "grey", "white", "camel", "olive"],
        "female_colors": ["beige", "navy", "white", "grey", "blush"],
        "male_styles": ["Smart Casual", "商务休闲", "都市通勤", "简约质感"],
        "female_styles": ["优雅通勤", "Smart Casual", "都市白领", "简约知性"],
        "male_desc_templates": [
            "通勤穿搭推荐，{style}风格，{color}{category}搭配{color2}{category2}，得体又舒适",
            "日常通勤穿搭，{color}{category}配{color2}{category2}，{style}风格，职场与休闲兼顾",
            "通勤穿搭指南，{color}{category}与{color2}{category2}，{style}风，简约不简单",
            "通勤场合穿搭，{color}{category}搭配{color2}{category2}，{style}风格，专业又轻松",
        ],
        "female_desc_templates": [
            "通勤穿搭推荐，{style}风格，{color}{category}搭配{color2}{category2}，优雅又舒适",
            "日常通勤穿搭，{color}{category}配{color2}{category2}，{style}风格，职场气质满分",
            "通勤穿搭指南，{color}{category}与{color2}{category2}，{style}风，简约大方",
            "通勤场合穿搭，{color}{category}搭配{color2}{category2}，{style}风格，知性优雅",
        ],
    },
}

COLOR_CN = {
    "navy": "深蓝色", "charcoal": "炭灰色", "white": "白色", "light_blue": "浅蓝色",
    "grey": "灰色", "black": "黑色", "beige": "米色", "blush": "粉色",
    "burgundy": "酒红色", "olive": "橄榄绿", "cream": "奶油白", "camel": "驼色",
    "sage_green": "鼠尾草绿", "dusty_rose": "灰粉色", "khaki": "卡其色",
    "denim_blue": "牛仔蓝",
}

CATEGORY_CN = {
    "suit": "西装", "dress_shirt": "正装衬衫", "trousers": "西裤", "blazer": "休闲西装",
    "tie": "领带", "leather_shoes": "皮鞋", "blouse": "衬衫", "pencil_skirt": "铅笔裙",
    "mid_heel_shoes": "中跟鞋", "knit_sweater": "针织衫", "chinos": "卡其裤",
    "casual_shirt": "休闲衬衫", "jacket": "夹克", "sneakers": "运动鞋", "coat": "大衣",
    "dress": "连衣裙", "knit_cardigan": "针织开衫", "skirt": "半裙", "heels": "高跟鞋",
    "hoodie": "卫衣", "jeans": "牛仔裤", "t_shirt": "T恤", "windbreaker": "风衣",
    "backpack": "双肩包", "polo_shirt": "Polo衫", "loafers": "乐福鞋",
    "sweater": "毛衣", "midi_skirt": "中长裙", "knit_top": "针织上衣",
}


def generate_description(template: str, style: str, color: str, category: str,
                         color2: str, category2: str) -> str:
    return template.format(
        style=style,
        color=COLOR_CN.get(color, color),
        category=CATEGORY_CN.get(category, category),
        color2=COLOR_CN.get(color2, color2),
        category2=CATEGORY_CN.get(category2, category2),
    )


def generate_mock_item(item_id: int, occasion: str, gender: str) -> Dict[str, Any]:
    config = OCCASION_CONFIG[occasion]
    categories = config[f"{gender}_categories"]
    colors = config[f"{gender}_colors"]
    styles = config[f"{gender}_styles"]
    templates = config[f"{gender}_desc_templates"]

    cat1, cat2 = random.sample(categories, 2)
    color1, color2 = random.sample(colors, 2)
    style = random.choice(styles)
    template = random.choice(templates)

    description = generate_description(template, style, color1, cat1, color2, cat2)

    return {
        "id": f"cf_{item_id:05d}",
        "occasion": occasion,
        "occasion_cn": config["name_cn"],
        "gender": gender,
        "category": cat1,
        "category_cn": CATEGORY_CN.get(cat1, cat1),
        "style": style,
        "colors": [color1, color2],
        "colors_cn": [COLOR_CN.get(color1, color1), COLOR_CN.get(color2, color2)],
        "chinese_description": description,
        "english_description": f"{style} {color1} {cat1} with {color2} {cat2} for {config['name_en']}",
        "image_id": f"img_{item_id:05d}.png",
        "formality": config["formality"],
    }


def generate_mock_dataset(num_items: int = 5000) -> List[Dict[str, Any]]:
    items = []
    items_per_occasion_gender = num_items // (len(OCCASIONS) * len(GENDERS))

    item_id = 0
    for occasion in OCCASIONS:
        for gender in GENDERS:
            for _ in range(items_per_occasion_gender):
                items.append(generate_mock_item(item_id, occasion, gender))
                item_id += 1

    while len(items) < num_items:
        occasion = random.choice(OCCASIONS)
        gender = random.choice(GENDERS)
        items.append(generate_mock_item(item_id, occasion, gender))
        item_id += 1

    random.shuffle(items)
    logger.info(f"Generated {len(items)} mock items")
    return items


def generate_placeholder_images(items: List[Dict[str, Any]]) -> None:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        logger.warning("Pillow not available, skipping image generation")
        return

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    occasion_colors = {
        "interview": (25, 25, 112),
        "date": (199, 21, 133),
        "travel": (34, 139, 34),
        "commute": (70, 130, 180),
    }

    existing = set(os.listdir(IMAGES_DIR))
    to_generate = [item for item in items if item["image_id"] not in existing]
    if not to_generate:
        logger.info("All images already exist, skipping generation")
        return

    logger.info(f"Generating {len(to_generate)} placeholder images...")

    for i, item in enumerate(to_generate):
        base_color = occasion_colors.get(item["occasion"], (128, 128, 128))
        variation = random.randint(-30, 30)
        color = tuple(max(0, min(255, c + variation)) for c in base_color)

        img = Image.new("RGB", (224, 224), color)
        draw = ImageDraw.Draw(img)

        label = f"{item['occasion_cn']}\n{item['gender']}\n{item['category_cn']}"
        try:
            font = ImageFont.truetype("arial.ttf", 16)
        except (IOError, OSError):
            font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), label, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        x = (224 - text_w) // 2
        y = (224 - text_h) // 2
        draw.text((x, y), label, fill="white", font=font)

        img.save(IMAGES_DIR / item["image_id"], "PNG")

        if (i + 1) % 500 == 0:
            logger.info(f"  Generated {i + 1}/{len(to_generate)} images")

    logger.info(f"Generated {len(to_generate)} placeholder images in {IMAGES_DIR}")


DEEPFASHION2_CATEGORY_MAP = {
    1: {"en": "short_sleeve_top", "cn": "短袖上衣"},
    2: {"en": "long_sleeve_top", "cn": "长袖上衣"},
    3: {"en": "short_sleeve_outwear", "cn": "短袖外套"},
    4: {"en": "long_sleeve_outwear", "cn": "长袖外套"},
    5: {"en": "vest", "cn": "马甲"},
    6: {"en": "sling", "cn": "吊带"},
    7: {"en": "shorts", "cn": "短裤"},
    8: {"en": "trousers", "cn": "长裤"},
    9: {"en": "skirt", "cn": "半裙"},
    10: {"en": "short_sleeve_dress", "cn": "短袖连衣裙"},
    11: {"en": "long_sleeve_dress", "cn": "长袖连衣裙"},
    12: {"en": "vest_dress", "cn": "马甲裙"},
    13: {"en": "sling_dress", "cn": "吊带裙"},
}

DEEPFASHION2_STYLE_TEMPLATES = {
    "top": [
        "{color_cn}{category_cn}，{occasion_cn}穿搭推荐，{style}风格",
        "{style}风格{category_cn}，{color_cn}配色，适合{occasion_cn}场合",
        "{occasion_cn}场合首选{category_cn}，{color_cn}色调{style}风",
    ],
    "bottom": [
        "{color_cn}{category_cn}搭配，{occasion_cn}穿搭推荐",
        "{style}风格{category_cn}，{color_cn}配色，{occasion_cn}场合",
    ],
    "dress": [
        "{color_cn}{category_cn}，{occasion_cn}穿搭推荐，{style}风格",
        "{style}风{category_cn}，{color_cn}色调，{occasion_cn}场合首选",
    ],
    "outwear": [
        "{color_cn}{category_cn}，{occasion_cn}穿搭推荐，{style}风格",
        "{style}风格外套，{color_cn}{category_cn}，{occasion_cn}场合",
    ],
}

DEEPFASHION2_OCCASION_MAP = {
    1: "interview",
    2: "interview",
    3: "commute",
    4: "commute",
    5: "date",
    6: "date",
    7: "travel",
    8: "commute",
    9: "date",
    10: "date",
    11: "interview",
    12: "date",
    13: "date",
}

DEEPFASHION2_GENDER_MAP = {
    1: "male", 2: "male", 3: "male", 4: "male",
    5: "male", 7: "male", 8: "male",
    6: "female", 9: "female",
    10: "female", 11: "female", 12: "female", 13: "female",
}

DEEPFASHION2_COLOR_KEYWORDS = {
    "black": "黑色", "white": "白色", "red": "红色", "blue": "蓝色",
    "green": "绿色", "yellow": "黄色", "pink": "粉色", "purple": "紫色",
    "gray": "灰色", "grey": "灰色", "brown": "棕色", "beige": "米色",
    "navy": "深蓝色", "khaki": "卡其色", "orange": "橙色", "cream": "奶油色",
}


def load_deepfashion2_dataset(max_items: Optional[int] = None) -> List[Dict[str, Any]]:
    """Load real fashion images from DeepFashion2 dataset with Chinese annotations.

    DeepFashion2 expected directory structure:
        data/raw/DeepFashion2/
        ├── train/
        │   ├── image/
        │   │   ├── 000001.jpg
        │   │   └── ...
        │   └── annos/
        │       ├── 000001.json
        │       └── ...
        └── validation/
            ├── image/
            └── annos/

    Also supports flat structure:
        data/raw/DeepFashion2/
        ├── train_image/
        ├── train_annos/
        ├── validation_image/
        └── validation_annos/
    """
    df2_path = ModelPaths.get_deepfashion2_path()
    if not df2_path.exists():
        logger.warning(f"DeepFashion2 not found at {df2_path}")
        return []

    items = []
    item_id = 0

    for split_name in ["train", "validation"]:
        images_dir = df2_path / split_name / "image"
        annos_dir = df2_path / split_name / "annos"

        if not images_dir.exists():
            images_dir = df2_path / f"{split_name}_image"
            annos_dir = df2_path / f"{split_name}_annos"

        if not images_dir.exists():
            logger.warning(f"DeepFashion2 {split_name} images not found at {images_dir}")
            continue

        anno_files = sorted(annos_dir.glob("*.json")) if annos_dir.exists() else []
        if not anno_files:
            logger.warning(f"DeepFashion2 {split_name} annotations not found at {annos_dir}")
            continue

        logger.info(f"Loading DeepFashion2 {split_name}: {len(anno_files)} annotation files")

        for anno_path in anno_files:
            if max_items and item_id >= max_items:
                break

            try:
                with open(anno_path, encoding="utf-8") as f:
                    anno = json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                logger.debug(f"Skipping {anno_path}: {e}")
                continue

            img_stem = anno_path.stem
            img_path = _find_deepfashion2_image(images_dir, img_stem)
            if not img_path:
                continue

            source = anno.get("source", "")
            pair_id = anno.get("pair_id", "")

            item_keys = [k for k in anno.keys() if k.startswith("item")]
            if not item_keys:
                continue

            for item_key in item_keys:
                if max_items and item_id >= max_items:
                    break

                item_data = anno[item_key]
                category_id = item_data.get("category_id", 0)
                if category_id not in DEEPFASHION2_CATEGORY_MAP:
                    continue

                cat_info = DEEPFASHION2_CATEGORY_MAP[category_id]
                occasion = DEEPFASHION2_OCCASION_MAP.get(category_id, "commute")
                gender = DEEPFASHION2_GENDER_MAP.get(category_id, random.choice(GENDERS))

                color_cn = _infer_color_from_name(img_stem, source)
                style = random.choice(OCCASION_CONFIG[occasion][f"{gender}_styles"])
                cn_desc = _build_deepfashion2_description(
                    cat_info, occasion, gender, style, color_cn
                )

                items.append({
                    "id": f"df2_{item_id:05d}",
                    "occasion": occasion,
                    "occasion_cn": OCCASION_CONFIG[occasion]["name_cn"],
                    "gender": gender,
                    "category": cat_info["en"],
                    "category_cn": cat_info["cn"],
                    "style": style,
                    "colors": [],
                    "colors_cn": [color_cn] if color_cn else [],
                    "chinese_description": cn_desc,
                    "english_description": f"{cat_info['en']} for {OCCASION_CONFIG[occasion]['name_en']}",
                    "image_id": img_path.name,
                    "image_path": str(img_path),
                    "formality": OCCASION_CONFIG[occasion]["formality"],
                    "source": "deepfashion2",
                    "deepfashion2_category_id": category_id,
                })
                item_id += 1

        logger.info(f"DeepFashion2 {split_name}: loaded {item_id} items so far")

    logger.info(f"DeepFashion2 total: {len(items)} items")
    return items


def _find_deepfashion2_image(images_dir: Path, stem: str) -> Optional[Path]:
    for ext in [".jpg", ".jpeg", ".png", ".webp"]:
        p = images_dir / f"{stem}{ext}"
        if p.exists():
            return p
    return None


def _infer_color_from_name(img_stem: str, source: str) -> str:
    name_lower = (img_stem + " " + source).lower()
    for en, cn in DEEPFASHION2_COLOR_KEYWORDS.items():
        if en in name_lower:
            return cn
    return random.choice(list(DEEPFASHION2_COLOR_KEYWORDS.values()))


def _build_deepfashion2_description(
    cat_info: Dict, occasion: str, gender: str, style: str, color_cn: str
) -> str:
    category_en = cat_info["en"]
    if "dress" in category_en or "skirt" in category_en:
        group = "dress"
    elif "outwear" in category_en or "vest" == category_en:
        group = "outwear"
    elif category_en in ("shorts", "trousers"):
        group = "bottom"
    else:
        group = "top"

    templates = DEEPFASHION2_STYLE_TEMPLATES.get(group, DEEPFASHION2_STYLE_TEMPLATES["top"])
    template = random.choice(templates)
    return template.format(
        color_cn=color_cn,
        category_cn=cat_info["cn"],
        occasion_cn=OCCASION_CONFIG[occasion]["name_cn"],
        style=style,
    )


def load_real_dataset(dataset: str = "auto", max_items: Optional[int] = None) -> List[Dict[str, Any]]:
    """Load real fashion images from data/raw/ directories with Chinese annotations.

    Args:
        dataset: Which dataset to load.
            - "auto": Try DeepFashion2 first, then Fashion Product Images
            - "deepfashion2": Only load DeepFashion2
            - "fashion_product": Only load Fashion Product Images
        max_items: Maximum number of items to load (None = all)
    """
    if dataset in ("auto", "deepfashion2"):
        items = load_deepfashion2_dataset(max_items=max_items)
        if items:
            return items
        if dataset == "deepfashion2":
            logger.warning("DeepFashion2 dataset not found, falling back to mock data")
            return generate_mock_dataset()

    if dataset in ("auto", "fashion_product"):
        items = _load_fashion_product_dataset(max_items=max_items)
        if items:
            return items
        if dataset == "fashion_product":
            logger.warning("Fashion Product Images dataset not found, falling back to mock data")
            return generate_mock_dataset()

    logger.warning("No real data found, falling back to mock data")
    return generate_mock_dataset()


def _load_fashion_product_dataset(max_items: Optional[int] = None) -> List[Dict[str, Any]]:
    """Load real fashion images from Fashion Product Images dataset."""
    items = []
    item_id = 0

    fashion_images_path = ModelPaths.get_fashion_product_images_path()
    if fashion_images_path and fashion_images_path.exists():
        logger.info(f"Loading from Fashion Product Images: {fashion_images_path}")
        styles_csv = ModelPaths.get_styles_csv_path()
        if styles_csv.exists():
            import csv
            with open(styles_csv, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if max_items and item_id >= max_items:
                        break

                    img_filename = f"{row['id']}.jpg"
                    img_path = fashion_images_path / "images" / img_filename
                    if not img_path.exists():
                        continue

                    en_name = row.get("productDisplayName", "")
                    sub_cat = row.get("subCategory", "")
                    article_type = row.get("articleType", "")
                    base_color = row.get("baseColour", "")
                    season = row.get("season", "")
                    usage = row.get("usage", "")

                    cn_desc = _translate_to_chinese(en_name, sub_cat, article_type, base_color, season, usage)

                    items.append({
                        "id": f"cf_{item_id:05d}",
                        "occasion": _map_occasion(usage, sub_cat),
                        "occasion_cn": _occasion_cn(_map_occasion(usage, sub_cat)),
                        "gender": _map_gender(row.get("gender", "")),
                        "category": article_type.lower().replace(" ", "_"),
                        "category_cn": article_type,
                        "style": usage or "casual",
                        "colors": [base_color.lower()] if base_color else [],
                        "colors_cn": [base_color] if base_color else [],
                        "chinese_description": cn_desc,
                        "english_description": en_name,
                        "image_id": img_filename,
                        "image_path": str(img_path),
                        "formality": _map_formality(usage),
                        "source": "fashion_product_images",
                    })
                    item_id += 1

            logger.info(f"Loaded {len(items)} items from Fashion Product Images")

    return items


def _translate_to_chinese(en_name: str, sub_cat: str, article_type: str,
                          base_color: str, season: str, usage: str) -> str:
    color_cn_map = {
        "black": "黑色", "white": "白色", "blue": "蓝色", "red": "红色",
        "green": "绿色", "grey": "灰色", "navy": "深蓝色", "beige": "米色",
        "brown": "棕色", "pink": "粉色", "purple": "紫色", "yellow": "黄色",
        "orange": "橙色", "cream": "奶油色", "gold": "金色", "silver": "银色",
    }
    usage_cn_map = {
        "casual": "休闲", "formal": "正式", "smart casual": "商务休闲",
        "party": "派对", "sports": "运动", "ethnic": "民族风",
    }
    season_cn_map = {
        "summer": "夏季", "winter": "冬季", "fall": "秋季", "spring": "春季",
    }

    color_cn = color_cn_map.get(base_color.lower(), base_color) if base_color else ""
    usage_cn = usage_cn_map.get(usage.lower(), usage) if usage else "日常"
    season_cn = season_cn_map.get(season.lower(), "") if season else ""

    parts = []
    if season_cn:
        parts.append(season_cn)
    parts.append(usage_cn)
    if color_cn:
        parts.append(color_cn)
    parts.append(article_type)

    return "".join(parts) + "穿搭推荐"


def _map_occasion(usage: str, sub_cat: str) -> str:
    if not usage:
        return "commute"
    usage_lower = usage.lower()
    if usage_lower in ("formal",):
        return "interview"
    if usage_lower in ("party",):
        return "date"
    if usage_lower in ("sports",) or sub_cat.lower() in ("sportswear",):
        return "travel"
    return "commute"


def _occasion_cn(occasion: str) -> str:
    return OCCASION_CONFIG.get(occasion, {}).get("name_cn", occasion)


def _map_gender(gender: str) -> str:
    if not gender:
        return random.choice(GENDERS)
    g = gender.lower()
    if g in ("men", "male", "boys"):
        return "male"
    if g in ("women", "female", "girls"):
        return "female"
    return random.choice(GENDERS)


def _map_formality(usage: str) -> str:
    if not usage:
        return "smart_casual"
    mapping = {
        "formal": "formal", "casual": "casual", "smart casual": "smart_casual",
        "party": "semi_formal", "sports": "casual",
    }
    return mapping.get(usage.lower(), "smart_casual")


def split_dataset(items: List[Dict[str, Any]],
                  train_ratio: float = 0.8,
                  val_ratio: float = 0.1,
                  test_ratio: float = 0.1) -> Dict[str, List[Dict[str, Any]]]:
    random.seed(42)
    indices = list(range(len(items)))
    random.shuffle(indices)

    train_end = int(len(indices) * train_ratio)
    val_end = train_end + int(len(indices) * val_ratio)

    splits = {
        "train": [items[i] for i in indices[:train_end]],
        "val": [items[i] for i in indices[train_end:val_end]],
        "test": [items[i] for i in indices[val_end:]],
    }

    logger.info(f"Dataset split: train={len(splits['train'])}, val={len(splits['val'])}, test={len(splits['test'])}")
    return splits


def save_dataset(splits: Dict[str, List[Dict[str, Any]]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    all_items = []
    for split_name, split_items in splits.items():
        for item in split_items:
            item_copy = dict(item)
            item_copy["split"] = split_name
            all_items.append(item_copy)

    annotations_path = output_dir / "annotations.json"
    with open(annotations_path, "w", encoding="utf-8") as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)
    logger.info(f"Saved {len(all_items)} annotations to {annotations_path}")

    stats = {
        "total": len(all_items),
        "splits": {k: len(v) for k, v in splits.items()},
        "occasions": {},
        "genders": {},
    }
    for item in all_items:
        occ = item["occasion"]
        stats["occasions"][occ] = stats["occasions"].get(occ, 0) + 1
        g = item["gender"]
        stats["genders"][g] = stats["genders"].get(g, 0) + 1

    stats_path = output_dir / "dataset_stats.json"
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    logger.info(f"Dataset stats saved to {stats_path}")
    logger.info(f"Stats: {json.dumps(stats, ensure_ascii=False, indent=2)}")


def main():
    parser = argparse.ArgumentParser(description="Prepare ChineseFashionCLIP fine-tune data")
    parser.add_argument("--mode", choices=["mock", "real"], default="mock",
                        help="Data generation mode: mock (synthetic) or real (from disk)")
    parser.add_argument("--dataset", choices=["auto", "deepfashion2", "fashion_product"], default="auto",
                        help="Which real dataset to load (real mode only): auto (try DeepFashion2 first), "
                             "deepfashion2, fashion_product")
    parser.add_argument("--num-items", type=int, default=5000,
                        help="Number of items to generate (mock mode) or max items to load (real mode)")
    parser.add_argument("--output-dir", type=str, default=str(FINETUNE_DIR),
                        help="Output directory for prepared data")
    parser.add_argument("--skip-images", action="store_true",
                        help="Skip placeholder image generation (mock mode)")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    logger.info(f"Preparing ChineseFashionCLIP data (mode={args.mode}, dataset={args.dataset})")

    if args.mode == "mock":
        items = generate_mock_dataset(args.num_items)
        if not args.skip_images:
            generate_placeholder_images(items)
    else:
        items = load_real_dataset(dataset=args.dataset, max_items=args.num_items)

    splits = split_dataset(items)
    save_dataset(splits, output_dir)

    logger.info("Data preparation complete!")


if __name__ == "__main__":
    main()
