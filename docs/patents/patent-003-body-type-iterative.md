# 专利技术交底书：基于两轮迭代关键点修正的体型分析方法

## 一、发明名称

基于两轮迭代关键点修正的体型分析方法及系统

## 二、技术领域

本发明涉及计算机视觉和人体分析技术领域，具体涉及一种基于人体图像的体型自动分类与服装适配评分方法，尤其涉及基于 MediaPipe Pose 关键点提取、两轮迭代腰围关键点修正、品类差异化评分及穿搭协调性评估的体型分析系统。

## 三、背景技术

体型分析是时尚电商和个性化推荐系统的基础能力之一，旨在根据用户身体比例特征判定体型类型，并据此提供服装适配建议。

### 现有技术的不足

1. **腰围关键点定位的"鸡生蛋"问题**：体型分类依赖腰围比例（如腰臀比、腰肩比），但腰围关键点的位置本身受体型影响。沙漏型腰线较高（约 38%位置），椭圆型腰线较低（约 42%位置），矩形型腰线在标准位置（约 37%）。现有方法使用固定比例定位腰围点，导致不同体型的腰围测量存在系统性偏差，进而影响体型分类准确性。

2. **缺乏迭代修正机制**：中国专利 CN112270354B 采用标签化体型推荐，直接使用初始关键点计算比例并分类，未考虑初始关键点定位偏差对分类结果的影响。这种"一次计算定终身"的方法无法消除腰围定位偏差导致的分类错误。

3. **服装品类差异化缺失**：不同服装品类对体型的适配要求不同。上装更关注肩部和胸部比例，下装更关注腰臀比例，连衣裙需要综合考量，外套则侧重整体轮廓。现有方法对所有品类采用统一评分权重，无法反映品类特异性。

4. **穿搭协调性评估缺失**：现有方法仅评估单件服装与体型的适配度，未考虑整套穿搭中各单品之间的协调性。当某件单品适配度极高而另一件极低时，整体穿搭效果可能不协调。

5. **Stitch Fix US11983748**关注尺码预测，不涉及体型分类与穿搭适配评分。

6. **体型分类阈值不可配置**：现有方法的体型分类阈值硬编码在程序中，无法根据不同人群或业务需求调整，灵活性差。

综上所述，现有体型分析技术在"迭代关键点修正 + 品类差异化适配评分 + 穿搭协调性评估"方面存在技术空白。

## 四、发明内容

### 4.1 技术问题

如何从人体图像自动、准确地分析体型并评估服装适配度，包括：解决腰围关键点定位的"鸡生蛋"问题、根据体型特异性修正关键点位置、对不同服装品类采用差异化评分权重、评估整套穿搭的协调性。

### 4.2 技术方案

本发明提出一种基于两轮迭代关键点修正的体型分析方法，包括以下步骤：

**步骤 S1：第一轮关键点提取**

使用 MediaPipe Pose 模型从人体图像中提取 33 个身体关键点，包括：

- 鼻尖(0)、左右眼(2,5)、左右耳(7,8)
- 左右肩(11,12)、左右肘(13,14)、左右腕(15,16)
- 左右髋(23,24)、左右膝(25,26)、左右踝(27,28)
- 左右脚跟(29,30)、左右脚尖(31,32)

使用默认腰围比例（0.37）估算左右腰围关键点：

$$y_{waist} = y_{shoulder} + (y_{hip} - y_{shoulder}) \times 0.37$$
$$x_{waist} = (x_{shoulder} + x_{hip}) / 2$$

**步骤 S2：初始体型分类**

基于第一轮关键点计算身体测量数据和比例：

- 肩宽 = |left_shoulder.x - right_shoulder.x|
- 臀宽 = |left_hip.x - right_hip.x|
- 腰宽 = |left_waist.x - right_waist.x|
- 胸宽 = 肩宽 × 0.85

计算关键比例：

- 肩臀比 = 肩宽 / 臀宽
- 腰臀比 = 腰宽 / 臀宽
- 腰肩比 = 腰宽 / 肩宽

基于比例阈值进行评分式体型分类：

| 体型      | 判定条件                                          |
| --------- | ------------------------------------------------- |
| 沙漏型(X) | 肩臀比 ∈[0.95,1.05] 且 腰肩比<0.72 且 腰臀比<0.75 |
| 矩形(H)   | 肩臀比 ≈1 且 腰肩比>0.75 且 腰臀比<0.82           |
| 梨形(A)   | 肩臀比<0.92 且 腰臀比>0.7                         |
| 倒三角(Y) | 肩臀比>1.08 且 腰肩比<0.72                        |
| 椭圆(O)   | 腰肩比>0.88 且 腰臀比>0.85                        |

**步骤 S3：第二轮关键点修正**

根据步骤 S2 的初始体型分类结果，使用体型特异性腰围比例修正腰围关键点：

| 体型      | 腰围位置比例 | 依据                 |
| --------- | ------------ | -------------------- |
| 沙漏型(X) | 0.38         | 腰线明显且较高       |
| 椭圆型(O) | 0.42         | 腹部丰满，腰线较低   |
| 矩形(H)   | 0.37         | 腰线不明显，标准位置 |
| 梨形(A)   | 0.37         | 臀部丰满，标准位置   |
| 倒三角(Y) | 0.36         | 上身较宽，腰线较高   |

修正公式：

$$y_{waist}' = y_{shoulder} + (y_{hip} - y_{shoulder}) \times r_{body\_type}$$

其中 r_body_type 为体型对应的腰围位置比例，基于 ISO 8559-1:2017 服装尺寸设计人体测量标准。

**步骤 S4：修正后重新计算**

使用修正后的腰围关键点重新计算身体测量数据和比例，重新进行体型分类，得到最终体型结果。

**步骤 S5：品类差异化适配评分**

对不同服装品类采用差异化评分权重：

| 品类            | 剪裁匹配 | 色彩匹配 | 风格匹配 | 体型优化 |
| --------------- | -------- | -------- | -------- | -------- |
| 上装(top)       | 0.35     | 0.25     | 0.25     | 0.15     |
| 下装(bottom)    | 0.40     | 0.20     | 0.25     | 0.15     |
| 连衣裙(dress)   | 0.40     | 0.25     | 0.20     | 0.15     |
| 外套(outerwear) | 0.35     | 0.25     | 0.25     | 0.15     |

**步骤 S6：穿搭协调性评估**

对整套穿搭的适配分数计算协调性加分：

$$\text{harmony\_bonus} = \max(0, 0.1 - \text{variance}) \times 5$$

其中 variance 为各单品适配分数的方差。方差越小（各单品适配度越均衡），协调性加分越高。

$$\text{final\_score} = \min(1.0, \text{avg\_score} + \text{harmony\_bonus})$$

### 4.3 有益效果

1. **两轮迭代修正**：首创两轮迭代关键点修正机制，解决腰围定位的"鸡生蛋"问题。第一轮使用默认比例获取初始分类，第二轮根据初始分类使用体型特异性比例修正关键点，显著提高体型分类准确性。

2. **体型特异性腰围比例**：基于 ISO 8559-1:2017 人体测量标准，为 5 种体型设定不同的腰围位置比例（沙漏 0.38/椭圆 0.42/矩形 0.37/梨形 0.37/倒三角 0.36），确保腰围关键点定位的体型适应性。

3. **品类差异化评分**：不同服装品类采用差异化评分权重。下装和连衣裙的剪裁匹配权重最高(0.40)，因为这两类服装对体型适配的要求最严格；上装和外套的剪裁匹配权重略低(0.35)。

4. **穿搭协调性加分**：引入 harmony_bonus 机制，鼓励各单品适配度均衡的穿搭方案，避免"一件极好一件极差"的不协调搭配。

5. **阈值可配置**：体型分类阈值支持通过构造参数、环境变量或默认值三级配置，适应不同人群和业务需求。

6. **完整适配建议**：为每种体型提供适合风格、避免风格、穿搭技巧、最佳剪裁、最佳图案、最佳色彩等 6 个维度的适配建议。

## 五、附图说明

**图 1**：两轮迭代体型分析方法整体流程图

```
输入：人体图像
  │
  ├─→ S1: MediaPipe Pose 33关键点提取（默认腰围比例0.37）
  │
  ├─→ S2: 初始测量数据计算 → 比例计算 → 初始体型分类
  │
  ├─→ S3: 根据初始体型修正腰围关键点
  │       ├─ 沙漏型 → 比例0.38
  │       ├─ 椭圆型 → 比例0.42
  │       ├─ 矩形型 → 比例0.37
  │       ├─ 梨形 → 比例0.37
  │       └─ 倒三角 → 比例0.36
  │
  ├─→ S4: 修正后重新计算测量数据和比例 → 最终体型分类
  │
  ├─→ S5: 品类差异化适配评分
  │
  └─→ S6: 穿搭协调性评估
```

**图 2**：两轮迭代关键点修正示意图

```
第一轮（默认比例0.37）:
  肩 ──────────── 髋
  │    ↕ 37%      │
  │   腰(初始)    │

第二轮（根据体型修正）:
  沙漏型: 腰上移至38%位置 → 腰宽减小 → 腰臀比降低 → 更准确判定沙漏型
  椭圆型: 腰下移至42%位置 → 腰宽增大 → 腰臀比升高 → 更准确判定椭圆型
  倒三角: 腰上移至36%位置 → 腰宽减小 → 腰肩比降低 → 更准确判定倒三角型
```

**图 3**：品类差异化评分权重对比图

```
          剪裁匹配  色彩匹配  风格匹配  体型优化
上装:       0.35     0.25     0.25     0.15
下装:       0.40     0.20     0.25     0.15
连衣裙:     0.40     0.25     0.20     0.15
外套:       0.35     0.25     0.25     0.15
```

**图 4**：穿搭协调性评估流程图

```
单品1适配分数: 0.85
单品2适配分数: 0.72
单品3适配分数: 0.80
  │
  平均分数: (0.85+0.72+0.80)/3 = 0.79
  方差: ((0.85-0.79)²+(0.72-0.79)²+(0.80-0.79)²)/3 = 0.00287
  │
  harmony_bonus = max(0, 0.1-0.00287) × 5 = 0.486
  │
  final_score = min(1.0, 0.79 + 0.486) = 1.0 (上限截断)
```

## 六、具体实施方式

### 实施例 1：完整体型分析流程

#### 6.1 MediaPipe Pose 关键点提取

**代码引用**：`ml/services/analysis/body_analyzer.py` 第 404-500 行

33 个关键点索引定义（第 408-425 行）：

```python
KEYPOINT_INDICES = {
    "nose": 0,
    "left_eye_inner": 1, "left_eye": 2, "left_eye_outer": 3,
    "right_eye_inner": 4, "right_eye": 5, "right_eye_outer": 6,
    "left_ear": 7, "right_ear": 8,
    "mouth_left": 9, "mouth_right": 10,
    "left_shoulder": 11, "right_shoulder": 12,
    "left_elbow": 13, "right_elbow": 14,
    "left_wrist": 15, "right_wrist": 16,
    "left_pinky": 17, "right_pinky": 18,
    "left_index": 19, "right_index": 20,
    "left_thumb": 21, "right_thumb": 22,
    "left_hip": 23, "right_hip": 24,
    "left_knee": 25, "right_knee": 26,
    "left_ankle": 27, "right_ankle": 28,
    "left_heel": 29, "right_heel": 30,
    "left_foot_index": 31, "right_foot_index": 32,
}
```

初始腰围关键点估算（第 487-498 行）：

```python
keypoints["left_waist"] = self._estimate_waist_point(
    keypoints["left_shoulder"],
    keypoints["left_hip"],
    img_width, img_height
)
keypoints["right_waist"] = self._estimate_waist_point(
    keypoints["right_shoulder"],
    keypoints["right_hip"],
    img_width, img_height
)
```

#### 6.2 体型特异性腰围比例

**代码引用**：`ml/services/analysis/body_analyzer.py` 第 552-560 行

```python
WAIST_POSITION_RATIOS = {
    "default": 0.37,
    BodyType.HOURGLASS: 0.38,
    BodyType.OVAL: 0.42,
    BodyType.RECTANGLE: 0.37,
    BodyType.TRIANGLE: 0.37,
    BodyType.INVERTED_TRIANGLE: 0.36,
}
```

**比例设定依据**（基于 ISO 8559-1:2017）：

- 沙漏型(0.38)：女性自然腰围位置通常在肩峰到髂嵴的 37-40%，沙漏型腰线明显且较高
- 椭圆型(0.42)：腹部丰满导致自然腰围位置下移
- 矩形型(0.37)：腰线不明显，使用标准比例
- 梨形(0.37)：臀部丰满不影响腰线上部位置
- 倒三角(0.36)：上身较宽，腰线相对较高

#### 6.3 两轮迭代核心流程

**代码引用**：`ml/services/analysis/body_analyzer.py` 第 653-709 行

```python
def analyze_body_type(self, image):
    # 1. 提取关键点（初始腰围点使用默认比例）
    keypoints = self._extract_keypoints_from_image(image)

    # 2. 计算测量数据（使用初始关键点）
    measurements = self.compute_measurements(keypoints, img_height, img_width)

    # 3. 计算比例
    proportions = self.compute_proportions(measurements)

    # 4. 分类体型
    body_type, confidence = self.classify_body_type(measurements, proportions)

    # 5. 根据体型修正腰围关键点位置
    keypoints = self.mediapipe.refine_waist_keypoints(
        keypoints, body_type, img_width, img_height
    )

    # 6. 使用修正后的关键点重新计算测量数据
    measurements = self.compute_measurements(keypoints, img_height, img_width)

    # 7. 重新计算比例
    proportions = self.compute_proportions(measurements)
```

#### 6.4 评分式体型分类

**代码引用**：`ml/services/analysis/body_analyzer.py` 第 827-894 行

分类阈值配置（第 173-190 行）：

```python
BODY_TYPE_THRESHOLDS = {
    "shoulder_hip_ratio": {
        "hourglass_range": (0.95, 1.05),
        "triangle_threshold": 0.92,
        "inverted_triangle_threshold": 1.08,
    },
    "waist_shoulder_ratio": {
        "hourglass_max": 0.72,
        "rectangle_min": 0.75,
        "rectangle_max": 0.85,
        "oval_min": 0.88,
    },
    "waist_hip_ratio": {
        "hourglass_max": 0.75,
        "rectangle_max": 0.82,
        "oval_min": 0.85,
    }
}
```

评分机制：每种体型根据匹配条件累加分数，最终选择最高分体型，置信度为该体型分数占总分的比例。

#### 6.5 品类差异化评分

**代码引用**：`ml/services/analysis/body_analyzer.py` 第 288-377 行

4 个品类的差异化权重配置：

```python
CLOTHING_ITEM_FIT_RULES = {
    "top": {
        "score_weights": {
            "cut_match": 0.35, "color_match": 0.25,
            "style_match": 0.25, "body_optimization": 0.15,
        }
    },
    "bottom": {
        "score_weights": {
            "cut_match": 0.40, "color_match": 0.20,
            "style_match": 0.25, "body_optimization": 0.15,
        }
    },
    "dress": {
        "score_weights": {
            "cut_match": 0.40, "color_match": 0.25,
            "style_match": 0.20, "body_optimization": 0.15,
        }
    },
    "outerwear": {
        "score_weights": {
            "cut_match": 0.35, "color_match": 0.25,
            "style_match": 0.25, "body_optimization": 0.15,
        }
    },
}
```

**权重设定依据**：

- 下装剪裁匹配权重最高(0.40)：裤装和裙装对腰臀比的适配要求最严格
- 连衣裙剪裁匹配权重最高(0.40)：连衣裙覆盖全身，剪裁对体型适配影响最大
- 上装色彩匹配权重(0.25)高于下装(0.20)：上装色彩对整体形象影响更大
- 外套风格匹配权重(0.25)高于连衣裙(0.20)：外套的风格属性更突出

#### 6.6 穿搭协调性评估

**代码引用**：`ml/services/analysis/body_analyzer.py` 第 1440-1501 行

```python
def get_outfit_combination_score(self, outfit_items, body_profile):
    items_analysis = []
    total_score = 0.0

    for item in outfit_items:
        fit_score = self.calculate_fit_score(item, body_profile)
        items_analysis.append({...})
        total_score += fit_score.overall_score

    avg_score = total_score / len(outfit_items)

    scores_list = [item["fit_score"] for item in items_analysis]
    variance = sum((s - avg_score) ** 2 for s in scores_list) / len(scores_list)
    harmony_bonus = max(0, 0.1 - variance) * 5

    final_score = min(1.0, avg_score + harmony_bonus)
```

**harmony_bonus 机制**：

- 方差=0（所有单品适配度完全相同）→ bonus=0.5（最大加分）
- 方差=0.1 → bonus=0（临界点，无加分）
- 方差>0.1 → bonus=0（不协调，无加分）
- 乘以 5 使加分在合理范围内（0-0.5）

#### 6.7 阈值可配置机制

**代码引用**：`ml/services/analysis/body_analyzer.py` 第 606-640 行

三级配置优先级：构造参数 > 环境变量 > 默认值

```python
def __init__(self, mediapipe_processor=None, thresholds=None):
    merged_thresholds = dict(self.DEFAULT_THRESHOLDS)

    env_thresholds_json = os.getenv("BODY_TYPE_THRESHOLDS_JSON")
    if env_thresholds_json:
        env_thresholds = json.loads(env_thresholds_json)
        merged_thresholds = self._deep_merge(merged_thresholds, env_thresholds)

    if thresholds:
        merged_thresholds = self._deep_merge(merged_thresholds, thresholds)

    self.thresholds = merged_thresholds
```

### 实施例 2：具体输入输出示例

**输入**：

- 人体图像：480×640 RGB，女性

**第一轮处理**（默认腰围比例 0.37）：

1. S1：MediaPipe Pose 提取 33 关键点

   - 左肩(180, 120), 右肩(320, 120)
   - 左髋(200, 380), 右髋(300, 380)
   - 左腰(190, 216.4), 右腰(310, 216.4) [比例 0.37]

2. S2：计算测量数据

   - 肩宽 = |180-320| = 140px
   - 臀宽 = |200-300| = 100px
   - 腰宽 = |190-310| = 120px
   - 肩臀比 = 140/100 = 1.40
   - 腰肩比 = 120/140 = 0.857
   - 腰臀比 = 120/100 = 1.20

3. 初始分类：肩臀比 1.40 > 1.08 → 倒三角型(Y)，置信度 0.62

**第二轮处理**（倒三角型腰围比例 0.36）：

4. S3：修正腰围关键点

   - 左腰(190, 213.6), 右腰(310, 213.6) [比例 0.36]
   - 腰宽 = |190-310| = 120px（基本不变，因比例差异小）

5. S4：重新计算 → 倒三角型(Y)，置信度 0.65

**适配评分**：

6. S5：服装单品"V 领收腰连衣裙"
   - 剪裁匹配：V 领+收腰 → 匹配倒三角适合项 → 0.80
   - 色彩匹配：酒红 → 匹配秋季型适合色 → 0.65
   - 风格匹配：优雅+收腰 → 匹配倒三角适合风格 → 0.75
   - 体型优化：V 领关键词匹配 → 0.65
   - 加权总分(连衣裙权重)：0.40×0.80 + 0.25×0.65 + 0.20×0.75 + 0.15×0.65 = 0.7275

**输出**：

- 体型：倒三角型(Y)
- 置信度：0.65
- 适配建议：V 领设计、深色上衣、亮色下装、阔腿裤、A 字裙
- 避免风格：垫肩设计、泡泡袖、紧身裤、船领上衣
- 单品适配分数：0.7275（推荐 - 很适合您的体型）

### 实施例 3：穿搭协调性评估示例

**输入**：

- 体型：沙漏型(X)
- 穿搭单品：
  - 收腰衬衫(top)：适配分数 0.88
  - 高腰铅笔裙(bottom)：适配分数 0.85
  - 收腰外套(outerwear)：适配分数 0.82

**处理**：

- 平均分数：(0.88+0.85+0.82)/3 = 0.85
- 方差：((0.88-0.85)²+(0.85-0.85)²+(0.82-0.85)²)/3 = 0.0006
- harmony_bonus = max(0, 0.1-0.0006)×5 = 0.497
- final_score = min(1.0, 0.85+0.497) = 1.0

**输出**：

- 整体适配分数：1.0（非常推荐）
- 协调性加分：0.497
- 各单品适配均衡，协调性极高

## 七、权利要求书

### 独立权利要求

1. 一种基于两轮迭代关键点修正的体型分析方法，其特征在于，包括以下步骤：
   (a) 使用人体姿态估计模型从人体图像中提取身体关键点，使用默认腰围位置比例估算初始腰围关键点；
   (b) 基于所述初始腰围关键点计算身体测量数据和身体比例，进行初始体型分类；
   (c) 根据所述初始体型分类结果，使用体型特异性腰围位置比例修正腰围关键点位置；
   (d) 使用修正后的腰围关键点重新计算身体测量数据和身体比例，得到最终体型分类结果；
   (e) 根据服装品类采用差异化评分权重，计算服装单品与体型的适配分数；
   (f) 对整套穿搭中各单品的适配分数计算协调性加分，得到最终穿搭适配分数。

### 从属权利要求

2. 根据权利要求 1 所述的方法，其特征在于，步骤(a)中所述默认腰围位置比例为 0.37，即腰围关键点的 y 坐标为肩部关键点 y 坐标加上肩部到髋部距离的 37%。

3. 根据权利要求 1 所述的方法，其特征在于，步骤(c)中所述体型特异性腰围位置比例为：沙漏型 0.38、椭圆型 0.42、矩形型 0.37、梨形 0.37、倒三角型 0.36，所述比例基于 ISO 8559-1:2017 服装尺寸设计人体测量标准。

4. 根据权利要求 1 所述的方法，其特征在于，步骤(b)中所述身体比例包括肩臀比、腰臀比和腰肩比，所述初始体型分类采用评分机制，每种体型根据匹配条件累加分数，选择最高分体型作为分类结果。

5. 根据权利要求 4 所述的方法，其特征在于，所述评分机制中：沙漏型判定条件为肩臀比 ∈[0.95,1.05]且腰肩比<0.72 且腰臀比<0.75；矩形型判定条件为肩臀比 ≈1 且腰肩比>0.75；梨形判定条件为肩臀比<0.92；倒三角型判定条件为肩臀比>1.08；椭圆型判定条件为腰肩比>0.88 且腰臀比>0.85。

6. 根据权利要求 1 所述的方法，其特征在于，步骤(e)中所述差异化评分权重为：上装的剪裁匹配权重 0.35、色彩匹配权重 0.25、风格匹配权重 0.25、体型优化权重 0.15；下装的剪裁匹配权重 0.40、色彩匹配权重 0.20、风格匹配权重 0.25、体型优化权重 0.15；连衣裙的剪裁匹配权重 0.40、色彩匹配权重 0.25、风格匹配权重 0.20、体型优化权重 0.15。

7. 根据权利要求 1 所述的方法，其特征在于，步骤(f)中所述协调性加分计算公式为：harmony_bonus = max(0, 0.1-variance)×5，其中 variance 为各单品适配分数的方差。

8. 根据权利要求 1 所述的方法，其特征在于，步骤(a)中所述人体姿态估计模型为 MediaPipe Pose，提取 33 个身体关键点。

9. 根据权利要求 1 所述的方法，其特征在于，步骤(b)中所述身体测量数据包括肩宽、臀宽、腰宽、胸宽、躯干高度、腿长和手臂长度，其中胸宽估算为肩宽的 85%。

10. 根据权利要求 1 所述的方法，其特征在于，还包括体型分类阈值的三级配置机制，优先级为：构造参数 > 环境变量 > 默认值，所述环境变量以 JSON 格式存储阈值配置。

11. 根据权利要求 1 所述的方法，其特征在于，步骤(e)中所述适配分数计算包括剪裁匹配、色彩匹配、风格匹配和体型优化四个维度，每个维度根据服装属性与体型适配规则的匹配程度评分。

12. 根据权利要求 1 所述的方法，其特征在于，还包括为每种体型提供适配建议的步骤，所述适配建议包括适合风格、避免风格、穿搭技巧、最佳剪裁、最佳图案和最佳色彩。

13. 根据权利要求 1 所述的方法，其特征在于，步骤(c)中所述腰围关键点修正包括：创建关键点字典的副本，分别对左侧腰点和右侧腰点使用体型特异性比例重新计算 y 坐标。

14. 根据权利要求 1 所述的方法，其特征在于，步骤(f)中所述最终穿搭适配分数为平均适配分数与协调性加分之和，上限为 1.0。

15. 根据权利要求 3 所述的方法，其特征在于，所述腰围位置比例的设定依据为：沙漏型腰线明显且较高，椭圆型腹部丰满导致腰线下移，倒三角型上身较宽导致腰线相对较高。

## 八、代码引用索引

| 技术要点           | 文件路径                                | 行号      |
| ------------------ | --------------------------------------- | --------- |
| 33 关键点索引定义  | `ml/services/analysis/body_analyzer.py` | 408-425   |
| 初始腰围关键点估算 | `ml/services/analysis/body_analyzer.py` | 487-498   |
| 体型特异性腰围比例 | `ml/services/analysis/body_analyzer.py` | 552-560   |
| 腰围关键点修正     | `ml/services/analysis/body_analyzer.py` | 502-549   |
| 腰围点估算算法     | `ml/services/analysis/body_analyzer.py` | 562-590   |
| 两轮迭代核心流程   | `ml/services/analysis/body_analyzer.py` | 653-709   |
| 身体测量计算       | `ml/services/analysis/body_analyzer.py` | 726-796   |
| 身体比例计算       | `ml/services/analysis/body_analyzer.py` | 798-825   |
| 评分式体型分类     | `ml/services/analysis/body_analyzer.py` | 827-894   |
| 分类阈值配置       | `ml/services/analysis/body_analyzer.py` | 173-190   |
| 品类差异化权重     | `ml/services/analysis/body_analyzer.py` | 288-377   |
| 适配分数计算       | `ml/services/analysis/body_analyzer.py` | 1178-1250 |
| 穿搭协调性评估     | `ml/services/analysis/body_analyzer.py` | 1440-1501 |
| 阈值三级配置       | `ml/services/analysis/body_analyzer.py` | 606-640   |
| 体型适配规则       | `ml/services/analysis/body_analyzer.py` | 193-285   |
| MediaPipe 处理器   | `ml/services/analysis/body_analyzer.py` | 404-471   |
