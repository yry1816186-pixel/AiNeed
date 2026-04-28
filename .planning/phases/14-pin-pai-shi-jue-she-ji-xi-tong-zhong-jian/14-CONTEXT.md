# Phase 14: 品牌视觉 + 设计系统重建 - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

建立完整的品牌视觉资产体系和三层 Design Token 系统，替换损坏的 ThemeManager，实现暗色模式独立设计。具体交付：

1. Logo 设计（字母+织物几何风格，3 变体）+ App Icon（独立但同风格）
2. Splash Lottie 动画（色彩晕染淡入，≤1.5s）
3. 品牌主色从暖驼色系切换到陶土红系，完整品牌指南文档
4. 三层 Token 体系（primitive → semantic → component）从 YAML 源生成 TS
5. 全量替换 1,980 个硬编码不一致项（364 颜色 + 354 间距 + 355 圆角 + 20 字号 + 253 动效）
6. 删除 ThemeSystem.tsx + src/theme/ 兼容层 + 重复 design-tokens.ts
7. 新建 Zustand themeStore + MMKV + Appearance API
8. 暗色模式独立设计（暖灰黑基底 + 珊瑚 accent + 静态双色板）

</domain>

<decisions>
## Implementation Decisions

### 品牌主色变更（更新决策 #35）

- **D-01:** 主色从暖驼色系（#C4956A/#C67B5C）切换到陶土红系（~#C44536/#B83B32），有力量感且辨识度高。更新 XUNO_FINAL_PLAN.md 决策 #35
- **D-02:** 旧 terracotta #C67B5C 保留用于非文字场景（大面积/图标/按钮），AA Large 3:1 通过。文字使用 terracottaDark #A86548 (4.56:1 通过 AA)
- **D-03:** 现有 semantic.error #C44536 需偏移以避免与品牌主色冲突，建议 error 改为偏冷红（如 #DC3545）

### Logo 与品牌资产

- **D-04:** Logo 方向为字母+织物几何——XUNO 字母的几何化处理融合织物曲线感。摒弃现有晾衣架形象
- **D-05:** Logo 需 3 变体：horizontal（字标+图形）、square（图形为主）、monochrome（单色）
- **D-06:** Splash 启动动画为色彩晕染淡入——品牌陶土红从中心晕染扩散，Logo 文字淡入，≤1.5s
- **D-07:** App Icon 独立设计但与 Logo 风格统一，陶土红背景 + 白色/浅色符号。iOS + Android adaptive icon
- **D-08:** 图标集、装饰图案、品牌指南文档的具体内容由 Claude's Discretion 决定，但必须遵循陶土红主色 + 暖色时尚品牌调性

### 三层 Token 架构

- **D-09:** 完全重建 Token 体系（非扩展现有），三层：primitive → semantic → component
- **D-10:** Token 源格式为 YAML/JSON，构建时生成 TS 文件。支持未来小程序 Token 复用
- **D-11:** YAML 源文件按类别分文件（colors.yaml, spacing.yaml, typography.yaml, radius.yaml, shadows.yaml, motion.yaml）
- **D-12:** semantic 层使用功能语义命名：surface/text/interactive/status
- **D-13:** Phase 14 全量替换所有硬编码值（364 颜色 + 354 间距 + 355 圆角 + 20 字号 + 253 动效），不留技术债务
- **D-14:** legacyTokenMap 桥接确保现有组件 import 路径不断裂，通过 re-export 映射

### ThemeManager 替换

- **D-15:** 全量清理重建：删除 ThemeSystem.tsx (591 行)、src/theme/index.ts (deprecated 兼容层)、重复的 src/theme/tokens/design-tokens.ts
- **D-16:** ThemeSystem.tsx 中的 UI 组件（BlurHeader、GradientButton 等）直接删除，不提取。Phase 15 原子组件库会重建这些
- **D-17:** 新建 Zustand themeStore，存储 themeMode ('light'/'dark'/'system') + 完整解析后的色表（组件直接用 store.colors.surface.primary）
- **D-18:** MMKV 持久化 theme 偏好，Appearance API 监听系统设置变化
- **D-19:** 零 Web API 调用（当前 ThemeSystem 使用了 window.matchMedia 等 Web API）

### 暗色模式独立设计

- **D-20:** 暗色基底为暖灰黑（~#1A1A18 / #161412），与现有 neutral.900/950 一致，保持品牌温暖感
- **D-21:** 暗色模式使用珊瑚色 accent（区别于亮色的陶土红），视觉层次更丰富
- **D-22:** Token 层静态定义亮色+暗色双色板，组件代码通过 store 自动获取当前模式色值，无需关心模式切换逻辑
- **D-23:** WCAG AA 4.5:1 对比度验证覆盖暗色模式所有文字+背景组合

### Claude's Discretion

- 陶土红具体色值微调（需通过 WCAG AA）
- semantic.error 的替代色值选择
- YAML→TS 生成脚本工具链选择（Style Dictionary / 自定义 / ts-json-schema-generator）
- Token 文件的具体目录结构
- MMKV key 设计与 Appearance API 监听实现细节
- legacyTokenMap 的具体映射策略
- 图标集风格（Phosphor 定制方向）
- 装饰图案/品牌图案的具体设计
- 品牌指南文档的详细内容结构

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目级规范

- `.planning/PROJECT.md` — 项目核心价值、42 项冻结决策、v2.0 里程碑定义
- `.planning/REQUIREMENTS.md` — BRAND-01~06, DSTK-01~06 需求定义
- `.planning/ROADMAP.md` §Phase 14 — Phase 14 目标、成功标准、依赖关系
- `docs/XUNO_FINAL_PLAN.md` — 42 项冻结决策源文件（决策 #35 需在本 Phase 更新）

### Phase 13 审计产出（本 Phase 的输入基线）

- `.planning/audit/COMPONENT-CONSISTENCY.md` — 1,980 个不一致项（364 颜色 + 354 间距 + 355 圆角 + 20 字号 + 253 动效 + 634 可访问性），逐项有 file:line 引用
- `.planning/audit/WCAG-AUDIT.md` — WCAG 2.1 AA 审计，#C67B5C 对比度 3.29:1 不通过，402 个缺失 accessibilityLabel
- `.planning/audit/GAP-ANALYSIS.md` — 逐页标杆差距分析（小红书/得物/NET-A-PORTER/ChatGPT/豆包）
- `.planning/audit/SCREEN-INVENTORY.md` — 56 页面清单
- `.planning/audit/PERFORMANCE-BASELINE.md` — 性能基线数据

### 现有代码（将被替换/清理）

- `apps/mobile/src/design-system/theme/tokens/design-tokens.ts` — 现有 Token 源（610 行），重建参考
- `apps/mobile/src/design-system/theme/index.ts` — 现有主题系统（677 行），含 Colors/Typography/Spacing/BorderRadius/Layout/Animation/ZIndex 导出
- `apps/mobile/src/design-system/theme/FlatColors.ts` — FlatColors 类型定义
- `apps/mobile/src/theme/index.ts` — deprecated 兼容层（31 行），待删除
- `apps/mobile/src/theme/tokens/design-tokens.ts` — 重复 Token 文件，待删除
- `apps/mobile/src/shared/components/theme/ThemeSystem.tsx` — deprecated 混合层（591 行），待删除
- `apps/mobile/src/design-system/theme/tokens/colors.ts` — 颜色子 Token
- `apps/mobile/src/design-system/theme/tokens/spacing.ts` — 间距子 Token
- `apps/mobile/src/design-system/theme/tokens/typography.ts` — 字体子 Token
- `apps/mobile/src/design-system/theme/tokens/shadows.ts` — 阴影子 Token
- `apps/mobile/src/design-system/theme/tokens/animations.ts` — 动效子 Token
- `apps/mobile/src/design-system/theme/tokens/season-colors.ts` — 季节色子 Token

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `design-tokens.ts` 610 行的 Token 结构作为重建参考——颜色分组（brand/neutral/semantic/backgrounds/text/borders/fashion/colorSeasons）、排版体系（sizes/lineHeights/fontWeights/letterSpacing）、间距 scale（0-96）、borderRadius（none-full）、shadows（4 级）、animation（duration/easing/spring）都已有合理定义
- `FlatColors.ts` 的类型定义模式（ColorShadePalette/WarmPrimaryPalette）可复用
- `design-system/theme/tokens/` 目录下 7 个子文件的分类方式可作为 YAML 分文件的参考

### Established Patterns

- Feature-based 架构：17 个 feature 目录，每个有自己的 styles 和组件——Token 替换需覆盖所有 feature
- Import 路径：大量组件通过 `@/design-system/theme` 和 `@/theme` 引入 Token——legacyTokenMap 需处理两条 import 路径
- 样式方式：大多数组件使用 StyleSheet.create + 直接引用 Token 对象（非 CSS-in-JS）

### Integration Points

- Zustand store 需要在 App.tsx 根组件包裹 Provider
- MMKV 初始化需在 app startup 阶段完成
- Appearance API onchange 监听需在 store 初始化时注册
- 所有 364 硬编码颜色分布在 ~150 个文件中（审计报告有完整 file:line 清单）
- 354 硬编码间距分布在 ~120 个文件中

</code_context>

<specifics>
## Specific Ideas

- 用户明确否决暖驼色作为主题色——"毫无辨识度的颜色"
- 用户明确否决晾衣架作为 Logo 元素——"太丑了也毫无设计感"
- 暗色模式 accent 用珊瑚色而非与亮色统一陶土红——视觉层次更丰富
- Logo 方向参考：XUNO 字母几何化 + 织物曲线，类似 FARFETCH/NET-A-PORTER 的高端字标风格

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 14-品牌视觉+设计系统重建_
_Context gathered: 2026-04-28_
