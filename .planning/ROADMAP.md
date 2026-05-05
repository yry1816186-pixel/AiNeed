# Roadmap: 寻裳 XunO — 系统性改造

**Created:** 2026-05-05
**Milestone:** Renovation v1
**Phases:** 9 (Phase 0 → Phase 8)
**Requirements mapped:** 49/49 ✓

---

**Phase 0: 代码库映射与基线确认** ✓ Complete
**Phase 1-6 (原):** 核心业务功能 ✓ Complete

---

## Phase Structure

| #   | Phase      | Goal               | Requirements | Type    |
| --- | ---------- | ------------------ | ------------ | ------- |
| 0   | 基线确认 ✓ | 建立项目真实认知   | —            | Audit   |
| 1   | 治理底座   | Agent 可控执行环境 | GOV-01~07    | Infra   |
| 1.5 | 文件清理   | 减少噪音与误读     | CLN-01~06    | Cleanup |
| 2   | 依赖治理   | 稳定性与构建修复   | DEP-01~06    | Infra   |
| 3   | 平台评估   | API 36 兼容评估    | PLT-01~05    | Audit   |
| 4   | 平台升级   | 执行平台升级       | PLT-06~10    | Infra   |
| 5   | UI 审计    | 体验缺口全量审计   | UIA-01~05    | Audit   |
| 6   | UI 落地    | 品牌资源与 token   | UII-01~05    | UI      |
| 7   | 动效落地   | 商用级交互体验     | MOT-01~05    | UI      |
| 8   | 回归验证   | 全量交付验证       | REG-01~10    | QA      |

---

## Phase 0: 代码库映射与基线确认 ✓

**Status:** Complete
**Goal:** 基于 /gsd-map-codebase 建立项目真实现状认知。只审计，不修改代码。

**Deliverables:**

- `.planning/codebase/STACK.md` (120 lines)
- `.planning/codebase/ARCHITECTURE.md` (253 lines)
- `.planning/codebase/STRUCTURE.md` (557 lines)
- `.planning/codebase/CONVENTIONS.md` (150 lines)
- `.planning/codebase/TESTING.md` (170 lines)
- `.planning/codebase/INTEGRATIONS.md` (212 lines)
- `.planning/codebase/CONCERNS.md` (105 lines)

**Key findings:**

- 4 Critical, 9 High, 18 Medium, 7 Low concerns identified
- Clean DAG architecture (types → shared → backend/mobile)
- Test coverage: backend 20%, mobile 60%, admin none
- Governance score: 90/100, Security score: 40/100 FAIL

---

## Phase 1: 项目治理底座

**Goal:** 建立 Agent 可控执行环境，减少上下文浪费、依赖漂移、启动失败和误读文件。

**Canonical refs:** `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONVENTIONS.md`

**Requirements:** GOV-01, GOV-02, GOV-03, GOV-04, GOV-05, GOV-06, GOV-07

**Success criteria:**

1. `PROJECT_SUMMARY.md` 存在且包含项目名称/技术栈/目录/入口/启动/构建/测试/不可改模块
2. `.agentignore` 存在且正确忽略 node_modules/dist/build/.gradle/编译产物/临时文件
3. `scripts/doctor.sh` 可执行，失败返回非 0
4. `scripts/build.sh` 构建通过（或标注缺失原因）
5. `scripts/test.sh` 测试通过（或标注缺失原因）
6. Agent 启动文件从 PROJECT_SUMMARY.md 读取而非全量扫描

**Execution constraints:**

- 不修改核心业务代码
- 不删除任何文件
- 不升级依赖
- 脚本必须可执行且有清晰日志

**Verification:**

```bash
git status
bash scripts/doctor.sh
bash scripts/build.sh      # if applicable
bash scripts/test.sh        # if applicable
bash scripts/start.sh       # if applicable
```

**Rollback:** `rm PROJECT_SUMMARY.md .agentignore scripts/*.sh` 恢复原始状态

---

## Phase 1.5: 过期文件、中间文件、无用文件审计与清理

**Goal:** 清理项目中大量过期、中间、废弃、无用文件，减少 Agent 误读、上下文浪费、构建污染和维护成本。

**Canonical refs:** `.planning/codebase/STRUCTURE.md`, `.planning/codebase/CONCERNS.md` (P2-1 stale TODOs, P2-2 deprecated entries)

**Requirements:** CLN-01, CLN-02, CLN-03, CLN-04, CLN-05, CLN-06

**Success criteria:**

1. `FILE_INVENTORY.md` 生成 — 完整文件分类清单
2. `CLEANUP_CANDIDATES.md` 生成 — 建议删除/归档/忽略清单
3. 低风险文件（日志/缓存/编译产物）已清理 + 构建验证通过
4. 中风险文件（确认无引用）已清理或标记待确认
5. 高风险文件标记需人工确认，不自行删除
6. 9 stale TODO + 68 @deprecated entries 已清理或归档

**Execution constraints:**

- **第一轮**: 只审计，不删除 — 生成 FILE_INVENTORY.md 和 CLEANUP_CANDIDATES.md
- **第二轮**: 只处理低风险（日志/缓存/临时/编译产物），每批构建验证
- **第三轮**: 处理中风险（确认无引用后有回滚方式）
- **第四轮**: 高风险必须用户确认
- 禁止直接 rm -rf、禁止删除源码/资源目录/配置模板/lock 文件
- 禁止把 assets/public/res 整体忽略

**Verification:**

```bash
git status
bash scripts/doctor.sh
bash scripts/build.sh
bash scripts/test.sh
```

**Rollback:** 低/中风险文件通过 git checkout 恢复原始状态

---

## Phase 2: 依赖与环境稳定性治理

**Goal:** 明确依赖锁定方式，修复基础安装、构建、启动问题。禁止无脑大版本升级。

**Canonical refs:** `.planning/codebase/STACK.md`, `.planning/codebase/CONCERNS.md` (P2-15 pnpm mismatch, P2-16 ML conflict, P2-17 ml/requirements.txt)

**Requirements:** DEP-01, DEP-02, DEP-03, DEP-04, DEP-05, DEP-06

**Success criteria:**

1. `DEPENDENCY_AUDIT.md` 生成 — 包管理器/lock 文件/版本风险/依赖冲突/安全风险清单
2. lock 文件完整无漂移
3. pnpm 版本对齐修复 — `package.json:packageManager` vs 实际版本
4. Python 依赖冲突解决 — pyproject.toml 为主，ml/requirements.txt deprecated
5. 35+ pnpm overrides 覆盖确认
6. 环境兼容检查通过 — Node 20 / Python 3.11 / Docker 20.10+

**Execution constraints:**

- 不删除 lock 文件
- 不重写依赖结构
- 不一次性升级所有依赖
- 每次依赖变更后必须构建验证
- 依赖分组升级（如需要）

**Verification:**

```bash
pnpm install
bash scripts/build.sh
bash scripts/test.sh
python -c "import ml" 2>/dev/null  # ML package import check
```

**Rollback:** 通过 git checkout 恢复 lock 文件和依赖声明

---

## Phase 3: Android/API 36 平台兼容升级评估 ✓

**Status:** Complete
**Goal:** 评估 Android 16 / API 36 兼容性。只评估，不直接做高风险修改。

**Canonical refs:** `.planning/codebase/STACK.md` (§Frameworks, §Key Dependencies), `apps/mobile/android/`

**Requirements:** PLT-01, PLT-02, PLT-03, PLT-04, PLT-05

**Success criteria:**

1. `ANDROID_BASELINE.md` — compileSdk/targetSdk/minSdk/Gradle/AGP/Kotlin/JDK 版本
2. `API36_RISK_ASSESSMENT.md` — compileSdk 36 升级路径评估与工具链要求
3. `TOOLCHAIN_UPGRADE_PLAN.md` — 分组升级方案（JDK→Gradle→AGP→Kotlin→AndroidX→ 三方库）
4. `TARGETSDK36_BEHAVIOR_CHANGES.md` — 10 项行为变更逐项评估（含"不涉及"项标注）
5. `STABILITY_RISK_REPORT.md` — 崩溃风险、生命周期、协程、主线程、网络/IO 异常兜底

**10 behavior changes to assess:**

1. 预测性返回
2. 边到边布局
3. 权限行为变化
4. 后台任务限制
5. 通知权限与通知渠道
6. Scoped Storage / Media 权限
7. 大屏/折叠屏/横竖屏限制
8. 生命周期与前台服务限制
9. 非 SDK 接口限制
10. 废弃 API 替换

**Execution constraints:**

- 只评估，不修改
- 无法确认处标注【信息待补充】
- 不涉及项也要明确标注

**Verification:**

- 无代码修改，审计文档完整性即可

---

## Phase 4: 平台升级与兼容修复 ✓

**Status:** Complete
**Goal:** 按 Phase 3 计划分批执行平台升级和兼容修复。

**Canonical refs:** `TOOLCHAIN_UPGRADE_PLAN.md`, `TARGETSDK36_BEHAVIOR_CHANGES.md`

**Requirements:** PLT-06, PLT-07, PLT-08, PLT-09, PLT-10

**Plans:**
| Plan | Name | Status | Summary |
|------|------|--------|---------|
| 04-01 | 工具链升级与 SDK 版本升级 | Complete | buildToolsVersion 36.0.0 + targetSdk 36 |
| 04-02 | 行为变更修复与稳定性加固 | Complete | requestLegacyExternalStorage 移除 + API36 兼容报告 |

**Success criteria:**

1. ~~JDK/Gradle/AGP 兼容处理完成~~ (04-01: 保持不变，构建验证通过)
2. ~~compileSdkVersion 升级 + 构建通过~~ (04-01: 已是 36，无需变更)
3. ~~Kotlin/KSP/Compose 兼容处理~~ (04-01: 不涉及，保持现状)
4. ~~AndroidX/Jetpack 兼容处理~~ (04-01: core-splashscreen 1.0.1 保持，兼容 API 36)
5. ~~三方依赖分组处理~~ (04-01: 锁定模块不变，其他库保持)
6. ~~targetSdkVersion 升级~~ (04-01: 35 -> 36)
7. ~~Android 16 行为变更修复~~ (04-02: 1 fixed, 9 not-affected)
8. ~~稳定性加固完成~~ (04-02: 4/4 audited, 1 fix, 3 documented)
9. ~~构建/lint/测试全量回归通过~~ (04-02: assembleDebug SUCCESS, lint PASS)
10. ~~API 36 兼容验证报告~~ (04-02: API36_COMPAT_REPORT.md generated)

**Execution constraints:**

- 按 Phase 3 TOOLCHAIN_UPGRADE_PLAN.md 顺序执行
- 每组改动后必须构建验证
- 构建失败必须暂停
- 不得跳过错误，不得隐藏失败日志
- 不得为编译通过删除核心业务代码

**Verification:**

```bash
cd apps/mobile/android && ./gradlew assembleDebug
./gradlew test  # if exists
./gradlew lint  # if exists
```

**Rollback:** 通过 git checkout 恢复所有构建文件

---

## Phase 5: UI、Logo、图标、启动页、动效审计

**Goal:** 审计项目商用化体验缺口。只审计，不直接修改。

**Canonical refs:** `apps/mobile/src/design-system/`, `apps/mobile/src/features/`

**Requirements:** UIA-01, UIA-02, UIA-03, UIA-04, UIA-05

**Success criteria:**

1. `UI_AUDIT.md` — 字体/字号/字重/颜色/圆角/间距/阴影/组件风格
2. `ASSET_AUDIT.md` — App 图标存在性/占位性/多密度/adaptive icon/Logo 位置
3. `SPLASH_AUDIT.md` — 启动页流程/品牌开屏/动画/过渡/冷启动影响
4. `MOTION_AUDIT.md` — 页面转场/返回动画/按钮/输入框/弹窗/loading/空状态/错误状态
5. `UI_GAP_PRIORITY.md` — 缺口优先级排序与落地路线图

**Audit checklist (6 dimensions):**

1. App 图标 — 是否存在/占位/多密度/adaptive icon
2. Logo — 是否存在/可用于启动页/登录页/首页/深浅色
3. 启动页/Splash — 直接登录页 vs 品牌开屏/动画/过渡/冷启动
4. 页面转场 — 全局转场/跳变/返回动画/平台冲突/性能
5. 基础交互动效 — 按钮/输入框/弹窗/列表/空状态/错误/loading
6. 全局 UI 规范 — 字体/字号/字重/颜色/圆角/间距/阴影/组件

**Execution constraints:**

- 不修改代码
- 只输出问题清单和落地建议

**Verification:**

- 审计文档完整性（不涉及代码构建）

---

## Phase 6: UI 规范与品牌资源落地

**Goal:** 建立统一 UI token/theme/resource 体系，补全图标、Logo、基础视觉规范。

**Canonical refs:** `UI_AUDIT.md`, `ASSET_AUDIT.md`, `UI_GAP_PRIORITY.md`, `apps/mobile/src/design-system/`

**Requirements:** UII-01, UII-02, UII-03, UII-04, UII-05

**Success criteria:**

1. UI token 文件建立 — colors, typography, spacing, shadows（`design-system/theme/tokens/`）
2. App 图标多密度资源配置 + adaptive icon（标注"需设计确认后替换"）
3. Logo 配置 — 启动页/登录页/首页（标注"需设计确认后替换"）
4. 全局 UI 规范 Skeleton 就绪 — 非侵入式补齐基础组件 token 引用
5. 构建通过 + 原业务流程不受影响

**Execution constraints:**

- 优先新增 token/theme/variables 文件
- 不覆盖原有业务样式
- 不伪造"最终商用资产"，标注"需设计确认后替换"
- 不修改核心业务逻辑

**Verification:**

```bash
bash scripts/build.sh
# 页面可正常打开
# 原有业务流程不受影响
```

**Rollback:** git checkout 恢复设计系统文件

---

## Phase 7: 开屏动画、路由转场与基础交互动效落地

**Goal:** 补全商用级基础动效体验。

**Canonical refs:** `MOTION_AUDIT.md`, `SPLASH_AUDIT.md`, `UI_GAP_PRIORITY.md`

**Requirements:** MOT-01, MOT-02, MOT-03, MOT-04, MOT-05

**Success criteria:**

1. 开屏动画实现 — 品牌开屏 + 过渡动画（1.5-2s，不阻塞初始化，失败自动降级）
2. 路由转场实现 — 全局页面转场动画（不破坏返回逻辑，不卡顿、不重复渲染、不内存泄漏）
3. 基础交互动效补全 — 按钮反馈/输入框聚焦/弹窗出现消失/loading/空状态/错误状态/列表加载
4. `MOTION_IMPLEMENTATION.md` 生成 — 实现说明 + 性能风险 + 回滚方式
5. 构建通过 + 动画可禁用/可回滚

**Execution constraints:**

- 优先使用项目原有技术栈（React Native Animated / Reanimated）
- 不得引入重型动画库，除非确有必要
- 不得破坏返回逻辑、登录逻辑
- 不得造成页面卡顿、重复渲染、内存泄漏
- 不得影响冷启动稳定性

**Verification:**

```bash
bash scripts/build.sh
# 启动流程正常
# 登录/首页/核心页面正常
# 动画可禁用或可回滚
```

**Rollback:** 移除动效实现文件或通过配置开关禁用

---

## Phase 8: 全量回归测试与最终交付

**Goal:** 确认项目可运行、可构建、核心业务未被破坏。

**Canonical refs:** All previous phase deliverables, `.planning/codebase/TESTING.md`

**Requirements:** REG-01, REG-02, REG-03, REG-04, REG-05, REG-06, REG-07, REG-08, REG-09, REG-10

**Success criteria:**

1. `scripts/doctor.sh` 通过
2. 依赖安装通过
3. 全量构建通过
4. 测试通过 — 单元 + 集成 + lint
5. 后端 + Metro 启动正常
6. 核心页面可访问 — Today/Discover/Stylist/Me
7. 核心业务流程回归 — 注册/登录/AI 对话/试穿/购物车/支付
8. UI 资源展示验证 — 图标/Logo/启动页/转场/动效
9. Android API 36 兼容验证（如适用）
10. `FINAL_DELIVERY_REPORT.md` 生成 — 修改清单/构建结果/测试结果/回归清单/剩余风险/回滚方式

**Verification checklist:**

- [ ] 环境检查
- [ ] 依赖安装
- [ ] 构建
- [ ] 测试
- [ ] lint
- [ ] 启动
- [ ] 核心页面访问
- [ ] 核心业务流程
- [ ] UI 资源展示
- [ ] 开屏动画
- [ ] 页面转场
- [ ] 原有功能回归
- [ ] API 36 兼容（如适用）
- [ ] 低版本兼容说明

---

## Execution Order

```
Phase 0 (基线确认) ✓
    ↓
Phase 1 (治理底座)  ──→  1.5 (文件清理)  ──→  2 (依赖治理)
                                                      ↓
                                              3 (平台评估) ──→  4 (平台升级)
                                                      ↓
                                              5 (UI 审计) ──→  6 (UI 落地) ──→  7 (动效落地)
                                                                                       ↓
                                                                                8 (回归验证)
```

- Phase 1/1.5/2 are sequential (builds infrastructure)
- Phase 3→4 are sequential (assess then execute)
- Phase 5→6→7 are sequential (audit then UI then motion)
- Phase 5 and Phase 3 can run in parallel (both audit-only)
- Phase 8 is the final gate — depends on ALL preceding phases

## Success Criteria

1. **可读**: PROJECT_SUMMARY.md + .agentignore 让 Agent 首次就能理解项目
2. **可构建**: scripts/build.sh 一键构建成功
3. **可测试**: scripts/test.sh 一键测试通过
4. **可启动**: scripts/start.sh 一键启动开发环境
5. **可回滚**: 每个 phase 有明确回滚路径
6. **零业务侵入**: 核心业务逻辑未经任何修改
7. **噪音消除**: 过期/废弃/中间文件清理完毕
8. **依赖稳定**: lock 文件完整、版本无漂移
9. **平台兼容**: Android API 36 兼容性已验证/修复
10. **体验完整**: 图标/Logo/启动页/转场/动效商用级就绪

---

_Roadmap created: 2026-05-05_
