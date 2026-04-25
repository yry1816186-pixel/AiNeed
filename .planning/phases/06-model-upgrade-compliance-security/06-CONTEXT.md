# Phase 6: Model Upgrade + Compliance + Security - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace FashionCLIP with FashionSigLIP (hard swap), complete Chinese LoRA fine-tune, implement full 6-layer funnel pipeline, train SASRec locally, build 5M preference model, implement PIPL consent mechanism, start software copyright + trademark registration, complete all security fixes (Nginx+TLS+port binding+API key management+server proxy).

This phase delivers: production-grade recommendation pipeline + legal compliance + security hardening.

</domain>

<decisions>
## Implementation Decisions

### Model Replacement Strategy

- **D-01:** Hard replace FashionCLIP with FashionSigLIP — no fallback, no dual-model. All vector operations in `ml/services/rag/embeddings.py` switch to FashionSigLIP. If FashionSigLIP unavailable, degraded template pipeline (from Phase 2) activates.
- **D-02:** Chinese LoRA fine-tune with rank=16 on Taobao 5000 items + DeepFashion Chinese subset. Use existing `ml/scripts/finetune_fashionclip.py` adapted for FashionSigLIP. Requires AutoDL GPU.
- **D-03:** Bias audit via recommendation result diversity — 5 profiles with same scenario but different styleExpression, check that recommendation results are visibly different. Not just encoding similarity.

### Funnel + SASRec

- **D-04:** Full 6-layer funnel implementation: L1 compliance → L2 scene → L3 size → L4 budget (hard filters), L5 style → L6 wardrobe complementary (soft scoring). Orchestrator breakdown field already exists from Phase 5.
- **D-05:** SASRec trained locally on RTX 4060. Use existing `ml/services/recommender/sasrec_service.py` and `apps/backend/src/domains/platform/recommendations/services/sasrec.service.ts`. Training data from UserBehaviorEvent table.
- **D-06:** 5M params preference model (MOD-03) — input: UserProfile + scene + candidate items, output: preference score. Lightweight, trainable on RTX 4060.

### Compliance + Software Copyright

- **D-07:** Complete PIPL consent mechanism — separate consent checkboxes for 三围/照片/体脂率 + GB/T 45574-2025 architecture + domestic AI no-cross-border confirmation. Frontend consent modal + backend ConsentRecord Prisma table.
- **D-08:** Software copyright application started immediately (60-90 day critical path). Trademark registration for "寻裳" and "伊伊" in parallel.
- **D-09:** Algorithm registration preparation (算法备案) — documentation and materials ready for submission.

### Security Fixes

- **D-10:** Full security fix: Nginx reverse proxy + Let's Encrypt TLS + port binding 127.0.0.1 + firewall + API keys via Docker Secrets/Vault + EXPO_PUBLIC_API changed to server-side proxy. Existing `k8s/ingress.yml` as starting point.

### Claude's Discretion

- Specific implementation details for each funnel layer (filter thresholds, scoring weights)
- FashionSigLIP model loading and caching strategy
- Consent UI design details (modal vs inline)
- Nginx configuration specifics
- Preference model architecture details (within 5M params constraint)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Model & Pipeline

- `ml/services/rag/embeddings.py` — Current FashionCLIP embedding service, needs FashionSigLIP replacement
- `ml/scripts/finetune_fashionclip.py` — Fine-tune script to adapt for FashionSigLIP
- `ml/scripts/prepare_finetune_data.py` — Data preparation for fine-tuning
- `ml/scripts/seed_qdrant.py` — Qdrant vector DB seeding
- `ml/scripts/benchmark_fashionclip.py` — Benchmark script to adapt for FashionSigLIP
- `ml/services/recommender/sasrec_service.py` — SASRec Python service skeleton
- `apps/backend/src/domains/platform/recommendations/services/sasrec.service.ts` — SASRec NestJS service
- `apps/backend/src/domains/platform/recommendations/services/sasrec-client.service.ts` — SASRec client
- `apps/backend/src/domains/platform/recommendations/services/learning-to-rank.service.ts` — Learning to rank service
- `apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts` — Orchestrator with breakdown field
- `apps/backend/src/domains/platform/recommendations/types/recommendation.types.ts` — RecommendationBreakdown type

### Compliance

- `apps/backend/src/domains/identity/privacy/privacy.service.spec.ts` — Existing privacy service tests
- `apps/backend/src/domains/platform/analytics/services/behavior-tracker.service.ts` — Behavior tracking (consent-gated)

### Security

- `k8s/ingress.yml` — Existing Kubernetes ingress configuration
- `infrastructure/alertmanager/alertmanager.yml` — Alertmanager configuration

### Project-Level

- `docs/XUNO_FINAL_PLAN.md` — 42 frozen decisions (decisions #7, #41 relevant)
- `.planning/REQUIREMENTS.md` — MOD-01~04, RAD-01~04, DAT-01~05, CMP-01~05, SEC-01~04

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `ml/services/rag/embeddings.py`: FashionCLIP embedding service — replace with FashionSigLIP adapter
- `ml/scripts/finetune_fashionclip.py`: Fine-tune pipeline — adapt for FashionSigLIP LoRA
- `sasrec.service.ts` + `sasrec-client.service.ts`: SASRec NestJS integration already scaffolded
- `learning-to-rank.service.ts`: Learning-to-rank service exists
- `recommendation.orchestrator.ts`: Already has breakdown field with 6-layer counts
- `RecommendationBreakdown` type: Already defined in frontend and backend
- `k8s/ingress.yml`: Nginx ingress config exists

### Established Patterns

- NestJS service pattern: injectable services with Prisma repositories
- Python ML services: FastAPI endpoints called from NestJS gateway
- Prisma migrations for schema changes
- TanStack Query hooks for frontend data fetching

### Integration Points

- `embeddings.py` → Qdrant vector DB → Orchestrator scoring
- `sasrec.service.ts` → `sasrec_service.py` (Python) → model inference
- Privacy consent → `behavior-tracker.service.ts` (consent-gated tracking)
- Nginx → NestJS backend (port 3001) → mobile API proxy

</code_context>

<specifics>
## Specific Ideas

- Bias audit should use the same 5 profiles as demo preset profiles (default/professional/creative from demoStore) for consistency
- Software copyright source code documentation should include the 42 frozen decisions as evidence of original design
- Nginx config should support both API proxy and MinIO static assets

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 06-model-upgrade-compliance-security_
_Context gathered: 2026-04-25_
