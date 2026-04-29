# Roadmap: 寻裳 XunO

**Created:** 2026-04-29
**Phases:** 6 (4 complete, 2 remaining)
**Granularity:** Fine

## Phase Overview

| #   | Phase                  | Goal                                   | Requirements           | Status     |
| --- | ---------------------- | -------------------------------------- | ---------------------- | ---------- |
| 1   | Foundation             | User auth + basic app shell            | AUTH, NAV              | ✓ Complete |
| 2   | Onboarding             | 4-step user profile setup              | PROF, QUIZ             | ✓ Complete |
| 3   | Core AI                | Yiyi stylist + try-on + voice          | STYL, TRYN, VOIC       | ✓ Complete |
| 4   | Commerce + Discovery   | Shopping, community, wardrobe          | COMM, DISC, WARD, CART | ✓ Complete |
| 5   | E2E Integration + Demo | Competition-ready demo with resilience | DEMO-01~DEMO-13        | ✓ Complete |
| 6   | Production + Legal     | Copyright, diversity, hardening        | PROD-01~PROD-07        | ○ Pending  |

## Phase Details

### Phase 1: Foundation ✓

**Goal:** User authentication, navigation shell, and basic project infrastructure
**Status:** Complete

### Phase 2: Onboarding ✓

**Goal:** 4-step guided registration — scene selection → profile → style quiz → first outfit
**Status:** Complete

### Phase 3: Core AI ✓

**Goal:** Yiyi conversational stylist, GLM virtual try-on, voice input/response
**Status:** Complete

### Phase 4: Commerce + Discovery ✓

**Goal:** Product browsing, shopping cart, payments, community, wardrobe management
**Status:** Complete

---

### Phase 5: E2E Integration + Competition Demo

**Goal:** Production-quality demo with 3-run stability, fallback resilience, and full E2E integration
**Requirements:** DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05, DEMO-06, DEMO-07, DEMO-08, DEMO-09, DEMO-10, DEMO-11, DEMO-12, DEMO-13

**Success criteria:**

1. App completes 3 consecutive full demo runs with zero crashes and total time ≤150s each
2. Preflight script passes all 15 Docker service health checks within 30s
3. Voice input → Yiyi response roundtrip <8s with visual feedback
4. Error boundaries prevent crash propagation from any single component failure
5. Demo fallback chain operational: live → pre-cached → pre-recorded → PPT

**Canonical refs:**

- `docs/demo-script.md` — Competition demo flow and timing
- `docs/DEMO-SCRIPT-TEST-PLAN.md` — 3-run rehearsal test plan
- `docs/DEMO-CHECKLIST.md` — Pre-demo verification checklist

**UI hint:** no

**Depends on:** Phase 1, 2, 3, 4

---

### Phase 6: Production + Legal

**Goal:** Software copyright, ML model diversity improvements, production security hardening
**Requirements:** PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, PROD-06, PROD-07
**Plans:** 3 plans

Plans:

- [x] 06-01-PLAN.md — FashionSigLIP cleanup, diversity scorer, 10-profile bias audit
- [x] 06-02-PLAN.md — Copyright materials + legal document finalization
- [x] 06-03-PLAN.md — Security verification + production hardening + rate limiting
- [x] 06-04-PLAN.md — CI/CD pipeline verification + post-deploy smoke tests + rollback docs
- [x] 06-05-PLAN.md — Database backup/restore scripts + disaster recovery runbook
- [x] 06-06-PLAN.md — Observability stack verification + alert rules + monitoring runbook
- [x] 06-07-PLAN.md — k6 load testing + capacity planning + auto-scale triggers
- [x] 06-08-PLAN.md — OpenAPI spec completion + Swagger UI + API changelog
- [ ] 06-09-PLAN.md — Migration script + deploy rollback + deployment checklist

**Success criteria:**

1. Software copyright application filed with complete materials within 30 days
2. Marqo-FashionSigLIP produces diverse recommendations (score >0.8 across 10 profile types)
3. All security audit HIGH findings addressed (see `audit-output.json`)
4. Production environment fully separated with rate limiting on AI endpoints
5. Legal documents (TOS, privacy policy, data handling) finalized and accessible

**Canonical refs:**

- `docs/software-copyright/` — Copyright application materials
- `audit-output.json` — Security audit findings
- `docs/LEGAL/` — Legal document drafts
- `SECURITY_DIFF_EVIDENCE.txt` — Security fix evidence

**UI hint:** no

**Depends on:** Phase 5

---

## Requirement Coverage

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| DEMO-01     | Phase 5 | Complete |
| DEMO-02     | Phase 5 | Complete |
| DEMO-03     | Phase 5 | Complete |
| DEMO-04     | Phase 5 | Complete |
| DEMO-05     | Phase 5 | Complete |
| DEMO-06     | Phase 5 | Complete |
| DEMO-07     | Phase 5 | Complete |
| DEMO-08     | Phase 5 | Complete |
| DEMO-09     | Phase 5 | Complete |
| DEMO-10     | Phase 5 | Complete |
| DEMO-11     | Phase 5 | Complete |
| DEMO-12     | Phase 5 | Complete |
| DEMO-13     | Phase 5 | Complete |
| PROD-01     | Phase 6 | Pending  |
| PROD-02     | Phase 6 | Pending  |
| PROD-03     | Phase 6 | Pending  |
| PROD-04     | Phase 6 | Pending  |
| PROD-05     | Phase 6 | Pending  |
| PROD-06     | Phase 6 | Pending  |
| PROD-07     | Phase 6 | Pending  |

**Coverage:**

- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---

_Roadmap created: 2026-04-29_
