# XUNO 本地开发环境启动指南

> Seed 数据仅供开发测试，不代表真实用户或真实商品。所有 demo 数据标记 is_demo: true。

## 前置依赖

- Docker Desktop (with Docker Compose v2)
- Node.js 20+
- pnpm 9+
- Python 3.11+ (AI service)
- (可选) GLM API Key — 无 Key 时 AI 服务降级但不阻塞启动

## 快速启动

### 1. 配置环境变量

```bash
cp .env.local .env
```

编辑 .env，填入 API Key（可选）。

### 2. 一键启动所有服务

```bash
docker compose -f docker-compose.local.yml up --build
```

首次启动约需 3-5 分钟（构建镜像）。

### 3. 验证服务状态

```bash
# Linux/macOS/Git Bash
bash scripts/health-check.sh

# Windows PowerShell
pwsh scripts/health-check.ps1
```

所有 6 个服务应显示 healthy。

### 4. 运行数据库迁移 + Seed

```bash
docker compose -f docker-compose.local.yml exec backend npx prisma migrate deploy
docker compose -f docker-compose.local.yml exec backend npx prisma db seed
```

## 服务端口

| 服务       | 端口        | 用途                     |
| ---------- | ----------- | ------------------------ |
| PostgreSQL | 5432        | 数据库                   |
| Redis      | 6379        | 缓存/队列                |
| MinIO      | 9000 / 9001 | 对象存储 / 控制台        |
| Qdrant     | 6333 / 6334 | 向量数据库               |
| FastAPI AI | 8002        | AI 服务 (体型/色彩/推荐) |
| NestJS API | 3001        | 后端 API                 |

## Health Endpoints

| 服务       | URL                                 | 预期响应              |
| ---------- | ----------------------------------- | --------------------- |
| FastAPI AI | http://localhost:8002/health        | {"status": "healthy"} |
| NestJS API | http://localhost:3001/api/v1/health | {"status": "healthy"} |

## Demo/Sandbox 模式说明

以下服务在本地开发环境以 sandbox 或 degraded 模式运行：

- **定制化预览**: sandbox 模式，预览图片为占位符
- **定制化支付**: sandbox 模式，支付 ID 为 mock 值
- **天气服务**: 无 API Key 时返回 fallback mock 数据
- **AI 对话**: 无 GLM API Key 时返回 ServiceUnavailableException
- **体型/色彩分析**: 依赖 FastAPI 服务在线，否则返回 503

## 常见问题

### PostgreSQL 连接失败

```bash
docker compose -f docker-compose.local.yml logs postgres
```

### AI 服务启动失败

检查 Python 依赖是否安装完整：

```bash
docker compose -f docker-compose.local.yml logs ai-service
```

### Seed 失败

确认 backend 已完全启动（health check 通过），然后重新运行 seed。

### 端口冲突

修改 docker-compose.local.yml 中的端口映射。

## 停止服务

```bash
# 保留数据
docker compose -f docker-compose.local.yml down

# 清除数据
docker compose -f docker-compose.local.yml down -v
```
