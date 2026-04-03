"""
Complete Model Downloader for AiNeed Server
下载所有服务器端需要的模型权重
"""

import os
import sys
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"


def download_idm_vton():
    """下载 IDM-VTON 虚拟试衣模型（完整版）"""
    logger.info("=" * 60)
    logger.info("下载 IDM-VTON 模型（约 30GB）")
    logger.info("=" * 60)
    
    save_path = MODELS_DIR / "idm-vton"
    save_path.mkdir(parents=True, exist_ok=True)
    
    try:
        from huggingface_hub import snapshot_download
        import httpx
        
        httpx.DEFAULT_TIMEOUT = httpx.Timeout(600.0, connect=120.0)
        
        logger.info("开始下载，支持断点续传...")
        snapshot_download(
            repo_id="yisol/IDM-VTON",
            local_dir=str(save_path),
            max_workers=1,
            etag_timeout=600,
        )
        
        logger.info("IDM-VTON 模型下载完成!")
        return True
    except Exception as e:
        logger.error(f"IDM-VTON 下载失败: {e}")
        logger.info("请手动下载: https://huggingface.co/yisol/IDM-VTON")
        return False


def download_mediapipe_pose():
    """下载 MediaPipe Pose Landmarker 模型"""
    logger.info("=" * 60)
    logger.info("下载 MediaPipe Pose Landmarker 模型")
    logger.info("=" * 60)
    
    save_path = MODELS_DIR / "mediapipe"
    save_path.mkdir(parents=True, exist_ok=True)
    
    try:
        import urllib.request
        
        model_url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task"
        model_file = save_path / "pose_landmarker_heavy.task"
        
        if model_file.exists():
            logger.info(f"模型已存在: {model_file}")
            return True
        
        logger.info(f"下载中: {model_url}")
        urllib.request.urlretrieve(model_url, str(model_file))
        
        logger.info(f"MediaPipe Pose 模型下载完成: {model_file}")
        return True
    except Exception as e:
        logger.error(f"MediaPipe Pose 下载失败: {e}")
        return False


def download_mediapipe_face():
    """下载 MediaPipe Face Detection 模型"""
    logger.info("=" * 60)
    logger.info("下载 MediaPipe Face Detection 模型")
    logger.info("=" * 60)
    
    save_path = MODELS_DIR / "mediapipe"
    save_path.mkdir(parents=True, exist_ok=True)
    
    try:
        import urllib.request
        
        model_url = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
        model_file = save_path / "blaze_face_short_range.tflite"
        
        if model_file.exists():
            logger.info(f"模型已存在: {model_file}")
            return True
        
        logger.info(f"下载中: {model_url}")
        urllib.request.urlretrieve(model_url, str(model_file))
        
        logger.info(f"MediaPipe Face 模型下载完成: {model_file}")
        return True
    except Exception as e:
        logger.error(f"MediaPipe Face 下载失败: {e}")
        return False


def download_sam_model():
    """下载 SAM 分割模型"""
    logger.info("=" * 60)
    logger.info("下载 SAM 分割模型")
    logger.info("=" * 60)
    
    save_path = MODELS_DIR / "sam"
    save_path.mkdir(parents=True, exist_ok=True)
    
    try:
        from huggingface_hub import hf_hub_download
        
        model_file = save_path / "sam_vit_h_4b8939.pth"
        
        if model_file.exists():
            logger.info(f"模型已存在: {model_file}")
            return True
        
        logger.info("下载 SAM ViT-H 模型（约 2.4GB）...")
        hf_hub_download(
            repo_id="facebook/sam2-hiera-large",
            filename="sam2_hiera_large.pt",
            local_dir=str(save_path),
        )
        
        logger.info("SAM 模型下载完成!")
        return True
    except Exception as e:
        logger.error(f"SAM 下载失败: {e}")
        logger.info("SAM 是可选模型，可以跳过")
        return False


def download_fashion_clip():
    """下载 FashionCLIP 模型"""
    logger.info("=" * 60)
    logger.info("下载 FashionCLIP 模型")
    logger.info("=" * 60)
    
    save_path = MODELS_DIR / "fashion-clip"
    save_path.mkdir(parents=True, exist_ok=True)
    
    try:
        from huggingface_hub import snapshot_download
        
        if any(save_path.iterdir()):
            logger.info(f"模型目录已存在: {save_path}")
            return True
        
        logger.info("下载 FashionCLIP 模型...")
        snapshot_download(
            repo_id="patrickjohncyh/fashion-clip",
            local_dir=str(save_path),
        )
        
        logger.info("FashionCLIP 模型下载完成!")
        return True
    except Exception as e:
        logger.error(f"FashionCLIP 下载失败: {e}")
        return False


def verify_models():
    """验证所有模型是否完整"""
    logger.info("=" * 60)
    logger.info("验证模型完整性")
    logger.info("=" * 60)
    
    results = {}
    
    clip_path = MODELS_DIR / "clip"
    results["CLIP"] = clip_path.exists() and any(clip_path.iterdir())
    
    yolo_path = MODELS_DIR / "yolo"
    results["YOLO"] = yolo_path.exists() and any(yolo_path.iterdir())
    
    idm_path = MODELS_DIR / "idm-vton"
    unet_model = idm_path / "unet" / "diffusion_pytorch_model.bin"
    unet_safetensors = idm_path / "unet" / "model.safetensors"
    results["IDM-VTON"] = unet_model.exists() or unet_safetensors.exists()
    
    mp_path = MODELS_DIR / "mediapipe"
    pose_model = mp_path / "pose_landmarker_heavy.task"
    results["MediaPipe Pose"] = pose_model.exists()
    
    fc_path = MODELS_DIR / "fashion-clip"
    results["FashionCLIP"] = fc_path.exists() and any(fc_path.iterdir())
    
    print("\n" + "=" * 60)
    print("模型验证结果")
    print("=" * 60)
    for model, ok in results.items():
        status = "✓" if ok else "✗"
        print(f"  {status} {model}")
    print("=" * 60)
    
    return results


def main():
    import argparse
    parser = argparse.ArgumentParser(description="下载 AiNeed 服务器端所有模型")
    parser.add_argument("--all", action="store_true", help="下载所有模型")
    parser.add_argument("--idm-vton", action="store_true", help="下载 IDM-VTON 虚拟试衣模型")
    parser.add_argument("--mediapipe", action="store_true", help="下载 MediaPipe 模型")
    parser.add_argument("--sam", action="store_true", help="下载 SAM 分割模型")
    parser.add_argument("--fashion-clip", action="store_true", help="下载 FashionCLIP 模型")
    parser.add_argument("--verify", action="store_true", help="验证模型完整性")
    
    args = parser.parse_args()
    
    if args.verify:
        verify_models()
        return
    
    if not any([args.all, args.idm_vton, args.mediapipe, args.sam, args.fashion_clip]):
        parser.print_help()
        print("\n快速开始:")
        print("  python download_all_models.py --all        # 下载所有模型")
        print("  python download_all_models.py --mediapipe  # 只下载 MediaPipe")
        print("  python download_all_models.py --verify     # 验证模型完整性")
        return
    
    results = {}
    
    if args.all:
        results["MediaPipe Pose"] = download_mediapipe_pose()
        results["MediaPipe Face"] = download_mediapipe_face()
        results["FashionCLIP"] = download_fashion_clip()
        results["IDM-VTON"] = download_idm_vton()
        results["SAM"] = download_sam_model()
    else:
        if args.mediapipe:
            results["MediaPipe Pose"] = download_mediapipe_pose()
            results["MediaPipe Face"] = download_mediapipe_face()
        if args.fashion_clip:
            results["FashionCLIP"] = download_fashion_clip()
        if args.idm_vton:
            results["IDM-VTON"] = download_idm_vton()
        if args.sam:
            results["SAM"] = download_sam_model()
    
    print("\n" + "=" * 60)
    print("下载摘要")
    print("=" * 60)
    for model, ok in results.items():
        status = "OK" if ok else "FAILED"
        print(f"  {model}: {status}")
    print("=" * 60)
    
    verify_models()


if __name__ == "__main__":
    main()
