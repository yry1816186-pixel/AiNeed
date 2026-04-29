# Phase 23: 每周穿搭推荐算法增强 - Research

**Researched:** 2026-04-29
**Domain:** Recommendation System / Two-Stage Pipeline / Feedback Loop
**Confidence:** HIGH

## Summary

将每周穿搭推荐从单阶段基础 CRUD 升级为两阶段多维度可解释推荐系统。核心架构变更：`CalendarPlanService` 粗排（增强现有评分 + reuse_boost + 反馈权重调整）→ HTTP 调用 Python `FullOutfitEngine` 精排（6 维评分）→ 增强 API 响应字段。

**Primary recommendation:** 在现有代码基础上渐进增强——扩展现有 Service/DTO/Prisma Model，新增 FastAPI 端点接受候选 outfit 列表进行精排，新建 WeeklyPlanFeedback 模型实现维度独立衰减反馈回流。

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 方案 C — 两阶段流水线：CalendarPlanService 粗排 → FullOutfitEngine 精排 via HTTP
- **D-02:** 粗排增强现有 CalendarPlanService 评分：增加 reuse_boost + 用户反馈维度权重调整
- **D-03:** 精排 via HTTP（NestJS → FastAPI），需超时（建议 5s）和降级（回退到粗排结果）
- **D-04:** 精排维度权重：色彩 25% + 风格 25% + 体型 20% + 天气 15% + 场合 10% + 预算 5%
- **D-05~D-07:** DayPlanResponseDto 增加 4 字段：score_breakdown(6-dim), alternatives(top 2), wardrobe_reuse_rate, risk_notes（optional with defaults，向后兼容）
- **D-08~D-12:** WeeklyPlanFeedback 模型（9 type），维度独立衰减，dont_want_this 硬排除，30 天半衰期
- **D-13~D-17:** regenerate_day/regenerate_week 端点，lock_item/exclude_item 约束，OutfitPlan 增加 isLocked/excludedItemIds
- **D-18~D-20:** wardrobe_reuse_rate 计算，reuse_boost（默认 0.3）粗排加分

### Agent's Discretion

- FullOutfitEngine HTTP 超时：5s
- 衰减半衰期：30 天
- reuse_boost 默认值：0.3
- alternatives 数量：top 2
- risk_notes 规则和阈值

### Deferred Ideas (OUT OF SCOPE)

- 星座/运势推荐（零实现）
- SASRec 协同过滤（无训练权重）
- 候选池预生成
- A/B 实验框架

## Phase Requirements

| ID       | Description                                                                                                 | Research Support                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| REC23-01 | Two-stage pipeline: rough rank (CalendarPlanService) → fine rank (FullOutfitEngine HTTP), graceful fallback | §Existing Code Analysis, §Integration Pattern, §New FastAPI Endpoint |
| REC23-02 | Enhanced API: score_breakdown(6-dim), alternatives(top 2), wardrobe_reuse_rate, risk_notes                  | §DTO Changes, §Risk Notes Generation                                 |
| REC23-03 | WeeklyPlanFeedback: 9 feedback types, dimension-independent decay (30d), hard exclusion                     | §New Prisma Model, §Feedback Decay Algorithm                         |
| REC23-04 | regenerate_day/regenerate_week, lock_item/exclude_item                                                      | §Regenerate Strategy, §Prisma Schema Changes                         |
| REC23-05 | wardrobe_reuse_rate + reuse_boost (default 0.3) rough ranking                                               | §Reuse Rate Calculation                                              |

## Standard Stack

### Core

| Library           | Version                | Purpose                                | Why Standard                          |
| ----------------- | ---------------------- | -------------------------------------- | ------------------------------------- |
| NestJS            | 11.x                   | Backend framework (already in project) | Existing project stack                |
| Prisma            | 5.x                    | ORM + migrations (already in project)  | Existing project stack                |
| FastAPI           | Latest in ml/          | Python AI service host                 | Already running in docker-compose     |
| axios             | ^1.x (existing dep)    | HTTP client for NestJS→FastAPI calls   | Already used in ai-stylist.service.ts |
| class-validator   | ^0.14.x (existing dep) | DTO validation                         | Already used in calendar-plan.dto.ts  |
| class-transformer | ^0.5.x (existing dep)  | DTO transformation                     | Already used in calendar-plan.dto.ts  |

### Supporting

| Library                | Version         | Purpose                                      | When to Use               |
| ---------------------- | --------------- | -------------------------------------------- | ------------------------- |
| Pydantic               | ^2.x (ml/ deps) | FastAPI request/response schemas             | New fine-ranking endpoint |
| python threading.RLock | stdlib          | Thread-safe engine cache in FullOutfitEngine | Already used, reuse       |

### Alternatives Considered

| Instead of                            | Could Use                             | Tradeoff                                                                                                                                    |
| ------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| New FastAPI endpoint for fine ranking | Modify existing `/api/stylist/outfit` | Existing endpoint uses async task pattern (poll for result) — incompatible with 5s timeout requirement; new synchronous endpoint is simpler |
| gRPC for inter-process                | HTTP/JSON (existing pattern)          | gRPC adds proto compilation complexity; HTTP/JSON is already established pattern in project                                                 |
| New NestJS module                     | Extend AiStylistModule                | CalendarPlanService is already registered in AiStylistModule — extending same module avoids DI complexity                                   |

**Version verification:**

```bash
# All libraries are existing project dependencies — versions locked by package.json/pnpm-lock
# No new npm packages needed for this phase
```

**Installation:** No new packages required. All dependencies already in project.

## Architecture Patterns

### Recommended Project Structure (changes highlighted)

```
apps/backend/
├── prisma/
│   ├── schema.prisma                    # ADD: WeeklyPlanFeedback model + OutfitPlan field additions
│   └── migrations/                      # NEW: migration for schema changes
├── src/domains/ai-core/ai-stylist/
│   ├── services/
│   │   ├── calendar-plan.service.ts     # MODIFY: two-stage pipeline, reuse_boost, regenerate logic
│   │   ├── full-outfit-engine.client.ts # NEW: HTTP client for FullOutfitEngine fine ranking
│   │   ├── weekly-feedback.service.ts   # NEW: feedback CRUD + decay calculation
│   │   └── risk-notes.service.ts        # NEW: risk notes generation rules
│   ├── dto/
│   │   └── calendar-plan.dto.ts         # MODIFY: DayPlanResponseDto + new DTOs for regenerate/feedback
│   ├── calendar-plan.controller.ts      # MODIFY: new endpoints (regenerate, feedback, lock/exclude)
│   └── ai-stylist.module.ts             # MODIFY: register new services

ml/
├── api/
│   ├── routes/
│   │   └── stylist.py                   # MODIFY: new /score-outfits endpoint
│   └── schemas/
│       └── stylist.py                   # MODIFY: new ScoreOutfitRequest/Response schemas
└── services/stylist/
    └── full_outfit_engine.py            # MODIFY: add score_outfits() method for candidate-based fine ranking
```

### Pattern 1: Two-Stage Pipeline (Rough → Fine)

**What:** CalendarPlanService rough rank generates candidates → HTTP calls FullOutfitEngine for fine ranking → merge results

**When to use:** Every `generateWeeklyPlan()` execution; also used by `regenerate_day`/`regenerate_week`

**Code flow:**

```typescript
// In CalendarPlanService.generateWeeklyPlan() — enhanced flow
async generateWeeklyPlan(userId, lat?, lon?): Promise<WeeklyPlanResponse> {
  // ... existing weather/events/outfits loading ...

  for (let i = 0; i < 7; i++) {
    // STAGE 1: Rough ranking (enhanced existing scoring + reuse_boost + feedback weights)
    const roughCandidates = this.roughRankOutfits(outfits, plannedDate, forecast, scene,
      selectedOutfitIds, userId, excludedItemIds);

    // STAGE 2: Fine ranking via HTTP to FullOutfitEngine
    let fineRanked = roughCandidates;
    try {
      fineRanked = await this.fullOutfitEngineClient.scoreOutfits({
        candidates: roughCandidates.slice(0, 5).map(toEngineItem),
        userProfile: await this.getUserProfileForEngine(userId),
        context: { occasion, temperature, season }
      }, { timeout: 5000 });
    } catch (err) {
      this.logger.warn('FullOutfitEngine unavailable, using rough rank fallback');
      // Fallback: use rough rank results with estimated score_breakdown
    }

    // Merge results, calculate reuse_rate, generate risk_notes
    // ... create OutfitPlan ...
  }
}
```

### Pattern 2: Feedback Weight Decay

**What:** Each negative feedback affects its corresponding dimension weight; weight decays with 30-day half-life

**Algorithm:**

```typescript
// decay = 0.5^(days_since_feedback / 30)
// effective_weight = feedback_weight * decay
// dimension_penalty = sum(effective_weight for dimension_feedbacks)
```

### Anti-Patterns to Avoid

- **Direct DB mutation without Prisma migration:** Always use `prisma migrate dev --name` — schema changes must be in `.prisma/schema.prisma`
- **Hardcoded 5s timeout without AbortController:** Use axios timeout + AbortController for clean cancellation
- **Blocking the event loop:** FullOutfitEngine HTTP call must use async/await, never sync
- **Breaking existing API contract:** DayPlanResponseDto new fields MUST be `@ApiPropertyOptional` with defaults

## Don't Hand-Roll

| Problem                     | Don't Build               | Use Instead                                                    | Why                                                       |
| --------------------------- | ------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| HTTP timeout/retry          | Custom timeout logic      | axios timeout + AbortController (built into NestJS HttpModule) | Edge cases with connection drops, DNS resolution failures |
| Prisma JSON field parsing   | Custom JSON parse wrapper | Prisma's built-in Json type + type assertion                   | Prisma handles serialization/deserialization              |
| Feedback decay calculation  | Custom date math          | `Date.now()` difference + `Math.pow(0.5, days/30)`             | Simple enough but tested formula with known behavior      |
| Score normalization (0-100) | Custom scaling            | Math.min/max clamping with rounding to 2 decimals              | Matches FullOutfitEngine's existing pattern               |

**Key insight:** The two-stage pipeline is the only truly novel code. All other components (DTO, Prisma, Controller) follow established patterns already in the codebase.

## Runtime State Inventory

> This is a greenfield algorithm enhancement — no rename/refactor. New models/fields are additive.

| Category            | Items Found                                                                | Action Required                                                              |
| ------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Stored data         | Existing OutfitPlan rows (no isLocked/excludedItemIds/scoreBreakup fields) | Migration: add columns with defaults (false/null) — no data migration needed |
| Live service config | FullOutfitEngine via docker-compose ai-service                             | Already running — verify health endpoint before relying on it                |
| OS-registered state | None                                                                       | N/A                                                                          |
| Secrets/env vars    | ML_API_KEY in .env — already used by ai-stylist.service.ts                 | Reuse existing key — no new secrets needed                                   |
| Build artifacts     | None                                                                       | N/A                                                                          |

## Existing Code Analysis

### 1. CalendarPlanService (`calendar-plan.service.ts`)

**Current state:** 818 lines. Handles weekly plan generation, outfit scoring, edit, repeat detection.

**Key methods and signatures:**

| Method                 | Signature                                                                              | Changes Needed                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `generateWeeklyPlan()` | `(userId: string, lat?: number, lon?: number) => Promise<{weekStart, weekEnd, plans}>` | **MODIFY**: Add two-stage pipeline (rough→fine), reuse_boost, wardrobe_reuse_rate, risk_notes      |
| `getWeeklyPlan()`      | `(userId: string) => Promise<{weekStart, weekEnd, plans}>`                             | **MODIFY**: Return enhanced DTO with new fields                                                    |
| `selectOutfitForDay()` | `(outfits, date, forecast, sceneHint, alreadySelectedIds) => OutfitScore`              | **ENHANCE**: Add `reuse_boost` parameter, `excludedItemIds` filter; rename to `roughRankOutfits()` |
| `editDayPlan()`        | `(userId, date, newOutfitId) => Promise<DayPlan>`                                      | **MODIFY**: Support lock_item/exclude_item updates                                                 |
| `checkRepeatOutfit()`  | `(userId, date) => Promise<RepeatResult>`                                              | **REUSE**: No changes needed                                                                       |
| `checkRepeatForDay()`  | `(userId, date, outfitId) => Promise<boolean>`                                         | **REUSE**: No changes needed                                                                       |

**Current `selectOutfitForDay()` scoring formula:**

```
total = 50 (base) + season(0~30) + temp(0~20) + scene(0~25) + variety(0~15) + wearPenalty(0~-50)
```

[VERIFIED: calendar-plan.service.ts lines 390-401]

**Enhancement for rough rank (Phase 23):**

```
roughScore = baseScore * (1 + reuse_boost * wardrobe_reuse_rate) + feedbackBoost - exclusionPenalty
```

### 2. FullOutfitEngine (`ml/services/stylist/full_outfit_engine.py`)

**Current state:** 2073 lines. Generates full outfits from scratch with anchor piece → chain expansion.

**Key methods relevant to Phase 23:**

| Method                         | Location        | Purpose                                                                                        |
| ------------------------------ | --------------- | ---------------------------------------------------------------------------------------------- |
| `_score_outfit()`              | lines 1691-1741 | 6-dim scoring: color(25%) + style(25%) + body(20%) + weather(15%) + occasion(10%) + budget(5%) |
| `_check_color_harmony()`       | lines 1040-1139 | Color harmony: monochrome/analogous/complementary/triadic/split-complementary schemes          |
| `_check_style_consistency()`   | lines 1302-1376 | Style consistency: 14×14 compatibility matrix                                                  |
| `_check_body_fit()`            | lines 1607-1663 | Body type fit: 5 body types → fit recommendations                                              |
| `_check_weather_suitability()` | lines 1429-1531 | Weather suitability: layer count + warmth level                                                |
| `generate_outfit_plan()`       | lines 523-637   | Generates 1-3 complete plans from scratch                                                      |

**`_score_outfit()` return type:** `float` (0-100)
[VERIFIED: full_outfit_engine.py lines 1691-1741]

**WHAT NEEDS TO BE ADDED TO FullOutfitEngine for Phase 23:**

A new method `score_outfit_candidates()` that:

1. Accepts a list of pre-assembled outfit plans (from NestJS rough rank)
2. For each candidate, re-runs `_score_outfit()` with the user's profile + context
3. Returns the candidates with added 6-dim breakdown per candidate
4. Returns them sorted by overall_score descending

This is a **new public method**, not a modification of existing logic. The raw `_score_outfit()` function already exists and works with a list of `ClothingItem` + `UserProfile` + `OutfitContext`.

### 3. Prisma Schema

**Current `OutfitPlan` model (line 1808):**

```prisma
model OutfitPlan {
  id             String   @id @default(uuid())
  userId         String
  plannedDate    DateTime
  outfitId       String?
  weatherContext Json?
  sceneTag       String?
  isSpecialEvent Boolean  @default(false)
  eventName      String?
  source         String   @default("ai_generated")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  outfit Outfit? @relation(fields: [outfitId], references: [id], onDelete: SetNull)

  @@unique([userId, plannedDate])
}
```

[VERIFIED: prisma/schema.prisma lines 1808-1828]

**Fields to ADD (all nullable/with defaults — backward compatible):**

```prisma
model OutfitPlan {
  // ... existing fields ...
+  isLocked        Boolean  @default(false)
+  excludedItemIds Json?    // string[] of clothing IDs to exclude
+  scoreBreakup    Json?    // { total, color, style, bodyFit, weather, occasion, budget }
}
```

**NEW `WeeklyPlanFeedback` model:**

```prisma
model WeeklyPlanFeedback {
  id          String   @id @default(uuid())
  userId      String
  planId      String   // FK → OutfitPlan
  outfitId    String   // FK → Outfit (denormalized for query)
  feedbackType String  // enum: like|dislike|too_formal|too_casual|too_expensive|too_hot|too_cold|wrong_style|dont_want_this
  weight      Float    @default(1.0)  // initial weight, decays over time
  createdAt   DateTime @default(now())

  user   User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan   OutfitPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  outfit Outfit     @relation(fields: [outfitId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([planId])
  @@index([userId, feedbackType])
  @@index([createdAt])
}
```

**`RankingFeedback` (existing, line 257) — NOT reused for Phase 23:**

- Existing `RankingFeedback` links to `ClothingItem`, not `OutfitPlan`
- Uses `Decimal(5,4)` for weight — different schema
- Decision D-08 explicitly says "新建，不复用 RankingFeedback"
  [VERIFIED: prisma/schema.prisma lines 257-274]

### 4. DTO Layer (`calendar-plan.dto.ts`)

**Current state:** 119 lines. Has `EditDayPlanDto`, `GenerateWeeklyPlanDto`, `DayPlanResponseDto`, `WeeklyPlanResponseDto`, `RepeatCheckResponseDto`.

**`DayPlanResponseDto` — fields to ADD (all optional with defaults per D-07):**

```typescript
export class DayPlanResponseDto {
  // ... existing 10 fields ...

+  @ApiPropertyOptional({ description: "6维评分分解" })
+  score_breakdown?: {
+    total: number;
+    color: number;
+    style: number;
+    bodyFit: number;
+    weather: number;
+    occasion: number;
+    budget: number;
+  };
+
+  @ApiPropertyOptional({ description: "备选穿搭方案 (top 2)", type: [Object] })
+  alternatives?: { id: string; name: string | null; coverImage: string | null; totalScore: number }[];
+
+  @ApiPropertyOptional({ description: "衣橱复用率 (0-1)" })
+  wardrobe_reuse_rate?: number;
+
+  @ApiPropertyOptional({ description: "风险提示", type: [String] })
+  risk_notes?: string[];
}
```

### 5. Controller (`calendar-plan.controller.ts`)

**Current endpoints:**

- `GET /calendar/weekly-plan` — get or auto-generate
- `POST /calendar/weekly-plan` — force regenerate
- `PATCH /calendar/plan/:date` — edit day
- `GET /calendar/plan/:date/repeat-check` — repeat detection

**NEW endpoints needed:**

- `POST /calendar/plan/:date/regenerate` — regenerate single day (REC23-04)
- `POST /calendar/weekly-plan/regenerate` — regenerate full week (REC23-04)
- `POST /calendar/plan/:date/lock-item` — lock an item in day's plan
- `POST /calendar/plan/:date/exclude-item` — exclude an item
- `POST /calendar/plan/:date/feedback` — submit WeeklyPlanFeedback (REC23-03)

[VERIFIED: calendar-plan.controller.ts lines 1-139]

### 6. FastAPI Stylist Route (`ml/api/routes/stylist.py`)

**Current `/api/stylist/outfit` endpoint (POST):**

- Uses async task pattern: creates task → returns `{task_id, status: "pending"}`
- Client must poll for task result
- Does NOT accept candidate outfits — generates from scratch

**NEW endpoint needed for Phase 23:**

```
POST /api/stylist/score-outfits
```

Synchronous endpoint (no task pattern) that:

1. Accepts `{candidates: List[OutfitCandidate], user_profile: StylistUserProfile, context: StylistSceneContext}`
2. Calls `FullOutfitEngine.score_outfit_candidates()`
3. Returns `{ranked_outfits: [...], provider: "full_outfit_engine"}`

[VERIFIED: stylist.py lines 157-184, full_outfit_engine.py lines 1691-1741]

### 7. HTTP Communication Pattern (existing)

NestJS→FastAPI pattern already established in `ai-stylist.service.ts`:

```typescript
const mlResponse = await axios.post(
  `${this.mlServiceUrl}/dialog/process`,
  { message, context, user_id },
  { timeout: 15000, headers: { "X-ML-API-Key": "..." } }
);
```

[VERIFIED: ai-stylist.service.ts lines 348-365]

The `ML_API_KEY` env var and `mlServiceUrl` config already exist. Phase 23 reuses this pattern with a shorter timeout (5s vs 15s).

## Gap Analysis & Implementation Approach

### What MUST CHANGE (existing files modified)

| File                          | Change                                                                                                                                                                 | Reason                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `calendar-plan.service.ts`    | Enhance `generateWeeklyPlan()` with two-stage pipeline; add `roughRankOutfits()`, `regenerateDay()`, `regenerateWeek()`, `calculateReuseRate()`, `generateRiskNotes()` | Core algorithm upgrade       |
| `calendar-plan.dto.ts`        | Add 4 fields to `DayPlanResponseDto`; add new DTOs for regenerate/feedback                                                                                             | API response enhancement     |
| `calendar-plan.controller.ts` | Add 5 new endpoints (regenerate ×2, lock/exclude, feedback)                                                                                                            | New user interactions        |
| `prisma/schema.prisma`        | Add fields to `OutfitPlan`; add `WeeklyPlanFeedback` model                                                                                                             | Data persistence             |
| `full_outfit_engine.py`       | Add `score_outfit_candidates()` method                                                                                                                                 | Fine ranking with candidates |
| `stylist.py` (FastAPI route)  | Add `/score-outfits` endpoint                                                                                                                                          | HTTP bridge for fine ranking |
| `stylist.py` (schemas)        | Add `ScoreOutfitRequest`/`ScoreOutfitResponse` Pydantic models                                                                                                         | Request/response typing      |
| `ai-stylist.module.ts`        | Register new services                                                                                                                                                  | DI wiring                    |

### What MUST BE CREATED (new files)

| File                                    | Purpose                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `services/full-outfit-engine.client.ts` | NestJS HTTP client for FullOutfitEngine fine ranking (timeout + fallback) |
| `services/weekly-feedback.service.ts`   | Feedback CRUD + dimension-independent decay calculation                   |
| `services/risk-notes.service.ts`        | Risk note generation rules (weather change, repeat, occasion mismatch)    |
| `dto/feedback.dto.ts`                   | DTOs for submit/query feedback                                            |
| `dto/regenerate.dto.ts`                 | DTOs for regenerate requests (lockItemIds, excludeItemIds)                |

### Recommended File-by-File Change Sequence

**Wave 1 — Foundation (data layer):**

1. `prisma/schema.prisma` — Add OutfitPlan fields + WeeklyPlanFeedback model
2. Run `prisma migrate dev --name add_weekly_plan_feedback_and_enhanced_plan`
3. `ml/services/stylist/full_outfit_engine.py` — Add `score_outfit_candidates()` method
4. `ml/api/schemas/stylist.py` — Add Pydantic schemas
5. `ml/api/routes/stylist.py` — Add `/score-outfits` endpoint

**Wave 2 — Backend services:** 6. `services/full-outfit-engine.client.ts` — HTTP client 7. `services/weekly-feedback.service.ts` — Feedback + decay 8. `services/risk-notes.service.ts` — Risk notes 9. `calendar-plan.dto.ts` — Enhanced DayPlanResponseDto + new DTOs 10. `calendar-plan.service.ts` — Two-stage pipeline + enhance rough rank

**Wave 3 — API surface:** 11. `calendar-plan.controller.ts` — New endpoints 12. `ai-stylist.module.ts` — Register new services

**Wave 4 — Mobile sync:** 13. `apps/mobile/src/services/api/calendar-plan.api.ts` — Update mobile API layer

## Integration Risks

### Risk 1: HTTP Timeout + FastAPI Unavailability

- **Severity:** HIGH
- **Mitigation:** 5s timeout in axios; catch all errors (timeout, connection refused, 5xx) → graceful fallback to rough rank
- **Fallback behavior:** Use rough rank results, populate `score_breakdown` from rough rank's estimated scores, set `provider: "rough_rank_fallback"` in response
- **Existing pattern:** `ai-stylist.service.ts` already has try/catch around axios.post with fallback logic

### Risk 2: Prisma Migration Safety

- **Severity:** LOW
- **Mitigation:** All new fields have `@default()` values; additive migration only
- **Existing `OutfitPlan` rows:** `isLocked` defaults to `false`, `excludedItemIds` defaults to `null`, `scoreBreakup` defaults to `null`
- **Rollback:** Standard Prisma migration rollback via `prisma migrate reset` in dev, `prisma migrate down 1` in production

### Risk 3: DTO Backward Compatibility

- **Severity:** MEDIUM
- **Mitigation:** All 4 new fields are optional (`@ApiPropertyOptional`, TypeScript `?`). Existing API consumers receive the same shape + new fields as undefined/null.
- **Mobile API layer:** `calendar-plan.api.ts` must be updated to handle new optional fields gracefully

### Risk 4: data Serialization (NestJS → FastAPI)

- **Severity:** MEDIUM
- **Mitigation:** Outfit objects sent to FastAPI must be serialized to match `ClothingItem` dataclass shape in Python. Map NestJS `OutfitItem[]` to `{item_id, name, category, color_primary, style_tags, price, seasons, occasions, ...}` dicts.

### Risk 5: Feedback Decay Performance

- **Severity:** LOW
- **Mitigation:** Calculate decay at query time: `Math.pow(0.5, days_since / 30)`. O(n) per feedback record but n is small (users may have ~10-50 feedbacks).

## Code Examples

### New FastAPI Endpoint (Python)

```python
# Source: existing stylist.py pattern + full_outfit_engine.py _score_outfit()
# File: ml/api/routes/stylist.py — NEW endpoint

@router.post("/score-outfits")
async def score_outfits(request: ScoreOutfitRequest) -> Dict[str, Any]:
    service = await _get_stylist_service()
    try:
        engine = get_outfit_engine()
        user_profile = _to_user_profile(request.user_profile)
        context = OutfitContext(
            occasion=request.scene_context.occasion or "daily",
            temperature_celsius=request.scene_context.temperature,
            season=request.scene_context.season,
        )
        # Convert candidates to ClothingItem objects
        candidates = [_dict_to_clothing_item(c) for c in request.candidates]

        ranked = engine.score_outfit_candidates(
            candidates=candidates,
            user_profile=user_profile,
            context=context,
            budget=request.budget or 5000.0,
        )
        return {
            "success": True,
            "ranked_outfits": [r.to_dict() for r in ranked],
            "provider": "full_outfit_engine",
        }
    except Exception as e:
        raise InferenceError(message=f"精排失败: {str(e)}")
```

### FullOutfitEngine Candidate Scoring (Python)

```python
# Source: existing _score_outfit() in full_outfit_engine.py lines 1691-1741
# NEW method to add to FullOutfitEngine class

def score_outfit_candidates(
    self,
    candidates: List[ClothingItem],
    user_profile: UserProfile,
    context: OutfitContext,
    budget: float = 5000.0,
) -> List[FullOutfitPlan]:
    """Score pre-assembled outfit candidates with 6-dim breakdown.

    Unlike generate_outfit_plan() which builds outfits from scratch,
    this method takes already-assembled outfits and scores them.
    """
    plans: List[FullOutfitPlan] = []
    for items in candidates:  # items is List[ClothingItem] per outfit
        plan = FullOutfitPlan(plan_id=f"ranked_{uuid.uuid4().hex[:12]}")

        # Assign items to plan (simplified — no anchor logic needed)
        for item in items:
            if item.category == "outerwear": plan.outer_top = item
            elif item.category == "tops": plan.inner_top = item
            elif item.category == "bottoms": plan.bottom = item
            elif item.category == "footwear": plan.shoes = item
            else: plan.accessories.append(item)

        plan.overall_score = self._score_outfit(items, user_profile, context)
        plan.body_fit_score = self._check_body_fit(items, user_profile).score
        plan.color_harmony_score = self._check_color_harmony(items).score
        plan.style_consistency_score = self._check_style_consistency(items).score
        plan.weather_score = (
            self._check_weather_suitability(items, context.temperature_celsius).score
            if context.temperature_celsius
            else self._estimate_season_score(items, context.season or "")
        )
        plan.occasion = context.occasion
        plan.season = context.season or ""
        plans.append(plan)

    plans.sort(key=lambda p: p.overall_score, reverse=True)
    return plans
```

### HTTP Client (NestJS)

```typescript
// NEW file: services/full-outfit-engine.client.ts
// Pattern: existing axios usage in ai-stylist.service.ts lines 348-365
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class FullOutfitEngineClient {
  private readonly logger = new Logger(FullOutfitEngineClient.name);
  private readonly mlServiceUrl: string;
  private readonly mlApiKey: string;

  constructor(private configService: ConfigService) {
    this.mlServiceUrl = this.configService.get<string>("ML_SERVICE_URL", "http://ai-service:8000");
    this.mlApiKey = this.configService.get<string>("ML_API_KEY", "xuno-dev-key");
  }

  async scoreOutfits(params: {
    candidates: Record<string, unknown>[];
    userProfile: Record<string, unknown>;
    context: { occasion: string; temperature?: number; season: string };
    budget?: number;
  }): Promise<
    Array<{
      plan_id: string;
      overall_score: number;
      body_fit_score: number;
      color_harmony_score: number;
      style_consistency_score: number;
      weather_score: number;
    }>
  > {
    try {
      const response = await axios.post(
        `${this.mlServiceUrl}/api/stylist/score-outfits`,
        {
          candidates: params.candidates,
          user_profile: params.userProfile,
          scene_context: params.context,
          budget: params.budget ?? 5000.0,
        },
        {
          timeout: 5000,
          headers: { "Content-Type": "application/json", "X-ML-API-Key": this.mlApiKey },
        }
      );
      return response.data.ranked_outfits;
    } catch (error) {
      this.logger.warn(`FullOutfitEngine unavailable: ${error}`);
      throw error; // Let caller handle fallback
    }
  }
}
```

### Enhanced Rough Ranking (NestJS)

```typescript
// MODIFIED in calendar-plan.service.ts
roughRankOutfits(
  outfits: OutfitWithItems[],
  date: Date,
  forecast: DailyForecast | null,
  sceneHint: string | null,
  alreadySelectedIds: Set<string>,
  excludedItemIds: string[],
  userId: string,
  reuseBoost: number = 0.3,
  feedbackWeights?: Record<string, number>, // from WeeklyPlanFeedback decay
): ScoredOutfit[] {
  const baseScored = this.selectOutfitForDay(
    outfits.filter(o => !this.hasExcludedItems(o, excludedItemIds)),
    date, forecast, sceneHint, alreadySelectedIds
  );

  const scored = outfits.map(outfit => {
    const base = baseScored.find(s => s.outfit.id === outfit.id);
    const reuseRate = this.calculateWardrobeReuseRate(outfit, userId);
    const roughScore = base?.score ?? 0;
    const boostedScore = roughScore * (1 + reuseBoost * reuseRate);
    // Apply feedback weights if available
    const feedbackAdjust = feedbackWeights
      ? this.applyFeedbackWeights(boostedScore, outfit, feedbackWeights)
      : boostedScore;
    return { outfit, score: feedbackAdjust, reuseRate };
  });

  return scored.sort((a, b) => b.score - a.score);
}
```

### Reuse Rate Calculation

```typescript
// NEW in calendar-plan.service.ts
calculateWardrobeReuseRate(outfit: OutfitWithItems, userId: string): number {
  if (!outfit.items || outfit.items.length === 0) return 0;
  const totalItems = outfit.items.length;
  const ownedItems = outfit.items.filter(item => {
    // clothing is from user's wardrobe (userId match)
    return item.clothing?.userId === userId;
  }).length;
  return ownedItems / totalItems; // 0.0 to 1.0
}
```

## Common Pitfalls

### Pitfall 1: FastAPI Score Endpoint Using Async Task Pattern

**What goes wrong:** Using the existing async task model (task_id → poll) for the synchronous scoring endpoint adds latency and will exceed the 5s timeout.

**Why it happens:** The existing `/api/stylist/outfit` uses `asyncio.create_task(_run_outfit_task(...))` and returns immediately — caller must poll.

**How to avoid:** The new `/score-outfits` endpoint must be synchronous: run `engine.score_outfit_candidates()` inline and return results immediately.

**Warning signs:** Response returns `{task_id, status: "pending"}` instead of `{ranked_outfits: [...]}`.

### Pitfall 2: OutfitPlan Deletion on Regenerate

**What goes wrong:** `generateWeeklyPlan()` currently deletes ALL future `OutfitPlan` rows (line 111-116). Regenerate must preserve locked days (`isLocked: true`).

**Why it happens:** Current code: `prisma.outfitPlan.deleteMany({ where: { userId, plannedDate: { gte: today } } })`

**How to avoid:** In `regenerateWeek()`, add `AND isLocked = false` to the delete filter. Locked days are preserved and skipped during regeneration.

### Pitfall 3: DTO New Fields Breaking Mobile App

**What goes wrong:** Mobile app's TypeScript types expect the old `DayPlanResponseDto` shape — new optional fields won't break compilation but may cause runtime issues if mobile code accesses `score_breakdown.color` without null check.

**Why it happens:** New fields are optional but mobile may display them unconditionally.

**How to avoid:** All mobile display code using new fields must guard with `?.` optional chaining. Add default display: `score_breakdown?.total ?? '暂无评分'`.

### Pitfall 4: Feedback Flood Attack

**What goes wrong:** A malicious user submits hundreds of `dont_want_this` feedbacks to exclude all outfits from recommendations.

**Why it happens:** No rate limiting on feedback submission endpoint.

**How to avoid:** Add per-user feedback rate limit (e.g., 10/day) or throttle. Also, `dont_want_this` hard exclusion list should have a max size (e.g., 50 outfits) with FIFO eviction.

### Pitfall 5: Credit-Based System Budget Dimension Mismatch

**What goes wrong:** The budget dimension in FullOutfitEngine is based on item prices in the candidates, but this project's curated wardrobe model may not have real prices.

**Why it happens:** `FullOutfitEngine._score_outfit()` uses `price_score * 0.05` — if all items have `price: 0`, this dimension becomes meaningless.

**How to avoid:** When prices are all zero, set budget dimension score to a neutral 70 (as FullOutfitEngine already does for budget ≤ 0 per line 1573-1574).

## Risk Notes Generation

```typescript
// NEW: services/risk-notes.service.ts
generateRiskNotes(dayIndex: number, forecasts: DailyForecast[],
  outfit: OutfitWithItems, allWeekOutfits: OutfitWithItems[]): string[] {
  const notes: string[] = [];

  // 1. Weather change > 10°C between adjacent days
  if (dayIndex > 0) {
    const yesterdayTemp = (forecasts[dayIndex-1].tempHigh + forecasts[dayIndex-1].tempLow) / 2;
    const todayTemp = (forecasts[dayIndex].tempHigh + forecasts[dayIndex].tempLow) / 2;
    if (Math.abs(todayTemp - yesterdayTemp) > 10) {
      notes.push(`明天温差${Math.abs(todayTemp - yesterdayTemp).toFixed(0)}°C，注意调整穿搭`);
    }
  }

  // 2. Repeat outfit warning (reuse existing checkRepeatOutfit)
  const repeatIds = allWeekOutfits
    .filter((o, i) => i !== dayIndex && o.id === outfit.id)
    .length;
  if (repeatIds > 0) {
    notes.push('本周已有类似穿搭，建议更换款式');
  }

  // 3. Weekend formal mismatch
  const dayOfWeek = new Date(forecasts[dayIndex]?.date ?? '').getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) { // weekend
    if (outfit.occasions?.some(o => ['面试', '商务', '正式'].includes(o))) {
      notes.push('周末推荐正式穿搭，可考虑休闲选择');
    }
  }

  // 4. Rain/storm warning
  if (forecasts[dayIndex]?.condition?.includes('雨')) {
    notes.push('预报有雨，建议选择防水面料和防滑鞋');
  }

  return notes;
}
```

## Sources

### Primary (HIGH confidence)

- `calendar-plan.service.ts` (lines 1-818) — Current rough ranking algorithm verified in full
- `full_outfit_engine.py` (lines 1691-1741) — `_score_outfit()` 6-dim scoring verified in full
- `full_outfit_engine.py` (lines 523-637) — `generate_outfit_plan()` verified in full
- `prisma/schema.prisma` (lines 1808-1828) — OutfitPlan model verified
- `prisma/schema.prisma` (lines 257-274) — RankingFeedback model verified (not reused)
- `calendar-plan.dto.ts` (lines 1-119) — Current DTO structure verified
- `calendar-plan.controller.ts` (lines 1-139) — Current endpoints verified
- `stylist.py` (lines 1-334) — FastAPI routes verified
- `ai-stylist.service.ts` (lines 348-365) — HTTP axios pattern verified
- `ai-stylist.module.ts` (lines 1-86) — Module registration verified

### Secondary (MEDIUM confidence)

- `weather.service.ts` — Weather fallback pattern confirmed (provider: "fallback")
- `wardrobe.service.ts` — Wardrobe CRUD confirmed (userId scoping)
- `decision-engine.service.ts` — UserProfile aggregation pattern confirmed (bodyType, colorSeason, stylePreferences)
- `intelligent_stylist_service.py` (lines 1048-1097) — Existing FullOutfitEngine usage pattern confirmed

### Tertiary (LOW confidence)

- None — all claims verified against source code

## Assumptions Log

| #   | Claim                                                                                       | Section          | Risk if Wrong                                                                                                   |
| --- | ------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| A1  | Docker ai-service exposes FastAPI on port 8000 with URL `http://ai-service:8000`            | HTTP Client      | Medium — URL may differ; check docker-compose.local.yml                                                         |
| A2  | FullOutfitEngine scoring can be applied to pre-assembled outfits without anchor piece logic | FullOutfitEngine | Medium — `_score_outfit()` takes `List[ClothingItem]` which should work standalone; verify via integration test |
| A3  | No other services write to `OutfitPlan` outside CalendarPlanService                         | Prisma Migration | Low — verified by codebase grep; no other service references OutfitPlan.create                                  |

## Open Questions

1. **FastAPI service URL in NestJS config**

   - What we know: `ai-stylist.service.ts` uses `this.mlServiceUrl` from config
   - What's unclear: Exact env var name (`ML_SERVICE_URL` vs custom)
   - Recommendation: Check `config/env` files or docker-compose for exact key name

2. **Mobile `calendar-plan.api.ts` update scope**

   - What we know: File exists at `apps/mobile/src/services/api/calendar-plan.api.ts`
   - What's unclear: Whether mobile code directly references `DayPlanResponseDto` fields or uses mapped types
   - Recommendation: Plan mobile API layer update as final wave after backend changes are stable

3. **FullOutfitEngine `score_outfit_candidates()` per-candidate latency**
   - What we know: `_score_outfit()` runs color harmony + style consistency + body fit + weather + occasion calculations
   - What's unclear: End-to-end latency for 5 candidates with real data
   - Recommendation: Add timing logs in Wave 1; if >800ms for 5 candidates, consider parallel scoring with `asyncio.gather`

## Environment Availability

| Dependency         | Required By              | Available          | Version             | Fallback            |
| ------------------ | ------------------------ | ------------------ | ------------------- | ------------------- |
| Node.js            | NestJS backend           | ✓                  | v24                 | —                   |
| Python 3.11+       | FullOutfitEngine         | ✓                  | (assumed in Docker) | —                   |
| Docker             | FullOutfitEngine runtime | ✓                  | 20.10+              | —                   |
| FastAPI ai-service | Fine ranking HTTP call   | ✓ (docker-compose) | Latest              | Rough rank fallback |
| PostgreSQL         | Prisma migrations        | ✓                  | 16                  | —                   |
| Redis              | Rate limiting            | ✓                  | 7                   | —                   |

**Missing dependencies with no fallback:** None — all required services are in docker-compose

## Validation Architecture

### Test Framework

| Property           | Value                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| Framework          | Jest (backend) + Pytest (Python)                                      |
| Config file        | `apps/backend/jest.config.ts` + `ml/pyproject.toml` or `ml/setup.cfg` |
| Quick run command  | `npx jest --testPathPattern=calendar-plan --passWithNoTests`          |
| Full suite command | `npx jest --passWithNoTests; cd ml && python -m pytest`               |

### Phase Requirements → Test Map

| Req ID   | Behavior                                                            | Test Type    | Automated Command                                                                        | File Exists? |
| -------- | ------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------- | ------------ |
| REC23-01 | Two-stage pipeline: rough rank → HTTP fine rank → fallback          | integration  | `npx jest tests/calendar-plan/integration/two-stage.spec.ts`                             | ❌ Wave 0    |
| REC23-02 | Enhanced API: score_breakdown, alternatives, reuse_rate, risk_notes | unit + smoke | `npx jest tests/calendar-plan/dto/day-plan-response.spec.ts`                             | ❌ Wave 0    |
| REC23-03 | WeeklyPlanFeedback: 9 types, decay, hard exclusion                  | unit         | `npx jest tests/calendar-plan/feedback/decay.spec.ts`                                    | ❌ Wave 0    |
| REC23-04 | regenerate_day / regenerate_week with lock/exclude                  | integration  | `npx jest tests/calendar-plan/integration/regenerate.spec.ts`                            | ❌ Wave 0    |
| REC23-05 | wardrobe_reuse_rate + reuse_boost scoring                           | unit         | `npx jest tests/calendar-plan/rough-rank/reuse-boost.spec.ts`                            | ❌ Wave 0    |
| —        | FullOutfitEngine score_outfit_candidates()                          | unit         | `cd ml && python -m pytest tests/test_full_outfit_engine.py -k test_score_candidates -x` | ❌ Wave 0    |

### Sampling Rate

- **Per task commit:** `npx jest --testPathPattern=calendar-plan --passWithNoTests --silent`
- **Per wave merge:** `npx jest --passWithNoTests; cd ml && python -m pytest tests/test_full_outfit_engine.py`
- **Phase gate:** All Jest + Pytest tests green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/calendar-plan/integration/two-stage.spec.ts` — covers REC23-01
- [ ] `tests/calendar-plan/dto/day-plan-response.spec.ts` — covers REC23-02
- [ ] `tests/calendar-plan/feedback/decay.spec.ts` — covers REC23-03
- [ ] `tests/calendar-plan/integration/regenerate.spec.ts` — covers REC23-04
- [ ] `tests/calendar-plan/rough-rank/reuse-boost.spec.ts` — covers REC23-05
- [ ] `ml/tests/test_full_outfit_engine.py` — add `test_score_candidates` function
- [ ] Framework install: Jest + Pytest already in project; verify test directories exist

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                                   |
| --------------------- | ------- | ---------------------------------------------------------------------------------- |
| V2 Authentication     | yes     | JWT AuthGuard (existing) — all new endpoints protected by `@UseGuards(AuthGuard)`  |
| V3 Session Management | yes     | Existing JWT session — no new session logic                                        |
| V4 Access Control     | yes     | UserId scoping: all feedback/regenerate operations scoped to `req.user.id`         |
| V5 Input Validation   | yes     | class-validator decorators on all new DTOs; Pydantic validation on FastAPI schemas |
| V6 Cryptography       | no      | No new cryptographic operations in this phase                                      |

### Known Threat Patterns for NestJS + Prisma

| Pattern                                        | STRIDE            | Standard Mitigation                                                            |
| ---------------------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| Feedback injection (false feedbackType values) | Tampering         | Enum validation via `@IsEnum` + Prisma enum type                               |
| Cross-user plan access (userId bypass)         | Spoofing          | All queries include `userId` filter; Controller extracts from `req.user.id`    |
| Feedback flood (denial of service)             | Denial of Service | Rate limit feedback endpoint (10/user/day); max exclusion list size (50 items) |
| HTTP timeout DoS (slow FullOutfitEngine)       | Denial of Service | 5s axios timeout + AbortController; graceful fallback to rough rank            |

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries are existing project dependencies; no new packages needed
- Architecture: HIGH — codebase analysis complete; all existing service interfaces and data flows understood
- Pitfalls: HIGH — gap analysis covers all integration points; DTO/Prisma/HTTP patterns verified in source
- Implementation approach: HIGH — file-by-file change sequence ordered by dependency; all files identified

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (30 days — stable architecture with moderate risk of FullOutfitEngine API changes)
