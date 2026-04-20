# 任务01: 修复3个CRITICAL安全问题

## 你的角色

你是寻裳(AiNeed)项目的安全工程师。项目位于 C:\AiNeed，是 pnpm monorepo。

## 背景

安全审计发现3个CRITICAL问题，不修就不能上线。

## 任务清单

### 1. 添加Nginx反向代理配置

在项目根目录创建 `infra/nginx/nginx.conf`：

```nginx
upstream backend {
    server backend:3001;
}

upstream minio_api {
    server minio:9000;
}

server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # 安全头
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Metrics (仅内网)
    location /metrics {
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
        proxy_pass http://backend;
    }

    # MinIO (如需客户端直传)
    location /minio/ {
        proxy_pass http://minio_api/;
        proxy_set_header Host $host;
        client_max_body_size 50m;
    }

    location / {
        return 404;
    }
}
```

### 2. 修复 docker-compose.production.yml 端口暴露

读取 `docker-compose.production.yml`，做以下修改：

- **所有服务的 ports 改为 expose**（仅Docker内部网络可达），除了Nginx的443/80
- 具体需要改的服务：
  - Vault: `ports: "8200:8200"` → `expose: ["8200"]`
  - Backend: `ports: "3001:3001"` → `expose: ["3001"]`（通过Nginx代理）
  - Prometheus: `ports: "9090:9090"` → `expose: ["9090"]`
  - Grafana: `ports: "3002:3000"` → `expose: ["3000"]`
  - 所有 exporter: 同理改为 expose

### 3. API密钥改用Docker Secrets

在 docker-compose.production.yml 中：

- 将所有 `_API_KEY` 环境变量从明文改为 `file:` 引用
- 创建 `infra/secrets/` 目录，放入各密钥文件（模板）
- 具体变量：
  - `OPENAI_API_KEY` → `file: ./infra/secrets/openai_api_key.txt`
  - `GLM_API_KEY` → `file: ./infra/secrets/glm_api_key.txt`
  - `ZHIPU_API_KEY` → `file: ./infra/secrets/zhipu_api_key.txt`

创建 `infra/secrets/.gitkeep` 和 `infra/secrets/README.md` 说明密钥文件格式（每文件一行，纯密钥值）。

### 4. 修复移动端API密钥字段

读取 `apps/mobile/.env.example`，找到所有 `EXPO_PUBLIC_` 开头的密钥字段并移除。移动端不应直接持有任何API密钥，所有AI调用应通过后端代理。

同时检查代码中是否有直接使用这些变量的地方，改为调用后端API。

## 验证标准

- [ ] nginx.conf 创建并配置正确
- [ ] docker-compose.production.yml 中除Nginx外所有服务改为 expose
- [ ] infra/secrets/ 目录创建，README.md 说明格式
- [ ] 移动端 .env.example 无 EXPO*PUBLIC*\*\_KEY 字段
- [ ] git diff 确认改动正确
