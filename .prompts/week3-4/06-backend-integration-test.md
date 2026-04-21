# 任务: 后端端到端联调

## 项目路径

C:\AiNeed

## 前置条件

- Phase 1 的 TypeScript 编译错误已全部修复
- docker-compose.yml 中定义了 PostgreSQL + Redis + MinIO + Qdrant

## 步骤

### 1. 启动基础设施

```bash
cd /c/AiNeed && docker-compose -f docker-compose.dev.yml up -d
```

如果 dev 版本不包含所有服务，用主 docker-compose.yml:

```bash
cd /c/AiNeed && docker-compose up -d
```

确认服务运行:

```bash
docker ps  # 应该看到 postgres, redis, minio, qdrant
```

### 2. 数据库迁移

```bash
cd /c/AiNeed/apps/backend
npx prisma migrate dev --name init
```

如果已有迁移，可能需要:

```bash
npx prisma migrate reset  # ⚠️ 清空数据
# 或
npx prisma migrate deploy
```

### 3. 填充种子数据

```bash
cd /c/AiNeed/apps/backend
npx prisma db seed
```

如果有多个 seed 文件，按顺序执行:

```bash
npx ts-node prisma/seed.ts
npx ts-node prisma/seeds/users.seed.ts
npx ts-node prisma/seeds/brands.seed.ts
npx ts-node prisma/seeds/clothing.seed.ts
npx ts-node prisma/seeds/ecommerce.seed.ts
```

### 4. 启动 NestJS 后端

```bash
cd /c/AiNeed
pnpm --filter @xuno/backend dev
```

检查启动日志，确认:

- Nest application successfully started
- 监听的端口（默认 3000 或配置端口）
- 所有模块加载无错误

### 5. API 端点验证

#### 5.1 认证

```bash
# 注册
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456","name":"Test User"}'

# 登录（从注册响应中获取 token）
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

#### 5.2 推荐接口

```bash
# 获取推荐（需要登录 token）
curl http://localhost:3000/recommendations \
  -H "Authorization: Bearer <token>"
```

#### 5.3 AI 造型师

```bash
curl -X POST http://localhost:3000/ai-stylist/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"我今天要去约会，穿什么好？"}'
```

#### 5.4 商品数据

```bash
curl http://localhost:3000/fashion/clothing \
  -H "Authorization: Bearer <token>"
```

#### 5.5 试穿

```bash
curl -X POST http://localhost:3000/try-on \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"userPhotoUrl":"...","clothingItemId":"..."}'
```

### 6. 修复启动时的运行时错误

如果后端启动失败或 API 返回 500:

1. 查看日志中的错误堆栈
2. 常见问题:
   - 环境变量缺失 → 检查 `.env` 文件
   - 数据库连接失败 → 检查 docker 容器状态
   - 模块依赖缺失 → 检查 NestJS module 注册
   - Prisma client 未生成 → 运行 `npx prisma generate`

### 7. 输出

- 记录哪些 API 正常工作
- 记录哪些 API 有问题及错误信息
- 列出需要进一步修复的问题
