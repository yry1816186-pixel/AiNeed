# 寻裳 XunO — 容量规划与自动扩展指南

## 1. 基础设施基线

基于 `docker-compose.production.yml` 的资源配置（总预算 8GB）。

| 服务              | 内存上限   | CPU 上限 | 内存预留 | CPU 预留 | 说明                       |
| ----------------- | ---------- | -------- | -------- | -------- | -------------------------- |
| postgres          | 1500M      | 2.0      | 512M     | 0.5      | 主数据库                   |
| redis             | 512M       | 1.0      | 128M     | 0.25     | 缓存 + 队列                |
| minio             | 512M       | 1.0      | 128M     | 0.25     | 对象存储                   |
| qdrant            | 3072M      | 2.0      | 512M     | 0.5      | 向量数据库（最大内存消耗） |
| vault             | 128M       | 0.5      | 32M      | 0.1      | 密钥管理                   |
| ai-service        | 768M       | 2.0      | 256M     | 0.25     | Python AI 服务             |
| backend           | 512M       | 1.0      | 128M     | 0.25     | NestJS 后端                |
| prometheus        | 512M       | 1.0      | 128M     | 0.25     | 指标采集                   |
| grafana           | 256M       | 0.5      | 64M      | 0.1      | 监控面板                   |
| loki              | 256M       | 0.5      | 64M      | 0.1      | 日志聚合                   |
| promtail          | 128M       | 0.25     | 32M      | 0.1      | 日志采集                   |
| postgres-exporter | 64M        | 0.25     | 16M      | 0.1      | PG 指标导出                |
| redis-exporter    | 64M        | 0.25     | 16M      | 0.1      | Redis 指标导出             |
| node-exporter     | 64M        | 0.25     | 16M      | 0.1      | 主机指标导出               |
| cadvisor          | 128M       | 0.25     | 32M      | 0.1      | 容器指标导出               |
| **总计**          | **~8.5GB** | —        | —        | —        | 15 个服务                  |

### 后端容量估算

- Backend: 512M 内存 / 单实例
- 单请求 AI 对话平均内存: ~5-10MB（含 GLM API 调用等待）
- 估算并发上限: **50 并发用户**（含 AI 对话 + 推荐 + 试穿混合负载）
- AI Service: 768M / 单实例，估算 **20 并发 AI 任务**

## 2. Auto-Scale Triggers（扩展触发条件）

### Scale Up（增加实例）

| 触发条件     | 阈值 | 持续时间 | 动作                       |
| ------------ | ---- | -------- | -------------------------- |
| CPU 使用率   | >70% | 5 分钟   | 自动扩展 1 个 backend 实例 |
| 内存使用率   | >80% | 5 分钟   | 告警 + 人工确认            |
| 请求延迟 P95 | >3s  | 3 分钟   | 告警 + 建议扩展            |
| 错误率       | >10% | 2 分钟   | 紧急告警，人工介入         |

### Scale Down（缩减实例）

| 触发条件     | 阈值   | 持续时间 | 动作             |
| ------------ | ------ | -------- | ---------------- | ----------------- |
| CPU 使用率   | <30%   | 10 分钟  | 所有实例         | 自动缩减 1 个实例 |
| 请求延迟 P95 | <500ms | 15 分钟  | 满足条件时可缩减 |

### 紧急扩展

- **错误率 >10% 持续 2 分钟** → 触发 PagerDuty 告警，人工介入
- **预扩展窗口**: 在已知流量高峰前 30 分钟提前扩展（如 11:30 为午间高峰预热）

## 3. 容量上限

### 单实例基准

| 指标         | 单实例值 | 说明                                  |
| ------------ | -------- | ------------------------------------- |
| 最大并发用户 | 50       | backend 512M + AI service 768M        |
| AI 对话 QPS  | ~10      | 受 GLM API 响应时间限制（~2-5s/请求） |
| 推荐 QPS     | ~50      | 缓存命中率高（Redis 180s TTL）        |
| 试穿 QPS     | ~5       | 受限 fal.ai + GLM 调用                |

### 多实例扩展

| 实例数        | 并发用户 | 预估 P95 延迟 | 备注                     |
| ------------- | -------- | ------------- | ------------------------ |
| 1x            | 50       | <2s           | 单实例，无 HA            |
| **2x (推荐)** | **100**  | **<1.5s**     | **高可用，最低生产配置** |
| 3x            | 150      | <1.2s         | 中等负载                 |
| 5x            | 250      | <1s           | 高负载                   |

> **推荐**: 生产环境至少 2 个 backend 实例实现高可用。数据库和向量数据库不需要水平扩展，垂直扩展即可。

## 4. Cost Model（成本模型）

基于国内云服务器（阿里云/腾讯云 2C8G 实例）估算。

| 实例数  | 月成本（估算） | 并发用户 | P95 延迟 | 适用场景  |
| ------- | -------------- | -------- | -------- | --------- |
| 1x      | ¥500-800       | 50       | <2s      | 开发/测试 |
| 2x (HA) | ¥1,000-1,500   | 100      | <1.5s    | 生产推荐  |
| 5x      | ¥2,500-3,500   | 250      | <1s      | 高峰期    |

### 成本优化建议

- AI API 调用是最大可变成本（GLM-4-Flash 免费层 + Qwen fallback）
- Redis 缓存命中率目标 >80%，可显著减少 AI 调用
- 非高峰期缩减至 2x 实例
- Qdrant 向量数据库独占 3GB，确保 collection 大小合理

## 5. Rate Limiting 策略（生产环境）

| 端点                            | 分钟限流   | 日配额                           | 来源                     |
| ------------------------------- | ---------- | -------------------------------- | ------------------------ |
| `POST /ai-stylist/chat`         | 20 req/min | `AI_STYLIST_DAILY_LIMIT=50`      | @Throttle + AiQuotaGuard |
| `POST /ai-stylist/dialog/chat`  | 20 req/min | 50/day                           | @Throttle + AiQuotaGuard |
| `POST /try-on`                  | 10 req/min | `TRY_ON_DAILY_LIMIT=10`          | @Throttle + AiQuotaGuard |
| `GET /recommendations`          | 20 req/min | `RECOMMENDATION_DAILY_LIMIT=100` | @Throttle                |
| `GET /recommendations/trending` | 20 req/min | 无                               | @Throttle (Public)       |

负载测试验证: 当配额耗尽时，API 返回 HTTP 429 状态码。

## 6. 运行负载测试

```bash
# 基础运行（本地）
k6 run scripts/load-test/load-test.js -e BASE_URL=http://localhost:3001

# 使用认证 token
k6 run scripts/load-test/load-test.js \
  -e BASE_URL=http://localhost:3001 \
  -e TEST_AUTH_TOKEN=your-jwt-token

# 仅运行推荐场景
k6 run scripts/load-test/load-test.js \
  -e BASE_URL=http://localhost:3001 \
  --exec recommendationFlow

# 输出 JSON 报告
k6 run scripts/load-test/load-test.js \
  -e BASE_URL=http://localhost:3001 \
  --out json=results.json
```

### 验证要点

- [ ] P95 延迟: chat <2s, recommendations <1s
- [ ] 错误率 <5%（含 429 rate limit 响应）
- [ ] 429 在配额耗尽后正确返回
- [ ] 无 5xx 错误（服务稳定性）

## 7. 环境变量参考

```env
# 容量规划相关（.env.production）
CAPACITY_MAX_CONCURRENT_USERS=50
CAPACITY_CPU_SCALE_UP_THRESHOLD=0.7
CAPACITY_CPU_SCALE_DOWN_THRESHOLD=0.3
CAPACITY_AUTO_SCALE_ENABLED=false
```

---

_文档版本: 2026-04-29_
_相关文件: `docker-compose.production.yml`, `scripts/load-test/`, `.env.production`_
