# Roadmap: XUNO AI Fashion Decision Platform

## Overview

Two-track execution: a 48-hour sprint (Phases 1-5) to deliver a demo-ready decision-first app, followed by a long-term build-out (Phases 6-10) spanning 13-19 weeks to reach production launch. The sprint phases follow the fusion plan timing exactly -- each delivers a coherent, testable capability slice. Long-term phases follow strict dependency chains: compliance before real data, data before AI tuning, AI quality before monetization, monetization before launch.

## Phases

**Phase Numbering:**

- Integer phases (1-10): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

**Track A: 48-Hour Sprint (Phases 1-5)**

- [ ] **Phase 1: Foundation + TS Cleanup** - Zero compile errors, data schema enriched, gender demoted
- [ ] **Phase 2: Pipeline + Cold Start** - Recommendation pipeline single entry, cold start refactored, mock data seeded
- [ ] **Phase 3: Navigation + Core Screens** - 4-tab navigation, Today Screen, Discover Screen
- [ ] **Phase 4: Stylist + Onboarding** - AI Stylist single-screen, 4-step onboarding, fashion rules fixed
- [ ] **Phase 5: E2E Integration + Polish** - Full flow test, visual consistency, demo ready

**Track B: Long-Term Build (Phases 6-10)**

- [ ] **Phase 6: Compliance + Security + Contract Freeze** - PIPL consent, security blockers, product contract frozen
- [ ] **Phase 7: Data Pipeline + FashionCLIP Embeddings** - Real product sync, batch embedding pipeline, color standardization
- [ ] **Phase 8: Recommendation Advanced + AI Tuning** - SASRec pipeline, 6-layer funnel, FashionCLIP bias audit, fashion rules completion
- [ ] **Phase 9: Monetization + Community + Sharing** - 3-tier membership, content products, share seed features
- [ ] **Phase 10: Production + Launch** - Nginx/TLS/monitoring, app store submission, performance testing

## Phase Details

### Phase 1: Foundation + TS Cleanup

**Goal**: The app compiles with zero TypeScript errors and the data schema supports all downstream recommendation and profiling features
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, GND-01, GND-02, GND-03, GND-04, GND-05
**Success Criteria** (what must be TRUE):

1. `tsc --noEmit` returns zero errors across the entire monorepo (backend + mobile)
2. ClothingItem Prisma model includes material, season, gender(optional), source, and DataSource enum fields
3. RecommendationBatch and RecommendationImpression tables exist in the database schema
4. UserBehavior is unified into a single UserBehaviorEvent model
5. gender field is @IsOptional in auth DTO, and onboardingStore requires primaryScenarios/ageBand/styleExpression instead of gender
   **Plans**: TBD

### Phase 2: Pipeline + Cold Start

**Goal**: Every recommendation flows through a single Orchestrator entry point, cold-start users get coherent results from onboarding data, and mock products cover the recommendation matrix
**Depends on**: Phase 1
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05
**Success Criteria** (what must be TRUE):

1. All recommendation requests go through Orchestrator -- no controller bypasses it
2. ColdStartService produces recommendations driven by bodyType + styleExpression + primaryScenarios (no gender bucket)
3. StyleQuiz results flow back into recommendation scoring weights
4. Every recommendation output includes items + outfit + explanation (why, alternative, nextAction, confidence)
5. When AI pipeline is unavailable, a weather+season+scene template still produces a visible outfit plan
   **Plans**: TBD

### Phase 3: Navigation + Core Screens

**Goal**: Users see a 4-tab decision-first navigation and can interact with Today and Discover screens that surface recommendations
**Depends on**: Phase 2
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, TOD-01, TOD-02, TOD-03, TOD-04, DIS-01, DIS-02, DIS-03, DIS-04
**Success Criteria** (what must be TRUE):

1. App shows exactly 4 tabs: Today / Discover / Stylist / Me (old 5-tab layout gone)
2. Today Screen displays a scene card (weather + scene + AI summary), 2-3 outfit plans, a candidate fit-check area, and a degradation fallback
3. Discover Screen shows recommendation feed for new users and wardrobe management + gap recommendations for users with 5+ items
4. Wardrobe is accessible from Discover Stack, not buried in Profile
5. Old users do not crash on update (NAV_VERSION migration handles state transition)
   **UI hint**: yes
   **Plans**: TBD

### Phase 4: Stylist + Onboarding

**Goal**: Users complete a 4-step gender-optional onboarding that immediately feeds recommendations, and the AI Stylist delivers a single-screen decision experience with embedded try-on
**Depends on**: Phase 3
**Requirements**: STY-01, STY-02, STY-03, STY-04, STY-05, ONB-01, ONB-02, ONB-03, ONB-04, ONB-05, RUL-01, RUL-02, RUL-03
**Success Criteria** (what must be TRUE):

1. New users complete a 4-step onboarding (scene selection -> quick profile with garmentPreference -> style expression + image seeds -> optional photo) with no gender field
2. Onboarding data flows into ColdStartService immediately -- first recommendation reflects onboarding choices
3. AI Stylist is a single screen: conversation with outfit plans + try-on triggered as a BottomSheet within the chat (no page navigation)
4. Stylist responses include structured output (outfit + reason + alternative + next action) and fashion rules are filtered by bodyType+occasion+colorSeason
5. above_30 temperature zone tips are differentiated by occasion, and 0_10 interview layer_details show proper layering
   **UI hint**: yes
   **Plans**: TBD

### Phase 5: E2E Integration + Polish

**Goal**: The complete user journey (register -> onboarding -> Today recommendation -> stylist -> try-on -> save/cart) works end-to-end and looks coherent for demo
**Depends on**: Phase 4
**Requirements**: None (integration, testing, and polish -- all requirements delivered in Phases 1-4)
**Success Criteria** (what must be TRUE):

1. A new user can register, complete onboarding, see personalized recommendations on Today, chat with Stylist, trigger try-on, and save an item -- without hitting a crash or blank screen
2. All design tokens are consistent (no stray gradient/spacing variations across key screens)
3. Loading states and empty states are handled on Today, Discover, Stylist, and Onboarding screens
4. Both backend and mobile compile with zero errors after all changes
   **UI hint**: yes
   **Plans**: TBD

### Phase 6: Compliance + Security + Contract Freeze

**Goal**: All legal and security blockers are resolved, product contracts are frozen, and the system is safe for real user data
**Depends on**: Phase 5
**Requirements**: CMP-01, CMP-02, CMP-03, CMP-04, CMP-05, SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):

1. Users provide separate consent for each sensitive data category (body measurements, photos, body fat) -- no bundled consent
2. All API traffic is TLS-terminated; no ports are exposed to public internet; no API keys in plaintext or client bundles
3. Software copyright application is filed (60-90 day critical path started)
4. 4-tab navigation definition, 6-layer profile model, product attribute taxonomy, and RecommendationOutput interface are frozen and documented
   **Plans**: TBD

### Phase 7: Data Pipeline + FashionCLIP Embeddings

**Goal**: Real product data replaces mock data and every product has a pre-computed FashionCLIP embedding ready for vector search
**Depends on**: Phase 6
**Requirements**: DAT-01, DAT-02, DAT-03, DAT-04, DAT-05
**Success Criteria** (what must be TRUE):

1. Product catalog is synced daily from Taobao Ke + JD Alliance APIs with incremental updates every 2 hours
2. Every ingested product has a 512-dim FashionCLIP embedding stored in Qdrant before it appears in recommendations
3. Colors are standardized across all product sources (no "navy blue" vs "深蓝" discrepancy)
4. Sync health is monitorable (sync logs, error counts, last successful sync timestamp)
   **Plans**: TBD

### Phase 8: Recommendation Advanced + AI Tuning

**Goal**: Recommendations use behavioral signals (SASRec), visual similarity (FashionCLIP with diversity constraints), and complete fashion rules -- quality measurable by CTR
**Depends on**: Phase 7
**Requirements**: RAD-01, RAD-02, RAD-03, RAD-04
**Success Criteria** (what must be TRUE):

1. SASRec model is trained on user behavior sequences and contributes scoring weight that increases with interaction count
2. The 6-layer funnel pipeline executes L1-L4 hard filters then L5-L6 soft scoring on every recommendation request
3. FashionCLIP retrieval includes diversity constraints -- 5 profiles with same scenario/budget but different styleExpression produce visibly different results
4. Recommendation explanations combine rule-engine evidence with LLM-polished language
   **Plans**: TBD

### Phase 9: Monetization + Community + Sharing

**Goal**: Users can upgrade to paid tiers for tangible content products, share outfit plans and reports to social platforms, and see community inspiration woven into product surfaces
**Depends on**: Phase 8
**Requirements**: MON-01, MON-02, MON-03, MON-04
**Success Criteria** (what must be TRUE):

1. Free-tier users hit daily limits (5 AI chats, 3 try-ons, 20 wardrobe items) and see upgrade prompts tied to result outcomes
2. Paid users can generate and save color-season reports, body-type reports, and capsule wardrobe plans as shareable content products
3. Outfit plans, try-on results, and membership reports can be exported as share images with QR codes for WeChat/Xiaohongshu
4. Community content appears as "inspiration evidence" in Today Screen bottom section and product detail pages
   **UI hint**: yes
   **Plans**: TBD

### Phase 10: Production + Launch

**Goal**: The platform is deployed behind Nginx with TLS/monitoring, passes performance and security audits, and is listed on Chinese Android app stores
**Depends on**: Phase 9
**Requirements**: PRD-01, PRD-02, PRD-03, PRD-04, PRD-05
**Success Criteria** (what must be TRUE):

1. Nginx reverse proxy with Let's Encrypt TLS terminates all traffic; monitoring and alerting are active
2. On-device inference works for CIELAB color analysis and rule engine scoring (server fallback available)
3. System handles load test targets without degradation; security audit passes with no CRITICAL findings
4. App is listed on at least 2 Chinese Android app stores (Huawei, Xiaomi, OPPO, or Vivo)
   **Plans**: TBD

## Progress

**Execution Order:**
Phases execute sequentially: 1 -> 2 -> 3 -> 4 -> 5 (sprint) -> 6 -> 7 -> 8 -> 9 -> 10 (long-term)

| Phase                                      | Plans Complete | Status      | Completed |
| ------------------------------------------ | -------------- | ----------- | --------- |
| 1. Foundation + TS Cleanup                 | 0/?            | Not started | -         |
| 2. Pipeline + Cold Start                   | 0/?            | Not started | -         |
| 3. Navigation + Core Screens               | 0/?            | Not started | -         |
| 4. Stylist + Onboarding                    | 0/?            | Not started | -         |
| 5. E2E Integration + Polish                | 0/?            | Not started | -         |
| 6. Compliance + Security + Contract Freeze | 0/?            | Not started | -         |
| 7. Data Pipeline + FashionCLIP Embeddings  | 0/?            | Not started | -         |
| 8. Recommendation Advanced + AI Tuning     | 0/?            | Not started | -         |
| 9. Monetization + Community + Sharing      | 0/?            | Not started | -         |
| 10. Production + Launch                    | 0/?            | Not started | -         |
