---
plan: 00-03
phase: 00-eng-infra
status: complete
started: "2026-04-16"
completed: "2026-04-16"
---

# Summary: 统一 monorepo Prettier 配置

## What was built

根级 `.prettierrc` 作为 monorepo 唯一 Prettier 配置源，添加格式化脚本。

## Key Files

### Modified
- `.prettierignore` — 添加 `0/`, `pnpm-lock.yaml`, `ml/models/`, `ml/data/` 等排除项
- `package.json` — 添加 `format` 和 `format:check` 脚本

## Verification

- `.prettierrc` 包含所有必要字段 ✓
- 子包无独立 `.prettierrc` ✓
- `pnpm format:check` 命令可运行 ✓

## Deviations

None.
