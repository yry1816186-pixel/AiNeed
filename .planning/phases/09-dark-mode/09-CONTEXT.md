# Phase 9: 深色模式可用化 - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Source:** User requirements + codebase research

<domain>
## Phase Boundary

将深色模式从"纸上谈兵"变为真正可用。ThemeContext 动态基础设施已就绪（darkTokens、darkFlatColors、isDark 状态），但 UI 层几乎完全未接入。本阶段核心任务是将静态 `import { theme }` 迁移为动态 `useTheme()`，修复硬编码颜色，让组件响应主题切换。

**不包含：** 新增暗色模式设计稿、新增暗色专属功能、修改后端 API。

</domain>

<decisions>
## Implementation Decisions

### D-01: 开启 dark_mode feature flag
- FeatureFlagDefaults.dark_mode 从 false 改为 true
- ThemeContext 中读取 dark_mode 标志控制暗色模式可用性
- 当 flag 关闭时，强制使用浅色模式（忽略用户设置）

### D-02: 迁移策略 — 渐进式迁移
- 将 `import { theme }` 逐步迁移为 `const { colors } = useTheme()`
- 静态 theme 导入和动态 useTheme 可以共存过渡期
- 迁移顺序：先核心页面（Home、Profile、TryOn），再次要页面
- StyleSheet.create 中的静态引用改为函数式 createStyles 模式

### D-03: StatusBar 动态化
- `barStyle` 改为 `isDark ? "light-content" : "dark-content"`
- `backgroundColor` 改为 `colors.surface`（动态值）
- 涉及 App.tsx + 3 个屏幕文件

### D-04: 消除硬编码白色背景
- `backgroundColor: "#FFFFFF"` 替换为 `colors.surface`
- 浅色变体 `#FFF5F0`、`#FFF8F5` 等替换为语义化 token
- 共 71 处需修复

### D-05: 统一 FlatColors 接口
- 合并三处 FlatColors 定义为一处（保留 design-system/theme/FlatColors.ts 作为唯一来源）
- 修复 `text` 字段类型不一致（FlatColors.ts 为 string，shared/ThemeContext.tsx 为对象）
- 两套 ThemeContext 并存问题：标记旧版 contexts/ThemeContext.tsx 为 @deprecated

### D-06: Paper elevation 层级差异
- PaperThemeProvider 已正确配置暗色 elevation
- 92 处直接使用 RN elevation 数字值的组件不经过 Paper 主题系统
- 暗色模式下阴影不可见的问题通过 shadowColor/shadowOpacity token 解决

### D-07: 不改变浅色模式视觉效果
- 所有修改在浅色模式下必须产生与当前完全一致的视觉效果
- 迁移后浅色模式的 colors 值应与静态 theme.colors 完全相同

### Claude's Discretion
- 具体迁移每个文件的实现细节
- createStyles 工具函数的具体 API
- 是否需要 codemod 脚本辅助批量迁移
- 测试策略的具体实施

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 主题系统核心
- `apps/mobile/src/shared/contexts/ThemeContext.tsx` — 动态主题 Provider，useTheme() 钩子来源
- `apps/mobile/src/design-system/theme/index.ts` — 静态 theme 对象导出（需迁移的目标）
- `apps/mobile/src/design-system/theme/FlatColors.ts` — FlatColors 接口定义（唯一来源）
- `apps/mobile/src/design-system/theme/tokens/design-tokens.ts` — DesignTokens + darkTokens 定义

### Paper 主题适配
- `apps/mobile/src/design-system/ui/PaperThemeProvider.tsx` — Paper 主题 Provider，消费 isDark

### Feature Flags
- `apps/mobile/src/constants/feature-flags.ts` — dark_mode 特性标志定义

### 入口文件
- `apps/mobile/App.tsx` — StatusBar 硬编码、静态 theme 使用

</canonical_refs>

<specifics>
## Specific Ideas

1. **createStyles 模式**: 为 StyleSheet.create 中使用静态 theme 的场景，创建工具函数：
   ```typescript
   const createStyles = (colors: FlatColors) => StyleSheet.create({
     container: { backgroundColor: colors.surface }
   });
   // 在组件中: const styles = createStyles(colors);
   ```

2. **迁移优先级分组**:
   - P0 (核心): App.tsx, HomeScreen, ProfileScreen, TryOnScreen
   - P1 (重要): AiStylistScreen, WardrobeScreen, CartScreen, LoginScreen
   - P2 (次要): 其余所有屏幕和组件

3. **验证方法**: 每迁移一个页面，在浅色/深色模式下分别截图对比

</specifics>

<deferred>
## Deferred Ideas

- 暗色模式专属设计优化（如调整暗色下的对比度、色彩饱和度）
- 自动暗色模式截图回归测试
- 暗色模式动画过渡效果
- 旧版 contexts/ThemeContext.tsx 的完全移除（仅标记 @deprecated）

</deferred>

---

*Phase: 09-dark-mode*
*Context gathered: 2026-04-17*
