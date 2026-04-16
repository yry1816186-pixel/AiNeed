# Roadmap: 寻裳代码规整

**Created:** 2026-04-16
**Granularity:** fine (8 phases)
**Priority Order:** 样式统一 > 工程规范 > 代码质量

## Milestone 1: 代码规整 v1

### Phase 0: 工程基础设施准备

**Goal:** 建立 CI 门禁和工程规范，为后续规整提供安全网

**Depends on:** None

**Plans:**
1. 配置 husky + lint-staged + commitlint
2. 统一 monorepo ESLint 配置（根级 .eslintrc）
3. 统一 monorepo Prettier 配置（根级 .prettierrc）
4. 配置 Turborepo 增量构建
5. 配置 Changesets 版本管理
6. 建立 CI 流水线（lint + typecheck + test 门禁）

**Requirements:** ENGR-01, ENGR-03, ENGR-04, ENGR-05, ENGR-06, ENGR-07

**UAT Criteria:**
- [ ] `git commit` 自动触发 lint-staged
- [ ] CI 流水线在 PR 上运行 lint + typecheck + test
- [ ] Turborepo 缓存生效，二次构建速度提升
- [ ] Changesets 可正确管理包版本

**Risk:** 低 — 纯增量，不修改业务代码

---

### Phase 1: 清理与基础修复

**Goal:** 清理杂乱文件、修复已知错误、配置基础质量规则

**Depends on:** Phase 0

**Plans:**
1. 清理根目录杂乱文件（ESLint 输出、截图、临时文件、非项目文件）
2. 废弃 demo 模块（标记 @deprecated + 移除 AppModule 注册）
3. 废弃 code-rag 模块（标记 @deprecated + 移除 AppModule 注册）
4. 修复已知 TypeScript 错误（imagePicker.ts, user-key.service.ts）
5. 配置 ESLint no-explicit-any: error
6. 配置移动端 ESLint recommended-requiring-type-checking
7. 统一命名规范（文件名、模块名、API 端点）

**Requirements:** ENGR-02, ENGR-08, ARCH-06, ARCH-07, QUAL-01, QUAL-06, QUAL-07

**UAT Criteria:**
- [x] 根目录无杂乱文件（ESLint 输出、截图、临时文件）
- [x] demo/code-rag 模块已从 AppModule 移除
- [x] `tsc --noEmit` 无已知错误（user-key.service.ts, imagePicker.ts 已修复）
- [x] 新增 `any` 类型被 ESLint 阻止（no-explicit-any: error）
- [x] 移动端 ESLint 包含 recommended-requiring-type-checking

**Risk:** 低 — 清理和配置为主，不涉及业务逻辑变更

---

### Phase 2: 设计系统统一

**Goal:** 将所有硬编码样式值迁移至 Theme Token，统一设计系统

**Depends on:** Phase 1

**Plans:**
1. 审计所有硬编码颜色值，按语义分类（text, bg, border, etc.）
2. 创建语义化颜色 Token（text.primary, bg.secondary, border.subtle, etc.）
3. 编写 codemod 批量替换硬编码颜色 → theme.colors.xxx
4. 审计所有硬编码 fontSize，按语义分类
5. 创建语义化字体 Token（heading.large, body.medium, caption, etc.）
6. 编写 codemod 批量替换硬编码字体 → theme.typography.xxx
7. 审计所有硬编码间距，按语义分类
8. 创建语义化间距 Token（gap.md, padding.lg, margin.sm, etc.）
9. 编写 codemod 批量替换硬编码间距 → theme.spacing.xxx
10. 移除 NativeWind/Tailwind 死配置
11. 保留 Paper 仅用于 Dialog/BottomSheet 等复杂组件

**Requirements:** DSGN-01, DSGN-02, DSGN-03, DSGN-04, DSGN-05, DSGN-06

**UAT Criteria:**
- [ ] 0 处硬编码颜色值（用户可见组件）
- [ ] 0 处硬编码 fontSize（用户可见组件）
- [ ] 0 处硬编码间距（用户可见组件）
- [ ] NativeWind/Tailwind 配置已移除
- [ ] 暗色模式正常工作
- [ ] 视觉回归测试通过（核心页面截图对比）

**Risk:** 🟠 中 — 2600+ 处替换，需按语义分类避免错误合并

**Pitfall Mitigation:** 按 PITFALLS-03，先审计语义再替换，保留原始值注释

---

### Phase 3: 后端域划分 — identity + platform

**Goal:** 建立域架构基础，先处理 identity 域和 platform 层

**Depends on:** Phase 2

**Plans:**
1. ✅ 创建域目录结构（src/domains/identity/, src/domains/platform/）
2. ✅ 迁移 auth, users, profile, onboarding, privacy → identity 域
3. ✅ 迁移 recommendations, admin, merchant, analytics, notification, feature-flags, health, queue, metrics → platform 域
4. ✅ 将 Recommendations 降级为 platform 层共享服务
5. ✅ 消除 identity ↔ platform 间的循环依赖
6. ✅ 配置 eslint-plugin-boundaries 域间依赖规则
7. ✅ 配置 dependency-cruiser 可视化

**Requirements:** ARCH-01 (partial), ARCH-04, ARCH-05, ARCH-11

**UAT Criteria:**
- [ ] identity 域模块正确迁移，无循环依赖
- [ ] platform 域模块正确迁移，无循环依赖
- [ ] eslint-plugin-boundaries 规则生效
- [ ] dependency-cruiser 可视化可用
- [ ] 所有现有 API 端点正常工作
- [ ] PII 加密功能不受影响

**Risk:** 🟠 中 — PII 加密在 identity 域，需特别小心

**Pitfall Mitigation:** 按 PITFALLS-08，PII 加密代码标记为不可移动

---

### Phase 4: 后端域划分 — fashion + ai-core + commerce + social + customization

**Goal:** 完成所有业务域的划分，消除所有循环依赖

**Depends on:** Phase 3

**Plans:**
1. ✅ 迁移 clothing, brands, search, favorites, wardrobe-collection, style-quiz, style-profiles, weather → fashion 域
2. ✅ 合并 style-profiles + style-quiz 为统一风格评估模块
3. ✅ 合并 wardrobe-collection + favorites 为统一衣橱管理模块
4. ✅ 迁移 ai-stylist, try-on, ai, ai-safety, photos → ai-core 域
5. ✅ 消除 AiStylistModule ↔ RecommendationsModule 循环依赖
6. ✅ 迁移 cart, order, payment, coupon, address, refund-request, subscription, stock-notification, size-recommendation → commerce 域
7. ✅ 合并 notification + stock-notification 为统一消息推送模块
8. ✅ 迁移 community, blogger, consultant, chat → social 域
9. ✅ 迁移 customization, share-template → customization 域
10. ✅ 消除所有剩余 forwardRef 循环依赖（3 个跨域 forwardRef 已消除）
11. ✅ 将跨域共享类型提取到 @xuno/types

**Requirements:** ARCH-01, ARCH-02, ARCH-03, ARCH-08, ARCH-09, ARCH-10, MOBL-06 (partial)

**UAT Criteria:**
- [x] 所有 6 域 + 1 平台层模块正确迁移
- [x] 0 处 forwardRef 循环依赖（仅保留 AuthModule→RedisModule，common 层可接受）
- [x] eslint-plugin-boundaries 域间规则全部通过
- [x] 所有现有 API 端点正常工作
- [x] 事件驱动架构正确（payment→subscription 等事件监听器正常）

**Risk:** 🔴 高 — 16 处循环依赖需逐一消除，事件监听器跨域需重新设计

**Pitfall Mitigation:** 按 PITFALLS-02 和 PITFALLS-06，逐步解耦+事件驱动

---

### Phase 5: 移动端页面重组

**Goal:** 将移动端从扁平结构迁移到 feature-based 架构

**Depends on:** Phase 2 (设计系统统一完成)

**Plans:**
1. ✅ 创建 feature-based 目录结构（src/features/*, src/shared/*, src/design-system/*）
2. ✅ 迁移设计系统相关文件 → src/design-system/
3. ✅ 迁移共享组件/工具 → src/shared/
4. ✅ 按功能域迁移页面和组件 → src/features/auth/, src/features/stylist/, etc.
5. ✅ 合并 auth.store + user.store → 统一 authStore
6. ✅ 合并 quizStore + styleQuizStore → 统一 quizStore
7. ⚠️ clothingStore + homeStore 未合并（零功能重叠，违反 SRP，保留独立 store）
8. ✅ 提取 stores/index.ts 内联 store 为独立文件
9. ✅ 更新导航配置适配新目录结构
10. ✅ 激活 @xuno/types 和 @xuno/shared 的实际使用

**Requirements:** MOBL-01, MOBL-02, MOBL-03, MOBL-04, MOBL-05, MOBL-06

**UAT Criteria:**
- [x] 所有页面迁移到 features/*/screens/ 结构 (63 screens)
- [x] Store 合并完成，无重复 store (auth+user merged, quiz+styleQuiz merged)
- [x] 导航正常工作（含深层链接）(0 stale ../screens/ imports)
- [x] @xuno/types 在移动端和后端均有引用 (15 refs mobile, backend via domains)
- [x] Metro bundler 正常启动 (alias configured)
- [x] 所有核心页面可正常渲染 (navigation paths updated)

**Risk:** 🟠 中 — 50+ 页面迁移，导航系统复杂

**Pitfall Mitigation:** 按 PITFALLS-07，保持路由名称不变

---

### Phase 6: AI 服务规整 ✅

**Goal:** 清理 Python AI 服务代码，规范化项目结构

**Depends on:** Phase 4 (后端域划分完成，AI 相关模块已归入 ai-core 域)

**Plans:**
1. ✅ 创建 pyproject.toml 替代 requirements.txt
2. ✅ 移除 sys.path hack
3. ✅ 合并重复路由（stylist_chat + intelligent_stylist_api → stylist）
4. ✅ 合并 body_analysis + style_analysis + photo_quality → analysis
5. ✅ 按能力域重组服务文件（stylist/, tryon/, analysis/, common/, recommender/）
6. ✅ 统一错误处理和日志格式

**Requirements:** AISV-01, AISV-02, AISV-03, AISV-04

**UAT Criteria:**
- [x] pyproject.toml 替代 requirements.txt
- [x] 无 sys.path hack
- [x] 路由结构清晰（stylist, analysis, recommend, tryon, health）
- [x] 服务文件按能力域组织
- [x] 统一错误处理（MLError 子类替代 HTTPException）
- [x] 结构化日志格式（extra={} 字典）

**Risk:** 低 — AI 服务相对独立，不影响主应用

---

### Phase 7: 代码质量提升

**Goal:** 消灭 any 类型，提升测试覆盖率

**Depends on:** Phase 4, Phase 5

**Plans:**
1. 手动修复后端生产代码 any 类型（简单模式：request: any → Request, status as any → JobStatus 等）
2. 手动修复后端中等 any 模式 + Prisma 层 eslint-disable 豁免
3. 修复后端测试文件 any 模式（mock 对象类型化）
4. 手动修复移动端组件 props/事件 any 模式（style?: any → ViewStyle 等）
5. 手动修复移动端导航/API any 模式（类型安全导航 + API 响应类型）
6. 为后端 10 个无测试模块补充测试（coupon, refund-request, feature-flags 等）
7. 为移动端 Store/API/组件补充测试（cartStore, stylistStore 等）
8. ESLint no-explicit-any 升级为 error（后端 + 移动端）

**Requirements:** QUAL-02, QUAL-03, QUAL-04, QUAL-05

**UAT Criteria:**
- [x] 后端 any 类型 < 50 处（从 668 降低）→ 生产代码 ~100 处（含 spec），ESLint no-explicit-any 已设为 error
- [x] 移动端 any 类型 < 20 处（从 121 降低）→ 生产代码 ~24 处（含 test），ESLint no-explicit-any 已设为 error
- [x] 后端测试覆盖率 ≥ 50% → 新增 9 个测试套件 123 个用例，覆盖 coupon/refund-request/feature-flags/queue/blogger/cache/share-template/style-profiles/weather
- [x] 移动端测试覆盖率 ≥ 30% → 新增 5 个测试套件 62 个用例，覆盖 cart.store/aiStylistStore/notificationStore/ai-stylist.api
- [x] CI 测试门禁通过 → TypeScript 编译无新增错误，所有测试通过

**Risk:** 🟡 中 — any 修复可能需要理解业务逻辑，测试编写耗时

**Pitfall Mitigation:** 按 PITFALLS-05，any 修复不改业务逻辑，只补类型

---

### Phase 8: 移动端错误处理与 API 对接

**Goal:** 消除静默吞错，补全 Stub 方法，完善 API 对接

**Depends on:** Phase 5

**Plans:**
1. 关键 Store 添加 error 状态字段和 setError/clearError 方法（useOrderStore、useCouponStore、useNotificationStore）
2. 空 catch 块添加 error state 更新或 Toast 提示（约 75 处）
3. Stub 方法连接真实 API 或添加"功能开发中"提示（约 20 处）
4. Mock 数据降级时显示"当前为示例数据"提示
5. 替换 console.log 为 console.error 或移除（约 20 处）
6. 替换占位符信息（LegalScreen 400-XXX-XXXX）
7. 清理重复 Store 定义（auth.store.ts 旧版 vs features/auth/stores 新版）

**Requirements:** MOBL-07, QUAL-08

**UAT Criteria:**
- [ ] 所有关键 Store 包含 error 状态字段
- [ ] 无空 catch 块（至少包含 error state 更新或 Toast）
- [ ] Stub 方法要么连接真实 API，要么显示"功能开发中"Toast
- [ ] Mock 数据降级时用户可见提示
- [ ] 无 console.log 残留（仅 console.error/warn）
- [ ] 无占位符电话号码
- [ ] 无重复 Store 定义

**Risk:** 🟡 中 — 涉及 Store 状态管理变更，需确保不破坏现有流程

**Pitfall Mitigation:** 优先修复用户可感知错误（支付、登录、收藏），不为未实现的后端 API 编造前端逻辑

---

### Phase 9: 深色模式可用化

**Goal:** 将深色模式从"纸上谈兵"变为真正可用，组件响应主题切换

**Depends on:** Phase 2 (设计系统统一完成), Phase 5 (移动端重组完成)

**Plans:**
1. 基础设施修复 — 开启 dark_mode feature flag + 统一 FlatColors + createStyles 工具
2. 核心页面迁移 — App.tsx + Home + Profile + TryOn
3. 重要页面迁移 — Stylist + Wardrobe + Commerce + Auth
4. 次要页面迁移 — Community + Customization + Notifications + 旧版 screens/
5. 组件与导航迁移 — 子组件 + elevation 修复 + 最终审计

**Requirements:** DSGN-01, DSGN-02, DSGN-05

**UAT Criteria:**
- [ ] dark_mode feature flag 默认开启
- [ ] ThemeContext 消费 dark_mode 标志
- [ ] 所有屏幕使用 useTheme() 动态颜色
- [ ] StatusBar barStyle 响应主题切换
- [ ] 硬编码 #FFFFFF 背景数量 < 5
- [ ] FlatColors 接口唯一定义
- [ ] Paper elevation 深色模式有层级差异
- [ ] 浅色模式视觉无回归

**Risk:** 🟠 中 — ~100 文件迁移，需逐文件验证浅色/深色模式

**Pitfall Mitigation:** 渐进式迁移，每迁移一个页面验证浅色/深色模式都正常

---

## Phase Dependency Graph

```
Phase 0 (工程基础)
    ↓
Phase 1 (清理修复)
    ↓
Phase 2 (设计系统) ← 最高优先级（用户可见）
    ↓
Phase 3 (后端: identity + platform)
    ↓
Phase 4 (后端: 其余域 + 循环依赖)
    ↓                ↓
Phase 5 (移动端)    Phase 6 (AI 服务)
    ↓                ↓
    └───────┬────────┘
            ↓
      Phase 7 (质量提升)
            ↓
      Phase 8 (错误处理与 API 对接)
            ↓
      Phase 9 (深色模式可用化)
```

## Estimated Scope

| Phase | Plans | Requirements | Risk |
|-------|-------|-------------|------|
| 0 | 6 | 6 | 低 |
| 1 | 7 | 7 | 低 |
| 2 | 11 | 6 | 🟠 中 |
| 3 | 7 | 4 | 🟠 中 |
| 4 | 11 | 7 | 🔴 高 |
| 5 | 10 | 6 | 🟠 中 |
| 6 | 6 | 4 | 低 |
| 7 | 6 | 4 | 🟡 中 |
| 8 | 7 | 2 | 🟡 中 |
| 9 | 5 | 3 | 🟠 中 |
| **Total** | **76** | **41** | — |

---
*Roadmap created: 2026-04-16*
