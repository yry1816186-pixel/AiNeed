---
wave: 1
depends_on: []
files_modified:
  - .prettierrc
  - .prettierignore
  - package.json
autonomous: true
requirements: [ENGR-04]
---

# Plan 03: 统一 monorepo Prettier 配置

## Goal

确认根级 `.prettierrc` 作为 monorepo 唯一的 Prettier 配置源，确保子包不创建独立配置，添加格式化脚本。

## Threat Model

| Attack Surface | Threat | Severity | Mitigation |
|---------------|--------|----------|------------|
| npm supply chain | prettier 恶意更新 | Low | 锁定版本号，pnpm lockfile |
| Prettier config conflict | 子包独立配置覆盖根配置 | Low | 不创建子包 .prettierrc，验证无冲突 |

## Context

- 根级 `.prettierrc` 已存在，配置合理（已验证）
- backend 和 mobile 各自安装了 `prettier@^3.8.1`，但无独立 `.prettierrc`
- admin 未安装 prettier
- `.prettierignore` 已存在

## Tasks

### Task 03-01: 验证根级 .prettierrc 配置正确性

<read_first>
- .prettierrc
</read_first>

<action>
验证根级 `.prettierrc` 内容与以下配置一致。如果缺少字段则补充，如果有多余字段则保留（不删除）：

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "useTabs": false,
  "jsxSingleQuote": false,
  "quoteProps": "as-needed",
  "bracketSameLine": false,
  "proseWrap": "preserve",
  "htmlWhitespaceSensitivity": "css",
  "embeddedLanguageFormatting": "auto"
}
```

当前文件已包含所有字段，无需修改。仅做验证。
</action>

<acceptance_criteria>
- `.prettierrc` 文件存在
- 文件内容包含 `"semi": true`
- 文件内容包含 `"singleQuote": false`
- 文件内容包含 `"printWidth": 100`
- 文件内容包含 `"endOfLine": "lf"`
- 运行 `npx prettier --check .prettierrc` 成功退出
</acceptance_criteria>

---

### Task 03-02: 更新 .prettierignore 排除不需要格式化的目录

<read_first>
- .prettierignore
- .gitignore
</read_first>

<action>
更新 `.prettierignore` 文件，确保包含以下内容：

```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.next/
out/

# Coverage
coverage/

# Generated files
*.min.js
*.min.css
package-lock.json
yarn.lock
pnpm-lock.yaml

# ML models and data
ml/models/
ml/data/

# OS files
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/

# Project-specific
0/
*.log
```

注意：`0/` 目录是项目中的 Node.js 缓存目录，应被排除。
</action>

<acceptance_criteria>
- `.prettierignore` 文件存在
- 文件内容包含 `node_modules/`
- 文件内容包含 `dist/`
- 文件内容包含 `0/`
- 文件内容包含 `pnpm-lock.yaml`
</acceptance_criteria>

---

### Task 03-03: 添加根级 format 脚本

<read_first>
- package.json
</read_first>

<action>
在根 `package.json` 的 `scripts` 中添加以下脚本：

1. `"format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md,css,scss,yml,yaml}\""`
2. `"format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md,css,scss,yml,yaml}\""`

这些脚本使用根级 `.prettierrc` 配置，自动递归应用到所有子包。
</action>

<acceptance_criteria>
- `package.json` 的 `scripts` 包含 `"format"`
- `package.json` 的 `scripts` 包含 `"format:check"`
- `pnpm format:check` 命令可运行（允许有格式不一致的文件，仅验证命令可执行）
</acceptance_criteria>

---

### Task 03-04: 确保子包无独立 .prettierrc

<read_first>
- apps/backend/package.json
- apps/mobile/package.json
- apps/admin/package.json
</read_first>

<action>
1. 搜索所有子包目录，确认不存在独立的 `.prettierrc` 或 `.prettierrc.json` 文件
2. 如果发现任何子包的 `.prettierrc`，删除它（子包应使用根级配置）
3. 在子包 `package.json` 中，如果 `scripts` 有 `format` 或 `prettier` 相关脚本，确保它们引用根配置（通常不需要，因为 prettier 会自动向上查找 `.prettierrc`）

验证：当前搜索已确认子包无独立 `.prettierrc` 文件，此任务仅需确认。
</action>

<acceptance_criteria>
- `apps/backend/` 目录下不存在 `.prettierrc` 或 `.prettierrc.json`
- `apps/mobile/` 目录下不存在 `.prettierrc` 或 `.prettierrc.json`
- `apps/admin/` 目录下不存在 `.prettierrc` 或 `.prettierrc.json`
- `packages/types/` 目录下不存在 `.prettierrc` 或 `.prettierrc.json`
- `packages/shared/` 目录下不存在 `.prettierrc` 或 `.prettierrc.json`
</acceptance_criteria>

## Verification

1. `pnpm format:check` — 命令可运行
2. 根级 `.prettierrc` 是唯一的 Prettier 配置文件
3. 子包无独立 `.prettierrc`

## must_haves

- 根级 `.prettierrc` 作为唯一配置源
- `pnpm format` 和 `pnpm format:check` 脚本可用
- 子包无独立 Prettier 配置
