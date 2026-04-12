# Codebase Map: Concerns & Technical Debt

**Mapped:** 2026-04-13
**Project:** AiNeed

## High Priority

### 1. Monorepo Dependency Version Inconsistencies
- **Location:** Root `package.json` vs `apps/mobile/package.json`
- **Issue:** TypeScript versions differ (^6.0.2 root vs 5.0.4 mobile), Prettier versions differ (root ^3.8.1 vs mobile 2.8.8)
- **Risk:** Type incompatibilities between shared packages and consumers
- **Recommendation:** Align TypeScript and tooling versions across the monorepo

### 2. Security Override Burden
- **Location:** `package.json` -> `pnpm.overrides`
- **Issue:** 11 security overrides needed for transitive dependencies (multer, tar, nodemailer, lodash, cookie, ajv, fast-xml-parser, etc.)
- **Risk:** Overrides can mask deeper dependency conflicts; need periodic audit
- **Recommendation:** Review quarterly, prefer updating direct dependencies over overriding

### 3. Dual AI Stylist Screens
- **Location:** `apps/mobile/src/screens/AiStylistScreen.tsx` and `AiStylistScreenV2.tsx`
- **Issue:** Two versions of the AI stylist screen coexist, unclear which is active
- **Risk:** Dead code, maintenance burden, user confusion
- **Recommendation:** Consolidate into single screen, deprecate unused version

### 4. Empty/Filler Screen Implementations
- **Location:** Various screen files in `apps/mobile/src/screens/`
- **Issue:** Some screens may be stubs or placeholder implementations
- **Risk:** Incomplete user experience, untested paths
- **Recommendation:** Audit all 28 screens for completeness

## Medium Priority

### 5. Duplicate Shared Packages
- **Location:** `packages/shared/` and `packages/types/`
- **Issue:** Both packages serve similar purposes (shared code across monorepo). Types package uses tsup, shared uses tsc
- **Risk:** Confusion about where to put shared code
- **Recommendation:** Clarify boundaries or merge into single package

### 6. Container Naming Inconsistency
- **Location:** `docker-compose.yml`
- **Issue:** Container named `stylemind-postgres`, `stylemind-redis` (legacy name) but project is `AiNeed`
- **Risk:** Confusion during ops, naming drift
- **Recommendation:** Rename containers to `aineed-postgres`, `aineed-redis`

### 7. Prisma Enhancement Scripts
- **Location:** `apps/backend/prisma/enhance-clothing-data.ts`, `enhance-clothing-data-fast.ts`, `enhance-sequential.ts`
- **Issue:** Multiple data enhancement scripts with overlapping purposes
- **Risk:** Which script to use is unclear, potential data inconsistency
- **Recommendation:** Consolidate into single well-documented script

### 8. Delivery Directory Ambiguity
- **Location:** `delivery/`, `DELIVERY-V3/`, `V3/` at project root
- **Issue:** Three directories related to delivery/V3, unclear relationship
- **Risk:** Confusion about which is current, potential stale artifacts
- **Recommendation:** Clean up and document which directories are active

### 9. Python ML Service Dependencies
- **Location:** `ml/`
- **Issue:** Python dependencies not formally managed (no requirements.txt or pyproject.toml at root ml/ level)
- **Risk:** Reproducibility issues, deployment complexity
- **Recommendation:** Add formal dependency management (requirements.txt or pyproject.toml)

## Low Priority

### 10. Test Coverage Gaps
- **Issue:** 35 backend modules, coverage varies; mobile testing unclear
- **Risk:** Regressions in under-tested modules
- **Recommendation:** Establish minimum coverage threshold per module

### 11. API Versioning Maturity
- **Location:** `apps/backend/src/main.ts`
- **Issue:** API versioning enabled (URI versioning, default v1) but only v1 exists
- **Risk:** Breaking changes when v2 needed
- **Recommendation:** Plan versioning strategy before v2

### 12. Large Prisma Schema
- **Location:** `apps/backend/prisma/schema.prisma`
- **Issue**: Single schema file with many models and relations
- **Risk:** Schema becomes hard to navigate as project grows
- **Recommendation:** Consider Prisma multitenancy or schema splitting if growth continues

### 13. Environment Variable Management
- **Location:** `.env.example`, `.env.security.example`
- **Issue:** Two env templates with different scopes, some variables not documented
- **Risk:** Missing env vars in deployment, security misconfiguration
- **Recommendation:** Consolidate into single comprehensive template

### 14. Mixed Import Styles
- **Location:** `apps/backend/src/main.ts`
- **Issue:** Uses `// @ts-ignore` for helmet import, ESM/CJS interop issues
- **Risk:** Build failures in strict TypeScript environments
- **Recommendation:** Resolve ts-ignore with proper type declarations

## Positive Patterns

- Well-structured NestJS modular architecture (35 modules)
- Comprehensive security middleware stack (Helmet, CSRF, XSS pipe, bcrypt)
- Circuit breaker pattern for external service calls
- Prometheus + Grafana monitoring in place
- Docker Compose with resource limits and health checks
- K8s manifests ready for production
- Proper monorepo setup with pnpm workspaces
- Shared types package for frontend-backend type safety

---
*Last updated: 2026-04-13*
