---
wave: 2
depends_on: [PLAN-04]
files_modified:
  - .changeset/config.json
  - package.json
autonomous: true
requirements: [ENGR-06]
---

# Plan 05: 配置 Changesets 版本管理

## Goal

配置 Changesets 为 monorepo 中的共享包（`@xuno/types` 和 `@xuno/shared`）提供版本管理能力，apps 保持 private 不发布。

## Threat Model

| Attack Surface | Threat | Severity | Mitigation |
|---------------|--------|----------|------------|
| npm supply chain | @changesets/cli 恶意更新 | Low | 锁定版本号，pnpm lockfile |
| Accidental publish | 误将 private 包发布到 npm | Low | apps 标记 `private: true`，changeset config 限制访问 |
| Version drift | 包版本不一致 | Low | Changesets 自动管理依赖版本 |

## Context

- 当前无 `.changeset/` 目录，无版本管理
- `@xuno/types` 和 `@xuno/shared` 是可发布的共享包
- `@xuno/backend`, `@xuno/mobile`, `@xuno/admin` 标记为 `private: true`，不发布
- 项目暂不配置自动发布到 npm（仅本地版本管理）

## Tasks

### Task 05-01: 安装 @changesets/cli

<read_first>
- package.json
</read_first>

<action>
在根 `package.json` 的 `devDependencies` 中添加（通过 `pnpm add -D -w @changesets/cli` 安装）：

1. `@changesets/cli@^2.29.0`

在根 `package.json` 的 `scripts` 中添加：
- `"changeset": "changeset"`
- `"version-packages": "changeset version"`
</action>

<acceptance_criteria>
- `package.json` 的 `devDependencies` 包含 `"@changesets/cli"`
- `package.json` 的 `scripts` 包含 `"changeset"`
- `package.json` 的 `scripts` 包含 `"version-packages"`
- `pnpm install` 成功退出
</acceptance_criteria>

---

### Task 05-02: 初始化 Changesets 配置

<read_first>
- package.json
- packages/types/package.json
- packages/shared/package.json
</read_first>

<action>
1. 运行 `pnpm changeset init` 初始化 changeset 配置
2. 修改生成的 `.changeset/config.json`，确保内容为：

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@xuno/backend", "@xuno/mobile", "@xuno/admin"]
}
```

关键配置说明：
- `"access": "restricted"` — 不公开发布到 npm
- `"commit": false` — 不自动创建 git commit（手动控制）
- `"baseBranch": "main"` — 基准分支
- `"ignore"` — 忽略 private apps，只管理 `@xuno/types` 和 `@xuno/shared` 的版本
- `"updateInternalDependencies": "patch"` — 当依赖的包更新时，自动 patch 更新依赖方
</action>

<acceptance_criteria>
- `.changeset/config.json` 文件存在
- 文件内容包含 `"access": "restricted"`
- 文件内容包含 `"baseBranch": "main"`
- 文件内容包含 `"@xuno/backend"` 在 ignore 数组中
- 文件内容包含 `"@xuno/mobile"` 在 ignore 数组中
- 文件内容包含 `"@xuno/admin"` 在 ignore 数组中
- `.changeset/README.md` 文件存在（changeset init 自动创建）
</acceptance_criteria>

---

### Task 05-03: 验证 Changesets 工作流

<read_first>
- .changeset/config.json
</read_first>

<action>
1. 运行 `pnpm changeset add --empty` 测试交互式 CLI
   - 选择 `@xuno/types` 包
   - 选择 `patch` 版本类型
   - 输入描述 "test changeset setup"
2. 验证 `.changeset/` 目录下生成了新的 changeset 文件（以随机名称命名的 `.md` 文件）
3. 运行 `pnpm version-packages` 验证版本更新
4. 删除测试 changeset 文件（`git checkout .` 或手动删除）

注意：如果 `pnpm changeset add` 在非交互式环境中无法运行，可手动创建测试 changeset 文件验证。
</action>

<acceptance_criteria>
- `pnpm changeset add` 命令可运行（交互式 CLI 正常启动）
- 运行后 `.changeset/` 目录下生成新的 `.md` 文件
- `pnpm version-packages` 命令可运行
- `@xuno/types` 和 `@xuno/shared` 的版本号可被 Changesets 管理
- `@xuno/backend`, `@xuno/mobile`, `@xuno/admin` 不出现在 changeset 选择列表中
</acceptance_criteria>

## Verification

1. `pnpm changeset add` 交互式 CLI 正常工作
2. `.changeset/config.json` 配置正确
3. `pnpm version-packages` 可更新包版本
4. private apps 被忽略

## must_haves

- `.changeset/config.json` 存在且配置正确
- `pnpm changeset` 命令可用
- `pnpm version-packages` 命令可用
- private apps 在 ignore 列表中
- `access: restricted` 防止意外发布
