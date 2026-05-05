# Requirements: 寻裳 XunO — 系统性改造

**Defined:** 2026-05-05
**Core Value:** 伊伊（AI 造型师）通过自然对话理解用户需求，精准推荐穿搭方案

## v1 Requirements

Requirements for the renovation milestone. Each maps to a roadmap phase.

### 项目治理 (GOV)

- [ ] **GOV-01**: 创建 PROJECT_SUMMARY.md — 项目名称、技术栈、目录结构、入口文件、启动/构建/测试命令、lock 文件说明、不可修改业务模块
- [ ] **GOV-02**: 创建 .agentignore — 忽略 node_modules, dist, build, .gradle, 编译产物、缓存、临时文件；保留 assets, public, res 目录可访问
- [ ] **GOV-03**: 创建 scripts/doctor.sh — 环境检查脚本（依赖管理器、lock 文件、构建命令、测试命令）
- [ ] **GOV-04**: 创建 scripts/build.sh — 构建脚本（如适用）
- [ ] **GOV-05**: 创建 scripts/test.sh — 测试脚本（如适用）
- [ ] **GOV-06**: 创建 scripts/start.sh — 启动脚本（如适用）
- [ ] **GOV-07**: 项目基线确认 — 项目类型、核心业务、技术栈、目录结构、启动/构建/测试命令、当前风险清单

### 文件清理 (CLN)

- [ ] **CLN-01**: 生成 FILE_INVENTORY.md — 项目文件分类清单、目录用途说明、可忽略目录、可疑废弃文件、高风险待确认文件
- [ ] **CLN-02**: 生成 CLEANUP_CANDIDATES.md — 建议删除/归档/忽略文件清单，每项含原因、风险等级、验证命令
- [ ] **CLN-03**: 低风险文件清理 — 日志、缓存、临时文件、编译产物（清理后构建验证）
- [ ] **CLN-04**: 中风险文件清理 — 确认无引用后清理（需回滚方式）
- [ ] **CLN-05**: 高风险文件标记 — 标记需人工确认文件，不自行删除
- [ ] **CLN-06**: 清理 stale TODO / @deprecated 标注（9 stale TODO + 68 deprecated entries）

### 依赖治理 (DEP)

- [ ] **DEP-01**: 生成 DEPENDENCY_AUDIT.md — 包管理器识别、lock 文件状态、版本风险、依赖冲突、安全风险
- [ ] **DEP-02**: 锁定依赖版本 — 确保 lock 文件完整，修复版本漂移
- [ ] **DEP-03**: pnpm 版本对齐 — 修复 package.json 声明 8.15.0 vs 实际 10.32.1 不匹配
- [ ] **DEP-04**: Python 依赖治理 — 解决 ml/requirements.txt vs pyproject.toml 冲突、xuno-ml 包名不匹配
- [ ] **DEP-05**: 依赖安全审计 — 确认 35+ pnpm overrides 覆盖已知漏洞
- [ ] **DEP-06**: 环境兼容检查 — Node 20、Python 3.11、Docker 20.10+、pnpm 版本要求

### 平台兼容 (PLT)

- [ ] **PLT-01**: 生成 ANDROID_BASELINE.md — compileSdk, targetSdk, minSdk, Gradle, AGP, Kotlin, JDK 版本盘点
- [ ] **PLT-02**: 生成 API36_RISK_ASSESSMENT.md — compileSdk 36 升级路径评估与风险
- [x] **PLT-03**: 生成 TOOLCHAIN_UPGRADE_PLAN.md — JDK/Gradle/AGP/Kotlin 分期升级方案
- [x] **PLT-04**: 生成 TARGETSDK36_BEHAVIOR_CHANGES.md — 行为变更逐项评估（不涉及项明确标注）
- [x] **PLT-05**: 生成 STABILITY_RISK_REPORT.md — 空指针、生命周期、协程泄漏、主线程阻塞、崩溃风险
- [x] **PLT-06**: 工具链升级执行 — JDK → Gradle → AGP → Kotlin/KSP → AndroidX → 三方库，逐组构建验证
- [x] **PLT-07**: compileSdk / targetSdk 升级执行
- [ ] **PLT-08**: Android 16 行为变更修复 + 稳定性加固
- [ ] **PLT-09**: 构建/lint/测试回归通过
- [ ] **PLT-10**: API 36 兼容验证报告

### UI 审计 (UIA)

- [ ] **UIA-01**: 生成 UI_AUDIT.md — 字体/字号/字重/主色/辅助色/圆角/间距/阴影/组件风格全量审计
- [ ] **UIA-02**: 生成 ASSET_AUDIT.md — App 图标、Logo、多密度资源、adaptive icon 审计
- [ ] **UIA-03**: 生成 SPLASH_AUDIT.md — 启动页/开屏品牌展示/过渡逻辑/冷启动影响审计
- [ ] **UIA-04**: 生成 MOTION_AUDIT.md — 页面转场/返回动画/交互动效（点击、聚焦、弹窗、loading、空状态）审计
- [ ] **UIA-05**: 生成 UI_GAP_PRIORITY.md — 缺口优先级排序与落地建议

### UI 落地 (UII)

- [ ] **UII-01**: UI token / theme 文件建立 — Design tokens (colors, typography, spacing, shadows)
- [ ] **UII-02**: App 图标配置补全 — 多密度资源 / adaptive icon（标注"需设计确认后替换"）
- [ ] **UII-03**: Logo 配置补全 — 启动页/登录页/首页 Logo（标注"需设计确认后替换"）
- [ ] **UII-04**: 全局 UI 规范 Skeleton — 非侵入式补齐基础组件 token 引用
- [ ] **UII-05**: 构建验证 + 原业务流程不受影响确认

### 动效落地 (MOT)

- [ ] **MOT-01**: 开屏动画实现 — 品牌开屏 + 过渡动画（1.5-2s，不阻塞初始化，失败自动降级）
- [ ] **MOT-02**: 路由转场实现 — 全局页面转场动画（不破坏返回逻辑、不卡顿）
- [ ] **MOT-03**: 基础交互动效 — 按钮反馈、输入框聚焦、弹窗出现/消失、loading、空状态、错误状态
- [ ] **MOT-04**: 生成 MOTION_IMPLEMENTATION.md — 实现说明 + 性能风险 + 回滚方式
- [ ] **MOT-05**: 构建验证 + 动画可禁用/可回滚确认

### 回归验证 (REG)

- [ ] **REG-01**: 环境检查通过 — scripts/doctor.sh
- [ ] **REG-02**: 依赖安装通过
- [ ] **REG-03**: 构建通过 — 全量 build
- [ ] **REG-04**: 测试通过 — 单元测试 + 集成测试 + lint
- [ ] **REG-05**: 启动验证 — 后端 + 移动端 Metro
- [ ] **REG-06**: 核心页面可访问 — Today/Discover/Stylist/Me
- [ ] **REG-07**: 核心业务流程回归 — 注册/登录/AI 对话/试穿/购物车/支付
- [ ] **REG-08**: UI 资源展示验证 — 图标/Logo/启动页/转场/动效
- [ ] **REG-09**: Android API 36 兼容验证（如适用）
- [ ] **REG-10**: 生成 FINAL_DELIVERY_REPORT.md — 修改清单/构建结果/测试结果/回归清单/剩余风险/回滚方式

## Out of Scope

| Feature                        | Reason                                               |
| ------------------------------ | ---------------------------------------------------- |
| 核心业务逻辑修改               | 零业务侵入原则 — 不触碰鉴权/支付/订单/AI/数据库/权限 |
| 鸿蒙版 (harmony)               | 框架仍在迭代，暂不激活                               |
| OAuth 第三方登录               | 非当前改造范围                                       |
| 实时聊天                       | 非核心路径                                           |
| 依赖大版本无脑升级             | 必须先评估兼容性                                     |
| 删除 lock 文件                 | 禁止绕过 lock 文件安装                               |
| 删除源码/资源目录              | 禁止破坏性操作                                       |
| 读取密钥/证书/签名文件         | 安全红线                                             |
| 编造不存在的 API/依赖/文件路径 | 信息无法确认时必须标注【信息待补充】                 |

## Traceability

| Requirement     | Phase                | Status   |
| --------------- | -------------------- | -------- |
| GOV-01 - GOV-07 | Phase 1 (治理底座)   | Pending  |
| CLN-01 - CLN-06 | Phase 1.5 (文件清理) | Pending  |
| DEP-01 - DEP-06 | Phase 2 (依赖治理)   | Pending  |
| PLT-01 - PLT-05 | Phase 3 (平台评估)   | Complete |
| PLT-06 - PLT-10 | Phase 4 (平台升级)   | Pending  |
| UIA-01 - UIA-05 | Phase 5 (UI 审计)    | Pending  |
| UII-01 - UII-05 | Phase 6 (UI 落地)    | Pending  |
| MOT-01 - MOT-05 | Phase 7 (动效落地)   | Pending  |
| REG-01 - REG-10 | Phase 8 (回归验证)   | Pending  |

**Coverage:**

- v1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0 ✓

---

_Requirements defined: 2026-05-05_
_Last updated: 2026-05-05 after Phase 4 Plan 01 completion (PLT-06~07 done)_
