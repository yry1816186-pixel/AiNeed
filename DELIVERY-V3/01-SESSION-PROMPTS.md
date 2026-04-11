# AiNeed V3 - Trae 并行开发Session提示词
> **版本**: 3.3 | **日期**: 2026-04-12 | **使用方式**: 每个Session复制对应提示词到Trae Solo模式
> **前置**: 所有Session必须先读 C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md 和 04-MASTER-PLAN.md
> **关键约束**: 每个Session严格只修改自己负责的目录，禁止触碰其他模块

---

## Session执行顺序
```

Phase 0 (Day 1-3, 全部并行, 无代码依赖):
  M1: 市场调研 → 纯文档
  M2: 竞品分析 → 纯文档
  M3: 商业模式 → 纯文档
  D1: 设计系统 → 移动端theme/ + components/ui/
  D2: Prompt工程 → prompts/*.ts
Phase 1 (Day 3-5, 顺序执行):
  F1: 后端骨架 → apps/backend/ (必须先完成)
  F2: 移动端骨架 → apps/mobile/ (依赖F1的目录结构)
  F3: 共享类型+种子数据 → apps/shared/ + prisma/ (依赖F1)
Phase 2 (Day 5-10, 全部并行):
  B1: Auth认证 → src/modules/auth/
  B2: Users用户 → src/modules/users/
  B3: Clothing服装 → src/modules/clothing/
  B4: Upload上传 → src/modules/upload/
  B5: Search搜索 → src/modules/search/
  B6: Wardrobe衣橱 → src/modules/wardrobe/
  B7: Favorites收藏 → src/modules/favorites/
Phase 2.5 (Day 8-12, 并行):
  AV1: Q版形象管理服务 → src/modules/avatar/
  AV2: 形象模板管理 → src/modules/avatar-template/
Phase 3 (Day 8-14, 部分并行):
  A1: LLM服务 → src/modules/stylist/services/ (先完成)
  A2: 知识图谱 → src/modules/knowledge/ (并行)
  A3: 推荐引擎 → src/modules/recommendation/ (并行)
  A5: 向量嵌入 → src/modules/embedding/ (并行)
  A4: AI造型师 → src/modules/stylist/ (依赖A1+A2+A3)
Phase 4a (Day 10-12, 独立优先, 阻塞Phase 4b):
  AV4: Skia渲染组件 → src/components/avatar/ (必须最先完成，MB2/MB3/MB4/AV3依赖此组件)
Phase 4b (Day 12-17, 全部并行, 依赖AV4完成):
  MB1: 认证+引导页 → app/(auth)/ + app/onboarding/
  MB2: 首页(Q版形象为核心) → app/(tabs)/index.tsx
  MB3: AI造型师(卡片交互式) → app/(tabs)/stylist.tsx
  MB4: 衣橱(Q版形象可视化) → app/(tabs)/wardrobe.tsx
  MB5: 个人中心(经典布局) → app/(tabs)/profile.tsx + app/settings/
  MB6: 搜索页 → app/search/
  MB7: 服装详情 → app/clothing/
  AV3: Q版形象页面 → app/avatar/
Phase 4.5 (Day 14-19, 并行):
  CU0: 定制设计管理 → src/modules/customize/ (后端CRUD)
  CU1: 图案编辑器 → src/components/customize/
  CU2: 定制预览页面 → app/customize/
Phase 5 (Day 14-20, 全部并行, CU4除外):
  C1: 社区帖子 → src/modules/community/ + app/community/
  C2: 社交关系 → src/modules/social/ + app/community/user/
  C3: 私信系统 → src/modules/messaging/ + app/messages/
  C4: 通知系统 → src/modules/notification/
  C5: 文生图搭配可视化 → src/modules/outfit-image/ (集成到AI造型师)
  C6: 体型分析 → src/modules/body-analysis/
  CU3: POD订单管理(全Mock) → src/modules/custom-order/ + app/customize/order.tsx
  BESPOKE1: 高端定制-工作室管理 → src/modules/bespoke/ + app/bespoke/
  BESPOKE2: 高端定制-订单流程 → src/modules/bespoke/(订单) + app/bespoke/* (依赖BESPOKE1完成)
Phase 5.5 (Day 20+, 依赖Phase 4.5完成):
  CU4: 设计市集(免费分享) → src/modules/design-market/ + app/market/ (依赖CU1+CU2完成)
Phase 6 (Day 18-25):
  T1: E2E测试 → test/
  T2: Bug修复 → 跨模块(只修复)
  T3: 性能优化 → 跨模块(只优化)
  T4: 安全审计 → 跨模块(只修安全)
Phase 7 (Day 23-30):
  K1: Docker部署 → docker/
  K2: CI/CD → .github/
  K3: EAS Build → eas.json
  K4: 文档 → docs/
  K5: ICP指南 → docs/ICP-GUIDE.md
```

---

## ═══════════════════════════════════════════════

## SESSION F1: 后端骨架 (Phase 1 - 最先执行)

## ═══════════════════════════════════════════════
**写入范围**: C:\AiNeed\V3\apps\backend\ (全部)
**依赖**: 无
```

你是一个高级后端开发工程师。你的任务是从零创建AiNeed V3项目的NestJS后端骨架。

## 第一步：读取项目文档
请先完整阅读以下两个文件：
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md（项目宪法 - 所有技术细节的权威来源）
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md（主计划 - 开发策略和质量标准）

## 第二步：创建项目根目录和pnpm workspace
在 C:\AiNeed\V3\ 目录下（如果V3目录不存在就创建它）：
```bash
mkdir -p C:/AiNeed/V3
cd C:/AiNeed/V3
```

创建 pnpm-workspace.yaml：
```yaml
packages:
  - 'apps/*'
```

创建根 package.json（基础workspace配置）：
```json
{
  "name": "aineed-v3",
  "private": true,
  "version": "1.0.0",
  "description": "AiNeed V3 - AI Fashion Stylist App",
  "scripts": {
    "backend": "pnpm --filter backend",
    "mobile": "pnpm --filter mobile"
  }
}
```

## 第三步：创建后端项目
```bash
cd C:/AiNeed/V3
mkdir -p apps/backend
cd apps/backend
```

然后用pnpm初始化NestJS项目：
```bash
npx @nestjs/cli new . --package-manager pnpm --strict --skip-git
```

安装核心依赖：
```bash
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add @prisma/client
pnpm add -D prisma @types/passport-jwt
pnpm add bcrypt class-validator class-transformer
pnpm add -D @types/bcrypt
pnpm add ioredis
pnpm add @nestjs/throttler
pnpm add @nestjs/bull bull
pnpm add -D @types/bull
pnpm add @nestjs/swagger
pnpm add helmet
pnpm add -D @types/multer
```

初始化Prisma：
```bash
npx prisma init
```

## 第四步：Prisma Schema
创建 prisma/schema.prisma，严格按照项目宪法中的35张表SQL定义转换为Prisma格式。
关键要求：
- provider = "postgresql"
- 使用 @default(dbgenerated("gen_random_uuid()")) 生成UUID
- 所有表使用 @map("table_name") 映射到SQL表名
- clothing_items表的embedding字段用 Unsupported("vector(512)")
- 在datasource中添加 extensions = ["pgvector"]
- 创建合理的索引（参考宪法中的CREATE INDEX语句）
- 35张表全部定义，分为五批：
  - 原有20张表：users, user_style_preferences, categories, brands, clothing_items, outfits, outfit_items, chat_sessions, chat_messages, tryon_results, user_interactions, wardrobe_items, favorites, style_rules, community_posts, post_comments, user_follows, chat_rooms, direct_messages, notifications
  - Q版形象+定制6张表：avatar_templates, user_avatars, custom_designs, custom_orders, product_templates, design_likes
  - 文生图搭配1张表：outfit_images
  - 高端定制5张表：bespoke_studios, bespoke_orders, bespoke_messages, bespoke_quotes, bespoke_reviews
  - 新增3张表：chat_room_participants, body_profiles, design_reports
- 注意：body_profiles为独立表(含user_id, body_type, height, weight, color_season, measurements JSONB等字段)

## 第五步：项目配置
1. 创建 src/config/env.ts - 环境变量验证（使用class-validator装饰器），包括：
   - DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_EXPIRES_IN
   - MINIO配置, QDRANT_URL, NEO4J配置, ELASTICSEARCH_URL
   - ZHIPU_API_KEY, DEEPSEEK_API_KEY
   - SMS相关配置, ML服务URL
2. 创建 .env 文件（从宪法第六节复制所有环境变量）
3. 配置 src/app.module.ts：
   - ConfigModule.forRoot({ isGlobal: true, validate: envValidator })
   - ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])
   - 全局注册 PrismaModule
   - **重要**: 全局注册 APP_GUARD (JwtAuthGuard)，确保所有端点默认需要认证，除非使用 @Public() 装饰器标记公开端点。在app.module.ts的providers中添加: { provide: APP_GUARD, useClass: JwtAuthGuard }
4. 配置 src/main.ts：
   - app.setGlobalPrefix('api/v1')
   - app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
   - app.useGlobalInterceptors(new TransformInterceptor())
   - app.useGlobalFilters(new HttpExceptionFilter())
   - app.use(helmet())
   - app.enableCors({ origin: process.env.CORS_ORIGIN || '*' })
   - SwaggerModule.setup('api/docs')
   - 使用NestJS内置Logger: const logger = new Logger(); app.useLogger(logger)（不需要自定义LoggerService）

## 第六步：PrismaModule
创建 src/prisma/：
- prisma.module.ts - 全局模块，提供PrismaService
- prisma.service.ts - 实现OnModuleInit和OnModuleDestroy，连接池管理

## 第七步：统一响应格式
创建 src/common/：
1. interceptors/transform.interceptor.ts：
```typescript
// 统一包装为 { success: true, data, meta? }
// data是实际数据，meta包含分页信息（如果有）
```

2. filters/http-exception.filter.ts：
```typescript
// 统一错误响应 { success: false, error: { code: string, message: string } }
// 处理HttpException、Prisma异常、ValidationException
```

3. decorators/current-user.decorator.ts：
```typescript
// @CurrentUser() 装饰器，从request.user中提取当前用户
```

4. types/api.types.ts：
```typescript
// ApiResponse<T>, PaginatedResponse<T>, PaginatedMeta
// 从宪法3.3节复制完整的TypeScript类型定义
```

## 第八步：Docker Compose
创建 C:\AiNeed\V3\docker\docker-compose.yml：
- PostgreSQL 16（端口5432，数据库aineed_v3，用户aineed）
  - 添加pgvector扩展初始化脚本
  - volumes持久化
  - healthcheck
- Redis 7（端口6379）
  - healthcheck
- MinIO（端口9000 API + 9001 Console）
  - 默认bucket: aineed
  - volumes持久化
创建 docker/init-db.sql：
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
```

## 第九步：ESLint和Prettier
配置代码规范：
- .eslintrc.js - extends: ['@nestjs/eslint-config']
- .prettierrc - { singleQuote: true, trailingComma: 'all', printWidth: 100 }
- 添加max-lines-per-function和max-lines规则

## 第十步：健康检查端点
创建 src/modules/health/：
- health.module.ts
- health.controller.ts:
  GET /api/v1/health - 返回 { success: true, data: { status: 'ok', timestamp: string, uptime: number } }
  此端点使用 @Public() 装饰器标记，无需认证即可访问。
  用于Docker健康检查和监控。

## 第十一步：验证
完成后运行以下命令并报告结果：
1. `cd C:/AiNeed/V3/apps/backend && npx prisma validate`
2. `npx tsc --noEmit`
3. `cd C:/AiNeed/V3/docker && docker-compose up -d` (启动数据库服务)
4. `npx prisma db push` (创建表)
5. 确认所有表创建成功（共35张表）

## 关键约束
1. TypeScript strict模式 - 零any类型
2. 所有代码通过tsc --noEmit检查
3. 每个文件<500行
4. 每个函数<50行
5. 零TODO，零placeholder
6. 使用NestJS内置Logger，不使用console.log（不需要自定义LoggerService）
7. 所有环境变量从.env读取，不硬编码

## 你必须创建的文件清单
```

C:\AiNeed\V3\
├── pnpm-workspace.yaml
├── package.json (根workspace配置)
C:\AiNeed\V3\docker\
├── docker-compose.yml
└── init-db.sql
C:\AiNeed\V3\apps\backend\
├── prisma/
│   └── schema.prisma
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   └── env.ts
│   ├── common/
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── public.decorator.ts      # @Public() 装饰器，标记不需要认证的端点
│   │   └── types/
│   │       └── api.types.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   └── modules/health/
│       ├── health.module.ts
│       └── health.controller.ts         # GET /api/v1/health
├── .env
├── .env.example
├── .eslintrc.js
├── .prettierrc
└── tsconfig.json
```

注意：后端package.json中应添加对workspace:*的shared包依赖（如果apps/shared存在时）。在NestJS初始化后，确保package.json的name字段为"backend"以匹配pnpm workspace配置。

开始执行。每完成一步报告进度。不许偷懒，不许写TODO，不许写placeholder。所有代码必须可以直接运行。
```

---

## ═══════════════════════════════════════════════

## SESSION F2: 移动端骨架 (Phase 1)

## ═══════════════════════════════════════════════
**写入范围**: C:\AiNeed\V3\apps\mobile\ (全部)
**依赖**: F1+F3完成后执行
```

你是一个高级React Native开发工程师。你的任务是从零创建AiNeed V3移动端App的骨架。

## 第一步：读取项目文档
请先完整阅读：
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md（注意第五章设计系统规范）

## 第二步：创建Expo项目
```bash
cd C:/AiNeed/V3
npx create-expo-app apps/mobile --template blank-typescript
cd apps/mobile
```

安装核心依赖：
```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar
npx expo install react-native-safe-area-context react-native-screens
npx expo install @expo/vector-icons
npx expo install expo-image-picker
npx expo install zustand @tanstack/react-query
npx expo install axios
npx expo install @react-native-async-storage/async-storage
npx expo install expo-secure-store
```

## 第三步：配置Expo Router
1. package.json添加 "main": "expo-router/entry"
2. app.json配置：
   - scheme: "aineed"
   - android.package: "com.aineed.app"
   - ios.bundleIdentifier: "com.aineed.app"
   - plugins: ["expo-router"]
3. babel.config.js添加expo-router plugin
4. metro.config.js配置（如果需要）

## 第四步：创建目录结构
```

apps/mobile/
├── app/
│   ├── _layout.tsx              # 根布局
│   ├── (auth)/
│   │   ├── _layout.tsx          # 认证Stack
│   │   ├── login.tsx            # 占位
│   │   └── register.tsx         # 占位
│   ├── (tabs)/
│   │   ├── _layout.tsx          # 5 Tab导航(首页/AI/+操作/衣橱/我的)
│   │   ├── index.tsx            # 首页(Q版形象+推荐)
│   │   ├── stylist.tsx          # AI造型(卡片交互式)
│   │   ├── wardrobe.tsx         # 衣橱(Q版形象可视化)
│   │   └── profile.tsx          # 个人(经典个人中心)
│   ├── actions/                 # 中间"+"按钮弹出面板
│   │   └── index.tsx            # 快捷操作(试衣/定制/发帖/高端定制)
│   ├── avatar/                  # Q版形象页
│   │   ├── create.tsx
│   │   ├── edit.tsx
│   │   └── showcase.tsx
│   ├── customize/               # 定制5步向导
│   │   ├── select-product.tsx
│   │   ├── upload-pattern.tsx
│   │   ├── edit-layout.tsx
│   │   ├── preview.tsx
│   │   └── order.tsx
│   ├── market/                  # 设计市集(双列瀑布流)
│   │   ├── index.tsx
│   │   └── [designId].tsx
│   ├── bespoke/                 # 高端私人定制(全流程App内集成)
│   │   ├── index.tsx            # 定制首页(工作室列表+服务分类)
│   │   ├── [studioId].tsx      # 工作室详情(作品集+服务+评价)
│   │   ├── submit.tsx           # 提交定制需求
│   │   ├── chat/
│   │   │   └── [orderId].tsx   # 与工作室在线沟通
│   │   ├── quote/
│   │   │   └── [orderId].tsx   # 查看报价+确认+支付
│   │   └── orders.tsx          # 我的定制订单列表
│   ├── community/               # 社区(小红书风格)
│   │   ├── index.tsx            # 社区Feed流
│   │   ├── [postId].tsx
│   │   ├── create.tsx
│   │   └── user/[userId].tsx
│   ├── clothing/
│   │   └── [id].tsx             # 占位
│   ├── tryon/
│   │   └── index.tsx            # 占位
│   ├── search/
│   │   └── index.tsx            # 占位
│   ├── messages/
│   │   ├── index.tsx            # 占位
│   │   └── [chatId].tsx         # 占位
│   ├── onboarding/
│   │   └── index.tsx            # 占位
│   └── settings/
│       ├── index.tsx            # 占位
│       ├── preferences.tsx      # 占位
│       └── privacy.tsx          # 占位
├── src/
│   ├── components/
│   │   └── ui/                  # 空目录(留给D1 Session)
│   ├── hooks/
│   ├── services/
│   │   └── api.ts               # Axios实例
│   ├── stores/
│   │   └── auth.store.ts        # 认证状态
│   ├── theme/
│   │   ├── colors.ts            # 颜色Token(从主计划第五章)
│   │   ├── typography.ts        # 字体Token
│   │   ├── spacing.ts           # 间距Token
│   │   └── index.ts             # 汇总导出
│   └── types/
│       ├── api.ts               # 从宪法复制
│       ├── models.ts            # 从宪法复制
│       └── enums.ts             # 从宪法复制
└── assets/
```

## 第五步：主题系统
严格按照04-MASTER-PLAN.md第五章的设计Token创建：
src/theme/colors.ts - 主色#1A1A2E, 强调色#E94560, 完整的颜色系统
src/theme/typography.ts - h1-h3, body, caption, button字体定义
src/theme/spacing.ts - xs=4, sm=8, md=12, lg=16, xl=24, xxl=32
src/theme/index.ts - 汇总导出 + useTheme hook

## 第六步：API服务层
src/services/api.ts:
- 创建axios实例，baseURL从Constants读取
- 请求拦截器: 自动添加Authorization Bearer token
- 响应拦截器: 解包 { success, data } 格式
- 错误拦截: 401跳转登录，其他显示错误
- 类型安全

## 第七步：根布局
app/_layout.tsx:
- QueryClientProvider包裹
- 认证状态检查(从AsyncStorage读取token)
- 未登录跳转(auth)组，已登录跳转(tabs)组
- 使用expo-router的Slot/Redirect
app/(tabs)/_layout.tsx:
- 5个Tab: 首页(home) / AI造型(chat) / 中间"+"大按钮(add) / 衣橱(checkroom) / 我的(person)
- 中间"+"按钮: 圆形大按钮，accent色#E94560背景，白色加号SVG图标
  - 点击弹出actions面板: 虚拟试衣/图案定制/发帖/高端私人定制
- 激活色#1A1A2E(深黑蓝)，未激活色#999999
- 白色背景，顶部1px分隔线
- 图标全部使用SVG，不使用emoji

## 第八步：TypeScript类型
从项目宪法3.3节复制所有TypeScript类型到 src/types/:
- enums.ts - Gender, Season, Occasion, ClothingSlot, InteractionType, AvatarAnimationType, CustomOrderStatus, ProductType, BespokeOrderStatus
- models.ts - User, ClothingItem, CommunityPost, ChatMessage, Outfit, TryOnResult, Notification, AvatarTemplate, AvatarParameterDefs, ClothingMapEntry, UserAvatar, CustomDesign, DesignData, ProductTemplate, CustomOrder, ShippingAddress, BespokeStudio, BespokeOrder, BespokeQuote, BespokeReview
- api.ts - ApiResponse<T>, PaginatedResponse<T>, AuthResponse

## 第九步：验证
1. `cd C:/AiNeed/V3/apps/mobile && npx tsc --noEmit`
2. `npx expo start` - 确认App可启动
3. 确认所有页面占位符可导航

## 关键约束
1. TypeScript strict模式
2. 零any类型
3. 函数组件 + Hooks
4. StyleSheet.create + 设计Token
5. 零TODO，零placeholder代码（占位页面用<Text>显示页面名即可）
6. 所有页面文件必须存在（哪怕只是占位）
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION F3: 共享类型 + 种子数据 (Phase 1)

## ═══════════════════════════════════════════════
**写入范围**: apps/shared/ + apps/backend/prisma/seed.ts
**依赖**: F1+F3完成后执行
```

你是一个全栈开发工程师。你的任务是为AiNeed V3创建共享类型定义和种子数据。

## 第一步：读取项目文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 第二步：检查现有文件
检查以下文件是否已创建（由F1 Session）：
- C:\AiNeed\V3\apps\backend\prisma\schema.prisma
- C:\AiNeed\V3\apps\backend\src\common\types\api.types.ts

## 第三步：创建共享类型
在 C:\AiNeed\V3\apps\shared\types\ 下创建：
1. enums.ts：
   - Gender: male/female/other
   - Season: spring/summer/autumn/winter
   - Occasion: work/casual/date/sport/formal/party
   - ClothingSlot: top/bottom/outer/shoes/accessory/dress
   - InteractionType: view/click/favorite/tryon/share
   - TryOnStatus: pending/processing/completed/failed
   - PostStatus: published/draft/archived
2. models.ts：从宪法3.3节完整复制所有interface
3. api.ts：从宪法3.3节完整复制ApiResponse、PaginatedResponse、AuthResponse
确保这些类型与Prisma schema中的模型字段完全一致。

## 第四步：创建种子数据
在 C:\AiNeed\V3\apps\backend\prisma\seed.ts 中：
使用LLM生成以下数据（你必须生成真实的中文服装数据）：
### 品牌数据 (10个)
UNIQLO, ZARA, H&M, MUJI, 太平鸟, 波司登, 李宁, 安踏, Nike, Adidas
每个品牌包含: name, logoUrl(用placeholder), description(中文简介)
### 分类数据 (含子分类)
- 上装: T恤, 衬衫, 毛衣, 卫衣, 针织衫
- 下装: 牛仔裤, 休闲裤, 短裤, 裙子, 西裤
- 外套: 夹克, 大衣, 西装外套, 羽绒服, 风衣
- 鞋履: 运动鞋, 休闲鞋, 靴子, 高跟鞋, 凉鞋
- 配饰: 包包, 帽子, 围巾, 腰带, 首饰
- 连衣裙: 连衣裙
### 服装商品数据 (200条)
要求：
- 覆盖所有分类（每个子分类至少5条）
- 使用真实的中文服装名称（如"纯棉基础款白色T恤"）
- 价格范围合理（T恤49-399, 外套199-2999等）
- seasons/occasions/styleTags/colors/materials组合合理
- 男女各半，部分中性
- imageUrls使用空数组[]（后续补充）
示例数据条目：
```json
{
  "name": "纯棉基础款白色T恤",
  "description": "100%纯棉面料，亲肤透气。经典圆领设计，宽松版型，百搭基础款。适合日常休闲和运动场景。",
  "price": 79,
  "originalPrice": 99,
  "currency": "CNY",
  "gender": "male",
  "seasons": ["spring", "summer", "autumn"],
  "occasions": ["casual", "sport"],
  "styleTags": ["简约", "基础款", "休闲"],
  "colors": ["白色"],
  "materials": ["纯棉"],
  "fitType": "regular",
  "categorySlug": "tshirt",
  "brandName": "UNIQLO",
  "isActive": true
}
```

### 时尚规则数据 (50条)
覆盖4个分类：
- color(色彩): 15条 (互补色、撞色禁忌、中性色百搭)
- occasion(场合): 15条 (商务着装规则、约会搭配、运动穿搭)
- body_type(体型): 10条 (苹果型/梨型/沙漏型/矩形身材建议)
- season(季节): 10条 (四季色彩、面料推荐)
每条规则格式：
```json
{
  "category": "color",
  "ruleType": "dont",
  "condition": { "topColors": ["红色"], "bottomColors": ["绿色"] },
  "recommendation": "红绿搭配在时尚中很难驾驭，建议避免大面积红绿撞色。如果确实想搭配，可以用酒红+墨绿等深色调降低冲突感。",
  "priority": 5,
  "isActive": true
}
```

### 产品模板数据 (product_templates, 6种基础产品类型)
为定制功能提供基础产品模板：
1. **T恤** - uvMapUrl: "/templates/tshirt-uv.png", previewModelUrl: "/models/tshirt.glb", availableSizes: ["S","M","L","XL","XXL"], printArea: {x:25,y:15,width:50,height:35}, baseCost: 2900(分), suggestedPrice: 5900, eproloProductId: "tshirt-001"
2. **卫衣** - uvMapUrl: "/templates/hoodie-uv.png", previewModelUrl: "/models/hoodie.glb", availableSizes: ["S","M","L","XL","XXL"], printArea: {x:25,y:10,width:50,height:40}, baseCost: 5900, suggestedPrice: 12900, eproloProductId: "hoodie-001"
3. **帽子** - uvMapUrl: "/templates/cap-uv.png", previewModelUrl: "/models/cap.glb", availableSizes: ["M","L"], printArea: {x:20,y:10,width:60,height:30}, baseCost: 1500, suggestedPrice: 3900, eproloProductId: "cap-001"
4. **帆布袋** - uvMapUrl: "/templates/tote-uv.png", previewModelUrl: "/models/tote.glb", availableSizes: ["M","L"], printArea: {x:20,y:20,width:60,height:50}, baseCost: 1200, suggestedPrice: 2900, eproloProductId: "tote-001"
5. **手机壳** - uvMapUrl: "/templates/phonecase-uv.png", previewModelUrl: "/models/phonecase.glb", availableSizes: ["iPhone15","iPhone15Pro","iPhone15ProMax","Pixel8"], printArea: {x:10,y:10,width:80,height:80}, baseCost: 800, suggestedPrice: 2900, eproloProductId: "phonecase-001"
6. **马克杯** - uvMapUrl: "/templates/mug-uv.png", previewModelUrl: "/models/mug.glb", availableSizes: ["11oz","15oz"], printArea: {x:15,y:20,width:70,height:50}, baseCost: 600, suggestedPrice: 1990, eproloProductId: "mug-001"
每个模板字段: name, productType(枚举), uvMapUrl, previewModelUrl, availableSizes(JSONB), printArea(JSONB), baseCost(分), suggestedPrice(分), eproloProductId, isActive=true

## 第五步：Seed脚本实现
prisma/seed.ts:
1. 先清空现有数据（按依赖顺序删除）
2. 插入分类（含层级关系）
3. 插入品牌
4. 插入服装商品（关联分类和品牌）
5. 插入时尚规则
6. 插入产品模板(product_templates, 6种基础产品)
7. 输出统计信息
配置package.json:
```json
{ "prisma": { "seed": "npx tsx prisma/seed.ts" } }
```

## 第六步：验证
1. `cd C:/AiNeed/V3/apps/backend`
2. `npx prisma db seed`
3. 查询确认数据插入成功：
   - 10个品牌
   - 30+个分类
   - 200条服装
   - 50条规则
   - 6种产品模板
开始执行。200条服装数据必须使用真实的中文服装名称和合理的属性组合。
```

---

## ═══════════════════════════════════════════════

## SESSION B1: Auth认证模块 (Phase 2)

## ═══════════════════════════════════════════════
**写入范围**: C:\AiNeed\V3\apps\backend\src\modules\auth\ + src/common/decorators/public.decorator.ts + src/common/guards/roles.guard.ts + src/common/decorators/roles.decorator.ts
**禁止修改**: 其他模块、prisma/schema
**依赖**: F1+F3完成
```

你是一个后端开发工程师。你的任务是为AiNeed V3实现认证模块和通用权限基础设施。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md（API契约在3.2节）
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md（质量标准）
3. 检查 C:\AiNeed\V3\apps\backend\ 的现有代码结构

## 你的读写边界
允许创建/修改以下目录中的文件：
- C:\AiNeed\V3\apps\backend\src\modules\auth\
- C:\AiNeed\V3\apps\backend\src\common\decorators\public.decorator.ts
- C:\AiNeed\V3\apps\backend\src\common\decorators\roles.decorator.ts
- C:\AiNeed\V3\apps\backend\src\common\guards\roles.guard.ts

## 创建的文件
```

src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── jwt.strategy.ts
├── jwt-refresh.strategy.ts
├── guards/
│   └── jwt-auth.guard.ts
├── dto/
│   ├── send-code.dto.ts
│   ├── verify-code.dto.ts
│   └── refresh-token.dto.ts
└── __tests__/
    ├── auth.service.spec.ts
    └── auth.controller.spec.ts
src/common/decorators/
├── public.decorator.ts    # @Public() 装饰器，标记不需要认证的端点
└── roles.decorator.ts     # @Roles() 装饰器，标记需要的角色
src/common/guards/
└── roles.guard.ts         # RolesGuard，检查用户角色(基于users表的role字段: admin/user)
```

## 功能要求
### 0. 通用权限基础设施（最先创建）
- **@Public() 装饰器** (src/common/decorators/public.decorator.ts):
  - 使用SetMetadata('isPublic', true)实现
  - JwtAuthGuard中检查reflector.get('isPublic', context.getHandler())，如果为true则放行
  - F1已在AppModule中全局注册了APP_GUARD (JwtAuthGuard)，所有端点默认需要认证
  - 使用@Public()标记的端点无需认证（如auth/send-code, health等）
- **@Roles() 装饰器** (src/common/decorators/roles.decorator.ts):
  - 使用SetMetadata('roles', roles)实现
  - 例: @Roles('admin') 标记需要管理员权限
- **RolesGuard** (src/common/guards/roles.guard.ts):
  - 检查reflector.get('roles', context.getHandler())
  - 从request.user.role中读取用户角色
  - users表有role字段 (admin/user)，默认为user
  - 如果端点没有@Roles装饰器，则允许所有已认证用户访问
  - 如果有@Roles但用户角色不在列表中，抛出403 Forbidden

### 1. POST /api/v1/auth/send-code（使用@Public()标记）
- 接收手机号
- 生成6位随机验证码
- 存储到Redis（key: sms:code:{phone}, TTL: 5分钟）
- 开发模式直接返回验证码（不调短信API）
- 生产模式调用阿里云短信API
- 限流：同一手机号1分钟内只能发送1次
### 2. POST /api/v1/auth/verify-code（使用@Public()标记）
- 接收手机号+验证码
- 从Redis读取验证码比对
- 如果用户存在→登录，如果不存在→自动注册
- 生成accessToken(15分钟) + refreshToken(7天)
- 返回 { success: true, data: { accessToken, refreshToken, user } }
### 3. POST /api/v1/auth/refresh（使用@Public()标记）
- 接收refreshToken
- 验证token有效性
- 生成新的accessToken
- 返回 { success: true, data: { accessToken } }
### 4. POST /api/v1/auth/logout
- 需要JWT认证
- 将refreshToken加入Redis黑名单
- 返回 { success: true, data: null }
### 5. JWT策略
- jwt.strategy.ts: 从Authorization Bearer提取用户ID
- jwt-refresh.strategy.ts: 验证refresh token
- jwt-auth.guard.ts: 可全局使用的Guard，支持@Public()装饰器跳过认证

## 测试要求
auth.service.spec.ts:
- sendCode: 正常发送、限流、无效手机号
- verifyCode: 登录成功、注册成功、验证码错误、验证码过期
- refresh: 正常刷新、token过期、token无效
- logout: 正常登出
auth.controller.spec.ts:
- 每个端点的正常和异常场景
- 响应格式符合 { success, data }
- @Public()装饰器测试: 验证auth端点不需要JWT
- RolesGuard测试: 验证admin角色限制正确工作

## 质量标准
1. TypeScript strict，零any
2. 所有DTO使用class-validator装饰器
3. 错误使用HttpException，中文错误消息
4. 80%+测试覆盖率
5. 单文件<500行
开始执行。先创建通用权限基础设施，再创建认证模块，再写测试，确保测试通过。
```

---

## ═══════════════════════════════════════════════

## SESSION B2: Users用户模块 (Phase 2)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/users/
**依赖**: F1+F3完成
```

你是一个后端开发工程师。你的任务是为AiNeed V3实现用户管理模块。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md
3. 检查 C:\AiNeed\V3\apps\backend\ 的现有代码

## 读写边界
只允许创建/修改：src/modules/users/

## 创建的文件
```

src/modules/users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── dto/
│   ├── update-user.dto.ts
│   └── update-preferences.dto.ts
└── __tests__/
    ├── users.service.spec.ts
    └── users.controller.spec.ts
```

## API端点
1. GET /api/v1/users/me - 当前用户信息（需JWT）
   - 返回用户基本信息+风格偏好
   - Prisma include: userStylePreferences
2. PATCH /api/v1/users/me - 更新用户资料（需JWT）
   - 可更新: nickname, avatarUrl, gender, birthYear, height, weight, bodyType, colorSeason, language
   - 只更新提供的字段（部分更新）
3. POST /api/v1/users/me/avatar - 上传头像（需JWT）
   - multipart/form-data
   - 文件大小限制5MB
   - 格式限制: jpg/png/webp
   - 上传到MinIO，返回URL
   - 更新用户的avatarUrl字段
4. PUT /api/v1/users/me/preferences - 更新风格偏好（需JWT）
   - 更新: styleTags, occasionTags, colorPreferences, budgetRange
   - Upsert操作（存在则更新，不存在则创建）
5. GET /api/v1/users/:id/profile - 获取用户公开主页（可选JWT）
   - 返回: nickname, avatarUrl, 风格标签, 关注/粉丝数, 公开搭配数
   - 不返回敏感信息（手机号、邮箱等）

## 质量标准
- 80%+测试覆盖率
- TypeScript strict，零any
- 所有输入使用class-validator验证
- 统一响应格式
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION B3: Clothing服装模块 (Phase 2)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/clothing/
**依赖**: F1+F3完成
```

你是一个后端开发工程师。你的任务是为AiNeed V3实现服装目录模块。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md
3. 检查现有代码结构

## 读写边界
只允许创建/修改：src/modules/clothing/

## 创建的文件
```

src/modules/clothing/
├── clothing.module.ts
├── clothing.controller.ts
├── clothing.service.ts
├── dto/
│   ├── clothing-filter.dto.ts
│   └── pagination.dto.ts
└── __tests__/
    ├── clothing.service.spec.ts
    └── clothing.controller.spec.ts
```

## API端点
1. GET /api/v1/clothing - 服装列表（分页+过滤）
   - 查询参数: page, limit, category, gender, season, occasion, styleTag, priceMin, priceMax, sortBy(price/createdAt), sortOrder
   - Prisma查询：动态WHERE条件构建
   - include: brand, category
   - 默认分页: page=1, limit=20
2. GET /api/v1/clothing/:id - 服装详情
   - include: brand, category
   - 404如果不存在或isActive=false
3. GET /api/v1/clothing/search?q=keyword - 搜索
   - 使用PostgreSQL的tsvector全文搜索（中文分词）
   - 搜索字段: name, description
   - 同样支持分页和过滤
4. POST /api/v1/clothing - 创建服装（需JWT，管理员权限占位）
   - 接收完整的服装数据
   - 验证brandId和categoryId存在

## 关键实现
PaginationDto:
```typescript
class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
```

ClothingFilterDto extends PaginationDto:
- category: string (分类slug)
- gender: Gender
- season: Season
- occasion: Occasion
- styleTag: string
- priceMin: number
- priceMax: number
- sortBy: 'price' | 'createdAt' | 'name'
- sortOrder: 'asc' | 'desc'
动态查询构建：
```typescript
const where: Prisma.ClothingItemWhereInput = {
  isActive: true,
  ...(category && { category: { slug: category } }),
  ...(gender && { gender }),
  ...(season && { seasons: { has: season } }),
  ...(occasion && { occasions: { has: occasion } }),
  ...(styleTag && { styleTags: { has: styleTag } }),
  ...(priceMin || priceMax) && {
    price: { gte: priceMin, lte: priceMax }
  },
};
```

## 质量标准
- 80%+测试覆盖率
- 零any
- 分页元数据: { total, page, limit, totalPages }
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION B4: Upload上传模块 (Phase 2)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/upload/
**依赖**: F1+F3完成
```

你是一个后端开发工程师。你的任务是为AiNeed V3实现文件上传模块。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写边界
只允许创建/修改：src/modules/upload/

## 创建的文件
```

src/modules/upload/
├── upload.module.ts
├── upload.controller.ts
├── upload.service.ts
└── __tests__/
    └── upload.service.spec.ts
```

## 功能要求
1. POST /api/v1/upload/image
   - multipart/form-data, field name: "file"
   - 文件限制: 最大10MB, 格式jpg/png/webp
   - 生成唯一文件名: {timestamp}-{uuid}.{ext}
   - 上传到MinIO bucket: "aineed", path: "images/{yyyy-MM-dd}/"
   - 返回 { success: true, data: { url: "http://minio:9000/aineed/images/..." } }
2. MinIO集成:
   - 使用minio npm包连接MinIO
   - bucket不存在时自动创建
   - 设置bucket为public read
3. 开发模式fallback:
   - 如果MinIO不可用，将文件保存到本地 uploads/ 目录
   - 返回本地文件URL

## 质量标准
- 文件类型验证
- 文件大小验证
- 病毒扫描占位（TODO但不实现）
- 80%+测试覆盖率
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION B5: Search搜索模块 (Phase 2)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/search/ (后端) + apps/mobile/app/search/ (前端)
**依赖**: F1+F3+B3+B6完成
```

你是一个全栈开发工程师。你的任务是为AiNeed V3实现统一搜索功能（后端+前端）。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md
3. 检查现有代码结构（特别是B3服装模块、B6衣橱模块）

## 读写边界
后端只允许: src/modules/search/
前端只允许: apps/mobile/app/search/

## 后端创建的文件
```

src/modules/search/
├── search.module.ts
├── search.controller.ts
├── search.service.ts
├── dto/
│   └── search-query.dto.ts
└── __tests__/
    ├── search.service.spec.ts
    └── search.controller.spec.ts
```

## 前端创建的文件
```

apps/mobile/app/search/
├── index.tsx                    # 搜索页主界面
├── _layout.tsx                  # 搜索页布局
└── components/
    ├── SearchBar.tsx            # 搜索框(自动聚焦, 白底圆角, 搜索SVG图标)
    ├── SearchResults.tsx        # 搜索结果列表(按类型分组)
    └── FilterChips.tsx          # 过滤标签(类型切换)
```

## API端点
### 1. GET /api/v1/search?q=keyword&types=clothing,designs,posts,studios&limit=20
- 统一搜索入口（需JWT，使用@Public()装饰器标记为可选认证）
- 查询参数:
  - q: 搜索关键词（必填，最少2个字符）
  - types: 搜索类型（逗号分隔，默认clothing,designs,posts,studios）
  - limit: 每种类型返回数量（默认20，最大50）
  - page: 分页页码
- 搜索策略:
  - PostgreSQL全文搜索(tsvector + tsquery, 中文分词)
  - pgvector向量搜索(如果qdrant可用，结合语义相似度)
  - 两种搜索结果按类型分组，使用RRF融合排序
- 返回格式:
  ```json
  {
    "success": true,
    "data": {
      "clothing": { "items": [...], "total": 42 },
      "posts": { "items": [...], "total": 15 },
      "designs": { "items": [...], "total": 8 },
      "studios": { "items": [...], "total": 3 }
    },
    "meta": { "query": "keyword", "types": ["clothing", "posts"] }
  }
  ```
### 2. GET /api/v1/search/suggestions?q=keyword
- 搜索建议/自动补全（需JWT，使用@Public()装饰器）
- 查询参数: q（最少1个字符）
- 返回: { success: true, data: string[] }（最多10条建议）
- 实现: Redis缓存热门搜索词 + 数据库LIKE前缀匹配
- Redis key: search:suggestions:{prefix}, TTL 5分钟

## 关键实现
- SearchQueryDto: class-validator验证(q非空, types可选数组, limit默认20)
- SearchService: 注入PrismaService，按type分别查询再合并
- 服装搜索: WHERE name ILIKE '%q%' OR description ILIKE '%q%'
- 帖子搜索: WHERE title ILIKE '%q%' OR content ILIKE '%q%'
- 用户搜索: WHERE nickname ILIKE '%q%'
- 工作室搜索: WHERE name ILIKE '%q%' OR city ILIKE '%q%'

## 前端实现
### app/search/index.tsx
- SearchBar组件: 自动聚焦, 白底圆角输入框, 右侧搜索SVG图标
- 搜索历史: AsyncStorage存储, 最多10条, 可清除
- 热门搜索标签: Chip组件展示, 点击直接搜索
- FilterChips: 搜索类型切换(全部/服装/帖子/设计/工作室)
- SearchResults: FlatList渲染, 按类型分组显示
- 每种类型不同的卡片样式(服装=图片+名称+价格, 帖子=图片+标题+作者)
- 过滤器(底部弹出面板): 分类/价格区间/季节/性别/排序
- 下拉刷新+无限滚动加载更多
- 空状态: "没有找到相关结果" + 推荐搜索词

## 质量标准
1. TypeScript strict，零any
2. 所有DTO使用class-validator装饰器
3. 80%+测试覆盖率（后端）
4. 统一响应格式 { success, data }
5. 使用设计Token(theme/)
6. TanStack Query管理服务端数据
7. 零TODO，零placeholder
开始执行。先创建后端，再创建前端。
```

---

## ═══════════════════════════════════════════════

## SESSION B6: Wardrobe衣橱模块 (Phase 2)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/wardrobe/ (后端) + apps/mobile/app/(tabs)/wardrobe.tsx辅助数据
**依赖**: F1+F3+B1完成
```

你是一个后端开发工程师。你的任务是为AiNeed V3实现衣橱管理模块。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md
3. 检查现有代码结构（特别是B1 Auth模块）

## 读写边界
只允许创建/修改：src/modules/wardrobe/

## 创建的文件
```

src/modules/wardrobe/
├── wardrobe.module.ts
├── wardrobe.controller.ts
├── wardrobe.service.ts
├── dto/
│   ├── add-to-wardrobe.dto.ts
│   ├── wardrobe-query.dto.ts
│   └── update-wardrobe-item.dto.ts
└── __tests__/
    ├── wardrobe.service.spec.ts
    └── wardrobe.controller.spec.ts
```

## API端点
### 1. GET /api/v1/wardrobe - 衣橱列表（需JWT）
- 查询参数:
  - page, limit（分页，默认page=1, limit=20）
  - category: 按分类过滤（top/bottom/outer/shoes/accessory/dress）
  - season: 按季节过滤（spring/summer/autumn/winter）
  - color: 按主色过滤
  - sortBy: 'createdAt' | 'wornCount'（默认createdAt）
  - sortOrder: 'asc' | 'desc'（默认desc）
- 返回: 用户衣橱中的服装列表，include服装详情(图片+名称+品牌+价格)
- Prisma查询: wardrobe_items WHERE userId = currentUser, include clothingItem
### 2. POST /api/v1/wardrobe - 添加到衣橱（需JWT）
- body: { clothingId: string, customName?: string, customImage?: string, notes?: string, tags?: string[] }
- 验证: clothingId存在于clothing_items表
- 防重复: 同一用户同一服装不能重复添加(UNIQUE约束)
- 返回: 创建的wardrobe_item记录
### 3. DELETE /api/v1/wardrobe/:id - 从衣橱移除（需JWT）
- 验证: 该item属于当前用户
- 硬删除（不是软删除）
- 返回: { success: true, data: null }
### 4. GET /api/v1/wardrobe/stats - 衣橱统计（需JWT）
- 返回:
  ```json
  {
    "totalItems": 42,
    "byCategory": { "top": 15, "bottom": 10, "outer": 8, "shoes": 5, "accessory": 4 },
    "bySeason": { "spring": 20, "summer": 18, "autumn": 22, "winter": 12 },
    "byColor": { "黑色": 10, "白色": 8, "蓝色": 6 },
    "mostWorn": [{ "id": "xxx", "name": "白色T恤", "wornCount": 15 }],
    "recentlyAdded": [{ "id": "xxx", "name": "牛仔裤", "addedAt": "..." }]
  }
  ```
- Redis缓存: wardrobe:stats:{userId}, TTL 5分钟，添加/删除时失效
### 5. PATCH /api/v1/wardrobe/:id - 更新衣橱项目（需JWT）
- body: { notes?: string, tags?: string[], customName?: string }
- 验证: 该item属于当前用户
- 只更新提供的字段（部分更新）

## 关键实现
- WardrobeQueryDto extends PaginationDto: 添加category, season, color, sortBy, sortOrder字段
- AddToWardrobeDto: clothingId(必填), customName, customImage, notes, tags(可选)
- UpdateWardrobeItemDto: notes, tags, customName(全部可选)
- wardrobe_items表的worn_count字段: 记录穿着次数，用于统计最常穿着
- Service层方法: findAll, add, remove, getStats, update

## 质量标准
1. TypeScript strict，零any
2. 所有DTO使用class-validator装饰器
3. 80%+测试覆盖率
4. 统一响应格式 { success, data }
5. 错误使用HttpException，中文错误消息
6. 零TODO，零placeholder
开始执行。先创建文件，再写测试，确保测试通过。
```

---

## ═══════════════════════════════════════════════

## SESSION B7: Favorites收藏模块 (Phase 2)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/favorites/ (后端)
**依赖**: F1+F3+B1完成
```

你是一个后端开发工程师。你的任务是为AiNeed V3实现收藏管理模块。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md
3. 检查现有代码结构（特别是B1 Auth模块）

## 读写边界
只允许创建/修改：src/modules/favorites/

## 创建的文件
```

src/modules/favorites/
├── favorites.module.ts
├── favorites.controller.ts
├── favorites.service.ts
├── dto/
│   ├── add-favorite.dto.ts
│   └── favorite-query.dto.ts
└── __tests__/
    ├── favorites.service.spec.ts
    └── favorites.controller.spec.ts
```

## API端点
### 1. GET /api/v1/favorites - 收藏列表（需JWT）
- 查询参数:
  - page, limit（分页，默认page=1, limit=20）
  - targetType: 按类型过滤（clothing/post/outfit/design）
  - sortBy: 'createdAt'（默认createdAt DESC）
- 返回: 收藏列表，include被收藏对象的详情
- 不同targetType加载不同的关联数据:
  - clothing → include clothingItem(图片+名称+价格+品牌)
  - post → include communityPost(标题+图片+作者)
  - outfit → include outfit(搭配详情)
  - design → include customDesign(设计预览+名称)
### 2. POST /api/v1/favorites - 添加收藏（需JWT）
- body: { targetType: "clothing"|"post"|"outfit"|"design", targetId: string }
- 验证:
  - targetType必须是合法枚举值
  - targetId对应的记录必须存在
  - 不能重复收藏（UNIQUE约束: userId + targetType + targetId）
- 创建favorites记录
- 返回: { success: true, data: { id, targetType, targetId, createdAt } }
### 3. DELETE /api/v1/favorites/:id - 取消收藏（需JWT）
- 验证: 该收藏记录属于当前用户
- 硬删除
- 返回: { success: true, data: null }
### 4. GET /api/v1/favorites/check?targetType=xxx&targetId=xxx - 检查是否已收藏（需JWT）
- 查询参数: targetType(必填), targetId(必填)
- 返回: { success: true, data: { isFavorited: boolean, favoriteId?: string } }
- 用于前端显示收藏按钮状态（空心/实心爱心图标）
- Redis缓存: favorite:{userId}:{targetType}:{targetId}, TTL 1分钟

## 关键实现
- AddFavoriteDto: targetType(枚举验证), targetId(UUID验证)
- FavoriteQueryDto extends PaginationDto: targetType(可选枚举过滤)
- 防重复: try/catch Prisma unique constraint error，返回友好错误消息
- targetType枚举: 'clothing' | 'post' | 'outfit' | 'design'
- 多态关联: Prisma查询时根据targetType include不同的关联表
- 统计: 可选在users表或Redis维护favorites_count，避免每次COUNT查询

## 质量标准
1. TypeScript strict，零any
2. 所有DTO使用class-validator装饰器
3. 80%+测试覆盖率
4. 统一响应格式 { success, data }
5. 错误使用HttpException，中文错误消息
6. 零TODO，零placeholder
开始执行。先创建文件，再写测试，确保测试通过。
```

---

## ═══════════════════════════════════════════════

## SESSION A1: LLM服务 (Phase 3 - 最先执行)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/stylist/services/
**依赖**: F1+F3完成
```

你是一个AI服务开发工程师。你的任务是实现LLM调用服务。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写边界
只允许创建/修改：src/modules/stylist/services/

## 创建的文件
```

src/modules/stylist/services/
├── llm.service.ts
├── llm.interface.ts
└── __tests__/
    └── llm.service.spec.ts
```

## 功能要求
### LLM Provider接口
```typescript
interface LLMProvider {
  name: string;
  chat(messages: ChatMessage[], options?: LLMOptions): Promise<string>;
  chatStream(messages: ChatMessage[], options?: LLMOptions): AsyncGenerator<string>;
  isAvailable(): Promise<boolean>;
}
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
interface LLMOptions {
  temperature?: number;  // 默认0.7
  maxTokens?: number;    // 默认2048
  topP?: number;         // 默认0.9
}
```

### GLM-5 Provider
- API: https://open.bigmodel.cn/api/paas/v4/chat/completions
- 模型: glm-5 (从env读取)
- OpenAI兼容格式
- 流式: stream=true, 解析SSE data块
- 超时: 30秒
- 重试: 失败重试1次
### DeepSeek Fallback Provider
- API: https://api.deepseek.com/v1/chat/completions
- 模型: deepseek-chat
- 同样的接口格式
- 当GLM-5失败时自动切换
### LLMService
```typescript
class LLMService {
  // 单次调用（非流式）
  async chat(messages: ChatMessage[], options?: LLMOptions): Promise<string>;
  // 流式调用
  async *chatStream(messages: ChatMessage[], options?: LLMOptions): AsyncGenerator<string>;
  // 检查服务可用性
  async isAvailable(): Promise<boolean>;
  // 内部: 选择provider
  private async selectProvider(): Promise<LLMProvider>;
}
```

Provider选择逻辑:
1. 先尝试GLM-5
2. 如果GLM-5失败或不可用，切换DeepSeek
3. 如果都不可用，抛出ServiceUnavailableException

## 测试要求
- mock HTTP请求测试Provider选择逻辑
- 测试流式输出的正确解析
- 测试超时和重试逻辑
- 测试fallback切换
- 80%+覆盖率

## 关键约束
1. API key从.env读取，不硬编码
2. 所有HTTP请求有超时处理
3. 错误时抛出有意义的中文错误消息
4. 使用axios或fetch调用API
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION A2: 知识图谱 (Phase 3)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/knowledge/
**依赖**: F1+F3完成
```

你是一个后端开发工程师。你的任务是实现Neo4j知识图谱模块。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md（Neo4j Schema在2.2节）
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md
3. C:\AiNeed\DELIVERY-V3\03-CORE-AI-DEEP-DIVE.md（知识图谱详细设计）

## 读写边界
只允许创建/修改：src/modules/knowledge/

## 创建的文件
```

src/modules/knowledge/
├── knowledge.module.ts
├── knowledge.service.ts
├── neo4j.service.ts
├── seed/
│   └── knowledge-seed.ts
└── __tests__/
    └── knowledge.service.spec.ts
```

## 功能要求
### Neo4jService
- 连接Neo4j（从env读取URL/用户名/密码）
- 连接池管理
- 执行Cypher查询
- 错误处理
### KnowledgeService
1. 色彩兼容性查询:
   - getColorPairs(color: string): 返回互补色和冲突色
   - 输入: "navy_blue" → 输出: { complements: ["camel", "white"], conflicts: ["neon_green"] }
2. 体型推荐:
   - getBodyTypeRecommendations(bodyType: string): 返回适合/避免的服装类型
3. 场合规则:
   - getOccasionRules(occasion: string): 返回场合的着装要求和禁忌
4. 季节推荐:
   - getSeasonRecommendations(season: string): 返回推荐色彩和面料
5. 知识搜索:
   - searchRules(context: string): 全文搜索匹配的规则
### 种子数据
创建至少100条知识规则：
- 色彩搭配规则: 30条
- 体型适配规则: 25条
- 场合着装规则: 25条
- 季节推荐规则: 20条
每条规则包含: id, name, condition, recommendation, strength(0-1)

## 质量标准
- Neo4j连接失败时优雅降级（返回空结果，不阻塞主流程）
- 80%+测试覆盖率（mock Neo4j）
- 零any
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION A3: 推荐引擎 (Phase 3)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/recommendation/
**依赖**: F1+F3完成
```

你是一个推荐系统工程师。你的任务是为AiNeed V3实现推荐引擎。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写边界
只允许创建/修改：src/modules/recommendation/

## 重要简化
这是MVP版推荐系统。不需要SASRec/GNN/Bandit等复杂算法。
只需要实用、可靠的内容推荐+热门推荐+简单协同过滤。

## 创建的文件
```

src/modules/recommendation/
├── recommendation.module.ts
├── recommendation.service.ts
├── recommendation.controller.ts
├── strategies/
│   ├── content-based.strategy.ts
│   ├── popularity.strategy.ts
│   └── collaborative.strategy.ts
├── dto/
│   └── recommendation-query.dto.ts
└── __tests__/
    └── recommendation.service.spec.ts
```

## 三通道推荐
### 1. 内容推荐 (ContentBasedStrategy)
- 分析用户的收藏/浏览记录中的服装属性
- 找出高频属性(颜色、风格、场合)
- 用这些属性查询相似服装
- 纯SQL实现: WHERE styleTags && Array[...] 等
### 2. 热门推荐 (PopularityStrategy)
- 按分类统计浏览量/收藏量
- Redis缓存热门列表(TTL 1小时)
- 新用户冷启动的首选
### 3. 简单协同过滤 (CollaborativeStrategy)
- 如果用户数<100，降级为热门推荐
- 找到与当前用户行为相似的用户
- 推荐这些用户收藏但当前用户未收藏的服装
### 融合策略
- 使用RRF(Reciprocal Rank Fusion)融合三个通道
- 权重: content=0.5, collaborative=0.3, popularity=0.2
- 新用户: popularity=1.0

## API端点
**重要路由说明**: 推荐端点 /clothing/recommend 和 /clothing/home-feed 在 recommendation.controller.ts 中实现，使用 @Controller('clothing') 前缀。虽然路由前缀是 /clothing，但由本模块的 controller 实现，通过 NestJS 路由注册保证与 B3 模块的 /clothing CRUD 端点不冲突（不同子路径: B3负责 /clothing 和 /clothing/:id，本模块负责 /clothing/recommend 和 /clothing/home-feed）。
1. GET /api/v1/clothing/recommend - 个性化推荐(需JWT)
   - 参数: limit, occasion, season, category, excludeIds
2. GET /api/v1/clothing/home-feed - 首页Feed(可选JWT)
   - 返回: { todayPicks: [], forYou: [], byOccasion: {} }
3. POST /api/v1/interactions - 记录用户行为(需JWT)
   - body: { clothingId, interactionType, durationMs?, context? }

## 质量标准
- 无用户时返回热门推荐（不报错）
- 80%+测试覆盖率
- Redis不可用时降级为直接查数据库
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION A4: AI造型师完整服务 (Phase 3)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/stylist/ (除services/目录外)
**依赖**: A1(LLM服务) + A2(知识图谱) + A3(推荐引擎) 完成
```

你是一个AI服务开发工程师。你的任务是组装完整的AI造型师服务。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写边界
允许创建/修改：src/modules/stylist/ (但不要修改services/llm.service.ts，那是A1创建的)

## 创建的文件
```

src/modules/stylist/
├── stylist.module.ts
├── stylist.controller.ts
├── stylist.service.ts
├── session.service.ts
├── outfit-parser.service.ts
├── outfit.service.ts                # Outfit持久化服务: 将解析后的搭配写入outfits+outfit_items表
├── dto/
│   ├── create-session.dto.ts
│   └── send-message.dto.ts
└── __tests__/
    ├── stylist.service.spec.ts
    └── outfit-parser.service.spec.ts
```

注意: prompts/system-prompt.ts 由D2 Session创建，本Session通过import使用，不负责创建或修改它。

## 核心功能
### 1. 会话管理 (SessionService)
- createSession: 创建新会话，注入用户画像到context
- getSessions: 用户会话列表
- getSession: 会话详情含消息历史
- deleteSession: 删除会话
### 2. AI造型师服务 (StylistService)
- sendMessage: 发送消息(非流式)
  - 加载最近10轮对话历史
  - 组装messages: [systemPrompt, knowledgeContext, ...history, userMessage]
  - 调用LLMService.chat
  - 存储用户消息和AI回复到数据库
  - 解析回复中的outfit JSON块
  - 返回回复内容+解析后的搭配推荐
### 3. SSE流式 (Controller)
- GET /api/v1/stylist/sessions/:id/stream?message=xxx
  - 使用@Sse装饰器
  - 调用LLMService.chatStream
  - 逐token发送MessageEvent
  - 15秒心跳间隔
  - 结束时存储完整回复
### 4. 搭配解析 (OutfitParserService)
- 从AI回复中提取 ```outfit ``` JSON块
- 解析为结构化搭配方案
- 匹配商品库中的实际商品（名称模糊搜索）
- 返回含商品ID和图片的搭配方案
### 5. 搭配持久化 (OutfitService)
- 当OutfitParserService解析出搭配方案时，自动调用OutfitService持久化
- 将搭配写入 outfits 表 (userId, name, occasion, styleTips)
- 将搭配中的每件单品写入 outfit_items 表 (outfitId, clothingItemId或自定义item, slot, reason)
- 如果搭配中的单品能匹配到clothing_items表中的真实商品，关联clothingItemId
- 如果无法匹配，存储自定义名称到itemName字段
- 返回持久化后的outfit ID，供前端展示和后续操作
- StylistService.sendMessage中: 解析完成后自动调用 outfitService.saveOutfit()
### 6. 系统Prompt
- **重要**: system-prompt.ts由D2 Session创建，本Session通过import使用它
- import路径: import { STYLIST_SYSTEM_PROMPT } from './prompts/system-prompt'
- 不创建或修改system-prompt.ts，只从D2创建的文件中import
- 如果D2尚未执行，临时在stylist.service.ts中内联一个简化版本，待D2完成后替换为import

### 7. Controller端点
```

POST   /api/v1/stylist/sessions          - 创建会话
GET    /api/v1/stylist/sessions          - 会话列表
GET    /api/v1/stylist/sessions/:id      - 会话详情+消息历史
DELETE /api/v1/stylist/sessions/:id      - 删除会话
POST   /api/v1/stylist/sessions/:id/messages - 发送消息(非流式)
GET    /api/v1/stylist/sessions/:id/stream   - SSE流式
```

## 质量标准
- GLM-5 API真实调用(非mock)，但测试中mock
- SSE流式输出可用
- 搭配JSON解析健壮(格式错误不crash)
- 80%+测试覆盖率
- 零any
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION A5: 向量嵌入服务 (Phase 3)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/embedding/
**依赖**: F1+F3完成
```

你是一个AI服务开发工程师。你的任务是实现向量嵌入服务。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写边界
只允许创建/修改：src/modules/embedding/

## 功能要求
### EmbeddingService
1. 文本嵌入:
   - 调用嵌入服务API(从env读取EMBEDDING_SERVICE_URL)
   - 输入文本，输出1024维向量
   - 批量嵌入支持(一次最多100条)
2. 服装向量化:
   - 接收clothingId，从数据库读取服装信息
   - 构造文本: name + description + styleTags + colors + materials
   - 调用嵌入服务获取向量
   - 更新数据库中的embedding字段
3. 语义搜索:
   - 输入查询文本
   - 获取查询文本的嵌入向量
   - 在Qdrant中搜索最相似的服装
   - 返回Top-K结果(默认20)
4. Qdrant集成:
   - 连接Qdrant(从env读取URL)
   - 创建collection: clothing_items (向量维度512/1024)
   - 插入/更新向量
   - 搜索向量
### API端点
- POST /api/v1/embedding/clothing/:id - 向量化单个服装(需JWT)
- POST /api/v1/embedding/batch - 批量向量化(需JWT)
- GET /api/v1/embedding/similar/:id - 查找相似服装
### 降级方案
- 如果嵌入服务不可用，使用PostgreSQL的pgvector直接搜索
- 如果Qdrant不可用，使用PostgreSQL的pgvector

## 质量标准
- 外部服务不可用时优雅降级
- 80%+测试覆盖率
- 零any
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION D1: 设计系统+UI组件库 (Phase 0)

## ═══════════════════════════════════════════════
**写入范围**: apps/mobile/src/theme/ + apps/mobile/src/components/ui/
**依赖**: 无(可最先执行)
```

你是一个UI/UX设计工程师和React Native开发工程师。你的任务是为AiNeed创建设计系统和基础UI组件库。

## 核心原则
这是时尚App。如果丑，就是死。审美是生存底线。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md（第五章设计系统规范 - 必须严格遵循）

## 创建的文件
### Theme (如果F2已经创建了theme/，在其基础上完善)
```

src/theme/
├── colors.ts      # 完整的颜色系统
├── typography.ts  # 字体系统
├── spacing.ts     # 间距系统
├── shadows.ts     # 阴影系统
├── borderRadius.ts # 圆角系统
└── index.ts       # 汇总导出 + useTheme hook
```

### UI Components (每个组件都要精致)
```

src/components/ui/
├── Button.tsx         # 主按钮、次要按钮、文字按钮
├── Input.tsx          # 文本输入框(带label和error)
├── Card.tsx           # 通用卡片(带阴影和圆角)
├── Avatar.tsx         # 头像(支持图片和首字母占位)
├── Badge.tsx          # 标签/徽章
├── Loading.tsx        # 加载指示器(全屏和内联两种)
├── EmptyState.tsx     # 空状态(图标+文字+操作按钮)
├── Header.tsx         # 页面头部(标题+返回+右侧操作)
├── SearchBar.tsx      # 搜索框
├── TabBar.tsx         # 自定义Tab切换
├── Toast.tsx          # 提示消息
├── Divider.tsx        # 分隔线
├── Chip.tsx           # 可选中的小标签
├── ImageCarousel.tsx  # 图片轮播
└── RatingStars.tsx    # 评分星星
```

## 审美要求
1. **大留白** - padding至少16px，区块间距至少24px
2. **精致阴影** - 用box-shadow而不是border来区分层级
3. **圆角统一** - 8px卡片, 16px按钮, 24px头像
4. **颜色克制** - 主色只用于关键交互(按钮/链接)，大部分用中性色
5. **字体层次** - 标题粗体大号，正文常规中号，辅助灰色小号
6. **动画** - 按钮按压有0.95缩放反馈，页面切换有过渡动画

## 参考标准
- 得物App的产品卡片风格
- 小红书的双列Feed流
- NET-A-PORTER的留白和排版
- 整体风格: 高端、精致、有温度

## 质量标准
- 每个组件接受style prop允许自定义
- 每个组件有TypeScript类型定义
- 使用StyleSheet.create + 设计Token
- 深色模式预留(不实现，但结构支持)
开始执行。审美是最重要的考核标准。
```

---

## ═══════════════════════════════════════════════

## SESSION D2: AI Prompt工程 (Phase 0)

## ═══════════════════════════════════════════════
**写入范围**: apps/backend/src/modules/stylist/prompts/
**依赖**: 无
```

你是一个Prompt工程师。你的任务是为AiNeed的AI造型师设计高质量的对话Prompt。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写边界
只允许创建/修改：src/modules/stylist/prompts/（如果目录不存在就创建它）

## 创建的文件
```

src/modules/stylist/prompts/
├── system-prompt.ts       # 基础系统Prompt
├── knowledge-prompt.ts    # 知识注入Prompt
├── user-context.ts        # 用户画像注入
├── outfit-format.ts       # 搭配输出格式定义
└── scenarios/
    ├── casual.ts          # 休闲场景Prompt
    ├── work.ts            # 通勤场景Prompt
    ├── date.ts            # 约会场景Prompt
    ├── sport.ts           # 运动场景Prompt
    └── formal.ts          # 正式场景Prompt
```

## Prompt质量标准
### 系统Prompt (system-prompt.ts)
- 身份定义清晰("你是AI造型师小衣")
- 能力边界明确(能做什么，不能做什么)
- 行为规则具体(回复长度、推荐格式、追问策略)
- 输出格式可解析(outfit JSON块)
- 中文语气温暖专业
### 知识注入 (knowledge-prompt.ts)
- 从知识图谱查询结果动态注入
- 格式化为自然语言规则
- 不超过500字(控制token消耗)
### 用户画像 (user-context.ts)
- 从数据库读取用户偏好
- 格式化为简洁的描述
- 示例: "用户是25岁女性，身高165cm，梨型身材，春季型肤色。偏好韩系和简约风格。常去场合：通勤、约会。预算：单品200-800元。"
### 场景Prompt
每个场景包含:
- 场景特定规则(如: 通勤忌过于暴露)
- 推荐单品范围
- 色彩建议
- 搭配禁忌

## 验证方法
为每个Prompt写3个测试用例:
1. 用户的典型问题 → 预期回复方向
2. 模糊问题 → 预期追问行为
3. 超出能力范围的问题 → 预期拒绝/引导行为
(这些测试用例写在文件注释中，不需要运行)
开始执行。Prompt质量直接决定AI造型师的用户体验。
```

---

## ═══════════════════════════════════════════════

## SESSION MB1-MB7: 移动端页面 (Phase 4 模板)

## ═══════════════════════════════════════════════
每个移动端Session遵循相同的结构：
```

你是一个高级React Native开发工程师。你的任务是实现[具体页面]。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md（注意第五章设计规范）

## 检查现有代码
1. 读取 app/_layout.tsx 了解导航结构
2. 读取 src/theme/ 了解设计Token
3. 读取 src/components/ui/ 了解可用组件
4. 读取 src/services/ 了解API服务
5. 读取 src/stores/ 了解状态管理

## 读写边界
只允许创建/修改：[具体文件范围]

## 页面要求
[具体页面的详细功能要求]

## 审美标准
1. 使用设计Token(颜色/字体/间距来自theme/)
2. 大留白，高端感
3. 加载状态(Loading组件)
4. 错误状态(EmptyState组件)
5. 下拉刷新(如果适用)
6. 底部加载更多(如果适用)

## 质量标准
1. TypeScript strict，零any
2. 使用TanStack Query管理服务端数据
3. 使用Zustand管理客户端状态
4. 所有样式用StyleSheet.create + 设计Token
5. 中文UI
6. 零TODO
```

### 各Session具体要求：
**MB1: 认证+引导** → app/(auth)/* + app/onboarding/*
- login.tsx: 手机号+验证码登录(开发模式直接跳过验证)
  - 精致登录页: 品牌Logo + 大留白 + 手机号输入 + 验证码按钮
  - 白底设计，品牌色#1A1A2E文字，强调色#E94560按钮
  - 底部"跳过登录"文字按钮(开发模式)
- register.tsx: 补充昵称/性别/生日
  - 渐进式信息收集，每步一个大输入框
- onboarding: 6步引导(性别→身高体重→体型→风格→场合→完成)
  - 每步全屏展示，进度条顶部指示
  - 风格选择: 卡片式多选(韩系/日系/国潮/欧美/简约/新中式)
  - 场合选择: 卡片式多选(通勤/约会/运动/休闲/聚会/校园)
  - 完成页: 引导创建Q版形象(跳转avatar/create)
**MB2: 首页(Q版形象为核心)** → app/(tabs)/index.tsx
- 核心布局(严格遵循04-MASTER-PLAN.md 5.4.1节ASCII布局):
  ```

  ┌─────────────────────────┐
  │ 早上好, Richard   [头像]│  ← 问候语+Q版小头像(40x40)
  ├─────────────────────────┤
  │                         │
  │   ┌───────────────┐     │
  │   │  Q版形象       │     │  ← 居中大区域(占屏幕~40%)
  │   │  (Skia动态渲染)│     │  ← idle呼吸动画, 会动!
  │   │  今日穿着预览   │     │  ← clothingMap可视化
  │   └───────────────┘     │
  │                         │
  ├─────────────────────────┤
  │ 今日推荐    [换一套]    │  ← AI生成的搭配方案
  │ ┌────┐ ┌────┐ ┌────┐   │  ← 横向滚动卡片
  │ │上衣│ │裤子│ │鞋子│   │
  │ └────┘ └────┘ └────┘   │
  ├─────────────────────────┤
  │ 快捷操作                │
  │ [试衣] [定制] [社区]    │  ← 快捷入口(带SVG图标)
  └─────────────────────────┘
  ```

- Q版形象区域:
  - 从QAvatarRenderer组件(AV4)渲染用户形象
  - 无形象时显示"创建形象"引导卡片
  - idle呼吸动画持续播放
  - 点击形象跳转avatar/showcase页面
- 今日推荐:
  - 横向FlatList, 每张卡片: 服装图+名称+价格
  - "换一套"按钮调用推荐API刷新
  - 点击跳转clothing/[id]
- 快捷操作: SVG图标按钮行(虚拟试衣/图案定制/社区/高端定制)
- 下拉刷新刷新全部数据
- 使用TanStack Query调用 /clothing/home-feed + /avatar/me
- **app/actions/index.tsx**: 实现中间Tab"+"按钮的快捷入口面板
  - 底部弹出Modal(半屏, 圆角顶部)
  - 4个快捷入口(2x2网格): 虚拟试衣(跳转tryon) / 图案定制(跳转customize) / 发帖(跳转community/create) / 高端定制(跳转bespoke)
  - 每个入口: SVG图标 + 文字标签
  - 点击入口跳转对应页面并关闭Modal
  - 背景半透明遮罩，点击遮罩关闭
**MB3: AI造型师(卡片交互式)** → app/(tabs)/stylist.tsx
- 核心设计: 非纯对话! 用户通过卡片选择→AI生成搭配→卡片展示结果
- 严格遵循04-MASTER-PLAN.md 5.4.2节ASCII布局
- 初始状态(未选择):
  ```

  ┌─────────────────────────┐
  │ ← AI造型师              │
  ├─────────────────────────┤
  │  ┌───────────────┐      │
  │  │ Q版小形象     │      │  ← 顶部小形象(wave动画)
  │  │ "来帮你搭配!" │      │
  │  └───────────────┘      │
  ├─────────────────────────┤
  │ 今天要去哪里?           │  ← 卡片选择区
  │ ┌────┐ ┌────┐ ┌────┐   │
  │ │工作│ │约会│ │运动│   │  ← 点击选择(高亮)
  │ └────┘ └────┘ └────┘   │
  │ ┌────┐ ┌────┐ ┌────┐   │
  │ │休闲│ │聚会│ │校园│   │
  │ └────┘ └────┘ └────┘   │
  │                         │
  │ 预算范围?               │
  │ [100内] [200内] [500+]  │  ← 胶囊按钮选择
  │                         │
  │ 风格偏好?               │
  │ [简约] [韩系] [国潮]   │  ← 可多选Chip
  │ [日系] [欧美] [新中式]  │
  │                         │
  │      [生成搭配方案]      │  ← 主按钮(强调色)
  └─────────────────────────┘
  ```

- 生成结果后(已选择):
  ```

  ├─────────────────────────┤
  │ 为你推荐这套:           │
  │                         │
  │ ┌─────────────────────┐ │
  │ │ ┌────┐ ┌────┐ ┌──┐ │ │  ← 搭配卡片(可左右滑动)
  │ │ │上衣│ │裤子│ │鞋│ │ │  ← 每件含图片+名称+价格
  │ │ │¥199│ │¥299│ │¥ │ │ │
  │ │ └────┘ └────┘ └──┘ │ │
  │ │ 简约通勤风, 适合...  │ │  ← AI文字说明
  │ │ [试穿] [收藏] [换]  │ │  ← 操作按钮
  │ └─────────────────────┘ │
  │                         │
  │    [换一套] [全部试穿]   │
  └─────────────────────────┘
  ```

- 交互流程:
  1. 用户点击场合卡片(单选高亮)
  2. 可选: 预算+风格标签
  3. 点击"生成搭配方案" → 调用POST /stylist/sessions/:id/messages
  4. 加载中: Q版形象切换think动画
  5. 结果渲染为搭配卡片组件(非聊天消息)
  6. "试穿"→跳转tryon页, "收藏"→toggle, "换一套"→重新生成
  7. 底部"全部试穿"→批量跳转试衣
- 可选: 底部"文字描述"按钮→切换到纯聊天模式(SSE流式)
- 顶部Q版小形象: 从AV4的QAvatarMini组件渲染，带wave动画
**MB4: 衣橱(Q版形象可视化)** → app/(tabs)/wardrobe.tsx
- 核心设计: Q版形象为可视化核心，不是简单的列表
- 布局:
  ```

  ┌─────────────────────────┐
  │ 我的衣橱      [+添加]   │
  ├─────────────────────────┤
  │                         │
  │   ┌───────────────┐     │
  │   │  Q版形象       │     │  ← 大区域展示(占屏幕~45%)
  │   │  当前穿着       │     │  ← 每个部位可点击
  │   │  点击部位管理   │     │
  │   └───────────────┘     │
  │                         │
  ├─────────────────────────┤
  │ 全部 上装 下装 外套 鞋履│  ← 分类Tab(辅助)
  ├─────────────────────────┤
  │ ┌────┐ ┌────┐ ┌────┐   │  ← 服装卡片网格
  │ │ 图 │ │ 图 │ │ 图 │   │
  │ │名称│ │名称│ │名称│   │
  │ └────┘ └────┘ └────┘   │
  └─────────────────────────┘
  ```

- Q版形象交互:
  - 渲染用户形象(QAvatarRenderer) + 当前clothingMap
  - 点击形象的上身部位 → 过滤显示上装
  - 点击下身 → 过滤显示下装
  - 点击鞋 → 过滤显示鞋履
  - 点击配饰 → 过滤显示配饰
  - 长按任意部位 → 弹出该部位当前服装详情
- 服装列表:
  - Tab切换辅助过滤(全部/上装/下装/外套/鞋履/配饰)
  - 每件物品: 图片+名称+品牌卡片(精致阴影+圆角)
  - 右上角"+"按钮添加服装(跳转搜索页或拍照添加)
  - 空状态: Q版形象穿着默认服装 + "添加第一件服装"引导
- 调用 /wardrobe API + /avatar/me API
**MB5: 个人+设置(经典个人中心)** → app/(tabs)/profile.tsx + app/settings/*
- 核心设计: 经典个人中心，信息清晰，功能入口明确
- 布局:
  ```

  ┌─────────────────────────┐
  │                         │
  │    ┌────┐               │
  │    │头像│  昵称          │  ← 用户头像+昵称
  │    └────┘  [编辑资料]    │
  │                         │
  │  ┌───┐  ┌───┐  ┌───┐   │  ← 数据卡片行
  │  │ 12│  │ 8 │  │ 3 │   │  ← 收藏数/试衣数/定制数
  │  │收藏│  │试衣│  │定制│   │
  │  └───┘  └───┘  └───┘   │
  │                         │
  ├─────────────────────────┤
  │ ○ 我的Q版形象    [>]    │  ← 菜单列表(SVG图标)
  │ ○ 风格偏好       [>]    │
  │ ○ 我的定制       [>]    │  ← 跳转定制订单列表
  │ ○ 高端私人定制   [>]    │  ← 跳转bespoke页
  │ ○ 我的设计       [>]    │  ← 跳转设计管理
  │ ○ 设置           [>]    │
  │ ○ 退出登录              │
  └─────────────────────────┘
  ```

- 头像: 支持Q版形象头像和普通照片头像切换
- 数据卡片: 三个统计数字(收藏/试衣记录/定制订单)，点击跳转对应列表
- 菜单项: 全部使用SVG图标，分组(个人/定制/系统)
- settings/index.tsx: 通知设置/隐私设置/关于/版本号/清除缓存
- settings/preferences.tsx: 风格标签编辑/场合标签/预算范围/色彩偏好
**MB6: 搜索** → app/search/*
- 搜索框(自动聚焦, 白底圆角, 搜索SVG图标)
- 搜索历史(AsyncStorage, 最多10条, 可清除)
- 热门搜索标签(Chip组件, 服务端配置)
- 搜索结果: 双列布局(类似小红书), 每张卡片含图片+名称+价格
- 过滤器(底部弹出面板): 分类/价格区间/季节/性别/排序
- 调用 /search API
**MB7: 服装详情** → app/clothing/[id].tsx
- 大图展示(可滑动多图, 全宽圆角卡片)
- 名称+品牌+价格(品牌名灰色小字, 价格强调色)
- 属性标签(Chip组): 季节/场合/风格/颜色/材质
- "试穿"按钮(强调色#E94560, 跳转试衣页)
- "收藏"按钮(toggle, 空心/实心爱心图标)
- "加入衣橱"按钮(跳转衣橱页或直接添加)
- 推荐搭配(横向滚动卡片, "完整搭配"文字引导)
- 相似推荐(横向滚动, "看了又看")
- 调用 /clothing/:id API + /favorites 检查收藏状态

---

## ═══════════════════════════════════════════════

## SESSION C1-C6: 高级功能 (Phase 5 模板)

## ═══════════════════════════════════════════════
每个高级功能Session负责一个后端模块+对应前端页面：
**C5与C6联动说明**: C5(文生图搭配可视化)生成的搭配方案会自动触发C6(Q版avatar)的clothing_map更新。
联动流程: AI造型师推荐搭配 → C5生成穿搭效果图 → 提取每件单品{color, type} → 调用POST /avatar/me/dress更新Q版形象。两个Session的开发者需要在outfit_image模块中import avatar模块的dress接口。
```

你是一个全栈开发工程师。你的任务是实现[具体功能]。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md
3. C:\AiNeed\DELIVERY-V3\03-CORE-AI-DEEP-DIVE.md (C5/C6必读，参考3A/4节)

## 读写边界
后端只允许: src/modules/[module]/
前端只允许: app/[pages]/

## 质量标准
- 后端80%+测试覆盖率
- 前端使用设计Token
- 统一响应格式
- 零any, 零TODO
```

### 各Session详情：
**C1: 社区帖子** → src/modules/community/ + app/community/
- 后端: CRUD帖子+评论+点赞，分页，按时间/热门排序
- 前端: 帖子Feed流+发帖页+帖子详情+评论列表
**C2: 社交关系** → src/modules/social/ + app/community/user/
- 后端: 关注/取关，粉丝列表，关注列表，用户公开主页
- 前端: 用户主页(头像/昵称/关注按钮/帖子列表)
**C3: 私信系统** → src/modules/messaging/ + app/messages/
- 后端: 创建聊天室，发送消息，消息历史，标记已读
- **MVP实时通信方案**: 使用短轮询(每3秒GET未读消息)，不使用WebSocket，以降低复杂度。前端聊天详情页每3秒调用GET /api/v1/messages/:roomId?after={lastMessageId}获取新消息。后续版本可升级为SSE或WebSocket。
- 前端: 聊天室列表+聊天详情页(轮询刷新新消息)
**C4: 通知系统** → src/modules/notification/
- 后端: 创建通知，通知列表，标记已读，全部已读
- 通知类型: 点赞/评论/关注/系统
- 集成到各模块(发帖被评论→创建通知)
**C5: 文生图搭配可视化** → src/modules/outfit-image/
- 后端: 接收搭配方案(JSON) → 构造文生图Prompt → 调用GLM-5图像生成API → 存储结果图
- 成本: ~0.01元/张(GLM-5文生图API)，详见下方成本管理
- **Prompt工程(核心，参考03-CORE-AI-DEEP-DIVE.md 3A/4节)**:
  - 体型条件注入: 将用户body_type/height/color_season映射为英文视觉描述词
  - 搭配细节展开: 每件单品→{颜色+材质+风格+品类}英文描述
  - 场景Prompt模板: "A fashion editorial photo of a {body_type_desc} person, {height}cm tall, wearing {outfit_details}. {color_season} coloring. Clean studio background, professional fashion photography style, full body shot, natural lighting."
  - 风格修饰词: 根据outfit.style_tags添加fashion editorial/street style/casual chic等
  - 反向Prompt: "blurry, deformed, extra limbs, low quality, watermark, text"
- **GLM-5 API调用**:
  - 端点: POST https://open.bigmodel.cn/api/paas/v4/images/generations
  - 参数: { model: "glm-5", prompt, n: 1, size: "1024x768", quality: "hd" }
  - 认证: Bearer {ZHIPU_API_KEY}
  - 超时: 30秒，重试1次
- **错误处理与降级策略**:
  - API超时/失败 → 返回fallback纯文字搭配描述(不阻塞AI造型师主流程)
  - 内容审核拒绝 → 替换敏感词后重试1次，仍失败则降级
  - 用户无body_type数据 → 使用通用体型描述
- **缓存策略**:
  - Redis缓存key: hash(user_profile + outfit_items) → TTL 24小时
  - 相同搭配方案对同一用户不重复生成
  - 缓存命中率预计60%+（用户重复查看搭配）
- **成本管理**:
  - 单价: ~0.02元/张(GLM-5 HD质量)
  - 用户日限额: 每用户每天最多10张生成(防滥用)
  - 全局日预算: ¥10/天，月预算¥300
  - 月预估: 100 DAU * 30%使用率 * 2张/天 = 60张/天 ≈ ¥36/月
- **与Q版形象联动(参考C6 Session)**:
  - 生成搭配效果图后，自动提取每件单品的{color, type}
  - 调用avatar模块 POST /avatar/me/dress 接口更新clothing_map
  - 实现outfit-image → Q版avatar换装的端到端联动
  - 联动流程: AI造型师推荐搭配 → C5生成穿搭效果图 → C6 Q版形象同步换装
- 集成到AI造型师结果: 推荐搭配后自动调用生成穿搭效果图
- 历史记录: 用户可查看之前生成的搭配效果图(存储在MinIO)
- 无前端独立页面，集成到AI造型师(MB3)的结果展示区
**C6: 体型分析** → src/modules/body-analysis/
- 后端: 接收照片 → 调用ML分析服务(BODY_ANALYSIS_URL) → 返回体型+色彩季型+测量数据
- **分析Pipeline(参考03-CORE-AI-DEEP-DIVE.md 3A节)**:
  - Step 1: 人物检测+背景分离(YOLOv8+SAM)，质量评分<0.8则提示重拍
  - Step 2: 2D关键点检测(DWPose, 133个身体点)
  - Step 3: 3D人体重建(SMPLify-X)，输出SMPL-X参数(shape beta 1-10, pose theta)
  - Step 4: 测量提取(胸围/腰围/臀围/肩宽/臂长/腿长，误差±3-5cm)
  - Step 5: 体型分类(5种: 沙漏/梨/苹果/直筒/倒三角)
  - Step 6: 肤色分析 → 12种色彩季型
- **数据存储(body_profiles)**:
  - 无独立body_profiles表，数据存储在users表的已有字段中: body_type, height, weight, color_season
  - 详细测量数据存储在user_style_preferences表的JSONB字段中(扩展该表)
  - 原始分析结果(raw keypoints/SMPL params)不持久化，仅提取结构化结论
  - API端点: POST /api/v1/body-analysis/analyze(上传照片分析), GET /api/v1/body-analysis/profile(获取体型档案)
- **Q版形象联动(参考C5 Session和AV1/AV4 Session)**:
  - 分析完成后，根据用户color_season自动推荐Q版形象的肤色参数(skinTone)
  - 根据body_type推荐默认服装风格偏好，映射到avatar的clothing_map默认值
  - 联动流程: C6分析体型 → 更新user body_type/color_season → 触发avatar clothing_map推荐更新
  - Q版形象组件使用react-native-skia渲染(非Spine/Blender)，颜色+类型映射方式
- **clothing_map映射逻辑**:
  - 体型→服装推荐: 沙漏型→修身款, 梨型→A字款, 苹果型→V领款, 直筒型→层次款, 倒三角→宽下摆款
  - 色彩季型→配色推荐: 春型→暖亮色, 夏型→冷柔色, 秋型→暖深色, 冬型→冷深色
  - 映射结果写入user_avatars.clothing_map，格式: {slot: {color, type, pattern?}}
- 前端: 集成到个人页/引导页，分析结果可视化展示(体型图示+色彩季型卡片)

---

## ═══════════════════════════════════════════════

## SESSION BESPOKE1: 高端定制-工作室管理 (Phase 5)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/bespoke/ (工作室部分) + app/bespoke/index.tsx + app/bespoke/[studioId].tsx
**依赖**: F1+F3完成
```

你是一个后端开发工程师。你的任务是为AiNeed V3实现高端私人定制的工作室管理模块。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 关键背景
高端私人定制是全流程App内集成(非轻量入口转微信)。
用户可以在App内浏览工作室、提交需求、在线沟通、查看报价、确认支付、跟踪订单。

## 数据库表 (已在F1 Session创建，直接使用)
- bespoke_studios: 字段包括 name, slug, logo_url, cover_image_url, description, city, specialties[], service_types[], price_range, portfolio_images[], rating, review_count, order_count, is_verified, is_active
- 索引: idx_bespoke_studios_city, idx_bespoke_studios_verified (参考宪法2.1节)

## 读写边界
后端: src/modules/bespoke/
前端: app/bespoke/index.tsx, app/bespoke/[studioId].tsx

## 功能要求
### 工作室管理
1. GET /api/v1/bespoke/studios - 工作室列表
   - 过滤: serviceType(定制/改造/搭配), city, priceRange, sortBy(rating/orders)
   - include: 作品集图片+服务项目+评分+订单数
2. GET /api/v1/bespoke/studios/:id - 工作室详情
   - 作品集(图片+描述), 服务项目+价格区间, 评价列表, 营业资质
3. POST /api/v1/bespoke/studios - 工作室入驻申请(需JWT)
   - 商家注册: 名称/简介/城市/联系电话/服务项目/资质照片
   - 状态: pending → approved/rejected → active
4. PATCH /api/v1/bespoke/studios/:id - 更新工作室信息(需JWT+工作室所有者)
### 种子数据
创建5个示例工作室:
- 西装定制工作室(上海), 改造翻新工坊(北京), 潮牌联名设计社(深圳)
- 旗袍定制坊(杭州), 汉服设计工作室(成都)

## 质量标准
- 80%+测试覆盖率, 零any, 统一响应格式
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION BESPOKE2: 高端定制-订单流程 (Phase 5 - 串行，BESPOKE1完成后执行)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/bespoke/(订单部分) + app/bespoke/submit.tsx + chat/[orderId].tsx + quote/[orderId].tsx + orders.tsx
**依赖**: BESPOKE1+F1+F3完成。**重要**: BESPOKE1必须完全完成后才能开始此Session，因为订单流程依赖工作室管理的数据模型和种子数据。
```

你是一个全栈开发工程师。你的任务是实现高端私人定制的订单全流程。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写边界
后端: src/modules/bespoke/ (订单相关端点，不修改工作室部分)
前端: app/bespoke/submit.tsx, chat/[orderId].tsx, quote/[orderId].tsx, orders.tsx

## 功能要求
### 订单流程
1. POST /api/v1/bespoke/orders - 提交定制需求(需JWT)
   - body: studioId, serviceType, description, referenceImages[], budget, deadline
   - 创建bespoke_orders记录(status=submitted)
2. GET /api/v1/bespoke/orders - 我的定制订单(需JWT, 分页)
   - 按status过滤: submitted/quoted/paid/in_progress/completed/cancelled
3. GET /api/v1/bespoke/orders/:id - 订单详情(需JWT)
   - include: 工作室信息+沟通记录+报价信息+状态历史
4. POST /api/v1/bespoke/orders/:id/message - 与工作室沟通(需JWT)
   - 复用私信模块的消息格式(文字+图片)
   - 存储到bespoke_messages表
5. GET /api/v1/bespoke/orders/:id/messages - 获取沟通记录(需JWT)
   - 分页，按时间排序
6. POST /api/v1/bespoke/orders/:id/quote - 工作室发送报价(需JWT+工作室所有者)
   - body: price(分), description, estimatedDays, materials[]
   - 状态变更为quoted
7. GET /api/v1/bespoke/orders/:id/quote - 查看报价(需JWT)
8. POST /api/v1/bespoke/orders/:id/accept-quote - 用户接受报价(需JWT)
   - 状态变更为paid(支付占位)
   - 生成支付信息(微信/支付宝占位)
9. PATCH /api/v1/bespoke/orders/:id/cancel - 取消订单(需JWT)
   - 只有submitted/quoted状态可取消
10. POST /api/v1/bespoke/studios/:id/review - 评价工作室(需JWT, 订单完成后)
### 数据库表 (已在F1 Session的schema中创建，直接使用，不新增)
- bespoke_studios: 工作室信息(name, slug, city, specialties[], service_types[], price_range, portfolio_images[], rating, is_verified)
- bespoke_orders: 定制订单(user_id, studio_id, status, title, description, reference_images[], budget_range, deadline, measurements JSONB, status_history JSONB)
- bespoke_messages: 沟通记录(order_id, sender_id, content, message_type, attachments[], is_read)
- bespoke_quotes: 报价记录(order_id, studio_id, total_price, items JSONB, estimated_days, valid_until, status)
- bespoke_reviews: 评价(order_id, user_id, studio_id, rating 1-5, content, images[], is_anonymous, UNIQUE(order_id))
### 订单状态机
submitted → quoted → paid → in_progress → completed
submitted → cancelled
quoted → cancelled
### 前端页面
- submit.tsx: 选择工作室→上传参考图+填写需求+预算+期望交付日期
- chat/[orderId].tsx: 复用私信UI组件(文字+图片沟通)
- quote/[orderId].tsx: 查看报价详情→确认→支付占位
- orders.tsx: 我的定制订单列表(按状态分组)

## 质量标准
- 80%+测试覆盖率, 零any, 零TODO
- 支付接口占位(不实现真实支付)
- 统一响应格式
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION M1-M3: 市场与商业 (Phase 0 模板)

## ═══════════════════════════════════════════════
### M1: 市场调研
```

你是一个资深市场调研分析师。你的任务是为AiNeed产出中国AI+时尚市场调研报告。

## 读取
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md

## 产出
写入: C:\AiNeed\V3\docs\MARKET-RESEARCH.md
使用WebSearch搜索最新数据。报告结构:
1. 行业市场现状(1000字) - 市场规模/增速/政策
2. 目标市场细分(800字) - 用户画像/消费能力
3. 核心竞品分析(2000字) - 小红书/淘宝/得物/抖音/搭搭
4. 用户痛点(800字) - 真实痛点+场景
5. 市场机会(500字) - 差异化定位
6. 合规要求(500字) - ICP/数据保护/AI监管
所有数据标注来源。不编造数据。至少5个数据来源。
```

### M2: 竞品分析
```

你是一个竞品分析师。产出AI时尚穿搭App竞品分析。

## 产出
写入: C:\AiNeed\V3\docs\COMPETITIVE-ANALYSIS.md
分析: 小红书/淘宝/得物/抖音/Stitch Fix/搭搭AI/其他
每个竞品: 定位/功能/用户规模/AI能力/优劣势
总结: AiNeed的差异化机会 >= 3个
使用WebSearch搜索。2000字。标注来源。
```

### M3: 商业模式
```

你是一个商业模式顾问。评估AI私人造型师App的商业可行性。

## 产出
写入: C:\AiNeed\V3\docs\BUSINESS-MODEL.md
分析:
1. 收入模式(CPS/订阅/广告/试衣付费)
2. 用户获取成本(CAC)
3. 单位经济模型(LTV/CAC)
4. 冷启动策略
5. 最诚实的评估(什么条件下可行/不可行)
月运营成本: ¥9,000-15,000。使用WebSearch搜索佣金率等数据。
1500字。标注来源。
```

---

## Phase 6 Session模板
### T1: E2E测试
```

你是一个QA工程师。为AiNeed V3写E2E测试。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写范围
只允许创建: test/**/*.e2e-spec.ts

## 创建的文件
```

test/
├── app.e2e-spec.ts             # 应用启动测试
├── auth.e2e-spec.ts            # 认证流程测试
├── clothing.e2e-spec.ts        # 服装模块测试
├── wardrobe.e2e-spec.ts        # 衣橱模块测试
├── stylist.e2e-spec.ts         # AI造型师测试
├── search.e2e-spec.ts          # 搜索模块测试
├── community.e2e-spec.ts       # 社区模块测试
└── helpers/
    └── test-utils.ts           # 测试工具(创建测试用户、获取token等)
```

## 6条必测流程:
1. 注册→登录→获取用户信息 (auth.e2e-spec.ts)
2. 浏览服装→详情→收藏 (clothing.e2e-spec.ts)
3. AI会话→发送消息→收到回复 (stylist.e2e-spec.ts, mock LLM)
4. 搜索→过滤→查看结果 (search.e2e-spec.ts)
5. 发帖→评论→点赞 (community.e2e-spec.ts)
6. 关注→粉丝列表 (community.e2e-spec.ts)

## 关键实现要点
- 使用Supertest + Jest。启动真实NestJS应用测试(测试数据库)
- 每个测试文件有beforeAll创建测试应用和数据库连接，afterAll清理
- test/helpers/test-utils.ts: createTestApp(), createTestUser(), getAuthToken(), cleanDatabase()
- 测试数据库使用独立schema(test_aineed_v3)，不污染开发数据
- mock外部服务(LLM API、短信API、MinIO)，真实测试数据库和Redis
- 每个测试场景覆盖: 正常流程 + 边界情况 + 错误处理

## 验收标准
- 所有6条核心流程测试通过
- 关键路径覆盖率80%+
- 零flaky测试(每次运行结果一致)
- 测试可在CI环境运行(无需手动启动服务)
```

### T2: Bug修复
```

你是一个高级全栈开发工程师。修复AiNeed V3项目的已知Bug。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写范围
跨模块，但只修复Bug，不添加新功能。

## 任务流程
1. 运行 `cd C:/AiNeed/V3/apps/backend && npx tsc --noEmit` 检查TypeScript错误
2. 运行 `pnpm test` 检查失败的测试
3. 运行 `npx eslint src/ --ext .ts` 检查代码规范问题
4. 读取每个模块的代码，检查逻辑错误
5. 检查前端代码: `cd C:/AiNeed/V3/apps/mobile && npx tsc --noEmit`
6. 常见Bug检查清单:
   - API响应格式不一致(有些返回裸数据，有些返回{success,data})
   - 缺少错误处理(数据库查询失败时crash)
   - JWT认证遗漏(该保护的端点未保护)
   - 分页参数未验证(page/limit缺失导致异常)
   - Prisma查询缺少select(返回了过多数据)
   - 前端API调用缺少错误处理(网络错误时白屏)
   - 类型不匹配(后端返回字段名与前端期望不一致)

## 创建的文件
```

docs/BUG-FIX-REPORT.md  # 修复报告: 发现的Bug列表 + 修复方案
```

## 验收标准
- tsc --noEmit 零错误(前后端)
- 所有已有测试通过
- 修复报告记录所有发现和修复
- 不引入新的Bug
```

### T3: 性能优化
```

你是一个性能优化工程师。优化AiNeed V3项目的性能。

## 读写范围
跨模块，但只优化性能，不改功能逻辑。

## 任务流程
1. 后端性能分析:
   - 检查所有数据库查询，识别N+1问题
   - 检查缺少索引的查询(对比prisma schema中的索引)
   - 检查未使用select的查询(返回过多数据)
   - 检查热路径是否使用Redis缓存
2. 前端性能分析:
   - 检查大列表是否使用FlatList/VirtualizedList
   - 检查图片是否使用缓存策略(fast-image或expo-image)
   - 检查不必要的re-render(React.memo, useMemo)
   - 检查bundle大小(import路径是否优化)

## 关键优化点
- 服装列表: 添加Prisma select只返回必要字段(name, price, imageUrl, brand)
- 推荐API: Redis缓存热门推荐结果(TTL 1小时)
- 搜索API: Redis缓存搜索建议(TTL 5分钟)
- 衣橱统计: Redis缓存(TTL 5分钟)，添加/删除时失效
- 前端: 所有列表页使用FlatList的keyExtractor和getItemType
- 前端: TanStack Query启用staleTime避免频繁请求

## 创建的文件
```

docs/PERFORMANCE-REPORT.md  # 性能优化报告: 优化前后的对比
```

## 验收标准
- 数据库查询无N+1问题
- 热路径有Redis缓存
- 前端列表使用虚拟化渲染
- 优化报告记录所有改进
```

### T4: 安全审计
```

你是一个安全工程师。审计AiNeed V3的代码安全性。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md

## 读写范围
跨模块，但只修复安全问题，不改功能。

## 任务
1. 读取所有后端源代码(src/modules/下每个模块)
2. 检查清单:
   - 硬编码密钥/API key/密码 (grep -ri "api_key\|secret\|password" src/)
   - SQL注入风险 (Prisma参数化查询是否正确)
   - XSS风险 (用户输入是否转义)
   - CSRF保护 ( helmet配置是否完整)
   - 认证绕过 (JWT Guard是否全局注册, @Public()是否滥用)
   - 文件上传漏洞 (类型/大小验证, 路径遍历)
   - 限流配置 (ThrottlerModule配置是否合理)
   - 输入验证 (DTO是否有class-validator装饰器)
   - 错误信息泄露 (stack trace是否暴露给客户端)
   - IDOR风险 (资源访问是否验证userId所有权)
3. 产出: docs/SECURITY-AUDIT.md (发现+修复建议)
4. 修复所有高危和中危漏洞

## 验收标准
- 零硬编码密钥
- 所有用户输入经过验证
- 所有敏感端点有认证保护
- 文件上传有类型和大小限制
- 安全审计报告记录所有发现和修复
```

## Phase 7 Session模板
### K1: Docker生产配置
```

你是一个DevOps工程师。为AiNeed V3创建Docker生产配置。

## 创建的文件
```

docker/
├── docker-compose.prod.yml    # 生产环境compose(含健康检查/重启策略/资源限制)
├── Dockerfile.backend         # 后端多阶段构建(node:20-alpine)
└── nginx/
    └── nginx.conf             # 反向代理配置(SSL/API路由)
```

## 关键实现要点
- 后端Dockerfile: 多阶段构建(builder → runner), 只拷贝dist+node_modules, 非root用户运行
- docker-compose.prod.yml: 健康检查(start_period 30s, interval 10s), restart: unless-stopped, 内存限制512MB
- Nginx: 反向代理/api → backend:3000, SSL终止(占位), gzip压缩, 安全headers
- 环境变量通过.env.production注入，不hardcode

## 验收标准
- docker-compose -f docker-compose.prod.yml up -d 成功启动
- 健康检查通过: curl http://localhost:3000/api/v1/health
- 镜像大小 < 300MB
```

### K2: CI/CD
```

你是一个DevOps工程师。为AiNeed V3创建GitHub Actions CI/CD配置。

## 创建的文件
```

.github/
└── workflows/
    ├── backend-ci.yml         # 后端CI: lint → type-check → test → build
    └── mobile-ci.yml          # 移动端CI: lint → type-check → expo export
```

## 关键实现要点
- backend-ci.yml trigger: push到main/PR到main, 路径过滤: apps/backend/**
- 步骤: checkout → setup pnpm → install → prisma generate → lint → tsc --noEmit → test → build
- mobile-ci.yml trigger: push到main/PR到main, 路径过滤: apps/mobile/**
- 步骤: checkout → setup pnpm → install → lint → tsc --noEmit → expo export --platform android
- 使用pnpm cache加速安装

## 验收标准
- CI在PR时自动触发
- lint/type-check/test全部通过
- 构建产物正确生成
```

### K3: EAS Build
```

你是一个移动端DevOps工程师。配置Expo EAS Build。

## 创建的文件
```

eas.json                      # EAS Build配置(development/preview/production)
```

## 关键实现要点
- eas.json三个profile: development(debug apk), preview(release apk), production(aab上传Play Store)
- Android签名配置: 使用环境变量KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD
- 构建缓存: 使用Expo缓存加速
- 环境变量: API_URL, SENTRY_DSN等通过eas.json的env注入

## 验收标准
- eas.json格式正确
- eas build --platform android --profile development 可触发构建
- 签名配置说明清晰
```

### K4: 文档
```

你是一个技术文档工程师。为AiNeed V3编写部署和运维文档。

## 创建的文件
```

docs/
├── DEPLOYMENT.md              # 部署指南(环境要求/步骤/配置)
├── OPS-GUIDE.md               # 运维手册(监控/备份/故障排查)
└── API.md                     # API文档(所有端点列表+示例)
```

## 关键实现要点
- DEPLOYMENT.md: 环境要求(Node 24, pnpm, Docker), 首次部署步骤, 环境变量清单, 数据库迁移步骤
- OPS-GUIDE.md: 日常运维命令, 备份策略(pg_dump), 日志查看, 常见故障排查, 性能监控
- API.md: 所有API端点汇总表格(method/path/description/auth), 分模块组织, 包含请求/响应示例

## 验收标准
- 按文档步骤可完成全新部署
- API文档覆盖所有已实现端点
- 运维手册覆盖常见故障场景
```

### K5: ICP备案
```

你是一个合规顾问。为AiNeed编写ICP备案指南。

## 创建的文件
```

docs/ICP-GUIDE.md             # ICP备案完整指南
```

## 关键内容
- ICP备案类型选择(企业备案 vs 个人备案)
- 所需材料清单(营业执照/身份证/域名证书/服务器证明)
- 备案流程(注册→填写→上传→审核→通过)
- AI服务备案要求(算法备案/安全评估)
- 数据保护合规(用户协议/隐私政策模板)
- 常见驳回原因和避免方法

## 验收标准
- 覆盖所有备案步骤
- 包含完整材料清单
- AI相关合规要求明确
```

---

## 质量审查Session模板 (Claude Code执行)
每个Phase完成后，用Claude Code开一个审查Session:
```

你是一个代码质量审查工程师。审查AiNeed V3项目[Phase X]的代码。

## 审查范围
C:\AiNeed\V3\apps\backend\src\modules\ (检查所有Phase X的模块)
C:\AiNeed\V3\apps\mobile\app\ (检查所有Phase X的页面)

## 审查清单
1. npx tsc --noEmit → 零错误
2. grep -r "any" → 零any类型
3. grep -r "TODO" → 零TODO
4. grep -r "console.log" → 零console.log
5. grep -r "placeholder" → 零placeholder
6. 所有文件 < 500行
7. 所有函数 < 50行
8. 每个模块有__tests__/目录
9. npm run test → 通过
10. API响应格式一致 { success, data/error }
11. 设计Token使用一致
12. 错误处理完整
发现的问题全部修复。修复不了的标记为P0/P1/P2/P3。
```

---

## ═══════════════════════════════════════════════

## SESSION AV1: Q版形象管理服务 (Phase 2.5 - 先执行)

## ═══════════════════════════════════════════════
**写入范围**: C:\AiNeed\V3\apps\backend\src\modules\avatar\
**依赖**: F1+F3完成
```

你是一个后端开发工程师。你的任务是为AiNeed V3实现Q版形象管理服务。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md（avatar相关表和API在2.1和3.2节）
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md（Q版形象设计规范在5.5节）

## 关键技术背景
Q版形象使用 react-native-skia 在客户端实时绘制，服务端只负责参数存储和服装映射。
不需要任何GPU、不需要3D渲染、不需要预渲染动画帧。
动画全部在客户端用Skia属性动画实现，服务端零参与。

## 读写边界
只允许创建/修改：src/modules/avatar/

## 创建的文件
```

src/modules/avatar/
├── avatar.module.ts
├── avatar.controller.ts
├── avatar.service.ts
├── dto/
│   ├── create-avatar.dto.ts
│   ├── update-avatar.dto.ts
│   └── dress-avatar.dto.ts
└── __tests__/
    └── avatar.service.spec.ts
```

## 功能要求
**重要路由说明**: AV1只负责 /avatar/me/* 路由（用户形象管理）。模板查询路由 /avatar/templates 完全由 AV2 (avatar-template模块) 负责。AV1通过DI注入AvatarTemplateService查询模板数据（在avatar.module.ts中import AvatarTemplateModule）。

### 1. POST /api/v1/avatar/create - 创建用户形象
- 接收: templateId, avatarParams(JSONB)
- avatarParams包含: faceShape(数值), eyeShape(选项), skinTone(色值), hairStyle(ID), hairColor(色值)等
- 验证templateId存在且isActive
- 验证avatarParams符合模板的parameters定义（范围/选项校验）
- 创建user_avatars记录（每用户一个活跃形象，UNIQUE约束）
- 初始化clothing_map为模板的default_clothing_map
- 返回完整的用户形象数据
### 3. GET /api/v1/avatar/me - 获取当前用户形象
- 返回用户形象的完整参数: avatarParams + clothingMap + thumbnailUrl
- 客户端拿到参数后用react-native-skia实时绘制
- 404如果没有形象
### 4. PATCH /api/v1/avatar/me - 更新形象参数
- 接收部分更新的avatarParams
- 验证参数值在模板定义范围内
- 只更新提供的字段（部分更新）
- 返回更新后的完整参数
### 5. POST /api/v1/avatar/me/dress - 换装映射
- 接收: clothingMap对象，格式为 { slot: { color, type, pattern? } }
- slot: top/bottom/outer/shoes/accessory/dress
- color: 主色hex值 (如 "#E94560")
- type: 服装类型标识 (如 tshirt/jeans/sneakers/hoodie等)
- pattern?: 可选图案标识
- 验证clothingMap的每个slot值合法
- 更新user_avatars的clothing_map字段
- 客户端收到更新后用Skia重新绘制对应部位
- 返回更新后的clothingMap
### 6. POST /api/v1/avatar/me/thumbnail - 上传缩略图
- multipart上传图片（客户端Skia截图后上传）
- 文件大小限制2MB，格式jpg/png
- 上传到MinIO
- 更新user_avatars的thumbnail_url
- 返回缩略图URL

## clothing_map数据结构
```json
{
  "top": { "color": "#1A1A2E", "type": "tshirt" },
  "bottom": { "color": "#333333", "type": "jeans" },
  "shoes": { "color": "#FFFFFF", "type": "sneakers" },
  "accessory": { "color": "#E94560", "type": "cap", "pattern": "stripe" }
}
```

## avatar_params数据结构
```json
{
  "faceShape": 50,
  "eyeShape": "round",
  "skinTone": "#F5D0B0",
  "hairStyle": "bob",
  "hairColor": "#1A1A1A",
  "glasses": false,
  "blush": true
}
```

## 质量标准
- TypeScript strict，零any
- 80%+测试覆盖率
- 统一响应格式 { success, data }
- 参数验证严格（值范围、选项合法性）
- 零TODO，零placeholder
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION AV2: 形象模板管理 (Phase 2.5)

## ═══════════════════════════════════════════════
**写入范围**: C:\AiNeed\V3\apps\backend\src\modules\avatar-template\
**依赖**: F1+F3完成
```

你是一个后端开发工程师。你的任务是为AiNeed V3实现Q版形象模板管理模块。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md（5.5节Q版形象设计规范）

## 关键技术背景
形象模板存储的是Skia绘制配置和可调参数定义，不是3D模型。
客户端拿到模板的drawing_config后用react-native-skia实时绘制Q版形象。
模板管理只涉及CRUD，不涉及渲染。

## 读写边界
只允许创建/修改：src/modules/avatar-template/

## 创建的文件
```

src/modules/avatar-template/
├── avatar-template.module.ts
├── avatar-template.controller.ts
├── avatar-template.service.ts
├── dto/
│   ├── create-template.dto.ts
│   └── update-template.dto.ts
└── __tests__/
    └── avatar-template.service.spec.ts
```

## 功能要求
### 管理员端点(需JWT+管理员权限，不在宪法3.2公开端点中，为内部管理接口)
1. POST /api/v1/avatar/templates - 创建模板
   - 接收: name, gender, thumbnailUrl, drawingConfig(JSONB), parameters(JSONB), defaultClothingMap(JSONB)
   - drawingConfig示例 (Skia绘制配置):
     ```json
     {
       "baseShape": { "type": "oval", "widthRatio": 0.8, "heightRatio": 1.0 },
       "headScale": 0.55,
       "bodyScale": 0.35,
       "eyeTemplates": {
         "round": { "path": "M0,0 Q5,-3 10,0 Q5,3 0,0Z", "fillColor": "#333" },
         "almond": { "path": "M0,0 Q5,-2 10,0 Q5,1 0,0Z", "fillColor": "#333" }
       },
       "hairTemplates": {
         "bob": { "path": "M-30,-50 Q-35,-20 -30,20 Q-20,30 0,25 ...", "fill": true },
         "long": { "path": "M-30,-50 Q-40,-20 -35,50 Q-25,55 -20,50 ...", "fill": true }
       },
       "skinToneColors": ["#FFE4D6", "#F5D0B0", "#E8B88A", "#D4956A", "#A06840", "#6B4423"],
       "clothingSlots": {
         "top": { "origin": { "x": 0.35, "y": 0.6 }, "size": { "w": 0.3, "h": 0.25 } },
         "bottom": { "origin": { "x": 0.35, "y": 0.75 }, "size": { "w": 0.3, "h": 0.15 } },
         "shoes": { "origin": { "x": 0.37, "y": 0.9 }, "size": { "w": 0.12, "h": 0.06 } }
       }
     }
   - parameters定义示例 (可调参数):
     ```json
     {
       "faceShape": { "min": 0, "max": 100, "default": 50, "label": "脸型", "control": "slider" },
       "eyeShape": { "options": ["round", "almond", "narrow"], "default": "round", "label": "眼型", "control": "cards" },
       "skinTone": { "options": ["#FFE4D6", "#F5D0B0", "#E8B88A", "#D4956A", "#A06840", "#6B4423"], "default": "#F5D0B0", "label": "肤色", "control": "colorGrid" },
       "hairStyle": { "options": [{"id": "bob", "name": "波波头"}, {"id": "long", "name": "长发"}, {"id": "ponytail", "name": "马尾"}], "default": "bob", "label": "发型", "control": "scrollCards" },
       "hairColor": { "options": ["#1A1A1A", "#3B2314", "#8B6914", "#D4A76A", "#C73E54", "#C0C0C0"], "default": "#1A1A1A", "label": "发色", "control": "colorGrid" },
       "glasses": { "type": "boolean", "default": false, "label": "眼镜", "control": "toggle" },
       "blush": { "type": "boolean", "default": true, "label": "腮红", "control": "toggle" }
     }
     ```

   - defaultClothingMap示例:
     ```json
     {
       "top": { "color": "#FFFFFF", "type": "tshirt" },
       "bottom": { "color": "#1A1A2E", "type": "jeans" },
       "shoes": { "color": "#FFFFFF", "type": "sneakers" }
     }
     ```

2. PATCH /api/v1/avatar/templates/:id - 更新模板
3. DELETE /api/v1/avatar/templates/:id - 停用模板(isActive=false)
### 用户端点
4. GET /api/v1/avatar/templates - 公开模板列表
   - 支持gender过滤
   - 返回含thumbnail_url、drawing_config、parameters、default_clothing_map
   - 客户端用这些数据直接驱动Skia渲染

## 种子数据
创建5个初始模板（每个都包含完整的drawing_config和parameters定义）:
- 潮玩基础-女 (POP MART风格, 6种发型, 3种脸型, 大眼圆润)
- 潮玩基础-男 (POP MART风格, 6种发型, 3种脸型, 酷帅线条)
- 可爱风-女 (超大眼睛, 腮红默认开, 圆脸为主)
- 酷帅风-男 (尖下巴, 墨镜可选, 线条利落)
- 中性款-通用 (最简参数, 适合非二元性别)
肤色选项统一6档参考04-MASTER-PLAN.md 5.5.2节:
瓷白#FFE4D6 / 自然#F5D0B0 / 小麦#E8B88A / 蜜糖#D4956A / 深棕#A06840 / 黑#6B4423
发型参考04-MASTER-PLAN.md 5.5.3节(20+发型, 6种发色)。

## 质量标准
- TypeScript strict, 零any
- 80%+测试覆盖率
- 管理员权限Guard
- 统一响应格式
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION AV3: Q版形象页面 (Phase 4)

## ═══════════════════════════════════════════════
**写入范围**: C:\AiNeed\V3\apps\mobile\app\avatar\
**依赖**: AV1 + AV2 + D1完成
```

你是一个高级React Native开发工程师。你的任务是实现AiNeed的Q版形象创建和展示页面。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md（5.5节Q版形象设计规范）

## 关键技术背景
Q版形象使用 react-native-skia 在客户端实时绘制，不是预渲染的图片序列。
动画使用Skia的useFrameCallback实现属性动画（呼吸/挥手/点头等）。
服务端只存储参数，所有渲染和动画都在客户端完成。

## 读写边界
允许创建/修改：
- app/avatar/ (所有页面)
- src/services/avatar.service.ts (API调用)
- src/hooks/useAvatar.ts (数据Hook)
- src/stores/avatar.store.ts (Zustand状态)
注意：src/components/avatar/ 下的Skia渲染组件由AV4 Session负责，本Session只负责页面。

## 页面要求
### app/avatar/create.tsx - 创建形象
流程(分步骤向导):
1. **选择模板**: 调用GET /avatar/templates，展示5个模板卡片（男女分组）
   - 每个卡片显示模板缩略图+名称
   - 点击选中，底部"下一步"按钮
2. **调整参数**:
   - 从模板的parameters定义动态渲染编辑控件:
     - 脸型: Slider滑块(min~max)
     - 眼型: 横向选择卡片(options数组)
     - 肤色: 6个真实肤色色块(colorGrid)
     - 发型: 横向滚动卡片(含名称)
     - 发色: 6色块选择
     - 眼镜/腮红: Toggle开关
   - 每次调整调用QAvatarRenderer实时预览（从AV4 import）
   - 预览区占屏幕上半部分
3. **确认创建**: 调用POST /avatar/create，传递templateId和avatarParams
   - 创建成功后截图上传缩略图 POST /avatar/me/thumbnail
   - 跳转到展示页
### app/avatar/edit.tsx - 编辑形象
- 调用GET /avatar/me获取当前形象参数
- 顶部: QAvatarRenderer实时预览(带idle动画)
- 底部: 参数编辑面板（复用create的编辑控件）
- 每次变更调用PATCH /avatar/me保存
- 实时更新Skia预览
### app/avatar/showcase.tsx - 形象展示+换装
- 全屏展示Q版形象(QAvatarRenderer, idle动画循环)
- 服装映射区域: 横向滚动显示当前clothingMap中每个slot的服装
  - 每个slot显示: 类型图标 + 主色色块
- "换装"按钮: 底部弹出服装选择面板
  - 从衣橱选择已有服装 → 提取主色+类型
  - 调用POST /avatar/me/dress更新clothingMap
  - Skia实时重新绘制对应部位
- 分享按钮: Skia截图 → 上传 → 分享到社区

## API调用层 (src/services/avatar.service.ts)
```

getTemplates(gender?: string): Promise<AvatarTemplate[]>
createAvatar(templateId: string, avatarParams: Record<string, unknown>): Promise<UserAvatar>
getMyAvatar(): Promise<UserAvatar>
updateAvatar(params: Partial<AvatarParams>): Promise<UserAvatar>
dressAvatar(clothingMap: Record<string, ClothingMapEntry>): Promise<Record<string, ClothingMapEntry>>
uploadThumbnail(imageUri: string): Promise<string>
```

## 审美要求 (参考POP MART/小红书Q版头像)
- 大头像占屏幕60%以上
- 参数编辑区底部弹出式面板(blur背景)
- 肤色选择器用真实肤色色块(不用色轮)
- 发型选择器用横向滚动卡片
- 整体风格: 温暖、可爱、精致、有质感
- 头身比1:2.5~1:3 (大头小身，可爱感核心)

## 质量标准
- TypeScript strict, 零any
- 使用设计Token(theme/)
- TanStack Query管理服务端数据
- Zustand管理客户端状态(当前形象参数、编辑状态)
- 零TODO
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION AV4: Skia渲染组件+本地动画 (Phase 4)

## ═══════════════════════════════════════════════
**写入范围**: C:\AiNeed\V3\apps\mobile\src\components\avatar\
**依赖**: AV2完成（需要drawing_config格式定义）
```

你是一个React Native动画专家。你的任务是用react-native-skia实现Q版形象的实时渲染和动画组件。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md（5.5节Q版形象设计规范 - 必读）

## 核心技术栈
- react-native-skia (Shopify): 矢量图形渲染引擎
- useFrameCallback / useSharedValue / useDerivedValue (Reanimated): 属性动画
- 零预渲染、零PNG序列帧、零服务端渲染

## 读写边界
只允许创建/修改：src/components/avatar/

## 创建的文件
```

src/components/avatar/
├── QAvatarRenderer.tsx      # 主渲染器: 接收参数+模板配置, Skia实时绘制
├── QAvatarMini.tsx          # 小头像: 评论/通知栏用, 简化版渲染+idle
├── animations/
│   ├── useIdleAnimation.ts      # 待机呼吸动画(缩放微动)
│   ├── useHappyAnimation.ts     # 开心跳跃动画
│   ├── useWaveAnimation.ts      # 挥手动画(手臂旋转)
│   ├── useNodAnimation.ts       # 点头动画(头部位移)
│   ├── useThinkAnimation.ts     # 思考动画(歪头)
│   └── useHeartAnimation.ts     # 比心动画(手部)
├── parts/
│   ├── AvatarHead.tsx       # 头部绘制(脸型+五官+发型)
│   ├── AvatarBody.tsx       # 身体绘制(含服装slot填充)
│   └── AvatarClothing.tsx   # 服装渲染(根据clothingMap填充颜色+类型轮廓)
└── hooks/
    └── useAvatarAnimation.ts    # 动画状态机(管理动画切换)
```

## QAvatarRenderer 组件
```typescript
interface QAvatarRendererProps {
  template: AvatarTemplate;        // 包含drawing_config
  avatarParams: Record<string, unknown>;  // 用户选择的参数
  clothingMap?: Record<string, ClothingMapEntry>; // 当前服装映射
  animationType?: AvatarAnimationType;  // 当前动画类型
  size?: number;                    // 渲染尺寸
}
```

核心渲染逻辑:
1. 从template.drawing_config读取基础形状(Skia Path)
2. 根据avatarParams调整: faceShape影响脸型宽高比, eyeShape选择眼睛模板, skinTone填色, hairStyle选择发型Path, hairColor填色
3. 根据clothingMap在body的对应slot区域绘制服装: type决定轮廓形状, color填充颜色
4. 头身比严格1:2.5~1:3
5. 使用Canvas + Group + Path 组件组合绘制

## 动画系统 (Skia属性动画, 不用PNG序列帧)
### useIdleAnimation - 待机呼吸
- 整体缩放: 1.0 → 1.02 → 1.0 (周期2秒, sin曲线)
- useFrameCallback驱动
### useHappyAnimation - 开心跳跃
- Y轴位移: 0 → -8 → 0 (周期0.4秒)
- 播放2次后自动切回idle
### useWaveAnimation - 挥手
- 手臂旋转: 0° → -30° → 0° (周期0.6秒)
- 播放3次后切回idle
### useNodAnimation - 点头
- 头部Y位移: 0 → 3 → 0 (周期0.5秒)
- 播放2次后切回idle
### useThinkAnimation - 思考
- 头部旋转: 0° → 8° → 0° → -8° → 0° (周期3秒)
- 循环播放
### useHeartAnimation - 比心
- 双手位移到胸前交叉
- 播放1次后切回idle
### useAvatarAnimation - 动画状态机
```typescript
type AnimationState = 'idle' | 'happy' | 'wave' | 'nod' | 'think' | 'heart';
// 触发规则:
// idle → wave: 页面打开时(播放一次)
// idle → happy: 收到AI推荐/收藏时(播放一次)
// idle → think: AI加载中(循环)
// idle → heart: 点赞时(播放一次)
// idle → nod: 用户操作时(播放一次)
// 任何 → idle: 其他动画结束后自动回idle
```

## QAvatarMini 组件
- 尺寸: 40x40 或 56x56
- 简化渲染: 只绘制头部(发型+五官), 不画身体和服装
- 固定idle动画(呼吸微动)
- 用于: 评论区头像、通知栏、聊天气泡

## 审美要求 (POP MART风格矢量版)
- 线条圆润, 无锐角, 所有路径用圆弧过渡
- 色彩平涂+渐变高光, 精致质感
- 大眼占面部1/3以上
- 高饱和度, 治愈系配色
- 不能丑, 不能有AI痕迹

## 性能目标
- 首次渲染 < 200ms (Skia硬件加速)
- 动画帧率: 60fps (设备原生)
- 内存: < 5MB (纯矢量, 无位图)

## 关键依赖
```bash
npx expo install @shopify/react-native-skia
npx expo install react-native-reanimated
```

开始执行。必须先安装依赖，然后实现QAvatarRenderer核心渲染，再实现动画系统。
```

---

## ═════════════════════════════════════════

## SESSION CU0: 服装定制设计管理 (Phase 4.5)

## ═════════════════════════════════════════
**写入范围**: src/modules/customize/ + apps/mobile/src/services/customize.service.ts + apps/mobile/src/hooks/useCustomDesign.ts
**依赖**: F1+F3完成
```

你是一个后端开发工程师。你的任务是为AiNeed V3实现服装定制设计管理模块。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 关键背景
此模块管理用户创建的定制设计(CRUD)，与图案编辑器(CU1)、定制订单(CU3)、设计市集(CU4)协作。
- CU1 Session负责前端图案编辑器组件
- CU0 Session负责后端设计的CRUD API
- CU3 Session负责订单管理和POD对接
- CU4 Session负责市集浏览和AI预审

## 读写边界
只允许创建/修改：src/modules/customize/

## 创建的文件
```

src/modules/customize/
├── customize.module.ts
├── customize.controller.ts
├── customize.service.ts
├── dto/
│   ├── create-design.dto.ts
│   ├── update-design.dto.ts
│   └── design-query.dto.ts
└── __tests__/
    ├── customize.service.spec.ts
    └── customize.controller.spec.ts
```

## API端点
1. GET /api/v1/customize/templates - 可定制产品模板列表
   - 返回所有isActive的product_templates
   - 支持productType过滤
   - 返回: uvMapUrl, previewModelUrl, availableSizes, printArea, baseCost, suggestedPrice
2. POST /api/v1/customize/designs - 保存设计
   - 接收: name, designData(JSONB), patternImageUrl, previewImageUrl, productType, productTemplateId, tags
   - 验证productTemplateId存在
   - 创建custom_designs记录(status=draft)
3. GET /api/v1/customize/designs - 我的设计列表(需JWT)
   - 分页，按updated_at DESC
   - 支持status过滤: draft/published/archived
4. GET /api/v1/customize/designs/:id - 设计详情(需JWT)
   - 验证设计属于当前用户
   - 返回完整design_data
5. PATCH /api/v1/customize/designs/:id - 更新设计(需JWT)
   - 验证设计属于当前用户
   - 只更新提供的字段(部分更新)
6. DELETE /api/v1/customize/designs/:id - 删除设计(需JWT)
   - 验证设计属于当前用户
   - 软删除(status=archived)
7. POST /api/v1/customize/designs/:id/preview - 渲染预览图(需JWT)
   - 接收designData
   - 将图案叠加到产品模板UV映射上
   - 返回previewImageUrl
8. POST /api/v1/customize/designs/:id/publish - 发布到市集(需JWT)
   - 验证设计属于当前用户
   - 设置isPublic=true, status=published
   - 调用AI预审服务(CU4模块的接口)
   - 返回发布状态

## 质量标准
- TypeScript strict，零any
- 80%+测试覆盖率
- 统一响应格式 { success, data }
- 零TODO，零placeholder
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION CU1: 图案编辑器组件 (Phase 4.5)

## ═══════════════════════════════════════════════
**写入范围**: src/components/customize/
**依赖**: D1完成
```

你是一个前端交互开发专家。你的任务是实现AiNeed服装定制的图案编辑器。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写边界
允许创建/修改：
- src/components/customize/ (所有组件)
- src/services/customize.service.ts (API调用)
- src/hooks/useCustomDesign.ts (数据Hook)

## 创建的文件
```

src/components/customize/
├── PatternEditor.tsx        # 主编辑器(WebView+Canvas)
├── ProductSelector.tsx      # 产品类型选择(T恤/卫衣/帽子...)
├── MaterialSelector.tsx     # 面料选择
├── ColorPicker.tsx          # 颜色选择器
├── PatternUploader.tsx      # 图案上传
├── TransformControls.tsx    # 缩放/旋转/移动控制
├── TileModeSelector.tsx     # 平铺模式选择
├── TextOverlay.tsx          # 文字叠加
└── ProductPreview.tsx       # 产品3D预览(简化版)
```

## PatternEditor核心功能
### WebView + Canvas实现
- 使用WebView嵌入HTML5 Canvas
- 双向通信: React Native ↔ WebView (postMessage)
- Canvas绑定手势: 拖动/缩放/旋转
### 编辑功能
1. **图案上传**: 从相册选择或拍照
2. **图案变换**:
   - 拖动定位(限制在可打印区域内)
   - 双指缩放(0.5x-3x)
   - 双指旋转(0-360度)
3. **平铺模式**: 无/重复/镜像
4. **文字添加**: 输入文字，选择字体/颜色/大小
5. **滤镜**(MVP简化): 亮度/对比度滑块
6. **撤销/重做**: 维护操作历史栈
7. **保存设计**: 导出为JSON(designData) + 上传图案到MinIO
### ProductPreview
- 显示选定产品的轮廓图(T恤/帽子等)
- 在轮廓内叠加图案预览
- 可选: 在头像上预览定制服装(简化版用静态图叠加)
### ProductSelector
- 横向滚动卡片: T恤、卫衣、连衣裙、帽子、包包、手机壳
- 每个卡片: 产品图 + 名称
- 选中后显示可定制区域高亮

## 审美要求
- 编辑器界面简洁，工具栏在底部
- 产品预览区占屏幕70%
- 操作提示用图标而非文字
- 颜色选择器用色块网格

## 质量标准
- TypeScript strict, 零any
- 80%+测试覆盖率(Hook和Service层)
- 零TODO
- 操作流畅(60fps目标)
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION CU2: 定制预览+下单页面 (Phase 4.5)

## ═══════════════════════════════════════════════
**写入范围**: app/customize/
**依赖**: CU1完成
```

你是一个React Native开发工程师。你的任务是实现服装定制的预览和下单页面。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写边界
只允许创建/修改：app/customize/

## 页面要求
### app/customize/editor.tsx - 定制编辑主页
- 顶部: 产品类型选择器(横向滚动)
- 中间: 产品预览区(嵌入PatternEditor)
- 底部工具栏: 上传图案/文字/滤镜/撤销/重做
- 右上角"预览"按钮 → 跳转preview.tsx
- 右上角"保存草稿"按钮
### app/customize/preview.tsx - 预览页
- 展示定制效果: 大图 + 头像试穿效果(如果有头像)
- 产品信息: 类型/面料/尺寸选择
- 价格显示: 基础价 + 定制溢价
- 底部两个按钮:
  - "加入购物车"(保存设计+创建订单)
  - "发布到市集"(跳转发布页)
### app/customize/order.tsx - 确认下单页
- 设计预览缩略图
- 产品规格: 类型/面料/尺寸/数量
- 收货地址选择(新增/管理)
- 价格明细: 商品价 + 运费
- 支付按钮(微信/支付宝占位)
- 订单状态跟踪UI

## 质量标准
- TypeScript strict, 零any
- 使用设计Token
- 零TODO
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION CU3: POD订单管理后端(全Mock Provider) (Phase 5)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/custom-order/
**依赖**: F1+F3完成
```

你是一个后端开发工程师。你的任务是实现定制订单管理模块。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md（custom_orders表和API在2.1和3.2节）
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写边界
只允许创建/修改：src/modules/custom-order/

## 创建的文件
```

src/modules/custom-order/
├── custom-order.module.ts
├── custom-order.controller.ts
├── custom-order.service.ts
├── pod/
│   ├── pod.service.ts            # POD服务抽象接口
│   ├── eprolo.provider.ts        # EPROLO POD实现
│   └── mock.provider.ts          # 开发环境Mock
├── dto/
│   ├── create-order.dto.ts
│   └── update-address.dto.ts
└── __tests__/
    ├── custom-order.service.spec.ts
    └── pod.service.spec.ts
```

## 功能要求
### 1. POST /api/v1/custom-orders - 创建订单
- 接收: designId, productType, material, size, quantity, shippingAddress
- 验证设计存在且属于当前用户
- 查询product_templates获取成本价
- 计算总价: (baseCost + designPremium) * quantity
- 创建custom_orders记录(status=pending)
- 返回订单详情+支付信息(占位)
### 2. GET /api/v1/custom-orders - 我的订单
- 分页，按created_at DESC
- include: custom_designs(设计信息)
- 状态过滤: status query param
### 3. GET /api/v1/custom-orders/:id - 订单详情
- include: custom_designs
- 含物流信息(如果有tracking_number)
### 4. PATCH /api/v1/custom-orders/:id/cancel - 取消订单
- 只有pending/paid状态可取消
- 如果已提交POD，调用POD取消API
- 更新status=refunded
### 5. POD Service接口
```typescript
interface PodProvider {
  name: string;
  submitOrder(order: PodOrder): Promise<PodOrderResult>;
  cancelOrder(podOrderId: string): Promise<boolean>;
  getOrderStatus(podOrderId: string): Promise<PodOrderStatus>;
  getAvailableProducts(): Promise<PodProduct[]>;
}
```

### 6. EPROLO Provider
- 实现PodProvider接口
- API文档: eprolo.com/eprolo-api
- API: POST /orders, GET /orders/:id, DELETE /orders/:id
- 认证: API Key header
- 产品线: 1500+产品(T恤/卫衣/帽子/包包/手机壳/鞋子等)
- 起订量: 一件起订
- 生产周期: 3-7天
- 错误处理: 重试1次
### 7. Mock Provider (开发环境)
- 不调用真实API
- 模拟2秒延迟
- 返回成功响应

## 订单状态机
```

pending → paid → producing → shipped → done
pending → cancelled
paid → refunded (取消已支付)
```

## 质量标准
- TypeScript strict, 零any
- 80%+测试覆盖率
- Mock Provider用于测试
- 统一响应格式
- 零TODO
开始执行。
```

---

## ═══════════════════════════════════════════════

## SESSION CU4: 设计市集(免费分享+AI预审) (Phase 5)

## ═══════════════════════════════════════════════
**写入范围**: src/modules/design-market/ + app/market/
**依赖**: CU1 + CU2完成
```

你是一个全栈开发工程师。你的任务是实现设计市集功能。

## 读取文档
1. C:\AiNeed\DELIVERY-V3\00-PROJECT-CONSTITUTION.md
2. C:\AiNeed\DELIVERY-V3\04-MASTER-PLAN.md

## 读写边界
后端: src/modules/design-market/
前端: app/market/
**重要**: POST /customize/designs/:id/publish 端点由CU0模块负责，本模块(design-market)不重复实现。本模块仅负责市集浏览(/market/designs)、点赞(/market/designs/:id/like)、举报(/market/designs/:id/report)等市集专属功能。如需触发发布，通过DI注入CustomizeService调用其publish方法。

## 后端创建的文件
```

src/modules/design-market/
├── design-market.module.ts
├── design-market.controller.ts
├── design-market.service.ts
├── dto/
│   ├── market-query.dto.ts
│   └── publish-design.dto.ts
└── __tests__/
    └── design-market.service.spec.ts
```

## API端点
### 1. GET /api/v1/market/designs - 市集浏览
- 分页，按最新/最热/价格排序
- 过滤: productType, tags, priceRange
- include: 设计预览图+设计师信息
- 不返回design_data(保护创作)
### 2. GET /api/v1/market/designs/:id - 设计详情
- 展示: 预览图+设计师+标签+价格+点赞数+购买数
- 相关推荐(同类型/同标签)
### 3. POST /api/v1/market/designs/:id/like - 点赞/取消
- toggle机制(已赞则取消)
- 更新likes_count
### 4. POST /api/v1/customize/designs/:id/publish - 发布到市集(免费分享)
- **重要**: 此端点完全由CU0模块(customize)负责实现，CU4模块通过注入CU0的CustomizeService调用此功能
- 验证设计属于当前用户
- 设置tags
- 更新is_public=true, status=published
- AI预审: 调用图片相似度检测(向量化vs已知IP库)，疑似侵权的进人工复审队列
- 通知粉丝(新设计发布)
### 5. GET /api/v1/market/designs/:id/reviews - 设计评价列表
- 分页返回评价内容
- 按时间排序
### 6. POST /api/v1/market/designs/:id/report - 举报侵权(AI预审)
- 接收举报原因+描述
- 记录到举报表，待人工复审

## 前端页面
### app/market/index.tsx - 市集首页
- 搜索框
- 分类Tab: 全部/T恤/卫衣/帽子/包包
- 排序: 最新/最热
- 双列Feed流(类似小红书)
- 每个卡片: 预览图+名称+作者头像+点赞数
- 下拉刷新+加载更多
- 无价格标签(免费分享)
### app/market/[designId].tsx - 设计详情页
- 大预览图(可放大)
- 作者信息(头像+昵称+关注按钮)
- 标签
- 点赞按钮
- "用这个设计定制"按钮(跳转编辑器，加载该设计)
- 举报按钮(侵权举报)
- 评论区(复用社区评论组件)

## 质量标准
- 后端80%+测试覆盖率
- 前端使用设计Token
- 零any, 零TODO
- 统一响应格式
开始执行。
```

---
*本文档为AiNeed V3.3 Trae并行开发的执行手册。每个Session提示词可直接复制到Trae Solo模式中使用。所有Session必须与00-PROJECT-CONSTITUTION.md v3.3保持一致。*
