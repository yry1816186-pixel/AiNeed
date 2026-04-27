# Phase 12 Context: 比赛冲刺 — 全量 Bug 修复 + Demo 零崩溃 + 体验提升

**Created:** 2026-04-27
**Source:** Inline PRD from /gsd-plan-phase command
**Phase Status:** Planning

---

## Project State (as of Phase 12 start)

- **Milestone**: v1.0 — All 11 phases complete (51/51 plans)
- **Last commit**: 594aba16 — fix: resolve 29 TS errors + consolidate theme tokens + forwardRef flash-list polyfill
- **Tech stack**: React Native 0.76.8 (Expo 52) + NestJS 11 + Prisma + Python FastAPI + Docker
- **Competition**: 互联网+ 5-6 月校赛, Demo 面试穿搭场景

## Codebase Health Snapshot

### TypeScript

- Mobile: 1 error (Expo tsconfig.base compatibility — not project code)
- Backend: Cannot verify locally (deps not installed), Docker build verified in Phase 11

### `any` Types (60 occurrences in 30 files)

Critical path files with `any`:

- `consultant/screens/ChatScreen.tsx` (4) — Demo path, high risk
- `consultant/screens/AdvisorProfileScreen.tsx` (3)
- `commerce/screens/CheckoutScreen.tsx` (4) — Payment flow
- `stylist/screens/OutfitDetailScreen.tsx` (1) — Demo path
- `search/screens/SearchScreen.tsx` (1) — Demo path
- `visualization/AlgorithmVisualization.tsx` (13) — Tech demo
- `commerce/screens/OrderDetailScreen.tsx` (2)
- `customization/screens/CustomizationPreviewScreen.tsx` (3)

### throw new Error (25+ locations)

Key crash points on demo path:

- `AICompanionProvider.tsx`: session creation + message send (lines 416, 426, 431)
- `VirtualTryOnContext.tsx`: photo upload failures (lines 151, 213)
- `TryOnScreen.tsx`: upload + create failures (lines 255, 263, 275, 284)
- `WardrobeScreen.tsx`: item loading failure (line 144)
- `RecommendationDetailScreen.tsx`: recommendation load + purchase source (lines 210, 251)

### Design Tokens

- Hardcoded hex: 4 files only (all comments/tests) — clean
- Token files: `design-system/theme/tokens/design-tokens.ts` + `colors.ts`

### Docker

- Dev: 18 services, 12 healthchecked
- Prod: 16 services, 29 healthchecked
- Demo checklist: 15 items across 4 categories

### Console Logging

- Only 2 `console.warn` in ErrorBoundary.tsx (appropriate)
- Zero `console.error` in .tsx files

## PRD Requirements

### M1: 模拟器全量功能冒烟测试

- 冷启动无白屏无崩溃
- 逐页面走查: 今日/探索/造型师/我的
- Onboarding 4 步流程完整走通
- 伊伊对话完整链路
- 语音按钮 STT→TTS
- Discover 三 Tab 切换
- 搜索功能
- 个人中心编辑

### M2: Demo 核心路径零崩溃

- 冷启动 → Onboarding → 伊伊搭第一套 → 保存 (30s)
- 造型师 → "明天面试穿什么" → 完整对话 → 试穿 → 保存 (90s)
- 今日页 → 推荐 → 衣橱 → 分享 (30s)
- 连续 3 次无崩溃

### M3: 已知 Bug 清零

- R4: Demo 崩溃风险 — 复现修复
- R7: TypeScript — 保持零错误
- R10: 环境依赖 — Docker 健康检查
- R11: GLM 限流 — fallback 正常
- console.error/warning 输出审查

### M4: 视觉体验打磨

- Skeleton/placeholder 无闪烁
- 对话气泡样式一致
- 推荐卡片间距/圆角统一
- 无硬编码颜色残留
- 空状态文案统一中文

### M5: Docker 全链路验证

- 15 服务全部 healthy
- demo-warmup.sh 正常
- DEMO-CHECKLIST 17 项通过

### M6: 比赛材料最终校准

- Demo Script 实际走通 ≤2:30
- PPT-STRUCTURE 16 项完成
- Q-A-PREP 追问覆盖
- 软著三份材料可提交

## Scope

- **IN**: Bug 修复 + 崩溃修复 + 视觉打磨 + Demo 路径验证 + 材料校准
- **OUT**: 新功能开发 + 架构重构 + v2 需求 + 模型训练

## Acceptance Criteria

1. 模拟器冷启动 → 完整 Demo 路径连续 3 次零崩溃
2. tsc --noEmit 零错误 (仅 expo node_modules 警告)
3. Docker 15 服务全部 healthy
4. Demo Script 实际走通时间 ≤ 2:30
5. 0 个 P0/P1 bug 遗留
6. 所有比赛材料 final 状态
