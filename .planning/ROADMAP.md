# Roadmap: 寻裳 XUNO — AI 穿搭搭子 伊伊

## Overview

Two-track execution: a 48-hour sprint (Phases 1-5) to deliver a demo-ready decision-first app, followed by a long-term build-out (Phases 6-10) spanning 4-8 weeks. The sprint delivers a complete interview-outfit Agent demo for competition. Post-sprint focuses on model upgrade, data flywheel, mini program, and production launch. Phase 11 is the competition demo sprint + production validation for the May-June 2026 school competition.

**Authoritative Source:** XUNO_FINAL_PLAN.md (42 frozen decisions, 10-dimension coverage)

## Phases

**Track A: 48-Hour Sprint (Phases 1-5)**

- [x] **Phase 1: Foundation + TS Cleanup + Visual Base** - Zero compile errors, data schema enriched, gender demoted, visual system initialized, FashionSigLIP visualization component ✓ 2026-04-24
- [x] **Phase 2: Pipeline + Cold Start + Curated Wardrobe** - Recommendation pipeline single entry, cold start refactored, mock data seeded, curated wardrobe model, A/B experiment ID ✓ 2026-04-24
- [x] **Phase 3: Navigation + Core Screens + Calendar** - 4-tab navigation, Today Screen with Yiyi proactive push, Discover with curation space, simplified 7-day calendar ✓ 2026-04-24
- [x] **Phase 4: Yiyi Agent + Voice + Onboarding + Studio** - Agent state machine, interview outfit dialog, voice button, Edge-TTS, new 4-step onboarding, studio smart recommendation ✓ 2026-04-25
- [x] **Phase 5: E2E Integration + Competition Demo** - Full flow test, visual consistency, competition-specific demo path, tech depth showcase ✓ 2026-04-25

**Track B: Long-Term Build (Phases 6-10)**

- [x] **Phase 6: Model Upgrade + Compliance + Security** - FashionSigLIP replacement + Chinese fine-tune, SASRec pipeline, compliance, security blockers, product contract frozen ✓ 2026-04-25
- [x] **Phase 7: Data Flywheel + Calendar Full + Advanced Rec** - Feedback loop, FashionSigLIP iteration, full calendar with AI auto-planning, style evolution visualization ✓ 2026-04-27
- [x] **Phase 8: Mini Program + Photo Search + Social** - WeChat mini program v1, photo-based item search, style DNA social matching ✓ 2026-04-25
- [x] **Phase 9: Monetization + Community + Sharing** - 3-tier membership, content products, share seed features, studio commission ✓ 2026-04-26
- [x] **Phase 10: Production + Launch + Competition** - Nginx/TLS/monitoring, app store listing, offline capability, competition materials submitted ✓ 2026-04-26

**Track C: Competition Demo Sprint (Phase 11-12)**

- [x] **Phase 11: Competition Demo Sprint + Production Validation** - Docker 全链路跑通, GLM fallback 双保险, tsc 零错误, 软著提交, Demo Script 校准, 备赛材料打磨 ✓ 2026-04-26
- [x] **Phase 12: 比赛冲刺 — 全量 Bug 修复 + Demo 零崩溃 + 体验提升** - any 清扫, ErrorBoundary 加固, 视觉打磨, Demo 路径零崩溃, Docker 全链路, 材料终审 ✓ 2026-04-27

## Phase Details

### Phase 1: Foundation + TS Cleanup + Visual Base

**Goal**: The app compiles with zero TypeScript errors, the data schema supports all downstream features, gender is demoted, visual design tokens are applied, and FashionSigLIP visualization component exists for tech demo
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, GND-01, GND-02, GND-03, GND-04, GND-05, VIS-01, VIS-02, VIS-03, VIS-04
**Success Criteria** (what must be TRUE):

1. `tsc --noEmit` returns zero errors across the entire monorepo (backend + mobile)
2. ClothingItem Prisma model includes material, season, gender(optional), source, and DataSource enum fields
3. RecommendationBatch and RecommendationImpression tables exist in the database schema
4. UserBehavior is unified into a single UserBehaviorEvent model
5. gender field is @IsOptional in auth DTO, and onboardingStore requires primaryScenarios/ageBand/styleExpression instead of gender
6. Design tokens applied: warm camel #C4956A + charcoal #2D3436 + warm orange #E17055 + warm white #FAFAF8
7. FashionSigLIP similarity visualization component renders (even with mock data)
   **Plans**: 3 plans

Plans:

- [x] 01-01-PLAN.md ✓ 2026-04-24
- [x] 01-02-PLAN.md ✓ 2026-04-24
- [x] 01-03-PLAN.md ✓ 2026-04-24

### Phase 2: Pipeline + Cold Start + Curated Wardrobe

**Goal**: Every recommendation flows through a single Orchestrator entry point, cold-start users get coherent results from onboarding data, mock products cover the matrix, curated wardrobe model replaces inventory model
**Depends on**: Phase 1
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, CUR-01, CUR-02
**Plans**: 3 plans

Plans:

- [x] 02-01-PLAN.md ✓ 2026-04-24
- [x] 02-02-PLAN.md ✓ 2026-04-24
- [x] 02-03-PLAN.md ✓ 2026-04-24

### Phase 3: Navigation + Core Screens + Calendar

**Goal**: Users see a 4-tab decision-first navigation, Today Screen shows Yiyi's proactive push with voice button, Discover shows curation space, simplified 7-day calendar exists
**Depends on**: Phase 2
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, TOD-01, TOD-02, TOD-03, TOD-04, TOD-05, DIS-01, DIS-02, DIS-03, DIS-04, CAL-01, CAL-02
**Plans**: 3 plans

Plans:

- [x] 03-01-PLAN.md ✓ 2026-04-24
- [x] 03-02-PLAN.md ✓ 2026-04-24
- [x] 03-03-PLAN.md ✓ 2026-04-24

### Phase 4: Yiyi Agent + Voice + Onboarding + Studio

**Goal**: Yiyi delivers structured agent conversations (interview outfit as showcase), voice button triggers STT+TTS, new 4-step onboarding ends with "let Yiyi dress you", studio smart recommendation triggers contextually
**Depends on**: Phase 3
**Requirements**: YIYI-01~07, VOI-01~03, WKS-01~04, ONB-01~05, RUL-01~03, ETH-01~02
**Plans**: 7 plans

Plans:

- [x] 04-01-PLAN.md ✓ 2026-04-24
- [x] 04-02-PLAN.md ✓ 2026-04-24
- [x] 04-03-PLAN.md ✓ 2026-04-24
- [x] 04-04-PLAN.md ✓ 2026-04-25
- [x] 04-05-PLAN.md ✓ 2026-04-25
- [x] 04-06-PLAN.md ✓ 2026-04-25
- [x] 04-07-PLAN.md ✓ 2026-04-25

### Phase 5: E2E Integration + Competition Demo

**Goal**: Complete user journey works end-to-end, visual consistency achieved, competition-specific demo path showcases three-layer narrative
**Depends on**: Phase 4
**Plans**: 4 plans

Plans:

- [x] 05-01-PLAN.md ✓ 2026-04-25
- [x] 05-02-PLAN.md ✓ 2026-04-25
- [x] 05-03-PLAN.md ✓ 2026-04-25
- [x] 05-04-PLAN.md ✓ 2026-04-25

### Phase 6: Model Upgrade + Compliance + Security

**Goal**: FashionSigLIP replaces FashionCLIP, Chinese fine-tune completes, SASRec pipeline works, all legal/security blockers resolved
**Depends on**: Phase 5
**Plans**: 6 plans

Plans:

- [x] 06-01-PLAN.md ✓ 2026-04-25
- [x] 06-02-PLAN.md ✓ 2026-04-25
- [x] 06-03-PLAN.md ✓ 2026-04-25
- [x] 06-04-PLAN.md ✓ 2026-04-25
- [x] 06-05-PLAN.md ✓ 2026-04-25
- [x] 06-06-PLAN.md ✓ 2026-04-25

### Phase 7: Data Flywheel + Calendar Full + Advanced Rec

**Goal**: Complete feedback loop from user behavior to model retraining, full calendar with AI auto-planning, style evolution visualization
**Depends on**: Phase 6
**Plans**: 4 plans

Plans:

- [x] 07-01-PLAN.md ✓ 2026-04-27
- [x] 07-02-PLAN.md ✓ 2026-04-27
- [x] 07-03-PLAN.md ✓ 2026-04-27
- [x] 07-04-PLAN.md ✓ 2026-04-27

### Phase 8: Mini Program + Photo Search + Social

**Goal**: WeChat mini program with core features live, photo-based item search as acquisition hook, style DNA social matching
**Depends on**: Phase 7
**Plans**: 4 plans

Plans:

- [x] 08-01-PLAN.md ✓ 2026-04-25
- [x] 08-02-PLAN.md ✓ 2026-04-25
- [x] 08-03-PLAN.md ✓ 2026-04-25
- [x] 08-04-PLAN.md ✓ 2026-04-25

### Phase 9: Monetization + Community + Sharing

**Goal**: Free tier limits enforced, content products purchasable, premium features gated by subscription, share seed features drive viral growth, studio commission operational
**Depends on**: Phase 8
**Plans**: 5 plans

Plans:

- [x] 09-01-PLAN.md ✓ 2026-04-26
- [x] 09-02-PLAN.md ✓ 2026-04-26
- [x] 09-03-PLAN.md ✓ 2026-04-26
- [x] 09-04-PLAN.md ✓ 2026-04-26
- [x] 09-05-PLAN.md ✓ 2026-04-26

### Phase 10: Production + Launch + Competition

**Goal**: Production deployment, app store listing, offline capability, competition materials submitted
**Depends on**: Phase 9
**Plans**: 5 plans

Plans:

- [x] 10-01-PLAN.md ✓ 2026-04-26
- [x] 10-02-PLAN.md ✓ 2026-04-26
- [x] 10-03-PLAN.md ✓ 2026-04-26
- [x] 10-04-PLAN.md ✓ 2026-04-26
- [x] 10-05-PLAN.md ✓ 2026-04-26

### Phase 11: Competition Demo Sprint + Production Validation

**Goal**: 本地 Docker 全链路零崩溃 + AI fallback 双保险 + tsc 零错误 + 软著提交 + Demo Script 2:20 完整走通 + 3 分钟 backup 视频录制完成
**Depends on**: Phase 10
**Success Criteria** (what must be TRUE):

1. 本地 Docker 全链路零崩溃 (15 服务全部 healthy)
2. Demo Script 2:20 完整走通 (技术与实际代码一致)
3. tsc --noEmit 零错误
4. 软著材料审校完成可提交
5. 10 个 seed profile 覆盖所有演示场景
6. GLM-4-Flash -> GLM-5 fallback 自动切换，5 秒超时触发
7. Q&A 补充追问完毕，评委提问无盲区
   **Plans**: 6 plans

Plans:

- [x] 11-01-PLAN.md — Docker 全链路跑通 + 演示检查清单 + 预热脚本 (D-01, D-02, D-03, D-04, D-06, D-07) ✓ 2026-04-26
- [x] 11-02-PLAN.md — AIServiceRouter GLM Fallback + Edge-TTS 预缓存 (D-08, D-09, D-10, D-11, D-15) ✓ 2026-04-26
- [x] 11-03-PLAN.md — 全局 tsc --noEmit 修复 (D-16) ✓ 2026-04-26
- [x] 11-04-PLAN.md — 10 Seed Profile 构造 + 推荐效果验证 + 对话质量打磨 (D-12, D-13, D-14) ✓ 2026-04-26
- [x] 11-05-PLAN.md — Demo Script 校准 + 预录 Backup 视频录屏指南 (D-05, D-18, D-20) ✓ 2026-04-26
- [x] 11-06-PLAN.md — PPT 微调清单 + 软著提交 + Q&A 追问补充 (D-17, D-19, D-21) ✓ 2026-04-26

### Phase 12: 比赛冲刺 — 全量 Bug 修复 + Demo 零崩溃 + 体验提升

**Goal**: 48 小时内完成：模拟器全量功能测试通过零崩溃、所有已知 bug 清零、Demo 录屏一次过、比赛材料最终校准
**Depends on**: Phase 11
**Success Criteria** (what must be TRUE):

1. 模拟器冷启动 → 完整 Demo 路径连续 3 次零崩溃
2. tsc --noEmit 零错误 (仅 expo node_modules 警告)
3. Docker 15 服务全部 healthy
4. Demo Script 实际走通时间 ≤ 2:30
5. 0 个 P0/P1 bug 遗留
6. 所有比赛材料 final 状态
   **Plans**: 6 plans

Plans:

- [x] 12-01-PLAN.md — TypeScript any 清扫 + ErrorBoundary 加固
- [x] 12-02-PLAN.md — 视觉体验打磨 (Skeleton + 对话气泡 + 卡片 + 空状态) ✓ 2026-04-27
- [x] 12-03-PLAN.md — Demo 路径加固 (对话链路 + Onboarding + 语音 fallback) ✓ 2026-04-27
- [x] 12-04-PLAN.md — Docker 全链路验证 + 预热脚本 + Demo Checklist ✓ 2026-04-27
- [x] 12-05-PLAN.md — 模拟器冒烟测试 + Demo Script 实跑 + 崩溃日志 ✓ 2026-04-27
- [x] 12-06-PLAN.md — 比赛材料终审 (PPT + Q-A + Demo Script + 软著) ✓ 2026-04-27

**Track D: Backend Full-Stack Verification (Phase 20-22)**

- [ ] **Phase 20: 后端全栈一键启动验证** - docker-compose 一键启动所有服务，health check 全绿，seed demo 数据就绪，本地启动文档完整
- [x] **Phase 22: 开放 API 内部架构验证** - Partner API 鉴权+限流中间件技术验证，5 个转发端点，OpenAPI 文档 (completed 2026-04-29)

**Track E: v2.0 Frontend Restructuring (Phases 13-19)**

- [x] **Phase 13: 全流程深度审计** - Playwright 逐页截图, 标杆差距分析, 组件一致性审计, 性能基线, WCAG 2.1 AA 审计 ✓ 2026-04-28
- [x] **Phase 14: 品牌视觉 + 设计系统重建** - Logo/App Icon/Splash, 三层 Design Token, 替换 ThemeManager, 暗色模式独立设计 (completed 2026-04-28)
- [ ] **Phase 15: 原子组件库 + 动效基础** - 8 原子组件, SmartImage, animationPresets, 启动画面 Lottie
- [ ] **Phase 16: 首页 + Onboarding 重构** - 沉浸式 Today 页, 场景卡, 推荐轮播, 语音按钮, Onboarding 动画
- [ ] **Phase 17: AI 对话 + 发现页重构** - 流式对话气泡, 打字机效果, 内嵌搭配卡, 瀑布流发现页
- [ ] **Phase 18: 衣橱 + 个人页重构** - 分类管理, 拖拽排序, 穿搭组合, Style DNA 雷达图, 穿搭日历
- [ ] **Phase 19: 技术升级 + 微交互 + 暗色模式完善** - FlashList, expo-image, 离线体验, 共享元素过渡, 点赞/刷新动效

## Phase Details (v2.0)

### Phase 13: 全流程深度审计

**Goal**: 捕获当前前端完整基线状态，输出差距分析报告，为后续重构提供精确的起点和优先级依据
**Depends on**: Phase 12 (v1.0 complete)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05
**Success Criteria** (what must be TRUE):

1. 所有页面截图已保存至 `.planning/audit/screenshots/`，覆盖每个 Tab 和子页面
2. 标杆差距分析文档完成，每个页面与小红书/得物/NET-A-PORTER 的具体 UI/UX 差距已记录
3. 组件一致性审计完成，列出所有间距/圆角/字号/颜色/动效不一致项
4. 性能基线数据已记录：首屏加载时间、TTI、列表滚动 FPS、图片加载时间
5. WCAG 2.1 AA 审计完成，列出所有缺失的 accessibilityLabel、触控目标、对比度违规

**Plans**: 3 plans

Plans:

- [x] 13-01-PLAN.md — Playwright 截图自动化 + 屏幕清单 (AUDIT-01) ✓ 2026-04-28
- [x] 13-02-PLAN.md — 标杆差距分析 + 组件一致性审计脚本 (AUDIT-02, AUDIT-03) ✓ 2026-04-28
- [x] 13-03-PLAN.md — 性能基线测量 + WCAG 2.1 AA 无障碍审计 (AUDIT-04, AUDIT-05) ✓ 2026-04-28

### Phase 14: 品牌视觉 + 设计系统重建

**Goal**: 建立完整的品牌视觉资产体系（Logo/Icon/Splash/图案）和三层 Design Token 系统，替换损坏的 ThemeManager，实现暗色模式独立设计
**Depends on**: Phase 13
**Requirements**: BRAND-01, BRAND-02, BRAND-03, BRAND-04, BRAND-05, BRAND-06, DSTK-01, DSTK-02, DSTK-03, DSTK-04, DSTK-05, DSTK-06
**Success Criteria** (what must be TRUE):

1. Logo 设计完成（horizontal/square/monochrome 3 变体），App Icon 导出（iOS + Android adaptive）
2. Splash Lottie 动画完成，冷启动播放 ≤1.5s，品牌色 + Logo 揭示
3. 三层 Token 系统（primitive → semantic → component）覆盖 Color/Typography/Spacing/Radius/Shadow/Motion
4. ThemeManager.ts 已替换为 Zustand themeStore + MMKV + Appearance API，零 Web API 调用
5. 暗色模式独立色板设计完成，WCAG AA 4.5:1 对比度验证通过
6. 现有 DesignTokens 全部保留，通过 legacyTokenMap 桥接，零破坏性变更

**Plans:** 4/4 plans complete

Plans:

- [x] 14-01-PLAN.md — 三层 Token 构建 (Style Dictionary YAML→TS) (DSTK-01, DSTK-03)
- [x] 14-02-PLAN.md — Zustand themeStore + MMKV + 暗色模式 (DSTK-04, DSTK-05, DSTK-06)
- [x] 14-03-PLAN.md — Logo/App Icon/Splash 品牌资产 + 品牌指南 (BRAND-01~06)
- [x] 14-04-PLAN.md — legacyTokenMap 桥接 + 废弃文件清理 + 审计脚本 (DSTK-02, DSTK-03)

### Phase 15: 原子组件库 + 动效基础

**Goal**: 构建完整的原子组件库（8 个核心组件），建立统一的动效预设系统和 SmartImage 渐进式加载组件
**Depends on**: Phase 14
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, COMP-07, COMP-08, TECH-05, ANIM-06
**Success Criteria** (what must be TRUE):

1. 8 个原子组件（Button/Input/Card/Avatar/Badge/Skeleton/BottomSheet/Toast）在亮色/暗色模式下正确渲染
2. 所有组件使用 Design Token 引用，零硬编码颜色/字号/间距
3. Skeleton 组件 shimmer 动画使用 Reanimated（无额外原生依赖），匹配组件形状
4. SmartImage 组件支持 blurhash 占位 + 渐进式加载 + 内存/磁盘缓存 + CDN URL 参数
5. animationPresets 集中定义所有 easing/duration/spring 配置，组件引用预设而非硬编码
6. Splash Lottie 动画集成到 App 启动流程，≤1.5s 播放，亮/暗变体

Plans: (none yet)

### Phase 16: 首页 + Onboarding 重构

**Goal**: 重构 Today 页对标小红书沉浸式卡片流品质，重构 Onboarding 为流畅的品牌化引导体验
**Depends on**: Phase 15
**Requirements**: TODAY-01, TODAY-02, TODAY-03, TODAY-04, TODAY-05, ONBD-01, ONBD-02, ONBD-03, ONBD-04, ONBD-05
**Success Criteria** (what must be TRUE):

1. Today 页视觉层级清晰：hero 场景卡 → 推荐轮播 → 语音按钮，信息密度匹配小红书发现页
2. 天气/场景卡显示动态天气图标、温度、场合上下文、AI 每日摘要
3. 推荐卡片水平轮播：大图 + 穿搭名 + 场合标签 + 试穿按钮，snap 分页 + 触觉反馈
4. 语音按钮显著位置，按住说话视觉反馈（脉冲动画 + 波形显示）
5. Onboarding 步骤间 slide+fade 过渡动画，进度条 spring 更新
6. 场景选择卡片视觉吸引力：插图 + 图标 + 标题，选中态品牌色边框动画
7. "让伊伊搭第一套" 揭示时刻：搭配卡片逐一 stagger 出现 + 品牌光效

Plans: (none yet)

### Phase 17: AI 对话 + 发现页重构

**Goal**: 重构 Stylist 对话页对标 ChatGPT/豆包品质，重构 Discover 为瀑布流灵感发现页
**Depends on**: Phase 15
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, DISC-01, DISC-02, DISC-03, DISC-04, DISC-05
**Success Criteria** (what must be TRUE):

1. 对话气泡品质对标 ChatGPT：伊伊 vs 用户区分样式，圆角流畅，文字换行正确，时间戳显示
2. AI 回复打字机效果：逐字显示，保持滚动位置，用户可在生成中向上滚动
3. 对话流内嵌搭配/产品卡：图片 + 名称 + 价格 + 操作按钮（试穿/收藏/查看）
4. Quick Reply 圆角药片样式，水平滚动，3-5 个上下文建议
5. 发现页 2 列瀑布流布局（MasonryFlashList），Pinterest 级品质
6. 瀑布流 60fps 滚动，blurhash 占位，分类 Tab 筛选 + 平滑切换
7. 下拉刷新自定义品牌动画（非默认 spinner）

Plans: (none yet)

### Phase 18: 衣橱 + 个人页重构

**Goal**: 重构衣橱页为分类管理 + 拖拽排序 + 穿搭组合展示，重构个人页为 Style DNA 可视化 + 穿搭日历
**Depends on**: Phase 15
**Requirements**: WARD-01, WARD-02, WARD-03, WARD-04, WARD-05, PROF-01, PROF-02, PROF-03, PROF-04, PROF-05
**Success Criteria** (what must be TRUE):

1. 衣橱分类 Tab（全部/上装/下装/外套/鞋履/配饰）+ 物品数量 Badge + 平滑切换
2. 长按进入选择模式 → 拖拽排序：跟随手指动画 + 透明度变化 + 阴影提升
3. 穿搭组合以 flat-lay 展示（物品视觉排列，非列表），Whering/Stylebook 级品质
4. Style DNA 雷达图 6 维度（色彩/风格/场景/价位/品牌/复杂度）+ 加载动画
5. 穿搭日历 7 天视图：穿搭缩略图 + 天气图标 + 场合标签，点击查看详情
6. 个人统计（总穿搭/最常穿/风格匹配分）+ count-up 动画

Plans: (none yet)

### Phase 19: 技术升级 + 微交互 + 暗色模式完善

**Goal**: FlashList 替换 FlatList，共享元素过渡，完整微交互动效体系，暗色模式全页面验证
**Depends on**: Phase 16, Phase 17, Phase 18
**Requirements**: TECH-01, TECH-02, TECH-03, TECH-04, ANIM-01, ANIM-02, ANIM-03, ANIM-04, ANIM-05
**Success Criteria** (what must be TRUE):

1. 所有列表页使用 FlashList v2 替换 FlatList，中端 Android (Snapdragon 680) 60fps 验证
2. 所有图片使用 expo-image 加载：blurhash 占位 + 渐进式加载 + 内存/磁盘缓存
3. 核心功能离线可用：缓存 50 条推荐 + 衣橱数据 + 日历，断网显示离线横幅
4. 卡片 → 详情页共享元素过渡平滑（无闪烁/布局跳动）
5. 点赞/收藏动画：心形图标 spring 缩放 + 粒子效果 + 颜色填充（400ms 内完成）
6. AI 推荐渐进式展示：搭配物品逐一出现（stagger delay）+ 背景微光脉冲 + 置信度条动画
7. 暗色模式全页面验证通过：每个页面亮/暗双模式截图对比

Plans: (none yet)

### Phase 20: 后端全栈一键启动验证

**Goal**: 确保 docker-compose up 后，PostgreSQL + Redis + MinIO + Qdrant + FastAPI AI 服务 + NestJS 后端全部健康启动，health check 全绿，seed demo 数据就绪
**Depends on**: Phase 12 (competition sprint complete)
**Success Criteria** (what must be TRUE):

1. docker-compose up 一条命令启动所有服务（docker-compose.dev.yml 基础设施 + 本地 backend + FastAPI）
2. 所有 health endpoint 返回 healthy：FastAPI /health → 200，NestJS /api/v1/health → 200
3. Prisma migrate 可执行，schema 与数据库一致
4. Seed 数据包含至少 1 个 demo 用户（标记 is_demo: true，用户名/邮箱含 "demo" 前缀）+ 10 件衣橱衣物 + 7 天推荐
5. Demo 数据在 API 响应中不伪装为真实数据（provider 字段标注 real/sandbox/fallback）
6. 生产环境运行 seed 被拒绝（NODE_ENV 保护已有）
7. 完整本地启动步骤文档（README 或 docs/local-setup.md），明确标注 demo/sandbox 模式服务
8. 反欺诈约束满足：不得暗示未实现功能已可用、骨架/placeholder 标注"开发中"、API 响应含 provider 字段

**Plans:** 4 plans (3 executed + 1 gap closure)

Plans:

- [x] 20-01-PLAN.md — Docker 化全栈环境 (docker-compose.local.yml 一键启动) ✓ 2026-04-29
- [x] 20-02-PLAN.md — Seed 数据系统改造 (is_demo 标记 + demo 前缀 + 7 天推荐) ✓ 2026-04-29
- [x] 20-03-PLAN.md — Health Check 脚本 + 本地开发文档 ✓ 2026-04-29
- [ ] 20-04-PLAN.md — [GAP CLOSURE] RecommendationBatch/StyleRecommendation schema 添加 is_demo + provider 字段

### Phase 21: 移动端 Week 每周推荐端到端验证

**Goal**: 修复 Week tab 前后端 API 契约不匹配，确保完整调用链路（API 路径、响应结构、数据渲染、导航可达）工作正常，满足反欺诈约束
**Depends on**: Phase 12 (v1.0 complete)
**Requirements**: WEEK-E2E-01, WEEK-E2E-02, WEEK-E2E-03, WEEK-E2E-04, WEEK-E2E-05, WEEK-E2E-06, WEEK-E2E-07
**Success Criteria** (what must be TRUE):

1. Week tab 可点击，显示 7 天穿搭计划结构（plans 数组，非 days）
2. 每天卡片显示：场景标签 (sceneTag)、搭配建议 (outfit.coverImage)、衣橱复用率
3. 天气 fallback (provider=fallback) 时显示 "天气数据不可用，使用通用季节建议" 警告
4. loading → 数据渲染 → error 重试，三种状态完整流转
5. OutfitDiary 和 WeeklyReport 通过 WeekStack 导航可达
6. Week 相关文件中不存在 constellation/zodiac/horoscope/星座 引用
7. 反欺诈约束：无误导性 "AI 深度学习" 文案，provider 字段标注数据来源

**Plans:** 1/3 plans executed

Plans:

- [x] 21-01-PLAN.md — API 契约修复 + 天气 provider + WeekScreen 重写 (WEEK-E2E-01~04) ✓ 2026-04-29
- [x] 21-02-PLAN.md — 端到端验证 + 人工验收 (WEEK-E2E-05~07) ✓ 2026-04-29

### Phase 22: 开放 API 内部架构验证

**Goal**: 内部技术验证 Partner API 鉴权(HMAC-SHA256)和限流(Redis 滑动窗口)中间件架构，5 个端点转发到现有内部 API，OpenAPI 3.0 文档每页标注 Internal Use Only
**Depends on**: Phase 20 (后端基础设施就绪)
**Requirements**: OAPI-01, OAPI-02, OAPI-03, OAPI-04, OAPI-05
**Success Criteria** (what must be TRUE):

1. curl -H "X-Api-Key: ...; X-Timestamp: ...; X-Signature: ..." POST /api/v1/partner/recommendation 返回推荐结果
2. 错误/过期 key 返回 401
3. 超限请求返回 429 + Retry-After header
4. grep "Internal Use Only" docs/partner-api.yaml 返回匹配
5. Prisma schema 包含 PartnerApiKey 和 PartnerApiCallLog 模型
6. PartnerApiCallLog 记录每次 API 调用

**Plans:** 3/3 plans complete

Plans:

- [x] 22-01-PLAN.md — Prisma Schema + 鉴权 Guard (HMAC-SHA256 + 时间窗口) (OAPI-01, OAPI-02)
- [x] 22-02-PLAN.md — 限流中间件 (Redis 滑动窗口) + Partner API 控制器 (OAPI-03, OAPI-04)
- [x] 22-03-PLAN.md — OpenAPI 文档 + Seed Script + 集成验证 (OAPI-05)

## Progress

**Execution Order:**
Phases execute sequentially: 1 -> 2 -> 3 -> 4 -> 5 (sprint) -> 6 -> 7 -> 8 -> 9 -> 10 (long-term) -> 11-12 (competition) -> 13 (audit) -> 14 (design system) -> 15 (components) -> 16/17/18 (pages, partially parallelizable) -> 19 (polish)

| Phase                                           | Plans Complete | Status      | Completed  |
| ----------------------------------------------- | -------------- | ----------- | ---------- |
| 1. Foundation + TS Cleanup + Visual Base        | 3/3            | Complete    | 2026-04-24 |
| 2. Pipeline + Cold Start + Curated Wardrobe     | 3/3            | Complete    | 2026-04-24 |
| 3. Navigation + Core Screens + Calendar         | 3/3            | Complete    | 2026-04-24 |
| 4. Yiyi Agent + Voice + Onboarding + Studio     | 7/7            | Complete    | 2026-04-25 |
| 5. E2E Integration + Competition Demo           | 4/4            | Complete    | 2026-04-25 |
| 6. Model Upgrade + Compliance + Security        | 6/6            | Complete    | 2026-04-25 |
| 7. Data Flywheel + Calendar Full + Advanced Rec | 4/4            | Complete    | 2026-04-27 |
| 8. Mini Program + Photo Search + Social         | 4/4            | Complete    | 2026-04-25 |
| 9. Monetization + Community + Sharing           | 5/5            | Complete    | 2026-04-26 |
| 10. Production + Launch + Competition           | 5/5            | Complete    | 2026-04-26 |
| 11. Competition Demo Sprint + Validation        | 6/6            | Complete    | 2026-04-26 |
| 12. 比赛冲刺 — Bug Fix + Demo + 体验提升        | 6/6            | Complete    | 2026-04-27 |
| 13. 全流程深度审计                              | 3/3            | Complete    | 2026-04-28 |
| 14. 品牌视觉 + 设计系统重建                     | 4/4            | Complete    | 2026-04-28 |
| 15. 原子组件库 + 动效基础                       | 0/?            | Pending     |            |
| 16. 首页 + Onboarding 重构                      | 0/?            | Pending     |            |
| 17. AI 对话 + 发现页重构                        | 0/?            | Pending     |            |
| 18. 衣橱 + 个人页重构                           | 0/?            | Pending     |            |
| 19. 技术升级 + 微交互 + 暗色模式完善            | 0/?            | Pending     |            |
| 20. 后端全栈一键启动验证                        | 1/3            | In Progress |            |
| 21. 移动端 Week 每周推荐端到端验证              | 2/2            | Complete    | 2026-04-29 |
| 22. 开放 API 内部架构验证                       | 3/3            | Complete    | 2026-04-29 |

---

_Roadmap re-initialized: 2026-04-22 from XUNO_FINAL_PLAN.md_
_Phase 11 added: 2026-04-26_
_Phase 12 added: 2026-04-27_
_v2.0 phases 13-19 added: 2026-04-27_
_Phase 20 added: 2026-04-28_
_Phase 21 added: 2026-04-29_
_Phase 22 added: 2026-04-29_
