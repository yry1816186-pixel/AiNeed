# 任务11: 时尚规则场景差异化重写 + 面料知识库 + 中国特有场景

## 你的角色

你是寻裳(AiNeed)项目的时尚知识工程师。项目位于 C:\AiNeed。

## 背景

审计发现现有时尚规则大量模板批量生成，不同场合的tips完全相同。需要：

1. 为body_type_rules.json重写场合差异化策略
2. 创建面料知识库（当前完全缺失）
3. 添加中国特有场景规则

## 必读文件

1. `ml/data/fashion_rules/body_type_rules.json` — 完整读取
2. `ml/data/fashion_rules/color_season_rules.json` — 读取business和date场景对比
3. `ml/data/fashion_rules/item_compatibility.json` — 读取当前兼容性规则
4. `ml/data/fashion_rules/` — 用ls查看所有规则文件

## 任务

### 1. 重写 body_type_rules.json 场景差异化

为5种体型 x 8种场合重写策略(strategy)、推荐色(recommended_colors)、tips。

**关键原则**：

- 每种体型在不同场合应有不同的策略表述（不只是换了场合名）
- 推荐色应根据场合变化（面试偏深色/中性色，约会可暖色/亮色）
- tips要具体到单品类型、面料、版型

示例（沙漏型）：

**面试场景**：

- strategy: "含蓄展现曲线，传达专业可靠形象"
- recommended_colors: ["#2C3E50", "#1A1A2E", "#3D3D3D", "#4A4A4A"]
- tips: ["选收腰西装外套配铅笔裙，含蓄展现X型优势", "避免过于紧身，面试装合身但不紧绷", "V领或方领衬衫适度展现锁骨"]

**约会场景**：

- strategy: "大胆展现曲线，传达温暖亲和形象"
- recommended_colors: ["#FF6B6B", "#F0C987", "#B8E0D2", "#E8A0BF"]
- tips: ["贴身针织连衣裙完美展现沙漏型曲线", "腰带搭配放大腰线优势，选细皮带(2-3cm宽)", "铅笔裙长度在膝盖略上，配尖头高跟鞋拉长腿部"]

**为所有5种体型 × 8种场合做同样的差异化处理。**

### 2. 创建面料知识库

创建 `ml/data/fashion_rules/fabric_rules.json`：

```json
{
  "fabrics": {
    "cotton": {
      "name": "棉",
      "nameEn": "Cotton",
      "properties": {
        "breathability": 0.9,
        "stretch": 0.3,
        "formality": 0.4,
        "drape": 0.5,
        "seasons": ["spring", "summer", "autumn"]
      },
      "bodyTypeFit": {
        "hourglass": { "suitable": true, "note": "适合所有棉质单品" },
        "rectangle": { "suitable": true, "note": "选硬挺棉质增加轮廓感" },
        "triangle": { "suitable": true, "note": "上身可用棉质增加量感" },
        "inverted_triangle": { "suitable": true, "note": "下身硬挺棉质增加下半身体积" },
        "oval": {
          "suitable": true,
          "note": "选柔软棉质贴合曲线",
          "avoid": "过硬的厚棉布增加体积感"
        }
      },
      "care": ["可机洗", "低温烘干", "易皱需熨烫"]
    },
    "silk": {
      "name": "真丝",
      "nameEn": "Silk",
      "properties": {
        "breathability": 0.7,
        "stretch": 0.2,
        "formality": 0.9,
        "drape": 0.95,
        "seasons": ["spring", "summer", "autumn"]
      },
      "bodyTypeFit": {
        "oval": { "suitable": true, "note": "垂感面料自然遮盖腹部", "bestFor": "衬衫、连衣裙" }
      },
      "care": ["手洗或干洗", "不可拧干", "低温熨烫"]
    }
  },
  "fabricCompatibility": {
    "cotton_denim": { "score": 0.9, "note": "经典休闲搭配" },
    "silk_denim": { "score": 0.4, "note": "风格冲突，正式vs休闲" },
    "wool_cotton": { "score": 0.85, "note": "秋冬经典叠穿" },
    "silk_wool": { "score": 0.8, "note": "高级感搭配" },
    "linen_cotton": { "score": 0.85, "note": "夏日自然风" },
    "chiffon_denim": { "score": 0.7, "note": "柔美与硬朗的对比搭配" },
    "knit_leather": { "score": 0.75, "note": "秋冬质感搭配" }
  }
}
```

至少覆盖15种面料：棉、涤纶、真丝、羊毛、亚麻、雪纺、皮革、针织、牛仔、缎面、天鹅绒、蕾丝、尼龙、氨纶、粗花呢。

### 3. 创建中国特有场景规则

创建 `ml/data/fashion_rules/chinese_occasion_rules.json`：

```json
{
  "occasions": {
    "annual_party": {
      "name": "年会",
      "nameEn": "Annual Party",
      "description": "中国职场特有的年终社交场合",
      "strategies": {
        "female": {
          "core": "有仪式感但不抢领导风头，展现团队融入感",
          "dress_code": "小礼服或精致连衣裙，长度膝盖上下",
          "color_principle": "可选酒红、墨绿、藏青等稳重亮色，避免纯黑(太沉闷)和纯白(太突出)",
          "tips": [
            "年会不是走红毯，选有设计感但不夸张的款式",
            "避免露背/深V/超短裙等过于性感的款式",
            "小黑裙+亮色配饰是安全选择",
            "如果需要表演节目，准备方便活动的款式",
            "妆容偏精致但不宜过浓"
          ]
        }
      },
      "bodyTypeNotes": {
        "hourglass": "收腰A字连衣裙，长度膝盖上方2-3cm",
        "triangle": "上身亮色有设计感+下身深色A字裙",
        "rectangle": "用腰带创造腰线，选有层次感的裙装",
        "inverted_triangle": "V领上衣+阔腿裤套装，平衡上下身比例",
        "oval": "Empire waist连衣裙+小外套，展露手臂和锁骨"
      }
    },
    "blind_date": {
      "name": "相亲",
      "nameEn": "Blind Date",
      "description": "需展现适合结婚的形象，不是追求性感",
      "strategies": {
        "female": {
          "core": "传达温柔、稳重、有品位的形象",
          "dress_code": "知性优雅风，避免过于时尚或过于朴素",
          "color_principle": "暖色系为主(米色/浅粉/驼色)，传达温暖亲和感",
          "tips": [
            "避免过于暴露或性感的款式——传达错误信号",
            "淡妆比浓妆更适合——显得自然不做作",
            "选有品质感的面料——体现生活品质",
            "配饰简约精致——不要过多或过于夸张",
            "鞋子选舒适的——可能需要走一段路"
          ]
        }
      }
    },
    "meet_parents": {
      "name": "见家长",
      "nameEn": "Meeting Parents",
      "description": "需传达稳重温柔得体的形象",
      "strategies": {
        "female": {
          "core": "传达稳重、温柔、顾家的形象",
          "dress_code": "保守但精致，不过于时尚也不朴素",
          "color_principle": "偏暖偏柔(米白/浅粉/浅蓝/浅驼)，避免黑色(显冷漠)和大红(太张扬)",
          "tips": [
            "长辈喜欢干净利落的形象——头发整齐、指甲干净",
            "裙装比裤装更讨长辈喜欢",
            "避免破洞牛仔裤、超短裙、露脐装",
            "淡妆即可——浓妆在长辈眼中不得体",
            "可带一份小礼物，穿有口袋的衣服方便拿取"
          ]
        }
      }
    },
    "soe_interview": {
      "name": "国企面试",
      "nameEn": "SOE Interview",
      "description": "与外企面试完全不同的着装要求",
      "strategies": {
        "female": {
          "core": "保守正式，避免任何个性张扬",
          "dress_code": "深色西装套装或及膝裙装",
          "color_principle": "深蓝/深灰/黑色为主，白衬衫打底，避免任何亮色",
          "tips": [
            "国企面试比外企更保守——不要追求时尚感",
            "裙装必须过膝——不能太短",
            "避免牛仔裤、运动鞋、夸张配饰",
            "头发扎起来显得精神干练",
            "淡妆或素颜——浓妆会被认为不踏实"
          ]
        }
      }
    },
    "spring_festival": {
      "name": "春节",
      "nameEn": "Spring Festival",
      "description": "喜庆但不过度的节日着装",
      "strategies": {
        "female": {
          "core": "喜庆温暖，融入节日氛围但不俗气",
          "color_principle": "红色系为主(酒红/砖红)，配金色/驼色点缀",
          "avoid_colors": ["#FFFFFF", "#000000", "#4A4A4A"],
          "tips": [
            "红色不一定是正红——酒红/砖红更高级",
            "避免全身白色——春节不吉利",
            "可融入新中式元素(盘扣/刺绣细节)",
            "舒适为主——可能需要拜年走动",
            "准备一件红色单品(围巾/外套)即可"
          ]
        }
      }
    },
    "graduation": {
      "name": "毕业季",
      "nameEn": "Graduation",
      "description": "学士服搭配+毕业照穿搭",
      "strategies": {
        "female": {
          "core": "学士服内搭要上镜，毕业照要出彩",
          "dress_code": "学士服内搭白色衬衫+及膝裙",
          "tips": [
            "学士服内搭以浅色为主——深色在学士服下看不见",
            "白色衬衫是最安全的选择",
            "裙长要过膝——学士服掀起时不会走光",
            "鞋子选低跟或平底——拍照要站很久",
            "可准备一套换装——学士服照拍完换上美美的裙子拍写真"
          ]
        }
      }
    }
  }
}
```

### 4. 更新 item_compatibility.json

扩展兼容性规则从74对到至少200对：

- 增加上装+外套的组合（如衬衫+西装外套、针织衫+风衣）
- 增加配饰组合（项链+领口类型、包包+服装风格）
- 增加季节适配维度

## 验证标准

- [ ] body_type_rules.json 每种体型的8种场合有不同的strategy和tips
- [ ] fabric_rules.json 创建，覆盖15+种面料
- [ ] fabric_rules.json 包含面料-体型适配和面料间兼容性
- [ ] chinese_occasion_rules.json 包含6个中国特有场景
- [ ] item_compatibility.json 扩展到200+对
- [ ] 所有JSON文件格式正确（用 `python -c "import json; json.load(open('file'))"` 验证）
