# AiNeed 生产加固计划 (Production Hardening Plan)

> 目标：从 MVP 90/100 提升至生产就绪 95+/100
> 预估工期：2-4 周（取决于并行度和外部依赖）
> 前置条件：审计发现的所有 CRITICAL/HIGH 问题已修复

---

## Phase A: 编译健康 & 基础修复 (1-2 天)

### A-01 修复后端编译错误
- **文件**: `consultant.service.ts:784` — UserRole 枚举值 `"ADMIN"` → `"admin"` ✅ 已修复
- **验证**: `tsc --noEmit` 零错误

### A-02 修复移动端 154 个 TS 编译错误
- **根因**: `__tests__/phase1-onboarding.e2e.test.ts` 中 Detox matcher 语法错误（JSX/TSX 混淆导致正则解析失败）
- **修复**: 检查该文件是否有 `.tsx` 语法用在 `.ts` 文件中，或 Detox matcher 用法不正确
- **验证**: `tsc --noEmit` 零错误

### A-03 创建 k8s/ 目录和基础 manifests
- **原因**: `deploy.yml` 引用 `kubectl apply -f k8s/` 但目录不存在
- **内容**:
  - `k8s/namespace.yml`
  - `k8s/deployment.yml` (backend)
  - `k8s/service.yml`
  - `k8s/ingress.yml`
  - `k8s/configmap.yml`
  - `k8s/secrets.yml` (模板)
  - `k8s/hpa.yml` (HorizontalPodAutoscaler)

### A-04 修复 CI workflow 引用错误
- **文件**: `.github/workflows/test.yml` — `summary` job 引用 `needs.unit-mobile` 但实际 job ID 是 `unit-frontend`
- **修复**: 对齐 job ID

---

## Phase B: 测试加固 (3-5 天) — 最重要的阶段

### B-01 后端单元测试验证和补全
- **现状**: 65 个 .spec.ts 文件存在
- **任务**:
  1. 运行 `pnpm test:cov`，获取当前覆盖率基线
  2. 识别覆盖率低于 80% 的模块
  3. 优先补全以下关键模块的测试:
     - `payment.service.ts` (支付逻辑)
     - `consultant.service.ts` (预约/退款)
     - `recommendation-feed.service.ts` (推荐引擎)
     - `content-moderation.service.ts` (内容审核)
     - `customization.service.ts` (定制化)
  4. 目标：核心业务逻辑 ≥90%，整体 ≥80%

### B-02 后端集成测试补全
- **现状**: 3 个集成测试 (ai-stylist-flow, payment-flow, user-flow)
- **任务**: 补充以下关键流程:
  - `try-on-flow.e2e-spec.ts` — 虚拟试衣完整流程
  - `recommendation-flow.e2e-spec.ts` — 推荐引擎端到端
  - `consultant-booking-flow.e2e-spec.ts` — 顾问预约+支付+退款
  - `community-moderation-flow.e2e-spec.ts` — 内容发布+审核

### B-03 移动端测试修复和补全
- **现状**: 9 个测试文件，5 个单元 + 4 个 E2E
- **任务**:
  1. 修复 `phase1-onboarding.e2e.test.ts` 编译错误
  2. 创建 `detox.config.ts`（当前缺失）
  3. 补全核心 store 测试:
     - `recommendationStore.test.ts`
     - `tryOnStore.test.ts`
     - `communityStore.test.ts`
     - `paymentStore.test.ts`
  4. 补全 API client 测试:
     - `recommendationApi.test.ts`
     - `tryOnApi.test.ts`
     - `communityApi.test.ts`

### B-04 负载测试扩展
- **现状**: 3 个 k6 脚本 (auth, ai-stylist, config)
- **任务**: 补充:
  - `scenarios/recommendation-load.js` — 推荐接口并发
  - `scenarios/tryon-load.js` — 试衣队列吞吐
  - `scenarios/payment-load.js` — 支付并发
  - `scenarios/community-load.js` — 社区读写比
  - 设定 P99 延迟目标: API <200ms, 推荐 <500ms

---

## Phase C: 算法 & 推荐引擎加固 (3-5 天)

### C-01 SASRec 本地模型升级
- **现状**: 静态 64 维 embedding + 余弦相似度
- **方案**: 两种选择
  - **方案 A (推荐)**: 部署独立 Python SASRec 微服务（PyTorch），通过 `SASRecClientService` 调用
    - 需要训练数据（可由用户行为积累）
    - `SASREC_SERVICE_URL` 配置已有
  - **方案 B (快速)**: 保持当前简化版，在注释中标注为 "lightweight collaborative embedding recommender"
- **决策点**: 是否需要真正的序列推荐？MVP 阶段方案 B 足够

### C-02 协同过滤数据积累策略
- **现状**: 物化视图已建 (mv_user_similarity, mv_user_item_matrix, mv_item_cooccurrence)
- **任务**:
  1. 创建定时刷新物化视图的 cron job
  2. 设计用户行为埋点完整覆盖（浏览/收藏/购买/试穿/分享）
  3. 实现 `UserBehavior` 写入到物化视图的增量更新逻辑
  4. 内测期间积累足够数据后启用 CF 推荐

### C-03 LTR 权重自动调优
- **现状**: learning-to-rank.service.ts 有梯度下降训练，权重存 SystemConfig
- **任务**:
  1. 设计 A/B 测试框架（实验组 vs 对照组）
  2. 实现离线评估指标 (NDCG@10, MAP@10, Hit Rate@10)
  3. 定期自动 retrain 权重（每周）

---

## Phase D: 第三方集成加固 (5-7 天)

### D-01 支付网关对接
- **现状**: Alipay/WeChat API 完整实现，但无商户号
- **任务**:
  1. 申请支付宝开放平台商户号
  2. 申请微信支付商户号
  3. 配置 `.env.production` 中的真实密钥
  4. 联调沙箱环境 → 生产环境切换
  5. 实现支付对账定时任务（T+1 对账）
  6. 补全退款流程的幂等性保障

### D-02 微信/QQ 原生分享 SDK
- **现状**: `react-native-share` 通用方案，`wechat.ts` shareToWechat() 是空壳
- **任务**:
  1. 集成 `react-native-wechat-lib`（支持分享到朋友圈/好友）
  2. 实现 QQ 分享（`react-native-qq-sdk` 或 OpenSDK）
  3. 替换 `Share.tsx` 中的通用方案为平台特定调用
  4. 处理 iOS/Android 原生配置（URL Scheme、Universal Link）

### D-03 定制化 POD 供应商对接
- **现状**: `MockPODProvider` 完全模拟
- **方案**: 两种选择
  - **方案 A**: 对接飞特 (feite) 国内 POD 供应商
  - **方案 B**: 对接 Printful 国际 POD
  - **方案 C (推荐 MVP)**: 保留 Mock，但在 `PODService` 中实现基于环境变量的 provider 切换逻辑，预留接口
- **任务（方案 C）**:
  1. 修改 `pod-service.ts` 支持 `POD_PROVIDER` 环境变量切换
  2. 完善 `PODProvider` 接口定义
  3. 在 admin 面板添加 POD 配置管理

### D-04 虚拟试衣 API 容量保障
- **现状**: Doubao-Seedream API + GLM fallback
- **任务**:
  1. 实现 API 配额监控和告警
  2. 优化缓存策略（已有 generateStableCacheKey）
  3. 实现 Queue 优先级（付费用户优先）
  4. 降级方案完善：Seedream → GLM → 本地风格迁移

---

## Phase E: 安全加固 (2-3 天)

### E-01 安全审计复查
- **任务**:
  1. JWT Secret 生产环境强制 256 位随机生成
  2. AES 加密密钥轮换机制
  3. 所有 API 端点 Rate Limit 一致性检查
  4. SQL 注入风险扫描（Prisma 参数化查询验证）
  5. XSS 防护检查（用户输入 sanitize）
  6. CSRF Token 验证

### E-02 数据安全
- **任务**:
  1. 用户照片 AES-256-GCM 加密验证
  2. PII 数据字段加密（手机号、身份证）
  3. 日志脱敏（不记录 token、密钥、PII）
  4. 数据库连接 TLS/SSL 强制

### E-03 依赖安全扫描
- **任务**:
  1. `pnpm audit` 修复所有 high/critical 漏洞
  2. 配置 Dependabot / Renovate 自动更新
  3. SAST 集成到 CI pipeline

---

## Phase F: 运维 & 可观测性 (2-3 天)

### F-01 监控栈验证
- **现状**: infrastructure/ 下有 Prometheus + Grafana + Loki + AlertManager 配置
- **任务**:
  1. 验证 Grafana dashboard 可用性
  2. 配置关键告警规则:
     - API 错误率 >5%
     - 响应时间 P99 >1s
     - 支付失败率 >1%
     - 队列积压 >100
  3. 日志结构化（JSON format）
  4. 分布式追踪接入 (OpenTelemetry)

### F-02 部署流水线验证
- **任务**:
  1. 修复 test.yml job ID 引用
  2. 验证 staging 环境完整部署
  3. 验证 blue-green deployment 回滚机制
  4. 配置 Slack 通知渠道
  5. 数据库迁移前置检查

### F-03 数据库运维
- **任务**:
  1. Prisma migration 验证（所有迁移按序执行）
  2. 索引优化（慢查询分析）
  3. 备份策略（每日全量 + WAL 增量）
  4. 连接池配置优化

---

## Phase G: 文档 & 合规 (1-2 天)

### G-01 用户协议和隐私政策
- **任务**:
  1. 法律审核用户协议 (terms of service)
  2. 隐私政策 (privacy policy)
  3. 退款政策
  4. 顾问服务条款

### G-02 运维文档
- **任务**:
  1. 部署手册 (runbook)
  2. 故障排查手册
  3. API 文档完善 (Swagger/OpenAPI)
  4. 监控告警说明

---

## 优先级排序

| 优先级 | Phase | 工期 | 阻塞项 |
|--------|-------|------|--------|
| **P0 - 必须先做** | A (编译修复) | 1-2天 | 无 |
| **P0 - 必须先做** | E-03 (依赖安全) | 0.5天 | 无 |
| **P1 - 上线必需** | B (测试) | 3-5天 | Phase A |
| **P1 - 上线必需** | E-01/E-02 (安全) | 1.5天 | 无 |
| **P1 - 上线必需** | F-02 (部署验证) | 1天 | Phase A |
| **P2 - 上线前一周** | D-01 (支付对接) | 3天 | 商户号审批 |
| **P2 - 上线前一周** | D-04 (试衣容量) | 1天 | API 配额确认 |
| **P2 - 上线前一周** | F-01 (监控) | 1.5天 | 无 |
| **P3 - 上线后迭代** | C (算法升级) | 3-5天 | 用户行为数据 |
| **P3 - 上线后迭代** | D-02 (原生分享) | 2天 | SDK 申请 |
| **P3 - 上线后迭代** | D-03 (POD 对接) | 2天 | 供应商选择 |
| **P4 - 随时** | G (文档合规) | 1-2天 | 法律审核 |

---

## 执行方式

建议按以下并发模式执行：

```
Week 1: Phase A (编译) + E-03 (依赖扫描) → Phase B (测试) + E-01 (安全)
Week 2: Phase B (续) + F-01/F-02 (运维) + D-01 (支付对接)
Week 3: Phase C (算法) + D-02 (分享SDK) + G (文档)
Week 4: 全链路验证 + 压力测试 + 灰度发布
```

---

## 验收标准

- [ ] `tsc --noEmit` 后端 + 移动端零错误
- [ ] 测试覆盖率 ≥80%（核心模块 ≥90%）
- [ ] 所有 E2E 测试通过
- [ ] k6 负载测试: API P99 <200ms, 推荐 P99 <500ms
- [ ] `pnpm audit` 零 critical/high
- [ ] Staging 环境完整部署成功
- [ ] 支付沙箱联调通过
- [ ] 监控告警正常触发
