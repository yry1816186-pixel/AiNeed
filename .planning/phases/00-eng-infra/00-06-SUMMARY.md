---
plan: 00-06
phase: 00-eng-infra
status: complete
started: "2026-04-16"
completed: "2026-04-16"
---

# Summary: 建立 CI 流水线

## What was built

增强 CI 流水线：集成 Turborepo 缓存、收紧 continue-on-error、合并 typecheck jobs、添加 PR 门禁说明。

## Key Files

### Modified
- `.github/workflows/ci.yml` — 全包 lint/typecheck、Turborepo 缓存、合并 typecheck jobs、门禁注释
- `.github/workflows/code-quality.yml` — 移除 ESLint/Prettier 的 continue-on-error、Turborepo 缓存、Quality Gate 检查

## Key Changes

### ci.yml
- `Lint Backend` → `Lint All Packages` (pnpm turbo lint)
- 3 个 typecheck jobs 合并为 1 个 (pnpm turbo typecheck)
- 所有 build-related jobs 添加 Turborepo 缓存
- ci-summary needs 移除 mobile-typecheck/admin-typecheck
- 添加 PR required checks 注释

### code-quality.yml
- ESLint Backend/Mobile: 移除 continue-on-error
- Prettier Check: 移除 continue-on-error
- Quality Gate: 检查 eslint + prettier + typescript 结果
- ESLint/TypeScript 命令改用 pnpm turbo
- 添加 Turborepo 缓存

## Verification

- YAML 语法正确 ✓
- Turborepo 缓存配置 (path: .turbo, key: turbo-*) ✓
- Quality Gate 检查 eslint + prettier + typescript ✓

## Deviations

- 清理了 32 个临时文件（eslint-output.json, tsc-errors.txt 等）
