# 任务: 时尚分析专业错误修复

## 项目路径

C:\AiNeed

## 上下文

审计发现 5 个时尚专业性错误，需要立即修正。

## 修复清单

### 1. O 型身材建议修正

文件: `ml/data/fashion_rules/body_type_rules.json`
位置: 搜索 "oval" 或 "O 型" 相关规则

错误: "避免高腰线"
修正: "避免自然腰线，推荐 empire waist（帝国腰线/高腰线）"

O 型身材的正确建议:

- **推荐**: A 字裙、V 领、empire waist、垂坠面料、深色系
- **避免**: 紧身腰带、横条纹腰部装饰、自然腰线分割

### 2. L\* 阈值修正

文件: `ml/services/analysis/color_season_analyzer.py`
位置: 约第 540 行

错误: `L_THRESHOLD = 65`
修正: `L_THRESHOLD = 58`

原因: 中国女性肤色普遍偏暗，L\* 值 65 太高导致大量误判。58-60 更适合中国人群。

### 3. 添加 b\* 轴暖冷判定

文件: `ml/services/analysis/color_season_analyzer.py`
位置: 约第 496 行的色彩分类逻辑

错误: 仅用 L* 和 a* 判定，缺少 b*（黄-蓝轴）
修正: 添加 b* 轴判定:

```python
# 在色彩分类中添加:
WARM_B_THRESHOLD = 15  # b* > 15 偏暖调

def classify_warm_cool(lab_values):
    L, a, b = lab_values
    is_warm = b > WARM_B_THRESHOLD  # b* 轴: 正值偏黄(暖)
    # 结合 a* 轴(红-绿) 综合判断
    ...
```

亚洲人肤色黄度(b\*值)是区分暖冷调的关键维度。

### 4. 春季明亮型 business 推荐修正

文件: `ml/data/fashion_rules/color_season_rules.json`
位置: 搜索 "spring_bright" 或 "春季明亮" 的 business 场景

错误: 推荐 "正红"、"纯绿" 用于 business 场景
修正: 替换为适合商务的颜色:

- 正红 → 酒红、深红、砖红
- 纯绿 → 橄榄绿、墨绿、鼠尾草绿

### 5. 天气规则场景差异化

文件: `ml/data/fashion_rules/weather_outfit_rules.json`

错误: 同温度不同场合的 tips 完全重复
修正: 为每个温度区间添加场合差异化建议:

```json
{
  "temperature_range": "15-20",
  "occasions": {
    "commute": "通勤建议: 西装外套+薄针织...",
    "date": "约会建议: 风衣+连衣裙...",
    "casual": "休闲建议: 卫衣+牛仔裤...",
    "interview": "面试建议: 深色西装套装..."
  }
}
```

## 验证

- body_type_rules.json 中 O 型身材规则已修正
- color_season_analyzer.py 中 L\* 阈值改为 58
- color_season_analyzer.py 添加了 b\* 轴判定
- color_season_rules.json 中 spring_bright 的 business 推荐已修正
- weather_outfit_rules.json 添加了场合差异化
