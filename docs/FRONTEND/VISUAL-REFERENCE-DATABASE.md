# XUNO 前端视觉参考数据库

> 全网搜罗结果 | 2026-04 生成
> 目的：为后续 Trae 执行窗口提供唯一输入，质量决定前端天花板

---

## 一、动效库评估

| 库名                                 | 版本           | RN 0.76 兼容 | 用途                                                | 最佳示例                                                                                                                                                                                                                           | 采纳决策                        |
| ------------------------------------ | -------------- | ------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| react-native-reanimated              | 3.16.7 / 4.2.0 | ✅ 完美      | 所有动效的基础引擎，worklet 架构，UI 线程 60fps     | [官方 Examples](https://docs.swmansion.com/react-native-reanimated/examples/) / [Reanimated 3 终极指南](https://dev.to/erenelagz/react-native-reanimated-3-the-ultimate-guide-to-high-performance-animations-in-2025-4ae4)         | **必用** - 核心动效引擎         |
| react-native-gesture-handler         | 2.20.2         | ✅           | 手势处理：Pan/Tap/Pinch/Fling，配合 Reanimated      | [官方文档](https://docs.swmansion.com/react-native-gesture-handler/docs/)                                                                                                                                                          | **必用** - 手势基础             |
| @gorhom/bottom-sheet                 | 5.0.0          | ✅           | 底部弹出 Sheet，弹性拖拽+阻尼回弹                   | [gorhom/bottom-sheet](https://github.com/gorhom/bottom-sheet)                                                                                                                                                                      | **必用** - Sheet 组件           |
| react-native-svg                     | 最新           | ✅           | SVG 绘制：雷达图、图标、装饰线条                    | [react-native-svg](https://github.com/software-mansion/react-native-svg)                                                                                                                                                           | **必用** - 雷达图/装饰          |
| lottie-react-native                  | 最新           | ✅           | Lottie 动画：收藏心形粒子、loading 动画、onboarding | [LottieFiles Onboarding](https://lottiefiles.com/free-animations/onboarding)                                                                                                                                                       | **必用** - 微交互+Onboarding    |
| expo-blur / @rn-community/blur       | 最新           | ✅           | 毛玻璃/磨砂玻璃效果：GlassHeader、卡片背景          | 项目已安装 expo-blur                                                                                                                                                                                                               | **必用** - 毛玻璃效果           |
| @shopify/react-native-skia           | 最新           | ✅           | 高性能 2D 渲染：自定义绘制、发光效果、shader        | [SkiaAnimations](https://github.com/SolankiYogesh/SkiaAnimations) / [eqlion/skia-animations](https://github.com/eqlion/skia-animations) / [react-native-animated-glow](https://github.com/realimposter/react-native-animated-glow) | **推荐** - 发光边框、自定义绘制 |
| @shopify/flash-list                  | 最新           | ✅           | 高性能列表：替代 FlatList，回收机制                 | [@shopify/flash-list](https://github.com/Shopify/flash-list)                                                                                                                                                                       | **推荐** - 长列表性能           |
| react-native-reanimated-carousel     | 最新           | ✅           | 轮播组件：3D 透视旋转、Tinder 滑动、snap 效果       | [rn-carousel.dev](https://rn-carousel.dev/Examples/custom-animations/tinder)                                                                                                                                                       | **推荐** - OutfitCarousel       |
| moti                                 | 最新           | ✅           | Reanimated 上层封装，简化动画声明                   | [moti](https://github.com/nandorojo/moti)                                                                                                                                                                                          | **备选** - 简单动画可简化代码   |
| @gorhom/react-native-animated-tabbar | 最新           | ✅           | 动画 Tab 栏：多种预设动画                           | [gorhom/animated-tabbar](https://github.com/gorhom/react-native-animated-tabbar)                                                                                                                                                   | **推荐** - AnimatedTabBar       |
| react-native-fast-image              | 最新           | ✅           | 图片缓存+优先级加载                                 | [react-native-fast-image](https://github.com/DylanVann/react-native-fast-image)                                                                                                                                                    | **推荐** - 图片性能             |
| react-native-linear-gradient         | 2.8.3          | ✅ 已安装    | 渐变背景：卡片、按钮、Header                        | 项目已安装                                                                                                                                                                                                                         | **必用** - 渐变效果             |
| react-native-vector-icons            | 10.2.0         | ✅ 已安装    | 图标基础库                                          | 项目已安装                                                                                                                                                                                                                         | **已有** - 需加 Phosphor        |

---

## 二、App UI 参考

| App 名           | 风格关键词                | 核心亮点                          | 可借鉴页面                 | 截图/Demo         |
| ---------------- | ------------------------- | --------------------------------- | -------------------------- | ----------------- |
| **小红书**       | 温暖社区/瀑布流/UGC       | 双列瀑布流+沉浸式图片+温暖配色    | 发现页瀑布流、首页 feed 流 | Mobbin 有完整截图 |
| **得物(POIZON)** | 高端潮流/3D 效果/鉴定感   | 深色背景+金色点缀+3D 球体旋转     | 首页 3D Banner、商品详情页 | Mobbin            |
| **Zara**         | 极简奢华/全幅大图/杂志风  | 全屏图片+极少文字+大留白          | 商品浏览、分类页           | 系统截图          |
| **SSENSE**       | 编辑式/网格/奢华感        | 杂志式编辑排版+高级灰             | 分类浏览、Editorial 页     | Mobbin            |
| **Farfetch**     | 高端精品/视频背景/AR 试穿 | 视频背景 Hero+精品卡片+AR         | 首页 Hero、商品详情        | Mobbin            |
| **Stitch Fix**   | AI 推荐/卡片式/风格测试   | AI 推荐卡片+风格 Quiz+匹配度      | 风格测试、推荐结果页       | App Store 截图    |
| **Whering**      | 数字衣橱/极简/卡片管理    | 衣橱网格管理+穿搭日历+Outfit 组合 | 衣橱页、穿搭组合页         | App Store 截图    |
| **SHEIN**        | 快时尚/游戏化/海量推荐    | 浏览游戏化+智能筛选+社区          | 分类页、推荐流             | Mobbin            |
| **Notion**       | 极简克制/高质量动效       | 微交互+页面转场+骨架屏            | 全局微交互参考             | -                 |
| **Arc 浏览器**   | 创新动效/空间感/毛玻璃    | 侧滑面板+毛玻璃+弹性动效          | 全局动效参考               | -                 |

### 视觉风格定位

XUNO = **"活力的时尚智慧"**

- 参考：小红书温暖社区感 + Notion 极简克制 + Arc 创新动效 + 苹果设计奖 App 精致细节
- 排除：冷冰冰科技感（蓝紫渐变、霓虹灯）+ 廉价电商感（大红促销、密集商品墙）
- 融合：高端时尚杂志 + 温暖 AI 助手

---

## 三、开源项目参考

| 项目名                                   | Stars | 视觉质量(1-10) | 可复用组件              | 动效库                 | GitHub 链接                                                                                           | 采纳价值                |
| ---------------------------------------- | ----- | -------------- | ----------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------- |
| **react-native-beautiful-ui**            | 中    | 7              | Overlay 动画、Blur 效果 | Reanimated             | [GitHub](https://github.com/farfarawaylabs/react-native-beautiful-ui)                                 | 毛玻璃效果参考          |
| **SkiaAnimations**                       | 中    | 8              | 发光边框、自定义绘制    | Skia + Reanimated      | [GitHub](https://github.com/SolankiYogesh/SkiaAnimations)                                             | 雷达图发光效果          |
| **eqlion/skia-animations**               | 中    | 8              | 创意 UI 复刻、波浪效果  | Skia                   | [GitHub](https://github.com/eqlion/skia-animations)                                                   | 创意动效参考            |
| **react-native-animated-glow**           | 小    | 7              | 发光组件                | Skia + Reanimated 3    | [GitHub](https://github.com/realimposter/react-native-animated-glow)                                  | 品牌色发光效果          |
| **react-native-shop-ui**                 | 小    | 6              | 时尚购物 App UI 模板    | NativeBase             | [GitHub](https://github.com/xnathanh/react-native-shop-ui-1)                                          | 布局参考                |
| **react-native-animated-tabbar**         | 高    | 9              | 动画 Tab 栏多预设       | Reanimated             | [GitHub](https://github.com/gorhom/react-native-animated-tabbar)                                      | **高** - Tab 栏动画     |
| **react-native-reanimated-carousel**     | 高    | 9              | 3D 轮播、Tinder 滑动    | Reanimated             | [GitHub](https://github.com/dohooo/react-native-reanimated-carousel)                                  | **高** - OutfitCarousel |
| **tinder-swipe**                         | 小    | 7              | Tinder 滑动卡片         | Reanimated + GH        | [GitHub](https://github.com/pakenfit/tinder-swipe)                                                    | 搭配滑动参考            |
| **react-native-onboarding** (SW Mansion) | 中    | 8              | 精美 Onboarding 流程    | Reanimated             | [GitHub](https://github.com/software-mansion-labs/react-native-onboarding)                            | Onboarding 参考         |
| **110+ Animations (Skia/Reanimated)**    | -     | 9              | 110+动效合集免费        | Skia + Reanimated + GH | [Article](https://wojtek.im/journal/best-react-native-ui-resources)                                   | **高** - 动效合集       |
| **Expo Callie App**                      | -     | 9              | AI 人机交互动效         | Skia + Reanimated      | [Expo Blog](https://expo.dev/blog/making-ai-feel-human-in-a-mobile-app-with-expo-reanimated-and-skia) | AI 聊天动效参考         |

---

## 四、组件级最佳实现方案

### 4.1 毛玻璃卡片 (GlassCard / GlassHeader)

**最佳实现：** 项目已有 `LiquidGlassCard`（FluidAnimations.tsx），使用 expo-blur + Reanimated Pan 手势 + 3D 透视旋转 + 发光脉冲
**技术方案：**

```typescript
// 核心API
BlurView (expo-blur) → intensity={40} tint="light"
useSharedValue → glowValue 脉冲循环
interpolate → shadowOpacity/shadowRadius 随glow变化
Gesture.Pan → rotateX/rotateY 3D倾斜
withSpring → 弹性回弹 damping:20 stiffness:200
```

**视觉效果：** 毛玻璃半透明背景 + 边框光泽 + 按压弹性缩放 + 呼吸发光 + 3D 透视倾斜
**改进方向：** 需要在所有页面 Header 和关键卡片中实际使用

### 4.2 推荐卡片轮播 (OutfitCarousel)

**最佳实现：** [react-native-reanimated-carousel](https://rn-carousel.dev/Examples/custom-animations/tinder) 的 CustomAnimation 模式
**技术方案：**

```typescript
import { Carousel } from "react-native-reanimated-carousel";
// 3D透视旋转 + Snap效果
customAnimation: (value) => {
  "worklet";
  const rotateY = interpolate(value, [-1, 0, 1], [-30, 0, 30]);
  const translateX = interpolate(value, [-1, 0, 1], [-width * 0.8, 0, width * 0.8]);
  const scale = interpolate(value, [-1, 0, 1], [0.8, 1, 0.8]);
  return { transform: [{ perspective: 400 }, { rotateY }, { translateX }, { scale }] };
};
```

**视觉效果：** 3D 透视旋转 + 远近缩放 + 弹性 Snap + 匹配度 badge 数字动画

### 4.3 底部导航栏 (AnimatedTabBar)

**最佳实现：** [@gorhom/react-native-animated-tabbar](https://github.com/gorhom/react-native-animated-tabbar) — 60fps 动画 + 多种预设
**技术方案：**

```typescript
import animatedTabbar from '@gorhom/react-native-animated-tabbar';
// 预设：bubble / flash / material
// 自定义：indicator跟随滑动 + 图标morphing
<Tab.Navigator tabBar={(props) => <animatedTabbar.TabBar {...props} />}>
```

**视觉效果：** 指示器跟随滑动 + 图标选中时 morphing/填充动画 + 弹性过渡

### 4.4 聊天气泡 (ChatBubble)

**最佳实现：** 项目已有基础（FadeInUp），需升级为弹性出现+打字机效果
**技术方案：**

```typescript
// 消息出现动画
entering={FadeInRight.springify().damping(12).stiffness(180)}  // 用户消息从右
entering={FadeInLeft.springify().damping(12).stiffness(180)}   // AI消息从左
// 打字指示器 - 三点依次跳动
withDelay(index * 200, withRepeat(withSequence(withTiming(-8, {duration:300}), withTiming(0)), -1))
// 打字机效果 - 文字逐字显示
opacity: withTiming(1, {duration: text.length * 30 })
```

**视觉效果：** 消息弹性滑入 + 打字指示器三点跳动 + 文字逐字出现

### 4.5 匹配度雷达图 (MatchRadarChart)

**最佳实现：** 项目已有基础（react-native-svg 静态图），需加动画
**技术方案：**

```typescript
// 从0到目标值的动画填充
const animProgress = useSharedValue(0);
useEffect(() => {
  animProgress.value = withSpring(1, SpringConfigs.gentle);
}, []);
// worklet中插值
const animatedValue = interpolate(animProgress.value, [0, 1], [0, targetScore]);
```

**视觉效果：** 雷达图从 0 到目标值弹性展开 + 分数数字滚动 + 填充区域渐变

### 4.6 骨架屏 (LoadingSkeleton)

**最佳实现：** 项目已有 `SkeletonLoader`（FluidAnimations.tsx），shimmer 效果
**技术方案：**

```typescript
// 已有实现 - shimmer从左到右光泽流动
shimmerPosition.value = withRepeat(withTiming(2, { duration: 1500 }), -1, false);
// 需增加：多种骨架模板（卡片、列表、聊天消息）
```

**视觉效果：** 光泽流动 + 匹配真实内容布局

### 4.7 收藏心形按钮 (AnimatedHeartButton)

**最佳实现：** Lottie 粒子爆炸 + Reanimated 缩放
**技术方案：**

```typescript
// 点击时：scale 1→1.3→1 + Lottie播放
const scale = useSharedValue(1);
onPress: () => {
  scale.value = withSequence(withSpring(1.3, SpringConfigs.bouncy), withSpring(1));
  lottieRef.current?.play();
};
// Lottie动画选择：LottieFiles搜索 "heart explosion" / "heart burst"
```

**视觉效果：** 心形弹性放大 + 粒子爆炸 + 颜色从灰到品牌色

### 4.8 Onboarding (ParallaxOnboarding)

**最佳实现：** 视差滚动 + 渐变切换 + Lottie 动画
**技术方案：**

```typescript
// 视差：背景图移动速度 = 内容 * 0.5
// 页面指示器：Reanimated interpolate控制当前页高亮
// 渐变切换：opacity + translateX同时变化
import LottieView from "lottie-react-native";
// 每个步骤使用一个Lottie动画
```

**视觉效果：** 视差背景 + Lottie 主题动画 + 弹性页面切换 + 进度指示器

### 4.9 页面转场 (PageTransition)

**最佳实现：** 项目已有 `PageTransitions` 配置（push/modal/fade/flip）
**技术方案：**

```typescript
// 使用已有的 PageTransitions 配置
// Reanimated 4.2.0 支持 SharedElementTransition（实验性）
// 当前推荐：自定义screenOptions
screenOptions: {
  cardStyleInterpolator: ({ current, layouts }) => ({
    cardStyle: {
      opacity: current.progress,
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        },
      ],
    },
  });
}
```

**视觉效果：** 柔和的推入/淡入/弹性过渡 + 共享元素（未来升级）

### 4.10 天气场景卡片 (WeatherSceneCard)

**最佳实现：** 自定义组件 + Skia 天气图标 + Reanimated 呼吸动画
**技术方案：**

```typescript
// 呼吸动画
const breathScale = useSharedValue(1);
breathScale.value = withRepeat(
  withSequence(withTiming(1.03, { duration: 2000 }), withTiming(1, { duration: 2000 })),
  -1,
  true
);
// 天气图标用Lottie或Skia自定义绘制
```

**视觉效果：** 呼吸脉动 + 渐变背景 + 天气动画 + 场景感知文案

---

## 五、图标系统

| 图标库             | 风格                         | 图标数量 | RN 支持                    | 适合时尚 App                      | 推荐度       |
| ------------------ | ---------------------------- | -------- | -------------------------- | --------------------------------- | ------------ |
| **Phosphor Icons** | 线性/填充/细线/粗体 6 种粗细 | 9000+    | ✅ `phosphor-react-native` | **最佳** - 比 Ionicons 更现代时尚 | **强烈推荐** |
| **Lucide**         | 线性极简                     | 1500+    | ✅ `lucide-react-native`   | 好 - 干净现代                     | 推荐         |
| Ionicons (已安装)  | iOS 风格                     | 1300+    | ✅ 已安装                  | 一般 - 偏 iOS 原生感              | 维持现状     |
| Feather            | 超细线                       | 280+     | ✅                         | 补充                              | 备选         |

**采纳方案：** 新增 `phosphor-react-native`，Regular(线性)为主、Bold(填充)为选中态，24px 标准尺寸

---

## 六、字体方案

| 字体                                     | 类型       | 适用场景            | 加载方式                           | 推荐度                          |
| ---------------------------------------- | ---------- | ------------------- | ---------------------------------- | ------------------------------- |
| **Inter** (英文/数字)                    | Sans-serif | 英文、数字、UI 元素 | `@font-face` 或 RN 内嵌            | **强烈推荐** - 比 Roboto 更时尚 |
| **PingFang SC** (iOS 中文)               | Sans-serif | iOS 中文正文        | 系统字体无需加载                   | **推荐** - iOS 系统自带         |
| **思源黑体/Noto Sans SC** (Android 中文) | Sans-serif | Android 中文正文    | `react-native-vector-icons` bundle | **推荐** - Android 标准         |
| **Georgia** (标题衬线)                   | Serif      | 大标题/品牌标题     | 系统字体                           | 项目已用                        |
| **Plus Jakarta Sans** (Web)              | Sans-serif | Web 端英文          | CSS import                         | 项目已配                        |

**采纳方案：** 保持现有字体配置（已在 design-tokens.ts 中定义），确保实际使用时字重/间距正确

---

## 七、新增依赖清单

```json
{
  "必装": {
    "phosphor-react-native": "latest", // 图标系统
    "lottie-react-native": "latest", // Lottie动画
    "@shopify/react-native-skia": "latest", // 自定义绘制+发光
    "react-native-svg": "latest", // SVG雷达图
    "@shopify/flash-list": "latest" // 高性能列表
  },
  "推荐": {
    "@gorhom/react-native-animated-tabbar": "latest", // 动画Tab栏
    "react-native-reanimated-carousel": "latest", // 3D轮播
    "react-native-fast-image": "latest" // 图片缓存
  }
}
```

---

## 八、现有项目代码质量评估

### 已有的好组件（保留+增强）

| 组件               | 文件                | 质量     | 动效程度          | 改进方向              |
| ------------------ | ------------------- | -------- | ----------------- | --------------------- |
| LiquidGlassCard    | FluidAnimations.tsx | **9/10** | 3D 倾斜+发光+弹性 | 直接使用              |
| MagneticButton     | FluidAnimations.tsx | **9/10** | 磁性跟随+弹性     | 直接使用              |
| ParallaxScrollView | FluidAnimations.tsx | **8/10** | 视差滚动          | 用于 TodayScreen      |
| ParticleEffect     | FluidAnimations.tsx | **7/10** | 粒子效果          | 用于收藏成功          |
| RippleEffect       | FluidAnimations.tsx | **7/10** | 波纹扩散          | 替代 TouchableOpacity |
| StaggeredList      | FluidAnimations.tsx | **8/10** | 交错出现          | 用于推荐列表          |
| GlowText           | FluidAnimations.tsx | **7/10** | 发光文字          | 用于品牌标题          |

### 需要重写的组件

| 组件            | 文件                   | 当前质量 | 问题                                | 目标质量 |
| --------------- | ---------------------- | -------- | ----------------------------------- | -------- |
| OutfitCard      | ui/OutfitCard.tsx      | **3/10** | 仅 FadeInUp，无按压弹性、无 3D 效果 | **9/10** |
| ChatBubble      | ui/ChatBubble.tsx      | **4/10** | 仅 FadeInUp，无弹性出现、无打字动画 | **9/10** |
| MatchRadarChart | ui/MatchRadarChart.tsx | **5/10** | 静态 SVG，无动画填充、无数字滚动    | **9/10** |
| Skeleton        | skeleton/Skeleton.tsx  | **6/10** | 基础 shimmer，无多模板              | **8/10** |

### 关键发现

1. **Design Tokens 完美** — 色彩、阴影、间距、字体、Spring 配置全部到位
2. **Animation Configs 完美** — 7 种 Spring 预设 + Fade/Scale/Slide/Interaction/Page/List/Loading 全套
3. **FluidAnimations 质量高** — LiquidGlassCard/MagneticButton 已是生产级
4. **问题在集成层** — 高级组件存在但页面没有使用；OutfitCard/ChatBubble 质量远低于 FluidAnimations

### 核心结论

> **不需要发明新设计系统，不需要写新动效引擎。需要的是：(1) 将 FluidAnimations 的高质量组件集成到所有页面；(2) 重写 OutfitCard/ChatBubble/MatchRadarChart 到同等水准；(3) 新增 25 个页级组件覆盖全 App。**

---

_此文件为后续 Trae 执行窗口的核心输入。所有组件实现必须基于此数据库中的方案。_
