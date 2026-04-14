# AUDIT-DEPS.md — 依赖审计

**Date:** 2026-04-15

## Executive Summary

| Category | Severity | Count |
|----------|----------|-------|
| Outdated major versions (backend) | HIGH | 2 |
| Outdated major versions (mobile) | HIGH | 3 |
| Duplicate dependencies with version mismatch | HIGH | 5 |
| Unused dependencies | MEDIUM | 3 |
| Misplaced type packages | HIGH | 3 |
| tsconfig inconsistencies | MEDIUM | 3 |
| Docker-compose issues | MEDIUM | 4 |
| Prisma migration issues | LOW | 2 |
| Metro/Babel config issues | MEDIUM | 3 |

## High Priority Findings

### DEP-01: @nestjs/jwt Version Mismatch
**Current:** ^10.2.0 | **Should be:** ^11.0.0
All other NestJS packages are v11. Peer dependency mismatch risk.

### DEP-02: Mobile TypeScript Extremely Outdated
**Current:** 5.0.4 | **Should be:** ^5.7.3
2+ years behind. Missing critical type inference improvements and bug fixes. Root uses ^5.7.3.

### DEP-03: Mobile Prettier Major Version Mismatch
**Current:** 2.8.8 | **Backend:** ^3.8.1
Inconsistent formatting across packages.

### DEP-04: @types/csurf in Production Dependencies
**File:** backend/package.json
Type package not used anywhere, incorrectly in production dependencies. `csurf` itself is deprecated.

### DEP-05: @types/compression, @types/multer in Production Dependencies
Type packages should be in devDependencies.

### DEP-06: react-native-ratings Unused
Zero imports found in mobile src/. Remove.

### DEP-07: Mobile ESLint Packages Outdated
- @typescript-eslint/eslint-plugin: ^7 (backend: ^8)
- @typescript-eslint/parser: ^7 (backend: ^8)
- eslint-plugin-prettier: ^4 (backend: ^5)

## Medium Priority Findings

### DEP-08: Qdrant Docker Image Version Mismatch
dev.yml: v1.8.4 vs docker-compose.yml: v1.12.1. Significant version gap.

### DEP-09: Missing Health Checks in Docker-Compose
- neo4j, qdrant in dev.yml
- ai-task-worker, exporters, promtail in docker-compose.yml

### DEP-10: CatVTON Still Referenced in Docker-Compose
Per CLAUDE.md, should be migrated to GLM API.

### DEP-11: tsconfig Inconsistencies
- Mobile missing noUncheckedIndexedAccess, noImplicitReturns
- Mobile has ignoreDeprecations: "5.0" (should remove after TS upgrade)

### DEP-12: Metro Config Issues
- unstable_enableSymlinks: false in pnpm monorepo (fragile)
- 9 polyfills for Expo modules (maintenance burden)
- No babel-plugin-module-resolver (Jest can't resolve @/ alias)

### DEP-13: jsonwebtoken Redundant
Only 1 file (merchant-auth.guard.ts) uses it directly. Rest use @nestjs/jwt. Should migrate and remove.

## Low Priority Findings

### DEP-14: Prisma Migration Timestamps Out of Order
Migration 20260310 comes after 20260324 in listing.

### DEP-15: Docker Compose version: '3.8' Deprecated
Should be removed for Compose V2.

### DEP-16: pnpm 8 vs 9
pnpm 9 has breaking changes in lockfile format. Plan migration.

## Recommended Actions

1. Upgrade @nestjs/jwt to ^11.0.0
2. Upgrade mobile typescript to ^5.7.3, remove ignoreDeprecations
3. Remove @types/csurf from backend dependencies
4. Move @types/compression, @types/multer to devDependencies
5. Remove react-native-ratings from mobile dependencies
6. Align mobile prettier to ^3.8.1 and eslint packages to v8
7. Update qdrant image in dev.yml to v1.12.1
8. Add health checks to neo4j, qdrant in dev.yml
9. Migrate CatVTON references to GLM API in docker-compose
