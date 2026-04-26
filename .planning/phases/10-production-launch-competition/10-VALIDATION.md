---
phase: 10
slug: production-launch-competition
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-26
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property                        | Value                                                                    |
| ------------------------------- | ------------------------------------------------------------------------ |
| **Framework (Backend)**         | Jest 29.7 + @nestjs/testing 11.x                                         |
| **Framework (Mobile)**          | Jest (babel-jest, RN preset)                                             |
| **Framework (ML)**              | pytest (asyncio_mode=auto)                                               |
| **Config file (Backend)**       | apps/backend/jest.config.js                                              |
| **Config file (Mobile)**        | apps/mobile/jest.config.js                                               |
| **Quick run command (Backend)** | `cd apps/backend && pnpm test -- --testPathPattern="<pattern>"`          |
| **Quick run command (Mobile)**  | `cd apps/mobile && pnpm test -- --testPathPattern="<pattern>"`           |
| **Full suite command**          | `pnpm test` (all workspaces)                                             |
| **Load test command**           | `k6 run tests/load/basic.js` or `npx artillery run tests/load/basic.yml` |
| **Security audit command**      | `pnpm audit --audit-level=critical && pip audit`                         |
| **Estimated runtime**           | ~60 seconds (unit), ~3 minutes (load)                                    |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- --testPathPattern="<changed-area>"`
- **After every plan wave:** Run `pnpm test` (all workspaces)
- **Before `/gsd-verify-work`:** Full suite green + Docker health checks + APK build success
- **Max feedback latency:** 60 seconds (unit), 180 seconds (load)

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Threat Ref | Secure Behavior                  | Test Type   | Automated Command                                             | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ---------- | -------------------------------- | ----------- | ------------------------------------------------------------- | ----------- | ---------- |
| 10-01-01 | 01   | 1    | PRD-01      | T-10-01    | Nginx TLS + rate limiting active | integration | `docker compose -f docker-compose.production.yml ps`          | ❌ W0       | ⬜ pending |
| 10-01-02 | 01   | 1    | PRD-01      | T-10-02    | Memory limits < 8G total         | smoke       | `docker stats --no-stream`                                    | ❌ W0       | ⬜ pending |
| 10-02-01 | 02   | 1    | PRD-03      | —          | WatermelonDB schema valid        | unit        | `cd apps/mobile && pnpm test -- --testPathPattern="database"` | ❌ W0       | ⬜ pending |
| 10-02-02 | 02   | 1    | PRD-03      | —          | Offline sync engine works        | unit        | `cd apps/mobile && pnpm test -- --testPathPattern="sync"`     | ❌ W0       | ⬜ pending |
| 10-02-03 | 02   | 1    | PRD-03      | —          | Network status detection         | unit        | `cd apps/mobile && pnpm test -- --testPathPattern="netinfo"`  | ❌ W0       | ⬜ pending |
| 10-03-01 | 03   | 1    | PRD-05      | —          | APK build success                | smoke       | `cd apps/mobile/android && ./gradlew assembleRelease`         | N/A         | ⬜ pending |
| 10-04-01 | 04   | 3    | PRD-04      | T-10-03    | Load test P95 < 2s               | integration | `k6 run tests/load/basic.js`                                  | ❌ W0       | ⬜ pending |
| 10-04-02 | 04   | 3    | PRD-04      | T-10-04    | No CRITICAL vulnerabilities      | manual      | `pnpm audit --audit-level=critical && pip audit`              | N/A         | ⬜ pending |
| 10-05-01 | 05   | 1    | CMP-08      | —          | Seed data generation             | unit        | `node scripts/generate-seed-data.test.js`                     | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `apps/mobile/src/database/__tests__/schema.test.ts` — WatermelonDB schema validation stubs
- [ ] `apps/mobile/src/database/__tests__/syncEngine.test.ts` — sync engine test stubs
- [ ] `apps/mobile/src/hooks/__tests__/useNetworkStatus.test.ts` — netinfo test stubs
- [ ] `tests/load/basic.js` — k6 load test script
- [ ] `scripts/generate-seed-data.test.js` — seed data generation test
- [ ] WatermelonDB install: `cd apps/mobile && pnpm add @nozbe/watermelondb`
- [ ] Load test tool: `pnpm add -D artillery` (or install k6 via choco)

---

## Manual-Only Verifications

| Behavior                        | Requirement | Why Manual                                | Test Instructions                               |
| ------------------------------- | ----------- | ----------------------------------------- | ----------------------------------------------- |
| Android store listing visible   | PRD-05      | External platform, manual submission      | Search for "寻裳" on Xiaomi/Huawei store        |
| ICP filing active               | PRD-01      | Government process, external verification | Visit beian.miit.gov.cn with domain             |
| Competition materials submitted | CMP-06~09   | External platform, human review           | Verify all files uploaded to competition portal |
| Demo video plays correctly      | CMP-07      | Visual/auditory quality check             | Play video end-to-end, verify audio sync        |
| PPT narrative coherent          | CMP-06      | Content quality, human judgment           | Review 15-page PPT for three-layer narrative    |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (unit), < 180s (load)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
