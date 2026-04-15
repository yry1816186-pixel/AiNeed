---
wave: 2
depends_on: [PLAN-02, PLAN-03]
files_modified:
  - turbo.json
  - package.json
  - apps/mobile/package.json
  - .gitignore
autonomous: true
requirements: [ENGR-05]
---

# Plan 04: 配置 Turborepo 增量构建

## Goal

配置 Turborepo 实现 monorepo 增量构建，利用任务依赖图和缓存机制加速 CI 和本地构建。

## Threat Model

| Attack Surface | Threat | Severity | Mitigation |
|---------------|--------|----------|------------|
| npm supply chain | turbo 恶意更新 | Low | 锁定版本号，pnpm lockfile |
| Cache poisoning | 本地缓存被篡改 | Low | Turborepo 使用内容哈希验证缓存完整性 |
| CI injection | Turborepo 远程缓存泄露代码 | Low | 暂不配置远程缓存，仅使用本地缓存 |

## Context

- 当前无 `turbo.json`，无增量构建
- pnpm workspace 包含 5 个包：`@xuno/backend`, `@xuno/mobile`, `@xuno/admin`, `@xuno/types`, `@xuno/shared`
- 依赖关系：backend/mobile/admin 依赖 `@xuno/types` 和 `@xuno/shared`
- `@xuno/types` 使用 `tsup` 构建，`@xuno/shared` 使用 `tsc` 构建
- backend 的 `postinstall` 脚本会运行 `prisma generate`，需要在 build 之前完成
- 根 `package.json` 已有 `"build": "pnpm -r build"` 脚本

## Tasks

### Task 04-01: 安装 Turborepo

<read_first>
- package.json
</read_first>

<action>
在根 `package.json` 的 `devDependencies` 中添加（通过 `pnpm add -D -w turbo` 安装）：

1. `turbo@^2.5.0`

在根 `package.json` 的 `scripts` 中修改：
- 将 `"build": "pnpm -r build"` 改为 `"build": "turbo build"`
- 将 `"test": "pnpm -r test"` 改为 `"test": "turbo test"`
- 将 `"lint": "pnpm -r lint"` 改为 `"lint": "turbo lint"`
</action>

<acceptance_criteria>
- `package.json` 的 `devDependencies` 包含 `"turbo"`
- `package.json` 的 `scripts` 中 `"build"` 值为 `"turbo build"`
- `package.json` 的 `scripts` 中 `"test"` 值为 `"turbo test"`
- `package.json` 的 `scripts` 中 `"lint"` 值为 `"turbo lint"`
- `pnpm install` 成功退出
</acceptance_criteria>

---

### Task 04-02: 创建 turbo.json 管道配置

<read_first>
- package.json
- apps/backend/package.json
- apps/mobile/package.json
- apps/admin/package.json
- packages/types/package.json
- packages/shared/package.json
</read_first>

<action>
在项目根目录创建 `turbo.json` 文件，内容为：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "outputMode": "new-only"
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputMode": "new-only"
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputMode": "new-only"
    },
    "test": {
      "dependsOn": ["^build"],
      "outputMode": "new-only"
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "db:generate": {
      "cache": false
    }
  }
}
```

说明：
- `"^build"` 表示先执行依赖包的 build 任务（`@xuno/types` 和 `@xuno/shared` 先构建）
- `db:generate` 不缓存（Prisma generate 每次都应执行）
- `dev` 不缓存且标记为持久任务
- `outputs` 指定缓存输出目录
</action>

<acceptance_criteria>
- `turbo.json` 文件存在
- 文件内容包含 `"build"` 任务且 `dependsOn` 包含 `"^build"`
- 文件内容包含 `"lint"` 任务
- 文件内容包含 `"typecheck"` 任务
- 文件内容包含 `"test"` 任务
- 文件内容包含 `"dev"` 任务且 `"cache": false`
- 文件内容包含 `"db:generate"` 任务且 `"cache": false`
</acceptance_criteria>

---

### Task 04-03: 确保子包有正确的 build 脚本

<read_first>
- apps/backend/package.json
- apps/mobile/package.json
- apps/admin/package.json
- packages/types/package.json
- packages/shared/package.json
</read_first>

<action>
验证并确保每个子包都有 `build` 脚本：

1. `@xuno/backend` — 已有 `"build": "nest build"` ✓
2. `@xuno/mobile` — 缺少 `build` 脚本。添加 `"build": "echo 'Mobile build handled by Metro bundler'"`
3. `@xuno/admin` — 已有 `"build": "tsc -b && vite build"` ✓
4. `@xuno/types` — 已有 `"build": "tsup src/index.ts --format cjs,esm --dts"` ✓
5. `@xuno/shared` — 已有 `"build": "tsc"` ✓

只需为 mobile 添加 build 脚本。Mobile 的构建由 Metro bundler 处理，不需要编译步骤，但需要占位脚本让 Turborepo 管道正常工作。
</action>

<acceptance_criteria>
- `apps/mobile/package.json` 的 `scripts` 包含 `"build"` 键
- 所有 5 个子包都有 `build` 脚本
</acceptance_criteria>

---

### Task 04-04: 更新 .gitignore 排除 Turborepo 缓存

<read_first>
- .gitignore
</read_first>

<action>
在 `.gitignore` 文件中添加以下内容（在 `# Build Outputs` 部分之后）：

```
# Turborepo
.turbo/
```
</action>

<acceptance_criteria>
- `.gitignore` 包含 `.turbo/` 行
</acceptance_criteria>

---

### Task 04-05: 验证 Turborepo 缓存生效

<read_first>
- turbo.json
- package.json
</read_first>

<action>
1. 运行 `pnpm build` 第一次，记录耗时
2. 不做任何修改，运行 `pnpm build` 第二次
3. 验证第二次构建输出中包含 `FULL TURBO` 标记（表示缓存命中）
4. 验证第二次构建速度明显快于第一次

注意：如果 `@xuno/types` 或 `@xuno/shared` 构建失败（可能因为缺少依赖），需要先运行 `pnpm install` 确保依赖完整。
</action>

<acceptance_criteria>
- `pnpm build` 第一次运行成功退出（exit 0）
- `pnpm build` 第二次运行输出包含 `FULL TURBO` 或 `cache hit` 标记
- `.turbo/` 缓存目录被创建
</acceptance_criteria>

## Verification

1. `turbo build --dry` 显示任务依赖图
2. 连续两次 `pnpm build`，第二次有缓存命中
3. `pnpm lint` 通过 Turborepo 运行
4. `pnpm typecheck` 通过 Turborepo 运行

## must_haves

- `turbo.json` 定义了 build/lint/typecheck/test/dev/db:generate 管道
- `^build` 依赖确保 `@xuno/types` 和 `@xuno/shared` 先构建
- 二次构建有缓存命中（`FULL TURBO`）
- `.turbo/` 在 `.gitignore` 中
