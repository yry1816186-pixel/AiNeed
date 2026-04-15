---
wave: 1
depends_on: []
files_modified:
  - package.json
  - .husky/pre-commit
  - .husky/commit-msg
  - commitlint.config.js
  - .lintstagedrc.json
autonomous: true
requirements: [ENGR-01]
---

# Plan 01: 配置 husky + lint-staged + commitlint

## Goal

建立 Git Hooks 机制，在 `git commit` 时自动触发代码质量检查（lint-staged）和提交信息格式验证（commitlint），防止低质量代码进入仓库。

## Threat Model

| Attack Surface | Threat | Severity | Mitigation |
|---------------|--------|----------|------------|
| npm supply chain | husky/lint-staged/commitlint 恶意更新 | Low | 锁定版本号，`pnpm install --frozen-lockfile` |
| Git hook bypass | `git commit --no-verify` 跳过检查 | Low | CI 流水线作为第二道门禁（Plan 06） |
| commitlint injection | 恶意 commit message 注入 | Low | commitlint 仅验证格式，不执行命令 |

## Context

- 当前项目无任何 Git Hooks（无 `.husky/` 目录，无 `commitlint.config.*`）
- 项目使用 `pnpm@8.15.0`，`node-linker=hoisted`
- Windows 开发环境，husky v9 原生支持 Windows
- `ml/` 目录不在 pnpm workspace 中，Python 文件不纳入 lint-staged 范围
- 子包已有 lint 脚本：backend `eslint "{src,test}/**/*.ts" --fix`，mobile `eslint .`

## Tasks

### Task 01-01: 安装 husky + lint-staged + commitlint 依赖

<read_first>
- package.json
- pnpm-workspace.yaml
</read_first>

<action>
在根 `package.json` 的 `devDependencies` 中添加以下依赖（通过 `pnpm add -D -w` 安装到 workspace root）：

1. `husky@^9.1.7`
2. `lint-staged@^15.5.0`
3. `@commitlint/cli@^19.8.0`
4. `@commitlint/config-conventional@^19.8.0`

在根 `package.json` 的 `scripts` 中添加：
- `"prepare": "husky"`

注意：如果 `prepare` 脚本已存在，在现有值前追加 `husky &&`。
</action>

<acceptance_criteria>
- `package.json` 的 `devDependencies` 包含 `"husky"`, `"lint-staged"`, `"@commitlint/cli"`, `"@commitlint/config-conventional"`
- `package.json` 的 `scripts` 包含 `"prepare": "husky"`
- `pnpm install` 成功退出（exit code 0）
</acceptance_criteria>

---

### Task 01-02: 初始化 husky 并创建 Git Hooks

<read_first>
- package.json
</read_first>

<action>
1. 运行 `pnpm exec husky init` 初始化 husky（创建 `.husky/` 目录）
2. 创建 `.husky/pre-commit` 文件，内容为：
   ```
   pnpm exec lint-staged
   ```
3. 创建 `.husky/commit-msg` 文件，内容为：
   ```
   pnpm exec commitlint --edit $1
   ```
   注意：Windows 环境下 `$1` 应为 `"$1"`（加引号处理路径空格），husky v9 在 Windows 上会正确处理。
4. 确保 `.husky/` 目录下的脚本文件有可执行权限（Linux/Mac 需要 `chmod +x`）
</action>

<acceptance_criteria>
- `.husky/pre-commit` 文件存在且内容包含 `pnpm exec lint-staged`
- `.husky/commit-msg` 文件存在且内容包含 `pnpm exec commitlint --edit`
- 运行 `git commit -m "test: husky setup" --allow-empty` 时 lint-staged 被触发（即使没有暂存文件也应正常退出）
</acceptance_criteria>

---

### Task 01-03: 配置 commitlint 规则

<read_first>
- package.json
</read_first>

<action>
在项目根目录创建 `commitlint.config.js` 文件，内容为：

```javascript
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "subject-max-length": [2, "always", 100],
    "body-max-line-length": [1, "always", 200],
  },
};
```
</action>

<acceptance_criteria>
- `commitlint.config.js` 文件存在
- 文件内容包含 `@commitlint/config-conventional`
- 文件内容包含 `type-enum` 规则和所有 11 种 type
- 运行 `echo "feat: test" | pnpm exec commitlint` 成功退出（exit 0）
- 运行 `echo "invalid: test" | pnpm exec commitlint` 失败退出（exit 1）
</acceptance_criteria>

---

### Task 01-04: 配置 lint-staged 规则

<read_first>
- package.json
- apps/backend/.eslintrc.json
- apps/mobile/.eslintrc.json
- apps/admin/eslint.config.js
</read_first>

<action>
在项目根目录创建 `.lintstagedrc.json` 文件，内容为：

```json
{
  "apps/backend/**/*.{ts,tsx}": ["eslint --fix"],
  "apps/mobile/**/*.{ts,tsx}": ["eslint --fix"],
  "apps/admin/**/*.{ts,tsx}": ["eslint --fix"],
  "packages/**/*.{ts,tsx}": ["eslint --fix"],
  "**/*.{ts,tsx,js,jsx,json,md,css,scss}": ["prettier --write"]
}
```

注意：
- lint-staged 会自动只检查暂存文件，不需要额外过滤
- Prettier 规则放在最后，确保所有文件都经过格式化
- `ml/` 目录下的 Python 文件不在 pnpm workspace 中，不纳入 lint-staged
- 子包的 eslint 命令会自动使用各自目录下的 `.eslintrc.json` / `eslint.config.js`
</action>

<acceptance_criteria>
- `.lintstagedrc.json` 文件存在
- 文件内容包含 `"apps/backend/**/*.{ts,tsx}"` 键
- 文件内容包含 `"apps/mobile/**/*.{ts,tsx}"` 键
- 文件内容包含 `"apps/admin/**/*.{ts,tsx}"` 键
- 文件内容包含 `"prettier --write"` 值
- 修改一个 `.ts` 文件并 `git add` 后，`pnpm exec lint-staged` 成功退出
</acceptance_criteria>

---

### Task 01-05: 更新 .gitignore 排除 husky 临时文件

<read_first>
- .gitignore
</read_first>

<action>
在 `.gitignore` 文件末尾添加以下内容：

```
# Husky
.husky/_
```

注意：husky v9 使用 `.husky/_` 目录存放内部脚本，应被 gitignore。
</action>

<acceptance_criteria>
- `.gitignore` 包含 `.husky/_` 行
</acceptance_criteria>

## Verification

1. `echo "feat: test commit" | pnpm exec commitlint` 退出 0
2. `echo "bad: test" | pnpm exec commitlint` 退出 1
3. 修改任意 `.ts` 文件，`git add` 后 `pnpm exec lint-staged` 退出 0
4. `git commit -m "feat: verify husky setup"` 触发 pre-commit 和 commit-msg hooks

## must_haves

- `git commit` 自动触发 lint-staged（pre-commit hook）
- `git commit` 自动触发 commitlint（commit-msg hook）
- 非常规 commit message 格式被拒绝
- lint 错误阻止 commit
