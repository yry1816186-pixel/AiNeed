# Evidence Ledger — Phase 0

## Evidence Classification System

- **CONFIRMED**: Directly verified locally (command, test, code inspection)
- **AUDIT-REPORTED**: Stated in audit files, not yet locally reverified
- **INFERRED**: Reasoned from inspected code/config
- **UNVERIFIED**: Not yet checked
- **BLOCKED**: Cannot proceed without external dependency
- **CONTRADICTORY**: Conflicting evidence exists

## Evidence Items

| ID    | Claim                                                         | Classification | Evidence                                                                           | Verified By  | Timestamp        |
| ----- | ------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------- | ------------ | ---------------- |
| E-001 | Project is XunO/寻裳, AI fashion platform                     | CONFIRMED      | package.json name="xuno", description matches                                      | orchestrator | 2026-05-07T14:49 |
| E-002 | pnpm install succeeds                                         | AUDIT-REPORTED | Audit report only — not locally reverified (deferred per 00_BASELINE_REPORT.md §6) | audit files  | 2026-05-07       |
| E-003 | All 15 audit files exist                                      | CONFIRMED      | Directory listing + checksums computed                                             | orchestrator | 2026-05-07T14:49 |
| E-004 | Audit checksums recorded                                      | CONFIRMED      | SHA256 hashes for all 15 files                                                     | orchestrator | 2026-05-07T14:49 |
| E-005 | Git branch `main` was current                                 | CONFIRMED      | `git branch --show-current`                                                        | orchestrator | 2026-05-07T14:49 |
| E-006 | Remediation branch created                                    | CONFIRMED      | `audit-remediation/20260507-1449` created                                          | orchestrator | 2026-05-07T14:49 |
| E-007 | .env.production was committed to git                          | CONFIRMED      | `git log` shows commit 633545a7 on 2026-04-29                                      | orchestrator | 2026-05-07T14:49 |
| E-008 | .env.local was committed to git                               | CONFIRMED      | `git log` shows commit 23420a28 on 2026-04-29                                      | orchestrator | 2026-05-07T14:49 |
| E-009 | .gitignore currently protects .env files                      | CONFIRMED      | `.env`, `.env.*` patterns in .gitignore                                            | orchestrator | 2026-05-07T14:49 |
| E-010 | Currently only .env.example and .env.security.example tracked | CONFIRMED      | `git ls-files` output                                                              | orchestrator | 2026-05-07T14:49 |
| E-011 | Node v24.14.0, pnpm 8.15.0, Python 3.12.10                    | CONFIRMED      | Version commands executed                                                          | orchestrator | 2026-05-07T14:49 |
| E-012 | Docker 29.4.1, Docker Compose v5.1.3 available                | CONFIRMED      | Version commands executed                                                          | orchestrator | 2026-05-07T14:49 |
| E-013 | 100+ backend unit tests exist on disk                         | AUDIT-REPORTED | Audit 00 & 09 claim this; not locally executed                                     | audit files  | 2026-05-07       |
| E-014 | Backend E2E is null-op (0 e2e-spec files)                     | AUDIT-REPORTED | Audit 02 & 09 claim this; not locally verified                                     | audit files  | 2026-05-07       |
| E-015 | import-fashion-dataset.py is missing                          | AUDIT-REPORTED | Audit 02 & 04 claim this                                                           | audit files  | 2026-05-07       |
| E-016 | data/raw/ directory missing                                   | AUDIT-REPORTED | Audit 04 claims this                                                               | audit files  | 2026-05-07       |
| E-017 | Coordination training data is all zeros                       | AUDIT-REPORTED | Audit 07 claims this                                                               | audit files  | 2026-05-07       |
| E-018 | Consent not enforced on AI endpoints                          | AUDIT-REPORTED | Audit 05 & 08 claim this                                                           | audit files  | 2026-05-07       |
| E-019 | 7 mobile store methods are TODO stubs                         | AUDIT-REPORTED | Audit 06 claims this                                                               | audit files  | 2026-05-07       |
| E-020 | Mobile app has hardcoded dev credentials                      | AUDIT-REPORTED | Audit 00 claims test@example.com in App.tsx                                        | audit files  | 2026-05-07       |
| E-021 | Production alertmanager targets empty                         | AUDIT-REPORTED | Audit 10 claims this                                                               | audit files  | 2026-05-07       |
| E-022 | 97% data is synthetic/mock                                    | AUDIT-REPORTED | Audit 00 claims this                                                               | audit files  | 2026-05-07       |
| E-023 | Python tests not in CI                                        | AUDIT-REPORTED | Audit 09 claims this                                                               | audit files  | 2026-05-07       |
| E-024 | No privacy policy or TOS                                      | AUDIT-REPORTED | Audit 08 & 11 claim this                                                           | audit files  | 2026-05-07       |
| E-025 | Many untracked and modified files in working tree             | CONFIRMED      | git status shows extensive changes                                                 | orchestrator | 2026-05-07T14:49 |
| E-026 | OpenCode sub-agents available in this environment             | CONFIRMED      | Task tool available with sub-agent types                                           | orchestrator | 2026-05-07T14:49 |
| E-027 | apps/admin/.env exists locally (54 bytes)                     | CONFIRMED      | File detection scan                                                                | orchestrator | 2026-05-07T14:49 |
