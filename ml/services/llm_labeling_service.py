"""
LLM自动标注服务
使用大语言模型自动标注爬取的数据
"""

import os
import sys
import json
import asyncio
import re
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import logging

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.style_understanding_service import LLMBackend, OpenAIBackend, OllamaBackend, MockLLMBackend

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class LabeledItem:
    item_id: str
    original_data: Dict[str, Any]
    
    style_tags: List[str]
    category: str
    subcategory: str
    
    color_tags: List[str]
    pattern: str
    material: str
    
    occasion_tags: List[str]
    season_tags: List[str]
    
    fit: str
    length: str
    neckline: str
    sleeve_length: str
    
    quality_score: float
    fashion_score: float
    trend_score: float
    
    target_age_range: List[int]
    target_gender: List[str]
    target_body_types: List[str]
    
    similar_styles: List[str]
    matching_items: List[str]
    
    llm_model: str
    labeling_time: str
    confidence: float


class StyleLabelingPrompts:
    CLOTHING_ANALYSIS = """分析以下服装信息，返回JSON格式的标注结果。

服装信息：
- 标题: {title}
- 描述: {description}
- 现有标签: {existing_tags}

请返回以下JSON格式（不要包含markdown代码块）：
{{
    "style_tags": ["风格标签1", "风格标签2"],
    "category": "类别（tops/bottoms/dresses/outerwear/footwear/accessories）",
    "subcategory": "子类别",
    "color_tags": ["颜色1", "颜色2"],
    "pattern": "图案（solid/striped/plaid/floral等）",
    "material": "材质",
    "occasion_tags": ["场合1", "场合2"],
    "season_tags": ["季节1", "季节2"],
    "fit": "版型（slim/regular/loose/oversized）",
    "quality_score": 0.8,
    "fashion_score": 0.7,
    "trend_score": 0.6,
    "target_age_range": [20, 35],
    "target_gender": ["female"],
    "target_body_types": ["hourglass", "rectangle"],
    "confidence": 0.85
}}
"""

    OUTFIT_COMPATIBILITY = """分析以下两件服装是否适合搭配在一起：

服装A: {item_a}
服装B: {item_b}

返回JSON格式：
{{
    "compatible": true,
    "score": 0.85,
    "reasons": ["原因1", "原因2"],
    "style_match": true,
    "color_match": true,
    "occasion_match": true
}}
"""

    TREND_ANALYSIS = """分析以下服装是否符合当前流行趋势：

服装信息: {item_info}

返回JSON格式：
{{
    "is_trending": true,
    "trend_score": 0.8,
    "trend_tags": ["流行元素1", "流行元素2"],
    "similar_trending_items": ["相似流行单品"],
    "fashion_week_relevance": 0.6
}}
"""


class LLMLabelingService:
    def __init__(
        self,
        backend: Optional[LLMBackend] = None,
        use_mock: bool = False
    ):
        if backend:
            self.backend = backend
        elif use_mock:
            self.backend = MockLLMBackend()
        elif os.getenv("OPENAI_API_KEY"):
            self.backend = OpenAIBackend()
        else:
            self.backend = MockLLMBackend()
        
        self.style_keywords = self._init_style_keywords()
        self.category_keywords = self._init_category_keywords()
        self.color_keywords = self._init_color_keywords()

    def _init_style_keywords(self) -> Dict[str, List[str]]:
        return {
            "casual": ["休闲", "日常", "舒适", "casual", "daily"],
            "formal": ["正式", "商务", "职业", "formal", "business", "office"],
            "sporty": ["运动", "健身", "athletic", "sporty", "gym"],
            "streetwear": ["街头", "潮流", "嘻哈", "streetwear", "urban", "hiphop"],
            "minimalist": ["极简", "简约", "minimalist", "simple", "clean"],
            "bohemian": ["波西米亚", "波西", "bohemian", "boho", "folk"],
            "vintage": ["复古", "怀旧", "vintage", "retro", "classic"],
            "romantic": ["浪漫", "甜美", "romantic", "feminine", "girly"],
            "edgy": ["前卫", "个性", "edgy", "punk", "rock"],
            "elegant": ["优雅", "气质", "elegant", "chic", "sophisticated"],
            "korean": ["韩系", "韩国", "korean", "k-style", "韩风"],
            "japanese": ["日系", "日本", "japanese", "j-style", "日风"],
            "french": ["法式", "法国", "french", "parisian"],
            "preppy": ["学院", "学院风", "preppy", "collegiate"],
        }

    def _init_category_keywords(self) -> Dict[str, List[str]]:
        return {
            "tops": ["上衣", "衬衫", "T恤", "毛衣", "针织", "卫衣", "top", "shirt", "blouse"],
            "bottoms": ["裤子", "裙", "短裤", "牛仔裤", "阔腿裤", "pants", "skirt", "jeans"],
            "dresses": ["连衣裙", "裙子", "dress", "gown"],
            "outerwear": ["外套", "大衣", "夹克", "西装", "jacket", "coat", "blazer"],
            "footwear": ["鞋", "靴", "高跟鞋", "运动鞋", "shoes", "boots", "heels", "sneakers"],
            "accessories": ["包", "帽子", "围巾", "首饰", "bag", "hat", "scarf", "jewelry"],
        }

    def _init_color_keywords(self) -> Dict[str, List[str]]:
        return {
            "black": ["黑色", "黑", "black"],
            "white": ["白色", "白", "white"],
            "gray": ["灰色", "灰", "gray", "grey"],
            "navy": ["藏蓝", "深蓝", "navy", "dark blue"],
            "blue": ["蓝色", "蓝", "blue"],
            "red": ["红色", "红", "red"],
            "pink": ["粉色", "粉", "pink"],
            "green": ["绿色", "绿", "green"],
            "yellow": ["黄色", "黄", "yellow"],
            "brown": ["棕色", "咖啡色", "brown"],
            "beige": ["米色", "卡其", "beige", "khaki"],
            "purple": ["紫色", "紫", "purple"],
        }

    async def label_item(
        self,
        item_data: Dict[str, Any],
        use_llm: bool = True
    ) -> LabeledItem:
        item_id = item_data.get("item_id", str(hash(str(item_data))))
        
        if use_llm:
            llm_result = await self._get_llm_labels(item_data)
        else:
            llm_result = {}
        
        rule_based_result = self._get_rule_based_labels(item_data)
        
        final_labels = self._merge_labels(llm_result, rule_based_result)
        
        return LabeledItem(
            item_id=item_id,
            original_data=item_data,
            style_tags=final_labels.get("style_tags", ["casual"]),
            category=final_labels.get("category", "tops"),
            subcategory=final_labels.get("subcategory", ""),
            color_tags=final_labels.get("color_tags", []),
            pattern=final_labels.get("pattern", "solid"),
            material=final_labels.get("material", "unknown"),
            occasion_tags=final_labels.get("occasion_tags", ["daily"]),
            season_tags=final_labels.get("season_tags", ["spring", "autumn"]),
            fit=final_labels.get("fit", "regular"),
            length=final_labels.get("length", "regular"),
            neckline=final_labels.get("neckline", "unknown"),
            sleeve_length=final_labels.get("sleeve_length", "unknown"),
            quality_score=final_labels.get("quality_score", 0.7),
            fashion_score=final_labels.get("fashion_score", 0.7),
            trend_score=final_labels.get("trend_score", 0.5),
            target_age_range=final_labels.get("target_age_range", [18, 45]),
            target_gender=final_labels.get("target_gender", ["female"]),
            target_body_types=final_labels.get("target_body_types", []),
            similar_styles=final_labels.get("similar_styles", []),
            matching_items=final_labels.get("matching_items", []),
            llm_model="mock" if isinstance(self.backend, MockLLMBackend) else "llm",
            labeling_time=datetime.now().isoformat(),
            confidence=final_labels.get("confidence", 0.7)
        )

    async def _get_llm_labels(self, item_data: Dict) -> Dict:
        prompt = StyleLabelingPrompts.CLOTHING_ANALYSIS.format(
            title=item_data.get("title", ""),
            description=item_data.get("description", ""),
            existing_tags=item_data.get("style_tags", [])
        )
        
        try:
            result = await self.backend.generate_json(prompt)
            return result
        except Exception as e:
            logger.error(f"LLM标注失败: {e}")
            return {}

    def _get_rule_based_labels(self, item_data: Dict) -> Dict:
        result = {
            "style_tags": [],
            "category": "accessories",
            "color_tags": [],
            "occasion_tags": ["daily"],
            "season_tags": []
        }
        
        text = " ".join([
            item_data.get("title", ""),
            item_data.get("description", ""),
            " ".join(item_data.get("style_tags", []))
        ]).lower()
        
        for style, keywords in self.style_keywords.items():
            for kw in keywords:
                if kw.lower() in text:
                    result["style_tags"].append(style)
                    break
        
        for category, keywords in self.category_keywords.items():
            for kw in keywords:
                if kw.lower() in text:
                    result["category"] = category
                    break
        
        for color, keywords in self.color_keywords.items():
            for kw in keywords:
                if kw.lower() in text:
                    result["color_tags"].append(color)
                    break
        
        result["style_tags"] = list(set(result["style_tags"]))[:3]
        result["color_tags"] = list(set(result["color_tags"]))[:3]
        
        return result

    def _merge_labels(self, llm_result: Dict, rule_result: Dict) -> Dict:
        merged = rule_result.copy()
        
        for key, value in llm_result.items():
            if key in merged and isinstance(merged[key], list) and isinstance(value, list):
                merged[key] = list(set(merged[key] + value))
            elif value is not None and value != "":
                merged[key] = value
        
        return merged

    async def batch_label_items(
        self,
        items: List[Dict],
        use_llm: bool = True,
        batch_size: int = 10
    ) -> List[LabeledItem]:
        labeled_items = []
        
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            
            tasks = [self.label_item(item, use_llm) for item in batch]
            results = await asyncio.gather(*tasks)
            
            labeled_items.extend(results)
            
            logger.info(f"已标注 {len(labeled_items)}/{len(items)} 条数据")
        
        return labeled_items

    async def analyze_outfit_compatibility(
        self,
        item_a: Dict,
        item_b: Dict
    ) -> Dict:
        prompt = StyleLabelingPrompts.OUTFIT_COMPATIBILITY.format(
            item_a=json.dumps(item_a, ensure_ascii=False),
            item_b=json.dumps(item_b, ensure_ascii=False)
        )
        
        result = await self.backend.generate_json(prompt)
        
        return {
            "compatible": result.get("compatible", True),
            "score": result.get("score", 0.7),
            "reasons": result.get("reasons", []),
            "style_match": result.get("style_match", True),
            "color_match": result.get("color_match", True),
            "occasion_match": result.get("occasion_match", True)
        }

    def save_labeled_items(
        self,
        items: List[LabeledItem],
        output_path: str
    ):
        data = {
            "items": [asdict(item) for item in items],
            "total": len(items),
            "labeled_at": datetime.now().isoformat()
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"保存 {len(items)} 条标注数据到 {output_path}")


async def test_labeling():
    service = LLMLabelingService(use_mock=True)
    
    test_items = [
        {
            "item_id": "test_001",
            "title": "韩系甜美针织开衫",
            "description": "温柔甜美的韩系风格针织开衫",
            "style_tags": ["韩系"]
        },
        {
            "item_id": "test_002",
            "title": "法式慵懒风条纹衫",
            "description": "经典法式条纹设计",
            "style_tags": ["法式"]
        },
        {
            "item_id": "test_003",
            "title": "街头潮流卫衣",
            "description": "oversized版型街头风格",
            "style_tags": ["街头"]
        }
    ]
    
    print("="*60)
    print("LLM自动标注测试")
    print("="*60)
    
    for item in test_items:
        labeled = await service.label_item(item)
        print(f"\n原始: {item['title']}")
        print(f"风格: {labeled.style_tags}")
        print(f"类别: {labeled.category}")
        print(f"颜色: {labeled.color_tags}")
        print(f"场合: {labeled.occasion_tags}")
        print(f"置信度: {labeled.confidence:.2f}")


if __name__ == "__main__":
    asyncio.run(test_labeling())
