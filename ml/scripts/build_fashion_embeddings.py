"""
构建商品嵌入索引
使用 FashionCLIP 为所有商品图片生成嵌入向量
"""

import os
import sys
import json
import logging
from pathlib import Path
from tqdm import tqdm
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_PROCESSED = PROJECT_ROOT / "ml" / "data" / "processed"
INDEX_DIR = PROJECT_ROOT / "ml" / "data" / "indices"


def load_processed_items():
    """加载处理后的商品数据"""
    items_file = DATA_PROCESSED / "items.json"
    if not items_file.exists():
        raise FileNotFoundError(f"数据文件不存在: {items_file}")
    
    with open(items_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_fashion_clip_model():
    """加载 FashionCLIP 模型"""
    try:
        from transformers import CLIPModel, CLIPProcessor
        import torch
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"使用设备: {device}")
        
        model_path = PROJECT_ROOT / "ml" / "models" / "clip_fashion"
        model_file = model_path / "model.safetensors"
        
        if not model_file.exists():
            model_path = PROJECT_ROOT / "ml" / "models" / "fashion-clip"
            model_file = model_path / "model.safetensors"
        
        if model_file.exists():
            logger.info(f"加载本地 FashionCLIP: {model_path}")
            model = CLIPModel.from_pretrained(str(model_path), local_files_only=True)
            processor = CLIPProcessor.from_pretrained(str(model_path), local_files_only=True)
            logger.info("本地模型加载成功!")
        else:
            raise FileNotFoundError(f"本地模型不存在: {model_file}")
        
        model = model.to(device)
        model.eval()
        
        return model, processor, device
    
    except Exception as e:
        logger.error(f"加载 FashionCLIP 失败: {e}")
        raise


def generate_image_embedding(image_path: str, model, processor, device) -> np.ndarray:
    """生成单张图片的嵌入向量"""
    try:
        from PIL import Image
        import torch
        import torch.nn.functional as F
        
        if not Path(image_path).exists():
            return None
        
        image = Image.open(image_path).convert('RGB')
        
        inputs = processor(images=image, return_tensors="pt")
        pixel_values = inputs['pixel_values'].to(device)
        
        with torch.no_grad():
            vision_outputs = model.vision_model(pixel_values)
            image_features = vision_outputs.pooler_output
            image_features = model.visual_projection(image_features)
            image_features = F.normalize(image_features, p=2, dim=1)
        
        return image_features.cpu().numpy().flatten()
    
    except Exception as e:
        logger.warning(f"处理图片失败 {image_path}: {e}")
        return None


def build_embeddings_index(batch_size: int = 32):
    """构建嵌入索引"""
    logger.info("=" * 60)
    logger.info("Fashion Product Images 嵌入索引构建")
    logger.info("=" * 60)
    
    items = load_processed_items()
    logger.info(f"加载 {len(items)} 个商品")
    
    model, processor, device = get_fashion_clip_model()
    
    embeddings = []
    ids = []
    metadata = {}
    failed = []
    
    logger.info("生成嵌入向量...")
    
    item_list = list(items.items())
    
    for item_id, item in tqdm(item_list, desc="生成嵌入"):
        image_path = item.get('image_path', '')
        
        if not image_path or not Path(image_path).exists():
            failed.append((item_id, "图片不存在"))
            continue
        
        embedding = generate_image_embedding(image_path, model, processor, device)
        
        if embedding is not None:
            embeddings.append(embedding)
            ids.append(item_id)
            
            metadata[item_id] = {
                'category': item.get('category', 'unknown'),
                'style_tags': item.get('style_tags', []),
                'color_tags': item.get('color_tags', []),
                'occasion_tags': item.get('occasion_tags', []),
                'season_tags': item.get('season_tags', []),
                'gender': item.get('gender', ''),
                'product_name': item.get('product_name', ''),
                'image_path': image_path,
                'source': item.get('source', 'fashion_product_images')
            }
        else:
            failed.append((item_id, "嵌入生成失败"))
    
    if not embeddings:
        logger.error("没有成功生成任何嵌入向量")
        return False
    
    embeddings_array = np.array(embeddings, dtype=np.float32)
    
    logger.info(f"\n嵌入矩阵形状: {embeddings_array.shape}")
    logger.info(f"成功: {len(embeddings)}, 失败: {len(failed)}")
    
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    
    np.save(INDEX_DIR / "embeddings.npy", embeddings_array)
    np.save(INDEX_DIR / "ids.npy", np.array(ids, dtype=object))
    
    with open(INDEX_DIR / "metadata.json", 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    if failed:
        with open(INDEX_DIR / "failed_items.json", 'w', encoding='utf-8') as f:
            json.dump(failed, f, ensure_ascii=False, indent=2)
        logger.info(f"失败项目已保存到: {INDEX_DIR / 'failed_items.json'}")
    
    logger.info("\n" + "=" * 60)
    logger.info("索引构建完成!")
    logger.info(f"  - 嵌入向量: {len(embeddings)}")
    logger.info(f"  - 嵌入维度: {embeddings_array.shape[1]}")
    logger.info(f"  - 保存位置: {INDEX_DIR}")
    logger.info("=" * 60)
    
    return True


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=32, help="批处理大小")
    args = parser.parse_args()
    
    build_embeddings_index(batch_size=args.batch_size)
