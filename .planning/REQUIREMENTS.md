# Requirements: 寻裳 XunO

**Defined:** 2026-04-29
**Core Value:** 伊伊（AI 造型师）通过自然对话理解用户需求，精准推荐穿搭方案

## v1 Requirements

Requirements for ongoing development. Each maps to roadmap phases.

### Demo & E2E Integration (Phase 5)

- [x] **DEMO-01**: App completes 3 consecutive demo runs with zero crashes
- [x] **DEMO-02**: Each demo run completes within 150 seconds total time
- [x] **DEMO-03**: Preflight script verifies all 15 Docker services are healthy
- [x] **DEMO-04**: Demo warmup script pre-caches all AI recommendations
- [x] **DEMO-05**: Voice input reliably triggers Yiyi response with visual feedback
- [x] **DEMO-06**: GLM-4-Flash auto-fails over to Qwen within 5s timeout
- [x] **DEMO-07**: Offline demo mode displays pre-cached data when network unavailable
- [x] **DEMO-08**: Error boundaries prevent single-component crashes from killing the app
- [x] **DEMO-09**: Demo mode toggle enables demo data + disables real API calls
- [x] **DEMO-10**: Pre-recorded demo video available as Plan B fallback
- [x] **DEMO-11**: PPT screenshot walkthrough available as Plan C fallback
- [x] **DEMO-12**: ProfileDebugPanel switches between 10+ diverse profiles seamlessly
- [x] **DEMO-13**: RecommendationFunnel displays all 6 layers correctly

### Production & Legal (Phase 6)

- [x] **PROD-01**: Software copyright application filed with all required materials
- [x] **PROD-02**: Marqo-FashionSigLIP replaces FashionCLIP in recommendation pipeline
- [x] **PROD-03**: Diversity scoring layer ensures varied recommendations across profiles
- [x] **PROD-04**: Legal TOS and privacy policy documents finalized
- [x] **PROD-05**: Security audit findings from audit-output.json addressed
- [x] **PROD-06**: Production environment configuration separated from dev/staging
- [x] **PROD-07**: Rate limiting applied to try-on and recommendation endpoints

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Community Enhancement

- **COMM-01**: User can like/comment on community outfit posts
- **COMM-02**: User can follow other users

### E-commerce Enhancement

- **ECOM-01**: User can apply promo codes at checkout
- **ECOM-02**: User can view order history with status tracking
- **ECOM-03**: User can save payment methods for future purchases

### Platform Expansion

- **PLAT-01**: HarmonyOS version of mobile app
- **PLAT-02**: OAuth login (Google, Apple, WeChat)
- **PLAT-03**: AI-generated outfit design (user describes, AI creates)

## Out of Scope

| Feature                      | Reason                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| AR real-time try-on          | Development cost enormous, accuracy insufficient for fashion  |
| Live streaming shopping      | Infrastructure cost prohibitive, not core to AI styling value |
| Real-time chat between users | Moderation complexity, CSAM risk, not core to recommendations |
| Clothing rental marketplace  | Logistics complexity beyond current team capacity             |
| Video try-on (animated)      | Storage/bandwidth costs, defer to post-launch                 |

## Traceability

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| DEMO-01     | Phase 5 | Complete |
| DEMO-02     | Phase 5 | Complete |
| DEMO-03     | Phase 5 | Complete |
| DEMO-04     | Phase 5 | Complete |
| DEMO-05     | Phase 5 | Pending  |
| DEMO-06     | Phase 5 | Pending  |
| DEMO-07     | Phase 5 | Complete |
| DEMO-08     | Phase 5 | Complete |
| DEMO-09     | Phase 5 | Pending  |
| DEMO-10     | Phase 5 | Pending  |
| DEMO-11     | Phase 5 | Pending  |
| DEMO-12     | Phase 5 | Pending  |
| DEMO-13     | Phase 5 | Complete |
| PROD-01     | Phase 6 | ✓ Done   |
| PROD-02     | Phase 6 | ✓ Done   |
| PROD-03     | Phase 6 | ✓ Done   |
| PROD-04     | Phase 6 | ✓ Done   |
| PROD-05     | Phase 6 | ✓ Done   |
| PROD-06     | Phase 6 | ✓ Done   |
| PROD-07     | Phase 6 | ✓ Done   |

**Coverage:**

- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---

_Requirements defined: 2026-04-29_
_Last updated: 2026-04-29 after Phase 6 completion_
