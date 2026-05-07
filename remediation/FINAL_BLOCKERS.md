# FINAL_BLOCKERS.md

## P0 — Block Production Use

| ID | Blocker | Status | Requires |
|----|---------|--------|----------|
| B-001 | 20+ production secrets exposed in git history | **MUST ROTATE** | Human: secret rotation authorization |
| B-012 | No privacy policy or TOS | **UNDRAFTED** | Human: legal team |
| B-013 | No saved coordination model weights | **NO TRAINING** | Real training data + compute |

## P1 — Block Commercial Readiness

| ID | Blocker | Status | Requires |
|----|---------|--------|----------|
| B-008 | No real commercial product catalog | **BLOCKED** | Supplier API / data source |
| B-009 | Payment gateway not operational | **BLOCKED** | Alipay/WeChat merchant accounts |
| B-010 | SMS provider not configured | **BLOCKED** | Alibaba Cloud SMS account |
| B-011 | WeChat login not operational | **BLOCKED** | WeChat Open Platform account |

## Infrastructure

| ID | Blocker | Status |
|----|---------|--------|
| I-001 | ESLint v9 migration needed | Pre-commit hooks broken |
| I-002 | lint-staged package not installed | Pre-commit hooks broken |
| I-003 | No staging environment provisioned | Infra not deployed |
| I-004 | Notification receivers unset | SMTP/DingTalk/PagerDuty creds |
| I-005 | No offsite backup configured | Backup runbook exists but not implemented |

## Human Decisions (35 items)

Full list in docs/legal/HUMAN_LEGAL_REVIEW_CHECKLIST.md (to be created by legal team)
- Legal entity registration
- Data controller/processor determination
- Privacy policy
- Terms of service
- Consent UX design
- Data deletion/export policy
- Algorithm registration (China)
- Dataset commercial licenses
- Model commercial licenses
- Brand/trademark filing
- App store / mini-program approval
- Subscription pricing
- Customer support policy
- Content moderation rules
