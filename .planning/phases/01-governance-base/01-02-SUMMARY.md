---
plan_id: "01-02"
status: complete
started: "2026-05-05"
completed: "2026-05-05"
---

# SUMMARY: PLAN-01-02 — Agent 基础设施

## Objective

创建 .agentignore 和标准化脚本，使 Agent 能够高效、可重复地检查环境、构建、测试和启动项目。

## What Was Built

- `.agentignore` — 18 条忽略规则 + 7 条保留规则，覆盖依赖/构建产物/缓存/IDE/安全/测试产物
- `scripts/doctor.sh` — 7 步环境检查（Node/pnpm/lock/依赖/配置/命令/可选运行时），失败 exit 1
- `scripts/build.sh` — 支持 all/backend/admin/types/mobile 参数，默认 turbo 全量构建
- `scripts/test.sh` — 支持 all/backend/mobile/admin/shared/ml 参数，默认 turbo 全量测试
- `scripts/start.sh` — 支持 infra/backend/mobile/admin/full 参数，含多终端启动指南

## Key Decisions

- .agentignore 保留 assets/public/res/ 访问（!规则）
- doctor.sh 检查 pnpm 声明版本 vs 实际版本差异
- test.sh 的 all 模式非必需包失败不阻断（EXIT_CODE 累计）
- start.sh 的 full 模式只输出指南不自动启动

## Deviations

无偏差。所有脚本严格按 PLAN 规格创建。

## Self-Check

- [x] .agentignore 包含所有 12 项必需忽略规则 + 3 条保留规则
- [x] 4 个脚本均以 #!/usr/bin/env bash 开头
- [x] doctor.sh 包含 7 个检查步骤，失败 exit 1
- [x] build.sh 默认执行 pnpm build
- [x] test.sh 默认执行 pnpm test
- [x] start.sh 包含 5 个 target（infra/backend/mobile/admin/full）
