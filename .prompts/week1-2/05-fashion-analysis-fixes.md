# 任务05: 修复时尚分析5个专业错误

## 你的角色

你是寻裳(AiNeed)项目的AI算法工程师，专注于时尚分析准确性。项目位于 C:\AiNeed。

## 背景

时尚行业专家审计发现5个必须立即修复的专业错误，直接影响分析结果准确性。

## 任务

### 修复1: O型身材"避免高腰线"→改为"推荐empire waist"

**文件**: `ml/services/analysis/body_analyzer.py`
**位置**: 找到 `BODY_TYPE_ADAPTATIONS` 字典中 OVAL/oval 类型的穿搭建议

找到类似以下的建议：

- "避免高腰线" 或 "avoid high waist"
- 或者 avoid 列表中有 "high_waist" / "高腰"

修改为：

- avoid 中移除 "高腰线"
- recommend 中添加 "帝国腰线(empire waist)" 或 "胸下线高腰"
- tips 中修改：将"避免高腰线"改为"选择胸下线的empire waist款式，避开自然腰线位置"

具体来说，找到 OVAL 体型的 adaptations，修改：

- `avoid` 列表中如果有腰部相关建议，替换为"避免自然腰线位置"
- `recommend` 列表中增加"empire waist连衣裙"
- `tips` 中增加"V领是一定要的，展现锁骨和手臂是苹果型的优势"

### 修复2: L\*阈值 65 → 58

**文件**: `ml/services/analysis/color_season_analyzer.py`

找到浅型/深型判定阈值（约第540行附近）：

```python
# 旧值
if l_value >= 65:
    return "light"
```

改为：

```python
# 新值 — 根据中国人群数据校准
if l_value >= 58:
    return "light"
```

同时检查是否有其他硬编码的65阈值，一并修改。

### 修复3: 增加b\*轴暖冷判定

**文件**: `ml/services/analysis/color_season_analyzer.py`

找到暖冷判定函数（约第496-535行），当前只使用a\*轴（红-绿）判断暖冷。

在a*轴判定之后增加b*轴判定：

```python
def _classify_tone(self, l_avg: float, a_avg: float, b_avg: float, ita: float) -> str:
    """分类暖冷调 — 综合a*轴和b*轴"""

    # a*轴判定（红-绿，正值偏红=暖）
    a_threshold = self._get_adaptive_threshold(ita, 'a')
    a_warm = a_avg > a_threshold

    # b*轴判定（黄-蓝，正值偏黄=暖）— 新增
    b_threshold = 15.0  # b* > 15 为暖调指标
    b_warm = b_avg > b_threshold

    # 综合判定：任一轴指向暖则判定暖
    if a_warm or b_warm:
        return "warm"
    elif not a_warm and not b_warm:
        return "cool"
    else:
        return "neutral"
```

注意：不要完全替换现有逻辑，而是在现有的a*判定基础上叠加b*判定。仔细阅读现有代码结构，选择最合适的集成方式。

### 修复4: 春季明亮型business推荐色替换

**文件**: `ml/data/fashion_rules/color_season_rules.json`

找到 spring_warm 或 spring_bright 的 business 场景推荐色。

将不合适的正红/纯绿替换：

- `#FF0000`（正红）→ `#8B0000`（深红/酒红）
- `#00FF00`（纯绿）→ `#2F4F4F`（暗森绿）
- `#FFFF00`（纯黄）→ `#DAA520`（暗金）

同时检查其他季节型的business场景是否有类似问题（过于鲜艳的颜色），一并修正。

### 修复5: weather规则重复tips修复

**文件**: `ml/data/fashion_rules/weather_outfit_rules.json`

找到不同场合（约会/旅行/通勤等）在相同温度范围下 tips 完全相同的问题。

为每个温度 x 场合组合重写独特的 tips：

示例修改：

- **零下+约会**：tips 改为 "约会选修身款大衣配高跟短靴，内搭针织裙展现曲线，配一条亮色围巾提亮肤色"
- **零下+通勤**：tips 改为 "通勤选长款羊毛大衣配中跟靴，叠穿衬衫+高领打底保暖又有层次"
- **零下+旅行**：tips 改为 "旅行穿防风羽绒服配运动靴，叠穿法方便室内外温差切换，带一条多功能围巾"

至少为以下温度段各写不同的场合tips：

- freezing（零下）
- cold（0-10度）
- cool（10-18度）

每个温度段至少覆盖：daily, commute, date, travel, party 5个场合。

## 验证标准

- [ ] O型身材不再建议"避免高腰线"，改为推荐"empire waist"
- [ ] L\*阈值从65改为58
- [ ] 暖冷判定增加b\*轴（黄-蓝）维度
- [ ] spring的business场景无正红/纯绿等过于鲜艳的颜色
- [ ] weather规则中同温度不同场合的tips不再重复
- [ ] `cd ml && python -c "from services.analysis.color_season_analyzer import ColorSeasonAnalyzer; print('import ok')"` 验证语法正确
