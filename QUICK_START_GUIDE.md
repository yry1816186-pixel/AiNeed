# 🎯 寻裳项目配置和启动指南

**生成时间**: 2026-04-17  
**目标**: 快速配置和启动项目，准备演示  
**前提**: 简单的代码问题已修复，复杂问题请参考 CLAUDE_COMPLEX_PROMPTS.md

---

## 📋 快速启动步骤

### 1. 配置 GLM API Key（最关键！）

**申请地址**: https://open.bigmodel.cn/

**配置步骤**:
1. 注册智谱 AI 账号
2. 获取 API Key（GLM-4-Flash 有免费额度）
3. 配置后端环境变量:

```bash
# 编辑 c:\AiNeed\apps\backend\.env
GLM_API_KEY=你的API_KEY
ZHIPU_API_KEY=你的API_KEY
```

4. 配置 AI 服务环境变量:

```bash
# 编辑 c:\AiNeed\ml\.env
GLM_API_KEY=你的API_KEY
ZHIPU_API_KEY=你的API_KEY
```

---

### 2. 启动基础设施服务

```bash
cd c:\AiNeed

# 启动所有基础设施
docker-compose -f docker-compose.dev.yml up -d

# 等待服务启动（约 30 秒）
docker-compose -f docker-compose.dev.yml ps

# 验证服务健康
curl http://localhost:5432  # PostgreSQL
curl http://localhost:6379  # Redis
curl http://localhost:9000  # MinIO
curl http://localhost:6333  # Qdrant
```

---

### 3. 安装项目依赖

```bash
cd c:\AiNeed

# 安装所有依赖（使用国内镜像）
pnpm install --registry=https://registry.npmmirror.com

# 等待安装完成（约 5-10 分钟）
```

---

### 4. 初始化数据库

```bash
cd c:\AiNeed\apps\backend

# 生成 Prisma Client
npx prisma generate

# 创建数据库 Schema
npx prisma db push

# 导入种子数据（测试账号、服装数据）
npx tsx prisma/seed.ts
```

---

### 5. 启动后端服务

```bash
cd c:\AiNeed\apps\backend

# 启动开发服务器
pnpm dev

# 验证服务启动
curl http://localhost:3001/health
```

---

### 6. 启动 AI 服务

```bash
cd c:\AiNeed\ml

# 安装 Python 依赖（使用国内镜像）
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 启动 AI 服务
python -m uvicorn api.main:app --host 0.0.0.0 --port 8002 --reload

# 验证服务启动
curl http://localhost:8002/health
```

---

### 7. 启动移动端

```bash
cd c:\AiNeed\apps\mobile

# 启动 Metro Bundler
npx react-native start --port 8081

# 在另一个终端启动 Android
npx react-native run-android

# 或启动 iOS
npx react-native run-ios
```

---

## 🧪 测试账号

- **邮箱**: test@example.com
- **密码**: Test123456!

---

## 📊 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Backend API | 3001 | NestJS 后端 |
| Metro | 8081 | React Native 打包器 |
| AI Service | 8002 | Python AI 服务 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| MinIO | 9000/9001 | 对象存储 |
| Qdrant | 6333 | 向量数据库 |
| Neo4j | 7474/7687 | 知识图谱 |

---

## ⚠️ 常见问题

### 问题 1: GLM API Key 未配置

**症状**: AI 功能无法使用，返回 401 错误

**解决**: 
1. 检查 `apps/backend/.env` 中的 `GLM_API_KEY`
2. 检查 `ml/.env` 中的 `GLM_API_KEY`
3. 确保 API Key 有效且有余额

---

### 问题 2: 数据库连接失败

**症状**: 后端启动失败，返回数据库连接错误

**解决**:
1. 确保 Docker 服务已启动
2. 检查 `docker-compose -f docker-compose.dev.yml ps`
3. 检查 `.env` 中的 `DATABASE_URL`

---

### 问题 3: 依赖安装失败

**症状**: pnpm install 报错

**解决**:
1. 使用国内镜像: `pnpm install --registry=https://registry.npmmirror.com`
2. 清理缓存: `pnpm store prune`
3. 重新安装: `pnpm install`

---

### 问题 4: 移动端无法连接后端

**症状**: 移动端显示网络错误

**解决**:
1. 确保后端已启动: `curl http://localhost:3001/health`
2. 检查移动端 API 配置: `apps/mobile/src/services/api/client.ts`
3. 确保使用正确的 IP 地址（不是 localhost）

---

## 📝 下一步

完成配置和启动后，如果需要解决复杂的业务逻辑问题，请参考:
- **复杂问题提示词**: `CLAUDE_COMPLEX_PROMPTS.md`

---

**生成时间**: 2026-04-17  
**预计配置时间**: ~30 分钟  
**预计成本**: $0 (配置无需 AI 模型)
