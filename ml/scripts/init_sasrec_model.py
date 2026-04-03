"""
SASRec Model Initialization Script
初始化 SASRec 序列推荐模型，支持从零开始创建或下载预训练模型
"""

import os
import sys
import json
import torch
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "inference"))

try:
    from sasrec_server import SASRecConfig, SASRecModel
except ImportError:
    print("Warning: Could not import SASRecModel. Using fallback configuration.")
    SASRecConfig = None
    SASRecModel = None


def create_default_config() -> Dict[str, Any]:
    """创建默认 SASRec 配置"""
    return {
        "item_num": 50000,
        "max_seq_len": 50,
        "hidden_size": 128,
        "num_heads": 2,
        "num_blocks": 2,
        "dropout": 0.2,
    }


def initialize_model(
    model_dir: str = "./models/sasrec",
    config_override: Optional[Dict[str, Any]] = None,
    pretrained_path: Optional[str] = None,
) -> bool:
    """
    初始化 SASRec 模型
    
    Args:
        model_dir: 模型保存目录
        config_override: 配置覆盖项
        pretrained_path: 预训练模型路径
    
    Returns:
        bool: 是否成功初始化
    """
    if SASRecModel is None or SASRecConfig is None:
        print("Error: SASRecModel not available. Please check sasrec_server.py")
        return False
    
    model_path = Path(model_dir)
    model_path.mkdir(parents=True, exist_ok=True)
    
    # 创建或加载配置
    config_data = create_default_config()
    if config_override:
        config_data.update(config_override)
    
    config_file = model_path / "config.json"
    if config_file.exists():
        with open(config_file, "r") as f:
            config_data = json.load(f)
    else:
        with open(config_file, "w") as f:
            json.dump(config_data, f, indent=2)
    
    config = SASRecConfig(**config_data)
    model = SASRecModel(config)
    
    # 加载预训练权重或随机初始化
    model_file = model_path / "model.pt"
    if pretrained_path and Path(pretrained_path).exists():
        print(f"Loading pretrained model from {pretrained_path}")
        state_dict = torch.load(pretrained_path, map_location="cpu", weights_only=True)
        model.load_state_dict(state_dict)
    elif model_file.exists():
        print(f"Loading existing model from {model_file}")
        state_dict = torch.load(model_file, map_location="cpu", weights_only=True)
        model.load_state_dict(state_dict)
    else:
        print("Initializing model with random weights")
        # 随机初始化的模型，适合从头训练
    
    # 保存模型
    torch.save(model.state_dict(), model_file)
    print(f"Model saved to {model_file}")
    
    # 创建示例元数据
    metadata_file = model_path / "item_metadata.json"
    if not metadata_file.exists():
        sample_metadata = {}
        for i in range(1, 101):
            sample_metadata[str(i)] = {
                "category": ["tops", "bottoms", "dresses", "outerwear", "footwear", "accessories"][i % 6],
                "style": ["casual", "formal", "streetwear", "elegant", "sporty"][i % 5],
                "colors": [["black", "white"], ["blue", "navy"], ["red", "pink"]][i % 3],
            }
        with open(metadata_file, "w", encoding="utf-8") as f:
            json.dump(sample_metadata, f, indent=2, ensure_ascii=False)
        print(f"Sample metadata saved to {metadata_file}")
    
    return True


def verify_model(model_dir: str = "./models/sasrec") -> Dict[str, Any]:
    """
    验证模型是否可用
    
    Returns:
        Dict with status information
    """
    model_path = Path(model_dir)
    
    result = {
        "model_dir": str(model_path),
        "exists": model_path.exists(),
        "config_exists": False,
        "model_exists": False,
        "metadata_exists": False,
        "can_load": False,
        "error": None,
    }
    
    if not model_path.exists():
        result["error"] = "Model directory does not exist"
        return result
    
    config_file = model_path / "config.json"
    model_file = model_path / "model.pt"
    metadata_file = model_path / "item_metadata.json"
    
    result["config_exists"] = config_file.exists()
    result["model_exists"] = model_file.exists()
    result["metadata_exists"] = metadata_file.exists()
    
    if not result["config_exists"]:
        result["error"] = "Config file not found"
        return result
    
    if not result["model_exists"]:
        result["error"] = "Model file not found"
        return result
    
    if SASRecModel is None or SASRecConfig is None:
        result["error"] = "SASRecModel not available for verification"
        return result
    
    try:
        with open(config_file, "r") as f:
            config_data = json.load(f)
        
        config = SASRecConfig(**config_data)
        model = SASRecModel(config)
        state_dict = torch.load(model_file, map_location="cpu", weights_only=True)
        model.load_state_dict(state_dict)
        model.eval()
        
        # 测试推理
        test_input = torch.tensor([[1, 2, 3, 4, 5]], dtype=torch.long)
        test_candidates = torch.tensor([[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], dtype=torch.long)
        with torch.no_grad():
            output = model.predict(test_input, test_candidates)
        
        result["can_load"] = True
        result["config"] = config_data
        result["test_output_shape"] = list(output.shape)
        
    except Exception as e:
        result["error"] = str(e)
    
    return result


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Initialize SASRec model")
    parser.add_argument(
        "--model-dir",
        type=str,
        default="./models/sasrec",
        help="Model directory path",
    )
    parser.add_argument(
        "--pretrained",
        type=str,
        default=None,
        help="Path to pretrained model weights",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify existing model instead of initializing",
    )
    
    args = parser.parse_args()
    
    if args.verify:
        result = verify_model(args.model_dir)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        success = initialize_model(
            model_dir=args.model_dir,
            pretrained_path=args.pretrained,
        )
        print(f"Initialization {'succeeded' if success else 'failed'}")
