# 专利技术交底书：基于ITA肤色自适应阈值的12季色彩分析系统

## 一、发明名称

基于ITA肤色自适应阈值的12季色彩分析方法及系统

## 二、技术领域

本发明涉及计算机视觉和色彩科学技术领域，具体涉及一种基于面部图像的自动化色彩季型分析方法，尤其涉及基于MediaPipe Face Mesh凸包皮肤采样、CIELAB三维独立分类、ITA肤色自适应阈值及12季决策树映射的色彩分析系统。

## 三、背景技术

个人色彩分析（Personal Color Analysis, PCA）是时尚和形象设计领域的重要技术，旨在根据个人肤色特征判定其适合的色彩季型，从而指导服装、妆容和配饰的色彩选择。

### 现有技术的不足

1. **分类体系过于简化**：中国专利CN109145724B仅采用4季分类体系（春/夏/秋/冬），分类粒度粗糙，无法区分同一季节中不同亚型的色彩偏好差异。例如，同属春季型的"暖春"和"柔春"在色彩饱和度和明度偏好上存在显著差异，但4季体系无法区分。

2. **人工目视判断为主**：传统的Color Me Beautiful方法依赖人工目视判断，受观察者经验、环境光照和个人主观因素影响大，结果不可复现。即使专业色彩顾问，对同一被分析者的判定也可能不一致。

3. **肤色阈值缺乏自适应性**：现有自动化方法对暖冷色调分类采用固定阈值，未考虑不同肤色群体在CIELAB空间中的分布差异。深肤色群体的a\*值普遍高于浅肤色群体，若使用统一阈值，深肤色群体会被过度归类为暖色调，导致分类偏差。

4. **皮肤采样方法粗糙**：现有方法多采用固定矩形区域采样面部皮肤像素，无法精确避开眉毛、眼睛、嘴唇等非皮肤区域，采样噪声大。不同面部区域的肤色受光照和阴影影响程度不同，简单矩形采样无法消除这种差异。

5. **缺乏色彩→穿搭推荐联动**：现有色彩分析专利仅输出分类结果，未将分析结果与具体的穿搭色彩推荐关联，实用性有限。

6. **CIELAB空间操作缺失**：多数现有方法在RGB或HSV空间进行色彩分析，这些空间不具感知均匀性，相同的数值距离在不同色域区域对应的人眼感知差异不同，影响分类准确性。

综上所述，现有色彩分析技术在"12季扩展体系 + CIELAB三维分类 + Face Mesh凸包采样 + ITA肤色自适应阈值 + 色彩→穿搭推荐联动"方面存在技术空白。

## 四、发明内容

### 4.1 技术问题

如何从面部图像自动、精确地分析个人色彩季型，包括：精确提取面部皮肤像素、在感知均匀色彩空间中进行三维独立分类、根据肤色群体自适应调整分类阈值、将三维分类结果映射至12季体系，并生成对应的穿搭色彩推荐。

### 4.2 技术方案

本发明提出一种基于ITA肤色自适应阈值的12季色彩分析方法，包括以下步骤：

**步骤S1：MediaPipe Face Mesh关键点提取与凸包皮肤采样**

使用MediaPipe Face Mesh提取468个面部关键点，定义5个面部区域（额头、左脸颊、右脸颊、鼻梁、下巴），每个区域由8-9个关键点描述。对每个区域的关键点计算凸包（convex hull），在凸包内提取皮肤像素：

- 皮肤像素判定：在CIELAB空间中，L*∈[15,95], a*∈[-5,25], b\*∈[2,40]
- 对每个区域的皮肤像素计算CIELAB中位数（L*, a*, b\*）

**步骤S2：区域加权平均肤色计算**

对5个面部区域的CIELAB中位数进行加权平均：

- 额头权重0.25，左脸颊权重0.20，右脸颊权重0.20，鼻梁权重0.15，下巴权重0.20
- 加权平均降低单一区域光照不均的影响

**步骤S3：ITA肤色自适应暖冷色调分类**

计算ITA角（Individual Typology Angle）：

$$\text{ITA} = \arctan\left(\frac{L^* - 50}{b^*}\right) \times \frac{180}{\pi}$$

根据ITA值确定肤色群体，自适应调整暖色调分类阈值：

- ITA > 55°（浅肤色）：暖阈值 = 6.0
- 28° < ITA ≤ 55°（中肤色）：暖阈值 = 8.0
- 10° < ITA ≤ 28°（中深肤色）：暖阈值 = 10.0
- ITA ≤ 10°（深肤色）：暖阈值 = 12.0

暖冷色调分类规则：

- a\* > 暖阈值 → 暖色调（WARM）
- a\* < -2.0 → 冷色调（COOL）
- -2.0 ≤ a\* ≤ 暖阈值 → 中性色调（NEUTRAL），归入暖色调

**步骤S4：明度分类**

基于CIELAB L\*值进行深浅分类：

- L\* ≥ 65.0 → 浅型（LIGHT）
- L\* < 65.0 → 深型（DEEP）

**步骤S5：饱和度分类**

基于CIELAB色度 C* = √(a*² + b\*²) 进行清柔分类：

- C\* ≥ 18.0 → 清型（CLEAR）
- C\* < 18.0 → 柔型（MUTED）

**步骤S6：12季决策树映射**

根据三维分类结果（暖冷 × 深浅 × 清柔）映射至12季体系：

| 暖冷    | 深浅 | 清柔 | 季型                             |
| ------- | ---- | ---- | -------------------------------- |
| 暖/中性 | 浅   | 清   | 暖春型 (spring_warm_light_clear) |
| 暖/中性 | 浅   | 柔   | 柔春型 (spring_warm_light_muted) |
| 暖/中性 | 深   | 清   | 深春型 (spring_warm_deep_clear)  |
| 暖/中性 | 深   | 柔   | 暖秋型 (autumn_warm_deep_muted)  |
| 冷      | 浅   | 清   | 浅夏型 (summer_cool_light_clear) |
| 冷      | 浅   | 柔   | 凉夏型 (summer_cool_light_muted) |
| 冷      | 深   | 清   | 冷冬型 (winter_cool_deep_clear)  |
| 冷      | 深   | 柔   | 深冬型 (winter_cool_deep_muted)  |

**步骤S7：12→8季双层级系统**

将12季结果映射至8季实用体系，与前端展示对齐：

- 暖春型/深春型 → 暖春(spring_warm)
- 柔春型 → 浅春(spring_light)
- 凉夏型/柔夏型 → 凉夏(summer_cool)
- 浅夏型 → 浅夏(summer_light)
- 暖秋型/柔秋型 → 暖秋(autumn_warm)
- 深秋型 → 深秋(autumn_deep)
- 冷冬型/浅冬型 → 冷冬(winter_cool)
- 深冬型 → 深冬(winter_deep)

**步骤S8：CIEDE2000色差验证的穿搭色彩推荐**

为每个季型生成适合/不适合色彩面板，面板中每个颜色以CIELAB值表示，使用CIEDE2000色差验证面板内颜色的感知区分度。

### 4.3 有益效果

1. **12季精细化分类**：在传统4季基础上扩展至12季，通过三维独立分类（暖冷×深浅×清柔）实现更精细的色彩季型区分，满足不同亚型的个性化色彩需求。

2. **ITA肤色自适应阈值**：首次在色彩季型分析中引入ITA肤色自适应阈值，根据肤色群体自动调整暖冷分类阈值，消除深肤色群体被过度归类为暖色调的系统性偏差。

3. **Face Mesh凸包精确采样**：使用MediaPipe Face Mesh 468点关键点定义5个面部区域，通过凸包计算精确提取皮肤像素，避免眉毛、眼睛、嘴唇等非皮肤区域的干扰。

4. **区域加权平均**：5个面部区域采用差异化权重（额头0.25、脸颊各0.20、鼻梁0.15、下巴0.20），降低单一区域光照不均的影响。

5. **12→8季双层级系统**：同时提供12季精细分类和8季实用分类，12季用于专业分析，8季用于前端展示，兼顾专业性和实用性。

6. **CIELAB感知均匀空间**：所有色彩分析操作在CIELAB感知均匀空间中进行，确保数值差异与人眼感知一致。

7. **色彩→穿搭推荐联动**：每个季型配备完整的适合/不适合色彩面板，实现从分析到推荐的完整闭环。

## 五、附图说明

**图1**：12季色彩分析方法整体流程图

```
输入：面部图像
  │
  ├─→ S1: MediaPipe Face Mesh 468点 → 5区域凸包皮肤采样
  │
  ├─→ S2: 区域加权平均 → 平均CIELAB (L*, a*, b*)
  │
  ├─→ S3: ITA计算 → 肤色群体判定 → 自适应暖阈值 → 暖冷分类
  │
  ├─→ S4: L*值 → 深浅分类
  │
  ├─→ S5: C*值 → 清柔分类
  │
  ├─→ S6: 三维(暖冷×深浅×清柔) → 12季决策树映射
  │
  ├─→ S7: 12季 → 8季双层级映射
  │
  └─→ S8: 季型色彩面板生成 + CIEDE2000验证
```

**图2**：Face Mesh凸包皮肤采样示意图

```
Face Mesh 468点
  │
  ├─ 额头区域: [10,108,337,151,67,109,338,297] → 凸包 → 皮肤像素
  ├─ 左脸颊: [116,117,118,119,120,47,100,126] → 凸包 → 皮肤像素
  ├─ 右脸颊: [345,346,347,348,349,277,329,356] → 凸包 → 皮肤像素
  ├─ 鼻梁: [6,197,195,5,4,1,19,94,2] → 凸包 → 皮肤像素
  └─ 下巴: [152,148,377,323,365,391,393] → 凸包 → 皮肤像素
       │
       每区域: CIELAB中位数 → 加权平均 → 最终肤色
```

**图3**：ITA肤色自适应阈值分类图

```
ITA计算: ITA = arctan((L*-50)/b*) × 180/π
  │
  ├─ ITA > 55° (浅肤色) → 暖阈值 = 6.0
  ├─ 28° < ITA ≤ 55° (中肤色) → 暖阈值 = 8.0
  ├─ 10° < ITA ≤ 28° (中深肤色) → 暖阈值 = 10.0
  └─ ITA ≤ 10° (深肤色) → 暖阈值 = 12.0
       │
       a* > 暖阈值 → WARM
       a* < -2.0 → COOL
       -2.0 ≤ a* ≤ 暖阈值 → NEUTRAL(归入WARM)
```

**图4**：12季决策树映射图

```
                    ┌── WARM/NEUTRAL ──┬── LIGHT ──┬── CLEAR → 暖春型
                    │                  │           └── MUTED → 柔春型
                    │                  └── DEEP ───┬── CLEAR → 深春型
  三维分类 ─────────┤                              └── MUTED → 暖秋型
  (暖冷×深浅×清柔)  │
                    └── COOL ──────────┬── LIGHT ──┬── CLEAR → 浅夏型
                                       │           └── MUTED → 凉夏型
                                       └── DEEP ───┬── CLEAR → 冷冬型
                                                   └── MUTED → 深冬型
```

## 六、具体实施方式

### 实施例1：完整色彩分析流程

#### 6.1 Face Mesh关键点提取与凸包采样

**代码引用**：`ml/services/analysis/color_season_analyzer.py` 第206-221行（区域定义），第398-432行（提取逻辑），第449-489行（区域CIELAB计算）

5个面部区域的关键点索引定义：

```python
_FACE_MESH_REGIONS: Dict[str, List[int]] = {
    "forehead": [10, 108, 337, 151, 67, 109, 338, 297],
    "left_cheek": [116, 117, 118, 119, 120, 47, 100, 126],
    "right_cheek": [345, 346, 347, 348, 349, 277, 329, 356],
    "nose_bridge": [6, 197, 195, 5, 4, 1, 19, 94, 2],
    "chin": [152, 148, 377, 323, 365, 391, 393],
}
```

凸包采样算法：

```python
def _compute_region_lab(img_array, landmark_points=None, region_coords=None):
    if landmark_points is not None and len(landmark_points) >= 3:
        hull = cv2.convexHull(landmark_points.astype(np.int32))
        mask = np.zeros(img_array.shape[:2], dtype=np.uint8)
        cv2.fillConvexPoly(mask, hull, 255)
        pixels = img_array[mask > 0]
    # ... 皮肤像素过滤和中位数计算
```

皮肤像素判定（CIELAB空间）：`ml/services/analysis/color_utils.py` 第337-358行

```python
def is_skin_pixel_cielab(r, g, b):
    l, a, b_val = rgb_to_lab(r, g, b)
    if l < 15 or l > 95: return False
    if a < -5 or a > 25: return False
    if b_val < 2 or b_val > 40: return False
    return True
```

#### 6.2 区域加权平均

**代码引用**：`ml/services/analysis/color_season_analyzer.py` 第683-699行

```python
weights: Dict[str, float] = {
    "forehead": 0.25,
    "left_cheek": 0.20,
    "right_cheek": 0.20,
    "nose_bridge": 0.15,
    "chin": 0.20,
}
total_weight = sum(weights.get(name, 0.1) for name in region_results)
avg_l = sum(region_results[n][0] * weights.get(n, 0.1) for n in region_results) / total_weight
avg_a = sum(region_results[n][1] * weights.get(n, 0.1) for n in region_results) / total_weight
avg_b = sum(region_results[n][2] * weights.get(n, 0.1) for n in region_results) / total_weight
```

权重设定依据：额头面积最大且受妆容影响最小（0.25），脸颊两侧对称分布（各0.20），鼻梁易受高光影响降低权重（0.15），下巴面积适中（0.20）。

#### 6.3 ITA肤色自适应暖冷分类

**代码引用**：`ml/services/analysis/color_season_analyzer.py` 第496-535行

ITA角计算公式（`ml/services/analysis/color_utils.py` 第307-321行）：

$$\text{ITA} = \arctan\left(\frac{L^* - 50}{b^*}\right) \times \frac{180}{\pi}$$

自适应阈值实现：

```python
def _classify_tone(a_star: float, ita: Optional[float] = None) -> Tuple[ToneType, float]:
    if ita is not None:
        if ita > 55.0:
            warm_threshold = 6.0
        elif ita > 28.0:
            warm_threshold = 8.0
        elif ita > 10.0:
            warm_threshold = 10.0
        else:
            warm_threshold = 12.0
    else:
        warm_threshold = 8.0

    if a_star > warm_threshold:
        return ToneType.WARM, min(1.0, 0.5 + a_star / 30.0)
    if a_star > 3.0:
        return ToneType.WARM, 0.5 + a_star / 20.0
    if a_star < -2.0:
        return ToneType.COOL, min(1.0, 0.5 + abs(a_star) / 20.0)
    return ToneType.NEUTRAL, 0.5
```

**阈值设定依据**：

- 浅肤色（ITA>55°）a\*值基线较低，暖阈值6.0即可区分暖冷
- 中肤色（ITA 28-55°）a\*值基线中等，暖阈值8.0为默认值
- 中深肤色（ITA 10-28°）a\*值基线较高，暖阈值10.0避免过度暖色归类
- 深肤色（ITA≤10°）a\*值基线最高，暖阈值12.0确保分类准确性

#### 6.4 明度与饱和度分类

**代码引用**：`ml/services/analysis/color_season_analyzer.py` 第538-557行

明度分类阈值：L\*=65.0为深浅分界线

饱和度分类阈值：C*=18.0为清柔分界线，C*=12.0为过渡区间

#### 6.5 12季决策树映射

**代码引用**：`ml/services/analysis/color_season_analyzer.py` 第560-582行

```python
def _determine_season(tone, depth, chroma) -> TwelveSeason:
    if tone in (ToneType.WARM, ToneType.NEUTRAL):
        if depth == DepthType.LIGHT:
            if chroma == ChromaType.CLEAR:
                return TwelveSeason.SPRING_WARM_LIGHT_CLEAR
            return TwelveSeason.SPRING_WARM_LIGHT_MUTED
        if chroma == ChromaType.CLEAR:
            return TwelveSeason.SPRING_WARM_DEEP_CLEAR
        return TwelveSeason.AUTUMN_WARM_DEEP_MUTED
    else:
        if depth == DepthType.LIGHT:
            if chroma == ChromaType.CLEAR:
                return TwelveSeason.SUMMER_COOL_LIGHT_CLEAR
            return TwelveSeason.SUMMER_COOL_LIGHT_MUTED
        if chroma == ChromaType.CLEAR:
            return TwelveSeason.WINTER_COOL_DEEP_CLEAR
        return TwelveSeason.WINTER_COOL_DEEP_MUTED
```

#### 6.6 12→8季映射

**代码引用**：`ml/services/analysis/color_season_analyzer.py` 第793-806行

```python
_TWELVE_TO_EIGHT: Dict[TwelveSeason, EightSeason] = {
    TwelveSeason.SPRING_WARM_LIGHT_CLEAR: EightSeason.SPRING_WARM,
    TwelveSeason.SPRING_WARM_LIGHT_MUTED: EightSeason.SPRING_LIGHT,
    TwelveSeason.SPRING_WARM_DEEP_CLEAR: EightSeason.SPRING_WARM,
    TwelveSeason.SUMMER_COOL_LIGHT_MUTED: EightSeason.SUMMER_COOL,
    TwelveSeason.SUMMER_COOL_LIGHT_CLEAR: EightSeason.SUMMER_LIGHT,
    TwelveSeason.SUMMER_COOL_DEEP_MUTED: EightSeason.SUMMER_COOL,
    TwelveSeason.AUTUMN_WARM_DEEP_MUTED: EightSeason.AUTUMN_WARM,
    TwelveSeason.AUTUMN_WARM_DEEP_CLEAR: EightSeason.AUTUMN_DEEP,
    TwelveSeason.AUTUMN_WARM_LIGHT_MUTED: EightSeason.AUTUMN_WARM,
    TwelveSeason.WINTER_COOL_DEEP_CLEAR: EightSeason.WINTER_COOL,
    TwelveSeason.WINTER_COOL_LIGHT_CLEAR: EightSeason.WINTER_COOL,
    TwelveSeason.WINTER_COOL_DEEP_MUTED: EightSeason.WINTER_DEEP,
}
```

### 实施例2：具体输入输出示例

**输入**：

- 面部图像：480×640 RGB，亚洲女性

**处理过程**：

1. S1：Face Mesh提取468点 → 5区域凸包采样
   - 额头: L*=72.3, a*=9.5, b\*=18.2
   - 左脸颊: L*=70.1, a*=10.2, b\*=17.5
   - 右脸颊: L*=69.8, a*=9.8, b\*=17.8
   - 鼻梁: L*=71.5, a*=8.7, b\*=16.9
   - 下巴: L*=68.5, a*=10.5, b\*=18.8

2. S2：加权平均 → L*=70.5, a*=9.8, b\*=17.9

3. S3：ITA = arctan((70.5-50)/17.9) × 180/π = arctan(1.145) × 57.3 = 48.9°
   - 28° < ITA ≤ 55° → 中肤色 → 暖阈值 = 8.0
   - a\*=9.8 > 8.0 → 暖色调（WARM），置信度=0.5+9.8/30=0.827

4. S4：L\*=70.5 ≥ 65.0 → 浅型（LIGHT），置信度=0.5+(70.5-65)/30=0.683

5. S5：C\*=√(9.8²+17.9²)=√(96.04+320.41)=√416.45=20.4
   - C\*=20.4 ≥ 18.0 → 清型（CLEAR），置信度=0.5+(20.4-18)/15=0.660

6. S6：WARM + LIGHT + CLEAR → 暖春型 (spring_warm_light_clear)

7. S7：暖春型 → spring_warm（8季体系）

8. S8：生成暖春型色彩面板（珊瑚粉、鹅黄、嫩绿、桃红等8个适合色 + 酒红、藏青等2个不适合色）

**输出**：

- 12季类型：spring_warm_light_clear（暖春型）
- 8季类型：spring_warm
- 三维分类：WARM / LIGHT / CLEAR
- ITA：48.9°
- 综合置信度：(0.827+0.683+0.660)/3 = 0.723
- 适合色彩：珊瑚粉、鹅黄、嫩绿、桃红、天蓝、杏色、薄荷绿、奶油白
- 不适合色彩：酒红、藏青

## 七、权利要求书

### 独立权利要求

1. 一种基于ITA肤色自适应阈值的12季色彩分析方法，其特征在于，包括以下步骤：
   (a) 使用面部关键点检测模型提取面部多个区域的关键点，对每个区域的关键点计算凸包，在凸包内提取皮肤像素并计算CIELAB中位数；
   (b) 对多个面部区域的CIELAB中位数进行加权平均，得到平均肤色CIELAB值(L*, a*, b*)；
   (c) 根据平均肤色计算ITA角，根据ITA角所属的肤色群体区间确定暖色调分类的自适应阈值；
   (d) 基于CIELAB a*值和所述自适应阈值进行暖冷色调分类，基于CIELAB L*值进行深浅分类，基于CIELAB色度C*值进行清柔分类；
   (e) 根据暖冷色调、深浅和清柔三维分类结果，通过决策树映射至12季色彩季型；
   (f) 为所述12季色彩季型生成对应的穿搭色彩推荐面板。

### 从属权利要求

2. 根据权利要求1所述的方法，其特征在于，步骤(a)中所述面部区域包括额头、左脸颊、右脸颊、鼻梁和下巴5个区域，每个区域由8-9个面部关键点描述。

3. 根据权利要求1所述的方法，其特征在于，步骤(a)中所述皮肤像素判定条件为：在CIELAB空间中L*∈[15,95], a*∈[-5,25], b\*∈[2,40]。

4. 根据权利要求1所述的方法，其特征在于，步骤(b)中所述加权平均的权重配置为：额头0.25、左脸颊0.20、右脸颊0.20、鼻梁0.15、下巴0.20。

5. 根据权利要求1所述的方法，其特征在于，步骤(c)中所述ITA角计算公式为：ITA = arctan((L*-50)/b*) × 180/π，所述肤色群体区间及自适应阈值为：ITA>55°对应暖阈值6.0，28°<ITA≤55°对应暖阈值8.0，10°<ITA≤28°对应暖阈值10.0，ITA≤10°对应暖阈值12.0。

6. 根据权利要求1所述的方法，其特征在于，步骤(d)中所述暖冷色调分类规则为：a*大于自适应阈值判定为暖色调，a*小于-2.0判定为冷色调，a\*介于-2.0与自适应阈值之间判定为中性色调并归入暖色调。

7. 根据权利要求1所述的方法，其特征在于，步骤(d)中所述深浅分类阈值为L*=65.0，L*≥65.0判定为浅型，L\*<65.0判定为深型。

8. 根据权利要求1所述的方法，其特征在于，步骤(d)中所述清柔分类基于色度C*=√(a*²+b*²)，C*≥18.0判定为清型，C\*<18.0判定为柔型。

9. 根据权利要求1所述的方法，其特征在于，步骤(e)中所述12季色彩季型包括：暖春型、柔春型、深春型、凉夏型、浅夏型、柔夏型、暖秋型、深秋型、柔秋型、冷冬型、浅冬型和深冬型。

10. 根据权利要求1所述的方法，其特征在于，还包括将12季色彩季型映射至8季实用体系的步骤，所述8季体系包括：暖春、浅春、凉夏、浅夏、暖秋、深秋、冷冬和深冬。

11. 根据权利要求1所述的方法，其特征在于，步骤(f)中所述穿搭色彩推荐面板包括适合色彩列表和不适合色彩列表，每个色彩以CIELAB值和十六进制色值表示。

12. 根据权利要求1所述的方法，其特征在于，步骤(a)中所述面部关键点检测模型为MediaPipe Face Mesh，提取468个面部关键点。

13. 根据权利要求1所述的方法，其特征在于，步骤(a)中当面部关键点检测不可用时，回退至固定矩形区域采样，所述固定矩形区域包括：额头(0.20,0.05,0.60,0.20)、左脸颊(0.10,0.35,0.30,0.25)、右脸颊(0.60,0.35,0.30,0.25)、鼻梁(0.40,0.30,0.20,0.20)、下巴(0.30,0.70,0.40,0.15)。

14. 根据权利要求1所述的方法，其特征在于，还包括计算三维分类的综合置信度，所述综合置信度为暖冷色调置信度、深浅置信度和清柔置信度的算术平均值。

15. 根据权利要求5所述的方法，其特征在于，所述ITA角的肤色群体区间划分基于Chardon等人的皮肤分型研究，浅肤色ITA>55°对应Fitzpatrick I-II型，中肤色ITA 28-55°对应III-IV型，深肤色ITA≤28°对应V-VI型。

## 八、代码引用索引

| 技术要点                 | 文件路径                                        | 行号    |
| ------------------------ | ----------------------------------------------- | ------- |
| Face Mesh区域定义        | `ml/services/analysis/color_season_analyzer.py` | 206-221 |
| Face Mesh关键点提取      | `ml/services/analysis/color_season_analyzer.py` | 398-432 |
| 凸包皮肤采样与CIELAB计算 | `ml/services/analysis/color_season_analyzer.py` | 449-489 |
| 区域加权平均             | `ml/services/analysis/color_season_analyzer.py` | 683-699 |
| ITA肤色自适应暖冷分类    | `ml/services/analysis/color_season_analyzer.py` | 496-535 |
| 明度分类                 | `ml/services/analysis/color_season_analyzer.py` | 538-546 |
| 饱和度分类               | `ml/services/analysis/color_season_analyzer.py` | 549-557 |
| 12季决策树映射           | `ml/services/analysis/color_season_analyzer.py` | 560-582 |
| 12→8季映射               | `ml/services/analysis/color_season_analyzer.py` | 793-806 |
| 12季枚举定义             | `ml/services/analysis/color_season_analyzer.py` | 52-93   |
| 12季色彩面板             | `ml/services/analysis/color_season_analyzer.py` | 228-387 |
| 8季色彩面板              | `ml/services/analysis/color_season_analyzer.py` | 809-924 |
| 主分析入口               | `ml/services/analysis/color_season_analyzer.py` | 612-742 |
| ITA计算公式              | `ml/services/analysis/color_utils.py`           | 307-321 |
| 色度计算                 | `ml/services/analysis/color_utils.py`           | 324-334 |
| 皮肤像素判定             | `ml/services/analysis/color_utils.py`           | 337-358 |
| CIELAB转换(D65)          | `ml/services/analysis/color_utils.py`           | 32-70   |
| CIEDE2000公式            | `ml/services/analysis/color_utils.py`           | 133-218 |
