# PLAN.md — Phase 12: 比赛冲刺 — 全量 Bug 修复 + Demo 零崩溃 + 体验提升

**Phase**: 12
**Status**: Ready to Execute
**Created**: 2026-04-27
**Depends on**: Phase 11 (complete)
**Plans**: 6 plans in 3 waves

---

## Plan Overview

| #   | Plan                                                  | Wave | Depends | Est.  | M-ref |
| --- | ----------------------------------------------------- | ---- | ------- | ----- | ----- |
| 01  | TypeScript `any` 清扫 + ErrorBoundary 加固            | 1    | -       | 20min | M2,M3 |
| 02  | 视觉体验打磨 — Skeleton + 对话气泡 + 卡片 + 空状态    | 1    | -       | 15min | M4    |
| 03  | Demo 路径加固 — 对话链路 + Onboarding + 语音 fallback | 2    | 01      | 20min | M1,M2 |
| 04  | Docker 全链路验证 + 预热脚本 + Demo Checklist         | 2    | 01      | 15min | M5    |
| 05  | 模拟器冒烟测试 + Demo Script 实跑 + 崩溃日志捕获      | 3    | 01-04   | 25min | M1,M2 |
| 06  | 比赛材料终审 — PPT + Q-A + Demo Script + 软著         | 3    | 05      | 15min | M6    |

---

## Plan 01: TypeScript `any` 清扫 + ErrorBoundary 加固

**Goal**: 消除 Demo 路径上的 `any` 类型隐患，为关键屏幕包裹 ErrorBoundary 防止未捕获异常导致崩溃

**Context**: 60 个 `any` 分布在 30 个文件中，Demo 关键路径上 `AICompanionProvider.tsx` 和 `ChatScreen.tsx` 分别有 3 和 4 个 `any`。25+ 处 `throw new Error` 未被 try-catch 包裹。

### Tasks

**T01: 清扫 Demo 路径上的 `any` 类型**
Files (priority order):

1. `features/consultant/screens/ChatScreen.tsx` (4 any) — 最关键, 对话入口
2. `features/stylist/components/AICompanionProvider.tsx` — 对话核心
3. `features/stylist/screens/OutfitDetailScreen.tsx` (1 any)
4. `features/search/screens/SearchScreen.tsx` (1 any)
5. `features/commerce/screens/CheckoutScreen.tsx` (4 any) — 支付流程
6. `features/commerce/screens/OrderDetailScreen.tsx` (2 any)
7. `navigation/RootNavigator.tsx` (1 any)
8. `visualization/AlgorithmVisualization.tsx` (13 any) — 技术展示

Actions:

- Replace `any` with proper types (interface, Record<string, unknown>, or specific API response type)
- Do NOT touch files where `any` is in test fixtures or polyfills

**T02: 为 Demo 关键路径添加 try-catch 崩溃防护**
Files:

1. `features/stylist/components/AICompanionProvider.tsx` — 包裹 createSession/sendMessage 的 throw
2. `features/consultant/screens/ChatScreen.tsx` — 包裹 API 调用
3. `shared/contexts/VirtualTryOnContext.tsx` — 包裹 photo upload throws
4. `shared/components/screens/TryOnScreen.tsx` — 包裹 upload + create throws
5. `features/wardrobe/screens/WardrobeScreen.tsx` — 包裹 load items throw
6. `features/home/screens/RecommendationDetailScreen.tsx` — 包裹 load + purchase throws

Actions:

- Wrap `throw new Error(...)` calls in try-catch with user-friendly error state
- Display Chinese error message (not English error text)
- Never let an uncaught exception reach the React error boundary for expected failures (network, API errors)

**T03: 验证 tsc 零错误**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

### Verification

- [ ] Demo 路径 8 个文件的 `any` 全部替换为具体类型
- [ ] 6 个关键文件的 throw 全部被 try-catch 包裹
- [ ] `tsc --noEmit` 零项目代码错误

---

## Plan 02: 视觉体验打磨 — Skeleton + 对话气泡 + 卡片 + 空状态

**Goal**: 统一视觉规范，消除闪烁和不一致

### Tasks

**T01: 首屏加载体验 — Skeleton 无闪烁**
Files to check:

1. `features/today/screens/TodayScreen.tsx` — 首页 skeleton
2. `features/discover/screens/DiscoverScreen.tsx` — 探索页 skeleton
3. `features/stylist/screens/AiStylistUnifiedScreen.tsx` — 造型师加载
4. `features/home/screens/HomeScreen.tsx`
5. `design-system/skeleton/AdvancedSkeleton.tsx`

Actions:

- Ensure all screens show skeleton on first render (no blank white → content flash)
- Skeleton duration: minimum 300ms even if data loads faster (avoid flash)
- Use `DesignTokens.colors.skeletonShimmer` for consistency

**T02: 伊伊对话气泡样式统一**
Files:

1. `features/consultant/screens/ChatScreen.tsx`
2. `features/stylist/components/AICompanionProvider.tsx` (if it renders messages)
3. Any chat bubble component files

Actions:

- Verify all chat message bubbles use consistent padding, border-radius, font
- Yiyi messages: left-aligned, warm background (DesignTokens.colors.brand.terracotta or similar muted tone)
- User messages: right-aligned, neutral background
- Timestamp formatting consistent

**T03: 推荐卡片间距/圆角统一**
Files:

1. `features/home/screens/RecommendationsScreen.tsx`
2. `features/home/screens/RecommendationFeedScreen.tsx`
3. `features/home/screens/RecommendationDetailScreen.tsx`
4. `design-system/ui/ProductGrid.tsx`

Actions:

- All cards use `DesignTokens.spacing.md` gap
- All cards use `DesignTokens.borderRadius.lg` (12px)
- Card elevation consistent (DesignTokens.shadows.sm)

**T04: 空状态文案统一中文**
Files to grep: all screens with EmptyState usage
Actions:

- Search for `EmptyState` component usage across all screens
- Ensure `title` and `description` props are in Chinese
- No English text in user-facing empty states
- Example: "还没有收藏的衣服" not "No favorites yet"

### Verification

- [ ] 所有首页级 screens 有 skeleton loading
- [ ] 对话气泡样式 100% 统一
- [ ] 推荐卡片 spacing/borderRadius 来自 DesignTokens
- [ ] 所有 EmptyState 文案为中文

---

## Plan 03: Demo 路径加固 — 对话链路 + Onboarding + 语音 Fallback

**Goal**: Demo 三段式路径每段都有完善的错误处理和降级方案

### Tasks

**T01: 对话链路加固**
Files:

1. `features/stylist/components/AICompanionProvider.tsx`
2. `apps/backend/src/ai-core/ai/` — dialog forwarding
3. `apps/backend/src/security/degradation/` — circuit breaker

Actions:

- AI 回复超时 (>10s): 显示 "伊伊正在想..." 并重试一次
- AI 服务完全不可用: 显示友好提示 + 建议稍后再试 (中文)
- GLM-4-Flash 限流: 自动 fallback 到 GLM-5 (已在 Phase 11 Plan 02 实现, 验证即可)
- 对话历史为空时: 自动触发问候语 (不显示空白聊天页)

**T02: Onboarding 4 步流程加固**
Files:

1. `features/onboarding/screens/OnboardingWizard.tsx`
2. `features/onboarding/screens/steps/` — all step files
3. `features/onboarding/navigation/OnboardingNavigator.tsx`

Actions:

- 每一步数据验证: 选择不能为空才能 "下一步"
- 网络失败: 本地暂存 + 重试提示
- Step 4 (伊伊搭): 推荐加载失败显示降级模板方案 (不是空白)
- 中途退出后重进: 恢复到上一步 (不是重新开始)

**T03: 语音功能 fallback**
Files:

1. `features/stylist/components/VoiceButton.tsx` or equivalent
2. `services/ttsService.ts` or equivalent
3. `shared/hooks/useVoiceRecognition.ts` or equivalent

Actions:

- 模拟器无麦克风: 隐藏语音按钮或显示 "当前设备不支持语音" (中文)
- STT 识别失败: 自动切换到文字输入模式
- TTS 播放失败: 静默降级 (不弹错误), 文字回复正常显示
- 网络不可用: 缓存最近 TTS 音频离线播放

### Verification

- [ ] AI 对话超时有重试 + 降级提示
- [ ] Onboarding 每步有数据验证
- [ ] 语音不可用时优雅降级
- [ ] 所有降级文案为中文

---

## Plan 04: Docker 全链路验证 + 预热脚本 + Demo Checklist

**Goal**: `docker-compose up` 一键启动所有服务 healthy, demo-warmup 正常

### Tasks

**T01: Docker 服务健康检查补全**
Files:

1. `docker-compose.yml`
2. `docker-compose.production.yml`

Actions:

- 确认所有 15+ 核心服务有 healthcheck
- 补全缺失的 healthcheck (observability stack: prometheus, grafana, loki, etc.)
- 设置合理的 start_period, interval, timeout, retries
- 验证 `docker compose up -d` 后所有服务 reach `healthy`

**T02: demo-warmup.sh 验证和增强**
File: `scripts/demo-warmup.sh`

Actions:

- 执行 `bash scripts/demo-warmup.sh` 并记录结果
- 确认预热覆盖: backend API, AI service, seed data, TTS cache
- 添加超时保护: 单项检查 >30s 则跳过并警告
- 输出清晰的 PASS/FAIL 摘要

**T03: DEMO-CHECKLIST 逐项验证**
File: `docs/DEMO-CHECKLIST.md`

Actions:

- 更新 checklist 为实际可执行的版本 (当前 15 项 → 确认每项可自动化或手动验证)
- 对环境准备 (4 项): 写一个 `scripts/demo-preflight.sh` 自动检查
- 对 App 验证 (5 项): 更新为明确的验证步骤
- 对 Backup (3 项): 确认预录视频和 PPT 路径正确

### Verification

- [ ] `docker compose ps` 所有服务 healthy
- [ ] `demo-warmup.sh` 执行成功 <120s
- [ ] DEMO-CHECKLIST 每项有明确验证方式

---

## Plan 05: 模拟器冒烟测试 + Demo Script 实跑 + 崩溃日志捕获

**Goal**: 全量功能走查通过, Demo Script 3 次连续跑无崩溃

### Tasks

**T01: 编写冒烟测试检查清单**
Create: `docs/SMOKE-TEST.md`

Actions:

- 列出所有需验证的页面和功能 (基于 M1)
- 每项标注: 页面路径 → 操作 → 预期结果 → 实际结果
- 涵盖: 冷启动, 4 个 Tab, Onboarding, 对话, 语音, 搜索, 个人中心
- 崩溃记录: 每次崩溃记录 crash log + 堆栈 + 复现步骤

**T02: 执行 Demo Script 实跑**
File: `docs/demo-script.md`

Actions:

- 按 Demo Script 顺序执行完整 3 段流程
- 计时: 冷启动 →Onboarding→ 伊伊搭 → 保存 → 对话 → 试穿 → 推荐 → 衣橱 → 分享
- 目标: 总时长 ≤ 2:30
- 记录每段实际耗时
- 连续跑 3 次, 记录每次结果

**T03: 崩溃日志收集和分析**
Actions:

- Android: `adb logcat | grep -E "FATAL|ReactNative|crash"` 实时监控
- 每次 crash: 保存完整 logcat 输出
- 分类: JS error / Native crash / Network error / OOM
- 修复所有发现的崩溃, 重新测试直到 3 次连续通过

### Verification

- [ ] SMOKE-TEST.md 所有项 PASS
- [ ] Demo Script 3 次连续零崩溃
- [ ] 总耗时 ≤ 2:30

---

## Plan 06: 比赛材料终审 — PPT + Q-A + Demo Script + 软著

**Goal**: 所有比赛材料 final 状态

### Tasks

**T01: PPT-STRUCTURE.md 16 项校准**
File: `docs/PRESENTATION/PPT-STRUCTURE.md`

Actions:

- 逐项检查 16 项 calibration checklist
- 确认所有截图来自最新版本 App
- 确认数据/数字与实际一致 (seed 用户数, 推荐准确率等)
- 确认技术描述准确 (FashionSigLIP 不是 FashionCLIP)

**T02: Q-A-PREP.md 追问覆盖审查**
File: `docs/PRESENTATION/Q-A-PREP.md`

Actions:

- 覆盖所有可能的评委追问方向
- 技术深度: 模型架构, 推荐算法, 语音处理
- 商业模式: 变现路径, 用户增长, 竞品分析
- 合规: 数据隐私, 软著, 内容安全
- 补充新发现的盲区

**T03: Demo Script 时间校准**
File: `docs/demo-script.md`

Actions:

- 基于 Plan 05 实跑数据校准时间
- 更新脚本中的预计时间
- 添加时间缓冲: 每段预留 5-10s 余量

**T04: 软著材料状态确认**
Actions:

- 确认三份材料 (源代码文档 + 用户手册 + 申请表) 可提交状态
- 源代码文档: 60 页, 包含前 30 页和后 30 页
- 用户手册: 操作流程截图 + 说明
- 申请表: 信息准确, 签章完整

### Verification

- [ ] PPT-STRUCTURE 16 项全部 ✅
- [ ] Q-A-PREP 覆盖无盲区
- [ ] Demo Script 时间与实际一致
- [ ] 软著三份材料可提交

---

## Execution Order

```
Wave 1 (parallel):
  Plan 01 ─── TypeScript + ErrorBoundary
  Plan 02 ─── 视觉打磨

Wave 2 (depends on Plan 01):
  Plan 03 ─── Demo 路径加固
  Plan 04 ─── Docker 验证

Wave 3 (depends on all):
  Plan 05 ─── 冒烟测试 + Demo 实跑
  Plan 06 ─── 材料终审
```

## Risk Mitigation

| Risk           | Mitigation                            |
| -------------- | ------------------------------------- |
| 模拟器启动失败 | Plan 04 先验证 Docker, 再启动 App     |
| AI 服务不可用  | Plan 03 T01 确保 fallback, 预缓存推荐 |
| 语音不可用     | Plan 03 T03 自动降级到文字输入        |
| Demo 超时      | Plan 05 T02 计时, 超时优化瓶颈环节    |
| 新 bug 引入    | 每个 Plan 完成后 tsc --noEmit 验证    |
