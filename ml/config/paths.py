"""
模型路径配置
集中管理所有AI模型的路径配置
"""

import os
from pathlib import Path
from typing import Optional

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent.parent.resolve()

# 模型根目录
MODELS_ROOT = PROJECT_ROOT / "models"
ML_MODELS_ROOT = PROJECT_ROOT / "ml" / "models"

# 确保目录存在
MODELS_ROOT.mkdir(parents=True, exist_ok=True)
ML_MODELS_ROOT.mkdir(parents=True, exist_ok=True)


class ModelPaths:
    """模型路径管理类"""

    @staticmethod
    def get_clip_model_path() -> Path:
        """获取CLIP模型路径"""
        # 优先使用微调后的FashionCLIP
        fashion_clip_path = ML_MODELS_ROOT / "clip_fashion"
        if fashion_clip_path.exists() and (fashion_clip_path / "model.safetensors").exists():
            return fashion_clip_path

        # 后备：使用原始CLIP
        clip_cache = ML_MODELS_ROOT / "clip"
        return clip_cache

    @staticmethod
    def get_yolo_model_path() -> Optional[Path]:
        """获取YOLO模型路径"""
        possible_paths = [
            PROJECT_ROOT / "yolo11n.pt",
            MODELS_ROOT / "yolo" / "yolo11n.pt",
        ]

        for path in possible_paths:
            if path.exists():
                return path

        return None

    @staticmethod
    def get_sam_model_path() -> Optional[Path]:
        """获取SAM模型路径"""
        possible_paths = [
            MODELS_ROOT / "sam" / "sam_vit_h_4b8939.pth",
            MODELS_ROOT / "sam" / "sam_vit_h.pth",
            MODELS_ROOT / "sam" / "sam_vit_b_01ec64.pth",  # 更小的base版本
        ]

        for path in possible_paths:
            if path.exists() and path.stat().st_size > 100_000_000:  # > 100MB
                return path

        return None

    @staticmethod
    def get_glm_api_config() -> dict:
        """获取GLM API配置"""
        return {
            "api_key": os.getenv("GLM_API_KEY", ""),
            "api_endpoint": os.getenv("GLM_API_ENDPOINT", "https://open.bigmodel.cn/api/paas/v4"),
            "model": os.getenv("GLM_MODEL", "glm-5"),
        }

    @staticmethod
    def get_fashion_clip_path() -> Optional[Path]:
        """获取FashionCLIP微调模型路径"""
        path = ML_MODELS_ROOT / "clip_fashion"
        if path.exists() and (path / "model.safetensors").exists():
            return path
        return None

    @staticmethod
    def get_training_data_path() -> Path:
        """获取训练数据路径"""
        return PROJECT_ROOT / "data"

    @staticmethod
    def get_embeddings_index_path() -> Path:
        """获取嵌入向量索引路径"""
        return PROJECT_ROOT / "ml" / "data" / "indices"

    @staticmethod
    def get_fashion_product_images_path() -> Path:
        """获取 Fashion Product Images 完整版数据集路径"""
        return PROJECT_ROOT / "data" / "raw" / "fashion-dataset-full" / "fashion-dataset"

    @staticmethod
    def get_outfit_items_path() -> Path:
        """获取 Outfit Items 搭配数据集路径"""
        return PROJECT_ROOT / "data" / "raw" / "outfititems"

    @staticmethod
    def get_new_data_fashion_path() -> Path:
        """获取 New Data Fashion 分类数据集路径"""
        return PROJECT_ROOT / "data" / "raw" / "new-data-fashion" / "Apparel images dataset new"

    @staticmethod
    def get_styles_csv_path() -> Path:
        """获取 styles.csv 元数据路径"""
        return PROJECT_ROOT / "data" / "raw" / "styles.csv"


def check_model_availability() -> dict:
    """检查所有模型的可用于状态"""
    return {
        "clip": ModelPaths.get_clip_model_path() is not None,
        "clip_path": str(ModelPaths.get_clip_model_path()),
        "yolo": ModelPaths.get_yolo_model_path() is not None,
        "yolo_path": str(ModelPaths.get_yolo_model_path() or "未找到"),
        "sam": ModelPaths.get_sam_model_path() is not None,
        "sam_path": str(ModelPaths.get_sam_model_path() or "未找到"),
        "glm_api": bool(os.getenv("GLM_API_KEY")),
        "glm_api_endpoint": os.getenv("GLM_API_ENDPOINT", "https://open.bigmodel.cn/api/paas/v4"),
        "fashion_clip": ModelPaths.get_fashion_clip_path() is not None,
        "fashion_clip_path": str(ModelPaths.get_fashion_clip_path() or "未找到"),
    }


def check_dataset_availability() -> dict:
    """检查所有数据集的可用状态"""
    fashion_images = ModelPaths.get_fashion_product_images_path()
    outfit_items = ModelPaths.get_outfit_items_path()
    new_fashion = ModelPaths.get_new_data_fashion_path()
    styles_csv = ModelPaths.get_styles_csv_path()
    
    return {
        "fashion_product_images": fashion_images.exists() if fashion_images else False,
        "fashion_product_images_path": str(fashion_images),
        "outfit_items": outfit_items.exists() if outfit_items else False,
        "outfit_items_path": str(outfit_items),
        "new_data_fashion": new_fashion.exists() if new_fashion else False,
        "new_data_fashion_path": str(new_fashion),
        "styles_csv": styles_csv.exists() if styles_csv else False,
        "styles_csv_path": str(styles_csv),
    }


if __name__ == "__main__":
    import json
    print("=== 模型可用性检查 ===")
    print(json.dumps(check_model_availability(), indent=2, ensure_ascii=False))
    print("\n=== 数据集可用性检查 ===")
    print(json.dumps(check_dataset_availability(), indent=2, ensure_ascii=False))
