# Phase 0: 工程基础设施准备 - Research

**Gathered:** 2026-04-16
**Status:** Complete

## Current State (Verified Facts)

### Completely Missing Infrastructure
- No husky / lint-staged / commitlint (no Git Hooks at all)
- No root-level `.eslintrc` / `.prettierrc` (configs scattered across sub-packages)
- No Turborepo (no `turbo.json`, no incremental builds)
- No Changesets (no `.changeset/`, no version management)
- No root-level `typecheck` script (only mobile has one, backend/admin lack it)

### Existing But Fragmented Configuration

**ESLint — 3 completely different configs:**
- Backend: `@typescript-eslint/recommended-requiring-type-checking` + import plugins (strictest)
- Mobile: `expo` + `prettier` + `@typescript-eslint/recommended` (medium)
- Admin: ESLint v9 flat config + `typescript-eslint` (newest style)

**Prettier:**
- Backend and mobile each install `prettier@3.8.1`, but no shared `.prettierrc`

**CI:**
- `ci.yml` exists (lint + typecheck + test + build + e2e)
- `code-quality.yml` exists (ESLint + Prettier + TypeScript + audit + CodeQL)
- Missing: Turborepo caching and PR gate enforcement
- `code-quality.yml` has many `continue-on-error: true` entries

### Key Compatibility Issues
- Admin uses ESLint v9 flat config, Backend/Mobile use ESLint v8 `.eslintrc.json`
- Backend uses `@typescript-eslint@^8`, Mobile uses `@typescript-eslint@^7`
- `pnpm-workspace.yaml` does not include `ml/` directory (Python services not in pnpm scope)

## Validation Architecture

### Dimension 1: Input Validation
- husky hooks validate commit message format (commitlint)
- lint-staged validates staged file quality before commit

### Dimension 2: Output Verification
- CI pipeline verifies lint + typecheck + test pass on every PR
- Turborepo cache verifies build consistency

### Dimension 3: Integration Points
- husky integrates with git via hooks
- lint-staged integrates with husky via pre-commit hook
- Turborepo integrates with pnpm workspace
- Changesets integrates with pnpm workspace packages

### Dimension 4: Error Handling
- lint-staged blocks commit on lint errors
- CI blocks merge on pipeline failures
- Turborepo handles cache misses gracefully

### Dimension 5: Performance
- Turborepo incremental builds reduce CI time
- lint-staged only checks staged files (not full project)

### Dimension 6: Security
- commitlint enforces conventional commits (prevents injection via commit messages)
- CI audit step checks for vulnerable dependencies

### Dimension 7: Edge Cases
- Windows compatibility for husky (v9 has native Windows support)
- Python files in `ml/` not covered by lint-staged (not in pnpm workspace)
- Admin ESLint v9 flat config coexistence with v8

### Dimension 8: Observability
- CI pipeline results visible in GitHub PR checks
- Turborepo cache hit/miss stats in build logs

## Decision Points for Planning

| Plan | Key Decision | Risk |
|------|-------------|------|
| husky + lint-staged + commitlint | Windows compatibility (husky v9 native support); lint-staged per sub-package config | Low |
| Unified ESLint | Migrate Admin to v8 `.eslintrc`? Or keep v9 flat config? | Medium (Admin migration cost) |
| Unified Prettier | Create root `.prettierrc`, sub-packages remove their own configs | Low |
| Turborepo | Define pipeline (build/lint/typecheck/test); handle `postinstall` prisma generate | Medium (config complexity) |
| Changesets | Only `@xuno/types` and `@xuno/shared` need versioning; apps are private | Low |
| CI Pipeline | Existing ci.yml is comprehensive, need Turborepo cache + PR gate enforcement | Low |

## Questions for PLAN Phase

1. **ESLint unification strategy**: Should Admin's ESLint v9 flat config be downgraded to v8? Recommendation: keep v9 but root-level uses v8 compatibility
2. **Turborepo pipeline definition**: Which tasks have dependencies? `build` depends on `@xuno/types` building first
3. **lint-staged scope**: Should Python files (`ml/`) be included in lint?
4. **CI gate strictness**: Current `code-quality.yml` has many `continue-on-error: true`, should these be tightened?
5. **Changesets release flow**: Should GitHub Actions auto-publish be configured?

## RESEARCH COMPLETE
