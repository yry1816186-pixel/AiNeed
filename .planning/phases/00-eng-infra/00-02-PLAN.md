---
wave: 1
depends_on: []
files_modified:
  - .eslintrc.json
  - apps/backend/.eslintrc.json
  - apps/mobile/.eslintrc.json
  - packages/types/.eslintrc.json
  - packages/shared/.eslintrc.json
  - package.json
autonomous: true
requirements: [ENGR-03]
---

# Plan 02: 统一 monorepo ESLint 配置

## Goal

创建根级 `.eslintrc.json` 作为 monorepo 共享 ESLint 基础配置，子包通过 `extends` 继承并添加各自特定规则，消除配置碎片化。

## Threat Model

| Attack Surface | Threat | Severity | Mitigation |
|---------------|--------|----------|------------|
| npm supply chain | @typescript-eslint 等依赖恶意更新 | Low | 锁定版本号，pnpm lockfile |
| ESLint config injection | 恶意 ESLint 插件执行任意代码 | Low | 仅使用知名官方/社区插件，审核依赖 |

## Context

当前 ESLint 配置现状（已验证）：

| 子包 | ESLint 版本 | 配置格式 | @typescript-eslint 版本 | 核心规则 |
|------|-----------|---------|----------------------|---------|
| backend | v8.57.0 | `.eslintrc.json` | ^8.0.0 | recommended-requiring-type-checking + import |
| mobile | v8.19.0 | `.eslintrc.json` | ^7 | expo + prettier + recommended |
| admin | v9.39.4 | `eslint.config.js` (flat) | ^8.30.1 | recommended + react-hooks |

**关键决策**：
1. Admin 使用 ESLint v9 flat config，与 backend/mobile 的 v8 `.eslintrc` 不兼容。**保持 admin 独立**，不强制迁移到 v8。
2. 根级 `.eslintrc.json` 使用 ESLint v8 格式，backend 和 mobile 通过 `extends` 继承。
3. 统一 `@typescript-eslint` 版本为 `^8.0.0`（backend 已使用，mobile 需升级）。

## Tasks

### Task 02-01: 安装根级 ESLint 共享依赖

<read_first>
- package.json
- apps/backend/package.json
- apps/mobile/package.json
</read_first>

<action>
在根 `package.json` 的 `devDependencies` 中添加（通过 `pnpm add -D -w` 安装）：

1. `eslint@^8.57.0`
2. `@typescript-eslint/eslint-plugin@^8.0.0`
3. `@typescript-eslint/parser@^8.0.0`
4. `eslint-config-prettier@^10.1.0`
5. `eslint-plugin-import@^2.31.0`
6. `eslint-import-resolver-typescript@^3.10.0`

这些依赖安装到 workspace root，子包通过 pnpm hoisting 访问。

注意：mobile 的 `@typescript-eslint` 需从 `^7` 升级到 `^8`。在 mobile 的 `package.json` 中将 `@typescript-eslint/eslint-plugin` 和 `@typescript-eslint/parser` 的版本改为 `^8.0.0`。
</action>

<acceptance_criteria>
- `package.json` 的 `devDependencies` 包含 `"eslint"`, `"@typescript-eslint/eslint-plugin"`, `"@typescript-eslint/parser"`, `"eslint-config-prettier"`, `"eslint-plugin-import"`, `"eslint-import-resolver-typescript"`
- `apps/mobile/package.json` 的 `devDependencies` 中 `@typescript-eslint/eslint-plugin` 版本为 `^8.0.0`
- `apps/mobile/package.json` 的 `devDependencies` 中 `@typescript-eslint/parser` 版本为 `^8.0.0`
- `pnpm install` 成功退出
</acceptance_criteria>

---

### Task 02-02: 创建根级 .eslintrc.json 共享配置

<read_first>
- apps/backend/.eslintrc.json
- apps/mobile/.eslintrc.json
</read_first>

<action>
在项目根目录创建 `.eslintrc.json` 文件，内容为：

```json
{
  "root": true,
  "env": {
    "es2022": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"],
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  },
  "ignorePatterns": [
    "node_modules",
    "dist",
    "build",
    "coverage",
    "*.js",
    "*.d.ts",
    ".expo",
    "0/"
  ]
}
```

说明：
- 这是**基础共享配置**，包含所有子包都应遵守的通用规则
- `no-explicit-any` 保持 `warn`（Phase 1 会升级为 `error`）
- `ignorePatterns` 包含 `0/` 目录（项目中的 Node.js 缓存目录）
- 不包含 `recommended-requiring-type-checking`，因为需要 `parserOptions.project`，由需要类型检查的子包自行添加
</action>

<acceptance_criteria>
- `.eslintrc.json` 文件存在
- 文件内容包含 `"root": true`
- 文件内容包含 `"plugin:@typescript-eslint/recommended"` 在 extends 中
- 文件内容包含 `"prettier"` 在 extends 中
- 文件内容包含 `"@typescript-eslint/no-explicit-any": "warn"`
- 文件内容包含 `"0/"` 在 ignorePatterns 中
- 在根目录运行 `npx eslint --print-config .eslintrc.json` 不报错
</acceptance_criteria>

---

### Task 02-03: 更新 backend .eslintrc.json 继承根配置

<read_first>
- .eslintrc.json (根级，Task 02-02 创建)
- apps/backend/.eslintrc.json
</read_first>

<action>
修改 `apps/backend/.eslintrc.json`，使其继承根配置并添加 backend 特有规则：

```json
{
  "root": true,
  "extends": [
    "../../.eslintrc.json",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/recommended",
    "plugin:import/typescript"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.eslint.json"
  },
  "plugins": ["@typescript-eslint", "import"],
  "settings": {
    "import/resolver": {
      "typescript": {
        "alwaysTryTypes": true,
        "project": "./tsconfig.eslint.json"
      }
    }
  },
  "rules": {
    "@typescript-eslint/prefer-optional-chain": "warn",
    "@typescript-eslint/no-floating-promises": "warn",
    "@typescript-eslint/no-misused-promises": "warn",
    "@typescript-eslint/no-unsafe-member-access": "warn",
    "@typescript-eslint/no-unsafe-assignment": "warn",
    "@typescript-eslint/no-unsafe-argument": "warn",
    "@typescript-eslint/no-unsafe-call": "warn",
    "@typescript-eslint/no-unsafe-return": "warn",
    "@typescript-eslint/no-unsafe-enum-comparison": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/unbound-method": "off",
    "@typescript-eslint/no-base-to-string": "off",
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-require-imports": "warn",
    "@typescript-eslint/no-namespace": "warn",
    "@typescript-eslint/no-unnecessary-type-assertion": "warn",
    "@typescript-eslint/prefer-promise-reject-errors": "warn",
    "@typescript-eslint/no-redundant-type-constituents": "warn",
    "@typescript-eslint/no-unsafe-function-type": "warn",
    "@typescript-eslint/no-this-alias": "warn",
    "@typescript-eslint/await-thenable": "warn",
    "import/export": "warn",
    "import/order": [
      "warn",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ],
    "import/no-unresolved": "error",
    "import/no-duplicates": "error",
    "import/no-cycle": "warn"
  },
  "ignorePatterns": [
    "node_modules",
    "dist",
    "build",
    "*.js",
    "*.d.ts",
    "coverage"
  ]
}
```

关键变化：
- `extends` 中将 `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `prettier` 替换为 `"../../.eslintrc.json"`（继承根配置）
- 保留 `recommended-requiring-type-checking` 和 `import` 插件作为 backend 特有
- 保留所有 backend 特有的规则覆盖
- 移除与根配置重复的 `env`, `parser`, 通用 `rules`（如 `no-explicit-any`, `no-unused-vars`, `prefer-const` 等）
</action>

<acceptance_criteria>
- `apps/backend/.eslintrc.json` 的 `extends` 数组第一项为 `"../../.eslintrc.json"`
- `apps/backend/.eslintrc.json` 不再包含 `"eslint:recommended"` 在 extends 中
- `apps/backend/.eslintrc.json` 不再包含 `"plugin:@typescript-eslint/recommended"` 在 extends 中（因为从根配置继承）
- `apps/backend/.eslintrc.json` 仍包含 `"plugin:@typescript-eslint/recommended-requiring-type-checking"`
- `apps/backend/.eslintrc.json` 仍包含 `"plugin:import/recommended"`
- 在 `apps/backend` 目录运行 `pnpm lint` 成功退出（允许有 warnings）
</acceptance_criteria>

---

### Task 02-04: 更新 mobile .eslintrc.json 继承根配置

<read_first>
- .eslintrc.json (根级，Task 02-02 创建)
- apps/mobile/.eslintrc.json
</read_first>

<action>
修改 `apps/mobile/.eslintrc.json`，使其继承根配置并添加 mobile 特有规则：

```json
{
  "root": true,
  "extends": [
    "../../.eslintrc.json",
    "expo",
    "plugin:react/recommended"
  ],
  "plugins": ["@typescript-eslint", "react"],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "import/export": "off",
    "import/namespace": "off",
    "import/no-duplicates": "off"
  },
  "ignorePatterns": [
    "node_modules",
    ".expo",
    "dist",
    "coverage",
    "*.config.js",
    "src/types/navigation.d.ts"
  ]
}
```

关键变化：
- `extends` 中将 `plugin:@typescript-eslint/recommended` 和 `prettier` 替换为 `"../../.eslintrc.json"`（继承根配置）
- 保留 `expo` 配置（React Native 特有规则）
- 添加 `plugin:react/recommended`（React 规则）
- 移除 `prettier` 插件（已从根配置继承 `eslint-config-prettier`）
- 移除与根配置重复的通用规则
- 移除 `eslint-plugin-prettier`（使用 `eslint-config-prettier` 即可，不需要运行 prettier 作为 eslint 规则）
</action>

<acceptance_criteria>
- `apps/mobile/.eslintrc.json` 的 `extends` 数组包含 `"../../.eslintrc.json"`
- `apps/mobile/.eslintrc.json` 的 `extends` 数组包含 `"expo"`
- `apps/mobile/.eslintrc.json` 不再包含 `"plugin:@typescript-eslint/recommended"` 在 extends 中
- `apps/mobile/.eslintrc.json` 不再包含 `"prettier"` 在 extends 中
- 在 `apps/mobile` 目录运行 `pnpm lint` 成功退出（允许有 warnings）
</acceptance_criteria>

---

### Task 02-05: 为 packages 添加 ESLint 支持

<read_first>
- packages/types/package.json
- packages/shared/package.json
- .eslintrc.json (根级)
</read_first>

<action>
1. 在 `packages/types/package.json` 的 `scripts` 中添加：
   - `"lint": "eslint \"src/**/*.ts\""`

2. 在 `packages/shared/package.json` 的 `scripts` 中添加：
   - `"lint": "eslint \"src/**/*.ts\""`

3. 在 `packages/types/` 目录创建 `.eslintrc.json`：
   ```json
   {
     "root": true,
     "extends": ["../../.eslintrc.json"]
   }
   ```

4. 在 `packages/shared/` 目录创建 `.eslintrc.json`：
   ```json
   {
     "root": true,
     "extends": ["../../.eslintrc.json"]
   }
   ```

这些包只需继承根配置，不需要额外规则。
</action>

<acceptance_criteria>
- `packages/types/package.json` 的 `scripts` 包含 `"lint"`
- `packages/shared/package.json` 的 `scripts` 包含 `"lint"`
- `packages/types/.eslintrc.json` 存在且 `extends` 包含 `"../../.eslintrc.json"`
- `packages/shared/.eslintrc.json` 存在且 `extends` 包含 `"../../.eslintrc.json"`
- 在 `packages/types` 目录运行 `pnpm lint` 成功退出
- 在 `packages/shared` 目录运行 `pnpm lint` 成功退出
</acceptance_criteria>

---

### Task 02-06: 添加根级 typecheck 脚本

<read_first>
- package.json
- apps/backend/package.json
- apps/mobile/package.json
- apps/admin/package.json
</read_first>

<action>
1. 在 `apps/backend/package.json` 的 `scripts` 中添加：
   - `"typecheck": "tsc --noEmit"`

2. 在 `apps/admin/package.json` 的 `scripts` 中添加：
   - `"typecheck": "tsc --noEmit"`

3. 在根 `package.json` 的 `scripts` 中添加：
   - `"typecheck": "pnpm -r --parallel run typecheck"`

注意：mobile 已有 `"typecheck": "tsc --noEmit"` 脚本，无需修改。packages/types 和 packages/shared 没有 `noEmit` 配置，暂不添加 typecheck。
</action>

<acceptance_criteria>
- `package.json` 的 `scripts` 包含 `"typecheck": "pnpm -r --parallel run typecheck"`
- `apps/backend/package.json` 的 `scripts` 包含 `"typecheck"`
- `apps/admin/package.json` 的 `scripts` 包含 `"typecheck"`
- 在根目录运行 `pnpm typecheck` 成功退出（允许有类型错误，后续 Phase 修复）
</acceptance_criteria>

## Verification

1. `pnpm -r run lint` — 所有子包 lint 通过（允许 warnings）
2. `pnpm typecheck` — 所有子包 typecheck 运行
3. 根级 `.eslintrc.json` 的规则被 backend 和 mobile 正确继承
4. admin 的 `eslint.config.js` 保持不变，独立运行

## must_haves

- 根级 `.eslintrc.json` 存在，包含通用 ESLint 规则
- backend 和 mobile 通过 `extends` 继承根配置
- admin 保持独立 ESLint v9 flat config
- `pnpm -r run lint` 在所有子包成功运行
- `pnpm typecheck` 在根目录运行所有子包的类型检查
