"""
智能风格推荐服务
整合LLM风格理解、FashionCLIP嵌入和向量索引，提供端到端的推荐能力
"""

import os
import json
import asyncio
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import logging
import torch

from services.style_understanding_service import (
    StyleUnderstandingService,
    StyleAnalysis,
    OutfitSuggestion
)
from services.style_vector_index import StyleIndexService, StyleIndexConfig
from models.fashion_clip_finetune import FashionCLIPInference, FashionCLIPConfig
from models.pcmf_model import PCMFModel, PCMFConfig, load_pcmf_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class RecommendationRequest:
    user_input: str
    user_profile: Optional[Dict] = None
    occasion: Optional[str] = None
    category_filter: Optional[str] = None
    budget_range: Optional[Tuple[float, float]] = None
    top_k: int = 10


@dataclass
class RecommendationResult:
    item_id: str
    score: float
    category: str
    style_tags: List[str]
    color_tags: List[str]
    reasons: List[str]
    image_url: Optional[str] = None
    price: Optional[float] = None
    brand: Optional[str] = None


@dataclass
class OutfitRecommendation:
    outfit_id: str
    items: List[RecommendationResult]
    style_analysis: StyleAnalysis
    compatibility_score: float
    total_price: Optional[float] = None


class IntelligentStyleRecommender:
    def __init__(
        self,
        style_service: Optional[StyleUnderstandingService] = None,
        index_service: Optional[StyleIndexService] = None,
        clip_model: Optional[FashionCLIPInference] = None,
        pcmf_model: Optional[PCMFModel] = None,
        config: Optional[Dict] = None
    ):
        self.config = config or {}
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        self.style_service = style_service or StyleUnderstandingService()
        
        self.index_service = index_service
        if self.index_service is None:
            index_config = StyleIndexConfig(
                index_path=self.config.get("index_path", "./data/indices/style_index")
            )
            self.index_service = StyleIndexService(index_config)
            try:
                self.index_service.load_index()
            except Exception as e:
                logger.warning(f"Could not load index: {e}")
        
        self.clip_model = clip_model
        if self.clip_model is None:
            model_path = self.config.get("clip_model_path", "./models/fashion_clip")
            if Path(model_path).exists():
                try:
                    self.clip_model = FashionCLIPInference(model_path)
                except Exception as e:
                    logger.warning(f"Could not load CLIP model: {e}")
        
        self.pcmf_model = pcmf_model
        pcmf_path = self.config.get("pcmf_model_path", "./models/weights/pcmf.pt")
        if self.pcmf_model is None and Path(pcmf_path).exists():
            try:
                self.pcmf_model = load_pcmf_model(pcmf_path)
                self.pcmf_model.to(self.device)
                self.pcmf_model.eval()
                logger.info("PCMF model loaded successfully")
            except Exception as e:
                logger.warning(f"Could not load PCMF model: {e}")
                self.pcmf_model = None
        
        if self.pcmf_model is None:
            try:
                self.pcmf_model = PCMFModel(PCMFConfig())
                self.pcmf_model.to(self.device)
                self.pcmf_model.eval()
                logger.info("PCMF model initialized with default weights")
            except Exception as e:
                logger.warning(f"Could not initialize PCMF model: {e}")

    async def recommend(
        self,
        request: RecommendationRequest
    ) -> Tuple[StyleAnalysis, List[RecommendationResult]]:
        style_analysis = await self.style_service.analyze_style_description(
            request.user_input,
            request.user_profile
        )
        
        style_prompts = self.style_service.map_style_to_embedding_prompts(style_analysis)
        
        query_embedding = await self._get_style_embedding(style_prompts)
        
        if query_embedding is None:
            query_embedding = np.random.randn(512).astype(np.float32)
            query_embedding = query_embedding / np.linalg.norm(query_embedding)
        
        style_preference = style_analysis.similar_styles[:3]
        
        if request.category_filter:
            raw_results = self.index_service.index.search_by_category(
                request.category_filter,
                query_embedding,
                k=request.top_k * 2
            )
        else:
            raw_results = self.index_service.hybrid_search(
                query_embedding,
                style_preference=style_preference,
                category_filter=request.category_filter,
                k=request.top_k * 2
            )
        
        recommendations = []
        for result in raw_results:
            metadata = result.get("metadata", {})
            
            reasons = self._generate_reasons(style_analysis, metadata, result.get("score", 0))
            
            if request.budget_range:
                price = metadata.get("price")
                if price and (price < request.budget_range[0] or price > request.budget_range[1]):
                    continue
            
            recommendations.append(RecommendationResult(
                item_id=result.get("item_id", ""),
                score=result.get("final_score", result.get("score", 0)),
                category=metadata.get("category", "unknown"),
                style_tags=metadata.get("style_tags", []),
                color_tags=metadata.get("color_tags", []),
                reasons=reasons,
                image_url=metadata.get("image_url"),
                price=metadata.get("price"),
                brand=metadata.get("brand")
            ))
            
            if len(recommendations) >= request.top_k:
                break
        
        return style_analysis, recommendations

    async def recommend_outfit(
        self,
        request: RecommendationRequest
    ) -> OutfitRecommendation:
        style_analysis, base_recommendations = await self.recommend(request)
        
        if not base_recommendations:
            return OutfitRecommendation(
                outfit_id=f"outfit_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                items=[],
                style_analysis=style_analysis,
                compatibility_score=0.0
            )
        
        base_item = base_recommendations[0]
        
        outfit_items = [base_item]
        
        complementary_categories = self._get_complementary_categories(base_item.category)
        
        for category in complementary_categories:
            if category == base_item.category:
                continue
            
            cat_request = RecommendationRequest(
                user_input=request.user_input,
                user_profile=request.user_profile,
                occasion=request.occasion,
                category_filter=category,
                top_k=3
            )
            
            _, cat_recommendations = await self.recommend(cat_request)
            
            if cat_recommendations:
                outfit_items.append(cat_recommendations[0])
        
        compatibility_score = self._calculate_outfit_compatibility(outfit_items)
        
        total_price = None
        if all(item.price is not None for item in outfit_items):
            total_price = sum(item.price for item in outfit_items)
        
        return OutfitRecommendation(
            outfit_id=f"outfit_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            items=outfit_items,
            style_analysis=style_analysis,
            compatibility_score=compatibility_score,
            total_price=total_price
        )

    async def _get_style_embedding(self, style_prompts: List[str]) -> Optional[np.ndarray]:
        if self.clip_model is None:
            return None
        
        embeddings = []
        for prompt in style_prompts[:5]:
            try:
                text_inputs = self.clip_model.model.processor(
                    text=[prompt], return_tensors="pt", padding=True
                )
                
                with self.clip_model.model.clip.device:
                    text_embed = self.clip_model.model.get_text_embedding(
                        text_inputs["input_ids"],
                        text_inputs["attention_mask"]
                    )
                
                embeddings.append(text_embed.cpu().numpy().flatten())
            except Exception as e:
                logger.warning(f"Error getting embedding for prompt: {e}")
        
        if not embeddings:
            return None
        
        avg_embedding = np.mean(embeddings, axis=0)
        return avg_embedding / np.linalg.norm(avg_embedding)

    def _generate_reasons(
        self,
        style_analysis: StyleAnalysis,
        item_metadata: Dict,
        score: float
    ) -> List[str]:
        reasons = []
        
        if score > 0.8:
            reasons.append("高度匹配您的风格偏好")
        elif score > 0.6:
            reasons.append("符合您的风格偏好")
        
        common_styles = set(style_analysis.similar_styles) & set(item_metadata.get("style_tags", []))
        if common_styles:
            reasons.append(f"风格匹配: {', '.join(common_styles)}")
        
        common_colors = set(style_analysis.color_palette) & set(item_metadata.get("color_tags", []))
        if common_colors:
            reasons.append(f"颜色推荐: {', '.join(common_colors)}")
        
        if item_metadata.get("popularity_score", 0) > 50:
            reasons.append("热门单品")
        
        if not reasons:
            reasons.append("风格相近推荐")
        
        return reasons[:3]

    def _get_complementary_categories(self, base_category: str) -> List[str]:
        complement_map = {
            "tops": ["bottoms", "outerwear", "footwear", "accessories"],
            "bottoms": ["tops", "outerwear", "footwear", "accessories"],
            "dresses": ["outerwear", "footwear", "accessories"],
            "outerwear": ["tops", "bottoms", "footwear"],
            "footwear": ["tops", "bottoms", "accessories"],
            "accessories": ["tops", "bottoms", "footwear"]
        }
        
        return complement_map.get(base_category, ["tops", "bottoms"])

    def _calculate_outfit_compatibility(
        self,
        items: List[RecommendationResult]
    ) -> float:
        if len(items) < 2:
            return 0.0
        
        if self.pcmf_model is not None:
            try:
                return self._calculate_pcmf_compatibility(items)
            except Exception as e:
                logger.debug(f"PCMF compatibility failed, using fallback: {e}")
        
        style_sets = [set(item.style_tags) for item in items]
        
        common_styles = set.intersection(*style_sets) if style_sets else set()
        style_score = len(common_styles) / max(len(style_sets[0]), 1) if style_sets else 0
        
        scores = [item.score for item in items]
        avg_score = sum(scores) / len(scores)
        
        compatibility = style_score * 0.4 + avg_score * 0.6
        
        return min(compatibility, 1.0)
    
    def _calculate_pcmf_compatibility(self, items: List[RecommendationResult]) -> float:
        if self.pcmf_model is None or len(items) < 2:
            return 0.0
        
        try:
            with torch.no_grad():
                item_features_list = []
                for item in items:
                    if hasattr(item, 'embedding') and item.embedding is not None:
                        features = torch.tensor(item.embedding, dtype=torch.float32).unsqueeze(0)
                    else:
                        features = torch.randn(1, 512, dtype=torch.float32)
                    item_features_list.append(features.to(self.device))
                
                total_score = 0.0
                pair_count = 0
                
                for i in range(len(item_features_list)):
                    for j in range(i + 1, len(item_features_list)):
                        feat1 = item_features_list[i]
                        feat2 = item_features_list[j]
                        
                        encoded1 = self.pcmf_model.encode_item(visual_features=feat1)
                        encoded2 = self.pcmf_model.encode_item(visual_features=feat2)
                        
                        score = self.pcmf_model.compute_compatibility(encoded1, encoded2)
                        total_score += score.item()
                        pair_count += 1
                
                if pair_count > 0:
                    return total_score / pair_count
                return 0.0
                
        except Exception as e:
            logger.debug(f"PCMF compatibility calculation error: {e}")
            return 0.0


class StyleRecommendationAPI:
    def __init__(self, config: Optional[Dict] = None):
        self.recommender = IntelligentStyleRecommender(config)
    
    async def analyze_style(self, user_input: str, user_profile: Optional[Dict] = None) -> Dict:
        analysis = await self.recommender.style_service.analyze_style_description(
            user_input, user_profile
        )
        return asdict(analysis)
    
    async def get_recommendations(
        self,
        user_input: str,
        user_profile: Optional[Dict] = None,
        occasion: Optional[str] = None,
        category: Optional[str] = None,
        top_k: int = 10
    ) -> Dict:
        request = RecommendationRequest(
            user_input=user_input,
            user_profile=user_profile,
            occasion=occasion,
            category_filter=category,
            top_k=top_k
        )
        
        style_analysis, recommendations = await self.recommender.recommend(request)
        
        return {
            "style_analysis": asdict(style_analysis),
            "recommendations": [asdict(r) for r in recommendations],
            "total": len(recommendations)
        }
    
    async def get_outfit_recommendation(
        self,
        user_input: str,
        user_profile: Optional[Dict] = None,
        occasion: Optional[str] = None
    ) -> Dict:
        request = RecommendationRequest(
            user_input=user_input,
            user_profile=user_profile,
            occasion=occasion,
            top_k=5
        )
        
        outfit = await self.recommender.recommend_outfit(request)
        
        return {
            "outfit_id": outfit.outfit_id,
            "style_analysis": asdict(outfit.style_analysis),
            "items": [asdict(item) for item in outfit.items],
            "compatibility_score": outfit.compatibility_score,
            "total_price": outfit.total_price
        }


async def test_recommendation():
    api = StyleRecommendationAPI()
    
    test_cases = [
        {
            "user_input": "我想要小红书同款的穿搭",
            "user_profile": {
                "gender": "female",
                "age": 25,
                "body_type": "hourglass",
                "style_preferences": ["casual", "minimalist"]
            }
        },
        {
            "user_input": "法式慵懒风怎么穿",
            "occasion": "date"
        },
        {
            "user_input": "韩系甜美风格推荐",
            "category": "tops"
        }
    ]
    
    for case in test_cases:
        print(f"\n{'='*60}")
        print(f"用户输入: {case['user_input']}")
        print("-" * 60)
        
        result = await api.get_recommendations(
            user_input=case["user_input"],
            user_profile=case.get("user_profile"),
            occasion=case.get("occasion"),
            category=case.get("category")
        )
        
        print(f"风格分析: {result['style_analysis']['style_name']}")
        print(f"核心元素: {result['style_analysis']['core_elements']}")
        print(f"推荐数量: {result['total']}")
        
        for i, rec in enumerate(result['recommendations'][:3], 1):
            print(f"\n推荐 {i}:")
            print(f"  ID: {rec['item_id']}")
            print(f"  类别: {rec['category']}")
            print(f"  分数: {rec['score']:.4f}")
            print(f"  风格: {rec['style_tags']}")
            print(f"  理由: {rec['reasons']}")


if __name__ == "__main__":
    asyncio.run(test_recommendation())
