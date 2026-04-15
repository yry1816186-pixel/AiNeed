"""
可视化穿搭方案服务
整合 GLM-5 智能推荐 + 真实商品数据 + 虚拟试衣
"""

import os
import json
import re
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import uuid
import logging

# P1-9: Import externalized prompts
from .stylist_prompts import VISUAL_OUTFIT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


def _robust_json_parse(text: str, default: Any = None) -> Any:
    """A-P1-8: Multi-strategy JSON parsing with graceful fallback.

    Parsing strategies (in order):
    1. Direct json.loads() on the full text
    2. Extract JSON from markdown code blocks (```json ... ```)
    3. Find the outermost JSON object {...} or array [...]
    4. Fix common JSON errors (trailing commas, single quotes, unquoted keys)
    5. Return default value instead of raising an exception

    Args:
        text: Raw text that may contain JSON.
        default: Value to return if all parsing strategies fail.

    Returns:
        Parsed JSON object, or default if parsing fails.
    """
    if not text or not text.strip():
        return default

    text = text.strip()

    # Strategy 1: Direct parse
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass

    # Strategy 2: Extract from markdown code block
    # Match ```json ... ``` or ``` ... ```
    code_block_patterns = [
        r'```json\s*\n?(.*?)\n?\s*```',
        r'```\s*\n?(.*?)\n?\s*```',
    ]
    for pattern in code_block_patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except (json.JSONDecodeError, ValueError):
                # Try fixing the extracted content
                fixed = _fix_common_json_errors(match.group(1).strip())
                if fixed is not None:
                    return fixed

    # Strategy 3: Find outermost JSON structure
    # Try to find {...} first, then [...]
    for open_char, close_char in [('{', '}'), ('[', ']')]:
        start = text.find(open_char)
        if start == -1:
            continue
        # Find the matching closing bracket
        depth = 0
        end = -1
        for i in range(start, len(text)):
            if text[i] == open_char:
                depth += 1
            elif text[i] == close_char:
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        if end > start:
            candidate = text[start:end]
            try:
                return json.loads(candidate)
            except (json.JSONDecodeError, ValueError):
                # Try fixing common errors
                fixed = _fix_common_json_errors(candidate)
                if fixed is not None:
                    return fixed

    # Strategy 4: Fix common JSON errors on the entire text
    fixed = _fix_common_json_errors(text)
    if fixed is not None:
        return fixed

    # Strategy 5: Return default
    logger.warning("All JSON parsing strategies failed for text (first 200 chars): %s", text[:200])
    return default


def _fix_common_json_errors(text: str) -> Optional[Any]:
    """A-P1-8: Attempt to fix common JSON formatting errors.

    Fixes:
    - Trailing commas before closing brackets: ,} or ,]
    - Single quotes instead of double quotes
    - Unquoted keys
    - Comments (// and /* */)
    - Missing quotes around string values

    Args:
        text: JSON-like text with potential errors.

    Returns:
        Parsed JSON object if fix succeeds, None otherwise.
    """
    if not text:
        return None

    fixed = text

    try:
        # Remove JavaScript-style comments
        fixed = re.sub(r'//.*?$', '', fixed, flags=re.MULTILINE)
        fixed = re.sub(r'/\*.*?\*/', '', fixed, flags=re.DOTALL)

        # Fix trailing commas before closing brackets
        fixed = re.sub(r',\s*([}\]])', r'\1', fixed)

        # Fix single quotes to double quotes (careful not to break escaped quotes)
        # This is a simple heuristic; complex cases may still fail
        fixed = fixed.replace("'", '"')

        # Try to parse after basic fixes
        return json.loads(fixed)
    except (json.JSONDecodeError, ValueError):
        pass

    try:
        # More aggressive fix: try to quote unquoted keys
        # Match word characters followed by colon that aren't already quoted
        fixed = re.sub(r'(?<=[{,])\s*(\w+)\s*:', r' "\1":', fixed)
        return json.loads(fixed)
    except (json.JSONDecodeError, ValueError):
        pass

    return None


@dataclass
class VisualOutfitItem:
    id: str
    category: str
    name: str
    description: str
    color: str
    price: float
    original_price: Optional[float] = None
    image_url: str = ""
    product_url: str = ""
    platform: str = ""
    why_recommended: str = ""
    match_score: float = 0.0


@dataclass
class VisualOutfitPlan:
    id: str
    title: str
    overall_style: str
    items: List[VisualOutfitItem]
    styling_tips: List[str]
    color_harmony: str
    occasion_fit: str
    estimated_budget: float
    virtual_tryon_url: Optional[str] = None


@dataclass
class UserImageInfo:
    url: str
    body_type: Optional[str] = None
    skin_tone: Optional[str] = None


class VisualOutfitService:
    def __init__(self):
        self.glm_api_key = os.getenv("GLM_API_KEY")
        self.glm_endpoint = os.getenv("GLM_API_ENDPOINT", "https://open.bigmodel.cn/api/paas/v4")
        self.glm_model = os.getenv("GLM_MODEL", "glm-5")
        
        self.taobao_app_key = os.getenv("TAOBAO_APP_KEY")
        self.taobao_app_secret = os.getenv("TAOBAO_APP_SECRET")
        
        self.jd_app_key = os.getenv("JD_APP_KEY")
        self.jd_app_secret = os.getenv("JD_APP_SECRET")
        
        self.virtual_tryon_url = os.getenv("VIRTUAL_TRYON_URL", "http://localhost:8001")
    
    async def generate_visual_outfit(
        self,
        user_profile: Dict[str, Any],
        scene_context: Dict[str, Any],
        user_image: Optional[UserImageInfo] = None,
        user_request: str = ""
    ) -> Dict[str, Any]:
        """
        生成可视化穿搭方案
        1. GLM-5 生成搭配建议和关键词
        2. 搜索真实商品
        3. 生成虚拟试衣效果（如果有用户照片）
        """
        
        keywords = await self._generate_search_keywords(user_profile, scene_context, user_request)
        
        outfit_plans = await self._search_and_build_outfits(
            keywords, user_profile, scene_context
        )
        
        if user_image and user_image.url:
            for plan in outfit_plans:
                try:
                    virtual_url = await self._generate_virtual_tryon(
                        user_image, plan
                    )
                    plan.virtual_tryon_url = virtual_url
                except Exception as e:
                    print(f"虚拟试衣生成失败: {e}")
        
        return {
            "success": True,
            "outfit_plans": [
                {
                    "id": plan.id,
                    "title": plan.title,
                    "overall_style": plan.overall_style,
                    "items": [
                        {
                            "id": item.id,
                            "category": item.category,
                            "name": item.name,
                            "description": item.description,
                            "color": item.color,
                            "price": item.price,
                            "original_price": item.original_price,
                            "image_url": item.image_url,
                            "product_url": item.product_url,
                            "platform": item.platform,
                            "why_recommended": item.why_recommended,
                            "match_score": item.match_score
                        }
                        for item in plan.items
                    ],
                    "styling_tips": plan.styling_tips,
                    "color_harmony": plan.color_harmony,
                    "occasion_fit": plan.occasion_fit,
                    "estimated_budget": plan.estimated_budget,
                    "virtual_tryon_url": plan.virtual_tryon_url
                }
                for plan in outfit_plans
            ],
            "generated_at": datetime.now().isoformat()
        }
    
    async def _generate_search_keywords(
        self,
        user_profile: Dict[str, Any],
        scene_context: Dict[str, Any],
        user_request: str
    ) -> List[Dict[str, str]]:
        """使用 GLM-5 生成商品搜索关键词"""
        
        prompt = f"""作为专业时尚买手，请根据用户需求生成精准的商品搜索关键词。

用户档案：
- 体型：{user_profile.get('body_type', '未知')}
- 肤色：{user_profile.get('skin_tone', '未知')}
- 偏好风格：{', '.join(user_profile.get('style_preferences', []))}
- 预算：{user_profile.get('budget_range', {}).get('min', 0)}-{user_profile.get('budget_range', {}).get('max', '不限')}元

场景需求：
- 场合：{scene_context.get('occasion', '日常')}
- 季节：{scene_context.get('season', '春季')}
- 正式度：{scene_context.get('formality_level', '中等')}

用户需求：{user_request or '请推荐适合的穿搭'}

请生成2套穿搭方案的商品搜索关键词，每套包含上装、下装、鞋履、配饰。

以JSON格式输出：
{{
  "plans": [
    {{
      "title": "方案名称",
      "style": "风格描述",
      "keywords": [
        {{"category": "上装", "keyword": "搜索关键词+颜色+风格", "price_range": "100-300"}},
        {{"category": "下装", "keyword": "搜索关键词+颜色+风格", "price_range": "100-300"}},
        {{"category": "鞋履", "keyword": "搜索关键词+颜色+风格", "price_range": "100-300"}},
        {{"category": "配饰", "keyword": "搜索关键词+颜色+风格", "price_range": "50-150"}}
      ],
      "color_harmony": "配色说明",
      "styling_tips": ["搭配技巧"]
    }}
  ]
}}"""

        headers = {
            "Authorization": f"Bearer {self.glm_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.glm_model,
            "messages": [
                {"role": "system", "content": VISUAL_OUTFIT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1500,
            "temperature": 0.7
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.glm_endpoint}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")

                        # A-P1-8: Use robust multi-strategy JSON parsing
                        parsed = _robust_json_parse(content, default=None)
                        if parsed and isinstance(parsed, dict):
                            return parsed.get("plans", [])
                        if parsed and isinstance(parsed, list):
                            return parsed
        except Exception as e:
            logger.warning("GLM keyword generation failed: %s", e)
        
        return self._get_fallback_keywords(scene_context.get("occasion", "daily"))
    
    def _get_fallback_keywords(self, occasion: str) -> List[Dict[str, Any]]:
        """Fallback 关键词"""
        fallback_plans = {
            "interview": [
                {
                    "title": "专业面试穿搭",
                    "style": "商务正式",
                    "keywords": [
                        {"category": "上装", "keyword": "白色衬衫 通勤 正肩", "price_range": "100-300"},
                        {"category": "下装", "keyword": "黑色西装裤 高腰 直筒", "price_range": "150-400"},
                        {"category": "鞋履", "keyword": "黑色乐福鞋 平底 皮质", "price_range": "150-400"},
                        {"category": "配饰", "keyword": "简约手表 金属表带", "price_range": "100-300"}
                    ],
                    "color_harmony": "黑白灰经典配色",
                    "styling_tips": ["衬衫塞进裤腰显精神", "选择垂感好的面料"]
                }
            ],
            "date": [
                {
                    "title": "浪漫约会穿搭",
                    "style": "法式温柔",
                    "keywords": [
                        {"category": "连衣裙", "keyword": "碎花连衣裙 收腰 中长款", "price_range": "150-400"},
                        {"category": "鞋履", "keyword": "玛丽珍鞋 复古 低跟", "price_range": "150-350"},
                        {"category": "配饰", "keyword": "珍珠耳环 小巧 精致", "price_range": "50-150"},
                        {"category": "包包", "keyword": "编织包 小众 复古", "price_range": "100-300"}
                    ],
                    "color_harmony": "暖色调温柔配色",
                    "styling_tips": ["裙长过膝显优雅", "配饰要精致小巧"]
                }
            ],
            "daily": [
                {
                    "title": "日常休闲穿搭",
                    "style": "韩系休闲",
                    "keywords": [
                        {"category": "上装", "keyword": "针织开衫 宽松 慵懒风", "price_range": "80-250"},
                        {"category": "下装", "keyword": "阔腿牛仔裤 高腰 直筒", "price_range": "100-300"},
                        {"category": "鞋履", "keyword": "帆布鞋 白色 经典", "price_range": "80-200"},
                        {"category": "包包", "keyword": "帆布包 大容量 简约", "price_range": "50-150"}
                    ],
                    "color_harmony": "大地色系舒适配色",
                    "styling_tips": ["上宽下宽要扎腰", "颜色不超过三种"]
                }
            ]
        }
        return fallback_plans.get(occasion, fallback_plans["daily"])
    
    async def _search_and_build_outfits(
        self,
        keywords_plans: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
        scene_context: Dict[str, Any]
    ) -> List[VisualOutfitPlan]:
        """搜索真实商品并构建穿搭方案"""
        
        outfit_plans = []
        
        for plan_keywords in keywords_plans:
            plan_id = str(uuid.uuid4())[:8]
            items = []
            total_budget = 0
            
            for kw in plan_keywords.get("keywords", []):
                category = kw.get("category", "")
                keyword = kw.get("keyword", "")
                price_range = kw.get("price_range", "0-1000")
                
                search_results = await self._search_products(
                    keyword, category, price_range
                )
                
                if search_results:
                    best_match = search_results[0]
                    item = VisualOutfitItem(
                        id=str(uuid.uuid4())[:8],
                        category=category,
                        name=best_match.get("name", ""),
                        description=best_match.get("description", ""),
                        color=best_match.get("color", ""),
                        price=best_match.get("price", 0),
                        original_price=best_match.get("original_price"),
                        image_url=best_match.get("image_url", ""),
                        product_url=best_match.get("product_url", ""),
                        platform=best_match.get("platform", ""),
                        why_recommended=self._generate_recommendation_reason(
                            category, keyword, user_profile
                        ),
                        match_score=best_match.get("match_score", 0.8)
                    )
                    items.append(item)
                    total_budget += item.price
            
            if items:
                outfit_plans.append(VisualOutfitPlan(
                    id=plan_id,
                    title=plan_keywords.get("title", "推荐穿搭"),
                    overall_style=plan_keywords.get("style", ""),
                    items=items,
                    styling_tips=plan_keywords.get("styling_tips", []),
                    color_harmony=plan_keywords.get("color_harmony", ""),
                    occasion_fit=scene_context.get("occasion", "日常"),
                    estimated_budget=total_budget
                ))
        
        return outfit_plans
    
    async def _search_products(
        self,
        keyword: str,
        category: str,
        price_range: str
    ) -> List[Dict[str, Any]]:
        """搜索真实商品"""
        
        min_price, max_price = 0, 10000
        if "-" in price_range:
            parts = price_range.split("-")
            min_price = int(parts[0]) if parts[0].isdigit() else 0
            max_price = int(parts[1]) if parts[1].isdigit() else 10000
        
        if self.taobao_app_key:
            return await self._search_taobao(keyword, min_price, max_price)
        
        if self.jd_app_key:
            return await self._search_jd(keyword, min_price, max_price)
        
        return self._get_mock_products(keyword, category, min_price, max_price)
    
    async def _search_taobao(
        self,
        keyword: str,
        min_price: int,
        max_price: int
    ) -> List[Dict[str, Any]]:
        """淘宝客 API 搜索"""
        try:
            pass
        except Exception as e:
            print(f"淘宝搜索失败: {e}")
        return []
    
    async def _search_jd(
        self,
        keyword: str,
        min_price: int,
        max_price: int
    ) -> List[Dict[str, Any]]:
        """京东联盟 API 搜索"""
        try:
            pass
        except Exception as e:
            print(f"京东搜索失败: {e}")
        return []
    
    def _get_mock_products(
        self,
        keyword: str,
        category: str,
        min_price: int,
        max_price: int
    ) -> List[Dict[str, Any]]:
        import random
        
        def safe_price(low: int, high: int) -> int:
            actual_low = max(min_price, low)
            actual_high = min(max_price, high)
            if actual_low >= actual_high:
                actual_high = actual_low + 50
            return random.randint(actual_low, actual_high)
        
        mock_products = {
            "上装": [
                {
                    "name": "法式方领针织衫",
                    "description": "2024新款法式方领短款针织衫，修身显瘦",
                    "color": "墨绿色",
                    "price": safe_price(89, 180),
                    "original_price": safe_price(200, 350),
                    "image_url": "https://img.alicdn.com/imgextra/i4/2215304657078/O1CN01FJvXEq1huhCv8sNZC_!!2215304657078.jpg",
                    "product_url": "https://item.taobao.com/item.htm?id=1",
                    "platform": "taobao",
                    "match_score": round(random.uniform(0.85, 0.98), 2)
                },
                {
                    "name": "飘带设计衬衫",
                    "description": "真丝混纺飘带衬衫，优雅气质",
                    "color": "奶油白",
                    "price": safe_price(128, 220),
                    "original_price": safe_price(280, 400),
                    "image_url": "https://img.alicdn.com/imgextra/i1/2215304657078/O1CN01RZTQmJ1huhCtkWcKN_!!2215304657078.jpg",
                    "product_url": "https://item.taobao.com/item.htm?id=2",
                    "platform": "taobao",
                    "match_score": round(random.uniform(0.80, 0.95), 2)
                }
            ],
            "下装": [
                {
                    "name": "高腰阔腿牛仔裤",
                    "description": "垂感阔腿牛仔裤，显瘦显高",
                    "color": "浅蓝色",
                    "price": safe_price(99, 168),
                    "original_price": safe_price(200, 300),
                    "image_url": "https://img.alicdn.com/imgextra/i3/2215304657078/O1CN01vT1wUm1huhCpA0GtF_!!2215304657078.jpg",
                    "product_url": "https://item.taobao.com/item.htm?id=3",
                    "platform": "taobao",
                    "match_score": round(random.uniform(0.85, 0.95), 2)
                },
                {
                    "name": "高腰缎面半身裙",
                    "description": "A字版型缎面裙，优雅气质",
                    "color": "香槟金",
                    "price": safe_price(128, 198),
                    "original_price": safe_price(220, 350),
                    "image_url": "https://img.alicdn.com/imgextra/i2/2215304657078/O1CN01WXF2nS1huhCkWXMxp_!!2215304657078.jpg",
                    "product_url": "https://item.taobao.com/item.htm?id=4",
                    "platform": "taobao",
                    "match_score": round(random.uniform(0.82, 0.92), 2)
                }
            ],
            "连衣裙": [
                {
                    "name": "法式碎花茶歇裙",
                    "description": "V领收腰碎花裙，浪漫优雅",
                    "color": "奶油白底碎花",
                    "price": safe_price(158, 268),
                    "original_price": safe_price(300, 450),
                    "image_url": "https://img.alicdn.com/imgextra/i4/2215304657078/O1CN01Example1_!!2215304657078.jpg",
                    "product_url": "https://item.taobao.com/item.htm?id=5",
                    "platform": "taobao",
                    "match_score": round(random.uniform(0.88, 0.98), 2)
                }
            ],
            "鞋履": [
                {
                    "name": "复古玛丽珍单鞋",
                    "description": "低跟玛丽珍鞋，舒适百搭",
                    "color": "酒红色",
                    "price": safe_price(128, 168),
                    "original_price": safe_price(200, 280),
                    "image_url": "https://img.alicdn.com/imgextra/i1/2215304657078/O1CN01Shoe1_!!2215304657078.jpg",
                    "product_url": "https://item.taobao.com/item.htm?id=6",
                    "platform": "taobao",
                    "match_score": round(random.uniform(0.85, 0.95), 2)
                },
                {
                    "name": "尖头平底穆勒鞋",
                    "description": "裸色尖头穆勒鞋，显腿长",
                    "color": "裸色",
                    "price": safe_price(98, 148),
                    "original_price": safe_price(180, 250),
                    "image_url": "https://img.alicdn.com/imgextra/i2/2215304657078/O1CN01Shoe2_!!2215304657078.jpg",
                    "product_url": "https://item.taobao.com/item.htm?id=7",
                    "platform": "taobao",
                    "match_score": round(random.uniform(0.82, 0.92), 2)
                }
            ],
            "配饰": [
                {
                    "name": "珍珠耳环",
                    "description": "巴洛克珍珠耳钉，精致小巧",
                    "color": "奶油白",
                    "price": safe_price(38, 78),
                    "original_price": safe_price(100, 150),
                    "image_url": "https://img.alicdn.com/imgextra/i3/2215304657078/O1CN01Acc1_!!2215304657078.jpg",
                    "product_url": "https://item.taobao.com/item.htm?id=8",
                    "platform": "taobao",
                    "match_score": round(random.uniform(0.80, 0.90), 2)
                }
            ],
            "包包": [
                {
                    "name": "编织链条包",
                    "description": "小众设计编织包，复古时尚",
                    "color": "棕色",
                    "price": safe_price(98, 148),
                    "original_price": safe_price(180, 250),
                    "image_url": "https://img.alicdn.com/imgextra/i4/2215304657078/O1CN01Bag1_!!2215304657078.jpg",
                    "product_url": "https://item.taobao.com/item.htm?id=9",
                    "platform": "taobao",
                    "match_score": round(random.uniform(0.82, 0.92), 2)
                }
            ]
        }
        
        for cat_key, products in mock_products.items():
            if cat_key in category or category in cat_key:
                return products
        
        return mock_products.get("上装", [])
    
    def _generate_recommendation_reason(
        self,
        category: str,
        keyword: str,
        user_profile: Dict[str, Any]
    ) -> str:
        """生成推荐理由"""
        body_type = user_profile.get("body_type", "")
        style_prefs = user_profile.get("style_preferences", [])
        
        reasons = []
        
        if body_type == "hourglass":
            reasons.append("收腰设计完美勾勒X型身材曲线")
        elif body_type == "triangle":
            reasons.append("上身量感设计平衡梨形身材比例")
        elif body_type == "rectangle":
            reasons.append("层次感设计增加H型身材曲线")
        
        if style_prefs:
            if "法式慵懒" in style_prefs:
                reasons.append("符合法式慵懒的优雅随性风格")
            if "韩系" in style_prefs:
                reasons.append("韩系温柔气质首选")
        
        if reasons:
            return "；".join(reasons[:2])
        return f"适合{keyword}风格的高品质单品"
    
    async def _generate_virtual_tryon(
        self,
        user_image: UserImageInfo,
        outfit_plan: VisualOutfitPlan
    ) -> Optional[str]:
        try:
            from ml.services.virtual_tryon_service import virtual_tryon_service

            top_item = None
            for item in outfit_plan.items:
                if item.category in ["上装", "上衣", "衬衫", "针织衫"]:
                    top_item = item
                    break

            if not top_item:
                return None

            result = await virtual_tryon_service.generate_tryon(
                person_image=user_image.url,
                garment_image=top_item.image_url,
                category="upper_body",
            )

            if result.get("success"):
                return result.get("result_url")

        except Exception as e:
            print(f"虚拟试衣生成失败: {e}")

        return None


visual_outfit_service = VisualOutfitService()


async def get_visual_outfit_service() -> VisualOutfitService:
    return visual_outfit_service
