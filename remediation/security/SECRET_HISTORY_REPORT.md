# Secret History Report — XunO (AiNeed)

**Generated:** 2026-05-07 15:51:08
**Auditor:** Security Reviewer Agent (GLM-5.1)
**Scope:** Git history, .env exposure, hardcoded credentials, .gitignore coverage

---

## Executive Summary

**VERDICT: CRITICAL — IMMEDIATE SECRET ROTATION REQUIRED**

Production secrets including database passwords, API keys, payment private keys, and JWT secrets were committed to git and pushed to the remote repository at `github.com/yry1816186-pixel/AiNeed`. Although the files were later deleted from tracking, they remain permanently in git history and are recoverable by anyone with repository access.

---

## Finding 1: .env.production Committed with Real Production Secrets [CRITICAL]

**Severity:** CRITICAL
**Status:** EXPOSED IN GIT HISTORY
**Commit Added:** `633545a7` — Apr 29, 2026 20:56:34
**Commit Removed:** `8e42b4c6` — May 03, 2026 03:08:24
**Window of Exposure:** ~4 days in active tree; INDEFINITE in git history

### Exposed Secret Variable Names (20 secrets with non-empty values)

| Category | Variable Name | Value Length | Risk |
|----------|--------------|-------------|------|
| **Database** | `POSTGRES_PASSWORD` | 31 chars | DB takeover |
| **Database** | `DATABASE_URL` (embedded creds) | 71 chars | DB takeover |
| **Redis** | `REDIS_PASSWORD` | 30 chars | Cache poisoning |
| **Redis** | `REDIS_URL` (embedded creds) | 37 chars | Cache poisoning |
| **Object Storage** | `MINIO_ACCESS_KEY` | 36 chars | Data exfiltration |
| **Object Storage** | `MINIO_SECRET_KEY` | 36 chars | Data exfiltration |
| **AI Services** | `GLM_API_KEY` | 37 chars | API abuse / cost |
| **AI Services** | `ZHIPU_API_KEY` | 51 chars | API abuse / cost |
| **AI Services** | `AI_STYLIST_API_KEY` | 28 chars | API abuse / cost |
| **Payment** | `ALIPAY_PRIVATE_KEY` | 25 chars | **FRAUD** |
| **Payment** | `ALIPAY_PUBLIC_KEY` | 24 chars | **FRAUD** |
| **Payment** | `ALIPAY_APP_ID` | 30 chars | Payment manipulation |
| **Payment** | `WECHAT_PRIVATE_KEY` | 24 chars | **FRAUD** |
| **Payment** | `WECHAT_MCH_ID` | 30 chars | Payment manipulation |
| **Payment** | `WECHAT_APP_ID` | 31 chars | Payment manipulation |
| **Payment** | `WECHAT_SERIAL_NO` | 25 chars | Payment manipulation |
| **SMS** | `ALIYUN_SMS_ACCESS_KEY_ID` | 19 chars | SMS abuse / cost |
| **SMS** | `ALIYUN_SMS_ACCESS_KEY_SECRET` | 15 chars | SMS abuse / cost |
| **Auth** | `JWT_SECRET` | 55 chars | Session forgery |
| **Auth** | `JWT_REFRESH_SECRET` | 37 chars | Persistent session forgery |
| **Auth** | `CSRF_SECRET` | 37 chars | CSRF bypass |
| **Crypto** | `ENCRYPTION_KEY` | 45 chars | Data decryption |

### Additional Secrets with Empty Values (safe, but variable names exposed)

`DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `QDRANT_API_KEY`, `WECHAT_API_KEY`, `WECHAT_API_V3_KEY`, `WECHAT_OAUTH_APP_SECRET`

---

## Finding 2: .env.local Committed with Infrastructure Config [MEDIUM]

**Severity:** MEDIUM
**Commit Added:** `23420a28` — Apr 29, 2026 11:58:14
**Commit Removed:** `8e42b4c6` — May 03, 2026 03:08:24

| Variable Name | Value Length | Assessment |
|--------------|-------------|------------|
| `GLM_API_KEY` | 0 (empty) | Safe |
| `ZHIPU_API_KEY` | 0 (empty) | Safe |
| `OPENAI_API_KEY` | 0 (empty) | Safe |
| `GLM_API_ENDPOINT` | 36 chars | Exposes API endpoint URL |
| `GLM_MODEL` | 11 chars | Low risk |

---

## Finding 3: Remote Repository Exposure [CRITICAL]

**Severity:** CRITICAL
**Remote:** `https://github.com/yry1816186-pixel/AiNeed.git`
**Status:** Secret-containing commits were pushed to GitHub

If this repository is **public** or has been **forked**, the secrets are exposed to the internet. Even if **private**, any collaborator, CI system, or GitHub App with repo access can recover them from git history.

---

## Finding 4: Hardcoded Credentials in Source Code [LOW]

**Severity:** LOW (test-only)
**Files:** All matches are in `*.spec.ts` and `*.test.ts` files
**Assessment:** Test fixtures with mock values. Not real credentials.

Notable: `apps/mobile/App.tsx:58` has `password: "Test123456!"` gated by `__DEV__` flag — dev convenience, not a production risk.

---

## Finding 5: .gitignore Coverage [OK]

**Severity:** N/A (adequate)
**Current Rules:**
```gitignore
# --- Secrets & Env Files ---
.env
.env.*
!.env.example
```

**Assessment:** Properly excludes all .env files while allowing .env.example. The tracked files (`.env.example`, `.env.security.example`, `apps/mobile/ios/.xcode.env`) contain only template/placeholder values.

---

## Finding 6: Currently Tracked Files Audit [OK]

| File | Status | Risk |
|------|--------|------|
| `.env.example` | Tracked, placeholders only | Safe |
| `.env.security.example` | Was tracked, now deleted | Safe |
| `apps/mobile/ios/.xcode.env` | Tracked, Xcode generated | Safe |
| `apps/backend/.env*` | On disk, NOT tracked | Safe |
| `apps/admin/.env` | On disk, NOT tracked | Safe |
| `apps/mobile/.env` | On disk, NOT tracked | Safe |
| `ml/.env` | On disk, NOT tracked | Safe |

---

## Recommendations

### Immediate (CRITICAL — Do Today)

1. **ROTATE ALL SECRETS** — See `SECRET_ROTATION_REQUIRED.md` for the full rotation checklist
2. **Assess GitHub repo visibility** — If public, consider it fully compromised
3. **Check GitHub access logs** — Look for unauthorized clones/forks

### Short-term (This Week)

4. **Rewrite git history** — Use `git filter-repo` or BFG Repo Cleaner to purge .env files from all history
5. **Add pre-commit hook** — Install `detect-secrets` or `gitleaks` to prevent future commits of secrets
6. **Add GitHub push protection** — Enable secret scanning in repo settings

### Medium-term

7. **Migrate to secrets manager** — Use HashiCorp Vault (already in .env.example), AWS Secrets Manager, or Doppler
8. **Remove .env.example values** — Replace all non-placeholder values with `YOUR_*` tokens
9. **Add CI secret scanning** — GitHub Advanced Security or TruffleHog in CI pipeline

---

## Commit Timeline

| SHA | Date | Action |
|-----|------|--------|
| `71f6781` | Apr 3, 2026 | Initial commit with `.env.example` (safe) |
| `23420a2` | Apr 29, 2026 11:58 | **ADDED** `.env.local` (API endpoints exposed) |
| `633545a` | Apr 29, 2026 20:56 | **ADDED** `.env.production` (20+ secrets exposed) |
| `8e42b4c` | May 3, 2026 03:08 | **DELETED** `.env.local` and `.env.production` from tree |
| Present | May 7, 2026 | Files deleted from tree but **still in git history** |
