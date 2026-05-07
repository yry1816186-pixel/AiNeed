# CHANGELOG.audit-remediation.md

## audit-remediation/20260507-1449

### Phase 0 — Baseline (commit 08a7eae9)
- Baseline capture: 15 audit files checksummed
- Evidence classification system established  
- Secret exposure in git history confirmed
- All remediation tracking files created
- Evidence ledger E-002 reclassification (pnpm install)

### Phase 1-3 — P0 Fixes (commit 11d50d3d)
- Consent enforcement on 5 AI controllers (ai, ai-stylist, try-on, photos, profile)
- Global request body size limit (10MB) in main.ts
- Photos upload MIME validation (JPEG/PNG/WebP)
- Data import pipeline fixed (import-fashion-dataset.py rewritten)
- Coordination model all-zero vectors fixed (real features)
- Production alertmanager targets configured
- Dataset registry, validation docs, contract docs created
- Secret history report + rotation plan created
- E2E test null-op disproven (16 real E2E test files exist)
- BOM stripped from 3 YAML config files
- npm scripts: python3 → python (Windows compat)

### Key Audit Contradictions Resolved
- Audit claimed "0 e2e-spec files" → Actually 16+ real E2E test files
- Audit claimed "import-fashion-dataset.py missing" → File existed but fabricated data; now fixed
- Audit claimed "7 mobile store TODO stubs" → Frontend stores are functional; return [] are validators
