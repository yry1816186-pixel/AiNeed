# Requirements: 寻裳代码规整

**Defined:** 2026-04-16
**Core Value:** 让寻裳代码库回到健康、可维护、可扩展的状态

## v1 Requirements

### Design System (DSGN)

- [ ] **DSGN-01**: 用户可见的所有硬编码颜色（778 处）迁移至 theme.colors Token
- [ ] **DSGN-02**: 用户可见的所有硬编码 fontSize（921 处）迁移至 theme.typography Token
- [ ] **DSGN-03**: 用户可见的所有硬编码间距（971 处）迁移至 theme.spacing Token
- [ ] **DSGN-04**: 移除 NativeWind/Tailwind 死配置（tailwind.config.js, postcss.config.js, nativewind.config.js）
- [ ] **DSGN-05**: 保留 React Native Paper 仅用于 Dialog/BottomSheet 等复杂交互组件
- [ ] **DSGN-06**: 创建语义化 Token 体系（text.primary 而非 gray.900），确保替换不丢失语义

### Backend Architecture (ARCH)

- [ ] **ARCH-01**: 将 35+ 模块重组为 6 域 + 1 平台层（identity, ai-core, fashion, commerce, social, customization + platform）
- [ ] **ARCH-02**: 消除 AiStylistModule ↔ RecommendationsModule 循环依赖（forwardRef）
- [ ] **ARCH-03**: 消除所有 16 处 forwardRef 循环依赖
- [ ] **ARCH-04**: 配置 eslint-plugin-boundaries 强制域间依赖规则
- [ ] **ARCH-05**: 配置 dependency-cruiser 可视化和验证依赖关系
- [ ] **ARCH-06**: 废弃 demo 模块（无外部消费者）
- [ ] **ARCH-07**: 废弃 code-rag 模块（无外部消费者）
- [ ] **ARCH-08**: 合并 style-profiles + style-quiz 为统一风格评估模块
- [ ] **ARCH-09**: 合并 wardrobe-collection + favorites 为统一衣橱管理模块
- [ ] **ARCH-10**: 合并 notification + stock-notification 为统一消息推送模块
- [ ] **ARCH-11**: 将 Recommendations 降级为 platform 层共享服务

### Engineering Infrastructure (ENGR)

- [ ] **ENGR-01**: 配置 husky + lint-staged（pre-commit lint, commit-msg 格式）
- [ ] **ENGR-02**: 清理根目录杂乱文件（ESLint 输出、截图、临时文件、非项目文件）
- [ ] **ENGR-03**: 统一 monorepo 级别 ESLint 配置
- [ ] **ENGR-04**: 统一 monorepo 级别 Prettier 配置
- [ ] **ENGR-05**: 配置 Turborepo 增量构建
- [ ] **ENGR-06**: 配置 Changesets 版本管理
- [ ] **ENGR-07**: 建立 CI 流水线（lint + typecheck + test 门禁）
- [ ] **ENGR-08**: 统一命名规范（文件名、模块名、API 端点）

### Mobile Reorganization (MOBL)

- [ ] **MOBL-01**: 将 50+ 页面从扁平 screens/ 迁移到 features/*/screens/ 结构
- [ ] **MOBL-02**: 合并 auth.store + user.store 为统一 authStore
- [ ] **MOBL-03**: 合并 quizStore + styleQuizStore 为统一 quizStore
- [ ] **MOBL-04**: 合并 clothingStore + homeStore 为统一 clothingStore
- [ ] **MOBL-05**: 提取 stores/index.ts 中内联定义的 store 为独立文件
- [ ] **MOBL-06**: 激活 @xuno/types 和 @xuno/shared 共享包的实际使用

### Code Quality (QUAL)

- [ ] **QUAL-01**: 配置 ESLint no-explicit-any: error（阻止新增 any）
- [ ] **QUAL-02**: 修复后端 ~668 处现有 any 类型
- [ ] **QUAL-03**: 修复移动端 ~121 处现有 any 类型
- [ ] **QUAL-04**: 后端测试覆盖率从 ~15% 提升至 50%+
- [ ] **QUAL-05**: 移动端测试覆盖率从 ~5% 提升至 30%+
- [ ] **QUAL-06**: 修复已知 TypeScript 错误（imagePicker.ts, user-key.service.ts）
- [ ] **QUAL-07**: 移动端 ESLint 添加 recommended-requiring-type-checking 配置

### AI Service (AISV)

- [ ] **AISV-01**: 移除 sys.path hack，使用 pyproject.toml 替代 requirements.txt
- [ ] **AISV-02**: 合并重复路由（stylist_chat + intelligent_stylist_api → stylist）
- [ ] **AISV-03**: 按能力域重组 30+ 服务文件（stylist/, tryon/, analysis/, common/）
- [ ] **AISV-04**: 合并 body_analysis + style_analysis + photo_quality 路由为统一 analysis 路由

## v2 Requirements

### Advanced Tooling

- **TOOL-01**: Design Token codemod 自动迁移工具
- **TOOL-02**: NestJS 模块域文档自动生成
- **TOOL-03**: dependency-cruiser 依赖可视化仪表盘

### Deep Quality

- **DQAL-01**: 后端测试覆盖率 50% → 80%
- **DQAL-02**: 移动端测试覆盖率 30% → 60%
- **DQAL-03**: E2E 测试覆盖所有核心业务流程

## Out of Scope

| Feature | Reason |
|---------|--------|
| 新业务功能开发 | 本次只规整，不新增功能 |
| 数据库 Schema 重设计 | 超出规整范围，风险过高 |
| 替换核心技术栈 | 不更换 NestJS/RN/Prisma 等 |
| HarmonyOS 应用规整 | 不在本次范围 |
| 升级锁定的 RN 依赖 | 兼容性问题未解决 |
| 100% 测试覆盖率 | 不现实，优先关键路径 |
| 微服务拆分 | 过度工程 |
| 引入新 UI 框架 | 现有 Token 体系已足够 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DSGN-01 | Phase 2 | Pending |
| DSGN-02 | Phase 2 | Pending |
| DSGN-03 | Phase 2 | Pending |
| DSGN-04 | Phase 2 | Pending |
| DSGN-05 | Phase 2 | Pending |
| DSGN-06 | Phase 2 | Pending |
| ARCH-01 | Phase 4 | Pending |
| ARCH-02 | Phase 4 | Pending |
| ARCH-03 | Phase 4 | Pending |
| ARCH-04 | Phase 4 | Pending |
| ARCH-05 | Phase 4 | Pending |
| ARCH-06 | Phase 1 | Pending |
| ARCH-07 | Phase 1 | Pending |
| ARCH-08 | Phase 4 | Pending |
| ARCH-09 | Phase 4 | Pending |
| ARCH-10 | Phase 4 | Pending |
| ARCH-11 | Phase 4 | Pending |
| ENGR-01 | Phase 0 | Pending |
| ENGR-02 | Phase 1 | Pending |
| ENGR-03 | Phase 0 | Pending |
| ENGR-04 | Phase 0 | Pending |
| ENGR-05 | Phase 0 | Pending |
| ENGR-06 | Phase 0 | Pending |
| ENGR-07 | Phase 0 | Pending |
| ENGR-08 | Phase 1 | Pending |
| MOBL-01 | Phase 5 | Pending |
| MOBL-02 | Phase 5 | Pending |
| MOBL-03 | Phase 5 | Pending |
| MOBL-04 | Phase 5 | Pending |
| MOBL-05 | Phase 5 | Pending |
| MOBL-06 | Phase 5 | Pending |
| QUAL-01 | Phase 1 | Pending |
| QUAL-02 | Phase 7 | Pending |
| QUAL-03 | Phase 7 | Pending |
| QUAL-04 | Phase 7 | Pending |
| QUAL-05 | Phase 7 | Pending |
| QUAL-06 | Phase 1 | Pending |
| QUAL-07 | Phase 1 | Pending |
| AISV-01 | Phase 6 | Pending |
| AISV-02 | Phase 6 | Pending |
| AISV-03 | Phase 6 | Pending |
| AISV-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-16*
*Last updated: 2026-04-16 after initial definition*
