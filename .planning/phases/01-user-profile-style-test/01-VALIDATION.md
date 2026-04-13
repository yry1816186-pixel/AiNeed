---
phase: 01
slug: user-profile-style-test
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-13
updated: 2026-04-14
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Task IDs match the 6-plan structure: P{plan}-{task}.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x |
| **Config file** | `apps/backend/jest.config.js` + `apps/mobile/jest.config.js` |
| **Quick run command** | `cd apps/backend && npx jest --passWithNoTests --changedSince=HEAD~1` |
| **Full suite command** | `cd apps/backend && npx jest --coverage && cd ../mobile && npx jest` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/backend && npx jest --passWithNoTests --changedSince=HEAD~1`
- **After every plan wave:** Run `cd apps/backend && npx jest --coverage`
- **Before `/gsd-verify`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

### Wave 1: Schema + DTO + Seed (Plan 01)

| Task ID | Plan.Task | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|-----------|-------------|------------|-----------------|-----------|-------------------|--------|
| P01-1 | 01.1 | PROF-05, PROF-10 | — | Prisma schema validates, migration succeeds | structural | `npx prisma validate` | pending |
| P01-2 | 01.2 | PROF-05 | — | PhoneLoginDto/PhoneRegisterDto/WechatLoginDto have class-validator decorators, gender is mandatory | structural | `npx tsc --noEmit` | pending |
| P01-3 | 01.3 | PROF-08 | — | Seed script populates quiz with 6 questions, 4-6 options each with colorTags | structural | `node prisma/seed-style-quiz.js && npx prisma db seed` | pending |

### Wave 2: Backend Core Services (Plan 02)

| Task ID | Plan.Task | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|-----------|-------------|------------|-----------------|-----------|-------------------|--------|
| P02-1 | 02.1 | PROF-05 | T-1-01 | SMS code uses timingSafeEqual, 1/min rate limit | unit | `npx jest sms.service.spec` | pending |
| P02-1 | 02.1 | PROF-05 | T-1-02 | WeChat OAuth token validated server-side | unit | `npx jest wechat.strategy.spec` | pending |
| P02-2 | 02.2 | PROF-03 | — | Photo quality scores bounded [0,100] | unit | `npx jest photo-quality-validator.service.spec` | pending |
| P02-2 | 02.2 | PROF-07 | — | Profile completeness calculated correctly | unit | `npx jest profile-completeness.service.spec` | pending |
| P02-2 | 02.2 | PROF-08 | — | Quiz progress auto-saved per question | unit | `npx jest quiz-progress.service.spec` | pending |
| P02-3 | 02.3 | PROF-09 | — | Color derivation output stable for same input | unit | `npx jest color-derivation.service.spec` | pending |
| P02-3 | 02.3 | PROF-04 | — | Share poster generates valid PNG (node-canvas only) | unit | `npx jest share-poster.service.spec` | pending |
| P02-3 | 02.3 | PROF-13 | — | Profile change emits event to subscribers | unit | `npx jest profile-event-emitter.service.spec` | pending |

### Wave 3: Backend API Integration (Plan 03)

| Task ID | Plan.Task | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|-----------|-------------|------------|-----------------|-----------|-------------------|--------|
| P03-1 | 03.1 | PROF-05, PROF-06 | T-1-01 | Phone register enforces mandatory gender | unit | `npx jest auth.service.spec` | pending |
| P03-2 | 03.2 | PROF-03, PROF-09 | — | Photo upload rejects low-quality images with 400 | integration | `npx jest photos.controller.spec` | pending |
| P03-3 | 03.3 | PROF-11, PROF-13 | — | Behavior auto-triggers profile update + event | integration | `npx jest profile.controller.spec` | pending |

### Wave 4: Mobile Infrastructure + State (Plan 04)

| Task ID | Plan.Task | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|-----------|-------------|-----------------|-----------|-------------------|--------|
| P04-1 | 04.1 | PROF-05, PROF-08 | API client methods exist | structural | `npx tsc --noEmit` | pending |
| P04-2 | 04.2 | PROF-02, PROF-12 | Components render without crash | structural | `npx tsc --noEmit` | pending |
| P04-3 | 04.3 | PROF-07, PROF-08 | Store state updates correctly | unit | `npx jest styleQuizStore.test` | pending |

### Wave 5: Mobile Pages (Plan 05)

| Task ID | Plan.Task | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|-----------|-------------|-----------------|-----------|-------------------|--------|
| P05-1 | 05.1 | PROF-06, PROF-07 | Onboarding 3-step flow, basic info mandatory | structural | `npx tsc --noEmit` | pending |
| P05-2 | 05.2 | PROF-01, PROF-04 | Analysis screens render data | structural | `npx tsc --noEmit` | pending |
| P05-3 | 05.3 | PROF-08, PROF-11 | Quiz screen + profile completeness | structural | `npx tsc --noEmit` | pending |

### Wave 6: Integration Testing (Plan 06)

| Task ID | Plan.Task | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|-----------|-------------|-----------------|-----------|-------------------|--------|
| P06-1 | 06.1 | PROF-01~13 | Full backend auth->profile->quiz->analysis->poster flow | integration | `npx jest integration/phase1-*.spec` | pending |
| P06-2 | 06.2 | PROF-01~13 | Mobile E2E register->onboarding->profile->quiz | e2e | `npx detox test` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Test Stubs

Plan 02 creates services AND their test files in the same run. The following test stubs are expected
to be created as part of Plan 02 task execution (not a separate Wave 0 plan):

- `apps/backend/src/modules/auth/services/sms.service.spec.ts`
- `apps/backend/src/modules/auth/strategies/wechat.strategy.spec.ts`
- `apps/backend/src/modules/photos/services/photo-quality-validator.service.spec.ts`
- `apps/backend/src/modules/profile/services/profile-completeness.service.spec.ts`
- `apps/backend/src/modules/style-quiz/services/quiz-progress.service.spec.ts`
- `apps/backend/src/modules/style-quiz/services/color-derivation.service.spec.ts`
- `apps/backend/src/modules/profile/services/share-poster.service.spec.ts`
- `apps/backend/src/modules/profile/services/profile-event-emitter.service.spec.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WeChat login button renders in LoginScreen | PROF-05 | Requires WeChat SDK in emulator | Open LoginScreen, verify button visible |
| Photo guide overlay shows body outline | PROF-02 | Requires camera preview | Open photo upload in camera mode |
| Share poster visual layout | PROF-04 | Visual verification | Generate poster, verify layout |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Test stubs created alongside services in Plan 02
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] Task IDs match actual 6-plan structure (P01 through P06)

**Approval:** pending
