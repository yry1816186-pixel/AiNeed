# Phase 15: 原子组件库 + 动效基础 - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

构建完整的原子组件库（8 个核心组件）、统一动效预设系统、SmartImage 渐进式加载组件，集成 Splash Lottie 启动动画。具体交付：

1. 8 个原子组件（Button/Input/Card/Avatar/Badge/Skeleton/BottomSheet/Toast）全量重建，亮/暗模式正确渲染
2. 所有组件使用 Design Token 引用，零硬编码颜色/字号/间距
3. Skeleton 组件 shimmer 动画使用 Reanimated
4. SmartImage 组件支持 blurhash 占位 + 渐进式加载 + 内存/磁盘缓存 + CDN URL 参数
5. animationPresets 扩展为 Preset Hooks（usePressAnimation、useFadeIn 等）
6. Splash Lottie 动画集成到 App 启动流程，亮/暗变体

</domain>

<decisions>
## Implementation Decisions

### 组件重建策略

- **D-01:** 全量重建所有 8 个原子组件——不保留现有 primitives/ 和 ui/ 中的旧代码，从零重写 JSX/样式/类型，确保 100% token 引用 + API 统一
- **D-02:** 原子组件统一放置在 `design-system/primitives/` 目录下，每个组件一个文件夹
- **D-03:** 直接更新所有 import 路径指向新 primitives/ 组件，不做 re-export 兼容层
- **D-04:** 清空 `design-system/ui/` 目录——所有组件迁出
- **D-05:** ui/ 中的业务组件（ChatBubble、OutfitCard、SimilarityHeatmap 等 ~20 个）迁移到各自 feature 目录下（如 ChatBubble → features/stylist/components/），实现 feature 自包含
- **D-06:** 全量更新代码库中所有对旧组件的 import 引用，确保零断裂

### SmartImage 实现方案

- **D-07:** 安装 expo-image 包，封装为 SmartImage 组件
- **D-08:** 占位策略为 blurhash 优先 + 缩略图 fallback：后端提供 blurhash 字段时用 blurhash，否则用 CDN 缩略图 URL（?w=20）
- **D-09:** 后端添加 blurhash 计算字段——Prisma model 新增 blurhash 字段 + 上传时自动计算存储。Phase 15 同时做前端组件和后端字段
- **D-10:** SmartImage 内置 CDN 参数化逻辑：根据容器尺寸自动附加 ?w=XXX&h=XXX&format=webp 参数
- **D-11:** Phase 15 全量替换现有 86 个裸 Image 组件为 SmartImage

### 动效预设与 Lottie 集成

- **D-12:** 在现有 animations.ts 基础上扩展为 Preset Hooks（usePressAnimation、useFadeIn、useSlideIn、useScaleIn 等），组件通过 hooks 消费动画而非直接引用裸对象
- **D-13:** Phase 15 全量替换现有 253 个硬编码动效不一致项，全部引用 animationPresets
- **D-14:** Splash Lottie 动画集成到 App.tsx 启动流程——lottie-react-native 7.3.6 已安装，Phase 14 已设计 Lottie 资产，本 Phase 做运行时集成，亮/暗双变体

### 组件 API 设计风格

- **D-15:** Variant 系统控制外观——组件通过 variant/size/tone 等 Props 控制样式，样式内部完全封装，外部不可覆盖颜色/字号等 brand 属性
- **D-16:** 每个组件文件夹下有 variants.ts 集中定义所有 variant 的样式映射，token 引用在 variants 中而非组件 JSX 内
- **D-17:** 每个原子组件 3 文件结构：index.tsx（组件）+ types.ts（Props 类型）+ variants.ts（variant 样式映射）
- **D-18:** 所有组件内置无障碍支持：accessibilityLabel、role、accessibilityState，触控目标 >= 44px，对比度由 token 保证
- **D-19:** 使用 Compound Components 模式——复杂组件（Card、BottomSheet）使用 <Card><Card.Header>...<Card.Body>... 嵌套子组件 API

### the agent's Discretion

- 具体 variant 名称和样式值（由 token 系统和 brand guidelines 约束）
- Preset Hooks 的具体 API 签名和返回值设计
- CDN 参数化的具体 URL 模板格式
- SmartImage 的 blurhash 编码参数
- Splash Lottie 的具体播放逻辑（淡出时机、加载完成触发）
- 后端 blurhash 计算的具体库选择
- 业务组件迁移到 feature 目录的具体位置

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目级规范

- `.planning/PROJECT.md` — 项目核心价值、42 项冻结决策、v2.0 里程碑定义
- `.planning/REQUIREMENTS.md` — COMP-01~08, TECH-05, ANIM-06 需求定义
- `.planning/ROADMAP.md` §Phase 15 — Phase 15 目标、成功标准、依赖关系
- `docs/XUNO_FINAL_PLAN.md` — 42 项冻结决策源文件

### Phase 13 审计产出（输入基线）

- `.planning/audit/COMPONENT-CONSISTENCY.md` — 253 个动效不一致项 + 364 颜色 + 354 间距 + 355 圆角，逐项有 file:line 引用
- `.planning/audit/WCAG-AUDIT.md` — 634 个缺失 accessibilityLabel，WCAG AA 审计报告

### Phase 14 产出（直接依赖）

- `.planning/phases/14-pin-pai-shi-jue-she-ji-xi-tong-zhong-jian/14-CONTEXT.md` — Token 架构决策、themeStore 设计、品牌色变更
- `apps/mobile/src/design-system/theme/themeStore.ts` — Zustand themeStore，组件消费此 store 获取当前主题色
- `apps/mobile/src/design-system/theme/tokens/animations.ts` — 348 行完整动画预设（Spring/Duration/Easing/Fade/Scale/Slide/Interaction/PageTransition/List/Loading）
- `apps/mobile/src/design-system/theme/tokens/generated/` — 三层 Token 生成输出（primitive/semantic/component）
- `apps/mobile/src/design-system/theme/tokens/legacy-map.ts` — legacy Token 桥接映射

### 现有组件代码（将被替换）

- `apps/mobile/src/design-system/primitives/` — 7 个现有原子组件（Button/Card/Dialog/EmptyState/Input/LoadingStates/Toast），重建参考
- `apps/mobile/src/design-system/ui/` — 32 个现有 UI 组件文件，全量迁移/清空
- `apps/mobile/src/design-system/skeleton/` — 现有 Skeleton 组件（AdvancedSkeleton.tsx + Skeleton.tsx）

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `themeStore.ts` (Phase 14): Zustand store + MMKV + Appearance API，新组件通过 `useThemeStore()` 获取当前主题色值
- `tokens/animations.ts` 348 行: 完整的 SpringConfigs（8 种语义）/ Duration（9 级）/ Easing（6 种）/ FadeAnimations / ScaleAnimations / SlideAnimations / InteractionAnimations / PageTransitions / ListAnimations / LoadingAnimations——Preset Hooks 基于此扩展
- `tokens/generated/component-tokens.ts`: 组件级 Token，variant 样式映射引用此文件
- `lottie-react-native 7.3.6`: 已安装，可直接集成 Splash 动画
- `react-native-reanimated 3.16.7`: 已安装且锁定，1945 处使用——Preset Hooks 和 Skeleton shimmer 基于此

### Established Patterns

- Feature-based 架构: 17 个 feature 目录，每个有自己的 components——业务组件需迁移到对应 feature
- Import 路径: 大量组件通过 `@/design-system/ui/` 引入——需全量更新为 `@/design-system/primitives/`
- 样式方式: StyleSheet.create + 直接引用 Token 对象（非 CSS-in-JS）——新组件延续此模式
- Compound component 现有案例: `design-system/primitives/Dialog/` 可能有参考实现

### Integration Points

- themeStore 在 App.tsx 根组件提供，所有新组件通过 hook 消费
- SmartImage 需替换 86 个裸 Image，分布在 ~40 个文件中（审计报告有 file:line 清单）
- 253 个硬编码动效分布在 ~80 个文件中，需替换为 Preset Hooks 引用
- 后端 Prisma schema 需添加 blurhash 字段 + 上传 service 添加 blurhash 计算
- Splash Lottie 需集成到 App.tsx 启动流程，在 navigation ready 之前播放

</code_context>

<specifics>
## Specific Ideas

- 用户明确选择全量重建而非增量增强——追求组件库的完全一致性
- 用户明确要清空 ui/ 目录——不留两套组件体系并存
- 用户要求 Phase 15 全量替换 86 个裸 Image + 253 个硬编码动效——不留技术债务
- Compound Components 模式用于 Card/BottomSheet 等复杂组件——参考 shadcn/ui 风格
- SmartImage 的 CDN 参数化内置到组件中，调用方无需关心 URL 拼接

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 15-原子组件库+动效基础_
_Context gathered: 2026-04-28_
