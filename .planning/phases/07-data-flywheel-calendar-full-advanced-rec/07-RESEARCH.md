# Phase 7: Data Flywheel + Calendar Full + Advanced Rec - Research

**Gathered:** 2026-04-25
**Status:** Complete

---

## Research Summary

Phase 7 covers 4 major subsystems: data flywheel pipeline, full calendar with AI auto-planning, outfit diary + style evolution, and coordination model training. Each subsystem has significant existing code to build upon.

---

## 1. Data Flywheel Pipeline

### Existing Infrastructure

- **BehaviorTrackerService** (934 lines): Complete behavior tracking with Redis queue + async batch writes + implicit feedback + session aggregation + preference weight updates. Already has `@Cron` decorator for periodic flush.
- **UserBehaviorEvent** Prisma model: 21 event types in `BehaviorEventType` enum. Missing `skip` and `outfit_save` (D-05).
- **SASRecService** (1343 lines): Full SASRec model with multi-head self-attention + BPR loss. FastAPI on port 8100 with `/predict`, `/train`, `/pipeline/train`, `/save`, `/load`, `/status` endpoints.
- **SASRecClientService**: NestJS HTTP client with `predict()`, `train()`, `isEnabled()`. Currently `SASREC_ENABLED=false`.
- **finetune_fashionclip.py** (427 lines): Complete fine-tuning script with unfreeze last N layers + cosine LR + early stopping + model checkpointing.
- **PreferenceLearningService**: Already updates preference weights from behavior events.

### Gaps & New Work

1. **New Event Types**: Need to add `skip` and `outfit_save` to `BehaviorEventType` enum in Prisma schema. This requires a migration.
2. **ETL Extraction Service**: New service to extract behavior events → SASRec training sequences. Current `pipeline/train` endpoint fetches from `/api/v1/recommendations/behavior-sequences` but this backend endpoint doesn't exist yet.
3. **Monthly Retraining Cron**: New BullMQ cron job (D-01) that triggers SASRec retraining monthly. Need `@Cron('0 2 1 * *')` decorator.
4. **FashionSigLIP Threshold Trigger**: New monitoring logic (D-03) that checks accumulated interaction count and triggers fine-tune when 500+ new interactions.
5. **Evaluation + Rollback**: New service (D-04) that runs Recall@K evaluation after retraining, auto-rollback if metrics degrade. Need model versioning (current + previous).
6. **Independent Rollback** (D-07): SASRec and FashionSigLIP each maintain their own model versions and rollback independently.

### Technical Decisions

- BullMQ Cron: Already integrated in NestJS (`@nestjs/schedule`). Use `@Cron` decorator.
- Full ETL (D-02): Simple `SELECT * FROM UserBehaviorEvent WHERE userId IS NOT NULL ORDER BY userId, createdAt`. Current user count <1000.
- Sequence construction (D-06): Group by userId, sort by createdAt, truncate to max_seq_length=50 (SASRec default).

---

## 2. Full Calendar with AI Auto-Planning

### Existing Infrastructure

- **SessionCalendarScreen** (287 lines): Month-view calendar with date selection and archived sessions display.
- **CalendarGrid** (205 lines): Reusable calendar grid component.
- **OutfitPlanScreen** (371 lines): Outfit plan detail view.
- **SessionArchiveService**: Backend service for calendar day queries (`getCalendarDays`, `getArchivedSessions`).
- **WeatherService**: QWeather + OpenWeatherMap integration with Redis caching (30min TTL).
- **WeatherIntegrationService**: Weather context injection into recommendation context.
- **Outfit** Prisma model: Has `occasions`, `seasons`, `wearCount`, `lastWorn`, `isFavorite` fields.

### Gaps & New Work

1. **7-Day Horizontal Scroll View** (D-08): New component replacing/extending month view. Shows weather icon + scene tag + outfit thumbnail per day.
2. **Weekly Auto-Generation** (D-09): New BullMQ cron (every Monday) that generates 7-day outfit plans based on weather forecast + calendar events + wardrobe. Need QWeather 7-day forecast API integration.
3. **BottomSheet Editing** (D-10): Click day → BottomSheet with current outfit + "换一套" button. Similar pattern to TryOnBottomSheet.
4. **Repeat Detection** (D-11): Calculate outfit similarity based on item overlap >70%. Show "上次穿这套是 X 天前" label.
5. **7-Day Forecast API**: Current WeatherService only has current weather. Need QWeather `/v7/weather/7d` endpoint integration.
6. **OutfitPlan Prisma Model**: May need new model or extend existing Outfit model to store planned outfits per date with weather context.

### Technical Decisions

- QWeather 7-day forecast: `GET /v7/weather/7d?location={lon},{lat}&key={key}` returns daily forecasts.
- Outfit plan storage: Extend `Outfit` model with `plannedDate`, `weatherContext`, `source` (ai_generated/manual) fields, or create new `OutfitPlan` model.
- Calendar events: Use `AiStylistSession.payload` which already stores scene/context data.

---

## 3. Outfit Diary + Style Evolution

### Existing Infrastructure

- **StyleEvolution** component (SmartRecommendations.tsx lines 661-707): Skeleton with timeline visualization. Takes `history[]` and `currentStyle` props.
- **ProfileReportScreen** (518 lines): Body/color analysis report pattern.
- **SubscriptionScreen**: References "weekly style report" as premium feature.
- **BehaviorTrackerService**: Already tracks all user interactions with implicit feedback scores.

### Gaps & New Work

1. **Auto-Record Outfit Diary** (D-12): Hook into existing behavior events (save outfit, try_on_complete) to auto-create diary entries. New `OutfitDiary` Prisma model.
2. **7-Element Weekly Report** (D-13): Satisfaction + style distribution + trend + evolution curve + scene coverage + color analysis + item reuse rate. New BullMQ cron (every Sunday).
3. **Behavior-Inferred Satisfaction** (D-14): Map events to satisfaction scores: save=1.0, try_on_complete=0.6, skip=-0.3, reject=-0.5.
4. **Style Dimension Multi-Line Chart** (D-15): X=time, Y=style dimension scores (commute/casual/formal/date). Reuse StyleEvolution component, feed real data.

### Technical Decisions

- OutfitDiary model: New Prisma model with `userId`, `outfitId`, `date`, `scene`, `weather`, `satisfactionScore`, `source` fields.
- Weekly report generation: BullMQ cron `@Cron('0 20 * * 0')` (Sunday 8PM). Aggregate diary entries for past 7 days.
- Style dimension scoring: Derive from outfit occasions + user preference weights.

---

## 4. Coordination Model Training & Integration

### Existing Infrastructure

- **GNNCompatibilityService** (722 lines): Graph-based compatibility scoring with category/style/color weights.
- **full_outfit_engine.py** (2073 lines): 6-dimension outfit scoring (color 0.25 + style 0.25 + occasion 0.15 + body 0.15 + season 0.10 + price 0.10).
- **RuleEngineService** (855 lines): L5 rule layer in recommendation pipeline.
- **item_compatibility.json**: Contains compatibility scores between item categories with occasions/seasons/styles.
- **7 JSON rule files** in `ml/data/fashion_rules/`: 264+ rules covering body_type, occasions, color_season, fabric, compatibility, trends, weather.
- **MatchingTheoryService** (663 lines): Matching theory scoring.
- **OutfitCompletionService** (370 lines): Outfit completion scoring.

### Gaps & New Work

1. **Rule-Generated Training Data** (D-16): Parse 264 JSON rules → generate positive samples (compatible pairs, label=1) + random combinations → negative samples (label=0). Target: ~2000 positive + ~8000 negative.
2. **Dual-Tower + Cross-Attention Architecture** (D-17): New PyTorch model. 10M params. Input: item A features + item B features. Output: compatibility score [0,1].
3. **Parallel Run + Gradual Switch** (D-18): New model runs alongside L5 rule engine. Compare outputs. Switch when consistency >90%.
4. **Local Dev + AutoDL Production** (D-19): Train locally for iteration, final version on AutoDL cloud.

### Technical Decisions

- Training data generation: Python script reads `item_compatibility.json` + other rule files, generates (item_A_category, item_B_category, label) triples.
- Model architecture: Item A encoder (embedding + FC layers) + Item B encoder (same) + cross-attention layer + output head.
- Integration point: New `CoordinationModelService` in NestJS that calls Python FastAPI endpoint, runs in parallel with `RuleEngineService` during transition period.
- Consistency metric: Compare top-K recommendations from both models, calculate overlap percentage.

---

## 5. Cross-Cutting Concerns

### Prisma Schema Changes

Phase 7 requires these schema modifications:

1. Add `skip` and `outfit_save` to `BehaviorEventType` enum
2. New `OutfitDiary` model
3. New `OutfitPlan` model (or extend `Outfit` with planned date fields)
4. New `ModelVersion` model (for SASRec/FashionSigLIP version tracking)
5. New `WeeklyReport` model (or store as JSON in existing model)
6. New `CoordinationModelScore` model (for parallel run comparison)

### BullMQ Cron Jobs

New cron jobs needed:

1. SASRec monthly retraining: `0 2 1 * *` (1st of month, 2AM)
2. FashionSigLIP threshold check: `0 3 * * *` (daily 3AM, check if 500+ new interactions)
3. Weekly outfit plan generation: `0 6 * * 1` (Monday 6AM)
4. Weekly report generation: `0 20 * * 0` (Sunday 8PM)

### API Endpoints Needed

Backend:

- `GET /api/v1/recommendations/behavior-sequences` — ETL extraction for SASRec
- `POST /api/v1/calendar/weekly-plan` — Generate/refresh 7-day plan
- `GET /api/v1/calendar/weekly-plan` — Get current week's plan
- `PATCH /api/v1/calendar/plan/:date` — Edit specific day's outfit
- `GET /api/v1/diary` — Get outfit diary entries
- `GET /api/v1/diary/weekly-report` — Get latest weekly report
- `POST /api/v1/retraining/sasrec` — Trigger SASRec retraining
- `POST /api/v1/retraining/fashionsiglip` — Trigger FashionSigLIP fine-tune
- `GET /api/v1/retraining/status` — Get retraining status

Python (ML):

- `POST /coordination/predict` — Coordination model inference
- `POST /coordination/train` — Train coordination model
- `GET /coordination/status` — Training status

---

## 6. Validation Architecture

### Test Infrastructure

| Property       | Value                               |
| -------------- | ----------------------------------- |
| **Backend**    | Jest 29.x via `pnpm test`           |
| **Python**     | pytest 7.x via `pytest`             |
| **Mobile**     | Jest + React Native Testing Library |
| **Quick run**  | `pnpm test --passWithNoTests`       |
| **Full suite** | `pnpm test && cd ml && pytest`      |

### Critical Test Points

1. ETL extraction: Verify behavior events → SASRec sequences correctly grouped and sorted
2. Monthly retraining: Verify cron triggers, evaluation runs, rollback works
3. 7-day plan generation: Verify weather + calendar + wardrobe combination
4. Outfit diary auto-recording: Verify events trigger diary creation
5. Weekly report: Verify 7-element aggregation logic
6. Coordination model: Verify training data generation from rules, model training, parallel scoring

### Manual Verification Required

- 7-day calendar UI: Visual layout and horizontal scroll
- Style evolution chart: Multi-line visualization
- BottomSheet editing: Interaction flow
- Weekly report content: Readability and insight quality

---

## RESEARCH COMPLETE
