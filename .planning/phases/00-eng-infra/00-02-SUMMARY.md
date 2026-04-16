---
plan: 00-02
phase: 00-eng-infra
status: complete
started: "2026-04-16"
completed: "2026-04-16"
---

# Summary: 统一 monorepo ESLint 配置

## What was built

根级 `.eslintrc.json` 作为共享基础配置，子包通过 `extends` 继承并添加各自特有规则。

## Key Files

### Created
- `.eslintrc.json` — 根级共享 ESLint 配置
- `packages/types/.eslintrc.json` — extends 根配置
- `packages/shared/.eslintrc.json` — extends 根配置

### Modified
- `apps/backend/.eslintrc.json` — extends 根配置 + NestJS 专用规则
- `apps/mobile/.eslintrc.json` — extends 根配置 + Expo/React 专用规则
- `package.json` — 添加根级 ESLint 依赖 + `typecheck` 脚本
- `apps/backend/package.json` — 添加 `typecheck` 脚本
- `apps/admin/package.json` — 添加 `typecheck` 脚本
- `apps/mobile/package.json` — 升级 @typescript-eslint 到 v8 + lint 脚本路径修复
- `packages/types/package.json` — 添加 `lint` 脚本
- `packages/shared/package.json` — 添加 `lint` 脚本

## Verification

- `pnpm lint` in backend → exit 0 ✓
- `pnpm lint` in mobile → runs with warnings (pre-existing) ✓
- Root `.eslintrc.json` extends chain works ✓

## Deviations

- Mobile lint script uses `node ../../node_modules/eslint/bin/eslint.js` due to pnpm hoisting issue with `.bin/eslint.CMD` relative path resolution
