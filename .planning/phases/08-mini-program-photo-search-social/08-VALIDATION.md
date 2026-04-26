---
phase: 8
slug: mini-program-photo-search-social
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                                    |
| ---------------------- | ------------------------------------------------------------------------ |
| **Framework**          | Jest 29.x (backend) + pytest 7.x (ML)                                    |
| **Config file**        | apps/backend/jest.config.ts / ml/api/conftest.py                         |
| **Quick run command**  | `pnpm --filter backend test -- --testPathPattern="search\|auth\|social"` |
| **Full suite command** | `pnpm --filter backend test && pytest ml/api/tests/`                     |
| **Estimated runtime**  | ~30 seconds                                                              |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter backend test -- --testPathPattern="<changed-module>"`
- **After every plan wave:** Run `pnpm --filter backend test && pytest ml/api/tests/`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Threat Ref | Secure Behavior                                  | Test Type   | Automated Command                                         | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ---------- | ------------------------------------------------ | ----------- | --------------------------------------------------------- | ----------- | ---------- |
| 08-01-01 | 01   | 1    | MINI-01     | T-08-01    | wechat-mini login validates code + rate limit    | unit        | `pnpm --filter backend test -- --testPathPattern="auth"`  | ❌ W0       | ⬜ pending |
| 08-01-02 | 01   | 1    | MINI-01     | —          | wechat-mini endpoint returns JWT                 | integration | `pnpm --filter backend test -- --testPathPattern="auth"`  | ❌ W0       | ⬜ pending |
| 08-02-01 | 02   | 1    | MINI-01     | —          | Taro project compiles + pages render             | build       | `cd apps/mini-program && pnpm build:weapp`                | ❌ W0       | ⬜ pending |
| 08-02-02 | 02   | 1    | MINI-01     | —          | chat page sends/receives dialog messages         | e2e         | manual (微信开发者工具)                                   | ❌ W0       | ⬜ pending |
| 08-03-01 | 03   | 2    | PHO-01      | T-08-02    | image upload validates file type + size          | unit        | `pytest ml/api/tests/test_vector_search.py -x`            | ❌ W0       | ⬜ pending |
| 08-03-02 | 03   | 2    | PHO-01      | —          | image embed → Qdrant search returns 5 results    | unit        | `pytest ml/api/tests/test_vector_search.py -x`            | ❌ W0       | ⬜ pending |
| 08-03-03 | 03   | 2    | PHO-02      | —          | search results page shows registration CTA       | manual      | manual verification                                       | ❌ W0       | ⬜ pending |
| 08-04-01 | 04   | 2    | SOC-01      | T-08-04    | social matching only exposes non-PII             | unit        | `pytest ml/api/tests/test_style_dna.py -x`                | ❌ W0       | ⬜ pending |
| 08-04-02 | 04   | 2    | SOC-01      | —          | style DNA vector aggregation + cosine top-K      | unit        | `pytest ml/api/tests/test_style_dna.py -x`                | ❌ W0       | ⬜ pending |
| 08-05-01 | 05   | 3    | MINI-02     | —          | useShareAppMessage + useShareTimeline configured | manual      | manual verification in mini program                       | ❌ W0       | ⬜ pending |
| 08-05-02 | 05   | 3    | MINI-02     | —          | share tracking params included                   | unit        | `pnpm --filter backend test -- --testPathPattern="share"` | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `ml/api/tests/test_vector_search.py` — stubs for PHO-01 image search endpoint
- [ ] `ml/api/tests/test_style_dna.py` — stubs for SOC-01 style DNA matching
- [ ] `apps/backend/src/domains/social/social.service.spec.ts` — covers SOC-01 social matching
- [ ] `apps/backend/src/domains/identity/auth/auth.controller.spec.ts` — extend for mini-program login
- [ ] Mini-program Jest config + test setup — Taro testing infrastructure

---

## Manual-Only Verifications

| Behavior                       | Requirement | Why Manual                                        | Test Instructions                                                        |
| ------------------------------ | ----------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| WeChat mini program login flow | MINI-01     | Requires real WeChat environment + jscode2session | Open mini program in WeChat DevTools → trigger login → verify JWT stored |
| Share to Moments/Groups        | MINI-02     | WeChat share API only works in real WeChat        | Share product → verify card appears in chat/Moments                      |
| Photo search end-to-end        | PHO-01      | Camera + image upload + ML pipeline               | Take photo → verify 5 similar items shown with prices                    |
| Registration CTA from search   | PHO-02      | Conversion flow verification                      | Search result → click CTA → verify redirect to registration              |
| Style DNA matching display     | SOC-01      | Social UI rendering                               | View matches → verify user cards + similarity scores                     |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
