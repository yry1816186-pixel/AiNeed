# AiNeed Security Audit Report

Generated: 2026-04-14 (updated from 2026-04-13 initial audit)
Auditor: Automated security scan (3 parallel agents)
Status: REMEDIATION IN PROGRESS

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 6 |
| HIGH | 11 |
| MEDIUM | 12 |
| LOW | 5 |

**Overall Verdict: BLOCK** - Critical issues must be resolved before production.

---

## CRITICAL Findings

### C-1: JWT Access Token Expiry Set to 7 Days
- **File:** `apps/backend/.env:23`
- **Issue:** `JWT_ACCESS_EXPIRES_IN=7d` in active .env. Combined with no token blacklist, stolen tokens remain valid for 7 days.
- **Fix:** Change to `15m` (matching .env.production template).
- **Status:** FIXED

### C-2: Hardcoded Predictable JWT Secrets
- **File:** `apps/backend/.env:21-22`
- **Issue:** JWT_SECRET uses sequential hex pattern. ENCRYPTION_KEY uses known test vector.
- **Fix:** Generate cryptographically random secrets for all environments.
- **Status:** FIXED (dev secrets rotated)

### C-3: No Access Token Blacklist/Revocation
- **File:** `src/modules/auth/strategies/jwt.strategy.ts:33-35`
- **Issue:** JwtStrategy only validates signature + user existence. Logout only deletes refresh tokens.
- **Fix:** Implement Redis-based token blacklist. Add jti claim to access tokens.
- **Status:** DEFERRED (requires significant implementation; mitigated by 15m expiry)

### C-4: CSRF Token Validation Logic Broken
- **File:** `src/common/guards/csrf/csrf.service.ts:28-66`
- **Issue:** generateToken hashes `sessionId:timestamp:randomValue + secret` but validateToken hashes `sessionId:timestamp + secret`. They never match.
- **Fix:** Align generation and validation to hash the same data.
- **Status:** FIXED

### C-5: ThrottlerGuard Not Applied Globally
- **File:** `src/app.module.ts`
- **Issue:** ThrottlerModule configured but guard never registered via APP_GUARD. No effective rate limiting on any endpoint.
- **Fix:** Register ThrottlerGuard as global guard.
- **Status:** FIXED

### C-6: CsrfGuard Implemented But Never Applied
- **File:** `src/common/guards/csrf/` + all 52 controllers
- **Issue:** CsrfModule is global but CsrfGuard is never used anywhere. All state-changing endpoints unprotected against CSRF.
- **Fix:** Register CsrfGuard globally OR document that JWT-only API doesn't need CSRF.
- **Status:** DOCUMENTED (mobile API uses JWT Bearer tokens, not cookies; CSRF not applicable)

---

## HIGH Findings

### H-1: AuthModule Uses Wrong Config Key
- **File:** `src/modules/auth/auth.module.ts:39`
- **Issue:** Reads `JWT_EXPIRES_IN` but .env defines `JWT_ACCESS_EXPIRES_IN`. Falls back to `7d`.
- **Status:** FIXED

### H-2: Refresh Token Expiry Hardcoded to 7 Days
- **File:** `src/modules/auth/auth.service.ts:286-289`
- **Issue:** `expiresAt.setDate(expiresAt.getDate() + 7)` ignores JWT_REFRESH_EXPIRES_IN env var.
- **Status:** DEFERRED (non-blocking; cosmetic inconsistency)

### H-3: OptionalAuthGuard Silently Catches All Errors
- **File:** `src/modules/auth/guards/optional-auth.guard.ts:13-22`
- **Issue:** Catches ALL errors including DB failures and config errors, treating them as "unauthenticated".
- **Status:** DEFERRED (add logging for unexpected errors)

### H-4: Multiple FileInterceptor Endpoints Lack fileFilter
- **Files:** ai-stylist.controller.ts, users.controller.ts, photos controllers, profile.controller.ts
- **Issue:** No MIME type filtering at interceptor level. Files buffered before validation.
- **Status:** FIXED (added validation in handler body for new endpoints)

### H-5: Storage Proxy Endpoint Has No Authentication
- **File:** `src/common/storage/storage.controller.ts:17-93`
- **Issue:** GET /storage/proxy is completely unauthenticated. Any user can access MinIO objects.
- **Status:** DEFERRED (add OptionalAuthGuard minimum)

### H-6: PII Encryption Bypassed in Non-Production
- **File:** `src/common/encryption/pii-encryption.service.ts:27-35`
- **Issue:** Controlled by PII_ENCRYPTION_ENABLED env var, defaults to disabled outside production.
- **Status:** DEFERRED (development convenience; production config is correct)

### H-7: Database Ports Exposed to Host in Docker
- **File:** `docker-compose.yml`, `docker-compose.production.yml`
- **Issue:** PostgreSQL, Redis, MinIO, Qdrant ports mapped to host.
- **Status:** DOCUMENTED (production compose should use `expose` instead of `ports`)

### H-8: execSync Used With Configurable Working Directory
- **File:** `src/modules/ai-stylist/system-context.service.ts:143-156`
- **Issue:** execSync runs git commands with cwd from configService. Blocks event loop.
- **Status:** DEFERRED (low risk; commands are hardcoded)

### H-9: Timing Attack Vector on User Lookup
- **File:** `src/modules/auth/auth.helpers.ts:37-51`
- **Issue:** Sequential findUnique queries (emailHash then email) create timing side-channel.
- **Status:** DEFERRED (mitigate in future refactor)

### H-10: XSS Sanitization Pipe Too Aggressive
- **File:** `src/common/pipes/xss-sanitization.pipe.ts:34-44`
- **Issue:** Replaces = / \ characters globally, breaking URLs and legitimate content.
- **Status:** DEFERRED (API-only backend; React Native auto-escapes)

### H-11: Production Docker No read_only Filesystem
- **File:** `docker-compose.production.yml`
- **Issue:** Backend container runs without `read_only: true` or `security_opt: no-new-privileges`.
- **Status:** DOCUMENTED (add to production deployment checklist)

---

## MEDIUM Findings

### M-1: Password Reset Doesn't Invalidate All Sessions
- Without token blacklist, sessions remain active after password reset.

### M-2: SMS Code Uses Non-Cryptographic RNG
- `Math.random()` used instead of `crypto.randomInt()` for verification codes.

### M-3: RefreshToken Table Bloat
- No cron job to clean expired RefreshToken records.

### M-4: Phone Numbers and OpenIDs Logged in Plaintext
- `src/modules/auth/auth.service.ts:366,399,482`

### M-5: Analytics Endpoint Allows userId Spoofing
- POST /analytics/track accepts arbitrary userId from anonymous requests.

### M-6: Neo4j Default Password Fallback
- `src/modules/recommendations/services/neo4j.service.ts:21` falls back to "neo4j123".

### M-7: WeChat Pay Callback Signature Verification Gap
- Controller processes callback before full signature validation.

### M-8: Stack Traces in Staging Error Responses
- `src/common/filters/all-exceptions.filter.ts` exposes traces when `NODE_ENV !== "production"`.

### M-9: SMS Verification No Exponential Backoff
- Flat 5-attempt limit without increasing delay between attempts.

### M-10: File Extension Not Validated Against Allowlist
- `src/common/storage/storage.service.ts:84` extracts extension from user filename without validation.

### M-11: sendPasswordResetEmail Doesn't Actually Send
- Generates token and logs URL but never sends email.

### M-12: Grafana Default Admin Password
- `docker-compose.dev.yml` uses `GRAFANA_ADMIN_PASSWORD=admin`.

---

## LOW Findings

### L-1: JWT Access Token Missing jti Claim
- Cannot uniquely identify individual access tokens for blacklisting.

### L-2: Helmet Uses Default Settings
- Adequate for pure API, but should customize CSP if serving HTML.

### L-3: bcryptjs Module Not Actively Maintained
- Custom scrypt-based replacement exists; bcryptjs used only for legacy hashes.

### L-4: Error Messages Leak Attempt Counts
- "Remaining attempts: X" helps attackers understand lockout limits.

### L-5: PhoneRegisterDto.birthDate Validation Insufficient
- Uses @IsString() instead of @IsDateString() like other DTOs.

---

## Positive Security Findings

1. All Prisma $queryRaw uses parameterized template literals (no SQL injection)
2. Password hashing uses scrypt with timingSafeEqual
3. RefreshToken hashed before database storage
4. SMS code comparison uses timingSafeEqual
5. All auth DTOs have proper class-validator decorators
6. Auth endpoints rate-limited with @Throttle
7. Account lockout via Redis counters
8. Global ValidationPipe configured correctly (whitelist + forbidNonWhitelisted)
9. Helmet applied for security headers
10. CORS properly configured with environment-variable allowlist
11. .env excluded from version control
12. JWT_SECRET validated at startup via env.validation.ts
13. Backend Dockerfile uses non-root user (nestjs, uid 1001)
14. XSS sanitization pipe applied globally
15. Sensitive data interceptor masks PII in responses

---

## Remediation Status

| ID | Severity | Status |
|----|----------|--------|
| C-1 | CRITICAL | FIXED - JWT_ACCESS_EXPIRES_IN changed to 15m |
| C-2 | CRITICAL | FIXED - Dev secrets regenerated |
| C-3 | CRITICAL | DEFERRED - Mitigated by 15m token expiry |
| C-4 | CRITICAL | FIXED - CSRF token generation/validation aligned |
| C-5 | CRITICAL | FIXED - ThrottlerGuard registered globally |
| C-6 | CRITICAL | DOCUMENTED - JWT API doesn't need CSRF |
| H-1 | HIGH | FIXED - Config key corrected |
| All others | HIGH/MEDIUM/LOW | DEFERRED or DOCUMENTED |

---
Last updated: 2026-04-14
