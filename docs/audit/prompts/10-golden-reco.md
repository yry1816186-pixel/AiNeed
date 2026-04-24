# 轨道 10: 黄金推荐方案 + 匹配度可视化

你是 XUNO 项目的产品工程师。你的任务有两个：(1)为 Demo 准备完美的黄金推荐方案，(2)实现匹配度雷达图组件。

## 为什么这很重要

Onboarding 最后的"让伊伊搭第一套"是用户的第一印象。当前冷启动推荐质量不可控。必须为最常见的 5 种用户 Profile 各准备 3 套完美推荐——这是保证 Demo 质量的最后防线。

## Part A: 黄金推荐方案

### 5 种核心 Profile × 3 套推荐 = 15 套方案

为以下每种 Profile 准备 3 套搭配方案，每套包含完整单品列表+推荐理由+匹配度数据。

#### Profile 1: 矩形体型 + 面试 + 简约利落 + 预算 500-1000

```
方案A: "稳重大方"
  - 深蓝色休闲西装外套 ×1
  - 白色V领衬衫 ×1
  - 卡其色直筒裤 ×1
  - 棕色皮带 ×1
  - 白色休闲皮鞋 ×1
  推荐理由: "深蓝色传递专业可靠，V领衬衫拉长颈部线条让整体比例更好。"

方案B: "清新干练"
  - 浅灰色针织开衫 ×1
  - 白色圆领T恤 ×1
  - 深色牛仔裤（无破洞） ×1
  - 白色运动鞋（干净） ×1
  推荐理由: "互联网公司的Smart Casual标准，干净利落不过分正式。"

方案C: "低调质感"
  - 黑色休闲西装 ×1
  - 条纹衬衫 ×1
  - 深灰色西裤 ×1
  - 黑色德比鞋 ×1
  推荐理由: "黑色西装最安全的选择，条纹细节增加时尚感。"
```

#### Profile 2: 梨形体型 + 约会 + 温柔优雅 + 预算 300-800

（类似格式准备 3 套）

#### Profile 3: 沙漏体型 + 日常通勤 + 简约利落 + 预算 200-600

（类似格式准备 3 套）

#### Profile 4: 苹果体型 + 旅行 + 活力运动 + 预算 500-1500

（类似格式准备 3 套）

#### Profile 5: 倒三角体型 + 约会 + 前卫个性 + 预算 800-2000

（类似格式准备 3 套）

### 数据文件格式

保存到 `ml/data/golden_recommendations.json`:

```json
[
  {
    "profile_id": "rectangle_interview_minimalist",
    "profile": {
      "bodyType": "rectangle",
      "occasion": "interview",
      "stylePreference": ["minimalist", "classic"],
      "budget": { "min": 500, "max": 1000 }
    },
    "outfits": [
      {
        "id": "golden_001_a",
        "name": "稳重大方",
        "items": [
          { "category": "outerwear", "name": "深蓝色休闲西装外套", "price": 399 },
          { "category": "tops", "name": "白色V领衬衫", "price": 129 },
          { "category": "bottoms", "name": "卡其色直筒裤", "price": 199 },
          { "category": "accessories", "name": "棕色皮带", "price": 89 },
          { "category": "shoes", "name": "白色休闲皮鞋", "price": 259 }
        ],
        "total_price": 1075,
        "explanation": "深蓝色传递专业可靠，V领衬衫拉长颈部线条让整体比例更好。",
        "match_scores": {
          "bodyType": 88,
          "occasion": 95,
          "color": 82,
          "style": 90,
          "budget": 85
        }
      }
    ]
  }
]
```

### API 端点

在 `apps/backend/src/domains/platform/recommendations/` 下添加：

```typescript
@Get('golden/:profileId')
async getGoldenRecommendation(@Param('profileId') profileId: string) {
  // 从golden_recommendations.json读取预定义方案
  // 如果profileId匹配则返回黄金方案，否则走正常推荐
}
```

## Part B: 匹配度雷达图组件

### React Native 组件

文件: `apps/mobile/src/design-system/ui/MatchRadarChart.tsx`

```typescript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { RadarChart } from "react-native-svg-charts"; // 或用 recharts/SVG手绘

interface MatchScores {
  bodyType: number; // 0-100
  occasion: number; // 0-100
  color: number; // 0-100
  style: number; // 0-100
  budget: number; // 0-100
}

interface MatchRadarChartProps {
  scores: MatchScores;
  size?: number;
}

export const MatchRadarChart: React.FC<MatchRadarChartProps> = ({ scores, size = 200 }) => {
  const dimensions = [
    { key: "bodyType", label: "体型", value: scores.bodyType },
    { key: "occasion", label: "场景", value: scores.occasion },
    { key: "color", label: "色彩", value: scores.color },
    { key: "style", label: "风格", value: scores.style },
    { key: "budget", label: "预算", value: scores.budget },
  ];

  const overallScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 5);

  return (
    <View style={styles.container}>
      {/* 雷达图 SVG 实现 */}
      <View style={styles.chart}>{/* 五边形雷达图 + 分数填充 */}</View>
      <View style={styles.scoreContainer}>
        <Text style={styles.overallScore}>{overallScore}%</Text>
        <Text style={styles.scoreLabel}>综合匹配度</Text>
      </View>
      <View style={styles.labels}>
        {dimensions.map((d) => (
          <View key={d.key} style={styles.labelRow}>
            <Text style={styles.labelText}>{d.label}</Text>
            <Text
              style={[
                styles.scoreText,
                { color: d.value >= 80 ? "#4CAF50" : d.value >= 60 ? "#FF9800" : "#F44336" },
              ]}
            >
              {d.value}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};
```

如果 `react-native-svg-charts` 不兼容 RN 0.76，用纯 SVG 手绘五边形：

```typescript
// 用 react-native-svg 的 Path + Polygon 手绘雷达图
import Svg, { Polygon, Circle, Text as SvgText, Line } from "react-native-svg";

const RadarChartSvg = ({ scores, size }) => {
  const center = size / 2;
  const radius = size / 2 - 30;
  const angles = [0, 72, 144, 216, 288]; // 五边形角度
  const labels = ["体型", "场景", "色彩", "风格", "预算"];
  const values = [scores.bodyType, scores.occasion, scores.color, scores.style, scores.budget];

  // 计算每个维度的点坐标
  const points = values
    .map((v, i) => {
      const angle = ((angles[i] - 90) * Math.PI) / 180;
      const r = (radius * v) / 100;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    })
    .join(" ");

  // 背景网格
  const gridPoints = [20, 40, 60, 80, 100].map((level) =>
    angles
      .map((a, i) => {
        const angle = ((a - 90) * Math.PI) / 180;
        const r = (radius * level) / 100;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      })
      .join(" ")
  );

  return (
    <Svg width={size} height={size}>
      {/* 背景网格 */}
      {gridPoints.map((pts, i) => (
        <Polygon key={i} points={pts} fill="none" stroke="#E0E0E0" strokeWidth={1} />
      ))}
      {/* 数据区域 */}
      <Polygon points={points} fill="rgba(33, 150, 243, 0.3)" stroke="#2196F3" strokeWidth={2} />
      {/* 标签 */}
      {labels.map((label, i) => {
        const angle = ((angles[i] - 90) * Math.PI) / 180;
        const x = center + (radius + 20) * Math.cos(angle);
        const y = center + (radius + 20) * Math.sin(angle);
        return (
          <SvgText key={i} x={x} y={y} textAnchor="middle" fontSize={12}>
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
};
```

### 使用方式

在推荐卡片中嵌入：

```typescript
<OutfitCard outfit={outfit}>
  <MatchRadarChart scores={outfit.match_scores} size={180} />
  <Text>{outfit.explanation}</Text>
</OutfitCard>
```

## 验收标准

1. `golden_recommendations.json` 包含 5 种 Profile × 3 套 = 15 套完整推荐方案
2. 每套方案有完整的单品列表、价格、推荐理由、五维匹配度分数
3. 推荐理由遵循体正面措辞（不含"遮""胖""瘦"等）
4. 雷达图组件在移动端正确渲染（五边形 + 数据填充 + 标签 + 百分比）
5. 后端 API `/recommendations/golden/:profileId` 返回正确的黄金方案
