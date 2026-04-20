# 任务12: color_season_rules.json 场合差异化重写

## 你的角色

你是寻裳(AiNeed)项目的时尚知识工程师。项目位于 C:\AiNeed。

## 背景

审计发现 color_season_rules.json 中同一个color_season在不同场合(casual/business/date/formal)的best_colors完全相同，说明是模板批量生成的。需要为每个季节型 × 4种场合重写不同的推荐色。

## 必读文件

1. `ml/data/fashion_rules/color_season_rules.json` — 完整读取，理解当前结构

## 任务

### 1. 理解当前结构

读取文件，确认每个季节型的结构包含：

- season名称
- 4种场合(casual/business/date/formal)
- 每种场合有 best_colors, avoid_colors, color_combos, tips

### 2. 场合差异化重写原则

**色彩心理学映射**：

- casual: 活泼、舒适 → 可用明亮色、柔和色
- business: 专业、可靠 → 深色、中性色为主
- date: 温暖、亲和 → 暖色、柔和色、少量亮色点缀
- formal: 庄重、高级 → 深色、宝石色、金属色点缀

**以春季暖型(Spring Warm)为例**：

| 场合     | best_colors                                             | 说明                                  |
| -------- | ------------------------------------------------------- | ------------------------------------- |
| casual   | ["#FFB6C1", "#FFA07A", "#F0E68C", "#87CEEB", "#DDA0DD"] | 粉红/浅橙/浅黄/天蓝/浅紫 — 明亮活泼   |
| business | ["#CD853F", "#DEB887", "#F5DEB3", "#D2B48C", "#C4A882"] | 驼色/棕褐/米色系列 — 温暖专业         |
| date     | ["#FF6B6B", "#FF8C69", "#F0C987", "#FFB347", "#E8A0BF"] | 珊瑚/桃色/暖金/浅橙/粉红 — 温暖浪漫   |
| formal   | ["#B8860B", "#8B4513", "#CD5C5C", "#DAA520", "#BC8F8F"] | 暗金/棕色/印度红/暗金/玫瑰 — 庄重温暖 |

### 3. 为12个季节型全部重写

12个季节型：

- spring_warm, spring_bright, spring_light
- summer_cool, summer_light, summer_soft
- autumn_warm, autumn_deep, autumn_soft
- winter_cool, winter_bright, winter_deep

每个季节型4种场合，每种场合6个best_colors + 4个avoid_colors + 3个color_combos + 4条tips。

### 4. 重写color_combos

每个combo应包含：

```json
{
  "colors": ["#FF6B6B", "#F0C987"],
  "description": "珊瑚红配暖金色，温暖又有气质",
  "ratio": "60-30-10"
}
```

不同场合的combo描述应不同：

- casual: "轻松活泼的日常搭配"
- business: "温暖专业的职场配色"
- date: "温柔浪漫的约会组合"
- formal: "高级感正式场合搭配"

### 5. 验证色值合理性

确保：

- 暖季型(spring/autumn)不推荐冷色(蓝紫系)为best
- 冷季型(summer/winter)不推荐暖色(橙黄系)为best
- business场景无正红(#FF0000)、纯绿(#00FF00)等过于鲜艳的颜色
- formal场景颜色饱和度适中，不过于浅也不过于艳

## 验证标准

- [ ] 12个季节型 × 4种场合的best_colors全部不同
- [ ] business场景无正红/纯绿/纯黄等过于鲜艳的颜色
- [ ] 暖季型不推荐冷色为best，冷季型不推荐暖色为best
- [ ] 每个color_combo有ratio字段和描述
- [ ] JSON格式正确
- [ ] 文件大小合理(不超过现有文件的3倍)
