# Demo Script Test Plan -- Execution Record

> **Purpose**: Structured test plan for 3-run demo rehearsal, based on `docs/demo-script.md` > **Target**: 3 consecutive zero-crash runs, total time <= 2:30 per run
> **When**: After all Docker services healthy (run `bash scripts/demo-preflight.sh` first)

---

## Pre-Run Setup

Before each run, confirm:

1. **Docker services**: `docker compose ps` shows all healthy
2. **Demo warmup**: `bash scripts/demo-warmup.sh` completed with all PASS
3. **E2E pre-run gate**: `bash scripts/demo-e2e-run.sh` pre-run section passes (preflight + warmup + pre-cache status)
4. **App installed**: Latest build installed on device/emulator
5. **Demo mode**: Settings -> Developer options -> Demo mode ON
6. **adb logcat running**: `adb logcat | grep -E "FATAL|ReactNative|crash" > crash-log-run[N].txt`

### Automated E2E Runner (新增)

Plan 05-05 introduces `scripts/demo-e2e-run.sh` — an automated E2E smoke test runner:

- **Pre-run gate**: demo-preflight.sh → demo-warmup.sh → pre-cache status (exits 2/3 on failure)
- **12 automated checks**: 4 navigation smoke + 5 AI pipeline smoke + 3 data integrity
- **Result logging**: Appends timestamped results to `demo-e2e-run-log.txt`
- **Exit codes**: 0 = all pass, 1 = FAIL present, 2 = preflight failed, 3 = warmup failed

**Run after warmup before manual demo flow:**

```bash
bash scripts/demo-e2e-run.sh
```

---

## Timing Breakdown (Code-Analyzed Estimates)

Based on code analysis of timeout values, API call chains, and animation durations:

| Segment                                     | Flow Step                                     | Estimated Time | Code Reference                      |
| ------------------------------------------- | --------------------------------------------- | -------------- | ----------------------------------- |
| Preparation                                 | Demo mode ON + pre-cache                      | 5-10s          | demoPreCache auto-refresh on enable |
| Layer 1: Experience Revolution (30s target) |                                               |                |                                     |
|                                             | Open app -> Today Tab                         | 2-3s           | Cold start, React Native bundle     |
|                                             | Yiyi push notification visible                | 0s             | Already rendered from pre-cache     |
|                                             | Voice button -> "help me dress for interview" | 5-8s           | STT 3-5s + send 1s                  |
|                                             | Yiyi real-time response                       | 5-10s          | AI API + TTS precache lookup        |
| Layer 2: Interview Agent (60s target)       |                                               |                |                                     |
|                                             | Navigate to Stylist Tab                       | 1s             | Tab switch animation                |
|                                             | "What company?" -> "Internet company"         | 3-5s           | Dialog state SCENE->CONTEXT         |
|                                             | "What position?" -> "Product manager"         | 3-5s           | Dialog state CONTEXT->GENERATE      |
|                                             | "Budget?" -> "Under 1000"                     | 3-5s           | Dialog state GENERATE->ACTION       |
|                                             | Show 3 outfits                                | 3-8s           | Outfit card rendering               |
|                                             | Tap try-on                                    | 5-10s          | TryOnBottomSheet snap 70%, API call |
|                                             | "Don't like formal" -> adjust                 | 5-10s          | Preference feedback loop            |
| Layer 3: Inclusivity (60s target)           |                                               |                |                                     |
|                                             | Debug FAB -> ProfileDebugPanel                | 2s             | FAB tap animation                   |
|                                             | Switch to "professional" profile              | 3s             | Profile apply + refetch             |
|                                             | Observe recommendation change                 | 3-5s           | API re-call                         |
|                                             | Switch to "creative" profile                  | 3s             | Profile apply + refetch             |
|                                             | Show RecommendationFunnel 6 layers            | 3-5s           | Animated funnel rendering           |
| Wrap-up (30s target)                        |                                               |                |                                     |
|                                             | Return to Today Tab                           | 1s             | Tab switch                          |
|                                             | Full journey narration                        | 15-20s         | Verbal, no app action               |
|                                             | **TOTAL ESTIMATED**                           | **~110-150s**  | **Target: <=150s**                  |

---

## Run Record Template

### Run 1

**Date**: **\*\***\_\_\_**\*\***
**Tester**: **\*\***\_\_\_**\*\***
**Device**: **\*\***\_\_\_**\*\***

| Time | Step | Action                         | Result                | Time Spent | Notes       |
| ---- | ---- | ------------------------------ | --------------------- | ---------- | ----------- |
| 0:00 | P1   | Open app -> Today Tab          | PASS / FAIL / CRASH   | \_\_s      |             |
| 0:00 | P2   | Yiyi push visible              | PASS / FAIL           | \_\_s      |             |
| 0:00 | P3   | Voice -> "interview outfit"    | PASS / FAIL / CRASH   | \_\_s      |             |
| 0:00 | P4   | Yiyi response                  | PASS / FAIL / TIMEOUT | \_\_s      |             |
| 0:00 | L1.1 | Navigate Stylist Tab           | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.2 | "What company?" -> answer      | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.3 | "What position?" -> answer     | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.4 | "Budget?" -> answer            | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.5 | 3 outfit plans shown           | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.6 | Try-on triggered               | PASS / FAIL / CRASH   | \_\_s      |             |
| 0:00 | L1.7 | "Too formal" -> adjust         | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.1 | Debug FAB -> ProfileDebugPanel | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.2 | Switch "professional" profile  | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.3 | Recommendation change visible  | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.4 | Switch "creative" profile      | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.5 | RecommendationFunnel 6 layers  | PASS / FAIL           | \_\_s      |             |
| 0:00 | W1   | Return Today Tab               | PASS / FAIL           | \_\_s      |             |
| 0:00 | W2   | Full journey narration         | PASS                  | \_\_s      | Verbal only |

**Run 1 Summary**:

- Total time: **:**
- Crashes: \_\_
- Failures: \_\_
- Result: PASS / FAIL

**Crash details** (if any):

```
[paste crash log here]
```

---

### Run 2

**Date**: **\*\***\_\_\_**\*\***
**Tester**: **\*\***\_\_\_**\*\***

| Time | Step | Action                         | Result                | Time Spent | Notes       |
| ---- | ---- | ------------------------------ | --------------------- | ---------- | ----------- |
| 0:00 | P1   | Open app -> Today Tab          | PASS / FAIL / CRASH   | \_\_s      |             |
| 0:00 | P2   | Yiyi push visible              | PASS / FAIL           | \_\_s      |             |
| 0:00 | P3   | Voice -> "interview outfit"    | PASS / FAIL / CRASH   | \_\_s      |             |
| 0:00 | P4   | Yiyi response                  | PASS / FAIL / TIMEOUT | \_\_s      |             |
| 0:00 | L1.1 | Navigate Stylist Tab           | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.2 | "What company?" -> answer      | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.3 | "What position?" -> answer     | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.4 | "Budget?" -> answer            | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.5 | 3 outfit plans shown           | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.6 | Try-on triggered               | PASS / FAIL / CRASH   | \_\_s      |             |
| 0:00 | L1.7 | "Too formal" -> adjust         | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.1 | Debug FAB -> ProfileDebugPanel | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.2 | Switch "professional" profile  | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.3 | Recommendation change visible  | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.4 | Switch "creative" profile      | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.5 | RecommendationFunnel 6 layers  | PASS / FAIL           | \_\_s      |             |
| 0:00 | W1   | Return Today Tab               | PASS / FAIL           | \_\_s      |             |
| 0:00 | W2   | Full journey narration         | PASS                  | \_\_s      | Verbal only |

**Run 2 Summary**:

- Total time: **:**
- Crashes: \_\_
- Failures: \_\_
- Result: PASS / FAIL

**Crash details** (if any):

```
[paste crash log here]
```

---

### Run 3

**Date**: **\*\***\_\_\_**\*\***
**Tester**: **\*\***\_\_\_**\*\***

| Time | Step | Action                         | Result                | Time Spent | Notes       |
| ---- | ---- | ------------------------------ | --------------------- | ---------- | ----------- |
| 0:00 | P1   | Open app -> Today Tab          | PASS / FAIL / CRASH   | \_\_s      |             |
| 0:00 | P2   | Yiyi push visible              | PASS / FAIL           | \_\_s      |             |
| 0:00 | P3   | Voice -> "interview outfit"    | PASS / FAIL / CRASH   | \_\_s      |             |
| 0:00 | P4   | Yiyi response                  | PASS / FAIL / TIMEOUT | \_\_s      |             |
| 0:00 | L1.1 | Navigate Stylist Tab           | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.2 | "What company?" -> answer      | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.3 | "What position?" -> answer     | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.4 | "Budget?" -> answer            | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.5 | 3 outfit plans shown           | PASS / FAIL           | \_\_s      |             |
| 0:00 | L1.6 | Try-on triggered               | PASS / FAIL / CRASH   | \_\_s      |             |
| 0:00 | L1.7 | "Too formal" -> adjust         | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.1 | Debug FAB -> ProfileDebugPanel | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.2 | Switch "professional" profile  | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.3 | Recommendation change visible  | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.4 | Switch "creative" profile      | PASS / FAIL           | \_\_s      |             |
| 0:00 | L2.5 | RecommendationFunnel 6 layers  | PASS / FAIL           | \_\_s      |             |
| 0:00 | W1   | Return Today Tab               | PASS / FAIL           | \_\_s      |             |
| 0:00 | W2   | Full journey narration         | PASS                  | \_\_s      | Verbal only |

**Run 3 Summary**:

- Total time: **:**
- Crashes: \_\_
- Failures: \_\_
- Result: PASS / FAIL

**Crash details** (if any):

```
[paste crash log here]
```

---

## Degradation Fallback Checklist

If any of the following occur during a run, use the fallback:

| Issue                        | Fallback Action                                                              |
| ---------------------------- | ---------------------------------------------------------------------------- |
| Network disconnects          | Use pre-cached data (demo mode auto-caches)                                  |
| LLM not responding           | Degraded template outfits appear (DEGRADED_TEMPLATES in YiyiFirstOutfitStep) |
| GLM rate limit (429)         | GLM-5 auto-fallback via AIServiceRouter (5s timeout then fallback)           |
| TTS no audio                 | Silent mode acceptable -- text response still shows                          |
| STT not supported (emulator) | Type text input instead of voice                                             |
| App crash                    | Switch to pre-recorded backup video (docs/PRESENTATION/XUNO-DEMO-BACKUP.mp4) |
| TryOn API fails              | TryOnBottomSheet shows error state with retry button                         |
| Wardrobe save fails          | Retry with exponential backoff (already implemented)                         |

---

## Final Summary

| Run | Time  | E2E Runner | Crashes | Failures | Result      |
| --- | ----- | ---------- | ------- | -------- | ----------- |
| 1   | **:** | PASS/FAIL  | \_\_    | \_\_     | PASS / FAIL |
| 2   | **:** | PASS/FAIL  | \_\_    | \_\_     | PASS / FAIL |
| 3   | **:** | PASS/FAIL  | \_\_    | \_\_     | PASS / FAIL |

**Overall**: PASS (3/3 zero crash) / FAIL (needs fixes)

**E2E Runner Log**: See `demo-e2e-run-log.txt` for per-run automated check results.

**Sign-off**:

- Tester: **\*\***\_\_\_**\*\***
- Date: **\*\***\_\_\_**\*\***
- Approved by: **\*\***\_\_\_**\*\***

---

_Document version: 2026-04-29 (updated with Plan 05-05 E2E runner integration)_
_Related: docs/demo-script.md, docs/DEMO-CHECKLIST.md, docs/SMOKE-TEST.md, scripts/demo-e2e-run.sh_
