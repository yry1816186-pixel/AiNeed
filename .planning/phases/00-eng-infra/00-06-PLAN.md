---
wave: 3
depends_on: [PLAN-04, PLAN-05]
files_modified:
  - .github/workflows/ci.yml
  - .github/workflows/code-quality.yml
autonomous: true
requirements: [ENGR-07]
---

# Plan 06: 建立 CI 流水线（lint + typecheck + test 门禁）

## Goal

增强现有 CI 流水线，集成 Turborepo 缓存、收紧 `continue-on-error`、确保 PR 门禁严格执行 lint + typecheck + test。

## Threat Model

| Attack Surface | Threat | Severity | Mitigation |
|---------------|--------|----------|------------|
| CI injection | workflow 文件修改引入特权升级 | Medium | 限制 workflow 修改权限，PR 来自 fork 不触发 secrets |
| Supply chain | Actions 版本被劫持 | Medium | 使用 SHA pinning 或锁定 major version |
| Cache poisoning | Turborepo 缓存被污染 | Low | 使用分支隔离的缓存 key |
| Token leakage | GITHUB_TOKEN 泄露 | Low | 使用最小权限原则 |

## Context

现有 CI 状态（已验证）：

**`ci.yml`**：
- lint + typecheck + test + build + e2e 流水线已存在
- `lint` job 仅检查 backend，未覆盖 mobile/admin/packages
- `typecheck` 分为 3 个 job（backend, mobile, admin），较完善
- `test-backend` 依赖 lint + typecheck，有 PostgreSQL + Redis 服务
- 无 Turborepo 缓存

**`code-quality.yml`**：
- ESLint/Prettier/TypeScript/Audit/CodeQL/SonarCloud 检查
- **多个 `continue-on-error: true`**，降低了门禁效果
- 无 Turborepo 缓存

**需要增强的点**：
1. lint job 覆盖所有子包（使用 `turbo lint`）
2. 添加 Turborepo 缓存到 CI
3. 收紧 `continue-on-error`（仅保留合理的容忍项）
4. 添加 PR 合并门禁（required checks）

## Tasks

### Task 06-01: 增强 ci.yml — 集成 Turborepo 缓存和全包 lint

<read_first>
- .github/workflows/ci.yml
- turbo.json
- package.json
</read_first>

<action>
修改 `.github/workflows/ci.yml`，主要变更如下：

1. **在 `env` 部分添加**：
   ```yaml
   TURBO_VERSION: '2'
   ```

2. **修改 `lint` job**：
   - 将 `Lint Backend` step 改为：
     ```yaml
     - name: Lint All Packages
       run: pnpm turbo lint
     ```

3. **修改 `typecheck` job**：
   - 将 `TypeCheck Backend` step 改为：
     ```yaml
     - name: TypeCheck All Packages
       run: pnpm turbo typecheck
     ```
   - 删除 `mobile-typecheck` 和 `admin-typecheck` 单独的 job（合并到 `typecheck` job 中）

4. **在每个需要 install 的 job 中添加 Turborepo 缓存**（在 `Install dependencies` step 之后）：
   ```yaml
   - name: Cache Turborepo
     uses: actions/cache@v4
     with:
       path: .turbo
       key: turbo-${{ runner.os }}-${{ github.sha }}
       restore-keys: turbo-${{ runner.os }}-
   ```

5. **修改 `test-backend` job**：
   - 将 `Run Backend Tests` step 改为：
     ```yaml
     - name: Run Backend Tests
       run: pnpm turbo test --filter=@xuno/backend
     ```

6. **修改 `build-backend` job**：
   - 将 `Build Backend` step 改为：
     ```yaml
     - name: Build All Packages
       run: pnpm turbo build
     ```

7. **更新 `ci-summary` job 的 `needs`**：
   移除 `mobile-typecheck` 和 `admin-typecheck`（已合并），保留 `lint, typecheck, ml-lint, security, test-backend, build-backend, e2e`。

8. **修改 `ci-summary` 的 `Check CI Status` step**：
   检查所有 needs 的 result，任何一个 failure 则 exit 1。

注意：不要删除 `ml-lint` 和 `security` job，它们是独立的检查。
</action>

<acceptance_criteria>
- `.github/workflows/ci.yml` 的 `lint` job 运行 `pnpm turbo lint`（不再仅 lint backend）
- `.github/workflows/ci.yml` 的 `typecheck` job 运行 `pnpm turbo typecheck`（合并了 3 个 typecheck job）
- `.github/workflows/ci.yml` 包含 Turborepo 缓存配置（`path: .turbo`）
- `.github/workflows/ci.yml` 不再包含 `mobile-typecheck` 和 `admin-typecheck` 单独 job
- `.github/workflows/ci.yml` 的 `ci-summary` needs 不包含 `mobile-typecheck` 和 `admin-typecheck`
</acceptance_criteria>

---

### Task 06-02: 收紧 code-quality.yml 的 continue-on-error

<read_first>
- .github/workflows/code-quality.yml
</read_first>

<action>
修改 `.github/workflows/code-quality.yml`，收紧 `continue-on-error`：

1. **`eslint` job**：
   - `Run ESLint - Backend` step：移除 `continue-on-error: true`（ESLint 错误应阻止合并）
   - `Run ESLint - Frontend (Mobile)` step：移除 `continue-on-error: true`
   - `Annotate PR with ESLint errors` step：保留 `continue-on-error: true`（注解是辅助功能，不应阻止 CI）

2. **`prettier` job**：
   - `Check Formatting` step：移除 `continue-on-error: true`（格式不一致应阻止合并）

3. **`audit` job**：
   - `Run Security Audit` step：保留 `continue-on-error: true`（审计发现不应阻止日常开发，但应在后续处理）
   - `Run npm audit for detailed report` step：保留 `continue-on-error: true`

4. **`sonarcloud` job**：
   - `SonarCloud Scan` step：保留 `continue-on-error: true`（SonarCloud 可能因 token 缺失而失败，不应阻止 CI）

5. **`unused-deps` job**：
   - `Check Unused Dependencies - Backend` step：保留 `continue-on-error: true`（depcheck 误报较多）
   - `Check Unused Dependencies - Mobile` step：保留 `continue-on-error: true`

6. **`bundle-size` job**：
   - 保留 `continue-on-error: true`

7. **`quality-summary` job**：
   - 修改 `Quality Gate` step，将 ESLint 和 Prettier 结果纳入门禁：
     ```yaml
     - name: Quality Gate
       run: |
         if [[ "${{ needs.eslint.result }}" == "failure" ]]; then
           echo "ESLint check failed - quality gate failed!"
           exit 1
         fi
         if [[ "${{ needs.prettier.result }}" == "failure" ]]; then
           echo "Prettier check failed - quality gate failed!"
           exit 1
         fi
         if [[ "${{ needs.typescript.result }}" == "failure" ]]; then
           echo "TypeScript check failed - quality gate failed!"
           exit 1
         fi
         echo "Code quality checks completed!"
     ```
</action>

<acceptance_criteria>
- `.github/workflows/code-quality.yml` 的 `eslint` job 中 `Run ESLint - Backend` step 不包含 `continue-on-error: true`
- `.github/workflows/code-quality.yml` 的 `eslint` job 中 `Run ESLint - Frontend (Mobile)` step 不包含 `continue-on-error: true`
- `.github/workflows/code-quality.yml` 的 `prettier` job 中 `Check Formatting` step 不包含 `continue-on-error: true`
- `.github/workflows/code-quality.yml` 的 `quality-summary` job 的 `Quality Gate` step 检查 eslint 和 prettier 结果
- `.github/workflows/code-quality.yml` 的 `audit` job 仍保留 `continue-on-error: true`
</acceptance_criteria>

---

### Task 06-03: 添加 Turborepo 缓存到 code-quality.yml

<read_first>
- .github/workflows/code-quality.yml
</read_first>

<action>
在 `code-quality.yml` 的 `eslint`、`prettier`、`typescript` job 中添加 Turborepo 缓存（在 `Install dependencies` step 之后）：

```yaml
- name: Cache Turborepo
  uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-quality-${{ runner.os }}-${{ github.sha }}
    restore-keys: turbo-quality-${{ runner.os }}-
```

同时修改 `eslint` job 的 ESLint 运行命令：
- `Run ESLint - Backend` 改为 `pnpm turbo lint --filter=@xuno/backend`
- `Run ESLint - Frontend (Mobile)` 改为 `pnpm turbo lint --filter=@xuno/mobile`

修改 `typescript` job 的类型检查命令：
- `TypeScript Check - Backend` 改为 `pnpm turbo typecheck --filter=@xuno/backend`
- `TypeScript Check - Frontend (Mobile)` 改为 `pnpm turbo typecheck --filter=@xuno/mobile`
</action>

<acceptance_criteria>
- `.github/workflows/code-quality.yml` 的 `eslint` job 包含 Turborepo 缓存 step
- `.github/workflows/code-quality.yml` 的 `prettier` job 包含 Turborepo 缓存 step
- `.github/workflows/code-quality.yml` 的 `typescript` job 包含 Turborepo 缓存 step
- ESLint 命令使用 `pnpm turbo lint` 格式
- TypeScript 命令使用 `pnpm turbo typecheck` 格式
</acceptance_criteria>

---

### Task 06-04: 添加 PR 合并门禁说明

<read_first>
- .github/workflows/ci.yml
- .github/workflows/code-quality.yml
</read_first>

<action>
此任务为文档/配置任务，不修改代码文件。

在 GitHub 仓库设置中，需要配置以下 required checks（通过 GitHub UI 或 API）：

1. **ci.yml** 的 required checks：
   - `Lint`
   - `TypeCheck`
   - `Test Backend`
   - `Build Backend`
   - `CI Summary`

2. **code-quality.yml** 的 required checks：
   - `ESLint`
   - `Prettier Check`
   - `TypeScript Check`
   - `Quality Summary`

由于无法通过文件修改配置 GitHub branch protection rules，此任务仅记录需要配置的 required checks 列表。

在 `.github/workflows/ci.yml` 文件顶部添加注释：

```yaml
# CI Pipeline - Required Checks for PR merge:
# - Lint
# - TypeCheck
# - Test Backend
# - Build Backend
# - CI Summary
#
# Configure in: GitHub Settings > Branches > Branch protection rules > main
```
</action>

<acceptance_criteria>
- `.github/workflows/ci.yml` 文件顶部包含 `Required Checks for PR merge` 注释
- 注释列出了 `Lint`, `TypeCheck`, `Test Backend`, `Build Backend`, `CI Summary`
</acceptance_criteria>

## Verification

1. 推送一个 PR，验证 CI 流水线运行 lint + typecheck + test
2. 验证 Turborepo 缓存在第二次 CI 运行时命中
3. 验证 ESLint/Prettier 错误会阻止 CI 通过
4. 验证 `ci-summary` 和 `quality-summary` 正确汇总所有检查结果

## must_haves

- CI 流水线在 PR 上运行 lint + typecheck + test
- Turborepo 缓存生效，二次构建速度提升
- ESLint 和 Prettier 错误阻止 CI 通过（无 `continue-on-error`）
- `ci-summary` 和 `quality-summary` 正确反映门禁状态
