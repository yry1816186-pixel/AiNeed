"""
AI Models Download Script (China Mirror)
使用国内镜像下载模型
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from typing import Optional, List

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

HF_MIRROR = "https://hf-mirror.com"


def set_hf_mirror():
    """设置 HuggingFace 镜像"""
    os.environ["HF_ENDPOINT"] = HF_MIRROR
    logger.info(f"Using HuggingFace mirror: {HF_MIRROR}")


def download_clip_model(model_name: str = "openai/clip-vit-base-patch32"):
    """下载 CLIP 模型"""
    logger.info("=" * 50)
    logger.info(f"Downloading CLIP model: {model_name}")
    logger.info("=" * 50)
    
    set_hf_mirror()
    
    try:
        from transformers import CLIPModel, CLIPProcessor
        
        save_path = MODELS_DIR / "clip"
        save_path.mkdir(parents=True, exist_ok=True)
        
        logger.info("Downloading model from mirror...")
        model = CLIPModel.from_pretrained(model_name)
        processor = CLIPProcessor.from_pretrained(model_name)
        
        logger.info(f"Saving to {save_path}...")
        model.save_pretrained(save_path)
        processor.save_pretrained(save_path)
        
        logger.info("CLIP model downloaded successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to download CLIP model: {e}")
        return False


def download_yolo_model(model_name: str = "yolo11n.pt"):
    """下载 YOLO 模型"""
    logger.info("=" * 50)
    logger.info(f"Downloading YOLO model: {model_name}")
    logger.info("=" * 50)
    
    try:
        from ultralytics import YOLO
        
        save_path = MODELS_DIR / "yolo"
        save_path.mkdir(parents=True, exist_ok=True)
        
        logger.info("Downloading model...")
        model = YOLO(model_name)
        
        model_path = save_path / model_name
        model.save(str(model_path))
        
        logger.info(f"YOLO model saved to {model_path}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to download YOLO model: {e}")
        return False


def download_fashion_clip():
    """下载 FashionCLIP 模型"""
    logger.info("=" * 50)
    logger.info("Downloading FashionCLIP model...")
    logger.info("=" * 50)
    
    set_hf_mirror()
    
    try:
        from huggingface_hub import snapshot_download
        
        save_path = MODELS_DIR / "fashion-clip"
        save_path.mkdir(parents=True, exist_ok=True)
        
        snapshot_download(
            repo_id="patrickjohncyh/fashion-clip",
            local_dir=str(save_path),
            local_dir_use_symlinks=False,
        )
        
        logger.info("FashionCLIP model downloaded successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to download FashionCLIP: {e}")
        return False


def test_mediapipe():
    """测试 MediaPipe 是否可用"""
    logger.info("=" * 50)
    logger.info("Testing MediaPipe...")
    logger.info("=" * 50)
    
    try:
        import mediapipe as mp
        print(f"MediaPipe version: {mp.__version__}")
        print(f"MediaPipe location: {mp.__file__}")
        
        if hasattr(mp, 'solutions'):
            logger.info("MediaPipe solutions available")
            return True
        else:
            logger.warning("MediaPipe installed but solutions not available")
            logger.info("Try reinstalling: pip uninstall mediapipe && pip install mediapipe")
            return False
    except Exception as e:
        logger.error(f"MediaPipe test failed: {e}")
        return False


def create_model_config():
    """创建模型配置文件"""
    config_path = MODELS_DIR / "config.json"
    
    config = {
        "models_dir": str(MODELS_DIR),
        "clip": {
            "path": str(MODELS_DIR / "clip"),
            "name": "openai/clip-vit-base-patch32"
        },
        "fashion_clip": {
            "path": str(MODELS_DIR / "fashion-clip"),
        },
        "yolo": {
            "path": str(MODELS_DIR / "yolo"),
            "model": "yolo11n.pt"
        },
        "mediapipe": {
            "cache_dir": str(MODELS_DIR / "mediapipe")
        }
    }
    
    import json
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Model config saved to {config_path}")


def download_idm_vton_models():
    """下载 IDM-VTON 虚拟试衣模型"""
    logger.info("=" * 50)
    logger.info("Downloading IDM-VTON models (this may take a while...)")
    logger.info("=" * 50)
    
    set_hf_mirror()
    
    save_path = MODELS_DIR / "idm-vton"
    save_path.mkdir(parents=True, exist_ok=True)
    
    try:
        from huggingface_hub import snapshot_download
        
        logger.info("Downloading from HuggingFace mirror...")
        logger.info("Model: yisol/IDM-VTON")
        logger.info("Size: ~10GB, please be patient...")
        
        snapshot_download(
            repo_id="yisol/IDM-VTON",
            local_dir=str(save_path),
            local_dir_use_symlinks=False,
        )
        
        logger.info("IDM-VTON models downloaded successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to download IDM-VTON models: {e}")
        logger.info("You can manually download from: https://huggingface.co/yisol/IDM-VTON")
        return False


def main():
    parser = argparse.ArgumentParser(description="Download AI models for AiNeed (China Mirror)")
    parser.add_argument("--core", action="store_true", help="Download core models")
    parser.add_argument("--clip", action="store_true", help="Download CLIP model")
    parser.add_argument("--yolo", action="store_true", help="Download YOLO model")
    parser.add_argument("--fashion-clip", action="store_true", help="Download FashionCLIP model")
    parser.add_argument("--idm-vton", action="store_true", help="Download IDM-VTON virtual try-on model (~10GB)")
    parser.add_argument("--test-mp", action="store_true", help="Test MediaPipe")
    
    args = parser.parse_args()
    
    logger.info(f"Models directory: {MODELS_DIR}")
    
    results = {}
    
    if args.core:
        logger.info("Downloading CORE models...")
        results["mediapipe"] = test_mediapipe()
        results["clip"] = download_clip_model()
        results["yolo"] = download_yolo_model()
    else:
        if args.test_mp:
            results["mediapipe"] = test_mediapipe()
        if args.clip:
            results["clip"] = download_clip_model()
        if args.yolo:
            results["yolo"] = download_yolo_model()
        if args.fashion_clip:
            results["fashion_clip"] = download_fashion_clip()
        if args.idm_vton:
            results["idm_vton"] = download_idm_vton_models()
    
    if not any([args.core, args.clip, args.yolo, args.fashion_clip, args.idm_vton, args.test_mp]):
        parser.print_help()
        print("\nQuick start:")
        print("  python download_models_cn.py --core        # Download essential models")
        print("  python download_models_cn.py --idm-vton    # Download virtual try-on model (~10GB)")
        print("  python download_models_cn.py --test-mp     # Test MediaPipe")
        return
    
    create_model_config()
    
    print("\n" + "=" * 50)
    print("Download Summary")
    print("=" * 50)
    for model, success in results.items():
        status = "OK" if success else "FAILED"
        print(f"  {model}: {status}")
    print("=" * 50)


if __name__ == "__main__":
    main()
