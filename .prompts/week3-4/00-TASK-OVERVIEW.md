# AiNeed Week 3-4 任务总览

> 生成日期: 2026-04-21 | 共 16 个任务 | 可用 Trae 多开并行执行

## 执行顺序与依赖关系

### 第一批（无依赖，可全部并行）:

| #   | 提示词文件                                 | 任务                                      | 预估时间 |
| --- | ------------------------------------------ | ----------------------------------------- | -------- |
| 01  | `01-fix-ts-module-paths.md`                | 修复 27 个模块路径错误                    | 15min    |
| 02  | `02-fix-clothing-category-enum.md`         | 修复 ClothingCategory 枚举冲突            | 20min    |
| 03  | `03-fix-recommendation-services-types.md`  | 修复推荐服务缺失字段                      | 15min    |
| 04  | `04-fix-social-security-commerce-types.md` | 修复 social/security/commerce 模块        | 20min    |
| 05  | `05-fix-all-ts-errors-batch.md`            | **综合版**: 一次性修完所有 138 个 TS 错误 | 40min    |
| 12  | `12-fashion-rules-fix.md`                  | 时尚分析专业错误修复（Python/JSON）       | 15min    |
| 14  | `14-security-audit-and-env.md`             | 安全审计 + 环境变量检查                   | 10min    |
| 16  | `16-admin-dashboard-compile.md`            | Admin 管理面板编译修复                    | 10min    |

**建议**: 05 是综合版，包含 01-04 的所有内容。如果只用一个 Trae 窗口修 TS 错误，用 05。如果多开，用 01+02+03+04 分别执行。

### 第二批（依赖第一批完成）:

| #   | 提示词文件                        | 任务               | 依赖              | 预估时间 |
| --- | --------------------------------- | ------------------ | ----------------- | -------- |
| 06  | `06-backend-integration-test.md`  | 后端端到端联调     | 01-05 TS 修复完成 | 30min    |
| 07  | `07-python-ml-services.md`        | Python ML 服务联调 | 无强依赖          | 30min    |
| 08  | `08-mobile-app-fixes.md`          | 移动端编译修复     | 无强依赖          | 30min    |
| 10  | `10-database-seed-and-schema.md`  | 数据库种子数据完善 | 无强依赖          | 20min    |
| 11  | `11-mobile-critical-screens.md`   | 移动端关键页面 UI  | 08 移动端编译通过 | 30min    |
| 13  | `13-backend-test-and-coverage.md` | 后端测试运行修复   | 06 后端联调通过   | 30min    |

### 第三批（依赖第二批完成）:

| #   | 提示词文件                              | 任务             | 依赖         | 预估时间 |
| --- | --------------------------------------- | ---------------- | ------------ | -------- |
| 09  | `09-recommendation-pipeline-connect.md` | 推荐系统管道接通 | 06+10+13     | 60min    |
| 15  | `15-deployment-and-monitoring.md`       | 部署准备 + 监控  | 所有编译通过 | 30min    |

## 并行执行建议（Trae 多开方案）

**窗口 1**: `05-fix-all-ts-errors-batch.md` → 修完所有后端 TS 错误
**窗口 2**: `12-fashion-rules-fix.md` → 修 Python/JSON 时尚规则
**窗口 3**: `14-security-audit-and-env.md` → 安全审计
**窗口 4**: `07-python-ml-services.md` → Python ML 联调
**窗口 5**: `08-mobile-app-fixes.md` → 移动端编译修复
**窗口 6**: `16-admin-dashboard-compile.md` → Admin 编译
**窗口 7**: `10-database-seed-and-schema.md` → 种子数据

第一批全部完成后 → 启动第二批

**窗口 1**: `06-backend-integration-test.md`
**窗口 2**: `11-mobile-critical-screens.md`
**窗口 3**: `13-backend-test-and-coverage.md`

第二批完成后 → 启动第三批

**窗口 1**: `09-recommendation-pipeline-connect.md`
**窗口 2**: `15-deployment-and-monitoring.md`

## Phase 1 已完成项（本窗口已修复）

- [x] P0-1: 恢复 .lintstagedrc.json 的 eslint 步骤
- [x] P0-2: HeartRecommendScreen Math.random → 确定性 shuffle
- [x] P0-3: Git 工作区确认干净（0 未提交文件）
- [x] P0-4: 引号不匹配扫描 — 无问题
- [x] P0-5: pnpm install 完成
- [x] P1-8: Prisma schema 验证通过

## 验收标准

每个提示词任务完成后，回到本窗口（Claude Code）执行验收:

1. `tsc --noEmit` 零错误
2. 后端能启动
3. API 端点正常响应
4. 移动端编译通过
