# SECRET ROTATION REQUIRED — IMMEDIATE ACTION

**Generated:** 2026-05-07 15:52:05
**Priority:** P0 — CRITICAL
**Reason:** Production secrets committed to git history and pushed to remote

---

## ⚠️ DO NOT SKIP ANY ITEM

Every secret below had a real, non-placeholder value committed to git history.
If the GitHub repository is/was public, these secrets must be considered COMPROMISED.

---

## Rotation Checklist

### Tier 1 — Payment & Financial (MUST ROTATE FIRST)

- [ ] **ALIPAY_PRIVATE_KEY** — Generate new keypair in Alipay merchant console
- [ ] **ALIPAY_PUBLIC_KEY** — Update from Alipay console after key rotation
- [ ] **ALIPAY_APP_ID** — Verify unchanged; rotate if sandbox app
- [ ] **WECHAT_PRIVATE_KEY** — Generate new certificate in WeChat Pay merchant console
- [ ] **WECHAT_MCH_ID** — Verify unchanged; rotate if test merchant
- [ ] **WECHAT_APP_ID** — Verify unchanged; regenerate AppSecret if exposed
- [ ] **WECHAT_SERIAL_NO** — Will change with new certificate

### Tier 2 — Authentication & Encryption (MUST ROTATE)

- [ ] **JWT_SECRET** — Generate new 64-char random hex string
- [ ] **JWT_REFRESH_SECRET** — Generate new 64-char random hex string
- [ ] **CSRF_SECRET** — Generate new 64-char random hex string
- [ ] **ENCRYPTION_KEY** — Generate new key; **WARNING**: rotating this requires re-encrypting all encrypted PII data
- [ ] **ALIYUN_SMS_ACCESS_KEY_ID** — Create new AccessKey in Alibaba Cloud RAM console
- [ ] **ALIYUN_SMS_ACCESS_KEY_SECRET** — Will come with new AccessKey

### Tier 3 — Database & Infrastructure (ROTATE BEFORE NEXT DEPLOY)

- [ ] **POSTGRES_PASSWORD** — `ALTER USER postgres WITH PASSWORD 'new_password';`
- [ ] **DATABASE_URL** — Rebuild with new password
- [ ] **REDIS_PASSWORD** — Update `requirepass` in redis.conf, restart Redis
- [ ] **REDIS_URL** — Rebuild with new password
- [ ] **MINIO_ACCESS_KEY** — Create new access key in MinIO console
- [ ] **MINIO_SECRET_KEY** — Will come with new access key

### Tier 4 — AI Service API Keys (ROTATE TO PREVENT ABUSE)

- [ ] **GLM_API_KEY** — Regenerate in ZhipuAI console
- [ ] **ZHIPU_API_KEY** — Regenerate in ZhipuAI console
- [ ] **AI_STYLIST_API_KEY** — Regenerate in your AI stylist service

### Tier 5 — Verification

- [ ] Verify all old secrets are INVALIDATED (not just new ones created)
- [ ] Verify application starts and connects with new secrets
- [ ] Verify payment flows work (test mode)
- [ ] Verify AI service calls work
- [ ] Verify SMS sending works
- [ ] Update all deployment environments with new secrets

---

## Post-Rotation: Git History Sanitization

After rotating ALL secrets, clean git history to prevent future discovery:

```powershell
# Install git-filter-repo (preferred over BFG)
pip install git-filter-repo

# Remove .env.production and .env.local from ALL history
git filter-repo --invert-paths --path .env.production --path .env.local --force

# Force push to overwrite remote history
git push origin --force --all
git push origin --force --tags

# ALL collaborators must re-clone (not pull)
```

**WARNING:** History rewrite is destructive. Coordinate with all team members.
After rewrite, everyone must delete their local clone and re-clone fresh.

---

## Pre-commit Hook (Prevent Future Leaks)

Add to `.git/hooks/pre-commit` or use `pre-commit` framework:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

---

## Secrets Manager Migration (Recommended)

The `.env.example` already references Vault. Migrate to:

1. **HashiCorp Vault** (already in .env.example as `VAULT_DEV_ROOT_TOKEN_ID`)
2. Store all secrets in Vault, inject at runtime
3. Remove all .env files from deployment entirely
4. Use `vault kv put secret/xuno/<key> value=<val>` for each secret

---

## Confirmation

After completing all rotations:

- [ ] All Tier 1-4 secrets rotated and old values invalidated
- [ ] Application verified with new secrets
- [ ] Git history rewritten or scheduled for rewrite
- [ ] Pre-commit hook installed and tested
- [ ] This file updated with rotation timestamps
- [ ] Team notified of mandatory re-clone

**Rotated By:** _______________
**Date:** _______________
**Verified By:** _______________
