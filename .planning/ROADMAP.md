# Roadmap: 寻裳 XUNO — AI 穿搭搭子 伊伊

## Overview

Two-track execution: a 48-hour sprint (Phases 1-5) to deliver a demo-ready decision-first app, followed by a long-term build-out (Phases 6-10) spanning 4-8 weeks. The sprint delivers a complete interview-outfit Agent demo for competition. Post-sprint focuses on model upgrade, data flywheel, mini program, and production launch.

**Authoritative Source:** XUNO_FINAL_PLAN.md (42 frozen decisions, 10-dimension coverage)

## Phases

**Track A: 48-Hour Sprint (Phases 1-5)**

- [x] **Phase 1: Foundation + TS Cleanup + Visual Base** - Zero compile errors, data schema enriched, gender demoted, visual system initialized, FashionSigLIP visualization component ✓ 2026-04-24
- [x] **Phase 2: Pipeline + Cold Start + Curated Wardrobe** - Recommendation pipeline single entry, cold start refactored, mock data seeded, curated wardrobe model, A/B experiment ID ✓ 2026-04-24
- [x] **Phase 3: Navigation + Core Screens + Calendar** - 4-tab navigation, Today Screen with Yiyi proactive push, Discover Screen with curation space, simplified 7-day calendar ✓ 2026-04-24
- [x] **Phase 4: Yiyi Agent + Voice + Onboarding + Studio** - Agent state machine, interview outfit dialog, voice button, Edge-TTS, new 4-step onboarding, studio smart recommendation ✓ 2026-04-25
- [x] **Phase 5: E2E Integration + Competition Demo** - Full flow test, visual consistency, competition-specific demo path, tech depth showcase ✓ 2026-04-25

**Track B: Long-Term Build (Phases 6-10)**

- [ ] **Phase 6: Model Upgrade + Compliance + Security** - FashionSigLIP replacement + Chinese fine-tune, SASRec pipeline, compliance, security blockers, product contract frozen
- [ ] **Phase 7: Data Flywheel + Calendar Full + Advanced Rec** - Feedback loop, FashionSigLIP iteration, full calendar with AI auto-planning, style evolution visualization
- [ ] **Phase 8: Mini Program + Photo Search + Social** - WeChat mini program v1, photo-based item search, style DNA social matching
- [ ] **Phase 9: Monetization + Community + Sharing** - 3-tier membership, content products, share seed features, studio commission
- [ ] **Phase 10: Production + Launch + Competition** - Nginx/TLS/monitoring, app store listing, offline capability, competition materials submitted

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
   **Plans**: TBD

### Phase 2: Pipeline + Cold Start + Curated Wardrobe

**Goal**: Every recommendation flows through a single Orchestrator entry point, cold-start users get coherent results from onboarding data, mock products cover the matrix, curated wardrobe model replaces inventory model
**Depends on**: Phase 1
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, CUR-01, CUR-02
**Success Criteria** (what must be TRUE):

1. All recommendation requests go through Orchestrator -- no controller bypasses it
2. ColdStartService produces recommendations driven by bodyType + styleExpression + primaryScenarios (no gender bucket)
3. StyleQuiz results flow back into recommendation scoring weights
4. Every recommendation output includes items + outfit + explanation (why, alternative, nextAction, confidence)
5. When AI pipeline is unavailable, a weather+season+scene template still produces a visible outfit plan
6. Every recommendation carries an A/B experiment_id
7. Wardrobe model stores savedOutfits + wishlistedItems + purchasedItems (not ownedItems)
   **Plans**: 3 plans

Plans:

- [x] 02-01-PLAN.md -- Orchestrator sole entry point + cold start reads onboarding + quiz sync + A/B experiment (REC-01, REC-02, REC-03, REC-06)
- [x] 02-02-PLAN.md -- Curated wardrobe three-section model + preference-complementary bridge recommendations (CUR-01, CUR-02)
- [x] 02-03-PLAN.md -- Pipeline verification + output standardization + degraded templates + seed matrix (REC-04, REC-05)

### Phase 3: Navigation + Core Screens + Calendar

**Goal**: Users see a 4-tab decision-first navigation, Today Screen shows Yiyi's proactive push with voice button, Discover shows curation space, simplified 7-day calendar exists
**Depends on**: Phase 2
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, TOD-01, TOD-02, TOD-03, TOD-04, TOD-05, DIS-01, DIS-02, DIS-03, DIS-04, CAL-01, CAL-02
**Success Criteria** (what must be TRUE):

1. App shows exactly 4 tabs: Today / Discover / Stylist / Me (old 5-tab layout gone)
2. Today Screen displays: scene card (weather + Yiyi summary), today's outfits (Yiyi recommended + user saved), outfit collections by scene, voice button
3. Discover Screen shows recommendation feed + curation space (saved/wishlist/purchased tabs)
4. Old users do not crash on update (NAV_VERSION migration)
5. 7-day calendar view renders with weather + scene tags + outfit thumbnails
   **UI hint**: yes
   **Plans**: 3 plans

Plans:

- [x] 03-01-PLAN.md — Zustand store 去重: 删除 src/stores/ + clearAllStores 迁移 + 全部导入更新 (NAV-04)
- [x] 03-02-PLAN.md — 4-Tab 导航完善: Wardrobe/Favorites 从 Profile 迁移到 Discover + 导航类型更新 + Deep link 更新 (NAV-01, NAV-04, NAV-05)
- [x] 03-03-PLAN.md — 设计 Token 统一: borderRadius 调整 + 硬编码颜色替换 + WarmPrimaryColors 清理 + YiyiAvatar 一致性审计 (VIS-01, VIS-02, VIS-03, VIS-04)

### Phase 4: Yiyi Agent + Voice + Onboarding + Studio

**Goal**: Yiyi delivers structured agent conversations (interview outfit as showcase), voice button triggers STT+TTS, new 4-step onboarding ends with "let Yiyi dress you", studio smart recommendation triggers contextually
**Depends on**: Phase 3
**Requirements**: YIYI-01, YIYI-02, YIYI-03, YIYI-04, YIYI-05, YIYI-06, YIYI-07, VOI-01, VOI-02, VOI-03, WKS-01, WKS-02, WKS-03, WKS-04, ONB-01, ONB-02, ONB-03, ONB-04, ONB-05, RUL-01, RUL-02, RUL-03, ETH-01, ETH-02
**Success Criteria** (what must be TRUE):

1. Agent state machine processes: GREET→CONTEXT→SCENE/DIRECT→GENERATE→ACTION/REFINE→WRAP with proper fallbacks
2. Interview outfit dialog works end-to-end: "什么公司?→ 什么岗位?→ 预算?→3 套方案 → 试穿 → 保存"
3. Yiyi personality enforced: warm opinionated friend, no "亲~", no "根据算法分析"
4. Try-on triggered as BottomSheet within agent chat (no page navigation)
5. Voice button records → STT → sends to Yiyi → TTS plays response
6. 4-step onboarding ends with "让伊伊搭第一套" (3 outfit options, user picks one → saved to wardrobe)
7. Studio recommendation triggers on signals (luxury budget, 3 rejections, special events, "独一无二")
8. Fashion rules filtered by bodyType+occasion+colorSeason
9. Body-positive language enforced: describe clothes not body, try-on failure blames garment
   **UI hint**: yes
   **Plans**: 7 plans

Plans:

- [x] 04-01-PLAN.md — Python DialogEngine: 新状态(SCENE/DIRECT/CHAT) + 面试流程 + 伊伊人格 + FashionRuleLoader + StudioSignalDetector (YIYI-01~03, YIYI-05~07, RUL-01~03, WKS-01, WKS-03, ETH-01~02) ✓ 2026-04-24
- [x] 04-02-PLAN.md — NestJS Backend: DialogState DTO 同步 + Yiyi 系统提示词 + Python 转发 + Edge-TTS 端点 (YIYI-03, YIYI-05, VOI-03, WKS-04) ✓ 2026-04-24
- [x] 04-03-PLAN.md — Onboarding Steps 1-3: 场景选择 + 快速画像 + 风格表达 (ONB-01~03, ONB-05) ✓ 2026-04-24
- [x] 04-04-PLAN.md — Chat UI: TryOnBottomSheet + StudioRecommendCard + QuickReply 接入 (YIYI-04, YIYI-06, WKS-02, WKS-04) ✓ 2026-04-25
- [x] 04-05-PLAN.md — Voice: @react-native-voice/voice STT + Edge-TTS TTS + VoiceButton 接入 (VOI-01~03) ✓ 2026-04-25
- [x] 04-06-PLAN.md — Onboarding Step 4: "让伊伊搭第一套" 3 方案选择+保存衣橱 (ONB-04) ✓ 2026-04-25
- [x] 04-07-PLAN.md — E2E Wiring: 首页语音按钮接入 + 偏好记忆 + 面试流程验证 (YIYI-04, YIYI-05) ✓ 2026-04-25

### Phase 5: E2E Integration + Competition Demo

**Goal**: Complete user journey works end-to-end, visual consistency achieved, competition-specific demo path showcases "experience revolution → interview outfit → inclusivity" three-layer narrative
**Depends on**: Phase 4
**Requirements**: None new (integration, testing, polish, demo path)
**Success Criteria** (what must be TRUE):

1. New user can: register → 4-step onboarding → see Yiyi's proactive push on Today → chat with Yiyi → trigger try-on → save outfit → view in calendar — no crashes or blank screens
2. Competition demo path: "明天 12°C 面试推荐 3 套" → user says "不喜欢正式的" → AI adjusts → 6-layer funnel visualization → different profiles get different results
3. All design tokens consistent across Today/Discover/Stylist/Me/Onboarding
4. Loading states and empty states handled on all screens
5. Both backend and mobile compile with zero errors
   **UI hint**: yes
   **Plans**: 4 plans

Plans:

- [x] 05-01-PLAN.md — E2E Data Wiring: Today/Discover API + Orchestrator breakdown (D-01, D-02, D-03) ✓ 2026-04-25
- [x] 05-02-PLAN.md — Visual Consistency: Design tokens + three-state coverage (VIS) ✓ 2026-04-25
- [x] 05-03-PLAN.md — Competition Demo Path: Funnel + ProfileDebug + Pre-cache + Demo script ✓ 2026-04-25
- [x] 05-04-PLAN.md — Zero Errors + Verification: TS fixes + bug fixes + E2E checklist ✓ 2026-04-25

### Phase 6: Model Upgrade + Compliance + Security

**Goal**: FashionSigLIP replaces FashionCLIP, Chinese fine-tune completes, SASRec pipeline works, all legal/security blockers resolved
**Depends on**: Phase 5
**Requirements**: MOD-01, MOD-02, MOD-03, RAD-01, RAD-02, RAD-03, RAD-04, DAT-01, DAT-02, DAT-03, DAT-04, DAT-05, CMP-01, CMP-02, CMP-03, CMP-04, CMP-05, SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):

1. Marqo-FashionSigLIP replaces FashionCLIP in all vector operations, Recall@10 improves >=15% vs old model
2. Chinese fine-tune on 5000 Taobao items + DeepFashion Chinese subset completes successfully on AutoDL
3. SASRec trained on user behavior sequences, scoring weight increases with interaction count
4. 6-layer funnel pipeline executes L1-L4 hard filters then L5-L6 soft scoring
5. FashionSigLIP bias audit: 5 profiles with same scenario but different styleExpression produce visibly different results
6. Users provide separate consent for each sensitive data category
7. All API traffic TLS-terminated, no exposed ports, no plaintext API keys
8. Software copyright filed, trademark applications for "寻裳" and "伊伊" submitted
   **Plans**: TBD

### Phase 7: Data Flywheel + Calendar Full + Advanced Rec

**Goal**: Complete feedback loop from user behavior to model retraining, full calendar with AI auto-planning, style evolution visualization
**Depends on**: Phase 6
**Requirements**: FLY-01, FLY-02, FLY-03, FLY-04, CAL-03, CAL-04, CAL-05, MOD-04
**Success Criteria** (what must be TRUE):

1. User behavior pipeline collects: selection/skip/save/purchase with (profile, scene, weather, time) context
2. SASRec retraining runs monthly on accumulated behavior data
3. FashionSigLIP fine-tune runs monthly with new user interaction data
4. Weekly "outfit diary" auto-generated: satisfaction + style distribution + trend + evolution curve
5. Full calendar auto-generates 7-day plans based on weather forecast + calendar events + wardrobe
6. Coordination model (10M params) trained and produces compatibility scores
   **Plans**: TBD

### Phase 8: Mini Program + Photo Search + Social

**Goal**: WeChat mini program with core features live, photo-based item search as acquisition hook, style DNA social matching
**Depends on**: Phase 7
**Requirements**: MINI-01, MINI-02, PHO-01, PHO-02, SOC-01
**Success Criteria** (what must be TRUE):

1. WeChat mini program: Yiyi chat + try-on + share, accessible via QR code scan
2. Mini program share to Moments/Groups drives >10x conversion vs App download
3. Photo → FashionSigLIP encode → Qdrant search → 5 similar items with prices
4. "Find similar" flow naturally leads to "AI can dress you better" → registration
5. Style DNA matches users by FashionSigLIP vector cosine similarity
   **Plans**: TBD

### Phase 9: Monetization + Community + Sharing

**Goal**: Free tier limits enforced, content products purchasable, share seed features drive viral growth, studio commission operational
**Depends on**: Phase 8
**Requirements**: MON-01, MON-02, MON-03, MON-04, SOC-02
**Success Criteria** (what must be TRUE):

1. Free-tier users hit daily limits (5 AI chats, 3 try-ons, 20 wardrobe items) with upgrade prompts
2. One-time purchases: color report 9.9 yuan, body-type report, capsule wardrobe plan 19 yuan
3. Premium subscription 9.9 yuan/month: continuous outfit plan + deep wardrobe diagnosis + AI proactive push
4. Share images generated with QR codes for WeChat/Xiaohongshu
5. Studio referral commission 15-20% operational
   **UI hint**: yes
   **Plans**: TBD

### Phase 10: Production + Launch + Competition

**Goal**: Production deployment, app store listing, offline capability, competition materials submitted
**Depends on**: Phase 9
**Requirements**: PRD-01, PRD-02, PRD-03, PRD-04, PRD-05, CMP-06, CMP-07, CMP-08, CMP-09
**Success Criteria** (what must be TRUE):

1. Nginx + TLS + monitoring + alerting active
2. Offline mode: cached 50 recommendations + wardrobe + calendar browsable without network
3. Load test passes without degradation, security audit no CRITICAL findings
4. App listed on 2+ Chinese Android stores (Huawei, Xiaomi, OPPO, or Vivo)
5. Competition materials submitted: PPT + demo video + seed user data + advisor letter
   **Plans**: TBD

## Progress

**Execution Order:**
Phases execute sequentially: 1 → 2 → 3 → 4 → 5 (sprint) → 6 → 7 → 8 → 9 → 10 (long-term)

| Phase                                           | Plans Complete | Status      | Completed  |
| ----------------------------------------------- | -------------- | ----------- | ---------- |
| 1. Foundation + TS Cleanup + Visual Base        | 3/3            | Complete    | 2026-04-24 |
| 2. Pipeline + Cold Start + Curated Wardrobe     | 3/3            | Complete    | 2026-04-24 |
| 3. Navigation + Core Screens + Calendar         | 3/3            | Complete    | 2026-04-24 |
| 4. Yiyi Agent + Voice + Onboarding + Studio     | 7/7            | Complete    | 2026-04-25 |
| 5. E2E Integration + Competition Demo           | 4/4            | Complete    | 2026-04-25 |
| 6. Model Upgrade + Compliance + Security        | 0/?            | Not started | -          |
| 7. Data Flywheel + Calendar Full + Advanced Rec | 0/?            | Not started | -          |
| 8. Mini Program + Photo Search + Social         | 0/?            | Not started | -          |
| 9. Monetization + Community + Sharing           | 0/?            | Not started | -          |
| 10. Production + Launch + Competition           | 0/?            | Not started | -          |

---

_Roadmap re-initialized: 2026-04-22 from XUNO_FINAL_PLAN.md_
