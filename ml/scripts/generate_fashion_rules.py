#!/usr/bin/env python3
"""生成时尚搭配规则数据文件"""

import json
import os
import hashlib
import random

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "fashion_rules")
os.makedirs(OUTPUT_DIR, exist_ok=True)

random.seed(42)

# ============================================================
# 1. 体型 × 场合 规则
# ============================================================

BODY_TYPES = {
    "hourglass": {
        "name_zh": "沙漏型",
        "features": "肩臀同宽，腰线明显",
        "strategy": "突出腰线，展现曲线",
    },
    "pear": {
        "name_zh": "梨形",
        "features": "臀宽肩窄，腰线明显",
        "strategy": "上身增加视觉量感，下身修饰",
    },
    "apple": {
        "name_zh": "苹果型",
        "features": "腰腹丰满，四肢纤细",
        "strategy": "露出四肢优势，转移腰腹注意力",
    },
    "rectangle": {
        "name_zh": "矩形",
        "features": "肩臀腰宽度接近",
        "strategy": "创造曲线感，增加层次",
    },
    "inverted_triangle": {
        "name_zh": "倒三角型",
        "features": "肩宽臀窄，上身壮实",
        "strategy": "弱化肩部，增加下身量感",
    },
}

OCCASIONS = {
    "interview": {"name_zh": "面试", "formality": 0.9, "keywords": ["专业", "得体", "自信"]},
    "work": {"name_zh": "通勤", "formality": 0.7, "keywords": ["干练", "舒适", "得体"]},
    "date": {"name_zh": "约会", "formality": 0.5, "keywords": ["浪漫", "精致", "温柔"]},
    "travel": {"name_zh": "旅行", "formality": 0.2, "keywords": ["舒适", "实用", "上镜"]},
    "party": {"name_zh": "聚会", "formality": 0.6, "keywords": ["时尚", "亮眼", "个性"]},
    "daily": {"name_zh": "日常", "formality": 0.3, "keywords": ["舒适", "随性", "百搭"]},
    "campus": {"name_zh": "校园", "formality": 0.2, "keywords": ["青春", "活力", "休闲"]},
    "wedding": {"name_zh": "婚礼", "formality": 0.85, "keywords": ["优雅", "隆重", "得体"]},
}

SEASONS = {
    "spring": {"name_zh": "春季", "temp_range": "10-22°C"},
    "summer": {"name_zh": "夏季", "temp_range": "25-35°C"},
    "autumn": {"name_zh": "秋季", "temp_range": "10-22°C"},
    "winter": {"name_zh": "冬季", "temp_range": "-5-10°C"},
}

BODY_OCCASION_RULES = {
    ("hourglass", "interview"): {
        "tops": ["修身西装外套", "V领衬衫", "收腰针织衫"],
        "bottoms": ["直筒西裤", "A字半裙(及膝)"],
        "shoes": ["中跟方头鞋", "尖头低跟鞋"],
        "colors": ["#2C3E50", "#1A1A2E", "#FFFFFF", "#8B7D6B", "#4A5568"],
        "avoid": ["宽松卫衣", "低腰裤", "超短裙", "大logo上衣"],
        "tips": "用腰带突出腰线，选择收腰剪裁的西装，V领衬衫拉长颈部线条",
    },
    ("hourglass", "work"): {
        "tops": ["修身西装外套", "丝绸衬衫", "高领打底衫"],
        "bottoms": ["阔腿裤", "铅笔裙", "直筒裤"],
        "shoes": ["乐福鞋", "中跟踝靴", "方头平底鞋"],
        "colors": ["#2C3E50", "#FFFFFF", "#8B4513", "#6B7280", "#D4A574"],
        "avoid": ["紧身T恤", "超短裙", "过于花哨的图案"],
        "tips": "通勤Look保持简约，用腰带和收腰设计展现身材优势",
    },
    ("hourglass", "date"): {
        "tops": ["一字肩上衣", "针织吊带", "蕾丝衬衫"],
        "bottoms": ["高腰A字裙", "修身牛仔裤", "百褶裙"],
        "shoes": ["尖头高跟鞋", "绑带凉鞋", "穆勒鞋"],
        "colors": ["#E8A0BF", "#FF6B6B", "#F0C987", "#8B4513", "#2D1B12"],
        "avoid": ["宽松运动裤", "工装外套", "过于正式的套装"],
        "tips": "突出腰线是关键，收腰连衣裙或高腰+短上衣组合都很适合",
    },
    ("hourglass", "travel"): {
        "tops": ["针织开衫", "宽松棉T恤", "防晒衬衫"],
        "bottoms": ["弹力牛仔裤", "阔腿休闲裤", "运动短裤"],
        "shoes": ["白色运动鞋", "帆布鞋", "平底凉鞋"],
        "colors": ["#87CEEB", "#F5F5DC", "#DEB887", "#FFFFFF", "#8FBC8F"],
        "avoid": ["高跟鞋", "紧身裙", "复杂的层叠搭配"],
        "tips": "舒适为主，用腰带保持腰线，选择弹性面料",
    },
    ("hourglass", "party"): {
        "tops": ["亮片吊带", "丝绒上衣", "一字肩紧身衣"],
        "bottoms": ["皮质半裙", "亮面阔腿裤", "高腰短裤"],
        "shoes": ["细高跟", "亮面短靴", "金属色高跟鞋"],
        "colors": ["#C0392B", "#2ECC71", "#F39C12", "#1A1A2E", "#E8A0BF"],
        "avoid": ["运动鞋", "宽松T恤", "平淡无奇的基础款"],
        "tips": "大胆展示曲线，选择有光泽感的面料，收腰设计必不可少",
    },
    ("hourglass", "daily"): {
        "tops": ["基础T恤", "条纹衫", "宽松针织衫"],
        "bottoms": ["高腰牛仔裤", "休闲阔腿裤", "半身裙"],
        "shoes": ["小白鞋", "帆布鞋", "平底穆勒鞋"],
        "colors": ["#FFFFFF", "#2C3E50", "#87CEEB", "#F0C987", "#6B7280"],
        "avoid": ["过于正式的套装", "不舒服的鞋子"],
        "tips": "日常用高腰线保持好比例，简单的T恤+高腰牛仔裤就很出彩",
    },
    ("hourglass", "campus"): {
        "tops": ["卫衣", "棒球服外套", "宽松衬衫"],
        "bottoms": ["直筒牛仔裤", "百褶裙", "阔腿裤"],
        "shoes": ["帆布鞋", "运动鞋", "马丁靴"],
        "colors": ["#3498DB", "#E74C3C", "#F39C12", "#FFFFFF", "#2C3E50"],
        "avoid": ["过于成熟的套装", "高跟鞋"],
        "tips": "青春活力为主，卫衣+百褶裙的组合非常减龄",
    },
    ("hourglass", "wedding"): {
        "tops": ["蕾丝上衣", "丝绸吊带", "小香风外套"],
        "bottoms": ["丝绸半裙", "鱼尾裙", "阔腿裤套装"],
        "shoes": ["细高跟", "缎面高跟鞋", "珍珠装饰平底鞋"],
        "colors": ["#F0C987", "#E8A0BF", "#8B7D6B", "#2D1B12", "#FFFFFF"],
        "avoid": ["白色连衣裙(新娘色)", "过于暴露", "运动鞋"],
        "tips": "优雅得体，收腰连衣裙最佳，避免穿白色抢新娘风头",
    },
    ("pear", "interview"): {
        "tops": ["船领衬衫", "小西装外套", "有细节设计的上衣"],
        "bottoms": ["A字裙(及膝)", "深色直筒裤", "高腰阔腿裤"],
        "shoes": ["方头中跟鞋", "尖头低跟鞋"],
        "colors": ["#2C3E50", "#1A1A2E", "#FFFFFF", "#4A5568", "#8B7D6B"],
        "avoid": ["紧身裤", "浅色下装", "铅笔裙", "亮色裤装"],
        "tips": "上身增加视觉亮点（项链/胸针/亮色上装），下装选深色A字型",
    },
    ("pear", "work"): {
        "tops": ["荷叶边衬衫", "格纹西装", "亮色针织衫"],
        "bottoms": ["深色直筒裤", "A字中长裙", "高腰阔腿裤"],
        "shoes": ["乐福鞋", "中跟短靴", "平底尖头鞋"],
        "colors": ["#FFFFFF", "#4A90D9", "#E8A0BF", "#2C3E50", "#1A1A2E"],
        "avoid": ["紧身牛仔裤", "亮色裤装", "包臀裙"],
        "tips": "上身选浅色或有设计感的单品吸引视线，下装保持深色简约",
    },
    ("pear", "date"): {
        "tops": ["一字肩上衣", "荷叶边上衣", "露肩针织衫"],
        "bottoms": ["A字裙", "高腰阔腿裤", "百褶裙"],
        "shoes": ["粗跟凉鞋", "绑带高跟鞋", "穆勒鞋"],
        "colors": ["#FF6B6B", "#F0C987", "#E8A0BF", "#2D1B12", "#8B4513"],
        "avoid": ["紧身裤", "短裙+平底鞋", "低腰裤"],
        "tips": "露肩设计展现上身优势，A字裙完美修饰臀腿",
    },
    ("pear", "travel"): {
        "tops": ["宽松条纹衫", "防晒衬衫", "短袖T恤"],
        "bottoms": ["阔腿休闲裤", "A字短裤", "深色牛仔裤"],
        "shoes": ["运动鞋", "平底凉鞋", "帆布鞋"],
        "colors": ["#87CEEB", "#FFFFFF", "#F5F5DC", "#DEB887", "#2C3E50"],
        "avoid": ["紧身裤", "短裙", "高跟鞋"],
        "tips": "A字版型的下装最友好，搭配宽松上装舒适又好看",
    },
    ("pear", "party"): {
        "tops": ["亮片上衣", "丝绸吊带", "一字肩亮色上衣"],
        "bottoms": ["深色A字裙", "亮面阔腿裤", "高腰伞裙"],
        "shoes": ["粗高跟", "亮面短靴", "绑带高跟鞋"],
        "colors": ["#C0392B", "#1A1A2E", "#F39C12", "#2ECC71", "#E8A0BF"],
        "avoid": ["紧身皮裤", "亮色裤装", "包臀裙"],
        "tips": "上身大胆亮色吸引注意力，下装保持A字深色",
    },
    ("pear", "daily"): {
        "tops": ["宽松T恤", "条纹衫", "针织开衫"],
        "bottoms": ["高腰阔腿裤", "A字半裙", "深色直筒牛仔裤"],
        "shoes": ["小白鞋", "平底穆勒鞋", "帆布鞋"],
        "colors": ["#FFFFFF", "#87CEEB", "#2C3E50", "#F0C987", "#8FBC8F"],
        "avoid": ["紧身裤", "亮色下装"],
        "tips": "日常穿搭关键是上浅下深，高腰线+阔腿裤最修饰",
    },
    ("pear", "campus"): {
        "tops": ["宽松卫衣", "短款夹克", "字母T恤"],
        "bottoms": ["阔腿牛仔裤", "百褶裙", "A字短裤"],
        "shoes": ["运动鞋", "帆布鞋", "厚底鞋"],
        "colors": ["#3498DB", "#E74C3C", "#FFFFFF", "#F39C12", "#2C3E50"],
        "avoid": ["紧身裤", "包臀裙"],
        "tips": "青春感很重要，卫衣+阔腿裤或短上衣+A字裙都很合适",
    },
    ("pear", "wedding"): {
        "tops": ["小香风外套", "蕾丝上衣", "荷叶边衬衫"],
        "bottoms": ["丝绸A字裙", "高腰阔腿裤", "伞裙"],
        "shoes": ["缎面中跟鞋", "珍珠装饰平底", "优雅粗跟"],
        "colors": ["#F0C987", "#8B7D6B", "#E8A0BF", "#2D1B12", "#1A1A2E"],
        "avoid": ["白色", "过于暴露", "紧身裤"],
        "tips": "A字裙是最安全的选择，上身精致下装简约",
    },
    ("apple", "interview"): {
        "tops": ["V领西装外套", "深色衬衫", "直筒剪裁上衣"],
        "bottoms": ["高腰直筒裤", "A字裙(及膝)"],
        "shoes": ["中跟方头鞋", "乐福鞋"],
        "colors": ["#2C3E50", "#1A1A2E", "#4A5568", "#FFFFFF", "#8B7D6B"],
        "avoid": ["紧身衣", "腰带系在外面的穿法", "高领衫", "亮色上装"],
        "tips": "V领拉长上半身线条，深色上装修饰腰腹，露出纤细四肢",
    },
    ("apple", "work"): {
        "tops": ["深色西装外套", "V领针织衫", "直筒衬衫"],
        "bottoms": ["高腰阔腿裤", "A字半裙", "直筒裤"],
        "shoes": ["乐福鞋", "低跟短靴", "平底尖头鞋"],
        "colors": ["#2C3E50", "#1A1A2E", "#FFFFFF", "#6B7280", "#8B7D6B"],
        "avoid": ["紧身针织衫", "亮色上装", "腰带装饰"],
        "tips": "外套选深色V领款，内搭保持简约，下装可以稍亮",
    },
    ("apple", "date"): {
        "tops": ["V领连衣裙", "一字肩上衣", "深色修身上衣"],
        "bottoms": ["高腰A字裙", "阔腿裤", "高腰短裤"],
        "shoes": ["尖头高跟鞋", "粗跟凉鞋", "绑带鞋"],
        "colors": ["#FF6B6B", "#E8A0BF", "#2D1B12", "#1A1A2E", "#F0C987"],
        "avoid": ["紧身裤", "高领", "腰部束缚感强的款式"],
        "tips": "V领是一定要的，展现锁骨和手臂是苹果型的优势",
    },
    ("apple", "travel"): {
        "tops": ["宽松V领T恤", "防晒开衫", "宽松衬衫"],
        "bottoms": ["弹性阔腿裤", "高腰短裤", "休闲裤"],
        "shoes": ["运动鞋", "凉鞋", "帆布鞋"],
        "colors": ["#87CEEB", "#FFFFFF", "#F5F5DC", "#DEB887", "#2C3E50"],
        "avoid": ["紧身裤", "高领", "厚重面料"],
        "tips": "宽松舒适是旅行首选，展现四肢的纤细感",
    },
    ("apple", "party"): {
        "tops": ["V领亮片上衣", "深色丝绒连衣裙", "一字肩礼服"],
        "bottoms": ["高腰A字裙", "阔腿裤", "高腰短裤"],
        "shoes": ["高跟鞋", "亮面短靴", "细高跟"],
        "colors": ["#1A1A2E", "#C0392B", "#2ECC71", "#F39C12", "#8B008B"],
        "avoid": ["腰带", "紧身上衣", "腰部绑带设计"],
        "tips": "深色上装配亮色下装，或者直接选V领连衣裙",
    },
    ("apple", "daily"): {
        "tops": ["V领T恤", "宽松衬衫", "开衫"],
        "bottoms": ["高腰牛仔裤", "阔腿裤", "A字裙"],
        "shoes": ["小白鞋", "平底鞋", "帆布鞋"],
        "colors": ["#FFFFFF", "#2C3E50", "#87CEEB", "#8FBC8F", "#F0C987"],
        "avoid": ["紧身衣", "高领"],
        "tips": "日常保持V领+高腰的公式，简单但有效",
    },
    ("apple", "campus"): {
        "tops": ["宽松卫衣", "V领T恤", "棒球服"],
        "bottoms": ["阔腿牛仔裤", "A字裙", "运动裤"],
        "shoes": ["运动鞋", "帆布鞋", "厚底鞋"],
        "colors": ["#3498DB", "#E74C3C", "#FFFFFF", "#F39C12", "#2C3E50"],
        "avoid": ["紧身裤", "高领毛衣"],
        "tips": "卫衣+阔腿裤的组合青春又舒适，避免腰部紧绷的款式",
    },
    ("apple", "wedding"): {
        "tops": ["V领丝绸上衣", "A字连衣裙", "小香风外套"],
        "bottoms": ["高腰A字裙", "阔腿裤", "长裙"],
        "shoes": ["缎面中跟鞋", "优雅平底", "珍珠装饰鞋"],
        "colors": ["#2D1B12", "#8B7D6B", "#F0C987", "#E8A0BF", "#1A1A2E"],
        "avoid": ["白色", "紧身上衣", "腰带"],
        "tips": "A字连衣裙是苹果型的最佳选择，V领展现锁骨优势",
    },
    ("rectangle", "interview"): {
        "tops": ["荷叶边衬衫", "收腰西装外套", "有层次感的上衣"],
        "bottoms": ["高腰直筒裤", "A字裙", "铅笔裙"],
        "shoes": ["中跟尖头鞋", "方头低跟鞋"],
        "colors": ["#2C3E50", "#1A1A2E", "#FFFFFF", "#8B7D6B", "#4A5568"],
        "avoid": ["直筒连衣裙", "宽松无腰线上衣", "平底鞋配正装"],
        "tips": "用腰带和收腰设计创造腰线，荷叶边和层次感增加曲线",
    },
    ("rectangle", "work"): {
        "tops": ["收腰西装", "蝴蝶结衬衫", "褶皱设计上衣"],
        "bottoms": ["高腰阔腿裤", "A字裙", "高腰直筒裤"],
        "shoes": ["乐福鞋", "中跟短靴", "猫跟鞋"],
        "colors": ["#FFFFFF", "#2C3E50", "#8B4513", "#D4A574", "#6B7280"],
        "avoid": ["直筒剪裁", "无腰线设计"],
        "tips": "高腰线是创造曲线的关键，褶皱和荷叶边增加层次感",
    },
    ("rectangle", "date"): {
        "tops": ["荷叶边上衣", "收腰短上衣", "露脐装"],
        "bottoms": ["高腰裙", "百褶裙", "高腰阔腿裤"],
        "shoes": ["高跟鞋", "绑带凉鞋", "穆勒鞋"],
        "colors": ["#FF6B6B", "#E8A0BF", "#F0C987", "#8B4513", "#2D1B12"],
        "avoid": ["直筒连衣裙", "无腰线设计"],
        "tips": "创造腰线是关键，高腰+短上衣或收腰连衣裙",
    },
    ("rectangle", "travel"): {
        "tops": ["层叠穿搭(T恤+开衫)", "系带衬衫", "宽松V领衫"],
        "bottoms": ["高腰牛仔裤", "A字短裤", "阔腿裤"],
        "shoes": ["运动鞋", "凉鞋", "帆布鞋"],
        "colors": ["#87CEEB", "#F5F5DC", "#DEB887", "#FFFFFF", "#2C3E50"],
        "avoid": ["直筒无腰线连衣裙"],
        "tips": "层叠穿搭增加身体层次感，腰带是好帮手",
    },
    ("rectangle", "party"): {
        "tops": ["收腰亮片裙", "腰封搭配", "不对称上衣"],
        "bottoms": ["高腰裙", "阔腿裤", "百褶裙"],
        "shoes": ["高跟鞋", "亮面靴", "细高跟"],
        "colors": ["#C0392B", "#2ECC71", "#F39C12", "#1A1A2E", "#8B008B"],
        "avoid": ["直筒连衣裙", "无腰线设计"],
        "tips": "腰封是矩形身材的神器，大胆用它创造曲线",
    },
    ("rectangle", "daily"): {
        "tops": ["高腰线T恤", "系带衬衫", "crop top"],
        "bottoms": ["高腰牛仔裤", "A字裙", "高腰裤"],
        "shoes": ["小白鞋", "平底鞋", "帆布鞋"],
        "colors": ["#FFFFFF", "#2C3E50", "#87CEEB", "#F0C987", "#8FBC8F"],
        "avoid": ["直筒连衣裙", "宽松无腰线上衣"],
        "tips": "每天的高腰法则，简单T恤+高腰裤就有曲线了",
    },
    ("rectangle", "campus"): {
        "tops": ["crop top", "短款卫衣", "系带衬衫"],
        "bottoms": ["高腰牛仔裤", "百褶裙", "阔腿裤"],
        "shoes": ["运动鞋", "帆布鞋", "厚底鞋"],
        "colors": ["#3498DB", "#E74C3C", "#FFFFFF", "#F39C12", "#2C3E50"],
        "avoid": ["宽松直筒上衣+直筒裤"],
        "tips": "短上衣+高腰下装是校园标配，青春又有比例",
    },
    ("rectangle", "wedding"): {
        "tops": ["收腰连衣裙", "小香风套装", "荷叶边礼服"],
        "bottoms": ["高腰半裙", "阔腿裤套装"],
        "shoes": ["缎面高跟鞋", "优雅平底", "珍珠装饰鞋"],
        "colors": ["#F0C987", "#E8A0BF", "#8B7D6B", "#2D1B12", "#1A1A2E"],
        "avoid": ["白色", "直筒无腰线连衣裙"],
        "tips": "收腰设计是灵魂，A字裙摆或腰封都能创造曲线",
    },
    ("inverted_triangle", "interview"): {
        "tops": ["V领西装", "深色衬衫", "简约剪裁上衣"],
        "bottoms": ["高腰阔腿裤", "A字裙", "直筒裤"],
        "shoes": ["中跟方头鞋", "低跟尖头鞋"],
        "colors": ["#2C3E50", "#1A1A2E", "#FFFFFF", "#4A5568", "#8B7D6B"],
        "avoid": ["垫肩", "一字领", "荷叶边上衣", "亮色上装"],
        "tips": "V领弱化肩部宽度，下装选择有量感的款式平衡上下半身",
    },
    ("inverted_triangle", "work"): {
        "tops": ["V领针织衫", "简约衬衫", "深色西装外套(无垫肩)"],
        "bottoms": ["阔腿裤", "A字裙", "百褶裙"],
        "shoes": ["乐福鞋", "低跟短靴", "方头鞋"],
        "colors": ["#2C3E50", "#FFFFFF", "#6B7280", "#8B7D6B", "#D4A574"],
        "avoid": ["泡泡袖", "荷叶边", "宽肩设计"],
        "tips": "弱化肩部，增加臀部和下半身的视觉量感",
    },
    ("inverted_triangle", "date"): {
        "tops": ["V领吊带", "挂脖上衣", "深色修身上衣"],
        "bottoms": ["高腰阔腿裤", "A字裙", "百褶长裙"],
        "shoes": ["高跟鞋", "绑带凉鞋", "穆勒鞋"],
        "colors": ["#FF6B6B", "#E8A0BF", "#2D1B12", "#F0C987", "#8B4513"],
        "avoid": ["一字领", "泡泡袖", "垫肩"],
        "tips": "V领或挂脖设计弱化宽肩，下装选有膨胀感的款式",
    },
    ("inverted_triangle", "travel"): {
        "tops": ["V领T恤", "宽松开衫", "无袖背心"],
        "bottoms": ["阔腿裤", "A字短裤", "百褶裙"],
        "shoes": ["运动鞋", "凉鞋", "帆布鞋"],
        "colors": ["#87CEEB", "#F5F5DC", "#DEB887", "#FFFFFF", "#2C3E50"],
        "avoid": ["垫肩外套", "泡泡袖"],
        "tips": "V领+阔腿裤的搭配旅行最实用，上下比例协调",
    },
    ("inverted_triangle", "party"): {
        "tops": ["V领亮片上衣", "深色挂脖上衣", "不对称剪裁"],
        "bottoms": ["亮色阔腿裤", "蓬蓬裙", "百褶裙"],
        "shoes": ["高跟鞋", "亮面短靴", "金属色鞋"],
        "colors": ["#1A1A2E", "#C0392B", "#F39C12", "#2ECC71", "#8B008B"],
        "avoid": ["一字领", "泡泡袖", "肩部装饰"],
        "tips": "上身深色简约，下身可以大胆亮色和膨胀感设计",
    },
    ("inverted_triangle", "daily"): {
        "tops": ["V领T恤", "无袖背心", "简约衬衫"],
        "bottoms": ["阔腿牛仔裤", "A字裙", "高腰裤"],
        "shoes": ["小白鞋", "平底鞋", "帆布鞋"],
        "colors": ["#FFFFFF", "#2C3E50", "#87CEEB", "#F0C987", "#8FBC8F"],
        "avoid": ["垫肩", "泡泡袖"],
        "tips": "V领是倒三角的好朋友，日常保持简约上装+有量感的下装",
    },
    ("inverted_triangle", "campus"): {
        "tops": ["V领T恤", "无袖背心", "简约卫衣"],
        "bottoms": ["阔腿牛仔裤", "百褶裙", "工装裤"],
        "shoes": ["运动鞋", "帆布鞋", "厚底鞋"],
        "colors": ["#3498DB", "#E74C3C", "#FFFFFF", "#F39C12", "#2C3E50"],
        "avoid": ["泡泡袖上衣", "垫肩外套"],
        "tips": "简约上装+有设计感的下装，百褶裙增加下半身量感",
    },
    ("inverted_triangle", "wedding"): {
        "tops": ["V领丝绸上衣", "A字连衣裙", "简约剪裁礼服"],
        "bottoms": ["蓬蓬裙", "阔腿裤", "百褶长裙"],
        "shoes": ["缎面高跟鞋", "优雅平底", "珍珠装饰鞋"],
        "colors": ["#2D1B12", "#8B7D6B", "#F0C987", "#E8A0BF", "#1A1A2E"],
        "avoid": ["白色", "一字领", "垫肩", "泡泡袖"],
        "tips": "V领+A字裙摆是最完美的组合，弱化肩部突出腰臀",
    },
}


def generate_body_type_rules():
    rules = []
    for bt_key, bt_info in BODY_TYPES.items():
        for occ_key, occ_info in OCCASIONS.items():
            key = (bt_key, occ_key)
            if key in BODY_OCCASION_RULES:
                data = BODY_OCCASION_RULES[key]
            else:
                data = BODY_OCCASION_RULES.get(("hourglass", occ_key), {})

            rule = {
                "id": f"bt_{bt_key}_{occ_key}",
                "body_type": bt_key,
                "body_type_zh": bt_info["name_zh"],
                "occasion": occ_key,
                "occasion_zh": occ_info["name_zh"],
                "strategy": bt_info["strategy"],
                "recommended": {
                    "tops": data.get("tops", []),
                    "bottoms": data.get("bottoms", []),
                    "shoes": data.get("shoes", []),
                },
                "recommended_colors": data.get("colors", []),
                "avoid_items": data.get("avoid", []),
                "tips": data.get("tips", ""),
                "formality": occ_info["formality"],
            }
            rules.append(rule)

    return rules


# ============================================================
# 2. 色彩季型规则
# ============================================================

COLOR_SEASONS = {
    "spring_warm": {
        "name_zh": "春季暖型",
        "characteristics": "暖色调、高明度、清透",
        "best_colors": ["#FF6B6B", "#F4A460", "#F0C987", "#E8A0BF", "#FFA07A", "#FFD700", "#FF7F50", "#F0E68C"],
        "avoid_colors": ["#1A1A2E", "#2C3E50", "#4B0082", "#800080", "#000080"],
        "metal": "金色饰品",
        "makeup": "珊瑚色腮红、蜜桃色唇膏",
    },
    "spring_bright": {
        "name_zh": "春季明亮型",
        "characteristics": "高饱和、暖色调、对比鲜明",
        "best_colors": ["#FF0000", "#FF4500", "#FFD700", "#00FF00", "#00CED1", "#FF69B4", "#FFA500", "#FF1493"],
        "avoid_colors": ["#808080", "#A9A9A9", "#D3D3D3", "#C0C0C0", "#696969"],
        "metal": "金色饰品",
        "makeup": "鲜艳唇色、清晰眉形",
    },
    "spring_light": {
        "name_zh": "春季淡型",
        "characteristics": "暖色调、低对比、柔和",
        "best_colors": ["#FFB6C1", "#FFC0CB", "#FAFAD2", "#E6E6FA", "#F0E68C", "#FFDAB9", "#FFE4E1", "#FFF0F5"],
        "avoid_colors": ["#1A1A2E", "#2C3E50", "#000000", "#8B0000", "#4B0082"],
        "metal": "淡金色饰品",
        "makeup": "蜜桃色系、柔和腮红",
    },
    "summer_cool": {
        "name_zh": "夏季冷型",
        "characteristics": "冷色调、柔和、低对比",
        "best_colors": ["#8B7D6B", "#B0C4DE", "#DDA0DD", "#87CEEB", "#9370DB", "#6A5ACD", "#7B68EE", "#48D1CC"],
        "avoid_colors": ["#FF4500", "#FFD700", "#FF6347", "#FFA500", "#FF1493"],
        "metal": "银色饰品",
        "makeup": "玫瑰色系、粉紫色调",
    },
    "summer_light": {
        "name_zh": "夏季淡型",
        "characteristics": "冷色调、高明度、粉嫩",
        "best_colors": ["#FFB6C1", "#E6E6FA", "#B0C4DE", "#FFF0F5", "#F0F8FF", "#FAF0E6", "#FFE4E1", "#DCDCDC"],
        "avoid_colors": ["#1A1A2E", "#8B0000", "#000080", "#800020", "#4B0082"],
        "metal": "银色饰品",
        "makeup": "淡粉色系、自然妆容",
    },
    "summer_soft": {
        "name_zh": "夏季柔型",
        "characteristics": "冷色调、低饱和、灰调",
        "best_colors": ["#8B8682", "#B0A8A0", "#A0B0B8", "#C4A882", "#9B8E82", "#7A8B8B", "#8FBC8F", "#BDB76B"],
        "avoid_colors": ["#FF0000", "#FFD700", "#FF4500", "#FF1493", "#FF6347"],
        "metal": "古银色饰品",
        "makeup": "灰粉色系、哑光质感",
    },
    "autumn_warm": {
        "name_zh": "秋季暖型",
        "characteristics": "暖色调、中低明度、丰富",
        "best_colors": ["#8B4513", "#D2691E", "#DAA520", "#B8860B", "#CD853F", "#D2B48C", "#F4A460", "#BC8F8F"],
        "avoid_colors": ["#87CEEB", "#0000FF", "#FF00FF", "#00CED1", "#9370DB"],
        "metal": "金色饰品、铜色饰品",
        "makeup": "砖红色系、暖棕色调",
    },
    "autumn_deep": {
        "name_zh": "秋季深型",
        "characteristics": "暖色调、低明度、浓郁",
        "best_colors": ["#2D1B12", "#4A2C2A", "#5D3A1A", "#6B4423", "#8B4513", "#A0522D", "#556B2F", "#2F4F4F"],
        "avoid_colors": ["#FFB6C1", "#FFC0CB", "#87CEEB", "#E6E6FA", "#FFF0F5"],
        "metal": "金色饰品、琥珀饰品",
        "makeup": "深酒红色系、浓郁眼影",
    },
    "autumn_soft": {
        "name_zh": "秋季柔型",
        "characteristics": "暖色调、低饱和、大地色系",
        "best_colors": ["#C4A882", "#BDB76B", "#8FBC8F", "#D2B48C", "#DEB887", "#BC8F8F", "#C0A882", "#A0887A"],
        "avoid_colors": ["#FF0000", "#00FF00", "#FF00FF", "#0000FF", "#FFD700"],
        "metal": "哑光金色饰品",
        "makeup": "奶茶色系、裸棕色调",
    },
    "winter_cool": {
        "name_zh": "冬季冷型",
        "characteristics": "冷色调、高对比、鲜明",
        "best_colors": ["#1A1A2E", "#FFFFFF", "#FF0000", "#0000FF", "#800080", "#2C3E50", "#C0392B", "#2ECC71"],
        "avoid_colors": ["#FFA07A", "#FFD700", "#F4A460", "#DAA520", "#CD853F"],
        "metal": "银色饰品、白金饰品",
        "makeup": "正红色唇、冷色调眼影",
    },
    "winter_deep": {
        "name_zh": "冬季深型",
        "characteristics": "冷色调、低明度、深沉",
        "best_colors": ["#1A1A2E", "#2D1B12", "#000080", "#4B0082", "#800020", "#2C3E50", "#006400", "#191970"],
        "avoid_colors": ["#FFB6C1", "#FFF0F5", "#FFE4E1", "#FAFAD2", "#FFF8DC"],
        "metal": "银色饰品、黑曜石饰品",
        "makeup": "深紫红色系、冷色调妆容",
    },
    "winter_bright": {
        "name_zh": "冬季明亮型",
        "characteristics": "冷色调、高饱和、强烈对比",
        "best_colors": ["#FF0000", "#0000FF", "#FF00FF", "#00FF00", "#FFD700", "#FF4500", "#8B008B", "#00CED1"],
        "avoid_colors": ["#D3D3D3", "#C0C0C0", "#A9A9A9", "#808080", "#696969"],
        "metal": "银色饰品、钻石饰品",
        "makeup": "强烈色彩对比、鲜明唇色",
    },
}

COLOR_OCCASION_COMBOS = ["casual", "business", "date", "formal"]


def generate_color_season_rules():
    rules = []
    for season_key, season_info in COLOR_SEASONS.items():
        for occasion in COLOR_OCCASION_COMBOS:
            best = season_info["best_colors"]
            avoid = season_info["avoid_colors"]

            combos = []
            for i in range(0, min(4, len(best))):
                for j in range(i + 1, min(6, len(best))):
                    combos.append({
                        "primary": best[i],
                        "secondary": best[j],
                        "accent": best[(j + 1) % len(best)],
                        "description": f"{season_info['name_zh']}适合的{occasion}搭配",
                    })

            rule = {
                "id": f"cs_{season_key}_{occasion}",
                "color_season": season_key,
                "color_season_zh": season_info["name_zh"],
                "occasion": occasion,
                "characteristics": season_info["characteristics"],
                "best_colors": season_info["best_colors"],
                "avoid_colors": season_info["avoid_colors"],
                "recommended_metal": season_info["metal"],
                "recommended_makeup": season_info["makeup"],
                "color_combos": combos[:4],
                "tips": f"{season_info['name_zh']}在{occasion}场合应选择{season_info['characteristics']}的色彩，搭配{season_info['metal']}",
            }
            rules.append(rule)

    return rules


# ============================================================
# 3. 单品兼容性矩阵
# ============================================================

TOP_CATEGORIES = [
    ("t_shirt", "T恤"), ("shirt", "衬衫"), ("blouse", "雪纺衫"), ("sweater", "毛衣"),
    ("hoodie", "卫衣"), ("blazer", "西装外套"), ("jacket", "夹克"), ("coat", "大衣"),
    ("cardigan", "针织开衫"), ("vest", "马甲"), ("crop_top", "短上衣"), ("tank_top", "背心"),
]

BOTTOM_CATEGORIES = [
    ("jeans", "牛仔裤"), ("trousers", "西裤"), ("shorts", "短裤"), ("skirt_mini", "迷你裙"),
    ("skirt_midi", "中长裙"), ("skirt_maxi", "长裙"), ("leggings", "打底裤"),
    ("wide_leg_pants", "阔腿裤"), ("culottes", "裙裤"), ("joggers", "运动裤"),
]

SHOE_CATEGORIES = [
    ("sneakers", "运动鞋"), ("heels", "高跟鞋"), ("flats", "平底鞋"), ("boots", "靴子"),
    ("sandals", "凉鞋"), ("loafers", "乐福鞋"), ("oxford", "牛津鞋"),
]

STYLES = ["casual", "smart_casual", "business", "formal", "sporty", "romantic", "edgy", "minimalist",
          "bohemian", "streetwear", "preppy", "elegant", "vintage", "chinese_traditional"]

SEASONS_LIST = ["spring", "summer", "autumn", "winter"]


def _compat(top_key, bottom_key):
    HIGH = 0.85
    MID = 0.7
    LOW = 0.5
    NO = 0.25

    _rules = {
        # T恤
        "t_shirt": {"jeans": HIGH, "trousers": MID, "shorts": HIGH, "skirt_mini": MID, "skirt_midi": MID,
                     "skirt_maxi": MID, "leggings": MID, "wide_leg_pants": MID, "culottes": MID, "joggers": HIGH},
        # 衬衫
        "shirt": {"jeans": MID, "trousers": HIGH, "shorts": MID, "skirt_mini": MID, "skirt_midi": HIGH,
                   "skirt_maxi": MID, "leggings": LOW, "wide_leg_pants": HIGH, "culottes": MID, "joggers": LOW},
        # 雪纺衫
        "blouse": {"jeans": MID, "trousers": HIGH, "shorts": MID, "skirt_mini": MID, "skirt_midi": HIGH,
                    "skirt_maxi": HIGH, "leggings": LOW, "wide_leg_pants": HIGH, "culottes": MID, "joggers": NO},
        # 毛衣
        "sweater": {"jeans": HIGH, "trousers": MID, "shorts": MID, "skirt_mini": MID, "skirt_midi": HIGH,
                     "skirt_maxi": HIGH, "leggings": MID, "wide_leg_pants": MID, "culottes": MID, "joggers": MID},
        # 卫衣
        "hoodie": {"jeans": HIGH, "trousers": LOW, "shorts": HIGH, "skirt_mini": MID, "skirt_midi": MID,
                    "skirt_maxi": LOW, "leggings": HIGH, "wide_leg_pants": MID, "culottes": LOW, "joggers": HIGH},
        # 西装
        "blazer": {"jeans": HIGH, "trousers": HIGH, "shorts": MID, "skirt_mini": MID, "skirt_midi": HIGH,
                    "skirt_maxi": MID, "leggings": LOW, "wide_leg_pants": HIGH, "culottes": MID, "joggers": NO},
        # 夹克
        "jacket": {"jeans": HIGH, "trousers": MID, "shorts": HIGH, "skirt_mini": MID, "skirt_midi": MID,
                    "skirt_maxi": LOW, "leggings": MID, "wide_leg_pants": MID, "culottes": MID, "joggers": HIGH},
        # 大衣
        "coat": {"jeans": HIGH, "trousers": HIGH, "shorts": LOW, "skirt_mini": LOW, "skirt_midi": HIGH,
                  "skirt_maxi": HIGH, "leggings": MID, "wide_leg_pants": HIGH, "culottes": MID, "joggers": NO},
        # 开衫
        "cardigan": {"jeans": HIGH, "trousers": MID, "shorts": MID, "skirt_mini": MID, "skirt_midi": HIGH,
                      "skirt_maxi": HIGH, "leggings": MID, "wide_leg_pants": MID, "culottes": MID, "joggers": MID},
        # 马甲
        "vest": {"jeans": HIGH, "trousers": MID, "shorts": HIGH, "skirt_mini": MID, "skirt_midi": MID,
                  "skirt_maxi": LOW, "leggings": MID, "wide_leg_pants": MID, "culottes": MID, "joggers": MID},
        # 短上衣
        "crop_top": {"jeans": HIGH, "trousers": MID, "shorts": HIGH, "skirt_mini": HIGH, "skirt_midi": HIGH,
                      "skirt_maxi": MID, "leggings": HIGH, "wide_leg_pants": HIGH, "culottes": MID, "joggers": HIGH},
        # 背心
        "tank_top": {"jeans": HIGH, "trousers": MID, "shorts": HIGH, "skirt_mini": HIGH, "skirt_midi": MID,
                      "skirt_maxi": MID, "leggings": HIGH, "wide_leg_pants": MID, "culottes": MID, "joggers": HIGH},
    }
    return _rules.get(top_key, {}).get(bottom_key, 0.5)


def generate_item_compatibility():
    rules = []
    for top_key, top_name in TOP_CATEGORIES:
        for bottom_key, bottom_name in BOTTOM_CATEGORIES:
            score = _compat(top_key, bottom_key)
            if score >= 0.8:
                occasions = ["daily", "casual", "campus"]
                if top_key in ["blazer", "shirt"] and bottom_key in ["trousers", "wide_leg_pants"]:
                    occasions.extend(["work", "interview"])
            elif score >= 0.6:
                occasions = ["daily"]
                if top_key in ["blazer", "shirt"]:
                    occasions.append("work")
            else:
                occasions = []

            seasons_fit = []
            if top_key in ["sweater", "coat", "cardigan"] or bottom_key in ["trousers", "leggings"]:
                seasons_fit = ["autumn", "winter"]
            elif top_key in ["tank_top", "crop_top"] or bottom_key in ["shorts", "skirt_mini"]:
                seasons_fit = ["summer", "spring"]
            else:
                seasons_fit = SEASONS_LIST[:]

            styles_fit = []
            if top_key in ["blazer", "shirt"] and bottom_key in ["trousers", "wide_leg_pants"]:
                styles_fit = ["business", "smart_casual", "formal", "elegant"]
            elif top_key in ["hoodie", "t_shirt", "tank_top"] and bottom_key in ["jeans", "shorts", "joggers"]:
                styles_fit = ["casual", "streetwear", "sporty"]
            elif top_key in ["blouse", "cardigan"] and bottom_key in ["skirt_midi", "skirt_maxi", "wide_leg_pants"]:
                styles_fit = ["romantic", "elegant", "bohemian"]
            else:
                styles_fit = ["casual", "smart_casual"]

            rules.append({
                "id": f"ic_{top_key}_{bottom_key}",
                "top_category": top_key,
                "top_name_zh": top_name,
                "bottom_category": bottom_key,
                "bottom_name_zh": bottom_name,
                "compatibility_score": round(score, 2),
                "suitable_occasions": occasions,
                "suitable_seasons": seasons_fit,
                "suitable_styles": styles_fit,
            })

    return rules


# ============================================================
# 4. 天气 → 穿搭映射
# ============================================================

TEMP_RANGES = {
    "below_0": {"name_zh": "零下", "range": "<0°C", "layers": 3, "warmth": "极暖"},
    "0_10": {"name_zh": "寒冷", "range": "0-10°C", "layers": 3, "warmth": "保暖"},
    "10_15": {"name_zh": "凉", "range": "10-15°C", "layers": 2, "warmth": "适中偏暖"},
    "15_20": {"name_zh": "舒适", "range": "15-20°C", "layers": 2, "warmth": "适中"},
    "20_25": {"name_zh": "温暖", "range": "20-25°C", "layers": 1, "warmth": "轻薄"},
    "25_30": {"name_zh": "热", "range": "25-30°C", "layers": 1, "warmth": "透气"},
    "above_30": {"name_zh": "酷热", "range": ">30°C", "layers": 1, "warmth": "极薄透气"},
}

WEATHER_OUTFIT_MAP = {
    ("below_0", "interview"): {
        "layers": ["保暖内衣", "羊毛衫/高领毛衣", "羊毛大衣"],
        "materials": ["羊毛", "羊绒", "羽绒"],
        "items": {"outer": "羊毛大衣或羽绒服", "inner": "高领羊毛衫", "bottom": "加绒西裤或羊毛裙", "shoes": "皮靴", "accessories": "羊绒围巾+皮手套"},
        "tips": "面试场合保持正式感，用大衣替代羽绒服更显专业",
    },
    ("below_0", "daily"): {
        "layers": ["保暖内衣", "毛衣/卫衣", "羽绒/棉服"],
        "materials": ["羽绒", "羊毛", "摇粒绒"],
        "items": {"outer": "羽绒服/棉服", "inner": "毛衣/卫衣", "bottom": "加绒裤", "shoes": "雪地靴/加绒靴", "accessories": "毛线帽+围巾+手套"},
        "tips": "日常以保暖为主，选择蓬松度高的羽绒服",
    },
    ("0_10", "work"): {
        "layers": ["薄打底", "针织衫/衬衫", "西装外套/风衣"],
        "materials": ["羊毛", "棉", "混纺"],
        "items": {"outer": "西装外套/风衣", "inner": "衬衫+针织背心", "bottom": "西裤/及膝裙", "shoes": "短靴/乐福鞋", "accessories": "丝巾"},
        "tips": "层次穿搭方便室内外温差调节",
    },
    ("10_15", "daily"): {
        "layers": ["内搭T恤/衬衫", "针织衫/轻外套"],
        "materials": ["棉", "针织", "牛仔"],
        "items": {"outer": "针织开衫/牛仔外套", "inner": "长袖T恤/衬衫", "bottom": "牛仔裤/休闲裤", "shoes": "运动鞋/短靴", "accessories": "薄围巾"},
        "tips": "这个温度最适合层叠穿搭，方便随时增减",
    },
    ("15_20", "date"): {
        "layers": ["连衣裙/衬衫", "薄外套"],
        "materials": ["丝绸", "棉", "雪纺"],
        "items": {"outer": "薄风衣/针织开衫", "inner": "衬衫/连衣裙", "bottom": "半裙/阔腿裤", "shoes": "低跟鞋/小白鞋", "accessories": "精致项链"},
        "tips": "温度最舒适，可以尽情穿搭，薄外套随身带",
    },
    ("20_25", "daily"): {
        "layers": ["单层即可"],
        "materials": ["棉", "亚麻", "薄针织"],
        "items": {"outer": "无/薄防晒衫", "inner": "T恤/衬衫", "bottom": "牛仔裤/休闲裤/裙", "shoes": "帆布鞋/平底鞋", "accessories": "太阳镜"},
        "tips": "最舒适的温度，几乎所有衣服都可以穿",
    },
    ("25_30", "daily"): {
        "layers": ["单层轻薄"],
        "materials": ["棉", "亚麻", "莫代尔"],
        "items": {"outer": "无", "inner": "短袖/背心/吊带", "bottom": "短裤/短裙/薄裤", "shoes": "凉鞋/帆布鞋", "accessories": "太阳镜+遮阳帽"},
        "tips": "选择透气面料，浅色系更凉爽",
    },
    ("above_30", "daily"): {
        "layers": ["单层极薄"],
        "materials": ["真丝", "亚麻", "莫代尔", "冰丝"],
        "items": {"outer": "防晒衫", "inner": "吊带/背心", "bottom": "短裤/短裙", "shoes": "凉鞋", "accessories": "太阳镜+遮阳帽+防晒袖"},
        "tips": "极端高温，优先选择浅色透气面料，避免黑色和厚重材质",
    },
}


def generate_weather_outfit_rules():
    rules = []
    for temp_key, temp_info in TEMP_RANGES.items():
        for occ_key, occ_info in OCCASIONS.items():
            specific_key = (temp_key, occ_key)
            if specific_key in WEATHER_OUTFIT_MAP:
                data = WEATHER_OUTFIT_MAP[specific_key]
            else:
                fallback = (temp_key, "daily")
                data = WEATHER_OUTFIT_MAP.get(fallback, {
                    "layers": ["单层"] * temp_info["layers"],
                    "materials": ["棉"],
                    "items": {"outer": "轻外套", "inner": "T恤", "bottom": "裤子", "shoes": "运动鞋", "accessories": ""},
                    "tips": f"根据{temp_info['name_zh']}天气选择适当衣物",
                })

            rule = {
                "id": f"wt_{temp_key}_{occ_key}",
                "temp_range": temp_key,
                "temp_name_zh": temp_info["name_zh"],
                "temp_range_str": temp_info["range"],
                "occasion": occ_key,
                "occasion_zh": occ_info["name_zh"],
                "recommended_layers": temp_info["layers"],
                "warmth_level": temp_info["warmth"],
                "layer_details": data["layers"],
                "recommended_materials": data["materials"],
                "outfit_suggestion": data["items"],
                "tips": data["tips"],
            }
            rules.append(rule)

    return rules


# ============================================================
# 5. 趋势规则 (2026春夏)
# ============================================================

def generate_trend_rules():
    return {
        "season": "2026春夏",
        "trending_colors": [
            {"hex": "#E8A0BF", "name": "玫瑰粉", "name_en": "Rose Pink"},
            {"hex": "#B8E0D2", "name": "薄荷绿", "name_en": "Mint Green"},
            {"hex": "#F0C987", "name": "奶油黄", "name_en": "Butter Yellow"},
            {"hex": "#87CEEB", "name": "天蓝色", "name_en": "Sky Blue"},
            {"hex": "#D4A574", "name": "焦糖棕", "name_en": "Caramel Brown"},
            {"hex": "#C0392B", "name": "番茄红", "name_en": "Tomato Red"},
            {"hex": "#8B7D6B", "name": "燕麦色", "name_en": "Oat"},
            {"hex": "#F5F5DC", "name": "米白色", "name_en": "Beige"},
        ],
        "trending_styles": [
            {"style": "quiet_luxury", "name_zh": "静奢风", "description": "低调奢华，注重面料质感和剪裁细节"},
            {"style": "sporty_chic", "name_zh": "运动时尚", "description": "运动元素融入日常穿搭，运动鞋配西装"},
            {"style": "boho_modern", "name_zh": "现代波西米亚", "description": "波西米亚元素现代化，流苏和编织"},
            {"style": "minimalist_cozy", "name_zh": "舒适极简", "description": "极简主义+舒适面料，宽松剪裁"},
            {"style": "power_dressing", "name_zh": "力量穿搭", "description": "宽肩西装，强烈色彩对比"},
            {"style": "chinese_elements", "name_zh": "新中式", "description": "中式元素融入现代设计，盘扣/立领/刺绣"},
        ],
        "trending_materials": [
            {"material": "linen", "name_zh": "亚麻", "why": "透气环保，春夏首选"},
            {"material": "silk_blend", "name_zh": "丝绸混纺", "why": "光泽感+易打理"},
            {"material": "organic_cotton", "name_zh": "有机棉", "why": "可持续时尚趋势"},
            {"material": "tech_fabric", "name_zh": "科技面料", "why": "防水透气多功能"},
            {"material": "ribbed_knit", "name_zh": "坑条针织", "why": "质感丰富，修身显瘦"},
        ],
        "trending_silhouettes": [
            {"silhouette": "oversized_blazer", "name_zh": "宽松西装", "popularity": 0.9},
            {"silhouette": "wide_leg_pants", "name_zh": "阔腿裤", "popularity": 0.85},
            {"silhouette": "midi_skirt", "name_zh": "中长裙", "popularity": 0.8},
            {"silhouette": "slip_dress", "name_zh": "吊带裙", "popularity": 0.75},
            {"silhouette": "cropped_cardigan", "name_zh": "短款针织衫", "popularity": 0.7},
            {"silhouette": "cargo_pants", "name_zh": "工装裤", "popularity": 0.65},
        ],
        "style_adaptation": {
            "casual": "融入奶油黄和薄荷绿的宽松单品",
            "business": "静奢风的低饱和色彩+高品质面料",
            "romantic": "玫瑰粉吊带裙+薄纱元素",
            "sporty": "科技面料+运动时尚混搭",
            "minimalist": "燕麦色/米白色系+舒适极简剪裁",
            "streetwear": "番茄红+工装裤+力量穿搭",
            "elegant": "丝绸混纺+焦糖棕+新中式细节",
            "chinese_traditional": "新中式立领/盘扣+现代剪裁",
        },
    }


# ============================================================
# 生成所有文件
# ============================================================

def main():
    print("生成时尚搭配规则数据...")

    # 1. 体型规则
    body_rules = generate_body_type_rules()
    path = os.path.join(OUTPUT_DIR, "body_type_rules.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(body_rules, f, ensure_ascii=False, indent=2)
    print(f"  体型规则: {len(body_rules)} 条 → {path}")

    # 2. 色彩规则
    color_rules = generate_color_season_rules()
    path = os.path.join(OUTPUT_DIR, "color_season_rules.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(color_rules, f, ensure_ascii=False, indent=2)
    print(f"  色彩规则: {len(color_rules)} 条 → {path}")

    # 3. 单品兼容性
    compat_rules = generate_item_compatibility()
    path = os.path.join(OUTPUT_DIR, "item_compatibility.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(compat_rules, f, ensure_ascii=False, indent=2)
    print(f"  单品兼容性: {len(compat_rules)} 条 → {path}")

    # 4. 天气穿搭
    weather_rules = generate_weather_outfit_rules()
    path = os.path.join(OUTPUT_DIR, "weather_outfit_rules.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(weather_rules, f, ensure_ascii=False, indent=2)
    print(f"  天气穿搭: {len(weather_rules)} 条 → {path}")

    # 5. 趋势规则
    trend_rules = generate_trend_rules()
    path = os.path.join(OUTPUT_DIR, "trend_rules.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(trend_rules, f, ensure_ascii=False, indent=2)
    print(f"  趋势规则: 1 组 → {path}")

    total = len(body_rules) + len(color_rules) + len(compat_rules) + len(weather_rules)
    print(f"\n总计生成 {total} 条规则（趋势规则为单组）")
    print("完成！")


if __name__ == "__main__":
    main()
