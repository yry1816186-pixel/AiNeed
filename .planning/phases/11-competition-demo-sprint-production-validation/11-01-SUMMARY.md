---
phase: 11-competition-demo-sprint-production-validation
plan: 01
subsystem: demo-infrastructure
tags: [docker, demo, scripts, checklist]
dependency_graph:
  requires: [docker-compose.production.yml]
  provides: [demo-local.sh, demo-warmup.sh, DEMO-CHECKLIST.md]
  affects: [docker-compose.production.yml]
tech_stack:
  added: [bash-scripts, docker-compose-env-vars]
  patterns: [health-check-retry, cache-preheat, demo-mode-toggle]
key_files:
  created:
    - infrastructure/scripts/demo-local.sh
    - scripts/demo-warmup.sh
    - docs/DEMO-CHECKLIST.md
  modified:
    - docker-compose.production.yml
decisions:
  - DEMO_MODE env var controls port binding (0.0.0.0 vs 127.0.0.1) for emulator access
  - 5-minute health check timeout with 10s polling interval for startup
  - 30-retry warmup with 5s intervals for backend/ai-service health
  - Seed user warmup attempts for top 3 demo accounts
metrics:
  duration: 6m
  completed: "2026-04-26"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
  commits: 2
---

# Phase 11 Plan 01: Docker Local Demo Environment Summary

Docker full-stack local demo environment with one-click startup, 10-minute warmup, and 17-item pre-demo checklist.

## One-liner

One-click demo environment (demo-local.sh + demo-warmup.sh) + DEMO_MODE configurable port binding + 17-item pre-demo checklist covering Docker health, cache preheat, emulator connectivity, and backup video readiness.

## Tasks Completed

| Task | Name                                                      | Commit   | Files                                                                                       |
| ---- | --------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| 1    | Create demo-local.sh + demo-warmup.sh + DEMO_MODE support | 150812d5 | infrastructure/scripts/demo-local.sh, scripts/demo-warmup.sh, docker-compose.production.yml |
| 2    | Create docs/DEMO-CHECKLIST.md with 17 pre-demo checks     | 3a5bdb02 | docs/DEMO-CHECKLIST.md                                                                      |

## Key Changes

### Task 1: Demo Startup + Warmup Scripts

- **demo-local.sh** (140 lines): One-click local demo environment startup

  - Parameterized: `--skip-build` (skip Docker build), `--reset-data` (wipe volumes)
  - 7-step flow: Docker check -> disk space -> config validation -> optional data reset -> optional build -> compose up -> health wait (5 min timeout)
  - Prints service status table with port mappings at completion
  - Emulator connection hints (10.0.2.2 for Android)

- **demo-warmup.sh** (120 lines): Pre-demo cache preheat

  - 4-step flow: Backend health (30 retries/5s) -> AI Service health (30 retries/5s) -> cache preheat (POST /demo/pre-cache or manual GET) -> seed user warmup (3 demo accounts)
  - Reports total warmup duration

- **docker-compose.production.yml** modifications:
  - Added header comment with local demo usage instructions
  - `DEMO_MODE` env var on backend and ai-service
  - `DEMO_BACKEND_BIND` / `DEMO_AI_BIND` for configurable port binding (default 127.0.0.1, set to 0.0.0.0 for emulator access)

### Task 2: Demo Checklist

- **docs/DEMO-CHECKLIST.md** (170 lines): 17-item pre-demo verification checklist
  - 4 sections: Environment (5), Warmup (4), App Verification (5), Backup (3)
  - Each item has: checkbox, check command, expected result
  - Quick reference: port table, key commands, emulator networking

## Verification Results

| Check                           | Result              |
| ------------------------------- | ------------------- |
| demo-local.sh syntax (bash -n)  | PASS                |
| demo-warmup.sh syntax (bash -n) | PASS                |
| DEMO_MODE in docker-compose     | 5 occurrences       |
| Checklist checkboxes            | 17 (>= 13 required) |
| Both scripts have shebang       | PASS                |

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

No new security-relevant surface introduced. DEMO_MODE only affects port binding and is off by default (127.0.0.1).
