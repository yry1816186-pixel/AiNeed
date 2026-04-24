# 轨道 5: 移动端 TS 错误修复 + 导航重构

你是 XUNO 项目的高级 React Native 工程师。你的任务分两部分：(A)消灭所有 TS 错误，(B)将 5Tab 导航重构为 4Tab。

## Part A: 消灭 138 个 TS 错误

### 第一步: 排除不做的 feature（立即消除 40-50 个错误）

文件: `apps/mobile/tsconfig.json`

添加 exclude：

```json
{
  "exclude": [
    "node_modules",
    "src/features/community",
    "src/features/consultant",
    "src/features/customization",
    "src/features/home/components/heartrecommend"
  ]
}
```

### 第二步: 创建缺失的 polyfill（消除 15-20 个错误）

在 `apps/mobile/src/polyfills/` 下创建 thin wrapper：

1. `flash-list.ts`:

```typescript
export { FlashList } from "@shopify/flash-list";
```

2. `expo-vector-icons.ts`:

```typescript
export { default as Ionicons } from "react-native-vector-icons/Fonts/Ionicons.ttf";
// 或直接 re-export 你实际使用的图标库
```

3. `expo-linear-gradient.ts`:

```typescript
export { default as LinearGradient } from "react-native-linear-gradient";
```

### 第三步: 修复 design-system 路径错误

在 `apps/mobile/src/design-system/` 下：

- 确认 `theme/tokens/design-tokens.ts` 导出 `flatColors`
- 确认 `theme/index.ts` 正确 re-export 所有 token
- 修复所有 `../theme` 和 `../../../design-system/theme` 的 import 路径

### 第四步: 修复剩余的类型错误

按审计报告的错误类型批量修复：

- TS2552 (拼写错误, 9 个): `Colors` → `colors`
- TS2300 (重复标识符, 4 个): 删除重复的 import
- TS7053 (索引类型, 12 个): `colors[0]` → `colors.primary`
- TS2304 (找不到变量, 33 个): 补充缺失的变量定义
- TS2305 (导出不匹配, 8 个): 修正 import/export

### 第五步: 修复缺失组件

创建缺失的最小化组件占位：

- `design-system/ui/Skeleton.tsx`: 基础骨架屏
- `design-system/ui/Rating.tsx`: 基础评分
- `design-system/ui/AnimatedHeartButton.tsx`: 基础心形按钮
- `services/api/community.api.ts`: 基础 API 占位
- `services/api/tryon.api.ts`: 基础 API 占位
- `services/api/commerce.api.ts`: 基础 API 占位

## Part B: 5Tab → 4Tab 导航重构

### 当前导航结构

`RootNavigator.tsx` 包含 5 个 Tab: Home / Stylist / TryOn / Community / Profile

### 目标导航结构

4 个 Tab: Today / Discover / Stylist / Me

### 具体修改

#### 1. RootNavigator.tsx

文件: `apps/mobile/src/navigation/RootNavigator.tsx`

```typescript
const Tab = createBottomTabNavigator();

// Tab配置:
// Today: TodayScreen (新建) - 图标: sun
// Discover: DiscoverScreen (新建) - 图标: compass
// Stylist: AiStylistScreen (现有) - 图标: message-circle
// Me: ProfileScreen (现有) - 图标: user
```

#### 2. TodayScreen（全新）

文件: `apps/mobile/src/features/today/screens/TodayScreen.tsx`

页面结构：

```
┌─────────────────────────────┐
│  [天气/日期卡]  场景感知区域  │
│  "明天12°C，你有面试"        │
├─────────────────────────────┤
│  伊伊推荐                    │
│  ┌─────┐ ┌─────┐ ┌─────┐   │
│  │方案A │ │方案B │ │方案C │   │
│  │搭配图│ │搭配图│ │搭配图│   │
│  └─────┘ └─────┘ └─────┘   │
├─────────────────────────────┤
│  快速对话                    │
│  [文字输入框] [发送按钮]      │
│  快速回复: [换一套] [试穿]   │
└─────────────────────────────┘
```

组件拆分：

- `WeatherSceneCard.tsx` — 天气+场景感知卡片
- `RecommendationCarousel.tsx` — 3 套推荐方案轮播
- `QuickChatBar.tsx` — 底部快速对话栏+快速回复按钮

#### 3. DiscoverScreen（全新）

文件: `apps/mobile/src/features/discover/screens/DiscoverScreen.tsx`

页面结构：

```
┌─────────────────────────────┐
│  [搜索栏]                    │
├─────────────────────────────┤
│  热门场景                    │
│  [面试] [约会] [旅行] [换季] │
├─────────────────────────────┤
│  推荐商品流                  │
│  ┌─────────────────────┐    │
│  │ 商品图 + 推荐理由     │    │
│  │ "适合你的体型"        │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ ...                  │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

#### 4. 导航图标和主题

使用 design-system 中已有的颜色和图标 token。

## 接口契约

TodayScreen 需要从后端获取：

```typescript
interface TodayScreenData {
  weather: { temp: number; condition: string };
  upcomingEvent?: { type: string; name: string; date: string };
  dailyOutfits: OutfitSuggestion[]; // 3套
  greeting: string; // 伊伊的问候语
}
```

## 验收标准

1. `cd apps/mobile && npx tsc --noEmit` 返回 0 错误
2. App 启动后看到 4 个 Tab（Today/Discover/Stylist/Me）
3. TodayTab 显示推荐内容（可以先用 Mock 数据）
4. DiscoverTab 显示商品流（可以先用 Mock 数据）
5. 旧的 5Tab 中仍在使用的功能（Stylist/Profile）无缝迁移
