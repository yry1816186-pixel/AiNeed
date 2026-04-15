"""
LLM风格理解服务
使用大语言模型解析用户风格描述，理解"小红书同款"等概念
支持OpenAI、本地LLM等多种后端
"""

import os
import json
import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
from enum import Enum
import asyncio
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


def mask_api_key(api_key: Optional[str], visible_chars: int = 4) -> str:
    """
    Mask API key for safe logging.

    Args:
        api_key: The API key to mask
        visible_chars: Number of characters to show at start and end

    Returns:
        Masked API key string safe for logging
    """
    if not api_key:
        return "<not_set>"

    if len(api_key) <= visible_chars * 2:
        return "***" + api_key[-2:] if len(api_key) > 2 else "***"

    return f"{api_key[:visible_chars]}...{api_key[-visible_chars:]}"


class StyleCategory(Enum):
    CASUAL = "casual"
    FORMAL = "formal"
    SPORTY = "sporty"
    STREETWEAR = "streetwear"
    MINIMALIST = "minimalist"
    BOHEMIAN = "bohemian"
    VINTAGE = "vintage"
    ROMANTIC = "romantic"
    EDGY = "edgy"
    ELEGANT = "elegant"
    KOREAN = "korean"
    FRENCH = "french"
    JAPANESE = "japanese"
    CHINESE_MODERN = "chinese_modern"
    PREPPY = "preppy"
    SMART_CASUAL = "smart_casual"


@dataclass
class StyleAnalysis:
    style_name: str
    confidence: float
    core_elements: List[str]
    key_items: List[str]
    color_palette: List[str]
    patterns: List[str]
    materials: List[str]
    occasions: List[str]
    seasons: List[str]
    body_type_suggestions: Dict[str, List[str]]
    celebrity_references: List[str]
    brand_references: List[str]
    price_range: str
    similar_styles: List[str]


@dataclass
class OutfitSuggestion:
    category: str
    description: str
    style_tags: List[str]
    color_suggestions: List[str]
    item_examples: List[str]
    pairing_tips: str


class StyleUnderstandingUnavailableError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int = 503,
        backend: Optional[str] = None,
        reason: Optional[str] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.backend = backend
        self.reason = reason


class LLMBackend(ABC):
    @abstractmethod
    async def generate(self, prompt: str, max_tokens: int = 1000) -> str:
        pass

    @abstractmethod
    async def generate_json(self, prompt: str) -> Dict:
        pass


class GLM5Backend(LLMBackend):
    def __init__(self, api_key: Optional[str] = None, model: str = "glm-5", base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv("GLM_API_KEY") or os.getenv("ZHIPU_API_KEY")
        self.model = model or os.getenv("GLM_MODEL", "glm-5")
        self.base_url = base_url or os.getenv("GLM_API_ENDPOINT") or os.getenv("ZHIPU_API_ENDPOINT", "https://open.bigmodel.cn/api/paas/v4")
        # Log API key status safely (masked)
        logger.info(f"GLM5Backend initialized with model={self.model}, api_key={mask_api_key(self.api_key)}")

    async def generate(self, prompt: str, max_tokens: int = 1000) -> str:
        try:
            import aiohttp
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": 0.7
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get("choices", [{}])[0].get("message", {}).get("content", "")
                    else:
                        error_text = await response.text()
                        logger.error(f"GLM-5 API error: {response.status} - {error_text[:200]}")
                        return ""
        except Exception as e:
            logger.error(f"GLM-5 API error: {type(e).__name__}: {str(e)[:200]}")
            return ""

    async def generate_json(self, prompt: str) -> Dict:
        response = await self.generate(prompt)
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            return {}
        except json.JSONDecodeError:
            return {}


class OpenAIBackend(LLMBackend):
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.base_url = os.getenv("OPENAI_BASE_URL") or os.getenv("OPENAI_API_ENDPOINT", "https://api.openai.com/v1")
        # Log API key status safely (masked)
        logger.info(f"OpenAIBackend initialized with model={self.model}, api_key={mask_api_key(self.api_key)}")

    async def generate(self, prompt: str, max_tokens: int = 1000) -> str:
        try:
            import openai
            client = openai.AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
            
            response = await client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.7
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {type(e).__name__}: {str(e)[:200]}")
            return ""

    async def generate_json(self, prompt: str) -> Dict:
        response = await self.generate(prompt)
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            return {}
        except json.JSONDecodeError:
            return {}


class OllamaBackend(LLMBackend):
    def __init__(self, model: str = "qwen2.5:7b", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url

    async def generate(self, prompt: str, max_tokens: int = 1000) -> str:
        import aiohttp
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {"num_predict": max_tokens}
                    },
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    result = await response.json()
                    return result.get("response", "")
        except Exception as e:
            logger.error(f"Ollama API error: {type(e).__name__}: {str(e)[:200]}")
            return ""

    async def generate_json(self, prompt: str) -> Dict:
        response = await self.generate(prompt)
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            return {}
        except json.JSONDecodeError:
            return {}


class MockLLMBackend(LLMBackend):
    def __init__(self):
        self.style_knowledge = self._load_style_knowledge()

    def _load_style_knowledge(self) -> Dict:
        return {
            "小红书同款": {
                "style_name": "小红书风",
                "core_elements": ["显瘦", "日常", "拍照好看", "性价比高"],
                "key_items": ["白衬衫", "阔腿裤", "针织开衫", "帆布鞋", "小众设计感单品"],
                "color_palette": ["米白", "浅蓝", "卡其", "雾霾蓝", "奶茶色"],
                "patterns": ["纯色", "细条纹", "小碎花"],
                "materials": ["棉", "针织", "雪纺", "牛仔"],
                "occasions": ["约会", "逛街", "拍照", "日常通勤"],
                "seasons": ["春", "秋"],
                "body_type_suggestions": {
                    "rectangle": ["高腰设计", "层叠搭配"],
                    "hourglass": ["收腰款式", "A字裙"],
                    "triangle": ["亮色上衣", "深色下装"],
                    "inverted_triangle": ["V领上衣", "阔腿裤"],
                    "oval": ["V领设计", "垂感面料"]
                },
                "celebrity_references": ["欧阳娜娜", "周雨彤", "宋妍霏"],
                "brand_references": ["UR", "ZARA", "优衣库", "小众设计师品牌"],
                "price_range": "100-500元",
                "similar_styles": ["韩系", "日系", "简约风"]
            },
            "法式慵懒": {
                "style_name": "法式慵懒风",
                "core_elements": ["优雅", "随性", "浪漫", "经典"],
                "key_items": ["条纹衫", "牛仔裤", "芭蕾舞鞋", "贝雷帽", "丝巾"],
                "color_palette": ["海军蓝", "白色", "红色", "米色", "黑色"],
                "patterns": ["条纹", "波点", "格纹"],
                "materials": ["棉", "丝绸", "亚麻", "羊毛"],
                "occasions": ["约会", "逛街", "咖啡厅", "旅行"],
                "seasons": ["春", "夏", "秋"],
                "body_type_suggestions": {
                    "rectangle": ["丝巾点缀", "高腰裤"],
                    "hourglass": ["裹身裙", "收腰上衣"],
                    "triangle": ["船领上衣", "A字裙"],
                    "inverted_triangle": ["V领衬衫", "直筒裤"],
                    "oval": ["开衫叠穿", "V领设计"]
                },
                "celebrity_references": ["Jeanne Damas", "Camille Charriere"],
                "brand_references": ["Sézane", "Rouje", "Petite Studio"],
                "price_range": "200-1000元",
                "similar_styles": ["浪漫风", "复古风", "优雅风"]
            },
            "韩系": {
                "style_name": "韩系风",
                "core_elements": ["温柔", "甜美", "学院", "年轻"],
                "key_items": ["针织背心", "百褶裙", "小白鞋", "卫衣", "西装外套"],
                "color_palette": ["粉色", "米色", "浅蓝", "白色", "灰色"],
                "patterns": ["纯色", "格纹", "小图案"],
                "materials": ["针织", "棉", "雪纺", "灯芯绒"],
                "occasions": ["约会", "上学", "逛街", "咖啡厅"],
                "seasons": ["春", "秋", "冬"],
                "body_type_suggestions": {
                    "rectangle": ["层叠穿搭", "高腰裙"],
                    "hourglass": ["收腰连衣裙", "铅笔裙"],
                    "triangle": ["亮色上衣", "A字裙"],
                    "inverted_triangle": ["V领设计", "阔腿裤"],
                    "oval": ["长款开衫", "V领上衣"]
                },
                "celebrity_references": ["Jennie", "IU", "秀智"],
                "brand_references": ["STYLENANDA", "8 Seconds", "SPAO"],
                "price_range": "100-500元",
                "similar_styles": ["日系", "学院风", "甜美风"]
            },
            "日系": {
                "style_name": "日系风",
                "core_elements": ["简约", "自然", "舒适", "文艺"],
                "key_items": ["宽松衬衫", "阔腿裤", "帆布包", "乐福鞋", "针织衫"],
                "color_palette": ["米色", "棕色", "白色", "藏蓝", "灰色"],
                "patterns": ["纯色", "格纹", "条纹"],
                "materials": ["棉", "麻", "针织", "灯芯绒"],
                "occasions": ["日常", "上班", "逛街", "书店"],
                "seasons": ["春", "秋", "冬"],
                "body_type_suggestions": {
                    "rectangle": ["宽松廓形", "层叠搭配"],
                    "hourglass": ["收腰设计", "A字裙"],
                    "triangle": ["浅色上衣", "深色下装"],
                    "inverted_triangle": ["V领设计", "阔腿裤"],
                    "oval": ["长款外套", "垂感面料"]
                },
                "celebrity_references": ["新垣结衣", "石原里美"],
                "brand_references": ["UNIQLO", "MUJI", "LOWRYS FARM"],
                "price_range": "100-400元",
                "similar_styles": ["韩系", "简约风", "文艺风"]
            },
            "街头潮流": {
                "style_name": "街头潮流风",
                "core_elements": ["个性", "潮流", "运动", "年轻"],
                "key_items": ["卫衣", "工装裤", "球鞋", "棒球帽", "潮牌T恤"],
                "color_palette": ["黑色", "白色", "荧光色", "迷彩", "撞色"],
                "patterns": ["涂鸦", "字母", "迷彩", "几何"],
                "materials": ["棉", "尼龙", "牛仔", "皮革"],
                "occasions": ["逛街", "聚会", "音乐节", "运动"],
                "seasons": ["春", "夏", "秋"],
                "body_type_suggestions": {
                    "rectangle": ["宽松版型", "层叠搭配"],
                    "hourglass": ["高腰工装裤", "短款上衣"],
                    "triangle": ["宽松上衣", "束脚裤"],
                    "inverted_triangle": ["直筒裤", "简约上衣"],
                    "oval": ["宽松卫衣", "直筒裤"]
                },
                "celebrity_references": ["Kendall Jenner", "G-Dragon"],
                "brand_references": ["Supreme", "Stussy", "Off-White", "Nike"],
                "price_range": "200-2000元",
                "similar_styles": ["运动风", "嘻哈风", "潮流风"]
            },
            "极简风": {
                "style_name": "极简风",
                "core_elements": ["简约", "高级", "经典", "质感"],
                "key_items": ["白衬衫", "黑裤子", "西装外套", "针织衫", "尖头高跟鞋"],
                "color_palette": ["黑色", "白色", "灰色", "米色", "藏蓝"],
                "patterns": ["纯色"],
                "materials": ["真丝", "羊毛", "棉", "皮革"],
                "occasions": ["上班", "会议", "商务", "正式场合"],
                "seasons": ["春", "秋", "冬"],
                "body_type_suggestions": {
                    "rectangle": ["合身剪裁", "腰带点缀"],
                    "hourglass": ["收腰设计", "铅笔裙"],
                    "triangle": ["深色下装", "浅色上衣"],
                    "inverted_triangle": ["V领设计", "直筒裤"],
                    "oval": ["V领设计", "垂感面料"]
                },
                "celebrity_references": ["Victoria Beckham", "Coco Chanel"],
                "brand_references": ["COS", "Theory", "Everlane"],
                "price_range": "300-1500元",
                "similar_styles": ["商务风", "优雅风", "经典风"]
            },
            "复古风": {
                "style_name": "复古风",
                "core_elements": ["怀旧", "经典", "优雅", "独特"],
                "key_items": ["A字裙", "波点衬衫", "玛丽珍鞋", "珍珠项链", "复古连衣裙"],
                "color_palette": ["酒红", "墨绿", "藏蓝", "棕色", "米色"],
                "patterns": ["波点", "格纹", "碎花", "条纹"],
                "materials": ["丝绒", "丝绸", "棉", "羊毛"],
                "occasions": ["约会", "派对", "复古活动", "拍照"],
                "seasons": ["春", "秋", "冬"],
                "body_type_suggestions": {
                    "rectangle": ["A字裙", "腰带设计"],
                    "hourglass": ["裹身裙", "铅笔裙"],
                    "triangle": ["船领上衣", "A字裙"],
                    "inverted_triangle": ["V领设计", "阔腿裤"],
                    "oval": ["V领设计", "垂感连衣裙"]
                },
                "celebrity_references": ["Taylor Swift", "Alexa Chung"],
                "brand_references": ["ModCloth", "Unique Vintage"],
                "price_range": "200-800元",
                "similar_styles": ["法式风", "浪漫风", "优雅风"]
            },
            "运动风": {
                "style_name": "运动风",
                "core_elements": ["活力", "舒适", "健康", "年轻"],
                "key_items": ["运动内衣", "瑜伽裤", "运动外套", "跑鞋", "运动短裤"],
                "color_palette": ["黑色", "灰色", "荧光色", "白色", "撞色"],
                "patterns": ["纯色", "几何", "渐变"],
                "materials": ["聚酯纤维", "尼龙", "氨纶", "网眼"],
                "occasions": ["健身", "跑步", "瑜伽", "休闲"],
                "seasons": ["春", "夏", "秋"],
                "body_type_suggestions": {
                    "rectangle": ["紧身设计", "运动套装"],
                    "hourglass": ["高腰瑜伽裤", "运动内衣"],
                    "triangle": ["运动上衣", "深色裤装"],
                    "inverted_triangle": ["运动短裤", "简约上衣"],
                    "oval": ["宽松运动上衣", "弹性裤装"]
                },
                "celebrity_references": ["Adriana Lima", "Gisele Bündchen"],
                "brand_references": ["Lululemon", "Nike", "Adidas", "Under Armour"],
                "price_range": "100-800元",
                "similar_styles": ["街头风", "休闲风", "活力风"]
            }
        }

    async def generate(self, prompt: str, max_tokens: int = 1000) -> str:
        for style_name, data in self.style_knowledge.items():
            if style_name in prompt:
                return json.dumps(data, ensure_ascii=False)
        return json.dumps(self.style_knowledge.get("小红书同款", {}), ensure_ascii=False)

    async def generate_json(self, prompt: str) -> Dict:
        for style_name, data in self.style_knowledge.items():
            if style_name in prompt:
                return data
        return self.style_knowledge.get("小红书同款", {})


class StyleUnderstandingService:
    def __init__(
        self,
        backend: Optional[LLMBackend] = None,
        use_mock: bool = False
    ):
        if backend:
            self.backend = backend
        elif use_mock:
            self.backend = MockLLMBackend()
        elif os.getenv("GLM_API_KEY") or os.getenv("ZHIPU_API_KEY"):
            self.backend = GLM5Backend()
            logger.info("风格理解服务使用 GLM-5 后端")
        elif os.getenv("OPENAI_API_KEY"):
            self.backend = OpenAIBackend()
            logger.info("风格理解服务使用 OpenAI 后端")
        else:
            self.backend = MockLLMBackend()
            logger.warning("风格理解服务使用 Mock 后端（无API密钥配置）")

        self.backend_name = type(self.backend).__name__
        self.using_mock_backend = isinstance(self.backend, MockLLMBackend)
        self.initialization_error: Optional[str] = None
        if self.using_mock_backend:
            if use_mock:
                self.initialization_error = (
                    "Style understanding is configured to use the mock backend."
                )
            else:
                self.initialization_error = (
                    "No real LLM API key is configured for style understanding. "
                    "Set GLM_API_KEY, ZHIPU_API_KEY, or OPENAI_API_KEY."
                )

        self.style_knowledge_base = self._init_style_knowledge_base()

    def get_backend_status(self) -> Dict[str, Any]:
        return {
            "backend": self.backend_name,
            "using_mock_backend": self.using_mock_backend,
            "available": not self.using_mock_backend,
            "reason": self.initialization_error,
        }

    def _init_style_knowledge_base(self) -> Dict:
        return {
            "小红书同款": {
                "keywords": ["小红书", "网红", "爆款", "种草", "同款"],
                "style_mapping": ["casual", "minimalist", "streetwear"],
                "occasion_mapping": ["daily", "date", "photo"]
            },
            "法式慵懒": {
                "keywords": ["法式", "慵懒", "巴黎", "French", "浪漫"],
                "style_mapping": ["romantic", "vintage", "elegant"],
                "occasion_mapping": ["date", "cafe", "travel"]
            },
            "韩系": {
                "keywords": ["韩系", "韩国", "Korean", "韩风", "甜美"],
                "style_mapping": ["casual", "romantic", "preppy"],
                "occasion_mapping": ["date", "daily", "school"]
            },
            "日系": {
                "keywords": ["日系", "日本", "Japanese", "文艺", "森系"],
                "style_mapping": ["minimalist", "casual", "bohemian"],
                "occasion_mapping": ["daily", "work", "cafe"]
            },
            "街头潮流": {
                "keywords": ["街头", "潮流", "嘻哈", "streetwear", "潮牌"],
                "style_mapping": ["streetwear", "edgy", "sporty"],
                "occasion_mapping": ["party", "daily", "concert"]
            },
            "极简风": {
                "keywords": ["极简", "简约", "minimalist", "高级感", "性冷淡"],
                "style_mapping": ["minimalist", "formal", "elegant"],
                "occasion_mapping": ["work", "meeting", "formal"]
            },
            "复古风": {
                "keywords": ["复古", "vintage", "怀旧", "古典", "港风"],
                "style_mapping": ["vintage", "romantic", "elegant"],
                "occasion_mapping": ["date", "party", "photo"]
            },
            "运动风": {
                "keywords": ["运动", "健身", "sporty", "瑜伽", "跑步"],
                "style_mapping": ["sporty", "casual", "streetwear"],
                "occasion_mapping": ["sport", "gym", "daily"]
            }
        }

    async def analyze_style_description(
        self,
        user_input: str,
        user_profile: Optional[Dict] = None
    ) -> StyleAnalysis:
        if self.using_mock_backend:
            raise StyleUnderstandingUnavailableError(
                self.initialization_error or "Style understanding is using a mock backend.",
                status_code=503,
                backend=self.backend_name,
                reason="missing_real_llm_backend",
            )

        prompt = self._build_style_analysis_prompt(user_input, user_profile)
        result = await self.backend.generate_json(prompt)
        
        if not result:
            raise StyleUnderstandingUnavailableError(
                f"{self.backend_name} returned an empty or invalid response.",
                status_code=502,
                backend=self.backend_name,
                reason="empty_or_invalid_model_response",
            )
        
        return StyleAnalysis(
            style_name=result.get("style_name", "休闲风"),
            confidence=result.get("confidence", 0.7),
            core_elements=result.get("core_elements", ["日常", "舒适"]),
            key_items=result.get("key_items", ["T恤", "牛仔裤"]),
            color_palette=result.get("color_palette", ["白色", "蓝色"]),
            patterns=result.get("patterns", ["纯色"]),
            materials=result.get("materials", ["棉"]),
            occasions=result.get("occasions", ["日常"]),
            seasons=result.get("seasons", ["春", "秋"]),
            body_type_suggestions=result.get("body_type_suggestions", {}),
            celebrity_references=result.get("celebrity_references", []),
            brand_references=result.get("brand_references", []),
            price_range=result.get("price_range", "100-500元"),
            similar_styles=result.get("similar_styles", [])
        )

    def _build_style_analysis_prompt(self, user_input: str, user_profile: Optional[Dict]) -> str:
        profile_context = ""
        if user_profile:
            profile_context = f"""
用户档案：
- 性别：{user_profile.get('gender', '未知')}
- 年龄：{user_profile.get('age', '未知')}
- 体型：{user_profile.get('body_type', '未知')}
- 肤色：{user_profile.get('skin_tone', '未知')}
- 偏好风格：{user_profile.get('style_preferences', [])}
- 偏好场合：{user_profile.get('occasion_preferences', [])}
"""

        return f"""你是一位专业的时尚搭配顾问。请分析用户的风格描述，返回JSON格式的分析结果。

用户描述："{user_input}"
{profile_context}

请返回以下JSON格式（不要包含markdown代码块标记）：
{{
    "style_name": "风格名称",
    "confidence": 0.85,
    "core_elements": ["核心元素1", "核心元素2"],
    "key_items": ["关键单品1", "关键单品2", "关键单品3"],
    "color_palette": ["颜色1", "颜色2", "颜色3"],
    "patterns": ["图案1", "图案2"],
    "materials": ["材质1", "材质2"],
    "occasions": ["场合1", "场合2"],
    "seasons": ["季节1", "季节2"],
    "body_type_suggestions": {{
        "rectangle": ["建议1", "建议2"],
        "hourglass": ["建议1", "建议2"],
        "triangle": ["建议1", "建议2"],
        "inverted_triangle": ["建议1", "建议2"],
        "oval": ["建议1", "建议2"]
    }},
    "celebrity_references": ["明星参考1", "明星参考2"],
    "brand_references": ["品牌参考1", "品牌参考2"],
    "price_range": "价格区间",
    "similar_styles": ["相似风格1", "相似风格2"]
}}
"""

    def _get_fallback_analysis(self, user_input: str) -> Dict:
        for style_name, data in self.style_knowledge_base.items():
            for keyword in data["keywords"]:
                if keyword in user_input:
                    mock_backend = MockLLMBackend()
                    return mock_backend.style_knowledge.get(style_name, {})
        
        return {
            "style_name": "休闲风",
            "confidence": 0.6,
            "core_elements": ["日常", "舒适", "百搭"],
            "key_items": ["T恤", "牛仔裤", "运动鞋", "卫衣"],
            "color_palette": ["白色", "黑色", "灰色", "蓝色"],
            "patterns": ["纯色"],
            "materials": ["棉", "牛仔"],
            "occasions": ["日常", "休闲"],
            "seasons": ["春", "夏", "秋"],
            "body_type_suggestions": {
                "rectangle": ["高腰设计", "层叠搭配"],
                "hourglass": ["收腰款式", "直筒裤"],
                "triangle": ["亮色上衣", "深色下装"],
                "inverted_triangle": ["V领设计", "阔腿裤"],
                "oval": ["V领设计", "垂感面料"]
            },
            "celebrity_references": [],
            "brand_references": ["优衣库", "ZARA"],
            "price_range": "100-300元",
            "similar_styles": ["简约风", "运动风"]
        }

    async def generate_outfit_suggestions(
        self,
        style_analysis: StyleAnalysis,
        user_body_type: Optional[str] = None,
        occasion: Optional[str] = None
    ) -> List[OutfitSuggestion]:
        suggestions = []
        
        base_suggestions = [
            OutfitSuggestion(
                category="tops",
                description=f"{style_analysis.style_name}风格上衣",
                style_tags=style_analysis.similar_styles[:3],
                color_suggestions=style_analysis.color_palette[:3],
                item_examples=style_analysis.key_items[:2],
                pairing_tips="选择合身版型，搭配高腰下装"
            ),
            OutfitSuggestion(
                category="bottoms",
                description=f"{style_analysis.style_name}风格下装",
                style_tags=style_analysis.similar_styles[:3],
                color_suggestions=style_analysis.color_palette[:3],
                item_examples=["阔腿裤", "A字裙"][:2],
                pairing_tips="高腰设计可以优化身材比例"
            ),
            OutfitSuggestion(
                category="outerwear",
                description=f"{style_analysis.style_name}风格外套",
                style_tags=style_analysis.similar_styles[:3],
                color_suggestions=style_analysis.color_palette[:2],
                item_examples=["西装外套", "针织开衫"][:2],
                pairing_tips="选择垂感面料，避免过于厚重"
            ),
            OutfitSuggestion(
                category="footwear",
                description=f"{style_analysis.style_name}风格鞋履",
                style_tags=style_analysis.similar_styles[:3],
                color_suggestions=["白色", "黑色", "米色"],
                item_examples=["小白鞋", "乐福鞋", "帆布鞋"][:2],
                pairing_tips="选择舒适百搭的款式"
            ),
            OutfitSuggestion(
                category="accessories",
                description=f"{style_analysis.style_name}风格配饰",
                style_tags=style_analysis.similar_styles[:3],
                color_suggestions=style_analysis.color_palette[:2],
                item_examples=["丝巾", "帽子", "包包"][:2],
                pairing_tips="点缀即可，不要过于复杂"
            )
        ]

        if user_body_type and user_body_type in style_analysis.body_type_suggestions:
            body_tips = style_analysis.body_type_suggestions[user_body_type]
            for suggestion in base_suggestions:
                if body_tips:
                    suggestion.pairing_tips = body_tips[0] if body_tips else suggestion.pairing_tips

        return base_suggestions

    def map_style_to_embedding_prompts(self, style_analysis: StyleAnalysis) -> List[str]:
        prompts = []
        
        for item in style_analysis.key_items:
            for color in style_analysis.color_palette[:3]:
                prompts.append(f"a photo of {color} {item}")
        
        for style in style_analysis.similar_styles[:3]:
            prompts.append(f"a photo of {style} style clothing")
        
        for element in style_analysis.core_elements[:3]:
            prompts.append(f"fashion with {element} vibe")
        
        return prompts[:20]

    def get_style_vector_weights(self, style_analysis: StyleAnalysis) -> Dict[str, float]:
        style_weights = {}
        
        for style in style_analysis.similar_styles:
            style_weights[style] = 0.3
        
        for element in style_analysis.core_elements:
            style_weights[element] = 0.2
        
        for item in style_analysis.key_items[:3]:
            style_weights[item] = 0.15
        
        total = sum(style_weights.values())
        if total > 0:
            style_weights = {k: v / total for k, v in style_weights.items()}
        
        return style_weights


class StyleUnderstandingAPI:
    def __init__(self, service: Optional[StyleUnderstandingService] = None):
        self.service = service or StyleUnderstandingService()

    async def analyze(self, user_input: str, user_profile: Optional[Dict] = None) -> Dict:
        analysis = await self.service.analyze_style_description(user_input, user_profile)
        return asdict(analysis)

    async def get_suggestions(
        self,
        user_input: str,
        body_type: Optional[str] = None,
        occasion: Optional[str] = None
    ) -> Dict:
        analysis = await self.service.analyze_style_description(user_input)
        suggestions = await self.service.generate_outfit_suggestions(
            analysis, body_type, occasion
        )
        
        return {
            "style_analysis": asdict(analysis),
            "outfit_suggestions": [asdict(s) for s in suggestions],
            "embedding_prompts": self.service.map_style_to_embedding_prompts(analysis),
            "style_weights": self.service.get_style_vector_weights(analysis)
        }

    def quick_match_style(self, user_input: str) -> Tuple[str, float]:
        for style_name, data in self.service.style_knowledge_base.items():
            for keyword in data["keywords"]:
                if keyword in user_input:
                    return style_name, 0.9
        return "休闲风", 0.5


if __name__ == "__main__":
    import asyncio

    async def test():
        service = StyleUnderstandingService(use_mock=True)
        
        test_inputs = [
            "我想要小红书同款的穿搭",
            "法式慵懒风怎么穿",
            "韩系甜美风格推荐",
            "街头潮流风格"
        ]
        
        for user_input in test_inputs:
            print(f"\n{'='*50}")
            print(f"用户输入: {user_input}")
            print("-" * 50)
            
            analysis = await service.analyze_style_description(user_input)
            
            print(f"风格: {analysis.style_name}")
            print(f"置信度: {analysis.confidence}")
            print(f"核心元素: {analysis.core_elements}")
            print(f"关键单品: {analysis.key_items}")
            print(f"颜色方案: {analysis.color_palette}")
            print(f"适合场合: {analysis.occasions}")
            print(f"明星参考: {analysis.celebrity_references}")
            print(f"品牌参考: {analysis.brand_references}")
            print(f"价格区间: {analysis.price_range}")

    asyncio.run(test())
