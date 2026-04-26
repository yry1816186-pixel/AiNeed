# Phase 11 Plan — 前端设计深化与最高水平全面提升

## 目标

将 `C:\AiNeed` 前端（移动端 + 管理后台）的设计质量提升至行业最高水平，涵盖设计体系、视觉精细度交互动画、组件架构、UX 完整性与审核修正五大方向。

## 范围

- `apps/mobile/src` — React Native 移动端（主战场）
- `apps/admin/src` — React 管理后台（次战场）
- `packages/shared/src` — 跨端共享类型与工具
- `apps/mobile/src/design-system/` — 设计系统核心

## 五大工作流

### 工作流 A：设计体系收敛（Design System Consolidation）

**目标**：消除颜色体系混乱，建立单一真实来源，修复重复导出\*\*

**现状问题：**

- `design-system/theme/tokens/design-tokens.ts` 定义了完整的 DesignTokens
- `design-system/theme/FlatColors.ts` 存在另一个颜色体系（与 DesignTokens 不一致）
- `theme/tokens/design-tokens.ts` 重新导出上述 tokens
- `theme/tokens/colors.ts` 存在第三个颜色文件
- `design-system/theme/colors.ts` 存在第四个
- `design-system/ui/` 下 primitives 与 ui 两层组件存在重叠（Button、Card、Input、EmptyState、Toast 重复）
- `shared/components/states/` 下的 EmptyState/ErrorState 与 design-system 的重复

**Plan A-01：颜色体系唯一真实来源**

- 审计所有颜色文件，建立引用关系图
- 确定 DesignTokens 为唯一真实来源
- 消除 FlatColors.ts 中的硬编码色值，改引用 DesignTokens
- 消除重复的 theme/tokens/colors.ts 或将其合并
- 确保所有组件引用 DesignTokens，不直接引用 hex 值

**Plan A-02：设计系统组件去重**

- 合并 `design-system/primitives/` 与 `design-system/ui/` 的重叠组件
- 统一 `shared/components/states/` 与 design-system 的状态组件
- 确立 primitives（基础构建块）vs ui（业务组件）的清晰分层
- 导出索引（index.ts）全部重整，消除循环依赖

**Plan A-03：Typography 与 Spacing 强制应用**

- 全局搜索非 DesignTokens 的 fontSize/he fontWeight/padding/margin 使用
- 建立 ESLint 规则（禁止硬编码 12/14/16/20/24 等字号，禁止硬编码 8/12/16/20/24 等间距）
- 建立 prettier 规则强制 token 引用

### 工作流 B：视觉精细度与交互动画

**目标**：将视觉细节和微交互提升到顶级水平

**Plan B-01：HomeScreen 视觉升级**

- WeatherGreeting 卡片：加入季节动态背景（微妙的渐变动画）、温度数字使用 Display Typography
- QuickActions：6 按钮布局优化为 3×2 网格，加入精致 icon + 阴影悬停态
- RecommendationCard：加入服饰搭配的层次感阴影、商品标签动效
- 整体：所有卡片加入 entrance stagger 动画（reducedMotion 兼容）

**Plan B-02：AiStylistUnifiedScreen 交互动画深化**

- 消息气泡：打字机效果（已）→ 加入缓冲光标闪烁
- InlineOutfitCard：加入衣品叠入动画（items 从左依次滑入，stagger 80ms）
- 方案切换 Tab：激活态加入滑动指示器动画
- 试穿 BottomSheet：加入拖拽弹性动效（overshoot spring）
- 欢迎态：装饰性 ring 持续旋转微动画（reducedMotion 关闭）
- 语音波形：实时音量可视化（已）→ 优化为品牌色波形

**Plan B-03：DiscoverScreen / ProductFeed 视觉升级**

- ProductFeed 商品卡片：hover/press 态 Scale + Shadow 联动
- ScenePills：选中态加入背景填充动画（从中心扩散）
- SearchBar：聚焦态加入底部线条颜色动画
- 空状态/错误状态：插画升级，加入微动画

**Plan B-04：全局动效一致性**

- 审计所有 useAnimatedStyle/Reanimated 用法，统一 spring 参数
- 建立 `shared/animations/springConfigs.ts` 统一出口
- 审计所有 withTiming/withDelay，统一 duration 变量
- 建立 `shared/animations/durationTokens.ts`
- ReducedMotion 全面覆盖：所有动画在无障碍偏好下可访问

### 工作流 C：组件架构与可复用性

**目标**：建立强健的组件层次，消除意大利面条式代码

**Plan C-01：Extract 高内聚业务组件**

- `WeatherGreeting` → 拆分为 WeatherIcon（根据天气代码映射）+ TemperatureDisplay + GreetingText
- `QuickActions` → 拆分为 QuickActionButton（可复用）+ QuickActionsGrid
- `RecommendationCard` → 拆分为 OutfitBadge + PriceTag + ImageWithFallback
- `InlineOutfitCard` → 已较好，保持但增强错误边界

**Plan C-02：Zustand Store 架构审核**

- 审计所有 store 的状态体积（避免整个 API 响应塞进 store）
- 确立 store 间共享状态的规范（使用 selector 而非跨 store 直接引用）
- 检查是否有不必要的 re-render（selector 粒度）
- 关键 store：`homeStore`、`aiStylistStore`、`aiStylistChatStore`、`wardrobeStore`

**Plan C-03：TanStack Query 缓存策略**

- 审核 query keys 命名规范（统一 `const QueryKeys = {}` 集中管理）
- 审核 staleTime/cacheTime 配置（避免瀑布流式请求）
- 确立 query 失效策略（mutation 后正确 invalidate）

**Plan C-04：Admin 后台组件库**

- 建立 `apps/admin/src/components/` 基础组件（AdminButton、AdminTable、AdminModal）
- 建立统一的 AdminLayout 框架
- 审核现有页面（CommunityList、MerchantList、UserList）的重复代码模式

### 工作流 D：UX 完整性与边界处理

**目标**：消灭所有 UX 漏洞，包括加载/空/错误/权限四大边界

**Plan D-01：加载状态全面审核**

- 每个 API hook 必须有对应的 loading skeleton/placeholder
- 禁止出现 spinner-only 加载态（骨架屏是最低标准）
- 跨页检查：`HomeScreen`（有）→ `DiscoverScreen`（部分）→ `ProfileScreen`（待查）→ `WardrobeScreen`（待查）

**Plan D-02：错误状态标准化**

- ErrorState 组件增强：支持 error code → 友好文案映射
- 网络错误 vs API 错误 vs 业务错误区分处理
- 关键操作（保存/删除/提交）失败后保留用户输入

**Plan D-03：空状态体系建设**

- DiscoverScreen 空状态（已有，但动画化提升）
- Wardrobe 空状态（策展型衣橱的空状态文案需要符合产品定位）
- 搜索无结果状态（加入相关推荐）
- 历史记录空状态（伊伊对话历史为空时）

**Plan D-04：权限与路由守卫**

- RouteGuards 审核（未登录/未完成 onboarding 的访问控制）
- 关键路由：`/onboarding`、`/stylist`、`/wardrobe`、`/profile`
- 演示/调试路由在生产环境正确隐藏

### 工作流 E：系统性代码质量审计与修正

**目标**：消灭技术债务，建立可持续的质量基线

**Plan E-01：TypeScript 严格模式审计**

- 移动端 `tsc --noEmit` 零错误（当前已知有部分错误）
- 审计 `any` 类型使用（分类：可接受的外部数据 vs 需要修复的业务代码）
- 审计 `eslint-disable` 注释，消除不必要的规则禁用

**Plan E-02：循环依赖审计**

- 使用 `madge --circular` 审计 import 循环
- 消除 design-system ↔ features 之间的循环引用
- 修复 `shared/components/states/` 与 `design-system/ui/` 间的潜在循环

**Plan E-03：性能审计**

- FlashList vs FlatList 使用正确性（虚拟化是否生效）
- 审计重渲染热点（useCallback/useMemo 覆盖情况）
- 大列表（商品流、衣橱）滚动性能检测
- 图片：远程 URL 图片是否有统一的大小/fallback 处理

**Plan E-04：安全与隐私**

- 敏感数据不在 store 中明文存储（检查 wardrobeStore 的商品价格/用户信息）
- API 响应脱敏检查
- Admin 后台权限粒度（目前是全公开还是有 JWT 保护？）

---

## 执行顺序（优先级）

```
Week 1（冲刺）:
  A-01 → A-02 → A-03（设计体系，基础不牢地动山摇）
  E-01（TS 错误修复同步进行）

Week 2:
  D-01 → D-02 → D-03 → D-04（UX 边界，意大利面条代码清理）
  C-01（组件提取）

Week 3:
  B-01 → B-02 → B-03 → B-04（视觉动画，全局交互动画统一）
  C-02 → C-03（C-04 Admin 后台）

Week 4:
  E-02 → E-03 → E-04（系统性审计与收尾）
  Admin 前台设计升级（如时间允许）
```

## 成功标准

1. `tsc --noEmit` 在 mobile 和 admin 均零错误
2. DesignTokens 是所有颜色的唯一来源（无硬编码 hex 在组件中）
3. 每个屏幕有空/加载/错误三种状态覆盖
4. 核心动效使用统一的 springConfigs 和 durationTokens
5. 所有动画支持 ReducedMotion
6. ESLint 无新增 `any` 类型使用
7. Admin 后台有统一的组件库基础
