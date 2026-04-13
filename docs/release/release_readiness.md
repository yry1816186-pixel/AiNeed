# Release Readiness

发布日期评估时间：2026-03-10

## 结论

结论：**阻断发布（BLOCKER）**

判定原因：
- P0 未清零
- P1 未清零
- 核心链路自动化验证不完整
- Web 生产构建在当前审计环境未形成稳定成功证据
- 移动端 APK 无法在当前环境完成构建安装回归

## 阶段结论

### A. 项目基线与环境
- 技术栈：
  - `apps/backend`：NestJS + Prisma
  - `apps/mobile`：Expo / React Native，仓库自带 `android/`
- 版本基线：
  - 期望 Node：`.nvmrc` 为 `20.11.0`
  - 当前 Node：`22.22.0`
  - pnpm：`8.15.0`
  - Java / javac / adb：当前 Linux PATH 缺失
- 依赖基线：
  - 冻结锁安装成功

### B. 逐文件彻查
- 已生成 `docs/audit/file_review_matrix.md`
- 覆盖范围：`575` 个 source/config/workflow 文件
- 审查方式：
  - 全量文件枚举 + 规则扫描
  - 高风险文件人工深审

### C. 质量与架构
- Backend 高风险 mock/fallback 主链路已大幅收敛
- 移动端 UI/theme 类型层仍存在广泛历史缺陷，未达发布标准

### D. 算法与业务逻辑
- 已修复冷启动推荐的随机打分
- 已修复 recommendation pipeline 的伪成功返回
- 仍缺少足够的关键链路自动化测试与 coverage 证据

### E. 安全与合规
- 已完成 `pnpm audit --prod --registry=https://registry.npmjs.org`
- 结果：`15 vulnerabilities`，其中 `11 high`
- License 清单已导出，主流为 `MIT/ISC/Apache-2.0`
- 仍有 `Unknown` 许可证包：`pause`、`spawn-command`

### F. 性能与稳定性
- 缺少可接受的关键性能数据与稳定的错误监控闭环

### G. APK / 发布专项
- 仓库具备 Android 原生产物链路
- release 签名配置已修复
- 当前环境缺少 Java/adb，无法本地完成 assemble/install/smoke
- 结论：Android 方向同样阻断发布

## 门禁核对

| 门禁项 | 目标 | 当前结果 | 结论 |
| --- | --- | --- | --- |
| P0 = 0 | 必须满足 | 未满足 | fail |
| P1 = 0 | 必须满足 | 未满足 | fail |
| 核心链路测试全部通过 | 必须满足 | 未满足 | fail |
| 生产构建通过 | 必须满足 | Backend 通过；Mobile 未验证 | fail |
| 安全高危项为 0 | 必须满足 | 未满足（11 high） | fail |
| 法务与隐私页面可访问 | 必须满足 | 页面已在仓内，仍需结合最终部署回归 | partial |
| APK 可安装可运行 | 若包含 Android 必须满足 | 未满足 | fail |

## 已通过项

- `pnpm --filter @xuno/backend build`
- `node scripts/audit/generate-file-review-matrix.mjs`
- `pnpm licenses list --json`

## 阻断项最小修复路径

1. 修复 `apps/mobile` 全量 TypeScript 错误，要求 `pnpm --dir apps/mobile exec tsc --noEmit` 通过。
2. 在可控环境中完成 Android toolchain 安装，执行 `assembleDebug/assembleRelease/install/smoke`。
3. 清零 `pnpm audit --prod --registry=https://registry.npmjs.org` 的 high 项，至少处理 `multer`、`nodemailer`、`tar/glob`。
4. 补齐核心业务链路自动化测试与 coverage 证据。
