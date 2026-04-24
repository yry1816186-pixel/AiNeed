# 寻裳 XUNO — 前端视觉革命：全网搜罗+顶级执行方案

你是一位顶级 React Native 前端工程师 + UI/UX 设计师，你的审美标准是 Dribbble 年度最佳、App Store 精选推荐级别。你对"AI 味"零容忍。

## 你的任务

**分三个阶段执行，不要跳步：**

## 阶段一：全网搜罗（必须先完成，再做其他）

用 WebSearch 和 GitHub 搜索，找到足够多的优秀参考和组件。**这是最重要的阶段，搜得不够多不够好，后面全废。**

### 搜索清单（每个都要搜，不能遗漏）

#### 1. React Native 动效库和组件

搜索：

- "react native reanimated v3 advanced animation examples 2025 2026"
- "react native skia creative UI examples"
- "react native moti animation library examples"
- "react native shared element transition navigation"
- "react native lottie animation fashion app"
- "react native blur effect glassmorphism"
- "react native parallax scroll header"
- "react native bottom sheet gorhom creative examples"
- "react native flashlist carousel snap effect"

对每个搜索结果，记录：

- 库名和版本
- 是否与 RN 0.76 兼容
- 最佳示例的 GitHub 链接
- 视觉效果描述

#### 2. 时尚/穿搭 App UI 参考

搜索：

- "best fashion app UI design 2025 2026 dribbble"
- "AI wardrobe app UI design"
- "virtual try on app UI UX"
- "outfit recommendation app interface"
- "小红书 app UI design analysis"
- "得物 poizon app UI design"
- "SHEIN app UI redesign concept"
- "stitch fix app UI design"
- "ASAP styling app UI"
- "whering wardrobe app UI"

对每个参考 App，记录：

- 视觉风格关键词（minimal/bold/playful/luxury）
- 配色方案
- 字体选择
- 核心动效（转场、加载、微交互）
- 可以 1:1 还原的具体页面

#### 3. 开源时尚/电商 App 完整项目

搜索 GitHub：

- "react native fashion app open source"
- "react native ecommerce app beautiful UI"
- "react native clothing store app"
- "react native ai stylist app"
- "react native shopping app dribbble quality"

对每个找到的项目，clone 或浏览代码，记录：

- 使用了哪些动效库
- 设计系统结构
- 具体的动画实现方式
- 截图或 Demo 链接

#### 4. 具体 UI 组件的高级实现

搜索每个组件的最佳实现：

**卡片组件：**

- "react native card component glassmorphism blur shadow 2025"
- "react native product card animation flip expand"

**底部导航栏：**

- "react native bottom tab bar custom animation 2025"
- "react native animated tab bar creative"

**轮播/滑动：**

- "react native snap carousel smooth animation"
- "react native outfit card swipe tinder style"

**骨架屏/加载：**

- "react native skeleton shimmer pulse animation"
- "react native content placeholder animation"

**微交互：**

- "react native heart animation favorite button"
- "react native button press scale spring animation"
- "react native toast notification slide animation"

**页面转场：**

- "react native stack navigator shared element transition"
- "react native screen transition animation reanimated"

**聊天界面：**

- "react native chat UI beautiful design 2025"
- "react native message bubble animation typing indicator"
- "react native ai chat interface design"

**Onboarding：**

- "react native onboarding flow beautiful animation"
- "react native parallax onboarding screens"

**图表/数据可视化：**

- "react native radar chart animation"
- "react native progress ring animation"

#### 5. 图标系统

搜索：

- "fashion app icon set minimal line 2025"
- "react native custom icon font fashion"
- "clothing app UI icons set free"
- "phosphor icons vs lucide icons react native"

#### 6. 字体方案

搜索：

- "best chinese font for mobile app 2025"
- "alibaba puHuiTi font react native"
- "react native custom font setup android ios"
- "fashion app typography best practices"

### 输出：视觉参考数据库

把所有搜索结果整理到文件：
`C:\AiNeed\docs\FRONTEND\VISUAL-REFERENCE-DATABASE.md`

格式：

```markdown
# XUNO 前端视觉参考数据库

## 一、动效库评估

| 库名                    | 版本   | RN 0.76 兼容 | 用途           | 最佳示例 | 采纳决策 |
| ----------------------- | ------ | ------------ | -------------- | -------- | -------- |
| react-native-reanimated | 3.16.7 | ✅           | 所有动效的基础 | [链接]   | 必用     |
| ...                     |        |              |                |          |          |

## 二、App UI 参考

| App 名 | 风格 | 核心亮点 | 可借鉴的页面 | 截图/Demo |
| ------ | ---- | -------- | ------------ | --------- |
| 小红书 | ...  | ...      | ...          | ...       |
| ...    |      |          |              |           |

## 三、开源项目参考

| 项目 | Stars | 视觉质量 | 可复用组件 | GitHub 链接 |
| ---- | ----- | -------- | ---------- | ----------- |
| ...  |       |          |            |             |

## 四、组件级实现方案

### 卡片组件

最佳实现: [描述+链接]
技术方案: [用什么库、什么 API]
视觉效果: [具体描述]

### 底部导航栏

...

（每个组件都要写）
```

---

## 阶段二：视觉标准制定

基于搜索结果，制定 XUNO 的完整视觉标准。写到 `C:\AiNeed\docs\FRONTEND\VISUAL-STANDARDS.md`。

### 视觉定位

XUNO 的视觉定位是：**"活力的时尚智慧"**

- 不是冷冰冰的科技感（排除蓝紫渐变、霓虹灯效果）
- 不是廉价电商感（排除大红色促销标签、密集商品墙）
- 是**高端时尚杂志 + 温暖 AI 助手**的融合

参考：

- 小红书的温暖社区感
- Notion 的极简克制
- Arc 浏览器的创新动效
- 苹果设计奖 App 的精致细节

### 配色系统（必须包含色值）

```
主色: Terracotta #C67B5C（温暖、时尚、不是蓝紫）
辅色: Sage #8B9A7D（自然、平衡）
中性色: #1A1A18 到 #FAFAF8 的完整灰度
背景: #FAFAF8（温暖白，不是冷白#FFFFFF）
错误: #C44536
成功: #5B8A72
```

现有 design-tokens.ts 中的配色已经不错。关键是**在组件中真正用起来**。

### 字体系统

- 中文：思源黑体（Android）/ PingFang SC（iOS）
- 英文数字：Inter（比 Roboto 更时尚）
- 大标题：字重 600-700，间距-0.5px
- 正文：字重 400，行高 1.6
- 辅助文字：字重 300，颜色降低到 neutral.400

### 动效标准（最关键）

**原则：每个交互都必须有动效反馈。没有动效 = 没做完。**

| 交互类型     | 动效标准                                       | 技术实现                    |
| ------------ | ---------------------------------------------- | --------------------------- |
| 按钮点击     | scale 0.95→1.0 spring(snap)                    | Reanimated withTapGesture   |
| 卡片点击     | scale 0.98 + shadow 增大 + spring(bouncy)      | Reanimated                  |
| 页面进入     | opacity 0→1 + translateY 20→0 + spring(gentle) | Reanimated                  |
| 页面退出     | opacity 1→0 + translateY 0→-10 + timing(200ms) | Reanimated                  |
| 卡片滑动     | 跟手移动 + 松手 snap + spring(bouncy)          | GestureHandler + Reanimated |
| 底部 Sheet   | 弹性拖拽 + 阻尼回弹                            | @gorhom/bottom-sheet        |
| 收藏心形     | 从中心爆炸的粒子效果                           | Reanimated + Lottie         |
| 骨架屏       | 从左到右的光泽流动                             | Reanimated linear gradient  |
| 推荐卡片出现 | 交错延迟出现 + scale 0.8→1 + opacity           | Reanimated withDelay        |
| Tab 切换     | 下划线跟随滑动 + 内容淡入淡出                  | Reanimated shared value     |
| 下拉刷新     | 自定义动画（不是系统默认）                     | Reanimated                  |
| Toast 通知   | 从顶部弹性滑入 + 自动消失                      | Reanimated                  |
| 打字指示器   | 三个点依次跳动                                 | Reanimated withSequence     |
| 消息气泡     | 从右侧弹性出现                                 | Reanimated spring(bouncy)   |
| 雷达图       | 从 0 到目标值的动画填充                        | Reanimated                  |
| Onboarding   | 视差滚动 + 渐变切换                            | Reanimated + GestureHandler |

### 图标系统

使用 Phosphor Icons（比 Ionicons 更现代、更时尚）：

- 风格：Regular（线性）为主，Bold（填充）用于选中状态
- 尺寸：24px 标准，20px 辅助，28px 强调
- 颜色：跟随文字颜色，不单独设色

---

## 阶段三：组件执行计划

写到 `C:\AiNeed\docs\FRONTEND\COMPONENT-EXECUTION-PLAN.md`

### 必须新建/重写的组件清单

按页面组织，每个组件给出：

1. 视觉参考（搜到的最佳实现链接）
2. 技术方案（具体用什么库的什么 API）
3. 实现代码骨架（可以直接用的代码片段）

#### Page 1: TodayScreen（首页，第一印象）

```
┌─────────────────────────────────┐
│  ╭─────────────────────────╮    │  ← 顶部毛玻璃Header
│  │  ☀️ 28°C 晴  周三        │    │    渐变背景+天气动画
│  │  你明天有面试，准备好了吗  │    │    场景感知卡片
│  ╰─────────────────────────╯    │
│                                 │
│  今日推荐 ──────────── 查看全部 > │  ← 标题with弹簧动画
│                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐  │  ← 推荐卡片轮播
│  │ 方案A │  │ 方案B │  │ 方案C │  │    3D透视旋转
│  │      │  │      │  │      │  │    阴影层次
│  │ 88%  │  │ 82%  │  │ 90%  │  │    匹配度badge
│  └──────┘  └──────┘  └──────┘  │    弹性滑动
│                                 │
│  ─── 伊伊有话说 ───              │  ← AI推荐语气泡
│  "明天面试建议Smart Casual"      │    打字机动画
│                                 │
│  ┌─────────────────────────┐    │  ← 快速回复按钮组
│  │ [换一套] [试穿] [保存]   │    │    点击scale动效
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

组件清单：

1. **GlassHeader** — 毛玻璃效果顶栏，背景渐变
2. **WeatherSceneCard** — 天气+场景感知卡片，带呼吸动画
3. **OutfitCarousel** — 推荐方案 3D 轮播，透视旋转效果
4. **OutfitCard** — 单个搭配卡片，点击弹性缩放+匹配度 badge
5. **AiInsightBubble** — 伊伊推荐语气泡，打字机效果
6. **QuickReplyButtons** — 快速回复按钮组，点击弹性反馈

#### Page 2: DiscoverScreen（发现页）

组件清单： 7. **SearchBar** — 搜索栏，焦点时展开+毛玻璃背景 8. **ScenePills** — 场景选择胶囊，选中弹簧动画 9. **ProductFeedCard** — 商品推荐卡片，瀑布流布局 10. **MatchScoreBadge** — 匹配度小徽章，数字动画 11. **RecommendReasonTag** — 推荐理由标签，渐变背景

#### Page 3: StylistScreen（造型师对话页）

组件清单： 12. **ChatBubble** — 消息气泡，弹性出现动画 13. **OutfitResultBubble** — 搭配方案气泡，内嵌卡片+雷达图 14. **TypingIndicator** — 打字指示器，三点跳动 15. **QuickReplyBar** — 底部快速回复栏 16. **VoiceButton** — 语音按钮（TTS），脉冲动画 17. **MatchRadarChart** — 匹配度雷达图，SVG 绘制+数值动画

#### Page 4: ProfileScreen（个人中心）

组件清单： 18. **ProfileHeader** — 个人信息头部，渐变背景+头像 19. **StyleTagCloud** — 风格标签云 20. **StatsCard** — 统计卡片，数字滚动动画

#### 跨页面组件

21. **AnimatedTabBar** — 底部导航栏，图标+指示器滑动动画
22. **PageTransition** — 页面转场动画，共享元素过渡
23. **LoadingSkeleton** — 高级骨架屏，光泽流动
24. **PullToRefresh** — 自定义下拉刷新动画
25. **Toast** — 弹性通知组件

### 每个组件的代码骨架要求

对于每个组件，给出：

```typescript
// 示例：OutfitCard 组件代码骨架
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withSequence,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import LinearGradient from "react-native-linear-gradient";
import { BlurView } from "expo-blur"; // 或 @react-native-community/blur

// 具体实现...
// 必须包含：
// 1. 按压弹性缩放（scale 1→0.97→1）
// 2. 阴影层次变化
// 3. 匹配度badge的数字滚动动画
// 4. 推荐理由标签的渐变背景
```

---

## 当前项目状态（给搜索提供上下文）

### 已有的依赖（可以使用）

- react-native-reanimated 3.16.7 ✅
- react-native-gesture-handler 2.20.2 ✅
- @gorhom/bottom-sheet 5.0.0 ✅
- react-native-linear-gradient 2.8.3 ✅
- react-native-vector-icons 10.2.0 ✅

### 需要新增的依赖（搜索后确定版本）

- react-native-blur / expo-blur（毛玻璃效果）
- @shopify/flash-list（高性能列表）
- react-native-svg（SVG 绘制雷达图）
- lottie-react-native（Lottie 动画）
- @mobily/stacks 或类似（布局工具）
- react-native-fast-image（图片缓存）

### 已有的 design system 结构

```
design-system/
  primitives/  → Button, Card, Dialog, Input, Toast, LoadingStates
  skeleton/    → Skeleton
  theme/       → colors, typography, spacing, shadows, animations, design-tokens
  ui/          → AnimatedHeartButton, Skeleton, Rating 等
```

theme/tokens/下的 token 已经定义好了（色彩 terracotta 系、字体 PingFang+Inter、动效 SpringConfigs）。
**问题是组件实现没有真正使用这些 token，也没有高级动效。**

### 必须遵循的原则

1. **不要发明新的设计系统** — 现有的 design-tokens.ts 色彩和动效配置很好，在此基础上构建
2. **不要手写可以 import 的组件** — 先搜索有没有现成的高质量实现
3. **每个动画都必须用 Reanimated 3** — 不允许用 Animated（旧 API）
4. **每个交互必须有视觉反馈** — 没有动效的组件 = 未完成
5. **配色必须从 design-tokens.ts 取** — 不允许硬编码颜色
6. **iOS 和 Android 双平台都要考虑** — 毛玻璃效果用平台适配

## 最终交付

完成后写出以下文件：

1. `C:\AiNeed\docs\FRONTEND\VISUAL-REFERENCE-DATABASE.md` — 搜索结果数据库
2. `C:\AiNeed\docs\FRONTEND\VISUAL-STANDARDS.md` — 视觉标准文档
3. `C:\AiNeed\docs\FRONTEND\COMPONENT-EXECUTION-PLAN.md` — 25 个组件的详细实现计划（含代码骨架）

这三个文件是后续 Trae 窗口执行前端开发时的唯一输入。质量决定了前端的天花板。
