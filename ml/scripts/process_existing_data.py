"""
处理现有数据集 - 将styles.csv和图片整合为推荐系统所需格式
"""

import os
import sys
import json
import csv
import numpy as np
from pathlib import Path
from datetime import datetime
from tqdm import tqdm
import torch
import torch.nn.functional as F
from PIL import Image

PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"
MODELS_DIR = Path(__file__).parent.parent / "models"

CATEGORY_MAPPING = {
    "Topwear": "tops", "Bottomwear": "bottoms", "Dresses": "dresses",
    "Innerwear": "tops", "Apparel": "tops", "Footwear": "footwear",
    "Shoes": "footwear", "Sandal": "footwear", "Flip Flops": "footwear",
    "Accessories": "accessories", "Watches": "accessories", "Bags": "accessories",
    "Belts": "accessories", "Socks": "accessories", "Jewellery": "accessories",
    "Personal Care": "accessories",
}

STYLE_MAPPING = {"Casual": "casual", "Formal": "formal", "Sports": "sporty", "Ethnic": "bohemian"}
SEASON_MAPPING = {"Summer": "summer", "Winter": "winter", "Fall": "autumn", "Spring": "spring"}

def load_clip_model():
    from transformers import CLIPModel, CLIPProcessor
    model_path = MODELS_DIR / "clip_fashion"
    if model_path.exists():
        print(f"从本地加载模型: {model_path}")
        model = CLIPModel.from_pretrained(str(model_path))
        processor = CLIPProcessor.from_pretrained(str(model_path))
    else:
        print("使用在线模型...")
        model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    model.eval()
    return model, processor, device

def process_styles_csv():
    csv_path = RAW_DIR / "styles.csv"
    images_dir = RAW_DIR / "images"
    
    print(f"CSV路径: {csv_path}")
    print(f"图片目录: {images_dir}")
    
    if not csv_path.exists():
        print(f"CSV文件不存在!")
        return {}
    
    items = {}
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        print(f"CSV行数: {len(rows)}")
        
        for row in tqdm(rows, desc="处理CSV"):
            item_id = row.get('id', '')
            if not item_id:
                continue
            
            image_path = images_dir / f"{item_id}.jpg"
            if not image_path.exists():
                continue
            
            sub_category = row.get('subCategory', '')
            category = CATEGORY_MAPPING.get(sub_category, 'accessories')
            
            usage = row.get('usage', 'Casual')
            style_tags = [STYLE_MAPPING.get(usage, 'casual')]
            
            season = row.get('season', '')
            season_tags = [SEASON_MAPPING.get(season, 'all')] if season else []
            
            base_colour = row.get('baseColour', '')
            color_tags = [base_colour.lower()] if base_colour else []
            
            gender = row.get('gender', '')
            product_name = row.get('productDisplayName', '')
            
            items[item_id] = {
                "item_id": item_id,
                "image_path": str(image_path),
                "category": category,
                "style_tags": style_tags,
                "color_tags": color_tags,
                "occasion_tags": ["daily"],
                "season_tags": season_tags,
                "pattern": "solid",
                "material": "unknown",
                "gender": gender,
                "product_name": product_name,
                "source": "styles_csv"
            }
    
    return items

def generate_embeddings(items, model, processor, device, max_items=500):
    result_items = {}
    count = 0
    
    for item_id, item in tqdm(items.items(), desc="生成嵌入"):
        if count >= max_items:
            print(f"达到最大数量限制: {max_items}")
            break
        try:
            image = Image.open(item["image_path"]).convert("RGB")
            inputs = processor(images=image, return_tensors="pt", padding=True)
            pixel_values = inputs["pixel_values"].to(device)
            
            with torch.no_grad():
                vision_outputs = model.vision_model(pixel_values=pixel_values)
                image_embeds = vision_outputs[1]
                image_embeds = model.visual_projection(image_embeds)
                image_embeds = F.normalize(image_embeds, p=2, dim=-1)
                embedding = image_embeds.cpu().numpy().flatten().tolist()
            
            item["embedding"] = embedding
            result_items[item_id] = item
            count += 1
            
        except Exception as e:
            print(f"处理 {item_id} 失败: {e}")
    
    print(f"成功生成 {len(result_items)} 个嵌入向量")
    return result_items

def generate_outfits(items):
    items_by_category = {}
    for item_id, item in items.items():
        cat = item.get("category", "accessories")
        if cat not in items_by_category:
            items_by_category[cat] = []
        items_by_category[cat].append(item_id)
    
    print(f"类别分布: {[(k, len(v)) for k, v in items_by_category.items()]}")
    
    outfits = {}
    outfit_count = 0
    
    num_outfits = min(200, len(items) // 3)
    
    for _ in range(num_outfits):
        outfit_items = []
        if "tops" in items_by_category and items_by_category["tops"]:
            outfit_items.append(np.random.choice(items_by_category["tops"]))
        if "bottoms" in items_by_category and items_by_category["bottoms"]:
            outfit_items.append(np.random.choice(items_by_category["bottoms"]))
        if "footwear" in items_by_category and items_by_category["footwear"]:
            outfit_items.append(np.random.choice(items_by_category["footwear"]))
        
        if len(outfit_items) >= 2:
            outfit_id = f"outfit_{outfit_count:05d}"
            outfits[outfit_id] = {
                "outfit_id": outfit_id,
                "item_ids": list(outfit_items),
                "style_tags": ["casual"],
                "occasion_tags": ["daily"],
                "season_tags": [],
                "compatibility_score": 0.8,
                "popularity_score": 0,
                "source": "generated"
            }
            outfit_count += 1
    
    print(f"生成了 {len(outfits)} 套搭配")
    return outfits

def main():
    print("="*60)
    print("处理现有数据集")
    print("="*60)
    print(f"项目根目录: {PROJECT_ROOT}")
    print(f"数据目录: {DATA_DIR}")
    print(f"输出目录: {PROCESSED_DIR}")
    
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    
    items = process_styles_csv()
    print(f"处理了 {len(items)} 个商品")
    
    if not items:
        print("没有找到有效数据")
        return
    
    try:
        model, processor, device = load_clip_model()
        print(f"模型加载成功，使用设备: {device}")
        items = generate_embeddings(items, model, processor, device, max_items=500)
    except Exception as e:
        print(f"嵌入生成失败: {e}")
        import traceback
        traceback.print_exc()
    
    outfits = generate_outfits(items)
    
    print("保存数据...")
    
    with open(PROCESSED_DIR / "items.json", 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    
    with open(PROCESSED_DIR / "outfits.json", 'w', encoding='utf-8') as f:
        json.dump(outfits, f, ensure_ascii=False, indent=2)
    
    stats = {
        "total_items": len(items),
        "total_outfits": len(outfits),
        "items_with_embeddings": sum(1 for i in items.values() if "embedding" in i),
        "category_distribution": {},
        "processed_at": datetime.now().isoformat()
    }
    
    for item in items.values():
        cat = item.get("category", "unknown")
        stats["category_distribution"][cat] = stats["category_distribution"].get(cat, 0) + 1
    
    with open(PROCESSED_DIR / "stats.json", 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    
    print("\n处理完成!")
    print(f"  商品: {stats['total_items']}")
    print(f"  搭配: {stats['total_outfits']}")
    print(f"  嵌入: {stats['items_with_embeddings']}")

if __name__ == "__main__":
    main()
