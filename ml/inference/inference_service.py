"""
AI模型推理服务
提供与后端集成的API接口
"""

import os
import sys
import json
import asyncio
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import numpy as np
from PIL import Image
import torch

sys.path.insert(0, str(Path(__file__).parent.parent))

from inference.local_models import LocalAIModels, ClothingAnalysis, BodyAnalysis


@dataclass
class AnalysisResult:
    """分析结果"""
    success: bool
    category: str
    style: List[str]
    colors: List[str]
    occasions: List[str]
    seasons: List[str]
    confidence: float
    embedding: Optional[List[float]] = None
    error: Optional[str] = None


@dataclass
class RecommendationResult:
    """推荐结果"""
    item_id: str
    score: float
    category: str
    style: List[str]
    colors: List[str]
    reasons: List[str]


@dataclass
class BodyAnalysisResult:
    """体型分析结果"""
    success: bool
    body_type: str
    skin_tone: str
    color_season: str
    recommendations: Dict[str, List[str]]
    error: Optional[str] = None


class AIInferenceService:
    """AI推理服务"""
    
    def __init__(self, device: str = "auto"):
        self.models = LocalAIModels(device=device)
        self.embeddings_db: Dict[str, np.ndarray] = {}
        self.metadata_db: Dict[str, Dict] = {}
        
        self._load_embeddings()
    
    def _load_embeddings(self):
        """加载预计算的嵌入向量 - 优先使用生产级44K索引"""
        base_dir = Path(__file__).parent.parent

        # Production index (44K items) takes priority
        prod_embeddings = base_dir / "data" / "indices" / "embeddings.npy"
        prod_ids = base_dir / "data" / "indices" / "ids.npy"
        prod_metadata = base_dir / "data" / "indices" / "metadata.json"

        # Legacy index (100 items) as fallback
        legacy_embeddings = Path("data/processed/image_embeddings.npy")
        legacy_metadata = Path("data/processed/image_metadata.json")
        legacy_index = Path("data/processed/embedding_index.json")

        loaded = False

        if prod_embeddings.exists() and prod_ids.exists() and prod_metadata.exists():
            try:
                embeddings = np.load(prod_embeddings)
                ids = np.load(prod_ids, allow_pickle=True)
                with open(prod_metadata, "r", encoding="utf-8") as f:
                    metadata_list = json.load(f)

                metadata_map = {}
                if isinstance(metadata_list, list):
                    for item in metadata_list:
                        if isinstance(item, dict) and "id" in item:
                            metadata_map[str(item["id"])] = item
                elif isinstance(metadata_list, dict):
                    metadata_map = metadata_list

                for i, image_id in enumerate(ids):
                    sid = str(image_id)
                    self.embeddings_db[sid] = embeddings[i]
                    self.metadata_db[sid] = metadata_map.get(sid, {})

                print(f"已加载 {len(self.embeddings_db)} 个生产级嵌入向量 (ml/data/indices/)")
                loaded = True
            except Exception as e:
                print(f"加载生产级嵌入向量失败: {e}")

        if not loaded and legacy_embeddings.exists() and legacy_metadata.exists() and legacy_index.exists():
            try:
                embeddings = np.load(legacy_embeddings)
                with open(legacy_metadata, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
                with open(legacy_index, "r", encoding="utf-8") as f:
                    index = json.load(f)

                for image_id, idx in index.items():
                    self.embeddings_db[image_id] = embeddings[idx]
                    self.metadata_db[image_id] = metadata.get(image_id, {})

                print(f"已加载 {len(self.embeddings_db)} 个遗留嵌入向量 (data/processed/)")
            except Exception as e:
                print(f"加载遗留嵌入向量失败: {e}")
    
    def analyze_image(self, image_path: str) -> AnalysisResult:
        """分析单张图像"""
        try:
            image = Image.open(image_path).convert("RGB")
            
            analysis = self.models.analyze_clothing_item(image)
            
            return AnalysisResult(
                success=True,
                category=analysis.category,
                style=analysis.style,
                colors=analysis.colors,
                occasions=analysis.occasions,
                seasons=analysis.seasons,
                confidence=analysis.confidence,
                embedding=analysis.embedding.tolist() if analysis.embedding is not None else None
            )
            
        except Exception as e:
            return AnalysisResult(
                success=False,
                category="unknown",
                style=[],
                colors=[],
                occasions=[],
                seasons=[],
                confidence=0.0,
                error=str(e)
            )
    
    def analyze_body(self, image_path: str) -> BodyAnalysisResult:
        """分析用户体型"""
        try:
            image = Image.open(image_path).convert("RGB")
            
            body_analysis = self.models.analyze_body_type(image)
            if not body_analysis.keypoints or not body_analysis.measurements:
                raise ValueError("Pose landmarks were not detected from the submitted image")
            
            recommendations = self._generate_body_recommendations(body_analysis)
            
            return BodyAnalysisResult(
                success=True,
                body_type=body_analysis.body_type,
                skin_tone=body_analysis.skin_tone,
                color_season=body_analysis.color_season,
                recommendations=recommendations
            )
            
        except Exception as e:
            return BodyAnalysisResult(
                success=False,
                body_type="unknown",
                skin_tone="unknown",
                color_season="unknown",
                recommendations={},
                error=str(e)
            )
    
    def _generate_body_recommendations(self, body: BodyAnalysis) -> Dict[str, List[str]]:
        """根据体型生成推荐"""
        body_style_map = {
            "rectangle": {
                "suitable": ["fitted", "structured", "layered", "peplum", "wrap"],
                "avoid": ["boxy", "oversized", "shapeless"],
                "tips": [
                    "选择有腰线的款式来创造曲线感",
                    "尝试层叠穿搭增加层次感",
                    "高腰裤/裙可以优化比例"
                ]
            },
            "triangle": {
                "suitable": ["a-line", "boat-neck", "off-shoulder", "wide-leg"],
                "avoid": ["skinny", "tight-bottom", "mini"],
                "tips": [
                    "上身选择亮色或有图案的款式",
                    "A字裙非常适合您的体型",
                    "上身可以增加细节装饰"
                ]
            },
            "inverted_triangle": {
                "suitable": ["v-neck", "wide-leg", "a-line", "flared"],
                "avoid": ["shoulder-pads", "boat-neck", "tight-top"],
                "tips": [
                    "选择V领或圆领来平衡肩宽",
                    "下身可以选择有图案或亮色的款式",
                    "阔腿裤可以平衡上半身"
                ]
            },
            "hourglass": {
                "suitable": ["fitted", "wrap", "belted", "high-waist"],
                "avoid": ["boxy", "oversized", "shapeless"],
                "tips": [
                    "突出腰线的款式最适合您",
                    "合身的剪裁比宽松款更好",
                    "高腰设计可以强调您的优势"
                ]
            },
            "oval": {
                "suitable": ["v-neck", "a-line", "empire", "flowy"],
                "avoid": ["tight", "crop-top", "high-neck"],
                "tips": [
                    "选择V领或开领设计",
                    "垂直条纹可以拉长视觉效果",
                    "选择有垂感的面料"
                ]
            }
        }
        
        return body_style_map.get(body.body_type, {
            "suitable": [],
            "avoid": [],
            "tips": []
        })
    
    def find_similar(
        self,
        query_image_path: str,
        top_k: int = 10,
        category_filter: Optional[str] = None
    ) -> List[RecommendationResult]:
        """查找相似服装"""
        try:
            query_image = Image.open(query_image_path).convert("RGB")
            query_analysis = self.models.analyze_clothing_item(query_image)
            query_embedding = query_analysis.embedding
            
            if query_embedding is None:
                return []
            
            similarities = []
            
            for image_id, embedding in self.embeddings_db.items():
                metadata = self.metadata_db.get(image_id, {})
                
                if category_filter and metadata.get("category") != category_filter:
                    continue
                
                similarity = np.dot(query_embedding, embedding)
                
                similarities.append({
                    "image_id": image_id,
                    "similarity": similarity,
                    "metadata": metadata
                })
            
            similarities.sort(key=lambda x: x["similarity"], reverse=True)
            
            results = []
            for item in similarities[:top_k]:
                metadata = item["metadata"]
                
                reasons = []
                if query_analysis.category == metadata.get("category"):
                    reasons.append("同类商品")
                
                common_styles = set(query_analysis.style) & set(metadata.get("style", []))
                if common_styles:
                    reasons.append(f"风格匹配: {', '.join(common_styles)}")
                
                if item["similarity"] > 0.8:
                    reasons.append("高度相似")
                
                results.append(RecommendationResult(
                    item_id=item["image_id"],
                    score=item["similarity"],
                    category=metadata.get("category", "unknown"),
                    style=metadata.get("style", []),
                    colors=metadata.get("colors", []),
                    reasons=reasons if reasons else ["风格相近"]
                ))
            
            return results
            
        except Exception as e:
            print(f"查找相似服装失败: {e}")
            return []
    
    def recommend_outfit(
        self,
        base_item_id: str,
        user_body_type: Optional[str] = None,
        occasion: Optional[str] = None,
        top_k: int = 5
    ) -> Dict[str, List[RecommendationResult]]:
        """推荐搭配组合"""
        if base_item_id not in self.metadata_db:
            return {}
        
        base_metadata = self.metadata_db[base_item_id]
        base_embedding = self.embeddings_db.get(base_item_id)
        
        if base_embedding is None:
            return {}
        
        base_category = base_metadata.get("category", "tops")
        
        complementary_categories = self._get_complementary_categories(base_category)
        
        results = {}
        
        for cat_name, target_category in complementary_categories.items():
            candidates = []
            
            for image_id, embedding in self.embeddings_db.items():
                metadata = self.metadata_db.get(image_id, {})
                
                if metadata.get("category") != target_category:
                    continue
                
                similarity = np.dot(base_embedding, embedding)
                
                style_match = len(
                    set(base_metadata.get("style", [])) & set(metadata.get("style", []))
                ) / max(len(base_metadata.get("style", [])), 1)
                
                occasion_match = 1.0
                if occasion and occasion not in metadata.get("occasions", []):
                    occasion_match = 0.5
                
                score = similarity * 0.5 + style_match * 0.3 + occasion_match * 0.2
                
                candidates.append({
                    "image_id": image_id,
                    "score": score,
                    "metadata": metadata
                })
            
            candidates.sort(key=lambda x: x["score"], reverse=True)
            
            results[cat_name] = [
                RecommendationResult(
                    item_id=c["image_id"],
                    score=c["score"],
                    category=c["metadata"].get("category", "unknown"),
                    style=c["metadata"].get("style", []),
                    colors=c["metadata"].get("colors", []),
                    reasons=self._generate_outfit_reasons(
                        base_metadata, c["metadata"], c["score"]
                    )
                )
                for c in candidates[:top_k]
            ]
        
        return results
    
    def _get_complementary_categories(self, base_category: str) -> Dict[str, str]:
        """获取互补类别"""
        complement_map = {
            "tops": {"bottoms": "bottoms", "footwear": "footwear", "accessories": "accessories"},
            "bottoms": {"tops": "tops", "footwear": "footwear", "accessories": "accessories"},
            "dresses": {"footwear": "footwear", "accessories": "accessories", "outerwear": "outerwear"},
            "outerwear": {"tops": "tops", "bottoms": "bottoms", "footwear": "footwear"},
            "footwear": {"tops": "tops", "bottoms": "bottoms"},
            "accessories": {"tops": "tops", "bottoms": "bottoms"},
        }
        
        return complement_map.get(base_category, {})
    
    def _generate_outfit_reasons(
        self,
        base_metadata: Dict,
        candidate_metadata: Dict,
        score: float
    ) -> List[str]:
        """生成搭配推荐理由"""
        reasons = []
        
        if score > 0.7:
            reasons.append("高度协调")
        
        common_styles = set(base_metadata.get("style", [])) & set(candidate_metadata.get("style", []))
        if common_styles:
            reasons.append(f"风格匹配: {', '.join(common_styles)}")
        
        common_occasions = set(base_metadata.get("occasions", [])) & set(candidate_metadata.get("occasions", []))
        if common_occasions:
            reasons.append(f"适合场合: {', '.join(list(common_occasions)[:2])}")
        
        common_seasons = set(base_metadata.get("seasons", [])) & set(candidate_metadata.get("seasons", []))
        if common_seasons:
            reasons.append(f"适合季节: {', '.join(list(common_seasons)[:2])}")
        
        if not reasons:
            reasons.append("风格互补")
        
        return reasons[:3]
    
    def get_color_recommendations(
        self,
        color_season: str,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """获取色彩推荐"""
        color_seasons = {
            "spring": {
                "best_colors": ["coral", "peach", "salmon", "warm pink", "golden yellow", 
                              "cream", "turquoise", "light green"],
                "avoid_colors": ["black", "pure white", "cool gray", "burgundy", "navy"],
                "metal_tone": "gold",
                "description": "春季型人适合温暖明亮的色彩"
            },
            "summer": {
                "best_colors": ["lavender", "soft pink", "rose", "powder blue", "soft gray",
                              "cool white", "berry", "periwinkle"],
                "avoid_colors": ["bright orange", "mustard", "rust", "bright red", "gold"],
                "metal_tone": "silver",
                "description": "夏季型人适合柔和的冷色调"
            },
            "autumn": {
                "best_colors": ["rust", "terracotta", "mustard", "olive", "camel",
                              "chocolate", "burnt orange", "forest green"],
                "avoid_colors": ["bright pink", "pure white", "cool blue", "fuchsia", "silver"],
                "metal_tone": "gold",
                "description": "秋季型人适合温暖的大地色系"
            },
            "winter": {
                "best_colors": ["pure white", "black", "true red", "royal blue", "emerald",
                              "fuchsia", "burgundy", "cobalt"],
                "avoid_colors": ["orange", "beige", "rust", "mustard", "warm brown"],
                "metal_tone": "silver",
                "description": "冬季型人适合高饱和度的冷色调"
            }
        }
        
        return color_seasons.get(color_season, color_seasons["summer"])
    
    def get_image_embedding(self, image_path: str) -> np.ndarray:
        """获取图像嵌入向量"""
        try:
            image = Image.open(image_path).convert("RGB")
            analysis = self.models.analyze_clothing_item(image)
            if analysis.embedding is not None:
                return analysis.embedding
            return self.models.get_image_embedding(image)
        except Exception as e:
            raise ValueError(f"获取图像嵌入失败: {e}")
    
    def get_text_embedding(self, text: str) -> np.ndarray:
        """获取文本嵌入向量"""
        try:
            return self.models.get_text_embedding(text)
        except Exception as e:
            raise ValueError(f"获取文本嵌入失败: {e}")
    
    def get_item_embedding(self, item_id: str) -> Optional[np.ndarray]:
        """获取商品嵌入向量"""
        return self.embeddings_db.get(item_id)
    
    def get_stats(self) -> Dict[str, Any]:
        """获取服务统计信息"""
        return {
            "total_items": len(self.embeddings_db),
            "total_metadata": len(self.metadata_db),
            "model_device": str(self.models.device),
            "categories": list(set(
                m.get("category", "unknown")
                for m in self.metadata_db.values()
            )),
            "styles": list(set(
                s
                for m in self.metadata_db.values()
                for s in m.get("style", [])
            ))
        }

    def health_check(self) -> Dict[str, Any]:
        """
        执行健康检查，返回模型加载状态和服务可用性

        Returns:
            Dict containing health status of all model components
        """
        health_status = {
            "available": True,
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            "components": {},
            "errors": []
        }

        # Check if LocalAIModels is initialized
        if self.models is None:
            health_status["available"] = False
            health_status["errors"].append("LocalAIModels not initialized")
            return health_status

        # Check CLIP model
        try:
            clip_available = self.models.clip_model is not None and self.models.clip_processor is not None
            health_status["components"]["clip_model"] = {
                "loaded": clip_available,
                "device": str(self.models.device) if clip_available else None
            }
            if not clip_available:
                health_status["errors"].append("CLIP model not loaded")
        except Exception as e:
            health_status["components"]["clip_model"] = {"loaded": False, "error": str(e)}
            health_status["errors"].append(f"CLIP model check failed: {e}")

        # Check MediaPipe for body analysis
        try:
            mediapipe_available = self.models.pose_landmarker is not None
            health_status["components"]["mediapipe_pose"] = {
                "loaded": mediapipe_available
            }
            if not mediapipe_available:
                health_status["errors"].append("MediaPipe pose landmarker not loaded")
        except Exception as e:
            health_status["components"]["mediapipe_pose"] = {"loaded": False, "error": str(e)}
            health_status["errors"].append(f"MediaPipe check failed: {e}")

        # Check embeddings database
        health_status["components"]["embeddings_db"] = {
            "loaded": len(self.embeddings_db) > 0,
            "item_count": len(self.embeddings_db)
        }

        # Check metadata database
        health_status["components"]["metadata_db"] = {
            "loaded": len(self.metadata_db) > 0,
            "item_count": len(self.metadata_db)
        }

        # Check GPU availability
        try:
            import torch
            health_status["components"]["gpu"] = {
                "available": torch.cuda.is_available(),
                "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None
            }
        except Exception as e:
            health_status["components"]["gpu"] = {"available": False, "error": str(e)}

        # Determine overall availability
        critical_components = ["clip_model"]
        for component in critical_components:
            if component in health_status["components"]:
                if not health_status["components"][component].get("loaded", False):
                    health_status["available"] = False

        return health_status


def create_api_response(data: Any, success: bool = True, error: Optional[str] = None) -> Dict:
    """创建API响应"""
    if hasattr(data, '__dataclass_fields__'):
        data = asdict(data)
    elif isinstance(data, list) and data and hasattr(data[0], '__dataclass_fields__'):
        data = [asdict(item) for item in data]
    elif isinstance(data, dict):
        data = {k: asdict(v) if hasattr(v, '__dataclass_fields__') else v 
                for k, v in data.items()}
    
    return {
        "success": success,
        "data": data,
        "error": error
    }


if __name__ == "__main__":
    service = AIInferenceService()
    
    print("\n" + "="*50)
    print("AI推理服务已就绪")
    print("="*50)
    
    test_image = "data/raw/images/1163.jpg"
    
    if os.path.exists(test_image):
        print(f"\n测试图像分析: {test_image}")
        
        result = service.analyze_image(test_image)
        print(json.dumps(asdict(result), indent=2, ensure_ascii=False))
        
        print("\n体型分析:")
        body_result = service.analyze_body(test_image)
        print(json.dumps(asdict(body_result), indent=2, ensure_ascii=False))
        
        print("\n色彩推荐 (夏季型):")
        colors = service.get_color_recommendations("summer")
        print(json.dumps(colors, indent=2, ensure_ascii=False))
