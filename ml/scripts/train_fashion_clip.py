"""
快速训练FashionCLIP模型
使用现有数据进行轻量级微调
"""

import os
import sys
import json
import torch
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from models.fashion_clip_finetune import (
    FashionCLIPConfig,
    FashionCLIPModel,
    FashionCLIPTrainer,
    FashionDataset
)

DATA_DIR = PROJECT_ROOT / "data"
PROCESSED_DIR = DATA_DIR / "processed"
MODELS_DIR = PROJECT_ROOT / "models" / "weights"
TRAIN_OUTPUT_DIR = MODELS_DIR / "fashion_clip"


def prepare_training_data():
    items_file = PROCESSED_DIR / "items.json"
    
    if not items_file.exists():
        print(f"数据文件不存在: {items_file}")
        return None
    
    with open(items_file, 'r', encoding='utf-8') as f:
        items = json.load(f)
    
    training_data = []
    for item_id, item in items.items():
        if item.get("embedding"):
            training_data.append({
                "id": item_id,
                "image_path": item.get("image_path", ""),
                "category": item.get("category", "tops"),
                "style_tags": item.get("style_tags", ["casual"]),
                "color_tags": item.get("color_tags", []),
                "occasion_tags": item.get("occasion_tags", ["daily"]),
                "season_tags": item.get("season_tags", []),
                "product_name": item.get("product_name", ""),
                "description": item.get("description", "")
            })
    
    print(f"准备训练数据: {len(training_data)} 条")
    return training_data


def quick_train():
    print("=" * 50)
    print("FashionCLIP 快速训练")
    print("=" * 50)
    
    training_data = prepare_training_data()
    if not training_data:
        print("无法准备训练数据")
        return False
    
    config = FashionCLIPConfig(
        model_name="openai/clip-vit-base-patch32",
        max_epochs=3,
        batch_size=16,
        learning_rate=2e-5,
        finetune_mode="lora",
        lora_r=8,
        lora_alpha=16,
        output_dir=str(TRAIN_OUTPUT_DIR),
        save_steps=100,
        eval_steps=50,
        logging_steps=10
    )
    
    print(f"\n配置:")
    print(f"  - 最大轮数: {config.max_epochs}")
    print(f"  - 批大小: {config.batch_size}")
    print(f"  - 学习率: {config.learning_rate}")
    print(f"  - 微调模式: {config.finetune_mode}")
    
    print("\n初始化模型...")
    model = FashionCLIPModel(config)
    
    print("创建数据集...")
    style_labels = {
        "casual": 0, "formal": 1, "sporty": 2, "streetwear": 3,
        "minimalist": 4, "bohemian": 5, "vintage": 6, "romantic": 7,
        "edgy": 8, "elegant": 9, "korean": 10, "japanese": 11,
        "french": 12, "preppy": 13, "smart_casual": 14
    }
    category_labels = {
        "tops": 0, "bottoms": 1, "dresses": 2,
        "outerwear": 3, "footwear": 4, "accessories": 5
    }
    occasion_labels = {
        "daily": 0, "work": 1, "party": 2, "date": 3,
        "vacation": 4, "sport": 5, "formal": 6, "casual": 7
    }
    
    dataset = FashionDataset(
        data_path=str(DATA_DIR),
        processor=model.processor,
        style_labels=style_labels,
        category_labels=category_labels,
        occasion_labels=occasion_labels
    )
    
    train_size = int(len(dataset) * 0.9)
    eval_size = len(dataset) - train_size
    
    train_dataset, eval_dataset = torch.utils.data.random_split(
        dataset, [train_size, eval_size]
    )
    
    print(f"训练集: {train_size} 条")
    print(f"验证集: {eval_size} 条")
    
    trainer = FashionCLIPTrainer(
        model=model,
        config=config,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset
    )
    
    print("\n开始训练...")
    start_time = datetime.now()
    
    metrics = trainer.train()
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    print(f"\n训练完成!")
    print(f"  - 耗时: {duration:.1f} 秒")
    print(f"  - 最终损失: {metrics.get('final_loss', 0):.4f}")
    print(f"  - 风格准确率: {metrics.get('style_accuracy', 0):.4f}")
    
    output_path = TRAIN_OUTPUT_DIR / "final_model"
    print(f"  - 模型保存: {output_path}")
    
    return True


def save_inference_model():
    """保存推理用模型"""
    print("\n保存推理模型...")
    
    config = FashionCLIPConfig()
    model = FashionCLIPModel(config)
    
    final_model_path = TRAIN_OUTPUT_DIR / "final_model"
    if final_model_path.exists():
        checkpoint = torch.load(final_model_path / "pytorch_model.bin", map_location='cpu', weights_only=True)
        model.load_state_dict(checkpoint.get('model_state_dict', checkpoint), strict=False)
        print("加载训练权重成功")
    
    output_path = MODELS_DIR / "fashion_clip_inference.pt"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    torch.save({
        'config': config.__dict__,
        'model_state_dict': model.state_dict(),
        'style_classifier': model.style_classifier.state_dict(),
        'category_classifier': model.category_classifier.state_dict(),
    }, output_path)
    
    print(f"推理模型保存到: {output_path}")
    return True


if __name__ == "__main__":
    success = quick_train()
    if success:
        save_inference_model()
    print("\n全部完成!")
