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

**Track C: Competition Demo Sprint (Phase 11)**

- [x] **Phase 11: Competition Demo Sprint + Production Validation** - Docker 全链路跑通, GLM fallback 双保险, tsc 零错误, 软著提交, Demo Script 校准, 备赛材料打磨 ✓ 2026-04-26

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

## Progress

**Execution Order:**
Phases execute sequentially: 1 -> 2 -> 3 -> 4 -> 5 (sprint) -> 6 -> 7 -> 8 -> 9 -> 10 (long-term) -> 11 (competition sprint)

| Phase                                           | Plans Complete | Status   | Completed  |
| ----------------------------------------------- | -------------- | -------- | ---------- |
| 1. Foundation + TS Cleanup + Visual Base        | 3/3            | Complete | 2026-04-24 |
| 2. Pipeline + Cold Start + Curated Wardrobe     | 3/3            | Complete | 2026-04-24 |
| 3. Navigation + Core Screens + Calendar         | 3/3            | Complete | 2026-04-24 |
| 4. Yiyi Agent + Voice + Onboarding + Studio     | 7/7            | Complete | 2026-04-25 |
| 5. E2E Integration + Competition Demo           | 4/4            | Complete | 2026-04-25 |
| 6. Model Upgrade + Compliance + Security        | 6/6            | Complete | 2026-04-25 |
| 7. Data Flywheel + Calendar Full + Advanced Rec | 4/4            | Complete | 2026-04-27 |
| 8. Mini Program + Photo Search + Social         | 4/4            | Complete | 2026-04-25 |
| 9. Monetization + Community + Sharing           | 5/5            | Complete | 2026-04-26 |
| 10. Production + Launch + Competition           | 5/5            | Complete | 2026-04-26 |
| 11. Competition Demo Sprint + Validation        | 6/6            | Complete | 2026-04-26 |

---

_Roadmap re-initialized: 2026-04-22 from XUNO_FINAL_PLAN.md_
_Phase 11 added: 2026-04-26_
