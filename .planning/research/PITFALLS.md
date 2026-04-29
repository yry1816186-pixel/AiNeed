# Pitfalls Research

**Domain:** AI Fashion Recommendation Platform (Mobile)
**Researched:** 2026-04-29
**Confidence:** MEDIUM (domain expertise + existing issues)

## Critical Pitfalls

### Pitfall 1: AI API Unreliability During Demo

**What goes wrong:**
GLM-4-Flash API times out or returns error during live competition demo, killing the entire presentation.

**Why it happens:**
Free-tier API has no SLA; network congestion; API rate limiting under load.

**How to avoid:**

1. DemoPreCache system pre-warms all AI responses before demo
2. Qwen fallback pipeline with automatic failover
3. Offline demo data as Plan B
4. Pre-recorded video as Plan C

**Warning signs:**

- API response times exceeding 3s in warmup
- Error rate >5% in preflight check
- GLM dashboard showing degraded service

**Phase to address:**
Phase 5 (Demo preflight + fallback pipeline)

---

### Pitfall 2: React Native Crash Cascade

**What goes wrong:**
One JavaScript error in a try-on or dialog component propagates to crash the entire app, requiring cold restart during demo.

**Why it happens:**

- Missing error boundaries at key interaction points
- Async AI call failures not properly caught
- Memory pressure from image operations

**How to avoid:**

1. ErrorBoundary wrappers on: Stylist dialog, Try-on sheet, Today recommendations
2. Global unhandled promise rejection handler
3. Memory monitoring and image cache eviction
4. 3-run rehearsal with crash logging (adb logcat)

**Warning signs:**

- YellowBox warnings during warmup
- Memory usage exceeding 200MB in devtools
- Previous run had ANY crash

**Phase to address:**
Phase 5 (Demo stability — error boundaries + crash prevention)

---

### Pitfall 3: FashionCLIP Gender/Race Bias

**What goes wrong:**
FashionCLIP consistently recommends Western-coded "professional" outfits, ignoring diverse body types and cultural styles — visible during ProfileDebugPanel demo.

**Why it happens:**
FashionCLIP training data dominated by Western fashion imagery; embedding space reflects training biases.

**How to avoid:**

1. Phase 6 migration to Marqo-FashionSigLIP (explicitly trained for diversity)
2. Diversity scoring layer in recommendation pipeline
3. Test with 10+ diverse profile configurations before demo

**Warning signs:**

- Switching profile from "creative" to "professional" shows no diversity in recommendations
- Same outfits recommended across all body types

**Phase to address:**
Phase 6 (FashionSigLIP migration + diversity constraints)

---

### Pitfall 4: Demo Hardware/Network Failure

**What goes wrong:**
WiFi disconnects, device overheats, emulator crashes — any physical issue that prevents the demo from running.

**Why it happens:**
Live demos are inherently fragile; venue networks are unpredictable; devices have thermal limits.

**How to avoid:**

1. WiFi + hotspot dual network backup
2. Pre-recorded demo video (with narration) as Plan B
3. PPT screenshot walkthrough as Plan C
4. Device in airplane mode + WiFi only (prevent cellular interference)
5. Keep device plugged in (prevent battery throttling)

**Warning signs:**

- Venue WiFi requires captive portal
- Device feels warm before starting
- Emulator unstable in previous days

**Phase to address:**
Phase 5 (Demo resilience plan)

---

### Pitfall 5: Soft Copyright Timeline Miss

**What goes wrong:**
Software copyright application delayed beyond 90-day critical path, blocking launch.

**Why it happens:**

- Missing documentation (code samples, architecture diagrams)
- Copyright office requests additional materials
- Legal review cycle delays

**How to avoid:**

1. Start Phase 6 immediately after Phase 5
2. Prepare all materials in advance (docs already exist in `docs/software-copyright/`)
3. Work with legal counsel early
4. 60-day buffer for office review

**Warning signs:**

- Missing any required document category
- Legal team not yet engaged
- No filing date on calendar

**Phase to address:**
Phase 6 (Software copyright application)

---

## Technical Debt Patterns

| Shortcut                                    | Immediate Benefit               | Long-term Cost                          | When Acceptable                |
| ------------------------------------------- | ------------------------------- | --------------------------------------- | ------------------------------ |
| Hardcoded demo data                         | Faster demo setup               | Demo data drifts from real API          | Only during competition period |
| Skip error boundary for non-critical flows  | Fewer files                     | Silent failures in edge cases           | Never — add before Phase 5     |
| Disable type checking for rapid prototyping | Faster iteration                | Runtime errors in production            | Never for demo code            |
| Manual Docker service startup               | Avoid docker-compose complexity | Forgot to start one service during demo | Use preflight script           |

## Integration Gotchas

| Integration     | Common Mistake                               | Correct Approach                  |
| --------------- | -------------------------------------------- | --------------------------------- |
| GLM-4-Flash API | No timeout handling → UI hangs forever       | 5s timeout with graceful fallback |
| MinIO S3        | Using public URLs in production              | Signed URLs with expiration       |
| BullMQ          | Jobs silently fail without Dead Letter Queue | DLQ monitoring + retry strategy   |
| Redis cache     | No cache invalidation after profile update   | Profile change → flush rec cache  |

## Performance Traps

| Trap                   | Symptoms                   | Prevention                         | When It Breaks    |
| ---------------------- | -------------------------- | ---------------------------------- | ----------------- |
| Try-on image high-res  | OOM crash on older devices | Downscale to 512px before upload   | >1024px images    |
| Recommendation cascade | 500ms+ TTI                 | Pre-cache top 5 recs on app open   | Cold start        |
| Voice STT large buffer | 3s+ processing             | Stream audio, not buffer-then-send | >30s recording    |
| Prisma N+1 queries     | Slow feed loading          | Use `include` for eager loading    | >10 items in feed |

## Security Mistakes

| Mistake                                  | Risk                      | Prevention                             |
| ---------------------------------------- | ------------------------- | -------------------------------------- |
| Exposing GLM API key in mobile bundle    | Key theft, cost abuse     | All AI calls through backend proxy     |
| Direct S3 URLs for user-uploaded content | Unauthorized access       | Signed URLs with short expiration      |
| No rate limiting on try-on endpoint      | Cost explosion (API fees) | BullMQ queue with concurrency limit    |
| User images not sanitized                | Malicious file upload     | Image validation + processing pipeline |

## UX Pitfalls

| Pitfall                                | User Impact                      | Better Approach                                             |
| -------------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| Long try-on wait without feedback      | Users leave (bounce)             | Progress bar + estimated time + push notification when done |
| "No recommendations found" empty state | Confusion — "is the app broken?" | Friendly message + "Try adjusting your preferences" CTA     |
| Voice mode without visual feedback     | "Did it hear me?" uncertainty    | Waveform animation + text transcription display             |
| Tab switch wipes dialog state          | Lost conversation context        | Persist Stylist dialog in Zustand across tab switches       |

## Recovery Strategies

| Pitfall                 | Recovery Cost | Recovery Steps                                                            |
| ----------------------- | ------------- | ------------------------------------------------------------------------- |
| Demo AI failure         | LOW           | Switch to pre-cached demo data mid-presentation                           |
| App crash during demo   | MEDIUM        | Pre-recorded video plays, presenter narrates over it                      |
| Network loss            | LOW           | Hotspot auto-failover, or show cached demo data                           |
| Copyright timeline miss | HIGH          | Launch without copyright (risk acceptance), file for temporary protection |
| Bias in demo            | MEDIUM        | Prepare diverse profiles in advance, test and select best examples        |

## Pitfall-to-Phase Mapping

| Pitfall               | Prevention Phase | Verification                              |
| --------------------- | ---------------- | ----------------------------------------- |
| AI API unreliability  | Phase 5          | 3-run rehearsal with 0 failures           |
| RN crash cascade      | Phase 5          | ErrorBoundary coverage + adb logcat clean |
| FashionCLIP bias      | Phase 6          | Diversity score >0.8 across 10 profiles   |
| Demo hardware failure | Phase 5          | Preflight check passes on venue device    |
| Copyright timeline    | Phase 6          | Filing date on calendar within 30 days    |

## Sources

- `docs/DEMO-SCRIPT-TEST-PLAN.md` — Crash prevention requirements
- `docs/DEMO-CHECKLIST.md` — Pre-demo verification items
- `docs/SMOKE-TEST.md` — 76 item smoke test
- `CLAUDE.md` — Known constraints (FashionCLIP bias, version locks)
- `docs/software-copyright/` — Copyright documentation in progress

---

_Pitfalls research for: AI Fashion Recommendation_
_Researched: 2026-04-29_
