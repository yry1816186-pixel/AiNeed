# ROLLBACK_INSTRUCTIONS.md

## How to Revert Remediation Changes

All remediation work is on branch `audit-remediation/20260507-1449` (based on `main`).

### Option 1: Discard Branch (If Not Merged)

```bash
git checkout main
git branch -D audit-remediation/20260507-1449
```

### Option 2: Revert Specific Changes

Each commit can be reverted individually:

```bash
# Phase 0 baseline (commit 08a7eae9)
git revert 08a7eae9

# Phase 1-3 fixes (commit 11d50d3d)
git revert 11d50d3d

# Phase 0 finalization (commit 6c8d1835)
git revert 6c8d1835
```

### Option 3: Revert Individual File Changes

To selectively revert a file to its main-branch state:
```bash
git checkout main -- path/to/file
```

## Files That Were NOT Modified

- All files in `audit_output/` (read-only, checksums verified unchanged)
- Production `.env` files (never read values)
- Prisma schema (no migrations applied)
- Core database content
- Any real datasets

## Safe to Discard Without Consequence

These are remediation-only files, safe to delete:
- `remediation/` (entire directory — audit tracking)
- `docs/api/FRONTEND_BACKEND_CONTRACTS.md`
- `docs/data/DATASET_REGISTRY.md`, `DATA_VALIDATION.md`, `SEED_AND_FIXTURE_STRATEGY.md`
- `docs/product/CORE_BUSINESS_LOGIC_ASSUMPTIONS.md`
- `docs/observability/ALERTING_RUNBOOK.md`
- `ml/docs/COORDINATION_FEATURE_SPEC.md`, `COORDINATION_MODEL_STATUS.md`
- `data/raw/README.md`

## Files That SHOULD Be Kept (Fixes)

These contain actual security/functional improvements:
- `apps/backend/src/main.ts` (request body size limits)
- `apps/backend/src/domains/ai-core/*/` (consent enforcement)
- `apps/backend/src/domains/identity/profile/` (consent enforcement)
- `apps/backend/prisma/import-fashion-dataset.py` (data pipeline fix)
- `apps/backend/package.json` (python3 → python)
- `ml/features/` (coordination model features)
- `ml/models/coordination_model.py` (model fix)
- `ml/data/coordination_training/` (repaired data)
- `monitoring/prometheus/prometheus.yml` (alerting fix)
- `monitoring/alerts/alert.rules.yml` (alerting labels)
- `docker-compose.production.yml` (alertmanager service)
- `infrastructure/alertmanager/`, `infrastructure/prometheus/alerts/` (BOM fix)
