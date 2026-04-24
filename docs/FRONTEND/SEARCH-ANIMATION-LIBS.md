# AiNeed RN 动效库与组件调研报告

> 调研日期: 2026-04-23 | 目标: RN 0.76 兼容性评估 | 用途: AiNeed 虚拟试穿应用

---

## 一、动效库评估

| 库名                                         | 最新版本 | RN 0.76 兼容                           | 用途                                                              | 最佳示例 / 链接                                                                                                                                                                                      | 采纳决策                                                    |
| -------------------------------------------- | -------- | -------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **react-native-reanimated**                  | 4.3.0    | 完全兼容 (v3.x/v4.x 均支持 New Arch)   | 高性能动画引擎, 60fps UI 线程动画, worklet 架构                   | [官方 Examples](https://docs.swmansion.com/react-native-reanimated/examples/) / [2026 教程](https://www.sparkgoldentech.com/en/blog/2026/04/04/building-cross-platform-animations-with-reanimated-3) | **核心依赖** -- 所有动画的基石, 必装                        |
| **@shopify/react-native-skia**               | 2.6.2    | 完全兼容 (v2.x 适配最新 RN)            | 高性能 2D 图形渲染, shader 效果, 粒子动画, 自定义绘制             | [官方文档](https://shopify.github.io/react-native-skia/) / [William Candillon YouTube](https://www.youtube.com/@wcandillon)                                                                          | **强烈推荐** -- 毛玻璃、自定义图表、高级视觉效果            |
| **moti**                                     | 0.30.0   | 兼容 (基于 Reanimated 3, 但更新频率低) | 声明式动画 API, MotiView/MotiText, AnimatePresence, 内置 Skeleton | [官方站](https://moti.fyi/) / [GitHub](https://github.com/nandorojo/moti)                                                                                                                            | **可选** -- API 简洁但更新停滞; 简单动画可直接用 Reanimated |
| **react-native-gesture-handler**             | 2.31.1   | 完全兼容                               | 手势系统, 拖拽/滑动/捏合/长按, 与 Reanimated 深度集成             | [GitHub](https://github.com/software-mansion/react-native-gesture-handler)                                                                                                                           | **核心依赖** -- 所有手势交互的基础                          |
| **lottie-react-native**                      | 7.3.6    | 完全兼容                               | After Effects 动画播放, 复杂矢量动画, loading/成功/引导页         | [LottieFiles](https://lottiefiles.com) / [GitHub](https://github.com/lottie-react-native/lottie-react-native)                                                                                        | **推荐** -- 品牌 loading、引导页动画、复杂插画动画          |
| **@gorhom/bottom-sheet**                     | 5.2.10   | 完全兼容                               | 高性能底部弹出面板, 支持嵌套滚动/堆叠/自定义动画                  | [官方文档](https://gorhom.github.io/react-native-bottom-sheet/) / [GitHub](https://github.com/gorhom/react-native-bottom-sheet)                                                                      | **推荐** -- 选择尺码/颜色、筛选面板、操作确认               |
| **@shopify/flash-list**                      | 2.3.1    | 完全兼容                               | 高性能列表渲染, 替代 FlatList, 支持 snapToInterval 做轮播         | [官方文档](https://shopify.github.io/flash-list/docs/usage/)                                                                                                                                         | **推荐** -- 商品列表、聊天消息列表的高性能方案              |
| **react-native-svg**                         | 15.15.4  | 完全兼容                               | SVG 渲染, 图表绘制, 自定义形状, 动画路径                          | [GitHub](https://github.com/software-mansion/react-native-svg)                                                                                                                                       | **核心依赖** -- 图表/图标/自定义形状的基础                  |
| **react-navigation-shared-element**          | 3.1.3    | 兼容 (需配合 native-stack)             | 页面间共享元素转场动画 (Hero transition)                          | [GitHub](https://github.com/IjzerenHein/react-navigation-shared-element)                                                                                                                             | **推荐** -- 商品列表到详情页的图片转场                      |
| **expo-blur**                                | 55.0.14  | 兼容 (Expo 项目)                       | 模糊效果, 毛玻璃背景                                              | [Expo 文档](https://docs.expo.dev/versions/latest/sdk/blur/)                                                                                                                                         | **推荐** -- 毛玻璃卡片、悬浮头部模糊效果                    |
| **react-native-deck-swiper**                 | 2.0.19   | 兼容                                   | Tinder 风格卡片堆叠滑动                                           | [GitHub](https://github.com/alexbrillant/react-native-deck-swiper)                                                                                                                                   | **推荐** -- 穿搭卡片 "喜欢/不喜欢" 滑动交互                 |
| **react-native-toast-message**               | 2.3.3    | 兼容                                   | Toast 通知, 自定义 slide 动画                                     | [GitHub](https://github.com/calintamas/react-native-toast-message)                                                                                                                                   | **推荐** -- 操作反馈、成功/错误提示                         |
| **react-native-circular-progress-indicator** | 4.4.2    | 兼容                                   | 环形进度条动画                                                    | [NPM](https://www.npmjs.com/package/react-native-circular-progress-indicator)                                                                                                                        | **推荐** -- 体型匹配度、穿搭评分展示                        |
| **react-native-gifted-charts**               | 1.4.76   | 兼容                                   | 雷达图/柱状图/折线图, 内置动画支持                                | [NPM](https://www.npmjs.com/package/react-native-gifted-charts)                                                                                                                                      | **推荐** -- 穿搭风格雷达图                                  |
| **react-native-shimmer-placeholder**         | 2.0.9    | 兼容                                   | 骨架屏 shimmer 动画                                               | [GitHub](https://github.com/tomzaku/react-native-shimmer-placeholder)                                                                                                                                | **推荐** -- 加载态占位符                                    |
| **@bam.tech/react-native-snap-carousel**     | 3.2.3    | 兼容 (原版维护 fork)                   | 轮播组件, snap 吸附效果, parallax 图片                            | [NPM](https://npmjs.com/package/@bam.tech/react-native-snap-carousel)                                                                                                                                | **推荐** -- 穿搭图片轮播、引导页                            |

---

## 二、组件级最佳实现

### 2.1 卡片组件 (Card -- 毛玻璃 / 翻转 / 展开动画)

#### 方案 A: 毛玻璃卡片 (Glassmorphism)

- **技术方案**: `expo-blur` (BlurView) + `react-native-reanimated` (scale/tap 动画) + React Native shadow props
- **GitHub / npm**:
  - expo-blur: https://docs.expo.dev/versions/latest/sdk/blur/
  - 备选: `@react-native-community/blur` (非 Expo 项目)
  - 参考实现: https://cygnis.co/blog/implementing-liquid-glass-ui-react-native/
- **视觉效果描述**: 半透明磨砂玻璃质感, 背景内容模糊透出, 卡片边缘柔和光晕, 按压缩放 spring 反弹效果, 阴影层次分明。2025 年 Apple Liquid Glass 设计趋势风格。
- **核心 API**: `<BlurView intensity={80} tint="light">` + `withSpring(scale, { damping: 15 })` + `shadowOpacity / shadowRadius`

#### 方案 B: 翻转卡片 (Flip Card)

- **技术方案**: `react-native-reanimated` -- `useSharedValue` + `useAnimatedStyle` + `withSpring` + `rotateY` 变换
- **最佳示例**: https://docs.swmansion.com/react-native-reanimated/examples/flipCard/
- **视觉效果描述**: 3D 透视翻转效果, 正面展示商品图片/名称, 翻转后展示详情/尺码。翻转过程中有自然的 3D 透视变形, 配合阴影深度变化营造立体感。
- **核心 API**: `useSharedValue(0)` 控制 rotateY, `interpolate(rotateY, [0, 180], [1, -1])` 控制正反面可见性

#### 方案 C: 展开/折叠卡片 (Expand Card)

- **技术方案**: `react-native-reanimated` -- `measure` + `withTiming` 控制高度动画
- **最佳示例**: https://dev.to/dimaportenko/collapsible-card-with-react-native-reanimated-495a
- **视觉效果描述**: 点击卡片平滑展开显示更多详情, 高度从 0 过渡到内容实际高度, 展开/收起过程流畅无跳跃, 可配合 opacity 渐变。
- **核心 API**: `useAnimatedStyle` + `height: withTiming(contentHeight)` + `onLayout` 测量

**采纳决策**: 方案 A (毛玻璃) + 方案 B (翻转) 混合使用, 用 Skia 实现高级毛玻璃效果, Reanimated 驱动所有交互动画。

---

### 2.2 底部导航栏 (Bottom Tab Bar -- 自定义动画)

- **技术方案**: `@react-navigation/bottom-tabs` + 自定义 `tabBar` prop + `react-native-reanimated` 动画指示器 + `react-native-svg` 绘制自定义形状
- **最佳示例**:
  - Expo 官方博客: https://expo.dev/blog/how-to-build-beautiful-react-native-bottom-tabs
  - Skia + Reanimated 实现: https://www.reddit.com/r/reactnative/comments/1l9iea0/
  - YouTube 教程: https://www.youtube.com/watch?v=GrLCS5ww030
- **GitHub / npm**:
  - `@react-navigation/bottom-tabs`: https://reactnavigation.org/docs/bottom-tab-navigator/
  - `react-native-animated-nav-tab-bar`: https://github.com/torgeadelin/react-native-animated-nav-tab-bar
- **视觉效果描述**:
  - **方案 1 - 胶囊指示器**: 当前 tab 底部有一个圆角胶囊背景, 随 tab 切换平滑滑动, 配合 icon 颜色过渡和微弹跳
  - **方案 2 - SVG 路径变形**: 中间 tab 按钮凸起, 两侧有波浪形凹陷, 点击时 SVG 路径动态变形过渡
  - **方案 3 - Bouncing Icon**: 选中 tab 时 icon 先缩小再弹回原大小, 配合 spring overshoot 效果
- **核心 API**: `useAnimatedStyle` + `withSpring(translateX)` 滑动指示器, `interpolateColor` 颜色过渡, `useDerivedValue` 计算指示器位置

**采纳决策**: 采用方案 1 (胶囊指示器), 用 Reanimated `withSpring` 实现平滑滑动, 配合 `interpolateColor` 做 icon/文字颜色过渡。高级场景可用 Skia 绘制自定义 tab 形状。

---

### 2.3 轮播组件 (Carousel -- Snap 吸附效果)

- **技术方案 A**: `@bam.tech/react-native-snap-carousel` (成熟方案, 原 meliorence 版的维护 fork)
- **技术方案 B**: `@shopify/flash-list` + `snapToInterval` / `pagingEnabled` (高性能方案)
- **技术方案 C**: 自定义 FlatList + Reanimated (最大灵活性)
- **最佳示例**:
  - 原版 GitHub: https://github.com/meliorence/react-native-snap-carousel
  - FlashList snap: https://shopify.github.io/flash-list/docs/usage/
  - 高性能无限循环: https://juejin.cn/post/7018214482899894303
- **GitHub / npm**:
  - `@bam.tech/react-native-snap-carousel`: https://npmjs.com/package/@bam.tech/react-native-snap-carousel
- **视觉效果描述**:
  - **商品图片轮播**: 全宽图片, 左右露出相邻卡片边缘 (preview 效果), 松手后自动吸附居中, 配合 parallax 视差 (背景图片移动速度慢于前景)
  - **穿搭卡片轮播**: 大卡片 + 缩放效果 (当前卡片 1.0, 相邻卡片 0.85), 页面指示器 dots 同步动画
  - **自动播放**: 无限循环自动播放, 手动滑动时暂停, 停止操作后恢复
- **核心 API**: `snapToAlignment="center"`, `apparentSnapToInterval`, `onScroll` + `interpolate` 实现缩放, `enableMomentum` 平滑体验

**采纳决策**: 简单轮播场景用 `@bam.tech/react-native-snap-carousel`, 高性能列表场景用 FlashList + snap。穿搭卡片用自定义 Reanimated 方案实现缩放视差效果。

---

### 2.4 骨架屏 (Skeleton / Shimmer / Pulse 动画)

- **技术方案 A**: `react-native-shimmer-placeholder` (成熟库, 支持 Reanimated 驱动)
- **技术方案 B**: `moti/skeleton` (MotiSkeleton, 简洁声明式)
- **技术方案 C**: `react-native-reanimated` + `react-native-svg` (LinearGradient 动画扫描)
- **最佳示例**:
  - Shimmer 效果教程: https://www.youtube.com/watch?v=WqZzqKQq-rM
  - Callstack Shimmer 库: https://www.callstack.com/blog/performant-and-cross-platform-shimmers-in-react-native-apps
  - Medium 文章: https://medium.com/@andrew.chester/react-native-skeleton-loaders-elevate-your-apps-ux-with-shimmering-placeholders-5003b9507117
- **GitHub / npm**:
  - `react-native-shimmer-placeholder`: https://github.com/tomzaku/react-native-shimmer-placeholder
  - `react-native-skeleton-placeholder`: https://github.com/chramos/react-native-skeleton-placeholder
- **视觉效果描述**:
  - **Shimmer (闪光扫描)**: 一道高光从左到右扫过灰占位块, 类似 YouTube/Twitter 的加载态, 扫光有渐变边缘, 速度均匀
  - **Pulse (脉冲)**: 占位块整体透明度在 0.3-0.7 之间循环呼吸, 适合简单场景
  - **Wave (波浪)**: 从一端到另一端的波浪式渐变扫描, 比 shimmer 更柔和
- **核心 API**: `<ShimmerPlaceholder width={200} height={20} shimmerColors={['#f0f0f0', '#e0e0e0', '#f0f0f0']}>` 或 Reanimated `useAnimatedStyle` + `translateX` 动画 LinearGradient

**采纳决策**: 使用 `react-native-shimmer-placeholder` 快速实现, 复杂骨架布局 (商品卡片/列表) 自定义占位结构, 配合 Reanimated 驱动 shimmer 动画确保 60fps。

---

### 2.5 微交互 (Micro-interactions)

#### 2.5.1 心形动画 / 收藏按钮

- **技术方案**: `react-native-reanimated` + `react-native-svg` (心形路径) + 粒子爆炸效果
- **最佳示例**: https://www.reactnativepro.com/react-native-animations/animating-the-heart-button-in-react-native/
- **视觉效果描述**: 点击心形 icon 时, icon 从空心变为实心, 同时 spring 弹跳放大到 1.3x 再缩回 1.0x。填充过程有从底部向上"填充"的液态动画。可选: 周围散发出 6-8 个小心形粒子, 各自随机方向飞出并淡出。
- **核心 API**: `withSpring(scale, { overshootClamping: false })` + `withTiming(fillProgress)` + SVG path morphing

#### 2.5.2 按钮按压缩放 (Press Scale Spring)

- **技术方案**: `react-native-reanimated` -- `useSharedValue` + `withSpring` + `Pressable.onPressIn/onPressOut`
- **最佳示例**: https://www.youtube.com/watch?v=hGHvDL07KeA / https://egghead.io/lessons/react-animate-the-scale-of-a-react-native-button-using-animated-spring
- **视觉效果描述**: 手指按下时按钮缩小到 0.92-0.95x, 有轻微下沉感; 松手时 spring 弹回 1.0x, 有微小 overshoot (超过 1.0 再回弹)。整个过程 60fps 无卡顿。
- **核心 API**: `useSharedValue(1)` + `withSpring(pressed ? 0.93 : 1, { damping: 15, stiffness: 300 })` + `useAnimatedStyle({ transform: [{ scale }] })`

#### 2.5.3 Toast 通知滑入滑出

- **技术方案**: `react-native-toast-message` (开箱即用) 或 `react-native-reanimated` 自定义 (translateY + opacity)
- **最佳示例**:
  - react-native-toast-message: https://github.com/calintamas/react-native-toast-message
  - 自定义 Toast 教程: https://orjiace.medium.com/react-native-reanimated-toast-with-stack-cards-6535e5a3009a
- **视觉效果描述**: Toast 从顶部/底部平滑滑入, translateY 从 -80 到 0, 配合 opacity 0->1 渐变。显示 2-3 秒后自动滑出淡出。支持堆叠多个 Toast, 新 Toast 将旧的向上推。可自定义 success/error/info 样式。
- **核心 API**: `entering={SlideInUp}` + `exiting={SlideOutUp}` (Reanimated LayoutAnimation) 或 `withTiming(translateY)` + `withDelay(2000, withTiming(-80))`

**采纳决策**: 全部采纳。心形动画用于收藏穿搭/单品; 按钮缩放全局应用于所有交互按钮; Toast 用于操作反馈。

---

### 2.6 页面转场 (Screen Transitions)

#### 2.6.1 共享元素转场 (Shared Element Transition)

- **技术方案 A**: `react-navigation-shared-element` (成熟方案, Hero transition)
- **技术方案 B**: React Navigation v7 原生 `sharedTransitionTag` (需 `@react-navigation/native-stack`)
- **最佳示例**:
  - Reanimated 官方文档: https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/
  - React Navigation 官方: https://reactnavigation.org/docs/shared-element-transitions/
  - YouTube 教程: https://www.youtube.com/watch?v=tsleLxbvxe0
- **GitHub / npm**:
  - `react-navigation-shared-element`: https://github.com/IjzerenHein/react-navigation-shared-element
  - `react-native-shared-element`: https://github.com/IjzerenHein/react-native-shared-element
- **视觉效果描述**: 商品列表页点击某张图片, 该图片无缝放大到详情页的顶部大图位置, 背景内容 cross-fade 过渡, 返回时图片缩小回列表原位。整个过程流畅连贯, 无闪烁。
- **核心 API**: `<SharedElement id={`item.${id}.photo`}>` 包裹两端元素, `sharedElements={(route) => [`item.${id}.photo`]}` 配置 Screen

#### 2.6.2 自定义页面过渡动画

- **技术方案**: `@react-navigation/native-stack` + `cardStyleInterpolator` / `transitionSpec` + Reanimated
- **最佳示例**:
  - 自定义触摸驱动过渡: https://medium.com/@islamrustamov/custom-screen-transition-based-on-user-touch-in-react-native-98f1c4c831ee
  - Reanimated Layout Transitions: https://docs.swmansion.com/react-native-reanimated/docs/2.x/api/LayoutAnimations/layoutTransitions/
- **视觉效果描述**:
  - **iOS 默认**: 新页面从右侧滑入, 旧页面微微左移并暗化
  - **淡入放大**: 新页面从 0.95x + opacity 0 过渡到 1.0x + opacity 1
  - **共享元素**: 指定元素平滑 morph 到新位置, 其余元素 cross-fade
- **核心 API**: `cardStyleInterpolator: forFadeFromBottomAndroid` 或自定义 `CardStyleInterpolators.forScaleCenterScreen`

**采纳决策**: 优先使用方案 B (React Navigation 原生 sharedTransitionTag), 因为其与 New Architecture 更兼容。备选方案 A 用于复杂转场场景。

---

### 2.7 聊天界面 (Chat UI -- AI 对话)

#### 2.7.1 整体聊天 UI

- **技术方案 A**: `react-native-gifted-chat` (成熟方案, 开箱即用)
- **技术方案 B**: 自定义 FlatList (inverted) + Reanimated 消息动画 + Markdown 渲染
- **最佳示例**:
  - Gifted Chat: https://github.com/FaridSafi/react-native-gifted-chat
  - CometChat UI Kit: https://www.cometchat.com/react-native-chat-ui-kit
  - 自定义聊天 UI: https://medium.com/@keith.kurak/a-simple-chat-ui-example-in-react-native-6aeec001d51b
- **视觉效果描述**: 左侧 AI 消息气泡 (浅色背景, 圆角, 带 AI 头像), 右侧用户消息气泡 (主题色背景, 圆角)。消息从底部 slide-in 出现, AI 回复支持逐字打字效果 (streaming)。输入框底部固定, 自动适应键盘高度。
- **核心 API**: `<FlatList inverted />` + `KeyboardAvoidingView` + `onContentSizeChange` 自动滚动到底部

#### 2.7.2 打字指示器 (Typing Indicator)

- **技术方案**: `react-native-reanimated` 驱动三个点的交错弹跳动画
- **最佳示例**:
  - `react-native-chat-typing-indicator`: https://github.com/RahulMandyal1/react-native-chat-typing-indicator/
  - `react-native-typing-animation`: https://github.com/watadarkstar/react-native-typing-animation
- **视觉效果描述**: 三个圆点 (dot) 交替上下弹跳, 每个点错开 200ms, 使用 sin 曲线控制 translateY, 整体呈现"正在输入"的波浪感。点颜色与 AI 气泡背景协调。
- **核心 API**: `withRepeat(withTiming(translateY, { duration: 400 }), -1, true)` + `withDelay(index * 200, ...)` 交错

**采纳决策**: 采用自定义方案 (方案 B), 使用 FlatList + Reanimated 构建。AI 流式回复使用 WebSocket/SSE, 配合逐字动画。Typing indicator 使用 Reanimated 自定义三圆点动画。

---

### 2.8 Onboarding 引导页

- **技术方案**: `react-native-reanimated` + `react-native-gesture-handler` + `lottie-react-native` (每页 Lottie 动画) + `react-native-svg` (自定义插画)
- **最佳示例**:
  - `react-native-onboarding-swiper`: https://github.com/jairsjunior/react-native-onboarding-swiper
  - Parallax onboarding: Airbnb 风格, 背景图片视差移动
- **GitHub / npm**:
  - `react-native-onboarding-swiper`: https://github.com/jairsjunior/react-native-onboarding-swiper
  - `react-native-awesome-onboarding`: 功能丰富的引导页库
- **视觉效果描述**:
  - **Parallax 滑动**: 背景插画移动速度是前景文字的 0.6x, 创造深度层次感。文字从右侧 fade+slide 进入。
  - **进度指示器**: 底部 dots 随页面滑动, 当前 dot 放大变为主题色, 其余缩小灰色, 过渡使用 `withSpring`。
  - **Lottie 动画**: 每页播放一个 Lottie 动画 (如 "扫描你的衣橱"、"AI 为你搭配"、"一键试穿")。
  - **最后页 CTA**: 大号 "开始" 按钮, 配合 scale spring 动画和渐变背景。
- **核心 API**: `Animated.ScrollView` + `onScroll` + `interpolate` 视差, `withSpring(dotScale)` 进度 dots, `<LottieView autoPlay loop>` 页面动画

**采纳决策**: 自定义实现, 用 Reanimated 驱动视差滑动 + Lottie 页面动画 + Spring 进度 dots。3-4 页引导: 拍照上传 -> AI 分析 -> 虚拟试穿 -> 完成。

---

### 2.9 图表动画 (Radar Chart / Progress Ring)

#### 2.9.1 雷达图 (Radar Chart)

- **技术方案 A**: `react-native-gifted-charts` (内置雷达图 + 动画)
- **技术方案 B**: `react-native-svg` (Polygon) + `react-native-reanimated` (路径动画)
- **最佳示例**: https://www.reactnativepro.com/react-native-animations/animated-radar-chart-in-react-native/
- **GitHub / npm**:
  - `react-native-gifted-charts`: https://www.npmjs.com/package/react-native-gifted-charts
  - 自定义雷达图: https://github.com/kapilavaiya/react-native-radar-chart
- **视觉效果描述**: 多边形雷达图展示穿搭风格维度 (正式/休闲/运动/街头/优雅/潮流), 数据区域从中心向外"生长"动画, 各顶点数值标签淡入。背景网格线 (同心六边形) 静态渲染, 数据层有半透明填充 + 描边。
- **核心 API**: SVG `<Polygon>` + `points` 属性动画, `withTiming(progress, { duration: 800 })` 控制生长比例

#### 2.9.2 环形进度条 (Progress Ring)

- **技术方案**: `react-native-svg` (Circle + strokeDasharray) + `react-native-reanimated` (strokeDashoffset 动画)
- **最佳示例**:
  - Apple Fitness Ring 风格: https://www.notjust.dev/projects/step-counter/animated-progress-ring
  - `react-native-circular-progress-indicator`: https://www.npmjs.com/package/react-native-circular-progress-indicator
- **GitHub / npm**:
  - `react-native-circular-progress-indicator`: v4.4.2, https://www.npmjs.com/package/react-native-circular-progress-indicator
- **视觉效果描述**: 圆环从 0 度顺时针 "画" 到目标角度, strokeDashoffset 从满值过渡到目标值, 颜色随进度渐变 (红->黄->绿)。末端有圆角 (strokeLinecap="round")。中心显示百分比数字, 数字随动画同步递增。
- **核心 API**: `strokeDasharray={circumference}` + `strokeDashoffset=withTiming(targetOffset)`, Reanimated `interpolate` 颜色过渡

**采纳决策**: 雷达图用方案 B (SVG + Reanimated 自定义) 以获得最大控制力和动画表现力。环形进度条使用 `react-native-circular-progress-indicator` 快速实现, 体型匹配度等场景使用。

---

## 三、技术架构总结

### 核心依赖 (必装)

```
react-native-reanimated@4.3.0        -- 动画引擎
react-native-gesture-handler@2.31.1   -- 手势系统
react-native-svg@15.15.4              -- SVG 渲染
@shopify/react-native-skia@2.6.2      -- 高级图形/毛玻璃
```

### UI 组件 (推荐)

```
@gorhom/bottom-sheet@5.2.10           -- 底部面板
lottie-react-native@7.3.6             -- Lottie 动画
react-native-toast-message@2.3.3      -- Toast 通知
react-native-shimmer-placeholder@2.0.9 -- 骨架屏
@shopify/flash-list@2.3.1             -- 高性能列表
```

### 导航 & 转场

```
react-navigation-shared-element@3.1.3 -- 共享元素转场
@bam.tech/react-native-snap-carousel@3.2.3 -- 轮播
```

### 图表 & 可视化

```
react-native-circular-progress-indicator@4.4.2 -- 环形进度
react-native-gifted-charts@1.4.76              -- 雷达图 (备选自定义)
```

### 特殊交互

```
react-native-deck-swiper@2.0.19       -- Tinder 风格卡片滑动
expo-blur@55.0.14                     -- 模糊效果 (Expo 项目)
```

---

## 四、视觉效果参考汇总

| 组件       | 动画类型            | 帧率目标 | 动画时长       | Easing                 |
| ---------- | ------------------- | -------- | -------------- | ---------------------- |
| 毛玻璃卡片 | scale spring        | 60fps    | 300ms          | spring(damping: 15)    |
| 翻转卡片   | rotateY 3D          | 60fps    | 600ms          | spring(damping: 20)    |
| Tab 指示器 | translateX slide    | 60fps    | 350ms          | spring(damping: 18)    |
| 轮播吸附   | snap + parallax     | 60fps    | 400ms          | ease-out               |
| 骨架屏     | shimmer sweep       | 60fps    | 1500ms loop    | linear                 |
| 心形收藏   | scale + fill        | 60fps    | 400ms          | spring(overshoot: 1.2) |
| 按钮按压   | scale spring        | 60fps    | 200ms          | spring(damping: 15)    |
| Toast      | slideY + fade       | 60fps    | 300ms          | ease-in-out            |
| 共享元素   | morph + cross-fade  | 60fps    | 400ms          | ease-in-out            |
| 打字指示器 | translateY bounce   | 60fps    | 400ms loop     | sin curve              |
| 雷达图     | polygon grow        | 60fps    | 800ms          | ease-out               |
| 进度环     | strokeDashoffset    | 60fps    | 1000ms         | ease-in-out            |
| Onboarding | parallax + fade     | 60fps    | 500ms/page     | ease-in-out            |
| 穿搭滑动   | rotate + translateX | 60fps    | gesture-driven | spring                 |

---

## 五、参考资源

### 官方文档

- React Native Reanimated: https://docs.swmansion.com/react-native-reanimated/
- React Native Skia: https://shopify.github.io/react-native-skia/
- Moti: https://moti.fyi/
- @gorhom/bottom-sheet: https://gorhom.github.io/react-native-bottom-sheet/
- React Navigation Shared Element: https://reactnavigation.org/docs/shared-element-transitions/

### 教程 & 博客

- Reanimated 3 终极指南 (2025): https://dev.to/erenelagz/react-native-reanimated-3-the-ultimate-guide-to-high-performance-animations-in-2025-4ae4
- 跨平台 Reanimated 动画 (2026): https://www.sparkgoldentech.com/en/blog/2026/04/04/building-cross-platform-animations-with-reanimated-3
- Liquid Glass UI 实现 (2025): https://cygnis.co/blog/implementing-liquid-glass-ui-react-native/
- Reanimated Flip Card: https://docs.swmansion.com/react-native-reanimated/examples/flipCard/
- 动画心形按钮: https://www.reactnativepro.com/react-native-animations/animating-the-heart-button-in-react-native/
- 动画雷达图: https://www.reactnativepro.com/react-native-animations/animated-radar-chart-in-react-native/
- Apple Fitness Ring 风格进度环: https://www.notjust.dev/projects/step-counter/animated-progress-ring
- Shimmer 骨架屏 (Callstack): https://www.callstack.com/blog/performant-and-cross-platform-shimmers-in-react-native-apps

### YouTube 频道 (RN 动画专家)

- William Candillon ("Can it be done in React Native?"): https://www.youtube.com/@wcandillon
- Catalin Miron: 搜索 "Catalin Miron React Native animation"

### 社区

- r/reactnative: https://www.reddit.com/r/reactnative/
- React Native Skia Discussions: https://github.com/Shopify/react-native-skia/discussions
- Reanimated Discussions: https://github.com/software-mansion/react-native-reanimated/discussions
