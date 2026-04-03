"""
批量处理图像并生成嵌入向量
将处理结果保存到数据库和向量存储
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np
from PIL import Image
from tqdm import tqdm
import torch

sys.path.insert(0, str(Path(__file__).parent.parent))

from inference.local_models import LocalAIModels, ClothingAnalysis


class ImageBatchProcessor:
    """批量图像处理器"""
    
    def __init__(self, device: str = "auto", output_dir: str = "data/processed"):
        self.models = LocalAIModels(device=device)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.embeddings_file = self.output_dir / "image_embeddings.npy"
        self.metadata_file = self.output_dir / "image_metadata.json"
        self.index_file = self.output_dir / "embedding_index.json"
        
        self.embeddings: List[np.ndarray] = []
        self.metadata: Dict[str, Dict] = {}
        self.index: Dict[str, int] = {}
    
    def process_directory(
        self,
        image_dir: str,
        limit: Optional[int] = None,
        save_interval: int = 100
    ):
        """处理目录下的所有图像"""
        image_dir = Path(image_dir)
        
        image_files = []
        for ext in ["*.jpg", "*.jpeg", "*.png", "*.webp"]:
            image_files.extend(image_dir.glob(ext))
        
        if limit:
            image_files = image_files[:limit]
        
        print(f"找到 {len(image_files)} 张图像")
        
        for i, image_path in enumerate(tqdm(image_files, desc="处理图像")):
            try:
                result = self._process_single_image(image_path)
                
                if result:
                    self.index[image_path.stem] = len(self.embeddings)
                    self.embeddings.append(result["embedding"])
                    self.metadata[image_path.stem] = {
                        "path": str(image_path),
                        "category": result["category"],
                        "style": result["style"],
                        "colors": result["colors"],
                        "occasions": result["occasions"],
                        "seasons": result["seasons"],
                        "confidence": result["confidence"]
                    }
                
                if (i + 1) % save_interval == 0:
                    self._save_progress()
                    
            except Exception as e:
                print(f"\n处理失败 {image_path}: {e}")
        
        self._save_final()
        
        print(f"\n处理完成!")
        print(f"  成功: {len(self.embeddings)} 张")
        print(f"  失败: {len(image_files) - len(self.embeddings)} 张")
    
    def _process_single_image(self, image_path: Path) -> Optional[Dict]:
        """处理单张图像"""
        try:
            image = Image.open(image_path).convert("RGB")
            
            analysis = self.models.analyze_clothing_item(image)
            
            return {
                "embedding": analysis.embedding,
                "category": analysis.category,
                "style": analysis.style,
                "colors": analysis.colors,
                "occasions": analysis.occasions,
                "seasons": analysis.seasons,
                "confidence": analysis.confidence
            }
            
        except Exception as e:
            raise e
    
    def _save_progress(self):
        """保存进度"""
        if self.embeddings:
            np.save(self.embeddings_file, np.array(self.embeddings))
        
        with open(self.metadata_file, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
        
        with open(self.index_file, "w", encoding="utf-8") as f:
            json.dump(self.index, f, ensure_ascii=False, indent=2)
    
    def _save_final(self):
        """保存最终结果"""
        self._save_progress()
        
        stats = {
            "total_images": len(self.embeddings),
            "embedding_dim": 512,
            "category_distribution": {},
            "style_distribution": {}
        }
        
        for meta in self.metadata.values():
            cat = meta["category"]
            stats["category_distribution"][cat] = stats["category_distribution"].get(cat, 0) + 1
            
            for style in meta["style"]:
                stats["style_distribution"][style] = stats["style_distribution"].get(style, 0) + 1
        
        stats_file = self.output_dir / "processing_stats.json"
        with open(stats_file, "w", encoding="utf-8") as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        
        print(f"\n统计信息:")
        print(f"  总图像数: {stats['total_images']}")
        print(f"  类别分布: {stats['category_distribution']}")
    
    def search_similar(
        self,
        query_image_path: str,
        top_k: int = 10
    ) -> List[Dict]:
        """搜索相似图像"""
        if not self.embeddings:
            print("请先处理图像!")
            return []
        
        query_image = Image.open(query_image_path).convert("RGB")
        query_embedding = self.models.extract_image_embedding(query_image)
        
        embeddings_array = np.array(self.embeddings)
        
        similarities = np.dot(embeddings_array, query_embedding)
        
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            image_id = list(self.index.keys())[list(self.index.values()).index(idx)]
            meta = self.metadata[image_id]
            
            results.append({
                "image_id": image_id,
                "similarity": float(similarities[idx]),
                "category": meta["category"],
                "style": meta["style"],
                "path": meta["path"]
            })
        
        return results
    
    def load_existing(self):
        """加载已有的处理结果"""
        if self.embeddings_file.exists():
            self.embeddings = list(np.load(self.embeddings_file))
            print(f"加载了 {len(self.embeddings)} 个嵌入向量")
        
        if self.metadata_file.exists():
            with open(self.metadata_file, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
        
        if self.index_file.exists():
            with open(self.index_file, "r", encoding="utf-8") as f:
                self.index = json.load(f)


def main():
    parser = argparse.ArgumentParser(description="批量处理服装图像")
    parser.add_argument("--image-dir", type=str, default="data/raw/images",
                       help="图像目录")
    parser.add_argument("--output-dir", type=str, default="data/processed",
                       help="输出目录")
    parser.add_argument("--limit", type=int, default=None,
                       help="处理图像数量限制")
    parser.add_argument("--device", type=str, default="auto",
                       help="计算设备 (auto/cpu/cuda)")
    parser.add_argument("--search", type=str, default=None,
                       help="搜索相似图像的查询图像路径")
    parser.add_argument("--top-k", type=int, default=10,
                       help="返回相似图像数量")
    
    args = parser.parse_args()
    
    processor = ImageBatchProcessor(
        device=args.device,
        output_dir=args.output_dir
    )
    
    if args.search:
        processor.load_existing()
        results = processor.search_similar(args.search, args.top_k)
        
        print(f"\n搜索结果 (查询: {args.search}):")
        for i, r in enumerate(results, 1):
            print(f"{i}. {r['image_id']} - 相似度: {r['similarity']:.4f}")
            print(f"   类别: {r['category']}, 风格: {', '.join(r['style'])}")
    else:
        processor.process_directory(
            image_dir=args.image_dir,
            limit=args.limit
        )


if __name__ == "__main__":
    main()
