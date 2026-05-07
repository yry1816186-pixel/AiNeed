# 内部服务 TLS 配置指南

本文档说明如何为 Xuneed 平台的内部服务配置 TLS 加密通信。

---

## 1. 概述

### 1.1 架构图

```
┌─────────────┐     HTTPS      ┌─────────────┐
│   Backend   │◄──────────────►│    MinIO     │
│  (Node.js)  │                │  (Storage)   │
└──────┬──────┘                └─────────────┘
       │
       │ HTTPS                ┌─────────────┐
       ├─────────────────────►│   Qdrant    │
       │                      │  (Vector DB) │
       │                      └─────────────┘
       │
       │ HTTPS                ┌─────────────┐
       └─────────────────────►│ AI Service  │
                              │  (Python)   │
                              └─────────────┘
```

### 1.2 证书文件结构

```
certs/
├── ca.crt                    # CA 根证书
├── ca.key                    # CA 私钥（仅生成时使用）
├── generate-certs.sh         # 证书生成脚本
├── minio/
│   ├── minio.crt             # MinIO 服务证书
│   └── minio.key             # MinIO 私钥
├── qdrant/
│   ├── qdrant.crt            # Qdrant 服务证书
│   └── qdrant.key            # Qdrant 私钥
└── ai-service/
    ├── ai-service.crt        # AI 服务证书
    └── ai-service.key        # AI 服务私钥
```

---

## 2. 证书生成

### 2.1 自动生成（推荐）

```bash
# 交互式模式（可自定义 SAN）
bash certs/generate-certs.sh

# 非交互式模式（使用默认 SAN）
bash certs/generate-certs.sh --quiet
```

### 2.2 手动生成

#### 生成 CA 证书

```bash
# 生成 CA 私钥
openssl genrsa -out certs/ca.key 4096

# 生成自签名 CA 证书
openssl req -x509 -new -nodes \
  -key certs/ca.key \
  -sha256 -days 3650 \
  -out certs/ca.crt \
  -subj "/C=CN/ST=Internal/O=XUNO Internal/CN=XUNO Internal CA"
```

#### 生成服务证书

以 MinIO 为例：

```bash
# 创建目录
mkdir -p certs/minio

# 生成私钥
openssl genrsa -out certs/minio/minio.key 2048

# 创建 SAN 扩展配置
cat > certs/minio/san.ext <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = CN
ST = Internal
O = XUNO Internal
CN = minio.internal

[v3_req]
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = DNS:minio,DNS:localhost,IP:127.0.0.1
EOF

# 生成 CSR
openssl req -new -key certs/minio/minio.key -out certs/minio/minio.csr \
  -subj "/C=CN/ST=Internal/O=XUNO Internal/CN=minio.internal" \
  -config certs/minio/san.ext

# 使用 CA 签发证书
openssl x509 -req -in certs/minio/minio.csr \
  -CA certs/ca.crt -CAkey certs/ca.key -CAcreateserial \
  -out certs/minio/minio.crt -days 3650 -sha256 \
  -extfile certs/minio/san.ext -extensions v3_req

# 清理临时文件
rm -f certs/minio/minio.csr certs/minio/san.ext
```

---

## 3. 服务配置

### 3.1 Backend ↔ MinIO TLS

#### 环境变量配置

```bash
# .env 或 docker-compose 环境变量
MINIO_USE_SSL=true
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
```

#### Docker Compose 配置

```yaml
minio:
  image: minio/minio:RELEASE.2024-11-07T00-52-20Z
  container_name: stylemind-minio
  environment:
    MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
    MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
  volumes:
    - minio_data:/data
    - ./certs/minio:/root/.minio/certs:ro # 挂载证书
  command: server /data --console-address ":9001"
  healthcheck:
    test: ["CMD-SHELL", "curl -fk https://localhost:9000/minio/health/live"]
    interval: 30s
    timeout: 20s
    retries: 3

backend:
  environment:
    MINIO_USE_SSL: "true"
    NODE_EXTRA_CA_CERTS: /certs/ca.crt # 信任自签名 CA
  volumes:
    - ./certs/ca.crt:/certs/ca.crt:ro
```

#### Node.js 客户端配置

```typescript
// src/common/storage/minio.config.ts
import { Client } from "minio";
import { ConfigService } from "@nestjs/config";

export const createMinioClient = (configService: ConfigService): Client => {
  const useSSL = configService.get("MINIO_USE_SSL") === "true";

  return new Client({
    endPoint: configService.get("MINIO_ENDPOINT", "minio"),
    port: parseInt(configService.get("MINIO_PORT", "9000")),
    useSSL: useSSL,
    accessKey: configService.get("MINIO_ACCESS_KEY"),
    secretKey: configService.get("MINIO_SECRET_KEY"),
    // 自签名证书需要设置 NODE_EXTRA_CA_CERTS 环境变量
  });
};
```

### 3.2 Backend ↔ Qdrant TLS

#### 环境变量配置

```bash
# .env 或 docker-compose 环境变量
QDRANT_URL=https://qdrant:6333
QDRANT_ENABLE_TLS=true
```

#### Docker Compose 配置

```yaml
qdrant:
  image: qdrant/qdrant:v1.12.1
  container_name: stylemind-qdrant
  environment:
    QDRANT__LOG_LEVEL: INFO
    QDRANT__SERVICE__ENABLE_TLS: "true"
    QDRANT__TLS__CERT: /qdrant/certs/qdrant.crt
    QDRANT__TLS__KEY: /qdrant/certs/qdrant.key
  volumes:
    - qdrant_data:/qdrant/storage
    - ./certs/qdrant:/qdrant/certs:ro
  healthcheck:
    test: ["CMD-SHELL", "bash -lc 'exec 3<>/dev/tcp/127.0.0.1/6333'"]
    interval: 30s
    timeout: 10s
    retries: 3

backend:
  environment:
    QDRANT_URL: "https://qdrant:6333"
    NODE_EXTRA_CA_CERTS: /certs/ca.crt
```

#### Node.js 客户端配置

```typescript
// src/common/vector-db/qdrant.config.ts
import { QdrantClient } from "@qdrant/js-client-rest";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";

export const createQdrantClient = (configService: ConfigService): QdrantClient => {
  const url = configService.get("QDRANT_URL", "http://qdrant:6333");
  const tlsEnabled = url.startsWith("https://");

  const options: any = { url };

  if (tlsEnabled) {
    // 自签名证书配置
    const certPath = configService.get("TLS_CERT_DIR", "/certs");
    options.tls = {
      ca: fs.readFileSync(path.join(certPath, "ca.crt")),
    };
  }

  return new QdrantClient(options);
};
```

### 3.3 Node ↔ Python HTTPS

#### 环境变量配置

```bash
# .env 或 docker-compose 环境变量
AI_SERVICE_URL=https://ai-service:8002
TLS_ENABLED=true
```

#### Docker Compose 配置

```yaml
ai-service:
  build:
    context: ./ml
    dockerfile: api/Dockerfile
  container_name: stylemind-ai
  environment:
    AI_SERVICE_HOST: 0.0.0.0
    AI_SERVICE_PORT: 8002
    TLS_ENABLED: "true"
    SSL_CERT_FILE: /certs/ca.crt
  volumes:
    - ./certs/ai-service:/certs/ai-service:ro
    - ./certs/ca.crt:/certs/ca.crt:ro
  command: >
    sh -c "if [ \"$${TLS_ENABLED:-false}\" = \"true\" ]; then
      uvicorn ml.api.main:app --host 0.0.0.0 --port 8002
        --ssl-keyfile /certs/ai-service/ai-service.key
        --ssl-certfile /certs/ai-service/ai-service.crt
        --workers $${AI_WORKERS:-1} --log-level info;
    else
      exec uvicorn ml.api.main:app --host 0.0.0.0 --port 8002
        --workers $${AI_WORKERS:-1} --log-level info;
    fi"
  healthcheck:
    test: ["CMD-SHELL", "curl -fk https://localhost:8002/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s

backend:
  environment:
    AI_SERVICE_URL: "https://ai-service:8002"
    NODE_EXTRA_CA_CERTS: /certs/ca.crt
```

#### Python FastAPI 配置

```python
# ml/api/main.py
import uvicorn
from fastapi import FastAPI

app = FastAPI()

if __name__ == "__main__":
    import os

    tls_enabled = os.getenv("TLS_ENABLED", "false").lower() == "true"

    ssl_keyfile = None
    ssl_certfile = None

    if tls_enabled:
        ssl_keyfile = os.getenv("SSL_KEYFILE", "/certs/ai-service/ai-service.key")
        ssl_certfile = os.getenv("SSL_CERTFILE", "/certs/ai-service/ai-service.crt")

    uvicorn.run(
        "ml.api.main:app",
        host="0.0.0.0",
        port=8002,
        ssl_keyfile=ssl_keyfile,
        ssl_certfile=ssl_certfile,
        workers=int(os.getenv("AI_WORKERS", "1")),
        log_level="info",
    )
```

#### Node.js 客户端配置

```typescript
// src/common/ai-service/ai-service.config.ts
import { ConfigService } from "@nestjs/config";
import * as https from "https";
import * as fs from "fs";
import axios, { AxiosInstance } from "axios";

export const createAiServiceClient = (configService: ConfigService): AxiosInstance => {
  const baseURL = configService.get("AI_SERVICE_URL", "http://ai-service:8002");
  const tlsEnabled = baseURL.startsWith("https://");

  const httpsAgent = tlsEnabled
    ? new https.Agent({
        ca: fs.readFileSync(process.env.NODE_EXTRA_CA_CERTS || "/certs/ca.crt"),
        rejectUnauthorized: true,
      })
    : undefined;

  return axios.create({
    baseURL,
    httpsAgent,
    timeout: 30000,
  });
};
```

---

## 4. 开发环境配置

### 4.1 禁用 TLS（仅限本地开发）

```bash
# .env.development
MINIO_USE_SSL=false
QDRANT_URL=http://localhost:6333
AI_SERVICE_URL=http://localhost:8002
TLS_ENABLED=false
```

### 4.2 使用 HTTP 的 Docker Compose

```yaml
# docker-compose.dev.yml
services:
  minio:
    command: server /data --console-address ":9001"
    # 不挂载证书目录

  qdrant:
    environment:
      QDRANT__SERVICE__ENABLE_TLS: "false"
    # 不挂载证书目录

  ai-service:
    command: >
      exec uvicorn ml.api.main:app --host 0.0.0.0 --port 8002
        --workers 1 --log-level debug
    # 不使用 SSL 参数
```

---

## 5. 生产环境部署

### 5.1 证书生成步骤

```bash
# 1. 生成证书
bash certs/generate-certs.sh --quiet

# 2. 验证证书
openssl x509 -in certs/ca.crt -text -noout
openssl x509 -in certs/minio/minio.crt -text -noout
openssl x509 -in certs/qdrant/qdrant.crt -text -noout
openssl x509 -in certs/ai-service/ai-service.crt -text -noout

# 3. 设置正确的文件权限
chmod 600 certs/**/*.key
chmod 644 certs/**/*.crt certs/ca.crt

# 4. 添加到 .gitignore（已在 certs/.gitignore 中配置）
```

### 5.2 环境变量模板

```bash
# .env.production
# TLS 配置
TLS_ENABLED=true
TLS_CERT_DIR=/certs

# MinIO TLS
MINIO_USE_SSL=true

# Qdrant TLS
QDRANT_URL=https://qdrant:6333
QDRANT_ENABLE_TLS=true

# AI Service TLS
AI_SERVICE_URL=https://ai-service:8002

# Node.js CA 证书
NODE_EXTRA_CA_CERTS=/certs/ca.crt

# Python CA 证书
SSL_CERT_FILE=/certs/ca.crt
REQUESTS_CA_BUNDLE=/certs/ca.crt
```

### 5.3 Docker Compose 生产配置

```bash
# 启动所有服务（使用 TLS）
docker-compose up -d

# 验证 TLS 连接
docker exec stylemind-backend curl -v https://minio:9000/minio/health/live
docker exec stylemind-backend curl -v https://qdrant:6333/healthz
docker exec stylemind-backend curl -v https://ai-service:8002/health
```

---

## 6. 故障排除

### 6.1 常见问题

#### 证书验证失败

```bash
# 错误信息
Error: unable to verify the first certificate

# 解决方案：确保 CA 证书正确挂载
docker exec stylemind-backend cat /certs/ca.crt
```

#### 证书 SAN 不匹配

```bash
# 错误信息
Error: Hostname/IP does not match certificate's altnames

# 解决方案：重新生成证书，确保包含正确的 SAN
openssl x509 -in certs/minio/minio.crt -text -noout | grep -A 1 "Subject Alternative Name"
```

#### 证书过期

```bash
# 检查证书有效期
openssl x509 -in certs/minio/minio.crt -enddate -noout

# 重新生成证书
bash certs/generate-certs.sh
```

### 6.2 调试命令

```bash
# 测试 TLS 连接
openssl s_client -connect minio:9000 -CAfile certs/ca.crt

# 查看证书详情
openssl x509 -in certs/minio/minio.crt -text -noout

# 验证证书链
openssl verify -CAfile certs/ca.crt certs/minio/minio.crt

# 检查证书过期时间
openssl x509 -in certs/minio/minio.crt -enddate -noout
```

---

## 7. 安全最佳实践

### 7.1 证书管理

- 定期轮换证书（建议每年一次）
- 使用强密钥（RSA 2048 位或更高）
- 保护 CA 私钥安全
- 监控证书过期时间

### 7.2 网络安全

- 仅在内部网络使用自签名证书
- 外部访问使用可信 CA 签发的证书
- 限制服务端口仅监听 127.0.0.1
- 使用防火墙限制访问

### 7.3 密钥管理

```bash
# 设置正确的文件权限
chmod 600 certs/**/*.key      # 私钥仅所有者可读
chmod 644 certs/**/*.crt      # 证书可公开读取
chmod 700 certs/              # 目录仅所有者可访问

# 确保 .gitignore 包含证书文件
echo "*.key" >> certs/.gitignore
echo "*.csr" >> certs/.gitignore
echo "*.srl" >> certs/.gitignore
```

---

## 8. 证书轮换流程

### 8.1 轮换步骤

```bash
# 1. 备份当前证书
cp -r certs certs.backup.$(date +%Y%m%d)

# 2. 生成新证书
bash certs/generate-certs.sh

# 3. 验证新证书
openssl verify -CAfile certs/ca.crt certs/minio/minio.crt
openssl verify -CAfile certs/ca.crt certs/qdrant/qdrant.crt
openssl verify -CAfile certs/ca.crt certs/ai-service/ai-service.crt

# 4. 重启服务（滚动更新）
docker-compose restart minio
docker-compose restart qdrant
docker-compose restart ai-service
docker-compose restart backend

# 5. 验证服务健康
docker-compose ps
```

### 8.2 零停机轮换

对于生产环境，建议使用蓝绿部署或滚动更新：

```bash
# 使用 docker-compose 滚动更新
docker-compose up -d --no-deps --scale minio=2 minio
# 等待新实例健康
docker-compose up -d --no-deps --scale minio=1 minio
```

---

_最后更新：2026-04-30_
_维护者：运维团队_
