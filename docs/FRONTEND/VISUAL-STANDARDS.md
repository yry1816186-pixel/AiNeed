# XUNO 视觉标准文档

> 基于 VISUAL-REFERENCE-DATABASE.md 搜索结果制定
> 所有前端开发必须遵循此标准 | 2026-04

---

## 一、视觉定位

### 品牌关键词

**"活力的时尚智慧"**

### 视觉金字塔

```
        ┌─────────────┐
        │  高端时尚感  │  ← 杂志级排版、精致细节
        ├─────────────┤
        │  温暖AI助手  │  ← 友好微交互、人格化语气
        ├─────────────┤
        │  极简克制    │  ← Notion式留白、信息层次
        ├─────────────┤
        │  创新动效    │  ← Arc式弹性转场、物理感
        └─────────────┘
```

### 排除项（绝不允许）

- ❌ 蓝紫渐变、霓虹灯效果（科技感）
- ❌ 大红色促销标签、密集商品墙（廉价电商感）
- ❌ 生硬的页面跳转、无动效按钮（原生默认感）
- ❌ 过多装饰元素、信息过载（AI 味）
- ❌ 默认字体/颜色/间距（未设计感）

---

## 二、配色系统

### 核心品牌色（从 design-tokens.ts 取值）

```typescript
// 主色 - 温暖大地色系
terracotta: '#C67B5C'    // 品牌Primary，温暖时尚
sage: '#8B9A7D'          // 品牌Secondary，自然平衡
camel: '#B5A08C'         // 品牌Accent，优雅点缀

// 中性色 - 完整灰度
neutral.white: '#FFFFFF'
neutral.50: '#FAFAF8'    // 温暖白背景（不是冷白）
neutral.100: '#F5F5F3'
neutral.200: '#EBEBE8'
neutral.300: '#D4D4D0'
neutral.400: '#8A8A85'
neutral.500: '#73736D'
neutral.600: '#52524D'
neutral.700: '#3D3D39'
neutral.800: '#282825'
neutral.900: '#1A1A18'
neutral.black: '#0D0D0C'

// 语义色
success: '#5B8A72'       // 成功-自然绿
warning: '#D9A441'       // 警告-暖金
error: '#C44536'         // 错误-暗红
info: '#7B8FA2'          // 信息-钢蓝

// 渐变预设
brand: ['#C67B5C', '#B5A08C']
warm: ['#C67B5C', '#D9A441']
sage: ['#8B9A7D', '#7B8FA2']
```

### 配色使用规则

1. **Primary 按钮/CTA** → terracotta (#C67B5C) 或 brand 渐变
2. **Secondary 操作** → sage (#8B9A7D)
3. **背景** → neutral.50 (#FAFAF8) 温暖白
4. **卡片** → white (#FFFFFF) + neutral.200 border
5. **正文** → neutral.900 (#1A1A18)
6. **辅助文字** → neutral.400 (#8A8A85)
7. **品牌强调** → terracotta，用于 icon 高亮、进度条、badge
8. **分割线** → neutral.200 (#EBEBE8) 或 borders.default
9. **错误/警告/成功** → 只用语义色，不用品牌色

### 禁止事项

- ❌ 硬编码颜色值 → 必须从 `DesignTokens` 或 `Colors` import
- ❌ 使用 #000000 或 #FFFFFF 作为纯黑纯白 → 用 neutral.black / neutral.white
- ❌ 添加新色值 → 如需扩展，先更新 design-tokens.ts

---

## 三、字体系统

### 字体族

```typescript
// iOS
heading: "Georgia"; // 衬线标题 - 品质感
body: "System"; // 系统无衬线 - PingFang SC

// Android
heading: "serif"; // Noto Serif SC
body: "sans-serif"; // Noto Sans SC

// 英文数字 (跨平台)
english: "Inter"; // 比Roboto更时尚、更克制
```

### 字号/字重规范

| 元素类型   | 字号            | 字重          | 行高          | 字间距      |
| ---------- | --------------- | ------------- | ------------- | ----------- |
| 页面大标题 | 30-36 (3xl-4xl) | semibold(600) | tight(1.2)    | tight(-0.5) |
| 区块标题   | 20-24 (xl-2xl)  | semibold(600) | snug(1.35)    | tight(-0.5) |
| 卡片标题   | 16-18 (md-lg)   | medium(500)   | normal(1.5)   | normal(0)   |
| 正文       | 14 (base)       | regular(400)  | relaxed(1.65) | normal(0)   |
| 辅助文字   | 12 (sm)         | light(300)    | normal(1.5)   | normal(0)   |
| 极小文字   | 11 (xs)         | light(300)    | normal(1.5)   | normal(0)   |
| 数字/统计  | 24-48 (2xl-5xl) | bold(700)     | tight(1.2)    | tight(-0.5) |

### 字体使用规则

1. 所有字体属性从 `DesignTokens.typography` 或 `ThemeTypography` 取值
2. 中英文混排时确保行高足够（至少 1.5）
3. 数字使用 Inter 字体，tabular 数字对齐
4. 标题字间距 tight(-0.5px)，正文 normal(0)

---

## 四、动效标准（最关键）

### 核心原则

**每个交互都必须有动效反馈。没有动效 = 没做完。**
**所有动画必须使用 Reanimated 3，禁止使用旧版 Animated API。**
**所有 Spring 配置必须从 `SpringConfigs` 取值，禁止硬编码。**

### Spring 预设对照表（从 animations.ts 取值）

| 预设   | 配置              | 语义 | 适用场景                     |
| ------ | ----------------- | ---- | ---------------------------- |
| snappy | d:20, s:300, m:1  | 确认 | 按钮点击、Toggle、快速反馈   |
| gentle | d:25, s:120, m:1  | 柔和 | 页面转场、卡片滑动、内容出现 |
| bouncy | d:12, s:180, m:1  | 庆祝 | 收藏、成功、奖励、弹性效果   |
| stiff  | d:30, s:400, m:1  | 警示 | 表单验证、错误抖动           |
| slow   | d:25, s:80, m:1.2 | 环绕 | 呼吸效果、背景漂移           |
| soft   | d:15, s:120, m:1  | 轻柔 | 悬停、微妙高亮               |
| rubber | d:8, s:200, m:0.5 | 弹性 | Pop-in、趣味交互             |

### 交互动效标准

| 交互类型         | 动效标准                         | 技术实现                                                                    | Spring 预设   |
| ---------------- | -------------------------------- | --------------------------------------------------------------------------- | ------------- |
| **按钮点击**     | scale 1→0.95→1                   | `withSequence(withSpring(0.95, snappy), withSpring(1, bouncy))`             | snappy+bouncy |
| **卡片按压**     | scale 1→0.98 + shadow 增大       | `withSpring(0.98, snappy)` + shadow interpolation                           | snappy        |
| **页面进入**     | opacity 0→1 + translateY 20→0    | `withSpring(0, gentle)` on opacity/translateY                               | gentle        |
| **页面退出**     | opacity 1→0 + translateY 0→-10   | `withTiming(0, {duration:200})`                                             | timing 200ms  |
| **卡片滑动**     | 跟手移动 + 松手 snap             | `Gesture.Pan` + `withSpring(target, bouncy)`                                | bouncy        |
| **底部 Sheet**   | 弹性拖拽 + 阻尼回弹              | `@gorhom/bottom-sheet` 内置                                                 | -             |
| **收藏心形**     | scale 1→1.3→1 + 粒子爆炸         | `withSequence` + Lottie 播放                                                | bouncy        |
| **骨架屏**       | 左 → 右光泽流动                  | `withRepeat(withTiming(2, 1500ms))`                                         | -             |
| **推荐卡片出现** | 交错延迟 + scale 0.8→1 + opacity | `withDelay(i*50, withSpring(1, bouncy))`                                    | bouncy        |
| **Tab 切换**     | 下划线跟随滑动 + 内容淡入淡出    | `useAnimatedStyle` + `interpolate`                                          | snappy        |
| **下拉刷新**     | 自定义旋转/弹性动画              | `RefreshControl` + Reanimated                                               | gentle        |
| **Toast 通知**   | 顶部弹性滑入 + 自动消失          | `withSpring(0, bouncy)` + `withDelay(3000, withTiming(-100))`               | bouncy        |
| **打字指示器**   | 三点依次跳动                     | `withDelay(i*200, withRepeat(withSequence(withTiming(-8), withTiming(0))))` | -             |
| **消息气泡**     | 弹性出现 + 从左/右侧             | `entering={FadeIn*.springify().damping(12)}`                                | bouncy        |
| **雷达图**       | 0→ 目标值弹性填充                | `withSpring(1, gentle)` + interpolate                                       | gentle        |
| **Onboarding**   | 视差滚动 + 渐变切换              | Parallax + opacity transition                                               | gentle        |
| **搜索展开**     | 宽度弹性展开 + 毛玻璃背景        | `withSpring(width, snappy)` + BlurView                                      | snappy        |
| **数字滚动**     | 数字从 0→ 目标值                 | `withTiming(target, {duration:800})`                                        | -             |
| **标签选中**     | 胶囊弹性缩放                     | `withSequence(withSpring(1.1, bouncy), withSpring(1))`                      | bouncy        |

### 时长规范（从 Duration 取值）

| 类型 | 时长   | 值                  |
| ---- | ------ | ------------------- |
| 即时 | 100ms  | `Duration.instant`  |
| 最快 | 150ms  | `Duration.fastest`  |
| 较快 | 200ms  | `Duration.faster`   |
| 快速 | 250ms  | `Duration.fast`     |
| 正常 | 300ms  | `Duration.normal`   |
| 慢速 | 400ms  | `Duration.slow`     |
| 较慢 | 500ms  | `Duration.slower`   |
| 最慢 | 700ms  | `Duration.slowest`  |
| 极慢 | 1000ms | `Duration.verySlow` |

---

## 五、图标系统

### 采纳方案：Phosphor Icons

**理由：** 6 种粗细(Thin/Light/Regular/Bold/Fill/Duotone)，9000+图标，比 Ionicons 更现代时尚

**使用规范：**

```typescript
import { Heart, House, MagnifyingGlass, ChatCircle, User } from 'phosphor-react-native';

// 默认态：Regular (线性)
<Heart size={24} color={Colors.neutral[900]} weight="regular" />

// 选中态：Fill (填充)
<Heart size={24} color={Colors.brand.primary} weight="fill" />

// 尺寸标准
// 24px - 标准图标
// 20px - 辅助图标
// 28px - 强调图标
// 32px - 大图标(空状态等)

// 颜色规则：跟随文字颜色，不单独设色
// 例外：选中态用品牌色 terracotta
```

### Tab 栏图标映射

| Tab    | 图标            | 未选中  | 选中 |
| ------ | --------------- | ------- | ---- |
| 首页   | House           | regular | fill |
| 发现   | MagnifyingGlass | regular | fill |
| 造型师 | ChatCircle      | regular | fill |
| 我的   | User            | regular | fill |

---

## 六、间距/圆角/阴影系统

### 间距（从 DesignTokens.spacing 取值）

```typescript
// 基础单位 4px
4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24
32: 32, 48: 48, 64: 64, 96: 96

// 常用间距
卡片内边距: Spacing[4] (16px)
区块间距: Spacing[6] (24px)
页面边距: Spacing[5] (20px)
元素间距: Spacing[3] (12px)
```

### 圆角（从 DesignTokens.borderRadius 取值）

```typescript
按钮: md (6px) / lg (10px)
卡片: 2xl (24px) / 3xl (32px)
头像: full (9999)
输入框: lg (10px)
标签/胶囊: xl (16px)
```

### 阴影（从 DesignTokens.shadows 取值）

```typescript
卡片静止: sm (elevation:2)
卡片按压: md (elevation:4)
悬浮元素: lg (elevation:8)
模态弹窗: xl (elevation:12)
品牌强调: brand (terracotta glow, elevation:6)
```

---

## 七、组件设计原则

### 层次结构（Atomic Design）

```
atoms (primitives/)     → Button, Input, Badge, Icon, Avatar
molecules (ui/)         → Card, ChatBubble, SearchBar, Tag, Toast
organisms (features/)   → OutfitCarousel, ChatInterface, ProfileHeader
pages (screens/)        → TodayScreen, DiscoverScreen, StylistScreen
```

### 每个组件必须包含

1. **按压反馈** — scale 弹性 + opacity 变化（不低于 snappy Spring）
2. **进入动画** — FadeIn/ScaleIn/SlideIn（不低于 gentle Spring）
3. **加载态** — Skeleton/Shimmer（使用 SkeletonLoader）
4. **错误态** — 错误提示 + 重试（使用语义色 error）
5. **空状态** — 插图 + 文案 + CTA（使用 EmptyState）
6. **主题适配** — 从 useTheme() 取色，支持深色模式

### 性能要求

1. 所有动画在 UI 线程运行（worklet）
2. 长列表使用 `@shopify/flash-list`
3. 图片使用 `react-native-fast-image` 或缓存
4. 复杂绘制使用 `@shopify/react-native-skia`
5. 避免在动画回调中触发 JS 线程 setState

---

_此文件为 XUNO 前端开发的视觉宪法。所有组件实现必须严格遵循此标准。_
