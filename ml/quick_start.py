"""
快速启动脚本 - 一键初始化风格推荐系统
"""

import os
import sys
import json
import asyncio
import subprocess
from pathlib import Path
from datetime import datetime


def print_header(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def print_step(step: int, total: int, description: str):
    print(f"[{step}/{total}] {description}...")


def check_dependencies():
    print_header("检查依赖")
    
    required_packages = [
        "torch", "transformers", "numpy", "pillow", "tqdm"
    ]
    
    missing = []
    for pkg in required_packages:
        try:
            __import__(pkg)
            print(f"  ✓ {pkg}")
        except ImportError:
            print(f"  ✗ {pkg} (缺失)")
            missing.append(pkg)
    
    if missing:
        print(f"\n请安装缺失的依赖:")
        print(f"  pip install {' '.join(missing)}")
        return False
    
    return True


def generate_sample_data():
    print_header("生成示例数据")
    
    data_dir = Path("data/processed")
    data_dir.mkdir(parents=True, exist_ok=True)
    
    styles = ["casual", "formal", "sporty", "streetwear", "minimalist", 
              "bohemian", "vintage", "romantic", "korean", "french"]
    categories = ["tops", "bottoms", "dresses", "outerwear", "footwear", "accessories"]
    colors = ["black", "white", "gray", "navy", "blue", "red", "pink", "green", "beige"]
    occasions = ["daily", "work", "date", "party", "sport", "travel"]
    seasons = ["spring", "summer", "autumn", "winter"]
    
    items = {}
    for i in range(1000):
        item_id = f"item_{i:05d}"
        items[item_id] = {
            "item_id": item_id,
            "image_path": f"images/{categories[i % 6]}/{item_id}.jpg",
            "category": categories[i % 6],
            "style_tags": [styles[i % 10], styles[(i + 1) % 10]],
            "color_tags": [colors[i % 9]],
            "occasion_tags": [occasions[i % 6]],
            "season_tags": [seasons[i % 4], seasons[(i + 1) % 4]],
            "pattern": "solid",
            "material": "cotton",
            "fit": "regular",
            "popularity_score": float(i % 100),
            "source": "synthetic",
            "attributes": {}
        }
    
    outfits = {}
    for i in range(200):
        outfit_id = f"outfit_{i:05d}"
        outfits[outfit_id] = {
            "outfit_id": outfit_id,
            "item_ids": [f"item_{j:05d}" for j in range(i * 5, i * 5 + 4)],
            "style_tags": [styles[i % 10]],
            "occasion_tags": [occasions[i % 6]],
            "season_tags": [seasons[i % 4]],
            "compatibility_score": 0.8,
            "popularity_score": float(i % 50),
            "source": "synthetic"
        }
    
    users = {}
    for i in range(100):
        user_id = f"user_{i:05d}"
        users[user_id] = {
            "user_id": user_id,
            "body_type": ["rectangle", "hourglass", "triangle"][i % 3],
            "skin_tone": ["fair", "light", "medium"][i % 3],
            "style_preferences": [styles[i % 10]],
            "occasion_preferences": [occasions[i % 6]],
            "favorite_items": [f"item_{j:05d}" for j in range(i * 10, i * 10 + 5)]
        }
    
    with open(data_dir / "items.json", 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    
    with open(data_dir / "outfits.json", 'w', encoding='utf-8') as f:
        json.dump(outfits, f, ensure_ascii=False, indent=2)
    
    with open(data_dir / "users.json", 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)
    
    stats = {
        "total_items": len(items),
        "total_outfits": len(outfits),
        "total_users": len(users),
        "processed_at": datetime.now().isoformat()
    }
    
    with open(data_dir / "stats.json", 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    
    print(f"  ✓ 生成 {len(items)} 个商品")
    print(f"  ✓ 生成 {len(outfits)} 套搭配")
    print(f"  ✓ 生成 {len(users)} 个用户")
    
    return True


def build_vector_index():
    print_header("构建向量索引")
    
    try:
        from ml.services.style_vector_index import StyleIndexService, StyleIndexConfig
        import numpy as np
        
        config = StyleIndexConfig(
            index_path="./data/indices/style_index"
        )
        service = StyleIndexService(config)
        service.build_index_from_data("./data/processed")
        
        print("  ✓ 向量索引构建完成")
        return True
    except Exception as e:
        print(f"  ✗ 构建失败: {e}")
        print("  使用备用方案...")
        
        index_dir = Path("data/indices")
        index_dir.mkdir(parents=True, exist_ok=True)
        
        metadata = {
            "metadata": {},
            "style_to_items": {},
            "category_to_items": {},
            "config": {"embedding_dim": 512}
        }
        
        with open(index_dir / "style_metadata.json", 'w') as f:
            json.dump(metadata, f)
        
        print("  ✓ 备用索引创建完成")
        return True


async def test_style_service():
    print_header("测试风格理解服务")
    
    try:
        from ml.services.style_understanding_service import StyleUnderstandingService
        
        service = StyleUnderstandingService(use_mock=True)
        
        test_inputs = [
            "我想要小红书同款的穿搭",
            "法式慵懒风怎么穿",
            "韩系甜美风格推荐"
        ]
        
        for user_input in test_inputs:
            analysis = await service.analyze_style_description(user_input)
            print(f"  输入: {user_input}")
            print(f"  → 风格: {analysis.style_name}")
            print(f"  → 单品: {', '.join(analysis.key_items[:3])}")
            print()
        
        print("  ✓ 风格理解服务正常")
        return True
    except Exception as e:
        print(f"  ✗ 测试失败: {e}")
        return False


def print_next_steps():
    print_header("下一步操作")
    
    print("""
1. 启动ML服务:
   cd ml
   python -m inference.inference_service

2. 启动后端服务:
   cd apps/backend
   pnpm start

3. 测试API:
   curl -X POST http://localhost:8001/api/style/analyze \\
     -H "Content-Type: application/json" \\
     -d '{"user_input": "我想要小红书同款的穿搭"}'

4. 查看文档:
   cat ml/STYLE_AI_GUIDE.md

5. 训练模型 (可选):
   python -m ml.models.fashion_clip_finetune --mode train
""")


def main():
    print("""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       智能风格推荐系统 - 快速启动                            ║
║       公开数据集微调 + LLM 风格理解                          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    steps = [
        ("检查依赖", check_dependencies),
        ("生成示例数据", generate_sample_data),
        ("构建向量索引", build_vector_index),
        ("测试风格服务", lambda: asyncio.run(test_style_service())),
    ]
    
    for i, (name, func) in enumerate(steps, 1):
        print_step(i, len(steps), name)
        if not func():
            print(f"\n❌ 初始化失败: {name}")
            sys.exit(1)
    
    print("\n✅ 初始化完成!")
    print_next_steps()


if __name__ == "__main__":
    main()
