# Project State

**Project:** 寻裳 XunO
**Updated:** 2026-05-05T05:09Z

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-05)

**Core value:** 伊伊（AI 造型师）通过自然对话理解用户需求，精准推荐穿搭方案

**Current milestone:** Renovation v1 — 系统性改造（治理 → 清理 → 依赖 → 平台 → UI → 动效 → 回归）

## Phase Status

| Phase | Name     | Status      | Progress |
| ----- | -------- | ----------- | -------- |
| 0     | 基线确认 | ✓ Complete  | 100%     |
| 1     | 治理底座 | ○ Pending   | 0%       |
| 1.5   | 文件清理 | ○ Pending   | 0%       |
| 2     | 依赖治理 | ○ Pending   | 0%       |
| 3     | 平台评估 | In Progress | 100%     |
| 4     | 平台升级 | ○ Pending   | 0%       |
| 5     | UI 审计  | ○ Pending   | 0%       |
| 6     | UI 落地  | ○ Pending   | 0%       |
| 7     | 动效落地 | ○ Pending   | 0%       |
| 8     | 回归验证 | ○ Pending   | 0%       |

## Previous Milestones (Archived)

| #   | Name         | Phases | Status     |
| --- | ------------ | ------ | ---------- |
| M1  | Core Product | 1-6    | ✓ Complete |

## Current Focus

Phase 3: 平台评估 — Wave 2 完成 (03-02)，工具链升级方案 + 行为变更评估 + 稳定性风险报告已生成。

**Next action:** Phase 3 全部完成，推进 Phase 4 (平台升级) 或 Phase 5 (UI 审计)

## Decisions

| Decision                                                      | Rationale                                                      | Date       |
| ------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| Phase 0-8 分批改造                                            | 先治理再改造，零业务侵入，每 phase 可验证可回滚                | 2026-05-05 |
| JDK 17/Gradle 8.11.1/AGP 8.9.1/Kotlin 1.9.25 保持不变         | API 36 不要求工具链强制升级，仅 buildToolsVersion 需对齐       | 2026-05-05 |
| Kotlin K2 迁移标记为高风险延后项                              | 项目 Kotlin 代码仅 56 行但 RN 框架兼容性未确认                 | 2026-05-05 |
| 16KB 页面兼容性 + foregroundServiceType 为 Phase 4 最高优先级 | 2 个 Critical 风险需在平台升级前验证                           | 2026-05-05 |
| 零业务侵入原则                                                | 禁止修改鉴权/支付/订单/AI/数据库/权限/核心业务                 | 2026-05-05 |
| 先审计再计划再修改再验证                                      | 禁止一上来直接改代码                                           | 2026-05-05 |
| 先识别分类 → 加入忽略 → 验证无引用 → 分批删除                 | 文件清理四轮制                                                 | 2026-05-05 |
| 预处理缓存端点未认证                                          | 初始化期间由预热脚本调用                                       | 2026-04-29 |
| TTS 预缓存 with HTTP fallback                                 | 优先调用自身端点，离线时本地缓存标记                           | 2026-04-29 |
| 预缓存 mock 推荐数据                                          | 真实 AI 流水线需要完整会话上下文                               | 2026-04-29 |
| ScreenErrorBoundaries.ts 集中配置                             | 单文件维护各屏幕 ErrorBoundary 配置                            | 2026-04-29 |
| Today/Discover exports 转换                                   | 更清晰的懒加载集成，无需 navigator 中 .then() 重映射           | 2026-04-29 |
| 引导步骤屏幕各自 ErrorBoundary                                | 细粒度崩溃隔离                                                 | 2026-04-29 |
| Demo 开关在 SettingsScreen Developer 区域                     | 仅 DEV 暴露，长按版本号彩蛋兜底                                | 2026-04-29 |
| Seed profiles 编译时常量                                      | Demo 性能零 I/O 开销                                           | 2026-04-29 |
| Demo API 拦截器 mock+block 模式                               | 读取返回缓存，写入在 demo 模式下阻止                           | 2026-04-29 |
| AiFallbackService: 直连 HTTP GLM→Qwen                         | 明确优先级链，每层可配置 5s 超时                               | 2026-04-29 |
| TTS text-only fallback + status 字段                          | 返回 TtsFallbackResult，audio_unavailable 用于移动端 UI 控制   | 2026-04-29 |
| E2E runner 使用 check()/record_result() 模式                  | 与已有 demo 脚本保持一致                                       | 2026-04-29 |
| 3-gate pre-run 验证，不同退出码                               | 2=preflight fail, 3=warmup fail, 1=checks fail, 0=all pass     | 2026-04-29 |
| FashionSigLIP-only ML pipeline                                | 移除所有 FashionCLIP fallback 和引用                           | 2026-04-29 |
| Diversity scorer: entropy 40% + style 35% + price 25%         | 推荐多样性可观测性的 3 指标加权评分                            | 2026-04-29 |
| Bias audit threshold <0.2 for 10 profiles                     | 从 <0.3 收紧以确保 >0.8 多样性                                 | 2026-04-29 |
| 双速率限制: @Throttle burst + AiQuotaGuard daily              | AI 端点每分钟突发保护 + 每日配额                               | 2026-04-29 |
| pnpm audit 推迟到有网络的环境                                 | 中国内地 npmjs.org 超时；overrides 提供补偿控制                | 2026-04-29 |
| 策划 YAML spec 与自动生成 JSON                                | 人类可读 YAML（含速率限制文档）+ 机器生成 JSON                 | 2026-04-29 |
| Swagger UI 已正确环境门控                                     | main.ts 中 NODE_ENV gate 已验证                                | 2026-04-29 |
| HighErrorRate threshold 生产环境 5%                           | Plan 规范；初始生产启动 1% 过于激进                            | 2026-04-29 |
| AI quota 面板同时显示超限事件 + 总调用率                      | 双指标视图提供配额管理运营上下文                               | 2026-04-29 |
| 保留领域特定告警 + 标准告警                                   | BruteForceDetected, TryOnServiceDown, PaymentFailureSpike 保留 | 2026-04-29 |
| Pre-cache endpoint unauthenticated                            | 预热脚本调用时无需认证                                         | 2026-04-29 |
| k6 scenario imports 重命名避免递归                            | runChatFlow/runRecommendationFlow/runTryonFlow 防止名称遮蔽    | 2026-04-29 |
| 2x 后端实例推荐生产 HA                                        | 单实例无故障转移；2x 提供基本高可用                            | 2026-04-29 |
| migrate-db.sh 使用 prisma migrate diff                        | 比解析状态输出更可靠                                           | 2026-04-29 |
| Rollback with optional --with-db-restore flag                 | 从数据库恢复中分离镜像回退                                     | 2026-04-29 |

---

_State updated: 2026-05-05 after Phase 3 Plan 02 completion_
