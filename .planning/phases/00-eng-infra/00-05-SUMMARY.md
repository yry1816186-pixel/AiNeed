---
plan: 00-05
phase: 00-eng-infra
status: complete
started: "2026-04-16"
completed: "2026-04-16"
---

# Summary: 配置 Changesets 版本管理

## What was built

Changesets 为 monorepo 中的共享包提供版本管理能力，private apps 被忽略。

## Key Files

### Created
- `.changeset/config.json` — Changesets 配置（restricted access, ignore private apps）
- `.changeset/README.md` — 使用说明

### Modified
- `package.json` — 添加 @changesets/cli + changeset/version-packages 脚本 + 移除 js-yaml override

## Verification

- `pnpm changeset status` → 正常运行 ✓
- private apps 在 ignore 列表中 ✓
- `access: restricted` 防止意外发布 ✓

## Deviations

- `changeset init` 因 js-yaml 版本冲突失败，手动创建配置文件
- 移除了 `pnpm.overrides` 中的 `js-yaml: >=4.1.1`（该 override 导致 read-yaml-file 的 safeLoad API 不可用）
