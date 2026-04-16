---
plan: 00-04
phase: 00-eng-infra
status: complete
started: "2026-04-16"
completed: "2026-04-16"
---

# Summary: 配置 Turborepo 增量构建

## What was built

Turborepo 增量构建管道已配置，支持任务依赖图和本地缓存。

## Key Files

### Created
- `turbo.json` — 定义 build/lint/typecheck/test/dev/db:generate 管道

### Modified
- `package.json` — 添加 turbo 依赖，build/test/lint/typecheck 脚本改用 turbo
- `apps/mobile/package.json` — 添加 build 占位脚本 + lint 路径修复
- `.gitignore` — 添加 `.turbo/`

## Verification

- `turbo build --filter=@xuno/types --filter=@xuno/shared` → 首次 2.447s ✓
- 第二次运行 → `FULL TURBO` 430ms，2/2 缓存命中 ✓
- `.turbo/` 缓存目录已创建 ✓

## Deviations

- `outputMode` removed from turbo.json (Turborepo v2 不支持该键)
- admin build 失败是预存在问题（MODULE_NOT_FOUND），不影响 Turborepo 配置
