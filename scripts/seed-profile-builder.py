#!/usr/bin/env python3
"""
Seed Profile Builder — 10 个精心构造的演示用用户 profile

为比赛演示构建高质量 seed profile，覆盖不同体型/风格/场景/预算组合。
每个 profile 包含完整的 onboarding + 衣橱 + 偏好 + 行为事件。

用法:
    python scripts/seed-profile-builder.py
    python scripts/seed-profile-builder.py --output docs/PRESENTATION/seed-user-data-v2.json
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List

# ──────────────────────────────────────────────────────────────────────
# Profile 设计矩阵 — 覆盖所有演示场景和体型/风格组合
# ──────────────────────────────────────────────────────────────────────

PROFILE_MATRIX: List[Dict[str, Any]] = [
    {
        "nickname": "面试达人",
        "bodyType": "rectangle",
        "styleExpression": "minimalist",
        "primaryScenarios": ["interview"],
        "ageBand": "22-25",
        "budget": 3000,
        "gender": "male",
        "highlight": "面试场景主角 — 演示核心",
    },
    {
        "nickname": "文艺女孩",
        "bodyType": "hourglass",
        "styleExpression": "vintage",
        "primaryScenarios": ["date", "party"],
        "ageBand": "22-25",
        "budget": 2000,
        "gender": "female",
        "highlight": "约会场景 — 复古风格展示",
    },
    {
        "nickname": "街头潮人",
        "bodyType": "slim",
        "styleExpression": "streetwear",
        "primaryScenarios": ["daily", "party"],
        "ageBand": "18-21",
        "budget": 5000,
        "gender": "male",
        "highlight": "潮流风格 — 高预算展示",
    },
    {
        "nickname": "职场精英",
        "bodyType": "athletic",
        "styleExpression": "professional",
        "primaryScenarios": ["commute", "interview"],
        "ageBand": "26-30",
        "budget": 8000,
        "gender": "female",
        "highlight": "高预算职场 — 面试+通勤双场景",
    },
    {
        "nickname": "运动达人",
        "bodyType": "muscular",
        "styleExpression": "sporty",
        "primaryScenarios": ["daily", "travel"],
        "ageBand": "26-30",
        "budget": 1500,
        "gender": "male",
        "highlight": "运动休闲 — 低预算场景",
    },
    {
        "nickname": "温柔淑女",
        "bodyType": "pear",
        "styleExpression": "romantic",
        "primaryScenarios": ["date", "party"],
        "ageBand": "22-25",
        "budget": 3000,
        "gender": "female",
        "highlight": "甜美约会 — 日常推荐场景",
    },
    {
        "nickname": "极简主义",
        "bodyType": "invertedTriangle",
        "styleExpression": "minimalist",
        "primaryScenarios": ["daily", "commute"],
        "ageBand": "31-35",
        "budget": 4000,
        "gender": "male",
        "highlight": "日常通勤极简 — 成熟风格",
    },
    {
        "nickname": "国潮少年",
        "bodyType": "slim",
        "styleExpression": "avant-garde",
        "primaryScenarios": ["party", "date"],
        "ageBand": "18-21",
        "budget": 2000,
        "gender": "male",
        "highlight": "前卫风格 — 国潮风格展示",
    },
    {
        "nickname": "知性女性",
        "bodyType": "hourglass",
        "styleExpression": "classic",
        "primaryScenarios": ["interview", "commute"],
        "ageBand": "26-30",
        "budget": 6000,
        "gender": "female",
        "highlight": "面试+通勤 — 经典知性风",
    },
    {
        "nickname": "阳光学生",
        "bodyType": "rectangle",
        "styleExpression": "casual",
        "primaryScenarios": ["daily", "date"],
        "ageBand": "18-21",
        "budget": 800,
        "gender": "female",
        "highlight": "低预算学生 — 日常约会场景",
    },
]


# ──────────────────────────────────────────────────────────────────────
# 衣橱模板 — 按风格分类的精选衣物
# ──────────────────────────────────────────────────────────────────────

WARDROBE_TEMPLATES: Dict[str, Dict[str, List[Dict[str, str]]]] = {
    "minimalist": {
        "tops": [
            {"name": "白色纯棉T恤", "category": "top", "color": "white", "material": "cotton", "season": "all"},
            {"name": "灰色高领毛衣", "category": "top", "color": "gray", "material": "wool", "season": "winter"},
            {"name": "黑色修身衬衫", "category": "top", "color": "black", "material": "cotton", "season": "all"},
            {"name": "驼色针织衫", "category": "top", "color": "camel", "material": "cashmere", "season": "autumn"},
        ],
        "bottoms": [
            {"name": "黑色直筒西裤", "category": "bottom", "color": "black", "material": "polyester", "season": "all"},
            {"name": "深蓝色牛仔裤", "category": "bottom", "color": "navy", "material": "denim", "season": "all"},
            {"name": "灰色休闲裤", "category": "bottom", "color": "gray", "material": "cotton", "season": "all"},
        ],
        "outerwear": [
            {"name": "黑色西装外套", "category": "jacket", "color": "black", "material": "wool", "season": "all"},
            {"name": "驼色大衣", "category": "jacket", "color": "camel", "material": "wool", "season": "winter"},
        ],
        "shoes": [
            {"name": "黑色牛津鞋", "category": "shoes", "color": "black", "material": "leather", "season": "all"},
            {"name": "白色板鞋", "category": "shoes", "color": "white", "material": "leather", "season": "all"},
        ],
        "accessories": [
            {"name": "银色简约手表", "category": "accessory", "color": "silver", "material": "metal", "season": "all"},
            {"name": "黑色皮带", "category": "accessory", "color": "black", "material": "leather", "season": "all"},
        ],
    },
    "vintage": {
        "tops": [
            {"name": "碎花雪纺衬衫", "category": "top", "color": "pink", "material": "chiffon", "season": "spring"},
            {"name": "酒红色丝绒吊带", "category": "top", "color": "burgundy", "material": "velvet", "season": "autumn"},
            {"name": "米白色蕾丝上衣", "category": "top", "color": "cream", "material": "lace", "season": "all"},
            {"name": "墨绿色复古针织", "category": "top", "color": "green", "material": "wool", "season": "winter"},
        ],
        "bottoms": [
            {"name": "高腰A字半裙", "category": "skirt", "color": "brown", "material": "wool", "season": "autumn"},
            {"name": "复古喇叭裤", "category": "bottom", "color": "denim", "material": "denim", "season": "all"},
            {"name": "格纹百褶裙", "category": "skirt", "color": "burgundy", "material": "wool", "season": "winter"},
        ],
        "outerwear": [
            {"name": "焦糖色风衣", "category": "jacket", "color": "camel", "material": "cotton", "season": "autumn"},
            {"name": "酒红色短外套", "category": "jacket", "color": "burgundy", "material": "wool", "season": "winter"},
        ],
        "shoes": [
            {"name": "棕色玛丽珍鞋", "category": "shoes", "color": "brown", "material": "leather", "season": "all"},
            {"name": "米色乐福鞋", "category": "shoes", "color": "cream", "material": "leather", "season": "all"},
        ],
        "accessories": [
            {"name": "珍珠耳环", "category": "accessory", "color": "white", "material": "pearl", "season": "all"},
            {"name": "棕色手提包", "category": "accessory", "color": "brown", "material": "leather", "season": "all"},
        ],
    },
    "streetwear": {
        "tops": [
            {"name": "Oversize印花卫衣", "category": "top", "color": "black", "material": "cotton", "season": "all"},
            {"name": "白色短袖T恤", "category": "top", "color": "white", "material": "cotton", "season": "summer"},
            {"name": "迷彩夹克", "category": "top", "color": "green", "material": "nylon", "season": "all"},
            {"name": "黑色连帽衫", "category": "top", "color": "black", "material": "cotton", "season": "all"},
        ],
        "bottoms": [
            {"name": "破洞宽松牛仔裤", "category": "bottom", "color": "blue", "material": "denim", "season": "all"},
            {"name": "黑色束脚裤", "category": "bottom", "color": "black", "material": "cotton", "season": "all"},
            {"name": "军绿色工装裤", "category": "bottom", "color": "green", "material": "cotton", "season": "all"},
        ],
        "outerwear": [
            {"name": "飞行员夹克", "category": "jacket", "color": "black", "material": "nylon", "season": "autumn"},
            {"name": "黑色机能外套", "category": "jacket", "color": "black", "material": "polyester", "season": "winter"},
        ],
        "shoes": [
            {"name": "白色高帮板鞋", "category": "shoes", "color": "white", "material": "leather", "season": "all"},
            {"name": "黑色跑鞋", "category": "shoes", "color": "black", "material": "mesh", "season": "all"},
        ],
        "accessories": [
            {"name": "黑色棒球帽", "category": "accessory", "color": "black", "material": "cotton", "season": "all"},
            {"name": "银色链条项链", "category": "accessory", "color": "silver", "material": "metal", "season": "all"},
        ],
    },
    "professional": {
        "tops": [
            {"name": "白色真丝衬衫", "category": "top", "color": "white", "material": "silk", "season": "all"},
            {"name": "浅蓝色商务衬衫", "category": "top", "color": "blue", "material": "cotton", "season": "all"},
            {"name": "黑色高领打底", "category": "top", "color": "black", "material": "cashmere", "season": "winter"},
            {"name": "米色针织开衫", "category": "top", "color": "cream", "material": "cashmere", "season": "autumn"},
        ],
        "bottoms": [
            {"name": "黑色修身西裤", "category": "bottom", "color": "black", "material": "wool", "season": "all"},
            {"name": "灰色铅笔裙", "category": "skirt", "color": "gray", "material": "wool", "season": "all"},
            {"name": "藏蓝色直筒裤", "category": "bottom", "color": "navy", "material": "wool", "season": "all"},
        ],
        "outerwear": [
            {"name": "藏蓝色西装外套", "category": "jacket", "color": "navy", "material": "wool", "season": "all"},
            {"name": "驼色羊绒大衣", "category": "jacket", "color": "camel", "material": "cashmere", "season": "winter"},
        ],
        "shoes": [
            {"name": "黑色尖头高跟鞋", "category": "shoes", "color": "black", "material": "leather", "season": "all"},
            {"name": "裸色平底鞋", "category": "shoes", "color": "nude", "material": "leather", "season": "all"},
        ],
        "accessories": [
            {"name": "简约金属手表", "category": "accessory", "color": "gold", "material": "metal", "season": "all"},
            {"name": "黑色托特包", "category": "accessory", "color": "black", "material": "leather", "season": "all"},
        ],
    },
    "sporty": {
        "tops": [
            {"name": "速干运动T恤", "category": "top", "color": "black", "material": "polyester", "season": "all"},
            {"name": "灰色运动背心", "category": "top", "color": "gray", "material": "cotton", "season": "summer"},
            {"name": "拉链运动外套", "category": "top", "color": "navy", "material": "polyester", "season": "spring"},
            {"name": "长袖压缩衣", "category": "top", "color": "black", "material": "spandex", "season": "winter"},
        ],
        "bottoms": [
            {"name": "黑色运动短裤", "category": "bottom", "color": "black", "material": "polyester", "season": "summer"},
            {"name": "深灰色运动长裤", "category": "bottom", "color": "gray", "material": "polyester", "season": "all"},
            {"name": "军绿工装短裤", "category": "bottom", "color": "green", "material": "cotton", "season": "summer"},
        ],
        "outerwear": [
            {"name": "防风冲锋衣", "category": "jacket", "color": "black", "material": "nylon", "season": "spring"},
            {"name": "抓绒马甲", "category": "jacket", "color": "gray", "material": "fleece", "season": "autumn"},
        ],
        "shoes": [
            {"name": "黑色跑步鞋", "category": "shoes", "color": "black", "material": "mesh", "season": "all"},
            {"name": "白色训练鞋", "category": "shoes", "color": "white", "material": "mesh", "season": "all"},
        ],
        "accessories": [
            {"name": "运动手表", "category": "accessory", "color": "black", "material": "silicone", "season": "all"},
            {"name": "黑色运动腰包", "category": "accessory", "color": "black", "material": "nylon", "season": "all"},
        ],
    },
    "romantic": {
        "tops": [
            {"name": "粉色蝴蝶结衬衫", "category": "top", "color": "pink", "material": "chiffon", "season": "spring"},
            {"name": "白色蕾丝上衣", "category": "top", "color": "white", "material": "lace", "season": "all"},
            {"name": "薰衣草色针织衫", "category": "top", "color": "purple", "material": "cashmere", "season": "autumn"},
            {"name": "浅蓝色泡泡袖", "category": "top", "color": "blue", "material": "cotton", "season": "summer"},
        ],
        "bottoms": [
            {"name": "粉色百褶半裙", "category": "skirt", "color": "pink", "material": "chiffon", "season": "spring"},
            {"name": "白色阔腿裤", "category": "bottom", "color": "white", "material": "cotton", "season": "summer"},
            {"name": "米色A字裙", "category": "skirt", "color": "cream", "material": "wool", "season": "autumn"},
        ],
        "outerwear": [
            {"name": "浅粉色西装外套", "category": "jacket", "color": "pink", "material": "wool", "season": "spring"},
            {"name": "白色毛绒外套", "category": "jacket", "color": "white", "material": "faux_fur", "season": "winter"},
        ],
        "shoes": [
            {"name": "粉色尖头平底", "category": "shoes", "color": "pink", "material": "leather", "season": "all"},
            {"name": "白色绑带凉鞋", "category": "shoes", "color": "white", "material": "leather", "season": "summer"},
        ],
        "accessories": [
            {"name": "珍珠项链", "category": "accessory", "color": "white", "material": "pearl", "season": "all"},
            {"name": "粉色手提包", "category": "accessory", "color": "pink", "material": "leather", "season": "all"},
        ],
    },
    "classic": {
        "tops": [
            {"name": "白色真丝衬衫", "category": "top", "color": "white", "material": "silk", "season": "all"},
            {"name": "黑色高领羊绒衫", "category": "top", "color": "black", "material": "cashmere", "season": "winter"},
            {"name": "条纹海魂衫", "category": "top", "color": "navy", "material": "cotton", "season": "spring"},
            {"name": "米色V领针织", "category": "top", "color": "cream", "material": "wool", "season": "autumn"},
        ],
        "bottoms": [
            {"name": "黑色西装裤", "category": "bottom", "color": "black", "material": "wool", "season": "all"},
            {"name": "深蓝色直筒牛仔裤", "category": "bottom", "color": "navy", "material": "denim", "season": "all"},
            {"name": "卡其色阔腿裤", "category": "bottom", "color": "khaki", "material": "cotton", "season": "all"},
        ],
        "outerwear": [
            {"name": "藏蓝色西装外套", "category": "jacket", "color": "navy", "material": "wool", "season": "all"},
            {"name": "驼色羊绒大衣", "category": "jacket", "color": "camel", "material": "cashmere", "season": "winter"},
        ],
        "shoes": [
            {"name": "黑色乐福鞋", "category": "shoes", "color": "black", "material": "leather", "season": "all"},
            {"name": "裸色中跟鞋", "category": "shoes", "color": "nude", "material": "leather", "season": "all"},
        ],
        "accessories": [
            {"name": "金色简约手表", "category": "accessory", "color": "gold", "material": "metal", "season": "all"},
            {"name": "棕色公文包", "category": "accessory", "color": "brown", "material": "leather", "season": "all"},
        ],
    },
    "avant-garde": {
        "tops": [
            {"name": "黑色不对称剪裁上衣", "category": "top", "color": "black", "material": "cotton", "season": "all"},
            {"name": "中国红刺绣卫衣", "category": "top", "color": "red", "material": "cotton", "season": "all"},
            {"name": "白色解构衬衫", "category": "top", "color": "white", "material": "cotton", "season": "all"},
            {"name": "荧光绿字母T恤", "category": "top", "color": "green", "material": "cotton", "season": "summer"},
        ],
        "bottoms": [
            {"name": "黑色工装短裤", "category": "bottom", "color": "black", "material": "cotton", "season": "summer"},
            {"name": "迷彩拼接长裤", "category": "bottom", "color": "green", "material": "cotton", "season": "all"},
            {"name": "白色阔腿裤", "category": "bottom", "color": "white", "material": "cotton", "season": "all"},
        ],
        "outerwear": [
            {"name": "龙纹刺绣夹克", "category": "jacket", "color": "black", "material": "satin", "season": "all"},
            {"name": "机能风冲锋衣", "category": "jacket", "color": "black", "material": "nylon", "season": "autumn"},
        ],
        "shoes": [
            {"name": "黑色厚底靴", "category": "shoes", "color": "black", "material": "leather", "season": "all"},
            {"name": "白色老爹鞋", "category": "shoes", "color": "white", "material": "mesh", "season": "all"},
        ],
        "accessories": [
            {"name": "金属耳饰", "category": "accessory", "color": "gold", "material": "metal", "season": "all"},
            {"name": "黑色链条包", "category": "accessory", "color": "black", "material": "leather", "season": "all"},
        ],
    },
    "casual": {
        "tops": [
            {"name": "白色基础T恤", "category": "top", "color": "white", "material": "cotton", "season": "all"},
            {"name": "条纹长袖", "category": "top", "color": "navy", "material": "cotton", "season": "spring"},
            {"name": "牛仔衬衫", "category": "top", "color": "blue", "material": "denim", "season": "all"},
            {"name": "黄色卡通卫衣", "category": "top", "color": "yellow", "material": "cotton", "season": "autumn"},
        ],
        "bottoms": [
            {"name": "浅蓝色牛仔裤", "category": "bottom", "color": "blue", "material": "denim", "season": "all"},
            {"name": "黑色休闲短裤", "category": "bottom", "color": "black", "material": "cotton", "season": "summer"},
            {"name": "灰色运动裤", "category": "bottom", "color": "gray", "material": "cotton", "season": "all"},
        ],
        "outerwear": [
            {"name": "牛仔外套", "category": "jacket", "color": "blue", "material": "denim", "season": "spring"},
            {"name": "灰色连帽卫衣", "category": "jacket", "color": "gray", "material": "cotton", "season": "autumn"},
        ],
        "shoes": [
            {"name": "白色帆布鞋", "category": "shoes", "color": "white", "material": "canvas", "season": "all"},
            {"name": "黑色板鞋", "category": "shoes", "color": "black", "material": "leather", "season": "all"},
        ],
        "accessories": [
            {"name": "帆布背包", "category": "accessory", "color": "navy", "material": "canvas", "season": "all"},
            {"name": "简约手链", "category": "accessory", "color": "silver", "material": "metal", "season": "all"},
        ],
    },
}


# ──────────────────────────────────────────────────────────────────────
# 偏好模板 — 按风格分类的颜色/材质/品牌偏好
# ──────────────────────────────────────────────────────────────────────

PREFERENCE_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "minimalist": {
        "colors": ["black", "white", "gray", "navy", "camel"],
        "materials": ["cotton", "wool", "cashmere"],
        "brands": ["Uniqlo", "MUJI", "COS"],
    },
    "vintage": {
        "colors": ["burgundy", "brown", "cream", "forest_green", "mustard"],
        "materials": ["wool", "lace", "chiffon", "velvet"],
        "brands": ["Urban Outfitters", "ModCloth", "经典复古品牌"],
    },
    "streetwear": {
        "colors": ["black", "white", "red", "camo", "neon"],
        "materials": ["cotton", "nylon", "mesh"],
        "brands": ["Supreme", "Stussy", "Nike", "李宁"],
    },
    "professional": {
        "colors": ["black", "navy", "gray", "white", "camel"],
        "materials": ["wool", "silk", "cashmere", "leather"],
        "brands": ["Zara", "Massimo Dutti", "COS"],
    },
    "sporty": {
        "colors": ["black", "gray", "navy", "white", "red"],
        "materials": ["polyester", "spandex", "mesh", "nylon"],
        "brands": ["Nike", "Adidas", "Under Armour"],
    },
    "romantic": {
        "colors": ["pink", "white", "cream", "lavender", "light_blue"],
        "materials": ["lace", "chiffon", "silk", "cashmere"],
        "brands": ["Lulus", " Anthropologie", "Free People"],
    },
    "classic": {
        "colors": ["navy", "black", "white", "camel", "khaki"],
        "materials": ["wool", "cotton", "silk", "cashmere"],
        "brands": ["Brooks Brothers", "Ralph Lauren", "Burberry"],
    },
    "avant-garde": {
        "colors": ["black", "white", "red", "gold", "neon"],
        "materials": ["cotton", "nylon", "leather", "metal"],
        "brands": ["Alexander Wang", "Off-White", "国潮品牌"],
    },
    "casual": {
        "colors": ["blue", "white", "gray", "navy", "yellow"],
        "materials": ["cotton", "denim", "canvas"],
        "brands": ["Nike", "Adidas", "Vans", "Converse"],
    },
}


# ──────────────────────────────────────────────────────────────────────
# Onboarding 数据模板
# ──────────────────────────────────────────────────────────────────────

def build_onboarding(profile_config: Dict[str, Any]) -> Dict[str, Any]:
    """构建完整的 4 步 onboarding 数据。"""
    scenarios = profile_config["primaryScenarios"]
    style = profile_config["styleExpression"]

    return {
        "step1_scenes": scenarios,
        "step2_profile": {
            "ageBand": profile_config["ageBand"],
            "height": _random_height(profile_config["gender"]),
            "weight": _random_weight(profile_config["bodyType"], profile_config["gender"]),
            "garmentPreference": _garment_pref(style, profile_config["gender"]),
        },
        "step3_style": style,
        "step4_first_outfit": {
            "completed": True,
            "savedOutfitId": f"first_outfit_{profile_config['nickname']}",
        },
    }


def _random_height(gender: str) -> int:
    """根据性别返回合理身高。"""
    if gender == "male":
        bases = [172, 175, 178, 180, 183, 170, 176]
    else:
        bases = [158, 160, 163, 165, 168, 155, 162]
    return bases[hash(gender) % len(bases)]


def _random_weight(body_type: str, gender: str) -> int:
    """根据体型和性别返回合理体重。"""
    weight_map = {
        ("slim", "male"): 65, ("slim", "female"): 48,
        ("rectangle", "male"): 70, ("rectangle", "female"): 55,
        ("athletic", "male"): 75, ("athletic", "female"): 58,
        ("muscular", "male"): 80, ("muscular", "female"): 60,
        ("hourglass", "male"): 72, ("hourglass", "female"): 55,
        ("pear", "male"): 74, ("pear", "female"): 56,
        ("invertedTriangle", "male"): 78, ("invertedTriangle", "female"): 57,
    }
    return weight_map.get((body_type, gender), 65)


def _garment_pref(style: str, gender: str) -> str:
    """根据风格返回着装偏好。"""
    prefs = {
        "minimalist": "fitted",
        "vintage": "regular",
        "streetwear": "oversized",
        "professional": "fitted",
        "sporty": "regular",
        "romantic": "regular",
        "classic": "fitted",
        "avant-garde": "oversized",
        "casual": "regular",
    }
    return prefs.get(style, "regular")


# ──────────────────────────────────────────────────────────────────────
# 行为事件生成
# ──────────────────────────────────────────────────────────────────────

EVENT_TYPES = ["view_recommendation", "view_item", "click", "save_outfit", "share", "purchase", "try_on", "chat_with_yiyi"]
WEATHERS = ["sunny", "cloudy", "rainy", "cold", "hot"]
TIMES = ["morning", "afternoon", "evening"]
SCENARIOS = ["daily", "date", "party", "interview", "commute", "travel"]


def generate_events(nickname: str, scenarios: List[str], count: int = 8) -> List[Dict[str, Any]]:
    """为用户生成行为事件。"""
    events = []
    base_time = datetime(2026, 4, 20, tzinfo=timezone.utc)

    for i in range(count):
        event_type = EVENT_TYPES[i % len(EVENT_TYPES)]
        scenario = scenarios[i % len(scenarios)] if scenarios else "daily"
        weather = WEATHERS[i % len(WEATHERS)]
        time_of_day = TIMES[i % len(TIMES)]
        # 满意度分布在 3.5-4.8 之间
        satisfaction = round(3.5 + (i * 0.17) % 1.3, 2)
        satisfaction = min(satisfaction, 4.8)

        events.append({
            "id": f"evt_{nickname}_{i+1}",
            "type": event_type,
            "timestamp": (base_time + timedelta(days=i // 3, hours=i * 3)).isoformat(),
            "context": {
                "scenario": scenario,
                "weather": weather,
                "timeOfDay": time_of_day,
                "satisfaction": satisfaction,
            },
        })
    return events


# ──────────────────────────────────────────────────────────────────────
# Journey 生成 — 用户旅程
# ──────────────────────────────────────────────────────────────────────

def generate_journey(nickname: str, scenarios: List[str]) -> List[Dict[str, Any]]:
    """生成用户旅程（从注册到活跃）。"""
    base_time = datetime(2026, 4, 15, tzinfo=timezone.utc)
    journey_steps = [
        {"step": "register", "description": "注册账号"},
        {"step": "onboarding_complete", "description": "完成4步引导"},
        {"step": "first_chat", "description": f"第一次与伊伊聊天 — {scenarios[0] if scenarios else 'daily'}场景"},
        {"step": "first_outfit_saved", "description": "保存第一套搭配"},
        {"step": "first_try_on", "description": "首次虚拟试穿"},
    ]

    journey = []
    for i, step in enumerate(journey_steps):
        journey.append({
            "step": step["step"],
            "description": step["description"],
            "timestamp": (base_time + timedelta(days=i, hours=9 + i)).isoformat(),
        })
    return journey


# ──────────────────────────────────────────────────────────────────────
# 完整衣橱组装
# ──────────────────────────────────────────────────────────────────────

def build_wardrobe(style: str) -> List[Dict[str, Any]]:
    """根据风格构建完整衣橱 (10-15 件精选衣物)。"""
    template = WARDROBE_TEMPLATES.get(style, WARDROBE_TEMPLATES["casual"])
    wardrobe = []
    item_id = 1

    for section in ["tops", "bottoms", "outerwear", "shoes", "accessories"]:
        items = template.get(section, [])
        for item in items:
            wardrobe.append({
                "id": f"item_{style}_{item_id:03d}",
                "name": item["name"],
                "category": item["category"],
                "color": item["color"],
                "material": item["material"],
                "season": item["season"],
                "isFavorite": item_id <= 3,
            })
            item_id += 1

    return wardrobe


# ──────────────────────────────────────────────────────────────────────
# 主构建流程
# ──────────────────────────────────────────────────────────────────────

def build_all_profiles() -> Dict[str, Any]:
    """构建全部 10 个 seed profile。"""
    users = []

    for idx, config in enumerate(PROFILE_MATRIX, start=1):
        style = config["styleExpression"]
        nickname = config["nickname"]

        user = {
            "email": f"seed_v2_{idx}@xuno.test",
            "credential": "SeedTest2026!",
            "profile": {
                "bodyType": config["bodyType"],
                "styleExpression": style,
                "primaryScenarios": config["primaryScenarios"],
                "budget": str(config["budget"]),
                "ageBand": config["ageBand"],
                "nickname": nickname,
                "gender": config["gender"],
            },
            "onboarding": build_onboarding(config),
            "wardrobe": build_wardrobe(style),
            "preferences": PREFERENCE_TEMPLATES.get(style, PREFERENCE_TEMPLATES["casual"]),
            "events": generate_events(nickname, config["primaryScenarios"], count=8),
            "journey": generate_journey(nickname, config["primaryScenarios"]),
            "meta": {
                "highlight": config["highlight"],
                "version": "2.0.0",
            },
        }
        users.append(user)

    return {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "version": "2.0.0",
            "description": "寻裳 XUNO 10 个精心构造的演示用 seed profile (v2)",
            "totalUsers": len(users),
            "coverage": "6 body types x 9 styles x 7 scenarios x 4 age bands",
        },
        "users": users,
    }


def validate_output(data: Dict[str, Any]) -> List[str]:
    """验证输出数据格式完整性。"""
    errors = []
    users = data.get("users", [])

    if len(users) != 10:
        errors.append(f"Expected 10 users, got {len(users)}")

    required_profile_fields = ["bodyType", "styleExpression", "primaryScenarios", "budget", "ageBand", "nickname", "gender"]
    for i, user in enumerate(users):
        prefix = f"User {i+1} ({user.get('profile', {}).get('nickname', 'unknown')})"

        # Profile fields
        profile = user.get("profile", {})
        for field in required_profile_fields:
            if field not in profile:
                errors.append(f"{prefix}: missing profile field '{field}'")

        # Onboarding data
        onboarding = user.get("onboarding")
        if not onboarding:
            errors.append(f"{prefix}: missing onboarding data")
        else:
            if "step1_scenes" not in onboarding:
                errors.append(f"{prefix}: missing onboarding step1_scenes")
            if "step3_style" not in onboarding:
                errors.append(f"{prefix}: missing onboarding step3_style")

        # Wardrobe data
        wardrobe = user.get("wardrobe", [])
        if len(wardrobe) < 10:
            errors.append(f"{prefix}: wardrobe has {len(wardrobe)} items, expected >= 10")
        else:
            categories = {item.get("category") for item in wardrobe}
            required_cats = {"top", "shoes"}
            for cat in required_cats:
                if cat not in categories:
                    errors.append(f"{prefix}: wardrobe missing category '{cat}'")

        # Events data
        events = user.get("events", [])
        if len(events) < 5:
            errors.append(f"{prefix}: only {len(events)} events, expected >= 5")

        # Preferences
        prefs = user.get("preferences", {})
        for pref_field in ["colors", "materials", "brands"]:
            if pref_field not in prefs:
                errors.append(f"{prefix}: missing preference field '{pref_field}'")

    return errors


def main():
    output_path = sys.argv[sys.argv.index("--output") + 1] if "--output" in sys.argv else "docs/PRESENTATION/seed-user-data-v2.json"

    print("Building 10 seed profiles...")
    data = build_all_profiles()

    # Validate before writing
    errors = validate_output(data)
    if errors:
        print("VALIDATION ERRORS:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)

    # Ensure output directory exists
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Write JSON
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Successfully wrote {len(data['users'])} seed profiles to {output_path}")
    print(f"Coverage: {data['meta']['coverage']}")

    # Print summary table
    print("\n{:<4} {:<10} {:<16} {:<18} {:<30} {:<8} {:<8}".format(
        "#", "Nickname", "BodyType", "Style", "Scenarios", "Budget", "Age"
    ))
    print("-" * 100)
    for i, user in enumerate(data["users"]):
        p = user["profile"]
        print("{:<4} {:<10} {:<16} {:<18} {:<30} {:<8} {:<8}".format(
            i + 1,
            p["nickname"],
            p["bodyType"],
            p["styleExpression"],
            ", ".join(p["primaryScenarios"]),
            p["budget"],
            p["ageBand"],
        ))


if __name__ == "__main__":
    main()
