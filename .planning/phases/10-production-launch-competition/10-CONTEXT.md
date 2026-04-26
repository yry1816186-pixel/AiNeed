# Phase 10: Production + Launch + Competition - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 delivers production deployment, app store listing, offline capability, and competition materials submission:

1. **生产部署** — 4C8G 腾讯云服务器 + Docker Compose + .cn 域名 + ICP 备案 + Nginx TLS
2. **Android 商店上架** — 小米先行 → 华为/OPPO/vivo 跟上，4 家商店全覆盖
3. **离线能力** — WatermelonDB 缓存 50 条推荐 + 衣橱 + 日历，离线时明确提示 + 部分功能可用
4. **比赛材料** — 三层叙事 PPT + 录屏配音 Demo 视频 + 模拟种子用户数据 + 指导老师推荐信
5. **负载测试 + 安全审计** — 验证生产环境稳定性

验证标准：Nginx + TLS + 监控告警活跃；离线模式可浏览缓存数据；负载测试无降级；App 在 2+ Android 商店上架；比赛材料全部提交

</domain>

<decisions>
## Implementation Decisions

### 生产部署

- **D-01:** 4C8G 腾讯云轻量应用服务器 — Docker Compose 单机部署，适配比赛 demo + 早期种子用户。各容器 memory limit 需压缩至 production.yml 定义值的 50%
- **D-02:** .cn 域名 + ICP 备案 — 使用 xuno.cn 或类似 .cn 域名，立即启动 ICP 备案（需 1-3 周）。Nginx TLS 配置需更新域名
- **D-03:** Docker Compose 生产部署 — 复用现有 docker-compose.production.yml，调整以下配置：
  - 所有服务 memory limit 压缩 50%（适配 8G 总内存）
  - 后端 replica 从 2 降至 1（单机部署）
  - Qdrant memory 限制从 8G 降至 3G
  - Prometheus retention 从 30d 降至 7d
  - 监控栈（Prometheus + Grafana + Loki）保留，是比赛技术深度展示亮点
- **D-04:** AI 推理走远程 API — GLM-4-Flash（免费）+ Edge-TTS，不部署本地 GPU 推理。AI service 容器仅做编排和向量检索

### Android 商店上架

- **D-05:** 小米先行 → 华为/OPPO/vivo — 小米审核最宽松（3-5 天），通过后同步提交其余 3 家。降低返工风险
- **D-06:** 上架前置条件 — 软著（Phase 6 已准备材料）+ ICP 备案 + 各商店开发者账号注册 + 应用签名
- **D-07:** app-store-metadata.json 需转换为各商店格式 — 华为 .agp / 小米 .apk + metadata / OPPO .apk + metadata / vivo .apk + metadata。已有 iOS 格式需完全重写为 Android 格式
- **D-08:** 截图策略 — 6 张截图覆盖：AI 造型师推荐 / 试穿效果 / 每日推荐流 / 风格测试 / 购物推荐 / 个人中心，需适配各商店分辨率要求

### 离线能力

- **D-09:** WatermelonDB — 选择 WatermelonDB 作为离线存储方案，支持：
  - 表结构建模（推荐缓存表、衣橱表、日历表）
  - 复杂查询（按场景筛选、按日期查询）
  - 数据迁移（schema 版本管理）
- **D-10:** 离线数据范围：
  - 推荐缓存：50 条最新推荐（含 items + outfit + explanation）
  - 衣橱数据：savedOutfits + wishlistedItems + purchasedItems
  - 日历数据：7 天穿搭计划
  - 用户 Profile：基本信息 + 偏好设置
- **D-11:** 离线 UX — 顶部 toast 显示"离线模式" + 禁用需要网络的操作（试穿/AI 对话/分享）+ 缓存数据正常浏览
- **D-12:** 数据同步策略 — 网络恢复时自动同步：
  - 推荐缓存：后台刷新，用户无感知
  - 衣橱数据：双向同步（离线保存 → 上线后同步到服务端）
  - 日历数据：拉取最新方案

### 比赛材料

- **D-13:** 三层叙事 PPT — Phase 5 已验证的叙事主线：
  - 第一层：体验革命 — "打开 App 即获穿搭方案"的核心体验壁垒
  - 第二层：面试穿搭 Agent — 完整 Agent 对话 + 6 层漏斗 + 包容性设计
  - 第三层：包容性设计 — 性别降级 + 体型正向语言 + 多样性约束
- **D-14:** 录屏 + 配音 Demo 视频 — 1-3 分钟，使用 Phase 5 demo script，展示完整面试穿搭 Agent 流程
- **D-15:** 模拟种子用户数据 — 生成 5-10 个模拟用户行为数据（注册 →Onboarding→ 推荐 → 对话 → 试穿 → 保存），包含满意度评分和留存指标
- **D-16:** 指导老师推荐信 — 需用户提供指导老师信息和推荐信内容方向

### 负载测试 + 安全审计

- **D-17:** 负载测试 — 使用 k6 或 Artillery 进行压测，通过标准：
  - 50 并发用户下 P95 延迟 < 2s
  - 100 并发用户下 API 无 5xx 错误
  - AI 对话端点 P95 < 5s
- **D-18:** 安全审计 — OWASP Top 10 快速扫描 + 依赖漏洞检查（npm audit + pip audit），无 CRITICAL 级别漏洞

### 执行优先级

- **D-19:** 全部并行 — 比赛 PPT/视频、部署、商店上架、离线能力同时推进，使用多 agent 并发处理
  - Wave 1: 部署脚本 + 离线能力实现 + PPT 初稿 + 视频脚本
  - Wave 2: 商店材料准备 + 视频录制 + 模拟数据生成
  - Wave 3: 压测 + 审计 + 材料提交

### Claude's Discretion

- 腾讯云服务器具体购买和初始化流程
- ICP 备案的具体步骤和材料清单
- WatermelonDB schema 设计（表结构、关联关系）
- 离线同步的冲突解决策略
- 各 Android 商店的具体审核要求和提交流程
- PPT 模板选择和视觉风格
- Demo 视频的录制工具和后期处理
- 模拟种子用户数据的具体格式和内容
- 负载测试的具体场景设计
- Nginx rate limiting 的具体阈值

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 部署基础设施

- `docker-compose.production.yml` — 完整生产 Docker Compose（12 个服务，需压缩 memory limit）
- `infrastructure/nginx/nginx.conf` — Nginx TLS 配置（108 行，需更新域名）
- `k8s/deployment.yml` — K8s 部署配置（参考，不作为主方案）
- `k8s/secrets.yml` — K8s secrets（参考 Docker Secrets 方案）
- `docs/deployment/environment-variables.md` — 环境变量文档
- `docs/deployment/api-keys-setup.md` — API 密钥配置

### 监控告警

- `monitoring/prometheus/prometheus.yml` — Prometheus 配置（已有 5 个 scrape target）
- `monitoring/alerts/alert.rules.yml` — 告警规则（Critical + Warning 两级）
- `monitoring/grafana/provisioning/` — Grafana 数据源和仪表盘配置
- `monitoring/promtail/config.yml` — 日志收集配置
- `infrastructure/grafana/dashboards/` — Grafana 仪表盘 JSON

### 商店上架

- `docs/app-store/app-store-metadata.json` — iOS 格式 metadata（需转换为 Android 格式）
- `docs/app-store/aso-keywords.md` — ASO 关键词
- `docs/app-store/google-play-metadata.json` — Google Play metadata（参考格式）
- `docs/app-store/privacy-checklist.md` — 隐私合规检查清单

### 合规文档

- `docs/software-copyright/application.md` — 软著申请材料
- `docs/software-copyright/software-manual.md` — 软件说明书
- `docs/software-copyright/source-code-excerpt.md` — 源代码文档

### 比赛 Demo

- `docs/demo-script.md` — Phase 5 Demo 脚本（3 分钟面试穿搭流程）
- `docs/国赛作品设计和开发文档_正式版.md` — 国赛作品设计文档
- `docs/PRESENTATION/` — PPT 相关材料

### 项目级

- `docs/XUNO_FINAL_PLAN.md` — 42 冻结决策（#19 互联网+ 5-6 月校赛、#41 软著+商标）
- `.planning/REQUIREMENTS.md` — PRD-01~05
- `.planning/phases/05-e2e-integration-competition-demo/05-CONTEXT.md` — Phase 5 比赛策略
- `.planning/phases/06-model-upgrade-compliance-security/06-CONTEXT.md` — Phase 6 安全加固决策

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `docker-compose.production.yml`: 完整 12 服务生产配置 — 直接复用，压缩 memory limit
- `nginx.conf`: TLS 1.2/1.3 + security headers + 3 upstream — 仅需更新域名和 rate limiting
- `prometheus.yml` + `alert.rules.yml`: 7 个监控目标 + Critical/Warning 告警 — 直接复用
- `app-store-metadata.json`: 应用描述、关键词、截图策略 — 转换为 Android 格式
- `demo-script.md`: 3 分钟 Demo 脚本 — 直接用于视频录制
- `software-copyright/application.md`: 软著材料 — 可复用为商店上架凭证

### Established Patterns

- Docker Compose 服务编排: 健康检查 + 依赖顺序 + 资源限制
- Nginx 反向代理: upstream + proxy_pass + security headers
- Prometheus + Grafana 监控: scrape → alert → dashboard
- React Native + Expo 移动端: TypeScript + feature-based 架构
- NestJS 后端: 域驱动 + RESTful + Prisma ORM

### Integration Points

- 域名 DNS → 腾讯云 IP → Nginx 443 → 后端 3001
- Mobile App → Nginx /api/ → Backend → AI Service → GLM API
- WatermelonDB ← Network status hook → Online: fetch from API / Offline: read from local DB
- App signing key → 各 Android 商店审核 → 用户下载安装
- PPT/视频/文档 → 比赛平台提交

</code_context>

<specifics>
## Specific Ideas

- 腾讯云轻量应用服务器选择：4C8G + 80G SSD + 5M 带宽，预估 ~100 元/月
- .cn 域名首年 ~30 元，ICP 备案需企业或个人身份证 + 域名证书 + 服务器信息
- 小米开发者账号免费注册，华为需个人/企业实名认证
- PPT 建议用 WPS 或 PowerPoint，三层叙事 + 品牌色暖驼色系
- Demo 视频用 OBS 录屏 + 剪映配音，输出 MP4 格式
- 模拟数据生成脚本：创建 10 个虚拟用户，每个跑完整流程，记录行为事件 + 满意度评分
- 离线模式 toast 用暖橘色 #E17055（品牌强调色），与在线状态区分

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope
</deferred>

---

_Phase: 10-production-launch-competition_
_Context gathered: 2026-04-26_
