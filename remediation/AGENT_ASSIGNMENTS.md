# Agent Assignments — Phase 0

## Orchestrator: GLM-5.1 (Primary)

- Role: Phase planning, delegation, evidence classification, cross-agent integration
- Status: ACTIVE
- Phases: 0-7

## Sub-Agent Availability

| Agent                | Type            | Status    | Available For                   |
| -------------------- | --------------- | --------- | ------------------------------- |
| baseline-auditor     | GLM-5.1         | AVAILABLE | Phase 0 baseline capture        |
| backend-worker       | DeepSeek V4 Pro | AVAILABLE | Phases 1-3 backend repair       |
| frontend-worker      | DeepSeek V4 Pro | AVAILABLE | Phases 2-3 frontend repair      |
| data-pipeline-worker | DeepSeek V4 Pro | AVAILABLE | Phases 1-2 data repair          |
| ml-worker            | DeepSeek V4 Pro | AVAILABLE | Phases 1-2 ML repair            |
| security-reviewer    | GLM-5.1         | AVAILABLE | Phases 1, 5 security review     |
| qa-worker            | DeepSeek V4 Pro | AVAILABLE | Phase 4 testing                 |
| deployment-worker    | DeepSeek V4 Pro | AVAILABLE | Phase 5 deployment              |
| final-verifier       | DeepSeek V4 Pro | AVAILABLE | All phases — adversarial review |

## Phase 0 Assignments

| Agent            | Task                                          | Scope                  | Status    |
| ---------------- | --------------------------------------------- | ---------------------- | --------- |
| orchestrator     | Phase 0 planning, file creation, coordination | All baseline tasks     | COMPLETED |
| baseline-auditor | Independent baseline verification             | Read-only verification | DELEGATED |
| final-verifier   | Phase 0 adversarial review                    | Read-only review       | PENDING   |

## Phase 1 Planned Assignments (NOT STARTED)

| Workstream                      | Agent                      | Scope                               |
| ------------------------------- | -------------------------- | ----------------------------------- |
| 1A — Consent enforcement        | backend-worker             | AI/photo endpoint consent wiring    |
| 1B — Secret history             | security-reviewer          | Git history analysis, rotation plan |
| 1C — Data import pipeline       | data-pipeline-worker       | CSV-to-DB import script             |
| 1D — Missing raw data           | data-pipeline-worker       | data/raw/ documentation             |
| 1E — Coordination model vectors | ml-worker                  | Feature vector validation           |
| 1F — Backend E2E                | qa-worker + backend-worker | E2E test creation                   |
| 1G — Production alerting        | deployment-worker          | Prometheus/Alertmanager fix         |
