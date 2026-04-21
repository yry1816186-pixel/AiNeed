# 任务: 部署准备与监控配置

## 项目路径

C:\AiNeed

## 步骤

### 1. Docker 构建测试

```bash
cd /c/AiNeed
docker-compose -f docker-compose.production.yml config 2>&1
```

检查:

- 所有 service 定义完整
- 镜像构建路径正确
- 健康检查配置存在
- 资源限制设置合理

### 2. 后端构建测试

```bash
cd /c/AiNeed/apps/backend
npx nest build 2>&1 | tail -20
```

确保构建成功，dist/ 目录生成。

### 3. Nginx 配置

如果 `docker-compose.production.yml` 引用了 Nginx:

- 确认 nginx.conf 存在
- TLS 证书路径配置（先用自签名证书测试）
- 反向代理到 backend 的配置
- WebSocket 代理配置（聊天功能需要）
- 静态资源缓存配置

创建基本的 nginx.conf:

```nginx
upstream backend {
    server backend:3000;
}

server {
    listen 443 ssl;
    server_name api.xuno.app;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name api.xuno.app;
    return 301 https://$host$request_uri;
}
```

### 4. Prometheus + Grafana 配置

检查 `docker-compose.observability.yml`:

```bash
cat /c/AiNeed/docker-compose.observability.yml
```

确保:

- Prometheus 配置文件存在 (prometheus.yml)
- Grafana dashboard 配置存在
- 后端的 /metrics 端点配置正确
- 告警规则配置

创建基本的告警规则 (alert.rules.yml):

```yaml
groups:
  - name: backend_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
```

### 5. 移动端 APK 构建

```bash
cd /c/AiNeed/apps/mobile
# 确保 app.json/app.config.js 配置正确
cat app.json | head -30
# 或
cat app.config.js | head -30

# EAS 构建 (推荐)
# npx eas-cli build --platform android --profile preview

# 本地构建
# npx expo run:android
```

### 6. 输出

- docker-compose 验证结果
- 构建成功/失败状态
- 需要创建的配置文件列表
- 监控面板状态
