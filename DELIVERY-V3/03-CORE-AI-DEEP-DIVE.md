# AiNeed V3 - 核心AI技术深度方案

> **版本**: 3.3 | **日期**: 2026-04-12 | **性质**: 技术实施蓝图
> **前置**: 阅读 00-PROJECT-CONSTITUTION.md 和 02-VTO-RESEARCH.md

---

> **V3.3 重要更新说明**
>
> 以下章节在V3.3中已**标记为废弃/延后**，仅作为Phase B(Phase 5+)参考保留:
> - ~~1.2节 SMPLify-X 3D人体重建~~ → 已移除，体型数据存储在users表JSONB字段
> - ~~1.2节 YOLOv8-pose 人体检测~~ → 已移除，MVP用Agent模式调LLM API
> - ~~1.2节 AnyDressing 多件试穿~~ → 已移除，改用GLM-5文生图API
> - ~~1.2节 DWPose 2D关键点~~ → 已移除，MVP不使用关键点检测
> - ~~3A节 Body Analysis Pipeline中的YOLOv8+SAM+SMPLify-X~~ → 延后到Phase 5+
> - ~~四、Phase B 真实照片VTO~~ → 延后到Phase 5+
>
> **MVP实际使用**: GLM-5 Agent模式(AI造型师) + GLM-5文生图API(搭配可视化) + react-native-skia(Q版形象)
> 详见 00-PROJECT-CONSTITUTION.md 4.1-4.5节

---

## 一、算法与训练细节

### 1.1 整体算法架构

```
                    ┌──────────────────────────────┐
                    │         用户输入层             │
                    │  照片/文本/行为/偏好/场合       │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │         用户理解层             │
                    │  人体分析/体型分类/色彩季型     │
                    │  意图提取/槽位填充              │
                    └──────────────┬───────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
   ┌──────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
   │   知识约束层       │ │   候选生成层     │ │   趋势信号层     │
   │   Neo4j图查询      │ │   Qdrant向量搜索  │ │   实时爬取分析   │
   │   硬约束/软约束    │ │   5通道召回       │ │   热点/流行度    │
   └──────────┬────────┘ └────────┬────────┘ └────────┬────────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │         排序与生成层           │
                    │  GNN兼容性评分                 │
                    │  Beam Search全局优化           │
                    │  GLM-5自然语言表达             │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │         视觉生成层             │
                    │  Phase A: 文生图搭配可视化     │
                    │  Phase B: 真实照片VTO          │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │         输出与反馈层           │
                    │  搭配方案 + 试衣图 + 文字说明  │
                    │  用户行为 → 反馈优化           │
                    └──────────────────────────────┘
```

### 1.2 各模块模型选型

| 模块 | 模型 | 参数量 | 用途 | 训练需求 |
|------|------|--------|------|----------|
| 人体检测 | YOLOv8-pose | ~50M | 从照片中检测人体和关键点 | 预训练即可，不需微调 |
| 3D人体重建 | SMPLify-X | ~50M | 从2D恢复3D body mesh | 预训练即可 |
| 测量提取 | SMPL-Anthropometry | - | 从mesh提取围度 | 规则引擎，无需训练 |
| 肤色分析 | 自研分类器 | ~1M | 肤色→色彩季型 | 需标注~2K样本 |
| 视觉嵌入 | FashionCLIP | ~400M | 服装图片→512d向量 | 预训练+中文微调 |
| 文本嵌入 | BGE-M3 | ~560M | 中文文本→1024d向量 | 预训练即可 |
| 搭配兼容性 | NGNN/FGAT | ~10M | 搭配方案兼容性评分 | Polyvore数据集训练 |
| 序列推荐 | SASRec | ~5M | 用户行为序列建模 | 行为数据训练 |
| 多件试穿 | AnyDressing/OutfitAnyone/IDM-VTON | ~2B+ | 多件服装同时试穿 | VITON-HD+DressCode微调 |
| 2D关键点 | DWPose | ~300M | 全身133关键点检测 | 预训练即可 |
| 3D人体重建 | SMPLify-X | ~50M | 2D照片→3D body mesh | 预训练即可 |
| 背景分离 | SAM/rembg | ~90M | 人物背景去除 | 预训练即可 |
| 文生图搭配 | GLM-5 API | 云端 | 体型条件搭配效果图 | Prompt工程 |
| 意图提取 | GLM-5 API | 云端 | 用户消息→结构化意图 | Prompt工程 |
| 搭配表达 | GLM-5 API | 云端 | 结构化方案→自然语言 | Prompt工程 |

### 1.3 训练计划

#### Phase A: 基线模型 (Week 1-2, 服务器: 1xA100 40GB)

```
Task A1: FashionCLIP中文微调
  数据: DeepFashion2 + 自建中文属性标注(5000张)
  方法: LoRA微调，学习率1e-5，batch=32
  目标: 中文服装描述的嵌入质量提升
  硬件: 1xA100 40GB, ~6小时
  产出: FashionCLIP-CN模型

Task A2: 搭配兼容性GNN训练
  数据: Polyvore 21K搭配数据集
  方法: NGNN架构，pairwise + global兼容性联合训练
  目标: FITB准确率>65%, Compatibility AUC>0.85
  硬件: 1xRTX 4060即可, ~12小时
  产出: outfit-compatibility-gnn模型

Task A3: SASRec序列推荐训练
  数据: Amazon Review(时尚类) + 合成交互数据
  方法: 标准SASRec + 双通道门控融合
  目标: HitRate@10 > 0.30
  硬件: 1xRTX 4060即可, ~8小时
  产出: sasrec-fashion模型
```

#### Phase B: 核心模型微调 (Week 3-4, 服务器: 4xA100 80GB)

```
Task B1: 配置VTO模型(AnyDressing/OutfitAnyone)
  数据: 选择商用API(初期)或自训模型(后期)
  方法: 
    - 商用API集成(Phase A)
    - 或基于官方预训练权重微调(Phase B)
    - 中国人体型适配数据集(目标5K)
  目标: 
    - 3件同时试穿
    - 保留面部特征
    - 高质量图像生成
  硬件: 4xA100 80GB 或 API服务
  产出: VTO推理服务

Task B2: 色彩季型分类器训练
  数据: 自建标注~2000张(12类×~170张/类)
  方法: ResNet50 backbone + 自定义分类头
  目标: 准确率>85%
  硬件: 1xRTX 4060, ~4小时
  产出: color-season-classifier模型
```

#### Phase C: 融合与优化 (Week 5-6)

```
Task C1: 推荐融合权重优化
  方法: A/B测试不同融合权重，用 Thompson Sampling 自动优化
  硬件: 无需GPU

Task C2: 用户画像建模
  方法: 基于身体分析+行为数据构建4层画像
  硬件: 无需GPU

Task C3: 端到端评测
  方法: 完整流程测试(意图→生成→试衣→展示)
  指标: 用户满意度 / 搭配合理度 / 试衣质量
```

---

## 二、数据集实操细节

### 2.1 数据集获取清单

| 数据集 | 规模 | 获取方式 | 存储位置 | 用于训练 |
|--------|------|----------|----------|----------|
| Polyvore Outfits | 21K搭配 | [HuggingFace](https://huggingface.co/datasets/mvasil/polyvore-outfits) 直接下载 | data/raw/polyvore/ | GNN兼容性 |
| DeepFashion2 | 491K图 | [官方GitHub](https://github.com/switchablenorms/DeepFashion2) | data/raw/deepfashion2/ | 属性标注/检测 |
| VITON-HD | 13K对 | [官方页面](https://rishiu.github.io/VITON-HD/) 申请 | data/raw/viton-hd/ | VTO模型训练 |
| DressCode | 5.4K对 | [GitHub](https://github.com/aimagelab/dress-code) | data/raw/dresscode/ | VTO多类别 |
| Amazon Review | ~30M | [Amazon Review Dataset](https://jmcauley.ucsd.edu/data/amazon/) | data/raw/amazon/ | SASRec序列推荐 |
| iMaterialist | 1M+图 | [Kaggle](https://www.kaggle.com/c/imaterialist-fashion-2020-fgvc7) | data/raw/imaterialist/ | 属性标注 |

### 2.2 中文数据采集实操

#### 小红书OOTD数据

```python
# 采集流程 (伪代码)
# 工具: scrapy + playwright

# Step 1: 搜索关键词列表
keywords = [
  "OOTD", "日常穿搭", "通勤穿搭", "约会穿搭",
  "面试穿搭", "国潮穿搭", "新中式", "韩系穿搭",
  "小个子穿搭", "微胖穿搭", "梨形身材穿搭"
]

# Step 2: 爬取帖子
for keyword in keywords:
    posts = scrape_xiaohongshu(keyword, max_posts=1000)
    # 每个帖子: 图片URLs + 文本描述 + 标签 + 点赞数

# Step 3: LLM提取搭配规则
for post in posts:
    rules = llm_extract_rules(post.text, post.tags)
    # 提取: 适用的体型/场合/风格/颜色搭配规则

# Step 4: 人工审核 (抽样10%)
verified_rules = human_review(rules, sample_rate=0.1)

# 目标: 100K帖子 → ~5000条搭配规则
```

#### 淘宝商品数据

```python
# 通过淘宝开放平台API获取
# 或用合法的数据供应商

# 采集字段:
fields = [
  "商品名称", "价格", "原价", "品牌", "分类",
  "主图URLs", "描述", "材质", "尺码表",
  "评价关键词", "月销量"
]

# 目标: 50K商品 (覆盖所有分类)
# 质量: 过滤掉无图片/无描述/价格异常的数据
```

### 2.3 数据标注流程

#### 搭配兼容性标注

```
标注任务: 给定2-5件服装，判断搭配兼容性(1-5分)

标注来源:
  1. Polyvore已有标注 (21K搭配，正样本)
  2. 随机组合作为负样本 (同数量)
  3. LLM预标注 + 人工校验

标注工具: Label Studio (自部署)
标注员: 时尚专业学生/博主 (兼职)
成本: ~¥2-5/条 × 10K条 = ¥20K-50K
```

#### 服装属性标注

```
标注任务: 给定服装图片，标注以下属性

必标属性:
  - 性别: 男/女/中性
  - 分类: 上装/下装/外套/鞋履/配饰/连衣裙
  - 颜色: 主色+辅色
  - 季节: 春/夏/秋/冬 (多选)
  - 场合: 通勤/休闲/运动/约会/宴会/面试 (多选)
  - 风格: 简约/街头/国潮/韩系/日系/商务/复古...

可选属性(通过LLM自动标注):
  - 材质: 棉/涤纶/丝绸/羊毛...
  - 版型: 修身/常规/宽松/oversized
  - 图案: 纯色/条纹/格子/印花...

工具: 
  1. 基础属性: DeepFashion2预训练模型自动标注
  2. 扩展属性: GLM-5根据图片+文本自动标注
  3. 人工审核: 抽样20%校验准确率
```

### 2.4 数据处理Pipeline

```
原始数据 (data/raw/)
    ↓
[清洗] data/scripts/clean.py
  - 去重(按图片哈希)
  - 去除无图/无描述/价格异常
  - 统一命名规范
    ↓
[标注] data/scripts/annotate.py
  - 自动属性标注(模型+LLM)
  - 人工标注任务生成
  - 标注结果合并
    ↓
[向量化] data/scripts/embed.py
  - FashionCLIP: 图片→512d视觉向量
  - BGE-M3: 描述→1024d文本向量
  - 存储: Qdrant + PostgreSQL
    ↓
[训练集划分] data/scripts/split.py
  - 训练/验证/测试 = 80/10/10
  - 按用户/搭配分层采样
  - 避免数据泄露
    ↓
处理后的数据 (data/processed/)
```

---

## 三、知识图谱构建实操

### 3.1 Neo4j Schema设计

```cypher
// 节点类型
// 1. 色彩规则
CREATE CONSTRAINT color_rule_id IF NOT EXISTS
FOR (r:ColorRule) REQUIRE r.id IS UNIQUE;

// 2. 场合规则
CREATE CONSTRAINT occasion_rule_id IF NOT EXISTS
FOR (r:OccasionRule) REQUIRE r.id IS UNIQUE;

// 3. 体型规则
CREATE CONSTRAINT body_type_rule_id IF NOT EXISTS
FOR (r:BodyTypeRule) REQUIRE r.id IS UNIQUE;

// 4. 季节规则
CREATE CONSTRAINT season_rule_id IF NOT EXISTS
FOR (r:SeasonRule) REQUIRE r.id IS UNIQUE;

// 5. 风格流派
CREATE CONSTRAINT style_id IF NOT EXISTS
FOR (s:Style) REQUIRE s.id IS UNIQUE;

// 6. 面料知识
CREATE CONSTRAINT fabric_id IF NOT EXISTS
FOR (f:Fabric) REQUIRE f.id IS UNIQUE;

// 7. 单品模板
CREATE CONSTRAINT item_template_id IF NOT EXISTS
FOR (t:ItemTemplate) REQUIRE t.id IS UNIQUE;

// 8. 趋势热点
CREATE CONSTRAINT trend_id IF NOT EXISTS
FOR (t:Trend) REQUIRE t.id IS UNIQUE;

// 9. 服装商品 (关联商品库)
CREATE CONSTRAINT clothing_id IF NOT EXISTS
FOR (c:Clothing) REQUIRE c.id IS UNIQUE;

// 10. 色彩
CREATE CONSTRAINT color_id IF NOT EXISTS
FOR (c:Color) REQUIRE c.id IS UNIQUE;
```

### 3.2 关系类型

```cypher
// 搭配兼容关系
(:Color)-[:COMPLEMENTS {strength: 0.9}]->(:Color)       // 互补色
(:Color)-[:SIMILAR_TO {strength: 0.8}]->(:Color)         // 类似色
(:Color)-[:CONFLICTS_WITH {strength: 0.9}]->(:Color)     // 色彩冲突
(:Style)-[:PAIRS_WELL_WITH {strength: 0.7}]->(:Style)    // 风格搭配

// 适用性关系
(:OccasionRule)-[:REQUIRES]->(:Style)                     // 场合要求风格
(:OccasionRule)-[:FORBIDS]->(:Clothing)                   // 场合禁忌
(:BodyTypeRule)-[:SUITABLE_FOR]->(:Clothing)              // 体型适合
(:BodyTypeRule)-[:AVOID_FOR]->(:Clothing)                 // 体型避免
(:SeasonRule)-[:RECOMMENDS_FABRIC]->(:Fabric)             // 季节推荐面料
(:SeasonRule)-[:RECOMMENDS_COLOR]->(:Color)               // 季节推荐色彩

// 趋势关系
(:Trend)-[:FEATURES]->(:Style)                            // 趋势包含风格
(:Trend)-[:POPULARIZES]->(:Clothing)                      // 趋势推红单品
(:Trend)-[:TRENDING_IN]->(:OccasionRule)                  // 趋势关联场合

// 商品关联
(:Clothing)-[:BELONGS_TO_STYLE]->(:Style)
(:Clothing)-[:MADE_OF]->(:Fabric)
(:Clothing)-[:HAS_COLOR]->(:Color)
(:Clothing)-[:SUITABLE_FOR_OCCASION]->(:OccasionRule)
(:Clothing)-[:SUITABLE_FOR_SEASON]->(:SeasonRule)
```

### 3.3 种子数据写入脚本

```python
# data/kg/seed_color_rules.py

COLOR_COMPATIBILITY_RULES = [
    # 互补色 (complementary)
    {"from": "navy_blue", "to": "camel", "type": "COMPLEMENTS", "strength": 0.9,
     "reason": "海军蓝+驼色是经典商务搭配，沉稳有品味"},
    {"from": "black", "to": "white", "type": "COMPLEMENTS", "strength": 0.95,
     "reason": "黑白配是永恒经典，适合所有场合"},
    
    # 色彩禁忌
    {"from": "bright_red", "to": "bright_green", "type": "CONFLICTS_WITH", "strength": 0.85,
     "reason": "大面积红绿撞色难以驾驭，建议用深色调(酒红+墨绿)替代"},
    {"from": "neon_pink", "to": "neon_orange", "type": "CONFLICTS_WITH", "strength": 0.7,
     "reason": "两个荧光色过于刺眼，搭配缺乏层次"},
    
    # 中性色百搭
    {"from": "black", "to": "gray", "type": "COMPLEMENTS", "strength": 0.85,
     "reason": "黑灰搭配低调有质感"},
    {"from": "white", "to": "beige", "type": "COMPLEMENTS", "strength": 0.8,
     "reason": "白+米色温柔干净，适合春夏"},
    # ... 更多规则
]

BODY_TYPE_RULES = [
    # 沙漏型
    {"body_type": "hourglass", "item_type": "dress", "action": "SUITABLE_FOR",
     "recommendation": "收腰连衣裙完美展现沙漏身材曲线",
     "examples": ["裹身裙", "A字裙", "铅笔裙"]},
    {"body_type": "hourglass", "item_type": "oversized_top", "action": "AVOID_FOR",
     "recommendation": "oversized上装会遮盖身材优势，建议选修身款",
     "alternatives": ["修身针织", "收腰衬衫"]},
    
    # 苹果型
    {"body_type": "apple", "item_type": "high_waist_pants", "action": "SUITABLE_FOR",
     "recommendation": "高腰裤提升腰线，优化苹果型身材比例",
     "examples": ["高腰阔腿裤", "高腰直筒裤"]},
    # ... 更多规则
]
```

### 3.4 LLM知识提取Pipeline

```python
# data/kg/llm_extract_rules.py

async def extract_rules_from_article(article_text: str) -> list[dict]:
    """从时尚文章中用LLM提取搭配规则"""
    
    prompt = f"""
    从以下时尚文章中提取搭配规则。每条规则包含:
    - category: color/occasion/body_type/season/style
    - rule_type: do/dont/tip
    - condition: 触发条件(JSON)
    - recommendation: 建议内容
    
    文章内容:
    {article_text}
    
    输出JSON数组格式。
    """
    
    response = await glm5_client.chat(prompt)
    rules = json.loads(response)
    
    # 验证规则格式
    validated = []
    for rule in rules:
        if validate_rule_format(rule):
            rule["source"] = "llm_extract"
            rule["confidence"] = 0.7  # LLM提取的置信度
            validated.append(rule)
    
    return validated

# 使用: 批量处理爬取的时尚文章
# 目标: 1000篇文章 → 3000+条规则
```

### 3.5 实时趋势更新

```python
# data/kg/trend_updater.py (每日运行)

async def daily_trend_update():
    """每日更新时尚趋势"""
    
    # Step 1: 爬取热搜/热榜
    trends_weibo = scrape_weibo_hot("时尚")
    trends_xhs = scrape_xiaohongshu_hot("穿搭")
    
    # Step 2: LLM分析趋势
    all_trends = trends_weibo + trends_xhs
    for trend in all_trends:
        analysis = await glm5_client.analyze_trend(trend)
        # 提取: 风格关键词/热门单品/搭配方式
        
        # Step 3: 写入Neo4j
        neo4j_client.create_trend_node(
            id=f"trend_{date}_{trend.id}",
            name=analysis.name,
            keywords=analysis.keywords,
            hot_items=analysis.hot_items,
            style_matches=analysis.styles,
            ttl=30  # 趋势30天过期
        )
    
    # Step 4: 更新推荐权重
    # 热门趋势的单品在推荐中获得加权
```

---

## 3A. 身体精准分析与用户画像建模

### 3A.1 Body Analysis Pipeline

```
用户全身照 (轻度引导: 文字提示正面全身+光线充足)
    │
    ├─ 1) 人物检测 + 背景分离 (YOLOv8 + SAM)
    │     └─ 质量评分: 不合格→提示重拍
    ├─ 2) 2D关键点检测 (DWPose, 133个身体点)
    ├─ 3) 3D人体重建 (SMPLify-X)
    │     输出: SMPL-X参数
    │       · shape β₁-β₁₀: 10个体型参数
    │       · pose θ: 55个关节角度
    │     推理: ~5-10秒 (GPU)
    ├─ 4) 测量提取 (从3D mesh)
    │     · 胸围/腰围/臀围 (误差±3-5cm)
    │     · 肩宽/臂长/腿长
    │     · 体型分类: 5种(沙漏/梨/苹果/直筒/倒三角)
    │     · 置信度评分
    ├─ 5) 肤色分析 → 12种色彩季型
    └─ 6) 存储
```

### 3A.2 Pipeline实现

```python
# pipeline/body_analysis.py

class BodyAnalysisPipeline:
    def __init__(self):
        self.detector = YOLOv8Detector()
        self.segmentor = SAMSegmentor()
        self.pose_estimator = DWPose()
        self.reconstructor = SMPLifyX()
        self.measurer = BodyMeasurementExtractor()
        self.color_analyzer = SkinToneClassifier()
    
    async def analyze(self, image_path: str, user_id: str) -> dict:
        """完整的身体分析流程"""
        
        # 1. 人物检测 + 背景分离
        detection = await self.detector.detect(image_path)
        if detection.confidence < 0.8:
            raise ValueError("图片质量不合格，请重拍")
        
        segmentation = await self.segmentor.segment(image_path, detection)
        
        # 2. 2D关键点检测
        keypoints_2d = await self.pose_estimator.estimate(image_path)
        
        # 3. 3D人体重建
        smpl_params = await self.reconstructor.reconstruct(
            keypoints_2d, image_path
        )
        
        # 4. 测量提取
        measurements = await self.measurer.extract(smpl_params)
        
        # 5. 肤色分析
        skin_tone = await self.color_analyzer.analyze(image_path)
        color_season = self._map_to_season(skin_tone)
        
        # 6. 存储到数据库
        profile = {
            "user_id": user_id,
            "body_measurements": measurements,
            "body_type": measurements["body_type"],
            "color_season": color_season,
            "confidence": measurements["confidence"],
            "updated_at": datetime.now(),
            "raw_data": {
                "smpl_params": smpl_params,
                "keypoints_2d": keypoints_2d,
                "segmentation": segmentation
            }
        }
        
        await self._save_profile(profile)
        return profile
```

### 3A.3 精确测量算法

```python
# measurement/extractor.py

class BodyMeasurementExtractor:
    def extract(self, smpl_params: dict) -> dict:
        """从SMPL参数提取身体测量值"""
        
        # 获取SMPL形状参数
        betas = smpl_params["betas"]  # β₁-β₁₀
        
        # 标准体型参数转换为实际测量值
        measurements = {}
        
        # 基础测量 (单位: cm)
        measurements["height"] = smpl_params["height"] * 100
        
        # 基于β参数估算三围
        # 公式来自SMPL论文 + 中国人体校准数据
        measurements["bust"] = self._estimate_bust(betas)
        measurements["waist"] = self._estimate_waist(betas)
        measurements["hips"] = self._estimate_hips(betas)
        
        # 肩宽/臂长/腿长
        measurements["shoulder_width"] = self._estimate_shoulder(betas)
        measurements["arm_length"] = self._estimate_arm(betas)
        measurements["leg_length"] = self._estimate_leg(betas)
        
        # 体型分类
        measurements["body_type"] = self._classify_body_type(measurements)
        
        # 置信度评分
        measurements["confidence"] = self._calculate_confidence(
            smpl_params["beta_confidence"],
            measurements["body_type_confidence"]
        )
        
        return measurements
    
    def _estimate_bust(self, betas):
        # β₁: 整体体型, β₂-β₄: 胸部参数
        base_bust = 88 + betas[0] * 8  # 基础胸围
        bust_modification = betas[1] * 4 + betas[2] * 2
        return base_bust + bust_modification
    
    def _classify_body_type(self, measurements):
        """5种体型分类"""
        bust = measurements["bust"]
        waist = measurements["waist"]
        hips = measurements["hips"]
        
        ratio_bust_waist = bust / waist
        ratio_waist_hips = waist / hips
        
        if abs(ratio_bust_waist - 1.0) < 0.1 and abs(ratio_waist_hips - 1.0) < 0.1:
            return "hourglass"
        elif hips > bust + 5 and hips > waist + 5:
            return "pear"
        elif bust > waist + 10 and bust > hips + 5:
            return "apple"
        elif abs(bust - hips) < 5 and abs(waist - (bust + hips)/2) < 5:
            return "straight"
        else:
            return "inverted_triangle"
```

### 3A.4 肤色分析

```python
# color/analysis.py

class SkinToneClassifier:
    def __init__(self):
        # 加载预训练模型
        self.model = load_model("skin_tone_resnet50")
        self.color_seasons = {
            0: "春季淡暖",
            1: "春季深暖", 
            2: "春季冷调",
            3: "春季暖调",
            4: "夏季淡冷",
            5: "夏季深冷",
            6: "夏季冷调",
            7: "夏季暖调",
            8: "秋季暖调",
            9: "秋季冷调",
            10: "冬季暖调",
            11: "冬季冷调"
        }
    
    async def analyze(self, image_path: str) -> dict:
        """分析肤色并映射到12种色彩季型"""
        
        # 提取面部区域
        face_region = extract_face_region(image_path)
        
        # 计算平均肤色值
        avg_rgb = calculate_average_color(face_region)
        
        # 转换到HSV/HSL用于色相分析
        h, s, v = rgb_to_hsv(avg_rgb)
        
        # 预测
        features = extract_color_features(avg_rgb)
        season_id = self.model.predict([features])[0]
        
        return {
            "rgb": avg_rgb,
            "hsv": {"h": h, "s": s, "v": v},
            "season": self.color_seasons[season_id],
            "season_id": season_id,
            "confidence": self.model.predict_proba([features])[0][season_id]
        }
    
    def _get_recommended_colors(self, season_id):
        """基于季型推荐适合的色彩"""
        color_map = {
            0: # 春季淡暖
                {"base": ["珊瑚色", "薄荷绿", "淡蓝"],
                 "accent": ["淡黄", "橙色"],
                 "avoid": ["深紫", "墨绿"]},
            4: # 夏季淡冷
                {"base": ["淡粉", "水蓝", "淡紫"],
                 "accent": ["浅灰", "银色"],
                 "avoid": ["金黄", "正红"]}
            # ... 其他季节
        }
        return color_map.get(season_id, {})
```

### 3A.5 用户画像建模 (4 Layers)

```
Layer 1: 生理画像 (Body Profile)
  · SMPL shape参数 β₁-β₁₀
  · 精确测量值(三围/肩宽/腿长)
  · 体型分类 + 肤色季型 + 置信度
  · 更新: 每次新照片

Layer 2: 审美画像 (Style Profile)
  · 风格偏好/场合需求/颜色倾向/预算/品牌
  · 更新: 每周重新评估

Layer 3: 行为画像 (Behavior Profile)
  · 浏览/互动/AI对话关键词/季节习惯
  · 更新: 实时

Layer 4: 3D身体模型 (VTO专用, Phase B)
  · SMPL-X完整参数
  · 更新: 积累3-5张照片后升级
```

### 3A.6 画像更新机制

```python
# profile/updater.py

class UserProfileUpdater:
    def __init__(self):
        self.body_profile = BodyProfile()
        self.style_profile = StyleProfile()
        self.behavior_profile = BehaviorProfile()
    
    async def update_user_profile(self, user_id: str, event_data: dict):
        """根据不同事件更新用户画像"""
        
        if event_data["event_type"] == "photo_upload":
            # 更新生理画像
            await self._update_body_profile(user_id, event_data["image_path"])
        
        elif event_data["event_type"] == "interaction":
            # 更新行为画像
            await self._update_behavior_profile(user_id, event_data)
        
        elif event_data["event_type"] == "feedback":
            # 更新审美画像
            await self._update_style_profile(user_id, event_data["feedback"])
    
    async def _update_body_profile(self, user_id, image_path):
        """定期重新评估生理画像"""
        # 每3个月或新照片时更新
        last_update = await self._get_last_body_update(user_id)
        time_diff = datetime.now() - last_update
        
        if time_diff.days > 90 or "new_photo" in event_data:
            new_profile = await BodyAnalysisPipeline().analyze(image_path, user_id)
            await self._save_body_profile(user_id, new_profile)
    
    async def _update_behavior_profile(self, user_id, event_data):
        """实时更新行为画像"""
        # 浏览商品记录
        if event_data["type"] == "browse":
            item_id = event_data["item_id"]
            await self._record_browse_behavior(user_id, item_id)
        
        # AI对话关键词
        elif event_data["type"] == "chat":
            keywords = extract_keywords(event_data["message"])
            await self._record_chat_keywords(user_id, keywords)
    
    async def _update_style_profile(self, user_id, feedback):
        """基于反馈更新审美偏好"""
        # 正面反馈 +1, 负面反馈 -1
        weight = feedback["weight"]
        category = feedback["category"]
        
        await self._adjust_preference(user_id, category, weight)
```

---

## 四、试衣模型微调与部署

### Phase A: 体型条件文生图搭配可视化 (MVP)

#### GLM-5文生图实现

```python
# vto/phase_a_text_to_image.py

class TextToImageTryOn:
    def __init__(self):
        self.model = "glm-5"
        self.cache = RedisCache()
        self.prompt_template = """
用户数据:
  体型: {body_type}, 身高{height}, 胸围范围{chest_range}
  肤色季型: {color_season}
  搭配方案: {outfit_description}

生成Prompt:
  "A fashion editorial photo of a {body_type_description} woman, 
   {height}cm tall, wearing {outfit_details}. {color_season} coloring.
   Clean studio background, professional fashion photography style, 
   full body shot, natural lighting."
        """
    
    async def generate_outfit_visualization(self, user_profile: dict, outfit: dict) -> dict:
        """生成体感条件的试衣效果图"""
        
        # 1. 检查缓存
        cache_key = self._generate_cache_key(user_profile, outfit)
        cached_result = await self.cache.get(cache_key)
        if cached_result:
            return cached_result
        
        # 2. 构建prompt
        prompt = self._build_prompt(user_profile, outfit)
        
        # 3. 调用GLM-5 API
        try:
            result = await self._call_glm5_image_generation(prompt)
            
            # 4. 缓存结果 (TTL 24h)
            await self.cache.set(
                cache_key, 
                result, 
                ttl=24*60*60
            )
            
            return result
            
        except Exception as e:
            # API失败时fallback到纯文本推荐
            return {
                "success": False,
                "fallback": True,
                "text_recommendation": self._generate_text_fallback(user_profile, outfit),
                "error": str(e)
            }
    
    def _build_prompt(self, user_profile, outfit):
        """构建文生图prompt"""
        body_type_desc = {
            "hourglass": "slender hourglass figure with defined waist",
            "pear": "pear-shaped figure with fuller hips and slim waist",
            "apple": "apple-shaped figure with fuller midsection",
            "straight": "straight figure with minimal curves",
            "inverted_triangle": "inverted triangle with broader shoulders"
        }[user_profile["body_type"]]
        
        return self.prompt_template.format(
            body_type=user_profile["body_type"],
            height=user_profile["height"],
            chest_range=user_profile.get("chest_range", "85-90"),
            color_season=user_profile["color_season"],
            outfit_description=outfit["description"],
            body_type_description=body_type_desc,
            outfit_details=outfit["details"]
        )
    
    async def _call_glm5_image_generation(self, prompt: str) -> dict:
        """调用GLM-5文生图API"""
        api_key = os.getenv("GLM5_API_KEY")
        
        response = requests.post(
            "https://open.bigmodel.cn/api/paas/v4/images/generations",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "glm-5",
                "prompt": prompt,
                "n": 1,
                "size": "1024x768",
                "quality": "hd"
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            return {
                "success": True,
                "image_url": result["data"][0]["url"],
                "image_base64": result["data"][0]["b64_image"],
                "cost": 0.02  # ~0.02 CNY/image
            }
        else:
            raise Exception(f"GLM-5 API error: {response.text}")
    
    def _generate_text_fallback(self, user_profile, outfit):
        """生成纯文本推荐作为fallback"""
        return f"""
针对您的{user_profile['body_type']}体型，我们推荐：
{outfit['details']}

搭配建议：{outfit['recommendations']}
颜色方案：{outfit['color_scheme']}
"""
```

#### 成本控制

```python
# vto/cost_manager.py

class TryOnCostManager:
    def __init__(self):
        self.base_cost_per_image = 0.02  # CNY
        self.daily_budget = 10  # ¥10/天
        self.monthly_budget = 300  # ¥300/月
        self.glm5_api_key = os.getenv("GLM5_API_KEY")
    
    async def check_daily_budget(self, user_id: str) -> bool:
        """检查用户当日预算"""
        today = datetime.now().strftime("%Y-%m-%d")
        daily_usage = await self._get_daily_usage(user_id, today)
        
        return daily_usage < self.daily_budget
    
    async def estimate_monthly_cost(self, daily_users: int, usage_rate: float = 0.3) -> dict:
        """预估月度成本"""
        daily_images = daily_users * usage_rate * 2  # 每位用户平均2次/天
        monthly_cost = daily_images * self.base_cost_per_image * 30
        
        return {
            "daily_images": daily_images,
            "daily_cost": daily_images * self.base_cost_per_image,
            "monthly_cost": monthly_cost,
            "budget_status": "within_budget" if monthly_cost < self.monthly_budget else "exceeding_budget"
        }
    
    async def smart_retry(self, user_id: str, max_retries: int = 3):
        """智能重试策略"""
        for attempt in range(max_retries):
            try:
                if await self.check_daily_budget(user_id):
                    # 正常调用
                    return await self._generate_image(user_id)
                else:
                    # 预算超限，返回fallback
                    return await self._generate_text_fallback(user_id)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                await asyncio.sleep(2 ** attempt)  # 指数退避
```

### Phase B: 真实照片换装VTO (Phase 5+)

#### GPU策略切换

```python
# vto/phase_b_vto.py

class VTOService:
    def __init__(self):
        self.user_threshold = 1000  # 用户数阈值
        self.current_strategy = None
        self.provider = None
    
    def set_gpu_strategy(self, user_count: int):
        """根据用户量动态切换GPU策略"""
        if user_count < self.user_threshold:
            # 用户量少，使用API服务
            self.current_strategy = "api"
            self.provider = self._init_api_provider()
        else:
            # 用户量大，自建GPU集群
            self.current_strategy = "self_hosted"
            self.provider = self._init_self_hosted()
    
    async def try_on(self, user_image: str, garments: list, options: dict):
        """统一VTO接口"""
        if self.current_strategy == "api":
            # API服务 (按量计费)
            result = await self.provider.try_on_api(user_image, garments, options)
            result["cost_per_image"] = 0.50  # ~0.50 CNY/image
        else:
            # 自建服务 (固定月费)
            result = await self.provider.try_on_self_hosted(user_image, garments, options)
            result["cost_per_image"] = 0  # 包含在月费中
        
        # 人脸融合
        if options.get("preserve_face", True):
            result["image_with_face"] = await self._face_fusion(
                user_image, result["image"]
            )
        
        # 超分辨率处理
        if options.get("high_resolution", True):
            result["image_hr"] = await self._super_resolution(result["image"])
        
        return result
    
    def _init_api_provider(self):
        """初始化API提供商 (OutfitAnyone/IDM-VTON)"""
        providers = [
            {
                "name": "OutfitAnyone",
                "api_endpoint": "https://api.outfitanyone.com/v1/tryon",
                "cost_per_image": 0.50,
                "quality_score": 9.0
            },
            {
                "name": "IDM-VTON", 
                "api_endpoint": "https://api.idmvton.com/v1/tryon",
                "cost_per_image": 0.40,
                "quality_score": 8.5
            }
        ]
        return APIService(providers[0])  # 选择最优的
    
    def _init_self_hosted(self):
        """初始化自建GPU服务"""
        return SelfHostedVTO(
            model_path="/models/idmvton",
            gpu_count=4,
            batch_size=2
        )
```

#### 用户照片要求

```python
# vto/photo_requirements.py

class PhotoValidator:
    def __init__(self):
        self.min_resolution = (800, 1200)  # 最小分辨率
        self.max_file_size = 5 * 1024 * 1024  # 5MB
        self.allowed_formats = ["jpg", "jpeg", "png"]
    
    async def validate_photo(self, image_path: str) -> dict:
        """验证用户照片是否符合VTO要求"""
        
        checks = {
            "resolution": self._check_resolution(image_path),
            "file_size": self._check_file_size(image_path),
            "format": self._check_format(image_path),
            "lighting": self._check_lighting(image_path),
            "pose": self._check_pose(image_path)
        }
        
        failed_checks = [k for k, v in checks.items() if not v["pass"]]
        
        if failed_checks:
            return {
                "valid": False,
                "failed_checks": failed_checks,
                "suggestions": [checks[k]["suggestion"] for k in failed_checks]
            }
        
        return {"valid": True, "checks": checks}
    
    def _check_lighting(self, image_path):
        """检查光线条件"""
        img = cv2.imread(image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 计算亮度分布
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist / hist.sum()  # 归一化
        
        # 检查是否有过曝或欠曝区域
        overexposed = hist[200:].sum() > 0.2
        underexposed = hist[:50].sum() > 0.2
        
        if overexposed or underexposed:
            return {
                "pass": False,
                "suggestion": "光线不理想，建议在光线充足的室内拍照，避免强光直射或阴影"
            }
        
        return {"pass": True}
    
    def _check_pose(self, image_path):
        """检查姿势是否适合VTO"""
        # 使用YOLO检测人体
        results = self.pose_detector(image_path)
        
        if len(results) == 0:
            return {
                "pass": False,
                "suggestion": "未检测到人体，请确保照片中包含全身"
            }
        
        # 检查是否为正面姿势
        bbox = results[0]["bbox"]
        bbox_aspect = bbox[2] / bbox[3]  # width/height
        
        if bbox_aspect < 0.5:
            return {
                "pass": False,
                "suggestion": "请拍摄正面全身照，不要拍侧面或斜面"
            }
        
        return {"pass": True}
```

### 4.2 推理部署架构

```
                    ┌─────────────────────────────────────┐
                    │           FastAPI (:8001)            │
                    │                                     │
                    │  POST /api/v1/tryon/phase_a          │
                    │  - 生成基于GLM-5的搭配效果图         │
                    │                                     │
                    │  POST /api/v1/tryon/phase_b          │
                    │  - 真实照片VTO (按用户量选择策略)    │
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │         推理Pipeline                 │
                    │                                     │
                    │  Phase A流程:                        │
                    │  1. 身体分析                         │
                    │  2. 生成GLM-5 prompt                 │
                    │  3. 文生图API调用                    │
                    │  4. 结果缓存                         │
                    │                                     │
                    │  Phase B流程:                        │
                    │  1. 用户照片验证                     │
                    │  2. GPU策略选择                      │
                    │  3. VTO模型推理                      │
                    │  4. 人脸融合+超分辨率                 │
                    │                                     │
                    │  5. 结果存储 (MinIO + PostgreSQL)      │
                    │  6. Redis缓存 (TTL 24h)             │
                    └─────────────────────────────────────┘
```

---

## 五、服务器配置清单

### 5.1 训练阶段(AutoDL按需)

| 阶段 | 配置 | 时长 | 估计成本 |
|------|------|------|----------|
| FashionCLIP微调 | 1×A100 40GB | 6小时 | ¥30 |
| GNN搭配训练 | 本地RTX 4060 | 12小时 | ¥0 |
| SASRec训练 | 本地RTX 4060 | 8小时 | ¥0 |
| 色彩分类器 | 本地RTX 4060 | 4小时 | ¥0 |
| **总计** | | | **~¥30** |

### 5.2 生产推理(AutoDL包月或自购)

| 配置 | 用途 | 月成本 |
|------|------|--------|
| 1×A100 80GB | SMPLify-X + VTO推理(Phase B) | ¥15,000-20,000 |
| PostgreSQL + Redis + MinIO | 数据服务(阿里云) | ¥500-1,000 |
| Qdrant | 向量搜索(自建或云) | ¥0-500 |
| Neo4j | 知识图谱 | ¥0(社区版) |
| GLM-5 API | Phase A文生图调用 | ¥10-100(当前用量) |
| **总计** | | **¥16,000-21,600/月** |

**Phase A成本**: ~¥10-100/月 (按实际用量)
**Phase B成本**: ¥15,000-20,000/月 (自建GPU)

---

## 六、技术风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| SMPLify-X精度风险 | 中 | 高 | 结合传统测量数据校正，误差控制在±5cm内 |
| 光线条件影响分析准确度 | 中 | 中 | 照片质量验证+提示用户正确拍照姿势 |
| 文生图prompt质量风险 | 中 | 中 | 建立prompt模板库+用户反馈优化 |
| 动态GPU切换操作复杂度 | 低 | 中 | 自动化监控+告警机制，预设多个策略 |
| VTO模型面部融合失败 | 低 | 中 | 保留原图+使用多个融合算法选择最佳结果 |
| API服务稳定性风险 | 低 | 高 | 多云服务商+本地缓存+自动降级 |

---

*本文档为AiNeed V3核心AI技术的实施蓝图。所有方案基于2026年最新研究成果。*