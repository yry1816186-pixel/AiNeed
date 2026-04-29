# Research Summary

**Domain:** AI Fashion Recommendation Platform (Mobile) — 寻裳 XunO
**Synthesized:** 2026-04-29
**Confidence:** HIGH (existing codebase + comprehensive docs)

## Key Findings

### Stack

NestJS 11.x + React Native 0.76.8 (Expo 52) + Python 3.11+ FastAPI + PostgreSQL 16 + Redis 7 + MinIO + BullMQ + GLM-4-Flash (primary) / Qwen (fallback) / FashionCLIP→Marqo-FashionSigLIP (Phase 6 migration). pnpm monorepo with Turborepo. Locked dependencies: react-native-screens@4.4.0, reanimated@3.16.7.

### Architecture

3-tier: React Native mobile (18 features) → NestJS backend (8 domains + 5 shared modules) → Python AI Service Layer. Communication: REST for API calls, WebSocket for real-time notifications, BullMQ for async jobs. AI calls routed through backend proxy (never direct from mobile). DDD on backend, feature-first on mobile.

### Features — Built (Phase 1-4)

- Auth + 4-step onboarding + Profile management
- Today/Discover/Stylist/Me 4-tab navigation
- Conversational AI stylist (Yiyi) with state machine (SCENE/DIRECT/CHAT)
- Virtual try-on via GLM multi-modal API
- E-commerce (browse → cart → checkout → orders)
- Community, Wardrobe, Search, Notifications, Style Quiz
- Demo mode: ProfileDebugPanel + RecommendationFunnel

### Features — Remaining (Phase 5-6)

**Phase 5 (E2E + Demo):**

- 3-run demo rehearsal (zero crashes, ≤150s)
- Preflight/warmup automation (15 Docker services)
- Voice reliability + GLM fallback pipeline
- Offline resilience (pre-cached demo data)
- Error boundaries for all demo-critical components
- Demo fallback plan (pre-recording → PPT)

**Phase 6 (Copyright + Production):**

- Software copyright application (60-90 days)
- Marqo-FashionSigLIP migration (bias reduction)
- Diversity constraints on recommendations
- Legal/TOS documents
- Production security hardening

### Critical Pitfalls to Address

1. **AI API unreliability** → DemoPreCache + Qwen fallback + offline data
2. **RN crash cascade** → Error boundaries at all interaction points + 3-run rehearsal
3. **FashionCLIP bias** → Phase 6 FashionSigLIP migration
4. **Demo hardware failure** → Dual network + pre-recorded video + PPT backup
5. **Copyright timeline** → Start Phase 6 immediately, prepare docs early

### Dependency Order

Phase 5 depends on all Phase 1-4 features being stable. Phase 6 depends on Phase 5 demo proving the concept, then addressing production gaps. Both phases are relatively independent of each other beyond the Phase 5→Phase 6 sequencing.

---

_Research synthesized: 2026-04-29_
_Sources: STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md_
