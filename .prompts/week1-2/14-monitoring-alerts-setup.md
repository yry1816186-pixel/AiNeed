# 任务14: 监控告警规则 + Grafana Dashboard配置

## 你的角色

寻裳(AiNeed)项目的DevOps工程师。项目位于 C:\AiNeed。

## 背景

docker-compose.production.yml 引用了监控配置文件路径但文件不存在，需要创建。

## 必读文件

1. `docker-compose.production.yml` — 找到所有volume挂载的监控配置路径
2. `apps/backend/src/domains/platform/metrics/metrics.service.ts` — 已有的Prometheus指标

## 任务

### 1. 创建 Prometheus 配置

创建 `monitoring/prometheus/prometheus.yml`：

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "/etc/prometheus/alerts/*.rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

scrape_configs:
  - job_name: "backend"
    metrics_path: /metrics
    static_configs:
      - targets: ["backend:3001"]
    scrape_interval: 10s

  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: "postgres-exporter"
    static_configs:
      - targets: ["postgres-exporter:9187"]

  - job_name: "redis-exporter"
    static_configs:
      - targets: ["redis-exporter:9121"]

  - job_name: "cadvisor"
    static_configs:
      - targets: ["cadvisor:8080"]
```

### 2. 创建告警规则

创建 `monitoring/alerts/alert.rules.yml`：

```yaml
groups:
  - name: critical
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "API 5xx错误率超过1%"
          description: "当前5xx错误率 {{ $value | humanizePercentage }}"

      - alert: DatabaseConnectionPoolHigh
        expr: pg_stat_activity_count > 80
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL连接数过高"

      - alert: BruteForceDetected
        expr: rate(auth_failed_total[1m]) > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "检测到暴力破解攻击"

  - name: warning
    rules:
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API P95延迟超过2秒"

      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
        for: 5m
        labels:
          severity: warning

      - alert: AIApiLatency
        expr: histogram_quantile(0.95, rate(ai_service_duration_seconds_bucket[5m])) > 10
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "AI API P95延迟超过10秒"

      - alert: TryOnFailureRate
        expr: rate(try_on_failed_total[10m]) / rate(try_on_requests_total[10m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "虚拟试穿失败率超过10%"

      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "磁盘空间不足20%"
```

### 3. 创建 Grafana 数据源配置

创建 `monitoring/grafana/provisioning/datasources/datasource.yml`：

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
```

### 4. 创建 Grafana Dashboard配置

创建 `monitoring/grafana/provisioning/dashboards/dashboard.yml`：

```yaml
apiVersion: 1
providers:
  - name: "default"
    orgId: 1
    folder: ""
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /etc/grafana/provisioning/dashboards/json
      foldersFromFilesStructure: false
```

### 5. 创建核心 Dashboard JSON

创建 `monitoring/grafana/provisioning/dashboards/json/aineed-overview.json`：

这是一个Grafana Dashboard JSON。包含以下面板：

**Row 1: 核心业务指标**

- DAU (Daily Active Users): `count(increase(user_behavior_events_total[24h]))`
- 新注册用户: `increase(user_registrations_total[24h])`
- 推荐CTR: `rate(recommendation_clicks_total[1h]) / rate(recommendation_views_total[1h])`
- 试穿次数: `increase(try_on_completed_total[24h])`
- 当日GMV: `increase(order_revenue_total[24h])`

**Row 2: API性能**

- QPS: `rate(http_requests_total[1m])`
- P50/P95/P99延迟: `histogram_quantile(0.5/0.95/0.99, rate(http_request_duration_seconds_bucket[5m]))`
- 5xx错误率: `rate(http_requests_total{status=~"5.."}[5m])`

**Row 3: AI服务**

- AI API调用量: `rate(ai_service_calls_total[5m])`
- AI延迟P95: `histogram_quantile(0.95, rate(ai_service_duration_seconds_bucket[5m]))`
- 试穿成功率: `rate(try_on_completed_total[5m]) / rate(try_on_requests_total[5m])`

**Row 4: 基础设施**

- CPU使用率: `process_cpu_seconds_total`
- 内存使用: `process_resident_memory_bytes`
- PostgreSQL连接数: `pg_stat_activity_count`
- Redis命中率: `rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))`

Dashboard JSON格式示例（写完整的一个）：

```json
{
  "annotations": { "list": [] },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 0,
  "links": [],
  "panels": [
    {
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "fieldConfig": {
        "defaults": {
          "color": { "mode": "thresholds" },
          "thresholds": {
            "steps": [
              { "color": "red", "value": null },
              { "color": "green", "value": 100 }
            ]
          },
          "unit": "short"
        }
      },
      "gridPos": { "h": 4, "w": 5, "x": 0, "y": 0 },
      "id": 1,
      "title": "DAU",
      "type": "stat",
      "targets": [
        {
          "expr": "count(count_over_time({app=\"backend\"} |=\"userId\" [24h]))",
          "datasource": { "type": "loki", "uid": "loki" },
          "refId": "A"
        }
      ]
    }
  ],
  "schemaVersion": 39,
  "tags": ["aineed"],
  "templating": { "list": [] },
  "time": { "from": "now-1h", "to": "now" },
  "title": "AiNeed Overview",
  "uid": "aineed-overview",
  "version": 1
}
```

请创建完整的Dashboard JSON，包含上述所有面板（至少16个面板）。

### 6. 创建 Promtail 配置

创建 `monitoring/promtail/promtail.yml`：

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ["__meta_docker_container_name"]
        target_label: "container"
      - source_labels: ["__meta_docker_container_log_stream"]
        target_label: "stream"
```

## 验证标准

- [ ] monitoring/prometheus/prometheus.yml 创建
- [ ] monitoring/alerts/alert.rules.yml 创建，包含6+条告警规则
- [ ] monitoring/grafana/provisioning/datasources/datasource.yml 创建
- [ ] monitoring/grafana/provisioning/dashboards/dashboard.yml 创建
- [ ] aineed-overview.json 创建，包含16+面板
- [ ] monitoring/promtail/promtail.yml 创建
- [ ] 所有YAML/JSON格式正确
