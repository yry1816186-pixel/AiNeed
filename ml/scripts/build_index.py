"""
构建向量索引 - 从处理后的数据构建检索索引
"""

import os
import sys
import json
import numpy as np
from pathlib import Path
from tqdm import tqdm

PROJECT_ROOT = Path(__file__).parent.parent.parent
PROCESSED_DIR = Path(__file__).parent.parent / "data" / "processed"
INDEX_DIR = Path(__file__).parent.parent / "data" / "indices"

def build_index():
    print("构建向量索引...")
    
    items_file = PROCESSED_DIR / "items.json"
    if not items_file.exists():
        print(f"数据文件不存在: {items_file}")
        return False
    
    with open(items_file, 'r', encoding='utf-8') as f:
        items = json.load(f)
    
    print(f"加载 {len(items)} 个商品")
    
    embeddings = []
    ids = []
    metadata = {}
    
    for item_id, item in tqdm(items.items(), desc="处理嵌入"):
        if "embedding" in item:
            embeddings.append(item["embedding"])
            ids.append(item_id)
            metadata[item_id] = {
                "category": item.get("category", "unknown"),
                "style_tags": item.get("style_tags", []),
                "color_tags": item.get("color_tags", []),
                "occasion_tags": item.get("occasion_tags", []),
                "season_tags": item.get("season_tags", []),
                "gender": item.get("gender", ""),
                "product_name": item.get("product_name", ""),
                "image_path": item.get("image_path", ""),
                "source": item.get("source", "unknown")
            }
    
    if not embeddings:
        print("没有找到嵌入向量")
        return False
    
    embeddings = np.array(embeddings, dtype=np.float32)
    print(f"嵌入矩阵形状: {embeddings.shape}")
    
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    
    np.save(INDEX_DIR / "embeddings.npy", embeddings)
    np.save(INDEX_DIR / "ids.npy", np.array(ids, dtype=object))
    
    with open(INDEX_DIR / "metadata.json", 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    print(f"索引构建完成!")
    print(f"  - 嵌入向量: {len(embeddings)}")
    print(f"  - 保存位置: {INDEX_DIR}")
    
    return True

if __name__ == "__main__":
    build_index()
