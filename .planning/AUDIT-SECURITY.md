# AUDIT-SECURITY.md — 安全审计

**Date:** 2026-04-15

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 2 |
| Medium | 4 |
| Low | 5 |

## Critical Findings

### SEC-01: Test Account Password in Version Control
**File:** .env.example:122-124
**Issue:** `TEST_ACCOUNT_PASSWORD=Test123456!` committed to version control. If copied to .env without changes, test account is active with known password.
**Fix:** Remove password from .env.example. Add startup validation rejecting `Test123456!` in non-test environments.

## High Findings

### SEC-02: JWT Secret Minimum Length Inconsistency
**File:** env.config.ts:55-61
**Issue:** `@MinLength(32)` allows 32-char secrets, but env.validation.ts requires 64 chars in production. .env.example says "MIN_128_CHARS".
**Fix:** Align `@MinLength(32)` to `@MinLength(64)` or `@MinLength(128)` for hex-encoded values.

### SEC-03: bcrypt Replaced with scrypt (Documentation Mismatch)
**File:** common/security/bcrypt.ts:12-16
**Issue:** `_rounds` parameter completely ignored. scrypt used instead of bcrypt. Documentation says "bcrypt 12 rounds".
**Fix:** Update documentation. Remove misleading `_rounds` parameter. Add explicit scrypt cost parameter (N=2^17).

## Medium Findings

### SEC-04: JWT Blacklist Bypass Possible Without jti
**File:** jwt.strategy.ts:33-39
**Issue:** Only checks blacklist if `payload.jti` exists. Tokens without jti bypass blacklist.
**Fix:** Add hard check that jti must be present; reject tokens without it.

### SEC-05: Inconsistent PII Field Definitions
**File:** common/encryption/pii-encryption.service.ts vs modules/security/encryption/pii-encryption.service.ts
**Issue:** Common module: User: ["phone", "idNumber", "email"]. Security module: User: ["phone", "realName", "idNumber"]. Email missing from security module.
**Fix:** Consolidate into single PII field definition including both email and realName.

### SEC-06: Notification Gateway Accepts JWT from Query Parameter
**File:** notification.gateway.ts:176
**Issue:** Accepts `query?.token` exposing JWT in server access logs and browser history.
**Fix:** Remove `query?.token`, consistent with other 3 gateways.

### SEC-07: Gateways Use Built-in Logger Bypassing Structured Masking
**File:** All 4 gateway files
**Issue:** Use NestJS Logger instead of StructuredLoggerService, bypassing PII masking.
**Fix:** Migrate all gateway loggers to StructuredLoggerService.

## Low Findings

### SEC-08: Missing Environment Variables in .env.example
PII_ENCRYPTION_ENABLED, FRONTEND_URL, SMS_PROVIDER missing. Weak default passwords (neo4j123, redis123).

### SEC-09: XSS Sanitization Pipe May Double-Encode
XssSanitizationPipe runs before ValidationPipe, could affect MinLength validation counting HTML entities.

### SEC-10: No Per-Minute Rate Limiting on AI Endpoints
AI endpoints use daily quota (AiQuotaGuard) but no per-minute throttle beyond global 100/min.

### SEC-11: Brands Scan Endpoint Accepts Arbitrary userId Without Auth
POST /brands/qr-codes/:code/scan accepts body.userId without authentication.

### SEC-12: Clothing Controller Uses Method-Level Guards
No class-level @UseGuards(JwtAuthGuard). Write endpoints use method-level guards. Acceptable but requires careful review.

## Positive Security Controls
1. AES-256-GCM encryption with per-user DEKs
2. Helmet with default security headers
3. CORS whitelist (no wildcard)
4. Global ValidationPipe with whitelist
5. XSS sanitization pipe
6. Magic bytes validation for file uploads
7. Malware scanning with polyglot detection
8. EXIF stripping on uploaded images
9. Rate limiting at global and per-endpoint levels
10. JWT token blacklisting with Redis
11. Timing-safe comparison for SMS codes
12. Email enumeration prevention
13. Structured logging with PII masking
14. Production environment validation
15. CSRF protection module
