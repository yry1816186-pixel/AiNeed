# AiNeed V3 - Phase 0 市场调研与种子数据执行计划

> **版本**: 3.3 | **日期**: 2026-04-12 | **性质**: Phase 0执行蓝图
> **前置**: 00-PROJECT-CONSTITUTION.md, 03-CORE-AI-DEEP-DIVE.md
> **Phase 0目标**: 产出种子数据文件+执行文档，为Phase 1-5提供数据基础

---

## 一、决策记录

| # | 决策点 | 选择 | 理由 |
|---|--------|------|------|
| 1 | 数据采集 | 三管齐下：小红书+公开数据集+LLM合成 | 覆盖面最广，互补性强 |
| 2 | 知识图谱种子 | LLM自动提取+人工审核 | 速度快(1-2天)，成本低(~200元) |
| 3 | Embedding生成 | RTX 4060本地GPU批量 | 零成本，50K商品~25分钟 |
| 4 | 标注质量 | 纯LLM双模型验证(GLM-5+DeepSeek) | 零人工成本，高置信度筛选 |
| 5 | Phase衔接 | 严格分离，数据延后导入 | Phase 0只产出文件，Phase 2导入 |
| 6 | 执行方式 | 写执行计划文档 | 后续由Trae/Claude按计划自动执行 |

---

## 二、Phase 0 任务清单

### Task P0-1: 公开数据集获取 (Day 1, ~2小时)

**负责人**: 自动执行脚本
**产出**: `data/raw/` 目录下的原始数据文件

```
数据集清单:
  1. Polyvore Outfits (21K搭配)
     - 来源: HuggingFace (mvasil/polyvore-outfits)
     - 用途: GNN搭配兼容性训练 + 搭配规则提取
     - 存储: data/raw/polyvore/

  2. DeepFashion2 (491K图)
     - 来源: GitHub (switchablenorms/DeepFashion2)
     - 用途: 属性标注/检测模型训练
     - 存储: data/raw/deepfashion2/

  3. Amazon Review Fashion (~30M)
     - 来源: jmcauley.ucsd.edu/data/amazon/
     - 用途: SASRec序列推荐训练
     - 存储: data/raw/amazon/

  4. iMaterialist (1M+图)
     - 来源: Kaggle
     - 用途: 属性标注辅助
     - 存储: data/raw/imaterialist/
```

**执行脚本**: `scripts/p0_download_datasets.sh`

```bash
#!/bin/bash
# Phase 0 - 公开数据集下载脚本
# 在有足够磁盘空间的环境执行(需~100GB)

mkdir -p data/raw/{polyvore,deepfashion2,amazon,imaterialist}

# 1. Polyvore Outfits
echo "Downloading Polyvore Outfits..."
huggingface-cli download mvasil/polyvore-outfits --repo-type dataset --local-dir data/raw/polyvore/

# 2. DeepFashion2 (需手动申请或从镜像下载)
echo "DeepFashion2: 请从官方GitHub获取下载链接"
# wget -O data/raw/deepfashion2/train.zip <URL>

# 3. Amazon Review
echo "Downloading Amazon Review Fashion..."
wget -O data/raw/amazon/fashion.json.gz https://jmcauley.ucsd.edu/data/amazon_v2/categoryFilesSmall/Fashion.json.gz

# 4. iMaterialist (需Kaggle API)
echo "iMaterialist: 使用 kaggle competitions download -c imaterialist-fashion-2020-fgvc7"
```

---

### Task P0-2: 小红书OOTD数据采集 (Day 1-2)

**负责人**: 爬虫脚本 + LLM提取
**产出**: `data/raw/xiaohongshu/` + `data/processed/xhs_rules.json`
**风险**: 版权灰色地带，仅提取规则不保留原图

```
采集策略:
  关键词: OOTD, 日常穿搭, 通勤穿搭, 约会穿搭, 面试穿搭,
          国潮穿搭, 新中式, 韩系穿搭, 小个子穿搭, 微胖穿搭, 梨形身材穿搭
  目标: 10K帖子 → LLM提取 → ~3000条搭配规则

  工具: scrapy + playwright

  流程:
    1. 爬取公开帖子(文字+标签+点赞数，不保存原图)
    2. GLM-5提取搭配规则(适用的体型/场合/风格/颜色)
    3. DeepSeek验证规则质量(置信度评分)
    4. 只保留置信度>0.8的规则

  合规措施:
    - 不保存原始图片URL
    - 不保存用户个人信息
    - 只保留结构化搭配规则
    - 标注数据来源为"公开时尚内容"
    - 原始帖子数据提取后删除
```

**执行脚本**: `scripts/p0_scrape_xhs.py`

```python
# scripts/p0_scrape_xhs.py
# Phase 0 - 小红书OOTD数据采集
# 注意: 仅提取结构化规则，不保留原始内容

KEYWORDS = [
    "OOTD", "日常穿搭", "通勤穿搭", "约会穿搭",
    "面试穿搭", "国潮穿搭", "新中式", "韩系穿搭",
    "小个子穿搭", "微胖穿搭", "梨形身材穿搭"
]

TARGET_POSTS = 10000  # 目标帖子数
EXTRACTED_RULES_TARGET = 3000  # 目标规则数
CONFIDENCE_THRESHOLD = 0.8  # 规则置信度阈值

async def main():
    # Step 1: 爬取帖子
    posts = await scrape_posts(KEYWORDS, max_per_keyword=1000)

    # Step 2: GLM-5提取规则
    rules = []
    for batch in chunk(posts, batch_size=20):
        batch_rules = await glm5_extract_rules(batch)
        rules.extend(batch_rules)

    # Step 3: DeepSeek质量验证
    verified_rules = []
    for rule in rules:
        quality = await deepseek_verify_rule(rule)
        if quality["confidence"] >= CONFIDENCE_THRESHOLD:
            rule["confidence"] = quality["confidence"]
            rule["verification_notes"] = quality["notes"]
            verified_rules.append(rule)

    # Step 4: 保存(删除原始帖子数据)
    save_json(verified_rules, "data/processed/xhs_rules.json")
    # 原始帖子数据已在上一步处理中不保留
```

---

### Task P0-3: LLM合成搭配数据 (Day 2, ~4小时)

**负责人**: GLM-5 API调用脚本
**产出**: `data/processed/llm_synthetic_rules.json` + `data/processed/llm_outfit_descriptions.json`
**成本**: ~500元API费

```
合成策略:
  1. 搭配规则合成 (目标: 5000条)
     - 基于色彩学理论(互补色/类似色/三角色)
     - 基于体型学(5种体型×各类服装的适合/避免)
     - 基于场合(通勤/约会/运动/宴会等×风格搭配)
     - 基于季节(春夏秋冬×面料/色彩推荐)

  2. 中文搭配描述合成 (目标: 10000条)
     - 模拟AI造型师的推荐话术
     - 涵盖各种体型+场合+风格组合
     - 用于后续LLM微调数据(如果需要)

  3. 双模型验证
     - GLM-5生成 → DeepSeek验证
     - 只保留置信度>0.8的规则
```

**执行脚本**: `scripts/p0_llm_synthesize.py`

```python
# scripts/p0_llm_synthesize.py
# Phase 0 - LLM合成搭配数据

RULE_CATEGORIES = {
    "color": "色彩搭配规则(互补色/类似色/三角色/禁忌色)",
    "body_type": "体型搭配规则(沙漏/梨/苹果/直筒/倒三角)",
    "occasion": "场合搭配规则(通勤/休闲/约会/运动/宴会/面试)",
    "season": "季节搭配规则(春/夏/秋/冬×面料/色彩)",
    "style": "风格搭配规则(简约/街头/国潮/韩系/日系/商务/复古)"
}

TARGET_RULES_PER_CATEGORY = 1000
TOTAL_TARGET = 5000

async def synthesize_rules():
    """GLM-5批量生成搭配规则"""
    all_rules = []

    for category, description in RULE_CATEGORIES.items():
        prompt = f"""
        你是一位资深时尚造型师，请生成{description}相关的搭配规则。

        每条规则格式:
        {{
          "category": "{category}",
          "rule_type": "do|dont|tip",
          "condition": {{"body_type": "...", "occasion": "...", ...}},
          "recommendation": "具体建议内容",
          "reasoning": "为什么这样搭配"
        }}

        请生成100条{category}类规则，确保覆盖各种场景。
        """
        rules = await glm5_chat(prompt)
        all_rules.extend(rules)

    return all_rules

async def verify_rules(rules):
    """DeepSeek验证规则质量"""
    verified = []
    for batch in chunk(rules, batch_size=10):
        prompt = f"""
        评估以下时尚搭配规则的质量和准确性。
        对每条规则给出1-10的置信度评分和理由。

        规则列表:
        {json.dumps(batch, ensure_ascii=False)}

        输出JSON数组: [{{"index": 0, "confidence": 8.5, "notes": "..."}}]
        """
        evaluations = await deepseek_chat(prompt)
        for rule, eval in zip(batch, evaluations):
            if eval["confidence"] >= 7.0:  # 双模型阈值
                rule["confidence"] = eval["confidence"] / 10.0
                rule["verification"] = eval["notes"]
                verified.append(rule)

    return verified
```

---

### Task P0-4: 淘宝商品数据采集 (Day 2-3)

**负责人**: 淘宝开放平台API / 数据供应商
**产出**: `data/raw/taobao/` + `data/processed/taobao_items.json`
**目标**: 50K商品

```
采集策略:
  方案A(优先): 淘宝开放平台API
    - 需要申请开发者账号
    - 合规，数据质量高
    - 覆盖所有服装分类

  方案B(备选): 合法数据供应商
    - 如数据堂、聚合数据等
    - 成本约¥2000-5000

  采集字段:
    商品名称, 价格, 品牌, 分类, 主图URLs, 描述,
    材质, 尺码表, 评价关键词, 月销量

  数据清洗:
    - 去重(按商品ID)
    - 过滤: 无图片/无描述/价格异常
    - 统一分类标签
    - 目标: 50K高质量商品记录
```

---

### Task P0-5: 数据清洗与处理Pipeline (Day 3)

**负责人**: Python处理脚本
**产出**: `data/processed/` 下清洗后的数据文件

```
Pipeline流程:
  data/raw/ → [清洗] → [标注] → [向量化] → data/processed/

  清洗步骤:
    1. 去重(图片哈希 + 商品ID)
    2. 过滤(无图/无描述/价格异常)
    3. 统一命名规范
    4. 分类标签标准化

  标注步骤(GLM-5自动):
    1. 基础属性: DeepFashion2预训练模型
    2. 扩展属性: GLM-5根据图片+文本
    3. 质量验证: DeepSeek双模型评估

  向量化步骤(RTX 4060本地):
    1. FashionCLIP: 图片→512d视觉向量
    2. BGE-M3: 描述→1024d文本向量
    3. 保存为.parquet格式(Qdrant导入用)

  预计时间:
    - 清洗: ~1小时
    - LLM标注: ~3小时(API调用)
    - 向量化: ~25分钟(RTX 4060)
```

**执行脚本**: `scripts/p0_process_pipeline.py`

```python
# scripts/p0_process_pipeline.py
# Phase 0 - 数据处理Pipeline

async def run_pipeline():
    # Step 1: 清洗
    clean_data = clean_all_sources([
        "data/raw/polyvore/",
        "data/raw/taobao/",
        "data/raw/amazon/",
    ])

    # Step 2: LLM标注
    annotated = await llm_annotate(clean_data)
    verified = await deepseek_verify(annotated)

    # Step 3: 向量化(本地GPU)
    visual_embeddings = batch_fashionclip(verified["images"])
    text_embeddings = batch_bge_m3(verified["descriptions"])

    # Step 4: 保存
    save_parquet(visual_embeddings, "data/processed/visual_embeddings.parquet")
    save_parquet(text_embeddings, "data/processed/text_embeddings.parquet")
    save_json(verified, "data/processed/annotated_items.json")
```

---

### Task P0-6: Neo4j知识图谱种子数据 (Day 3)

**负责人**: LLM提取 + 脚本写入
**产出**: `data/kg/seed_rules.json` + `data/kg/import_neo4j.cypher`

```
种子规则来源:
  1. LLM自动提取(GLM-5):
     - 色彩学规则: 互补色/类似色/三角色/中性色百搭 (200+条)
     - 体型规则: 5种体型×各类服装适合/避免 (300+条)
     - 场合规则: 6种场合×风格要求×禁忌 (200+条)
     - 季节规则: 4季×面料/色彩推荐 (100+条)
     - 风格规则: 7种风格×搭配建议 (200+条)

  2. 公开数据集规则:
     - Polyvore搭配数据分析(统计高频组合)
     - 生成"X与Y经常搭配"的规则

  3. 质量验证:
     - DeepSeek评估每条规则置信度
     - 只保留置信度>0.8
     - 目标: 1000+条高质量规则

  写入脚本:
    - 生成Cypher导入脚本
    - 后续在Phase 2执行导入
```

**执行脚本**: `scripts/p0_kg_seeds.py`

```python
# scripts/p0_kg_seeds.py
# Phase 0 - 知识图谱种子数据生成

async def generate_kg_seeds():
    # Step 1: LLM提取各分类规则
    categories = ["color", "body_type", "occasion", "season", "style"]
    all_rules = []

    for category in categories:
        rules = await glm5_extract_category_rules(category, count=200)
        all_rules.extend(rules)

    # Step 2: DeepSeek验证
    verified = []
    for batch in chunk(all_rules, batch_size=20):
        evals = await deepseek_verify_batch(batch)
        for rule, eval_result in zip(batch, evals):
            if eval_result["confidence"] >= 0.8:
                rule["confidence"] = eval_result["confidence"]
                verified.append(rule)

    # Step 3: 转换为Neo4j Cypher
    cypher_script = generate_cypher(verified)

    # Step 4: 保存
    save_json(verified, "data/kg/seed_rules.json")
    save_text(cypher_script, "data/kg/import_neo4j.cypher")

    print(f"Generated {len(verified)} rules (from {len(all_rules)} candidates)")
```

---

### Task P0-7: Embedding批量生成 (Day 3)

**负责人**: 本地Python脚本(RTX 4060)
**产出**: `data/processed/visual_embeddings.parquet` + `data/processed/text_embeddings.parquet`

```
模型:
  - FashionCLIP (~400M参数): 图片→512d视觉向量
  - BGE-M3 (~560M参数): 文本→1024d文本向量

硬件: RTX 4060 (8GB VRAM)

批量参数:
  - batch_size: 32 (FashionCLIP), 64 (BGE-M3)
  - 精度: FP16
  - 预计速度: ~50ms/图(FashionCLIP), ~10ms/文本(BGE-M3)

时间估算:
  - 50K商品图片: ~25分钟
  - 50K商品描述: ~8分钟
  - 总计: ~35分钟

输出格式:
  - Parquet文件(列: id, embedding, metadata)
  - 后续Phase 2导入Qdrant
```

**执行脚本**: `scripts/p0_generate_embeddings.py`

```python
# scripts/p0_generate_embeddings.py
# Phase 0 - 向量嵌入批量生成

import torch
from fashionclip import FashionCLIP
from bge_m3 import BGEM3

def generate_visual_embeddings(items, batch_size=32):
    """FashionCLIP: 图片→512d向量"""
    model = FashionCLIP.load_pretrained()
    model.to("cuda")
    model.eval()

    embeddings = []
    for batch in chunk(items, batch_size):
        images = [load_image(item["image_url"]) for item in batch]
        with torch.no_grad(), torch.cuda.amp.autocast():
            batch_emb = model.encode_image(images)
        embeddings.extend(batch_emb.cpu().numpy())

    return embeddings

def generate_text_embeddings(items, batch_size=64):
    """BGE-M3: 文本→1024d向量"""
    model = BGEM3.load_pretrained()
    model.to("cuda")
    model.eval()

    texts = [item["description"] for item in items]
    embeddings = model.encode(texts, batch_size=batch_size)

    return embeddings

def main():
    items = load_json("data/processed/annotated_items.json")

    print(f"Generating visual embeddings for {len(items)} items...")
    visual_emb = generate_visual_embeddings(items)
    save_parquet(visual_emb, "data/processed/visual_embeddings.parquet")

    print(f"Generating text embeddings for {len(items)} items...")
    text_emb = generate_text_embeddings(items)
    save_parquet(text_emb, "data/processed/text_embeddings.parquet")

    print("Done!")
```

---

## 三、执行时间线

```
Day 1:
  上午: P0-1 公开数据集下载 (自动)
  上午: P0-2 小红书爬取启动 (自动)
  下午: P0-3 LLM合成启动 (API调用)

Day 2:
  上午: P0-2 小红书数据LLM提取+验证
  上午: P0-3 LLM合成完成+验证
  下午: P0-4 淘宝商品数据采集

Day 3:
  上午: P0-5 数据清洗Pipeline
  上午: P0-6 Neo4j知识图谱种子生成
  下午: P0-7 Embedding批量生成(RTX 4060)
  下午: 产出物验收

总预计时间: 3天
总预计成本: ~¥2,700 (API费~¥700 + 数据采购~¥2,000)
```

---

## 四、产出物清单

| 产出物 | 路径 | 说明 |
|--------|------|------|
| 公开数据集 | `data/raw/` | Polyvore/DeepFashion2/Amazon/iMaterialist |
| 小红书规则 | `data/processed/xhs_rules.json` | ~3000条LLM提取搭配规则 |
| LLM合成规则 | `data/processed/llm_synthetic_rules.json` | ~5000条合成规则 |
| LLM搭配描述 | `data/processed/llm_outfit_descriptions.json` | ~10000条中文搭配描述 |
| 淘宝商品数据 | `data/processed/taobao_items.json` | ~50K清洗后商品 |
| 清洗后商品 | `data/processed/annotated_items.json` | 含属性标注的商品数据 |
| 视觉向量 | `data/processed/visual_embeddings.parquet` | FashionCLIP 512d向量 |
| 文本向量 | `data/processed/text_embeddings.parquet` | BGE-M3 1024d向量 |
| 知识图谱规则 | `data/kg/seed_rules.json` | ~1000+条Neo4j种子规则 |
| Neo4j导入脚本 | `data/kg/import_neo4j.cypher` | Cypher写入脚本 |
| 执行脚本 | `scripts/p0_*.py` | 所有Phase 0执行脚本 |

---

## 五、质量标准

1. **数据覆盖**: 服装分类覆盖率>90%(上装/下装/外套/鞋履/配饰/连衣裙)
2. **规则质量**: 所有规则经双模型验证，置信度≥0.8
3. **向量质量**: FashionCLIP embedding余弦相似度验证(同类>0.85)
4. **数据脱敏**: 不含用户个人信息，不含原始图片URL
5. **可复现**: 所有脚本参数化，可重复执行

---

*本文档为AiNeed V3 Phase 0的执行蓝图。所有任务可由Trae/Claude Code自动执行。*
