# AiNeed 部署指南

本文档详细说明 AiNeed 项目在各种环境下的部署方式和配置方法。

---

## ⚠️ 已知限制和阻塞项

> **重要**: 在部署前请仔细阅读以下已知限制，确保环境满足要求。

### 🔴 阻塞项（必须解决）

| 问题 | 状态 | 解决方案 | 影响范围 |
|------|------|---------|---------|
| AI 模型文件缺失 | 待下载 | 需要下载 SASRec、CLIP、YOLO 等模型文件 | 推荐系统、图像分析 |
| IDM-VTON 模型缺失 | 待下载 | 需要下载虚拟试衣模型权重 | 虚拟试衣功能 |
| 鸿蒙端工程缺失 | 未实现 | HarmonyOS 应用尚未开发 | 移动端鸿蒙平台 |

### 🟡 功能限制

| 功能 | 状态 | 说明 |
|------|------|------|
| 虚拟试衣 | 降级模式 | 依赖 IDM-VTON 模型，需单独部署 |
| 智能推荐 | 部分可用 | SASRec 模型缺失时降级为协同过滤 |
| 身体分析 | 部分可用 | 需配置 Aliyun Vision API 作为备选 |
| RAG 检索 | 可用 | 需要 Qdrant 向量数据库 |

### 📋 部署前检查清单

```bash
# 1. 检查模型文件是否存在
ls -la ml/models/
# 预期文件: sasrec/, clip_fashion/, yolo11n.pt, sam_vit_h_4b8939.pth

# 2. 检查环境变量配置
cat .env | grep -E "(DATABASE_URL|REDIS_URL|GLM_API_KEY|ENCRYPTION_KEY)"

# 3. 检查 Docker 服务
docker ps

# 4. 检查端口占用
netstat -tlnp | grep -E "(3000|3001|5432|6379|9000|6333|8001)"
```

### 🔧 模型下载指南

```bash
# 创建模型目录
mkdir -p ml/models/sasrec ml/models/clip_fashion

# 下载 CLIP 模型 (自动下载到 HuggingFace 缓存)
# 首次运行时会自动下载

# 下载 YOLO 模型
wget -O ml/models/yolo11n.pt https://github.com/ultralytics/assets/releases/download/v0.0.0/yolo11n.pt

# 下载 SAM 模型 (可选，用于图像分割)
wget -O ml/models/sam_vit_h_4b8939.pth \
  https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth
```

---

## 目录

- [环境要求](#环境要求)
- [Docker 部署](#docker-部署)
- [手动部署](#手动部署)
- [环境变量配置](#环境变量配置)
- [生产环境优化](#生产环境优化)
- [监控与日志](#监控与日志)
- [常见问题](#常见问题)

---

## 环境要求

### 硬件要求

| 配置 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 4 核心 | 8 核心+ |
| 内存 | 16GB | 32GB+ |
| 存储 | 100GB SSD | 500GB SSD |
| GPU | - | NVIDIA RTX 4090 (AI 推理) |

### 软件要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| Docker | 20.10+ | 容器运行时 |
| Docker Compose | 2.0+ | 容器编排 |
| Node.js | 20.x LTS | 后端运行时 |
| pnpm | 8.x | 包管理器 |
| Python | 3.11+ | AI 服务运行时 |
| PostgreSQL | 16.x | 主数据库 |
| Redis | 7.x | 缓存服务 |

### 端口要求

| 端口 | 服务 | 说明 |
|------|------|------|
| 3001 | API 服务 | NestJS 后端 |
| 5432 | PostgreSQL | 数据库 |
| 6379 | Redis | 缓存 |
| 9000 | MinIO API | 对象存储 |
| 9001 | MinIO Console | 管理控制台 |
| 6333 | Qdrant HTTP | 向量数据库 |
| 6334 | Qdrant gRPC | 向量数据库 |
| 8001 | AI Service | Python AI 服务 |

---

## Docker 部署

### 快速启动

```bash
# 1. 克隆项目
git clone https://github.com/your-org/aineed.git
cd aineed

# 2. 复制环境变量文件
cp .env.example .env

# 3. 编辑环境变量
vim .env

# 4. 启动所有服务
docker-compose up -d

# 5. 查看服务状态
docker-compose ps

# 6. 查看日志
docker-compose logs -f
```

### 服务架构

```mermaid
graph LR
    subgraph Docker Network
        API[Backend :3001]
        AI[AI Service :8001]

        subgraph Data Services
            PG[(PostgreSQL :5432)]
            Redis[(Redis :6379)]
            MinIO[(MinIO :9000)]
            Qdrant[(Qdrant :6333)]
        end
    end

    User[用户] --> API
    API --> AI
    API --> PG
    API --> Redis
    API --> MinIO
    AI --> Qdrant
```

### Docker Compose 配置说明

项目提供两个 Docker Compose 配置文件：

| 文件 | 用途 |
|------|------|
| `docker-compose.yml` | 生产环境配置 |
| `docker-compose.dev.yml` | 开发环境配置（带热重载） |

### 开发模式

```bash
# 启动开发环境（支持热重载）
docker-compose -f docker-compose.dev.yml up -d

# 仅启动数据库服务
docker-compose up postgres redis minio qdrant -d
```

### 生产模式

```bash
# 构建生产镜像
docker-compose build

# 启动生产服务
docker-compose up -d

# 滚动更新
docker-compose pull && docker-compose up -d
```

### 仅部署数据库服务

如果只需要本地开发数据库：

```bash
# 仅启动 PostgreSQL、Redis、MinIO、Qdrant
docker-compose up postgres redis minio qdrant -d
```

---

## 手动部署

### 1. 数据库准备

#### PostgreSQL

```bash
# 创建数据库
psql -U postgres
CREATE DATABASE aineed;

# 或使用 Docker
docker run -d \
  --name aineed-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=aineed \
  -p 5432:5432 \
  postgres:16-alpine
```

#### Redis

```bash
# 使用 Docker
docker run -d \
  --name aineed-redis \
  -p 6379:6379 \
  redis:7-alpine
```

#### MinIO

```bash
# 使用 Docker
docker run -d \
  --name aineed-minio \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -p 9000:9000 \
  -p 9001:9001 \
  minio/minio server /data --console-address ":9001"
```

#### Qdrant

```bash
# 使用 Docker
docker run -d \
  --name aineed-qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  qdrant/qdrant:latest
```

### 2. 后端部署

```bash
# 进入后端目录
cd apps/backend

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
vim .env

# 生成 Prisma 客户端
pnpm db:generate

# 同步数据库结构
pnpm db:push

# 构建
pnpm build

# 启动生产服务
pnpm start:prod
```

### 2. 移动端构建

移动端应用通过 EAS Build 或本地构建生成 APK/IPA。

```bash
# 进入移动端目录
cd apps/mobile

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
vim .env

# Android 构建
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease

# 或使用 EAS Build
eas build --platform android
```

### 3. AI 服务部署

```bash
# 进入 AI 服务目录
cd ml

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
.\venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.template .env
vim .env

# 启动服务
python start_all_services.py
```

### 4. Nginx 反向代理

```nginx
# /etc/nginx/sites-available/aineed
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # 文件上传大小限制
        client_max_body_size 50M;
    }

    # MinIO
    location /storage {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 环境变量配置

### 核心配置

```env
# ============================================
# 应用配置
# ============================================
NODE_ENV=production

# ============================================
# 数据库配置
# ============================================
DATABASE_URL="postgresql://postgres:password@localhost:5432/aineed?schema=public"
REDIS_URL="redis://localhost:6379"

# ============================================
# 认证配置
# ============================================
# 生成方法: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-256-bit-secret-key-here
JWT_EXPIRES_IN=7d

# ============================================
# 对象存储配置
# ============================================
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=aineed
MINIO_USE_SSL=false

# ============================================
# LLM 服务配置
# ============================================
# 推荐: GLM API (智谱清言)
GLM_API_KEY=your-glm-api-key
GLM_API_ENDPOINT=https://open.bigmodel.cn/api/paas/v4
GLM_MODEL=glm-5

# 备选: OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_API_ENDPOINT=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# ============================================
# AI 服务配置
# ============================================
AI_SERVICE_URL=http://localhost:8001
USE_LOCAL_IDM_VTON=true
IDM_VTON_ENDPOINT=http://localhost:8001

# ============================================
# 向量数据库
# ============================================
QDRANT_URL=http://localhost:6333

# ============================================
# 安全配置
# ============================================
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com
```

### 敏感配置安全建议

| 配置项 | 安全建议 |
|--------|---------|
| `JWT_SECRET` | 至少 256 位随机字符串 |
| `DATABASE_URL` | 使用强密码，限制 IP 访问 |
| `MINIO_*_KEY` | 生产环境使用强凭证 |
| `GLM_API_KEY` | 定期轮换，限制调用额度 |
| `CORS_ORIGINS` | 仅允许生产域名 |

### 环境变量生成工具

```bash
# 生成 JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 生成 MinIO 凭证
openssl rand -base64 32
```

---

## 生产环境优化

### 性能优化

#### 1. 数据库优化

```sql
-- PostgreSQL 配置优化 (postgresql.conf)
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
```

#### 2. Redis 优化

```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save ""  # 禁用持久化（如使用 Redis 仅做缓存）
```

#### 3. Node.js 优化

```javascript
// 使用 cluster 模式
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
}
```

### 安全加固

#### 1. 网络安全

```bash
# 防火墙配置 (ufw)
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable

# 内部服务仅允许本地访问
# 不对外暴露 5432, 6379, 9000 等端口
```

#### 2. HTTPS 配置

```bash
# 使用 Let's Encrypt
certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
certbot renew --dry-run
```

#### 3. 容器安全

```yaml
# docker-compose.yml 安全配置
services:
  backend:
    security_opt:
      - no-new-privileges:true
    read_only: true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
```

---

## 监控与日志

### 健康检查

所有服务都配置了健康检查端点：

| 服务 | 端点 | 说明 |
|------|------|------|
| Backend | `/api/v1/health` | 后端健康状态 |
| AI Service | `/health` | AI 服务状态 |
| PostgreSQL | `pg_isready` | 数据库连接 |
| Redis | `redis-cli ping` | 缓存连接 |
| MinIO | `/minio/health/live` | 存储状态 |

### 日志配置

```bash
# 查看服务日志
docker-compose logs -f backend
docker-compose logs -f ai-service

# 日志轮转配置 (docker-compose.yml)
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Prometheus + Grafana 监控

```yaml
# 可选：添加监控栈
# monitoring/docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## 常见问题

### Q1: 数据库连接失败

**症状**: `ECONNREFUSED` 或认证失败

**解决方案**:
```bash
# 检查数据库是否运行
docker-compose ps postgres

# 检查连接配置
echo $DATABASE_URL

# 测试连接
psql $DATABASE_URL
```

### Q2: AI 服务启动失败

**症状**: GPU 内存不足或模型加载失败

**解决方案**:
```bash
# 检查 GPU 状态
nvidia-smi

# 减少 batch size 或使用 CPU 模式
export CUDA_VISIBLE_DEVICES=""
```

### Q3: 文件上传失败

**症状**: 413 Request Entity Too Large

**解决方案**:
```nginx
# Nginx 配置
client_max_body_size 50M;

# 后端配置
# apps/backend/src/main.ts
app.use(express.json({ limit: '50mb' }));
```

### Q4: 内存不足

**症状**: OOM Killed

**解决方案**:
```bash
# 增加 Docker 内存限制
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
```

### Q5: CORS 错误

**症状**: 浏览器控制台显示 CORS 错误

**解决方案**:
```env
# 检查 CORS 配置
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com
```

### Q6: 容器网络问题

**症状**: 服务间无法通信

**解决方案**:
```bash
# 检查网络
docker network ls
docker network inspect aineed_default

# 重建网络
docker-compose down
docker-compose up -d
```

---

## 备份与恢复

### 数据库备份

```bash
# 手动备份
pg_dump -U postgres aineed > backup_$(date +%Y%m%d).sql

# 定时备份 (crontab)
0 2 * * * pg_dump -U postgres aineed > /backups/aineed_$(date +\%Y\%m\%d).sql
```

### 数据库恢复

```bash
# 恢复数据库
psql -U postgres aineed < backup_20240101.sql
```

### 对象存储备份

```bash
# MinIO 数据备份
mc mirror local/aineed /backups/minio/aineed
```

---

## 更新与回滚

### 滚动更新

```bash
# 拉取最新镜像
docker-compose pull

# 滚动更新（零停机）
docker-compose up -d --no-deps --build backend
```

### 版本回滚

```bash
# 查看历史版本
docker images aineed-backend

# 回滚到指定版本
docker tag aineed-backend:v1.0.0 aineed-backend:latest
docker-compose up -d backend
```

---

## 联系支持

如有部署问题，请通过以下方式获取帮助：

- GitHub Issues: https://github.com/your-org/aineed/issues
- 文档: [docs/API.md](./API.md) | [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
