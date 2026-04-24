# 寻裳 AI 智能穿搭推荐系统 V1.0 软件设计说明书

---

**页眉：寻裳 AI 智能穿搭推荐系统 V1.0 软件设计说明书**

---

## 目录

1. 软件概述
2. 运行环境
3. 安装说明
4. 功能说明
5. API 接口说明
6. 数据库设计
7. 安全设计

---

## 第一章 软件概述

### 1.1 功能简介

寻裳 AI 智能穿搭推荐系统（以下简称"寻裳"或"XUNO"）是一款基于人工智能技术驱动的私人形象定制平台。系统以"用户建立画像 -> AI 造型师推荐穿搭 -> 多模态 API 生成换装效果图 -> 电商购买"为核心业务闭环，为用户提供从形象分析到穿搭推荐再到虚拟试穿的全链路服务。

系统主要功能模块包括：

**（1）AI 穿搭推荐**

系统内置 AI 造型师服务，基于智谱 AI GLM-5 大语言模型实现多轮对话式穿搭咨询。用户可通过自然语言描述场景需求（如"明天参加婚礼穿什么"），AI 造型师结合用户画像数据、天气信息、时尚知识库，生成个性化穿搭方案。系统支持会话管理、上下文记忆、预设问题引导等交互功能，确保推荐结果精准且贴合用户需求。AI 造型师每日限额 50 次对话，保障服务稳定性。

**（2）虚拟试穿**

系统通过 GLM 多模态 API 实现虚拟换装效果图的生成。用户上传个人照片后，选择任意服装商品，系统将自动生成该用户穿着指定服装的效果图。虚拟试穿流程包含三个阶段：图像预处理（分析人物姿态、光照条件、服装特征）、智能提示词生成（基于预处理结果构建精准的生成提示词）、图像生成与后处理（调用 GLM 多模态 API 生成效果图并进行质量优化）。试穿任务通过 BullMQ 异步任务队列处理，支持任务状态追踪、失败重试、结果水印保护。虚拟试穿每日限额 20 次。

**（3）色彩季型分析**

系统实现了基于 CIELAB 色彩科学的 12 季色彩分析体系。通过分析用户肤色在色相（暖/冷）、明度（浅/深）、彩度（清/柔）三个维度的特征，将用户归入 12 种色彩季型之一（如暖春型、冷夏型、深秋型等），并据此推荐最适合的服装色彩搭配方案。色彩分析采用 CIE Delta-E 2000 色差公式，确保色彩匹配的精准度。系统同时支持 8 季简化体系，便于快速分类。

**（4）体型分析与适配**

系统基于身体关键点提取技术，计算用户的肩臀比、腰臀比、腰肩比、胸腰比等关键身体比例指标，将用户体型归入 5 种标准体型分类：H 型（矩形）、X 型（沙漏）、A 型（梨形）、Y 型（倒三角）、O 型（椭圆）。基于体型分类结果，系统为每件服装计算适配评分，推荐最适合用户体型的服装款式和版型。

**（5）衣橱管理**

用户可将个人服装拍照上传至数字衣橱，系统支持服装的增删改查操作，提供分类管理（上装、下装、连衣裙、外套、鞋履、配饰等）、标签管理（颜色、风格、季节、场合）、穿搭组合管理等功能。用户可创建穿搭方案（Outfit），将衣橱中的单品组合搭配，记录穿着频率和评价。

**（6）用户画像管理**

系统构建多维度用户画像，包含身体数据（身高、体重、肩宽、胸围、腰围、臀围等）、偏好数据（风格偏好、色彩偏好、价格区间）、风格标签（通过风格测试问卷获取）等信息。用户画像数据作为 AI 造型师和推荐引擎的核心输入，确保推荐结果的个性化。

**（7）社区与博主**

系统提供 UGC 社区功能，用户可发布穿搭分享帖、点赞、评论、收藏、关注其他用户。博主系统支持博主等级、博主评分、博主徽章、博主商品推荐等功能。社区内容经过内容审核系统过滤，确保内容合规。

**（8）电商导购**

系统对接电商平台，提供商品浏览、搜索、比价、购物车、下单、支付等完整电商功能。支持支付宝和微信支付两种支付方式，提供订单管理、物流追踪、退款售后等服务。品牌商家可通过商家后台管理商品、查看销售数据、处理订单。

### 1.2 技术架构

#### 1.2.1 整体架构

寻裳系统采用前后端分离的微服务架构，整体分为四层：移动端展示层、后端服务层、AI 服务层、基础设施层。

```
+-------------------------------------------------------+
|                    移动端展示层                          |
|         React Native 0.76.8 (Expo 52)                  |
|   Zustand + TanStack Query + React Navigation          |
+-------------------------------------------------------+
                          |
                    HTTPS / WebSocket
                          |
+-------------------------------------------------------+
|                    后端服务层                            |
|              NestJS 11.x (端口 3001)                    |
|   Prisma 5.x + PostgreSQL 16 + Redis 7 + BullMQ       |
|   JWT认证 + Passport策略 + Helmet安全头                  |
+-------------------------------------------------------+
                          |
                    HTTP / WebSocket
                          |
+-------------------------------------------------------+
|                    AI服务层                              |
|           Python FastAPI (端口 8002)                     |
|   GLM-5 API + SASRec + Fashion RAG + Qdrant            |
+-------------------------------------------------------+
                          |
+-------------------------------------------------------+
|                    基础设施层                            |
|  MinIO对象存储 + Docker + Nginx + Prometheus + Grafana  |
+-------------------------------------------------------+
```

#### 1.2.2 Monorepo 项目结构

系统采用 pnpm Monorepo 管理多包项目，目录结构如下：

```
XunO/
├── apps/
│   ├── backend/          # NestJS后端服务 (端口 3001)
│   │   ├── src/
│   │   │   ├── domains/  # 领域模块 (按业务域组织)
│   │   │   │   ├── ai-core/        # AI核心域 (造型师/试穿/照片分析)
│   │   │   │   ├── identity/       # 身份域 (认证/用户/画像/隐私)
│   │   │   │   ├── fashion/        # 时尚域 (服装/品牌/衣橱/风格测评)
│   │   │   │   ├── commerce/       # 商业域 (购物车/订单/支付/订阅)
│   │   │   │   ├── social/         # 社交域 (社区/博主/顾问/聊天)
│   │   │   │   ├── customization/  # 定制域 (个性化定制/分享模板)
│   │   │   │   ├── platform/       # 平台域 (推荐/分析/通知/管理)
│   │   │   │   └── mobile-api/     # 移动端API适配层
│   │   │   ├── common/   # 公共组件 (guards/filters/middleware/encryption)
│   │   │   ├── modules/  # 基础模块 (cache/database/security/ws)
│   │   │   └── main.ts   # 应用入口
│   │   └── prisma/       # 数据库Schema与种子数据
│   ├── mobile/           # React Native移动端
│   │   ├── src/
│   │   │   ├── features/   # 功能模块 (auth/stylist/tryon/wardrobe/community)
│   │   │   ├── stores/     # Zustand状态管理
│   │   │   ├── services/   # API服务层
│   │   │   ├── navigation/ # 导航配置
│   │   │   ├── design-system/ # 设计系统
│   │   │   └── shared/     # 共享组件与工具
│   │   └── App.tsx        # 应用入口
│   ├── admin/            # 管理后台 (Vite + React)
│   └── harmony/          # 鸿蒙端
├── ml/                   # Python AI服务层
│   ├── api/              # FastAPI接口层
│   │   ├── routes/       # API路由 (stylist/analysis/tryon/recommend)
│   │   ├── middleware/    # 中间件 (auth/logging/error_handler)
│   │   └── schemas/      # 请求/响应模型
│   └── services/         # AI核心服务
│       ├── stylist/      # 智能造型师 (GLM-5对话/穿搭方案生成)
│       ├── tryon/        # 虚拟试穿 (预处理/提示词引擎/后处理)
│       ├── analysis/     # 形象分析 (体型/色彩季型/照片质量)
│       ├── recommender/  # 推荐引擎 (SASRec/Fashion RAG)
│       ├── rag/          # 检索增强生成 (BM25/Qdrant/混合检索)
│       └── common/       # 公共服务 (限流/缓存/任务队列)
├── packages/
│   ├── types/            # 共享TypeScript类型定义
│   └── shared/           # 共享工具库
├── infrastructure/       # 基础设施配置 (Prometheus/Loki/Promtail)
├── k8s/                  # Kubernetes部署配置
├── scripts/              # 工具脚本
└── docs/                 # 项目文档
```

#### 1.2.3 技术栈详述

**后端技术栈：**

| 技术       | 版本 | 用途                                                            |
| ---------- | ---- | --------------------------------------------------------------- |
| NestJS     | 11.x | Node.js 后端框架，提供模块化、依赖注入、装饰器等企业级特性      |
| Prisma     | 5.x  | TypeScript ORM，提供类型安全的数据库操作和自动迁移              |
| PostgreSQL | 16   | 主数据库，存储业务数据，支持 JSON 字段、全文搜索、复杂查询      |
| Redis      | 7    | 缓存与消息队列，用于会话缓存、API 限流计数、BullMQ 任务队列后端 |
| BullMQ     | 最新 | 异步任务队列，处理虚拟试穿、内容审核、数据导出等耗时任务        |
| Passport   | 最新 | 认证策略框架，支持 JWT、本地、微信 OAuth 等多种认证方式         |
| Socket.IO  | 最新 | WebSocket 实时通信，支持 AI 造型师流式响应、聊天消息推送        |
| Swagger    | 最新 | API 文档自动生成，开发环境可访问 /api/docs 查看交互式文档       |

**移动端技术栈：**

| 技术             | 版本   | 用途                                     |
| ---------------- | ------ | ---------------------------------------- |
| React Native     | 0.76.8 | 跨平台移动端框架，支持 iOS 和 Android    |
| Expo             | 52     | React Native 开发工具链，简化构建和部署  |
| TypeScript       | 5.x    | 类型安全的 JavaScript 超集               |
| React Navigation | 6      | 导航框架，Stack 导航 + Bottom Tabs 导航  |
| Zustand          | 最新   | 轻量级状态管理，支持持久化和中间件       |
| TanStack Query   | 最新   | 服务端状态管理，自动缓存、重试、后台刷新 |
| React Paper      | 最新   | Material Design UI 组件库                |

**AI 服务技术栈：**

| 技术          | 版本    | 用途                                 |
| ------------- | ------- | ------------------------------------ |
| Python        | 3.11+   | AI 服务开发语言                      |
| FastAPI       | 最新    | 高性能异步 Python Web 框架           |
| 智谱 AI GLM-5 | 最新    | 多模态大语言模型，文生图/图生图/对话 |
| SASRec        | 2.0     | 自注意力序列推荐模型                 |
| Qdrant        | v1.12.1 | 向量数据库，存储服装嵌入向量         |
| NumPy         | 最新    | 数值计算，体型分析和色彩计算         |
| Pillow        | 最新    | 图像处理，照片质量分析和预处理       |

**基础设施技术栈：**

| 技术       | 版本               | 用途                                       |
| ---------- | ------------------ | ------------------------------------------ |
| MinIO      | RELEASE.2024-11-07 | 对象存储，存储用户照片、试穿结果、服装图片 |
| Docker     | 20.10+             | 容器化部署                                 |
| Nginx      | 最新               | 反向代理与负载均衡                         |
| Prometheus | 最新               | 监控指标采集                               |
| Grafana    | 最新               | 监控仪表盘                                 |
| Sentry     | 最新               | 错误追踪与性能监控                         |

### 1.3 开发环境

| 项目           | 要求                |
| -------------- | ------------------- |
| Node.js        | 20+ (当前使用 v24)  |
| pnpm           | 8+                  |
| Python         | 3.11+ (AI 服务)     |
| Docker         | 20.10+              |
| Docker Compose | v2+                 |
| Git            | 2.x                 |
| Android Studio | 最新 (Android 开发) |
| Xcode          | 15+ (iOS 开发)      |

---

## 第二章 运行环境

### 2.1 硬件要求

#### 2.1.1 服务器端硬件要求

**最低配置（开发/测试环境）：**

| 项目 | 要求      |
| ---- | --------- |
| CPU  | 4 核      |
| 内存 | 8GB       |
| 硬盘 | 100GB SSD |
| 网络 | 100Mbps   |

**推荐配置（生产环境）：**

| 项目 | 要求      |
| ---- | --------- |
| CPU  | 8 核      |
| 内存 | 16GB      |
| 硬盘 | 500GB SSD |
| 网络 | 1Gbps     |

**说明：** 生产环境建议采用 Kubernetes 集群部署，各服务独立扩缩容。PostgreSQL 数据库建议独立部署，配置主从复制保障数据安全。Redis 建议配置哨兵模式或集群模式。AI 服务因调用外部 GLM API，不依赖本地 GPU 资源。

#### 2.1.2 客户端硬件要求

| 平台    | 要求                       |
| ------- | -------------------------- |
| Android | Android 8.0+，2GB RAM 以上 |
| iOS     | iOS 13.0+，iPhone 8 及以上 |
| 鸿蒙    | HarmonyOS 4.0+             |

### 2.2 软件要求

#### 2.2.1 服务器端软件要求

| 软件           | 版本                                                         | 用途           |
| -------------- | ------------------------------------------------------------ | -------------- |
| 操作系统       | Linux (Ubuntu 22.04 LTS / CentOS 8+) 或 Windows Server 2019+ | 服务器操作系统 |
| Node.js        | 20+                                                          | 后端运行时     |
| Python         | 3.11+                                                        | AI 服务运行时  |
| PostgreSQL     | 16                                                           | 主数据库       |
| Redis          | 7                                                            | 缓存与消息队列 |
| MinIO          | RELEASE.2024-11-07+                                          | 对象存储       |
| Qdrant         | v1.12.1+                                                     | 向量数据库     |
| Neo4j          | 5 Community                                                  | 知识图谱       |
| Nginx          | 1.24+                                                        | 反向代理       |
| Docker         | 20.10+                                                       | 容器化运行     |
| Docker Compose | v2+                                                          | 容器编排       |

#### 2.2.2 客户端软件要求

| 平台    | 要求                              |
| ------- | --------------------------------- |
| Android | Android 8.0 (API Level 26) 及以上 |
| iOS     | iOS 13.0 及以上                   |
| 鸿蒙    | HarmonyOS 4.0 及以上              |

### 2.3 网络要求

| 项目     | 要求                                                  |
| -------- | ----------------------------------------------------- |
| 协议     | HTTPS (TLS 1.2+)                                      |
| 实时通信 | WebSocket (WSS)                                       |
| 带宽     | 服务端上行 100Mbps+，客户端下行 10Mbps+               |
| 域名     | 需备案域名（中国大陆部署）                            |
| CDN      | 建议配置 CDN 加速静态资源和图片                       |
| 外部 API | 需访问智谱 AI API (open.bigmodel.cn)、阿里云 SMS 服务 |

---

## 第三章 安装说明

### 3.1 Docker Compose 部署

系统提供 Docker Compose 配置文件，可一键启动所有基础设施服务。

**步骤一：克隆代码仓库**

```bash
git clone <repository-url>
cd XunO
```

**步骤二：启动基础设施服务**

```bash
docker-compose -f docker-compose.dev.yml up -d
```

该命令将启动以下服务：

| 服务          | 容器名              | 端口映射             | 说明                                     |
| ------------- | ------------------- | -------------------- | ---------------------------------------- |
| PostgreSQL 16 | xuno-dev-postgres   | 5432:5432            | 主数据库，默认用户 xuno，默认数据库 xuno |
| Redis 7       | xuno-dev-redis      | 6379:6379            | 缓存服务，默认密码 redis123              |
| MinIO         | xuno-dev-minio      | 9000:9000, 9001:9001 | 对象存储，控制台端口 9001                |
| Neo4j 5       | xuno-dev-neo4j      | 7474:7474, 7687:7687 | 知识图谱                                 |
| Qdrant        | xuno-dev-qdrant     | 6333:6333, 6334:6334 | 向量数据库                               |
| MinIO Init    | xuno-dev-minio-init | 无                   | 初始化 MinIO 存储桶                      |

**步骤三：验证服务状态**

```bash
docker-compose -f docker-compose.dev.yml ps
```

确认所有服务状态为 healthy。

### 3.2 环境变量配置

**步骤一：复制环境变量模板**

```bash
# 后端环境变量
cp apps/backend/.env.example apps/backend/.env

# AI服务环境变量
cp ml/.env.example ml/.env

# 根目录环境变量
cp .env.example .env
```

**步骤二：配置关键环境变量**

后端关键环境变量说明：

```bash
# 数据库连接
DATABASE_URL="postgresql://xuno:postgres@127.0.0.1:5432/xuno?schema=public"

# Redis连接
REDIS_URL="redis://:redis123@localhost:6379"

# JWT认证密钥（生产环境必须更换为强密钥）
JWT_SECRET=<64位十六进制字符串，512-bit>
JWT_REFRESH_SECRET=<64位十六进制字符串，512-bit>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 数据加密密钥（AES-256-GCM）
ENCRYPTION_KEY=<64位十六进制字符串>
PII_ENCRYPTION_ENABLED=true

# MinIO对象存储
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=xuno

# AI服务地址
AI_SERVICE_URL=http://localhost:8002
ML_SERVICE_URL=http://localhost:8002

# 智谱AI GLM-5 API密钥
GLM_API_KEY=<申请地址: https://open.bigmodel.cn/>
GLM_API_ENDPOINT=https://open.bigmodel.cn/api/paas/v4
GLM_MODEL=glm-5

# CORS允许的源
CORS_ORIGINS=http://localhost:8081,http://localhost:19002
```

AI 服务关键环境变量说明：

```bash
# 智谱AI API密钥
GLM_API_KEY=<智谱AI API密钥>
ZHIPU_API_KEY=<智谱AI API密钥>

# Qdrant向量数据库
QDRANT_URL=http://localhost:6333

# 服务端口
ML_SERVICE_HOST=0.0.0.0
ML_SERVICE_PORT=8002
```

### 3.3 数据库初始化

**步骤一：推送数据库 Schema**

```bash
cd apps/backend
npx prisma db push
```

该命令根据 `prisma/schema.prisma` 文件自动创建所有数据库表、索引和约束。

**步骤二：执行种子数据**

```bash
cd apps/backend
npx tsx prisma/seed.ts
```

种子数据脚本将创建：

- 系统配置数据
- 品牌与服装商品示例数据
- 风格测试问卷题目
- 色彩季型参考数据
- 社区帖子示例数据
- 电商相关示例数据

### 3.4 依赖安装

**步骤一：安装 Node.js 依赖**

```bash
# 使用国内镜像源安装（推荐）
pnpm install --registry=https://registry.npmmirror.com

# 备用：官方源
# pnpm install --registry=https://registry.npmjs.org
```

**步骤二：安装 Python AI 服务依赖**

```bash
cd ml

# 使用国内镜像源安装（推荐）
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn

# 备用：阿里云镜像
# pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com
```

### 3.5 启动服务

**步骤一：启动后端服务**

```bash
cd apps/backend
pnpm dev
```

后端服务将在 `http://localhost:3001` 启动，API 文档可在 `http://localhost:3001/api/docs` 访问。

**步骤二：启动 AI 服务**

```bash
cd ml
python -m ml.api.main
```

或使用启动脚本：

```bash
# Linux/macOS
bash ml/start_ai_service.sh

# Windows
ml\start_ai_service.bat
```

AI 服务将在 `http://localhost:8002` 启动。

**步骤三：启动移动端开发服务器**

```bash
cd apps/mobile
npx react-native start --port 8081
```

**步骤四：运行移动端应用**

```bash
# Android
cd apps/mobile
npx react-native run-android

# iOS
cd apps/mobile
npx react-native run-ios
```

### 3.6 服务端口总览

| 服务          | 端口 | 说明                    |
| ------------- | ---- | ----------------------- |
| Backend API   | 3001 | NestJS 后端服务         |
| ML API        | 8002 | Python AI 服务          |
| Metro         | 8081 | React Native 开发服务器 |
| PostgreSQL    | 5432 | 主数据库                |
| Redis         | 6379 | 缓存服务                |
| MinIO API     | 9000 | 对象存储 API            |
| MinIO Console | 9001 | 对象存储管理控制台      |
| Neo4j HTTP    | 7474 | 知识图谱 HTTP 接口      |
| Neo4j Bolt    | 7687 | 知识图谱 Bolt 协议      |
| Qdrant HTTP   | 6333 | 向量数据库 HTTP 接口    |
| Qdrant gRPC   | 6334 | 向量数据库 gRPC 接口    |

---

## 第四章 功能说明

### 4.1 用户注册与认证

#### 4.1.1 功能概述

系统提供多种用户认证方式，包括邮箱密码注册登录、手机号短信验证码登录、微信 OAuth 授权登录。认证系统基于 JWT（JSON Web Token）机制实现无状态认证，支持访问令牌和刷新令牌的双令牌模式。

#### 4.1.2 认证流程

**邮箱密码注册流程：**

1. 用户提交注册信息（邮箱、密码、昵称）
2. 系统验证邮箱格式和密码强度（至少 8 位，包含大小写字母和数字）
3. 密码使用 bcrypt 算法进行 12 轮哈希处理后存储
4. 创建用户记录，初始化用户画像
5. 返回访问令牌（有效期 15 分钟）和刷新令牌（有效期 7 天）

**手机号登录流程：**

1. 用户提交手机号，请求发送验证码
2. 系统调用阿里云 SMS 服务发送 6 位数字验证码
3. 短信发送接口实施频率限制（同一手机号 60 秒内仅允许发送 1 次）
4. 用户提交验证码，系统验证后签发令牌

**微信 OAuth 登录流程：**

1. 移动端调用微信 SDK 获取授权码
2. 后端使用授权码向微信服务器换取 access_token 和 openid
3. 系统根据 openid 查找或创建用户，签发令牌

**令牌刷新流程：**

1. 访问令牌过期后，客户端使用刷新令牌请求新令牌
2. 系统验证刷新令牌有效性（检查是否在黑名单中、是否过期）
3. 签发新的访问令牌和刷新令牌
4. 旧刷新令牌加入黑名单

#### 4.1.3 技术实现

- **JWT 密钥**：512-bit（64 字节十六进制字符串），生产环境强制要求
- **密码哈希**：bcrypt 12 轮加盐哈希
- **令牌策略**：Passport 框架，支持 jwt、local、wechat 三种策略
- **令牌黑名单**：Redis 存储已注销的刷新令牌
- **CSRF 保护**：基于双重提交 Cookie 模式的 CSRF 防护
- **限流**：全局 100 请求/分钟/IP，短信发送接口独立限流

#### 4.1.4 新用户引导

新注册用户进入引导流程（Onboarding），包含以下步骤：

1. **基本信息**（BASIC_INFO）：填写性别、出生日期等基础信息
2. **照片上传**（PHOTO）：上传正面照、全身照等用于形象分析
3. **风格测试**（STYLE_TEST）：完成风格测试问卷，获取风格标签
4. **完成**（COMPLETED）：引导完成，解锁全部功能

引导流程支持跳过非必要步骤，系统记录用户跳过的步骤。

### 4.2 AI 造型师对话

#### 4.2.1 功能概述

AI 造型师是系统的核心交互入口，基于智谱 AI GLM-5 大语言模型实现多轮对话式穿搭咨询。用户通过自然语言描述穿搭需求，AI 造型师结合用户画像、天气信息、时尚知识库，生成个性化穿搭方案和服装推荐。

#### 4.2.2 对话流程

1. 用户创建 AI 造型师会话（Session），系统初始化对话上下文
2. 用户发送消息（文本描述穿搭需求）
3. 系统构建对话上下文，包含：
   - 用户画像数据（体型、色彩季型、风格偏好等）
   - 当前天气信息（通过和风天气 API 获取）
   - 历史对话记录（上下文记忆）
   - 时尚知识库检索结果（RAG 增强）
4. 调用 GLM-5 API 生成回复
5. 回复内容包含穿搭建议、推荐商品链接、搭配理由
6. 支持流式响应（通过 WebSocket 实时推送生成内容）

#### 4.2.3 会话管理

- 每个用户可创建多个会话，会话状态分为 active（活跃）和 archived（归档）
- 会话设有过期时间，过期后自动归档
- 支持会话列表查询、会话详情查看、会话归档操作
- 对话历史持久化存储，支持跨设备同步

#### 4.2.4 智能推荐增强

AI 造型师服务集成了以下增强能力：

- **Fashion RAG（检索增强生成）**：基于 Qdrant 向量数据库和 BM25 关键词检索的混合检索策略，从时尚知识库中检索相关知识辅助推荐
- **穿搭方案引擎**：根据用户需求自动生成完整穿搭方案（上装+下装+配饰），而非单品推荐
- **槽位提取**：从用户自然语言中提取关键信息（场景、季节、风格、预算等）
- **对话状态管理**：追踪对话进度，识别用户意图变化，动态调整推荐策略
- **天气集成**：根据用户所在地的实时天气推荐适合的穿搭

#### 4.2.5 使用限额

- AI 造型师每日限额：50 次/用户
- 虚拟试穿每日限额：20 次/用户
- 限额通过 AI 配额守卫（AI Quota Guard）实现，基于 Redis 计数

### 4.3 虚拟试穿

#### 4.3.1 功能概述

虚拟试穿功能允许用户上传个人照片，选择任意服装商品，系统自动生成该用户穿着指定服装的效果图。该功能通过调用智谱 AI GLM 多模态 API 实现图像生成，不依赖本地 GPU 推理。

#### 4.3.2 试穿流程

1. **选择照片**：用户从相册选择或拍摄个人照片上传
2. **选择服装**：从商品列表或衣橱中选择要试穿的服装
3. **创建试穿任务**：系统创建 VirtualTryOn 记录，状态为 pending
4. **异步处理**：任务进入 BullMQ 队列，由 Worker 异步执行
5. **图像预处理**：
   - 分析人物姿态（站立、坐姿等）
   - 检测光照条件（色温、亮度）
   - 提取服装特征（款式、颜色、正式度）
6. **提示词生成**：基于预处理结果构建精准的图像生成提示词
7. **图像生成**：调用 GLM 多模态 API 生成换装效果图
8. **后处理**：对生成图像进行质量优化和水印添加
9. **结果存储**：效果图上传至 MinIO，更新 VirtualTryOn 记录
10. **通知用户**：通过 WebSocket 或推送通知告知用户试穿完成

#### 4.3.3 任务管理

- 任务状态：pending -> processing -> completed / failed
- 失败重试：支持最多 3 次重试，记录重试次数和父任务关联
- 结果保护：生成图片添加水印，防止未授权使用
- 处理时间记录：记录每个任务的处理耗时，用于性能监控
- 置信度评分：记录生成结果的置信度

#### 4.3.4 试穿历史

用户可查看所有历史试穿记录，按时间倒序排列，支持按状态筛选。每条记录包含原始照片、试穿服装信息、生成效果图、创建时间、处理耗时等。

### 4.4 色彩季型分析

#### 4.4.1 功能概述

色彩季型分析基于 CIELAB 色彩科学体系，通过分析用户肤色的色相、明度、彩度三维特征，将用户归入 12 种色彩季型之一，并推荐最适合的服装色彩搭配方案。

#### 4.4.2 分析体系

**12 季色彩分析体系：**

系统基于三个维度将色彩季型细分为 12 种：

| 维度           | 取值                  | 说明               |
| -------------- | --------------------- | ------------------ |
| 色相（Hue）    | 暖(Warm) / 冷(Cool)   | 肤色底色的冷暖倾向 |
| 明度（Value）  | 浅(Light) / 深(Deep)  | 肤色的明暗程度     |
| 彩度（Chroma） | 清(Clear) / 柔(Muted) | 肤色的鲜艳程度     |

12 种季型分类：

- **春季**：暖春型(Warm Spring)、柔春型(Soft Spring)、深春型(Deep Spring)
- **夏季**：冷夏型(Cool Summer)、浅夏型(Light Summer)、柔夏型(Soft Summer)
- **秋季**：暖秋型(Warm Autumn)、深秋型(Deep Autumn)、柔秋型(Soft Autumn)
- **冬季**：冷冬型(Cool Winter)、浅冬型(Light Winter)、深冬型(Deep Winter)

**8 季简化体系：**

系统同时支持 8 季简化分类，便于快速入门：

| 季型 | 数据库枚举值 | 特征           |
| ---- | ------------ | -------------- |
| 暖春 | spring_warm  | 暖色+浅色      |
| 浅春 | spring_light | 暖色+浅色+柔色 |
| 冷夏 | summer_cool  | 冷色+浅色      |
| 浅夏 | summer_light | 冷色+浅色+清色 |
| 暖秋 | autumn_warm  | 暖色+深色      |
| 深秋 | autumn_deep  | 暖色+深色+柔色 |
| 冷冬 | winter_cool  | 冷色+深色      |
| 深冬 | winter_deep  | 冷色+深色+清色 |

#### 4.4.3 技术实现

- **色彩空间**：CIELAB 色彩空间（D65 标准光源），比 RGB 更接近人眼感知
- **色差计算**：CIE Delta-E 2000 公式，业界最精准的色差计算方法
- **ITA 角度**：Individual Typology Angle，用于肤色分类的标准指标
- **彩度计算**：基于 CIELAB 的 a*和 b*分量计算色彩鲜艳度
- **肤色检测**：基于 CIELAB 空间的肤色像素识别算法
- **季节调色板**：每种季型对应一组推荐色彩，用于服装色彩匹配

#### 4.4.4 分析流程

1. 用户上传正面照片
2. 系统检测照片中的肤色区域
3. 提取肤色像素，转换至 CIELAB 色彩空间
4. 计算肤色的色相、明度、彩度特征
5. 基于三维特征进行季型分类
6. 生成色彩季型报告，包含推荐色彩和避雷色彩
7. 结果存储至用户画像的 colorSeason 字段

### 4.5 体型分析与适配

#### 4.5.1 功能概述

体型分析模块通过提取用户身体关键点，计算关键身体比例指标，将用户体型归入 5 种标准分类，并为每件服装计算适配评分。

#### 4.5.2 体型分类

| 体型           | 枚举值            | 特征描述               | 适配建议                      |
| -------------- | ----------------- | ---------------------- | ----------------------------- |
| H 型（矩形）   | rectangle         | 肩臀比接近，腰线不明显 | 建议收腰款式，创造曲线感      |
| X 型（沙漏）   | hourglass         | 肩臀比均衡，腰线明显   | 大部分款式均适合，突出腰线    |
| A 型（梨形）   | triangle          | 臀部宽于肩部，腰线明显 | 建议上身亮色/设计感，下身简约 |
| Y 型（倒三角） | inverted_triangle | 肩部宽于臀部           | 建议上身简约，下身增加量感    |
| O 型（椭圆）   | oval              | 腰围较大，四肢相对纤细 | 建议 V 领/直筒款式，避免紧身  |

#### 4.5.3 关键比例指标

- **肩臀比**（shoulder_to_hip_ratio）：肩宽与臀宽的比值
- **腰臀比**（waist_to_hip_ratio）：腰围与臀围的比值
- **腰肩比**（waist_to_shoulder_ratio）：腰围与肩宽的比值
- **胸腰比**（bust_to_waist_ratio）：胸围与腰围的比值

#### 4.5.4 适配评分算法

系统为每件服装计算体型适配评分（0-100 分），评分维度包括：

1. **版型匹配度**：服装版型与体型的匹配程度
2. **视觉平衡度**：服装穿着后在视觉上是否创造身材平衡
3. **舒适度预估**：基于体型数据的穿着舒适度预估
4. **风格协调度**：服装风格与体型特征的协调程度

适配评分结果用于推荐排序，优先推荐适配度高的服装。

### 4.6 服装推荐

#### 4.6.1 功能概述

推荐引擎是系统的核心算法模块，综合用户画像、行为数据、服装属性、社交信号等多维度信息，为用户提供个性化服装推荐。

#### 4.6.2 推荐类型

| 类型     | 枚举值   | 说明                                     |
| -------- | -------- | ---------------------------------------- |
| 每日推荐 | daily    | 基于用户画像的每日个性化推荐             |
| 场景推荐 | occasion | 针对特定场景（约会、职场、聚会等）的推荐 |
| 季节推荐 | seasonal | 根据当前季节和天气的推荐                 |
| 热门推荐 | trending | 基于全平台热门趋势的推荐                 |
| 商务推荐 | business | 针对商务场景的专业推荐                   |

#### 4.6.3 推荐算法架构

推荐系统采用多路召回+精排的架构：

**召回阶段（多路召回）：**

1. **协同过滤**：基于用户行为的协同过滤算法，发现相似用户的偏好
2. **内容匹配**：基于服装属性（颜色、风格、季节、场合）的匹配
3. **向量相似度**：基于 Qdrant 向量数据库的语义相似度检索
4. **知识图谱**：基于 Neo4j 的时尚知识图谱推理（色彩搭配规则、风格组合规则）
5. **SASRec 序列推荐**：基于自注意力机制的序列推荐模型，捕捉用户行为序列模式
6. **冷启动推荐**：针对新用户的基于流行度和画像的推荐策略

**排序阶段（精排）：**

1. **多模态融合**：融合文本、图像、行为多模态特征
2. **学习排序**：基于 Learning-to-Rank 的排序模型
3. **匹配理论**：基于 Gale-Shapley 匹配理论的推荐优化
4. **穿搭完成度**：评估推荐单品与用户已有衣橱的搭配完成度

**后处理阶段：**

1. **多样性保障**：确保推荐结果的多样性，避免同质化
2. **推荐解释**：为每条推荐生成可读的推荐理由
3. **缓存策略**：热门推荐结果缓存至 Redis，减少计算开销
4. **反馈闭环**：记录用户对推荐的反馈（浏览、点击、试穿、购买），用于模型优化

#### 4.6.4 推荐展示

推荐结果以信息流形式展示，每条推荐包含：

- 服装图片和基本信息
- 推荐理由（如"适合您的暖春型肤色"、"与您衣橱中的黑色西装裤搭配"）
- 适配评分（体型适配度、色彩匹配度）
- 快捷操作（试穿、收藏、加入购物车）

### 4.7 用户画像管理

#### 4.7.1 功能概述

用户画像是系统个性化服务的基础，包含身体数据、偏好数据、风格标签等多维度信息。画像数据贯穿 AI 造型师、推荐引擎、虚拟试穿等核心功能。

#### 4.7.2 画像维度

**身体数据：**

| 字段        | 类型  | 说明           |
| ----------- | ----- | -------------- |
| height      | Float | 身高(cm)       |
| weight      | Float | 体重(kg)       |
| shoulder    | Float | 肩宽(cm)       |
| bust        | Float | 胸围(cm)       |
| waist       | Float | 腰围(cm)       |
| hip         | Float | 臀围(cm)       |
| inseam      | Float | 内缝长(cm)     |
| bodyType    | Enum  | 体型分类(5 种) |
| skinTone    | Enum  | 肤色分类(6 种) |
| faceShape   | Enum  | 脸型分类(6 种) |
| colorSeason | Enum  | 色彩季型(8 种) |

**偏好数据：**

| 字段             | 类型  | 说明                           |
| ---------------- | ----- | ------------------------------ |
| stylePreferences | JSON  | 风格偏好（简约、复古、街头等） |
| colorPreferences | JSON  | 色彩偏好                       |
| priceRangeMin    | Float | 最低价格偏好                   |
| priceRangeMax    | Float | 最高价格偏好                   |

**风格标签：**

通过风格测试问卷获取，存储在 StyleProfile 中，包含：

- 风格名称和关键词
- 适合场合
- 色彩调色板
- 置信度评分（0-100）
- 是否为默认风格

#### 4.7.3 画像更新机制

- **主动更新**：用户手动编辑画像信息
- **被动更新**：系统根据用户行为（浏览、收藏、购买）自动调整偏好权重
- **AI 分析更新**：照片分析结果自动更新体型、肤色、色彩季型等字段
- **事件驱动**：画像变更通过事件总线通知相关服务更新

### 4.8 衣橱管理

#### 4.8.1 功能概述

数字衣橱允许用户将个人服装拍照上传，进行分类管理、标签管理、穿搭组合管理，是系统推荐和搭配的重要数据来源。

#### 4.8.2 服装管理

- **添加服装**：拍照或从相册选择图片上传，系统自动识别服装类别和颜色
- **编辑服装**：修改名称、品牌、类别、颜色、风格、季节、场合等属性
- **删除服装**：支持软删除，保留历史搭配记录
- **分类浏览**：按类别（上装、下装、连衣裙、外套、鞋履、配饰等）浏览
- **标签筛选**：按颜色、风格、季节、场合等标签筛选
- **收藏标记**：标记常用或喜爱的单品

#### 4.8.3 穿搭组合

- **创建穿搭**：将多件单品组合为穿搭方案
- **穿搭画布**：支持拖拽排列单品位置（positionX/Y、width/height、rotation、zIndex）
- **穿搭评价**：对穿搭方案评分（0-5 星）
- **穿着记录**：记录穿搭方案的穿着次数和最后穿着日期
- **穿搭收藏**：标记喜爱的穿搭方案

#### 4.8.4 衣橱集合

支持将衣橱中的服装按主题创建集合（WardrobeCollection），如"工作日穿搭"、"度假装备"等。

### 4.9 社区与博主

#### 4.9.1 社区功能

- **发布帖子**：用户可发布穿搭分享帖，包含标题、内容、图片、标签、关联商品
- **帖子互动**：点赞、评论（支持嵌套回复）、收藏、分享
- **帖子分类**：默认分类为 outfit_share（穿搭分享），支持自定义分类
- **热门排行**：基于点赞数、浏览数、评论数计算热度分数，展示热门帖子
- **内容审核**：帖子发布后经过内容审核系统检查，审核状态包括 approved、pending、rejected
- **举报机制**：用户可举报违规内容，系统记录举报信息并处理

#### 4.9.2 博主系统

- **博主等级**：根据博主评分和活跃度划分等级
- **博主评分**：综合内容质量、粉丝互动、商品推荐效果等维度计算
- **博主徽章**：根据等级和成就授予徽章
- **博主商品推荐**：博主可关联推荐商品，获取销售佣金
- **博主仪表盘**：查看粉丝数据、内容数据、收入数据

#### 4.9.3 社交功能

- **关注系统**：用户可关注其他用户，查看关注列表和粉丝列表
- **用户认证**：支持用户身份认证（isVerified 标记）
- **个人主页**：展示用户信息、穿搭帖子、衣橱公开单品

### 4.10 电商导购

#### 4.10.1 商品浏览

- **商品列表**：按分类、价格、品牌、季节等维度筛选浏览
- **商品详情**：展示商品图片、描述、价格、尺码、库存、品牌信息
- **商品搜索**：支持关键词搜索和图片搜索（AI 视觉搜索）
- **商品收藏**：收藏感兴趣的商品

#### 4.10.2 购物车与订单

- **购物车**：添加商品至购物车，选择颜色和尺码，调整数量
- **下单流程**：选择收货地址 -> 确认商品 -> 选择支付方式 -> 支付
- **订单管理**：查看订单列表、订单详情、物流追踪
- **订单状态**：pending -> paid -> processing -> shipped -> delivered / cancelled / refunded

#### 4.10.3 支付系统

- **支付宝**：集成支付宝支付，支持沙箱环境测试
- **微信支付**：集成微信支付 API v3
- **支付安全**：支付安全守卫验证请求合法性，回调签名验证
- **退款流程**：支持仅退款和退货退款两种类型

#### 4.10.4 会员订阅

- **会员方案**：提供多种会员方案（MembershipPlan），包含不同功能权益
- **订阅管理**：查看订阅状态、自动续费设置、使用量统计
- **功能守卫**：基于订阅等级的功能访问控制（RequireFeature 装饰器）

#### 4.10.5 个性化定制

- **定制请求**：用户可提交服装定制需求（量身定制、原创设计、改衣等）
- **设计编辑器**：在线设计编辑器，支持图层管理（图片、文字、形状）
- **模板系统**：提供 T 恤、帽子、手机壳等多种产品模板
- **报价系统**：定制服务商提交报价，用户选择后确认
- **POD 生产**：对接按需生产服务商，实现一件起订

---

## 第五章 API 接口说明

### 5.1 接口概述

系统 API 采用 RESTful 风格设计，基础路径为 `/api/v1/`，支持 URI 版本控制。所有接口均需 HTTPS 访问，响应格式为 JSON。接口文档通过 Swagger 自动生成，开发环境可访问 `http://localhost:3001/api/docs` 查看交互式 API 文档。

**通用响应格式：**

```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2026-04-23T00:00:00.000Z"
}
```

**错误响应格式：**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "输入参数验证失败",
    "details": []
  },
  "timestamp": "2026-04-23T00:00:00.000Z"
}
```

**分页参数：**

| 参数   | 类型   | 默认值 | 说明                     |
| ------ | ------ | ------ | ------------------------ |
| page   | number | 1      | 页码                     |
| limit  | number | 20     | 每页数量                 |
| cursor | string | -      | 游标（用于无限滚动场景） |

### 5.2 认证 API

基础路径：`/api/v1/auth`

#### 5.2.1 用户注册

```
POST /api/v1/auth/register
```

请求体：

| 字段     | 类型   | 必填 | 说明                                  |
| -------- | ------ | ---- | ------------------------------------- |
| email    | string | 是   | 邮箱地址                              |
| password | string | 是   | 密码（至少 8 位，含大小写字母和数字） |
| nickname | string | 否   | 昵称                                  |

响应：返回用户信息和 JWT 令牌

#### 5.2.2 用户登录

```
POST /api/v1/auth/login
```

请求体：

| 字段     | 类型   | 必填 | 说明     |
| -------- | ------ | ---- | -------- |
| email    | string | 是   | 邮箱地址 |
| password | string | 是   | 密码     |

响应：返回访问令牌和刷新令牌

#### 5.2.3 刷新令牌

```
POST /api/v1/auth/refresh
```

请求体：

| 字段         | 类型   | 必填 | 说明     |
| ------------ | ------ | ---- | -------- |
| refreshToken | string | 是   | 刷新令牌 |

响应：返回新的访问令牌和刷新令牌

#### 5.2.4 获取当前用户

```
GET /api/v1/auth/me
```

请求头：`Authorization: Bearer <access_token>`

响应：返回当前登录用户信息

#### 5.2.5 手机号登录

```
POST /api/v1/auth/sms/login
```

请求体：

| 字段  | 类型   | 必填 | 说明       |
| ----- | ------ | ---- | ---------- |
| phone | string | 是   | 手机号     |
| code  | string | 是   | 短信验证码 |

#### 5.2.6 微信登录

```
POST /api/v1/auth/wechat
```

请求体：

| 字段 | 类型   | 必填 | 说明       |
| ---- | ------ | ---- | ---------- |
| code | string | 是   | 微信授权码 |

### 5.3 AI 造型师 API

基础路径：`/api/v1/ai-stylist`

#### 5.3.1 创建会话

```
POST /api/v1/ai-stylist/sessions
```

请求体：

| 字段  | 类型   | 必填 | 说明     |
| ----- | ------ | ---- | -------- |
| title | string | 否   | 会话标题 |

响应：返回会话信息（包含 sessionId）

#### 5.3.2 获取会话列表

```
GET /api/v1/ai-stylist/sessions
```

查询参数：

| 参数   | 类型   | 说明                            |
| ------ | ------ | ------------------------------- |
| status | string | 会话状态过滤（active/archived） |
| page   | number | 页码                            |
| limit  | number | 每页数量                        |

#### 5.3.3 发送消息

```
POST /api/v1/ai-stylist/sessions/:id/messages
```

请求体：

| 字段    | 类型   | 必填 | 说明                   |
| ------- | ------ | ---- | ---------------------- |
| content | string | 是   | 消息内容               |
| type    | string | 否   | 消息类型（text/image） |

响应：返回 AI 造型师回复（支持流式响应）

#### 5.3.4 获取会话消息历史

```
GET /api/v1/ai-stylist/sessions/:id/messages
```

查询参数：

| 参数   | 类型   | 说明               |
| ------ | ------ | ------------------ |
| cursor | string | 游标，用于分页加载 |
| limit  | number | 每页数量           |

#### 5.3.5 归档会话

```
PATCH /api/v1/ai-stylist/sessions/:id/archive
```

### 5.4 虚拟试穿 API

基础路径：`/api/v1/try-on`

#### 5.4.1 创建试穿任务

```
POST /api/v1/try-on
```

请求体：

| 字段     | 类型   | 必填 | 说明                                              |
| -------- | ------ | ---- | ------------------------------------------------- |
| photoId  | string | 是   | 用户照片 ID                                       |
| itemId   | string | 是   | 服装商品 ID                                       |
| category | string | 否   | 服装类别（upper_body/lower_body/dress/full_body） |

响应：返回试穿任务信息（包含 tryOnId、状态为 pending）

#### 5.4.2 查询试穿结果

```
GET /api/v1/try-on/:id
```

响应：返回试穿任务详情，包含状态和结果图片 URL

#### 5.4.3 获取试穿历史

```
GET /api/v1/try-on/history
```

查询参数：

| 参数   | 类型   | 说明                                            |
| ------ | ------ | ----------------------------------------------- |
| status | string | 状态过滤（pending/processing/completed/failed） |
| page   | number | 页码                                            |
| limit  | number | 每页数量                                        |

### 5.5 服装 API

基础路径：`/api/v1/clothing`

#### 5.5.1 获取服装列表

```
GET /api/v1/clothing
```

查询参数：

| 参数     | 类型   | 说明                                            |
| -------- | ------ | ----------------------------------------------- |
| category | string | 服装类别过滤                                    |
| gender   | string | 性别适配过滤                                    |
| season   | string | 季节过滤                                        |
| priceMin | number | 最低价格                                        |
| priceMax | number | 最高价格                                        |
| sort     | string | 排序方式（price/createdAt/viewCount/likeCount） |
| order    | string | 排序方向（asc/desc）                            |
| page     | number | 页码                                            |
| limit    | number | 每页数量                                        |

#### 5.5.2 获取服装详情

```
GET /api/v1/clothing/:id
```

#### 5.5.3 获取服装分类

```
GET /api/v1/clothing/categories
```

响应：返回所有服装类别列表

#### 5.5.4 搜索服装

```
GET /api/v1/clothing/search
```

查询参数：

| 参数     | 类型   | 说明       |
| -------- | ------ | ---------- |
| q        | string | 搜索关键词 |
| category | string | 类别过滤   |
| priceMin | number | 最低价格   |
| priceMax | number | 最高价格   |

### 5.6 推荐 API

基础路径：`/api/v1/recommendations`

#### 5.6.1 获取推荐列表

```
GET /api/v1/recommendations
```

查询参数：

| 参数  | 类型   | 说明                                                  |
| ----- | ------ | ----------------------------------------------------- |
| type  | string | 推荐类型（daily/occasion/seasonal/trending/business） |
| limit | number | 每页数量                                              |

#### 5.6.2 记录推荐反馈

```
POST /api/v1/recommendations/:id/feedback
```

请求体：

| 字段        | 类型   | 必填 | 说明                                           |
| ----------- | ------ | ---- | ---------------------------------------------- |
| action      | string | 是   | 反馈动作（view/click/dismiss/try_on/purchase） |
| dwellTimeMs | number | 否   | 停留时间（毫秒）                               |

### 5.7 用户 API

基础路径：`/api/v1/profile`

#### 5.7.1 获取用户画像

```
GET /api/v1/profile
```

响应：返回用户画像信息，包含身体数据、偏好数据、风格标签

#### 5.7.2 更新用户画像

```
PUT /api/v1/profile
```

请求体：包含需要更新的画像字段

#### 5.7.3 上传用户照片

```
POST /api/v1/profile/photos
```

请求体：multipart/form-data，包含照片文件和照片类型（front/side/full_body/half_body/face）

#### 5.7.4 获取风格测试问卷

```
GET /api/v1/style-quiz
```

#### 5.7.5 提交风格测试答案

```
POST /api/v1/style-quiz/answers
```

### 5.8 衣橱 API

基础路径：`/api/v1/wardrobe`

#### 5.8.1 获取衣橱列表

```
GET /api/v1/wardrobe
```

查询参数：category、isFavorite、page、limit

#### 5.8.2 添加衣橱单品

```
POST /api/v1/wardrobe
```

#### 5.8.3 更新衣橱单品

```
PUT /api/v1/wardrobe/:id
```

#### 5.8.4 删除衣橱单品

```
DELETE /api/v1/wardrobe/:id
```

#### 5.8.5 创建穿搭方案

```
POST /api/v1/wardrobe/outfits
```

### 5.9 社区 API

基础路径：`/api/v1/community`

#### 5.9.1 获取帖子列表

```
GET /api/v1/community/posts
```

#### 5.9.2 发布帖子

```
POST /api/v1/community/posts
```

#### 5.9.3 点赞帖子

```
POST /api/v1/community/posts/:id/like
```

#### 5.9.4 评论帖子

```
POST /api/v1/community/posts/:id/comments
```

#### 5.9.5 关注用户

```
POST /api/v1/community/users/:id/follow
```

### 5.10 电商 API

基础路径：`/api/v1/commerce`

#### 5.10.1 购物车操作

```
GET    /api/v1/commerce/cart          # 获取购物车
POST   /api/v1/commerce/cart          # 添加商品到购物车
PUT    /api/v1/commerce/cart/:id      # 更新购物车项
DELETE /api/v1/commerce/cart/:id      # 删除购物车项
```

#### 5.10.2 订单操作

```
POST   /api/v1/commerce/orders        # 创建订单
GET    /api/v1/commerce/orders        # 获取订单列表
GET    /api/v1/commerce/orders/:id    # 获取订单详情
```

#### 5.10.3 支付操作

```
POST   /api/v1/commerce/payments      # 创建支付
GET    /api/v1/commerce/payments/:id  # 查询支付状态
POST   /api/v1/commerce/payments/:id/refund  # 申请退款
```

---

## 第六章 数据库设计

### 6.1 数据库概述

系统使用 PostgreSQL 16 作为主数据库，通过 Prisma 5.x ORM 进行数据访问。数据库 Schema 定义在 `apps/backend/prisma/schema.prisma` 文件中，包含 40 余个数据模型，覆盖用户、认证、画像、服装、推荐、试穿、社区、电商、支付等全部业务域。

### 6.2 主要实体与关系

#### 6.2.1 用户与认证域

**User（用户）**

| 字段              | 类型     | 说明                             |
| ----------------- | -------- | -------------------------------- |
| id                | UUID     | 主键，自动生成                   |
| email             | String   | 邮箱，唯一                       |
| emailHash         | String   | 邮箱哈希，唯一                   |
| phone             | String   | 手机号，唯一，PII 加密           |
| wechatOpenId      | String   | 微信 OpenID，唯一                |
| wechatUnionId     | String   | 微信 UnionID，唯一               |
| authProvider      | Enum     | 认证方式（email/phone/wechat）   |
| password          | String   | 密码哈希（bcrypt 12 轮）         |
| nickname          | String   | 昵称                             |
| avatar            | String   | 头像 URL                         |
| gender            | Enum     | 性别（male/female/unisex/other） |
| birthDate         | DateTime | 出生日期                         |
| isActive          | Boolean  | 是否激活                         |
| role              | Enum     | 角色（user/admin 等）            |
| isDeleted         | Boolean  | 软删除标记                       |
| deletedAt         | DateTime | 删除时间                         |
| deletedReason     | String   | 删除原因                         |
| followerCount     | Int      | 粉丝数                           |
| followingCount    | Int      | 关注数                           |
| isVerified        | Boolean  | 是否认证                         |
| bio               | Text     | 个人简介                         |
| encryptionKeySalt | String   | 加密密钥盐值                     |
| encryptedDek      | String   | 加密的数据加密密钥               |
| keyVersion        | Int      | 密钥版本                         |
| createdAt         | DateTime | 创建时间                         |
| updatedAt         | DateTime | 更新时间                         |

**RefreshToken（刷新令牌）**

| 字段      | 类型     | 说明         |
| --------- | -------- | ------------ |
| id        | UUID     | 主键         |
| token     | String   | 令牌值，唯一 |
| userId    | UUID     | 关联用户 ID  |
| expiresAt | DateTime | 过期时间     |

#### 6.2.2 用户画像域

**UserProfile（用户画像）**

| 字段             | 类型  | 说明                                                                                                          |
| ---------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| id               | UUID  | 主键                                                                                                          |
| userId           | UUID  | 关联用户 ID，唯一                                                                                             |
| bodyType         | Enum  | 体型（rectangle/hourglass/triangle/inverted_triangle/oval）                                                   |
| skinTone         | Enum  | 肤色（fair/light/medium/olive/tan/dark）                                                                      |
| faceShape        | Enum  | 脸型（oval/round/square/heart/oblong/diamond）                                                                |
| colorSeason      | Enum  | 色彩季型（spring_warm/spring_light/summer_cool/summer_light/autumn_warm/autumn_deep/winter_cool/winter_deep） |
| height           | Float | 身高(cm)                                                                                                      |
| weight           | Float | 体重(kg)                                                                                                      |
| shoulder         | Float | 肩宽(cm)                                                                                                      |
| bust             | Float | 胸围(cm)                                                                                                      |
| waist            | Float | 腰围(cm)                                                                                                      |
| hip              | Float | 臀围(cm)                                                                                                      |
| inseam           | Float | 内缝长(cm)                                                                                                    |
| stylePreferences | JSON  | 风格偏好                                                                                                      |
| colorPreferences | JSON  | 色彩偏好                                                                                                      |
| priceRangeMin    | Float | 最低价格偏好                                                                                                  |
| priceRangeMax    | Float | 最高价格偏好                                                                                                  |
| onboardingStep   | Enum  | 引导步骤（BASIC_INFO/PHOTO/STYLE_TEST/COMPLETED）                                                             |

**StyleProfile（风格档案）**

| 字段        | 类型     | 说明          |
| ----------- | -------- | ------------- |
| id          | UUID     | 主键          |
| userId      | UUID     | 关联用户 ID   |
| name        | String   | 风格名称      |
| occasion    | String   | 适合场合      |
| description | String   | 风格描述      |
| keywords    | String[] | 风格关键词    |
| palette     | String[] | 色彩调色板    |
| confidence  | Int      | 置信度(0-100) |
| isDefault   | Boolean  | 是否默认风格  |
| isActive    | Boolean  | 是否激活      |

**UserPhoto（用户照片）**

| 字段           | 类型   | 说明                                            |
| -------------- | ------ | ----------------------------------------------- |
| id             | UUID   | 主键                                            |
| userId         | UUID   | 关联用户 ID                                     |
| type           | Enum   | 照片类型（front/side/full_body/half_body/face） |
| url            | String | 图片 URL                                        |
| thumbnailUrl   | String | 缩略图 URL                                      |
| analysisResult | JSON   | 分析结果                                        |
| analysisStatus | Enum   | 分析状态（pending/processing/completed/failed） |

#### 6.2.3 服装域

**ClothingItem（服装商品）**

| 字段          | 类型          | 说明                                                                                |
| ------------- | ------------- | ----------------------------------------------------------------------------------- |
| id            | UUID          | 主键                                                                                |
| brandId       | UUID          | 关联品牌 ID                                                                         |
| name          | String        | 商品名称                                                                            |
| description   | String        | 商品描述                                                                            |
| sku           | String        | SKU 编码，唯一                                                                      |
| category      | Enum          | 服装类别（tops/bottoms/dresses/outerwear/footwear/accessories/activewear/swimwear） |
| subcategory   | String        | 子类别                                                                              |
| colors        | String[]      | 颜色列表                                                                            |
| sizes         | String[]      | 尺码列表                                                                            |
| tags          | String[]      | 标签列表                                                                            |
| material      | String        | 面料                                                                                |
| season        | String        | 季节                                                                                |
| gender        | Enum          | 性别适配                                                                            |
| price         | Decimal(10,2) | 售价                                                                                |
| originalPrice | Decimal(10,2) | 原价                                                                                |
| currency      | String        | 币种，默认 CNY                                                                      |
| stock         | Int           | 库存数量                                                                            |
| images        | String[]      | 图片列表                                                                            |
| mainImage     | String        | 主图 URL                                                                            |
| externalUrl   | String        | 外部购买链接                                                                        |
| isActive      | Boolean       | 是否上架                                                                            |
| isFeatured    | Boolean       | 是否精选                                                                            |
| isDeleted     | Boolean       | 软删除标记                                                                          |
| viewCount     | Int           | 浏览数                                                                              |
| likeCount     | Int           | 点赞数                                                                              |

**Brand（品牌）**

| 字段           | 类型         | 说明                                        |
| -------------- | ------------ | ------------------------------------------- |
| id             | UUID         | 主键                                        |
| name           | String       | 品牌名称，唯一                              |
| slug           | String       | URL 友好标识，唯一                          |
| logo           | String       | 品牌 Logo                                   |
| priceRange     | Enum         | 价格区间（budget/mid_range/premium/luxury） |
| verified       | Boolean      | 是否认证品牌                                |
| commissionRate | Decimal(5,4) | 佣金比例                                    |

#### 6.2.4 虚拟试穿域

**VirtualTryOn（虚拟试穿）**

| 字段                | 类型   | 说明                                        |
| ------------------- | ------ | ------------------------------------------- |
| id                  | UUID   | 主键                                        |
| userId              | UUID   | 关联用户 ID                                 |
| photoId             | UUID   | 关联用户照片 ID                             |
| itemId              | UUID   | 关联服装商品 ID                             |
| resultImageUrl      | String | 结果图片 URL                                |
| watermarkedImageUrl | String | 水印图片 URL                                |
| status              | Enum   | 状态（pending/processing/completed/failed） |
| errorMessage        | String | 错误信息                                    |
| provider            | String | 服务提供商                                  |
| processingTime      | Float  | 处理耗时(秒)                                |
| confidence          | Float  | 置信度                                      |
| category            | String | 服装类别                                    |
| scene               | String | 场景                                        |
| retryCount          | Int    | 重试次数                                    |
| parentTryOnId       | UUID   | 父试穿任务 ID（重试关联）                   |

#### 6.2.5 AI 造型师域

**AiStylistSession（AI 造型师会话）**

| 字段      | 类型     | 说明                     |
| --------- | -------- | ------------------------ |
| id        | UUID     | 主键                     |
| userId    | UUID     | 关联用户 ID              |
| payload   | JSON     | 会话数据（包含消息历史） |
| status    | Enum     | 状态（active/archived）  |
| expiresAt | DateTime | 过期时间                 |

**UserDecision（用户决策）**

| 字段              | 类型     | 说明               |
| ----------------- | -------- | ------------------ |
| id                | UUID     | 主键               |
| userId            | UUID     | 关联用户 ID        |
| sessionId         | UUID     | 关联会话 ID        |
| nodeId            | String   | 决策节点 ID        |
| nodeType          | String   | 节点类型           |
| chosenOptionId    | String   | 选择的选项 ID      |
| rejectedOptionIds | String[] | 拒绝的选项 ID 列表 |
| decisionTime      | Int      | 决策耗时(毫秒)     |

#### 6.2.6 推荐域

**StyleRecommendation（风格推荐）**

| 字段     | 类型         | 说明                                                  |
| -------- | ------------ | ----------------------------------------------------- |
| id       | UUID         | 主键                                                  |
| userId   | UUID         | 关联用户 ID                                           |
| type     | Enum         | 推荐类型（daily/occasion/seasonal/trending/business） |
| items    | JSON         | 推荐商品列表                                          |
| reason   | Text         | 推荐理由                                              |
| score    | Decimal(5,4) | 推荐评分                                              |
| isViewed | Boolean      | 是否已浏览                                            |
| isLiked  | Boolean      | 是否已点赞                                            |

**RecommendationImpression（推荐曝光）**

| 字段             | 类型   | 说明                                           |
| ---------------- | ------ | ---------------------------------------------- |
| id               | UUID   | 主键                                           |
| userId           | UUID   | 关联用户 ID                                    |
| recommendationId | String | 推荐 ID                                        |
| impressionType   | String | 曝光类型（view/click/dismiss/try_on/purchase） |
| dwellTimeMs      | Int    | 停留时间(毫秒)                                 |

#### 6.2.7 衣橱域

**UserClothing（用户衣橱单品）**

| 字段         | 类型     | 说明         |
| ------------ | -------- | ------------ |
| id           | UUID     | 主键         |
| userId       | UUID     | 关联用户 ID  |
| imageUri     | String   | 图片 URI     |
| thumbnailUri | String   | 缩略图 URI   |
| category     | String   | 类别         |
| subcategory  | String   | 子类别       |
| name         | String   | 名称         |
| brand        | String   | 品牌         |
| colors       | String[] | 颜色列表     |
| style        | String[] | 风格标签     |
| seasons      | String[] | 适合季节     |
| occasions    | String[] | 适合场合     |
| tags         | String[] | 自定义标签   |
| wearCount    | Int      | 穿着次数     |
| lastWorn     | DateTime | 最后穿着日期 |
| isFavorite   | Boolean  | 是否收藏     |

**Outfit（穿搭方案）**

| 字段        | 类型         | 说明        |
| ----------- | ------------ | ----------- |
| id          | UUID         | 主键        |
| userId      | UUID         | 关联用户 ID |
| name        | String       | 方案名称    |
| description | Text         | 方案描述    |
| coverImage  | String       | 封面图      |
| occasions   | String[]     | 适合场合    |
| seasons     | String[]     | 适合季节    |
| style       | String       | 风格        |
| wearCount   | Int          | 穿着次数    |
| rating      | Decimal(2,1) | 评分(0-5)   |

**OutfitItem（穿搭方案单品）**

| 字段       | 类型  | 说明            |
| ---------- | ----- | --------------- |
| id         | UUID  | 主键            |
| outfitId   | UUID  | 关联穿搭方案 ID |
| clothingId | UUID  | 关联衣橱单品 ID |
| positionX  | Float | X 坐标(0-1)     |
| positionY  | Float | Y 坐标(0-1)     |
| width      | Float | 宽度(0-1)       |
| height     | Float | 高度(0-1)       |
| rotation   | Float | 旋转角度        |
| zIndex     | Int   | 层级            |

#### 6.2.8 社区域

**CommunityPost（社区帖子）**

| 字段             | 类型     | 说明                    |
| ---------------- | -------- | ----------------------- |
| id               | UUID     | 主键                    |
| authorId         | UUID     | 作者 ID                 |
| title            | String   | 标题                    |
| content          | Text     | 内容                    |
| images           | String[] | 图片列表                |
| tags             | String[] | 标签列表                |
| category         | String   | 分类，默认 outfit_share |
| viewCount        | Int      | 浏览数                  |
| likeCount        | Int      | 点赞数                  |
| commentCount     | Int      | 评论数                  |
| shareCount       | Int      | 分享数                  |
| isFeatured       | Boolean  | 是否精选                |
| isHidden         | Boolean  | 是否隐藏                |
| isDeleted        | Boolean  | 软删除标记              |
| hotScore         | Float    | 热度分数                |
| moderationStatus | String   | 审核状态                |

#### 6.2.9 电商域

**CartItem（购物车项）**

| 字段     | 类型    | 说明        |
| -------- | ------- | ----------- |
| id       | UUID    | 主键        |
| userId   | UUID    | 关联用户 ID |
| itemId   | UUID    | 关联商品 ID |
| color    | String  | 颜色        |
| size     | String  | 尺码        |
| quantity | Int     | 数量        |
| selected | Boolean | 是否选中    |

**Order（订单）**

| 字段           | 类型          | 说明                                                                     |
| -------------- | ------------- | ------------------------------------------------------------------------ |
| id             | UUID          | 主键                                                                     |
| orderNo        | String        | 订单号，唯一                                                             |
| userId         | UUID          | 关联用户 ID                                                              |
| status         | Enum          | 订单状态（pending/paid/processing/shipped/delivered/cancelled/refunded） |
| totalAmount    | Decimal(10,2) | 订单总额                                                                 |
| shippingFee    | Decimal(10,2) | 运费                                                                     |
| discountAmount | Decimal(10,2) | 优惠金额                                                                 |
| finalAmount    | Decimal(10,2) | 实付金额                                                                 |
| paymentMethod  | String        | 支付方式                                                                 |
| expressCompany | String        | 快递公司                                                                 |
| expressNo      | String        | 快递单号                                                                 |

**PaymentRecord（支付记录）**

| 字段     | 类型          | 说明                                                      |
| -------- | ------------- | --------------------------------------------------------- |
| id       | UUID          | 主键                                                      |
| orderId  | String        | 订单 ID，唯一                                             |
| userId   | UUID          | 关联用户 ID                                               |
| provider | String        | 支付提供商（alipay/wechat）                               |
| amount   | Decimal(10,2) | 支付金额                                                  |
| status   | Enum          | 支付状态（pending/paid/failed/refunded/cancelled/closed） |
| tradeNo  | String        | 第三方交易号，唯一                                        |

### 6.3 实体关系图

```
User 1---1 UserProfile          (用户-画像：一对一)
User 1---* UserPhoto            (用户-照片：一对多)
User 1---* VirtualTryOn         (用户-试穿：一对多)
User 1---* AiStylistSession     (用户-会话：一对多)
User 1---* StyleRecommendation  (用户-推荐：一对多)
User 1---* UserClothing         (用户-衣橱：一对多)
User 1---* CommunityPost        (用户-帖子：一对多)
User 1---* Order                (用户-订单：一对多)
User 1---* CartItem             (用户-购物车：一对多)

UserPhoto 1---* VirtualTryOn    (照片-试穿：一对多)
ClothingItem 1---* VirtualTryOn (商品-试穿：一对多)
ClothingItem 1---* CartItem     (商品-购物车：一对多)
ClothingItem 1---* OrderItem    (商品-订单项：一对多)

Brand 1---* ClothingItem        (品牌-商品：一对多)
UserClothing 1---* OutfitItem   (衣橱单品-穿搭项：一对多)
Outfit 1---* OutfitItem         (穿搭方案-穿搭项：一对多)
CommunityPost 1---* PostLike    (帖子-点赞：一对多)
CommunityPost 1---* PostComment (帖子-评论：一对多)
Order 1---* OrderItem           (订单-订单项：一对多)
Order 1---1 OrderAddress        (订单-地址：一对一)
```

### 6.4 PII 字段加密

系统对个人身份信息（PII）字段实施 AES-256-GCM 加密存储，确保敏感数据安全。

**加密字段清单：**

| 模型         | 字段              | 加密方式    |
| ------------ | ----------------- | ----------- |
| User         | phone             | AES-256-GCM |
| User         | encryptionKeySalt | AES-256-GCM |
| Brand        | contactEmail      | AES-256-GCM |
| Brand        | contactPhone      | AES-256-GCM |
| Brand        | bankName          | AES-256-GCM |
| Brand        | bankAccount       | AES-256-GCM |
| OrderAddress | phone             | AES-256-GCM |
| OrderAddress | address           | AES-256-GCM |
| UserAddress  | phone             | AES-256-GCM |
| UserAddress  | address           | AES-256-GCM |

**加密机制：**

1. 每个用户拥有独立的加密密钥（通过 encryptionKeySalt 和 encryptedDek 管理）
2. 写入数据库前，Prisma 中间件自动加密 PII 字段
3. 读取数据库后，Prisma 中间件自动解密 PII 字段
4. 生产环境强制启用 PII 加密（PII_ENCRYPTION_ENABLED=true）
5. 加密算法采用 AES-256-GCM，提供机密性和完整性保障

### 6.5 数据库索引策略

系统采用精简索引策略，在查询性能和写入性能之间取得平衡。核心原则：

1. **外键优先**：所有外键字段建立索引
2. **复合索引覆盖**：用复合索引覆盖高频单列查询
3. **排序索引**：时间倒序查询建立降序索引
4. **业务索引**：根据实际查询模式建立专用索引
5. **合规索引**：软删除、数据合规相关查询建立索引

以 ClothingItem 为例，索引设计如下：

```sql
-- 外键索引
@@index([brandId])
-- 核心业务索引
@@index([category, isActive])           -- 分类列表页
@@index([price])                        -- 价格筛选
@@index([createdAt(sort: Desc)])        -- 默认排序
@@index([name])                         -- 名称搜索
-- 业务组合索引
@@index([isActive, isFeatured])         -- 精选商品
@@index([isActive, createdAt(sort: Desc)])  -- 活跃商品时间线
@@index([isActive, price])              -- 价格排序
@@index([season, isActive])             -- 季节筛选
@@index([gender, isActive])             -- 性别筛选
@@index([category, season, isActive])   -- 分类+季节组合
```

### 6.6 软删除策略

系统对关键实体实施软删除，符合 GDPR/PIPL 数据合规要求：

- User 模型：isDeleted + deletedAt + deletedReason
- ClothingItem 模型：isDeleted + deletedAt
- CommunityPost 模型：isDeleted + deletedAt
- Order 模型：isDeleted + deletedAt

软删除中间件（SoftDeleteMiddleware）自动过滤已删除记录，业务代码无需手动添加过滤条件。

---

## 第七章 安全设计

### 7.1 安全架构概述

寻裳系统采用多层安全防护架构，覆盖传输层、应用层、数据层三个层面，确保用户数据安全和系统稳定运行。

```
+-------------------------------------------+
|              传输层安全                      |
|   HTTPS (TLS 1.2+) + WebSocket Secure     |
+-------------------------------------------+
                    |
+-------------------------------------------+
|              应用层安全                      |
|   JWT认证 + CSRF防护 + XSS过滤 + 限流       |
|   Helmet安全头 + CORS白名单 + 内容安全策略    |
+-------------------------------------------+
                    |
+-------------------------------------------+
|              数据层安全                      |
|   AES-256-GCM加密 + bcrypt哈希 + 软删除     |
|   数据导出 + 数据删除 + 用户同意管理          |
+-------------------------------------------+
```

### 7.2 JWT 512-bit 密钥认证

#### 7.2.1 认证机制

系统采用 JWT（JSON Web Token）无状态认证机制，密钥长度为 512-bit（64 字节十六进制字符串）。

**令牌类型：**

| 令牌类型      | 有效期  | 用途         |
| ------------- | ------- | ------------ |
| Access Token  | 15 分钟 | API 请求认证 |
| Refresh Token | 7 天    | 刷新访问令牌 |

**认证流程：**

1. 用户登录成功后，系统签发 Access Token 和 Refresh Token
2. 客户端在每次 API 请求的 Authorization 头中携带 Access Token
3. JwtAuthGuard 全局守卫自动验证令牌有效性
4. Access Token 过期后，客户端使用 Refresh Token 获取新令牌
5. 用户注销时，Refresh Token 加入 Redis 黑名单

**密钥管理：**

- JWT_SECRET：访问令牌签名密钥，生产环境必须为 64 位十六进制字符串
- JWT_REFRESH_SECRET：刷新令牌签名密钥，独立于访问令牌密钥
- 密钥通过环境变量注入，不硬编码在代码中

#### 7.2.2 认证策略

系统通过 Passport 框架支持多种认证策略：

- **jwt 策略**：JWT 令牌验证，用于 API 请求认证
- **local 策略**：邮箱密码登录验证
- **wechat 策略**：微信 OAuth 授权登录验证
- **optional 认证**：部分接口支持可选认证，未认证用户可访问公开资源

### 7.3 API 限流

#### 7.3.1 全局限流

系统使用 NestJS ThrottlerModule 实现全局限流：

- **限流规则**：100 请求/分钟/IP
- **实现方式**：ThrottlerGuard 全局守卫
- **限流响应**：HTTP 429 Too Many Requests
- **配置参数**：TTL 60000ms，Limit 100

#### 7.3.2 AI 服务限流

AI 服务实施独立的用户级限流：

- **AI 造型师**：50 次/用户/天
- **虚拟试穿**：20 次/用户/天
- **实现方式**：AI Quota Guard，基于 Redis 计数
- **限流响应**：HTTP 429，提示当日使用次数已达上限

#### 7.3.3 短信服务限流

- **发送频率**：同一手机号 60 秒内仅允许发送 1 次
- **实现方式**：SMS Throttle Guard
- **防刷机制**：IP 级别和手机号级别双重限流

#### 7.3.4 AI 服务请求体限流

- **普通请求**：最大 10MB
- **文件上传请求**：最大 50MB（试穿、体型分析等接口）
- **实现方式**：RequestBodySizeLimitMiddleware
- **超限响应**：HTTP 413 Request Entity Too Large

### 7.4 PII 字段 AES-256-GCM 加密

#### 7.4.1 加密方案

系统对个人身份信息（PII）字段采用 AES-256-GCM 加密算法进行存储加密。

**加密参数：**

| 参数     | 值          | 说明                             |
| -------- | ----------- | -------------------------------- |
| 算法     | AES-256-GCM | 提供机密性和完整性保障           |
| 密钥长度 | 256-bit     | 通过 ENCRYPTION_KEY 环境变量配置 |
| IV 长度  | 96-bit      | 每次加密随机生成                 |
| 认证标签 | 128-bit     | GCM 模式内置认证                 |

**加密流程：**

1. 应用层写入 PII 字段时，Prisma 加密中间件拦截写入操作
2. 生成随机 IV，使用 AES-256-GCM 加密明文
3. 将 IV + 认证标签 + 密文拼接后存入数据库
4. 读取时，中间件自动解密，返回明文

**每用户密钥体系：**

- 每个用户拥有独立的加密密钥层次
- encryptionKeySalt：用户密钥盐值
- encryptedDek：加密的数据加密密钥（KEK 包装 DEK 模式）
- keyVersion：密钥版本号，支持密钥轮换

#### 7.4.2 加密字段

详见第六章 6.4 节 PII 字段加密清单。

### 7.5 Helmet 安全头

系统通过 Helmet 中间件设置 HTTP 安全响应头，防御常见 Web 攻击。

**安全头配置：**

| 安全头                       | 配置                                                                                                | 说明                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------- |
| Content-Security-Policy      | default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: | 内容安全策略，防止 XSS          |
| Cross-Origin-Resource-Policy | same-site                                                                                           | 跨域资源策略                    |
| Cross-Origin-Opener-Policy   | same-origin                                                                                         | 跨域打开策略                    |
| Cross-Origin-Embedder-Policy | require-corp                                                                                        | 跨域嵌入策略                    |
| Referrer-Policy              | strict-origin-when-cross-origin                                                                     | 引用策略                        |
| X-Content-Type-Options       | nosniff                                                                                             | 防止 MIME 嗅探                  |
| X-Frame-Options              | DENY                                                                                                | 防止点击劫持                    |
| X-XSS-Protection             | 0                                                                                                   | 禁用旧版 XSS 过滤器（依赖 CSP） |

### 7.6 CORS 白名单

系统实施严格的跨域资源共享（CORS）策略：

- **允许的源**：通过 CORS_ORIGINS 环境变量配置，逗号分隔
- **开发环境**：默认允许 localhost:3000 和 localhost:3001
- **生产环境**：必须显式配置，未配置则不允许任何跨域请求
- **允许的方法**：GET, POST, PUT, DELETE, PATCH, OPTIONS
- **允许的头**：Content-Type, Authorization, X-Requested-With, X-CSRF-Token
- **暴露的头**：X-Total-Count, X-CSRF-Token
- **凭证支持**：允许携带 Cookie 和认证头
- **缓存时间**：86400 秒（24 小时）

### 7.7 XSS 防护

系统实施多层 XSS 防护：

#### 7.7.1 输入验证管道

NestJS 全局 ValidationPipe 配置：

- **whitelist: true**：自动移除未在 DTO 中声明的属性
- **forbidNonWhitelisted: true**：拒绝包含未声明属性的请求
- **transform: true**：自动类型转换

#### 7.7.2 XSS 清理管道

XssSanitizationPipe 在 ValidationPipe 之前执行，对所有字符串输入进行 XSS 清理：

- 移除 HTML 标签和事件处理属性
- 清理 JavaScript 代码注入
- 过滤危险字符和脚本

#### 7.7.3 内容安全策略

通过 Content-Security-Policy 头限制资源加载来源，防止内联脚本执行。

### 7.8 CSRF 保护

系统实施基于双重提交 Cookie 模式的 CSRF 防护：

- **CSRF 密钥**：通过 CSRF_SECRET 环境变量配置
- **令牌传递**：服务器通过 X-CSRF-Token 响应头发放令牌
- **令牌验证**：客户端在请求头中携带 X-CSRF-Token，CsrfGuard 验证令牌有效性
- **豁免路径**：API 文档路径和健康检查路径豁免 CSRF 验证

### 7.9 数据合规

#### 7.9.1 用户同意管理

系统实现 UserConsent 模型，记录用户对各类数据处理的同意状态：

- **同意类型**：隐私政策、数据分析、营销推送等
- **同意记录**：记录授予/撤销时间、IP 地址、User-Agent
- **版本管理**：记录同意时的隐私政策版本
- **撤销机制**：用户可随时撤销同意

#### 7.9.2 数据导出

系统支持用户数据导出请求（DataExportRequest）：

- **导出格式**：JSON（默认）
- **处理流程**：pending -> processing -> completed
- **下载链接**：生成有时效的下载 URL
- **异步处理**：通过 BullMQ 队列异步执行数据导出

#### 7.9.3 数据删除

系统支持用户数据删除请求（DataDeletionRequest），符合 GDPR/PIPL"被遗忘权"要求：

- **删除流程**：pending -> processing -> completed
- **软删除优先**：先执行软删除，保留必要审计记录
- **硬删除**：超期后执行物理删除
- **删除原因**：记录用户提供的删除原因

#### 7.9.4 审计日志

系统记录关键操作的审计日志（AuditLog）：

- **记录内容**：操作者、操作类型、目标实体、变更前后值、IP 地址、User-Agent
- **覆盖范围**：用户数据修改、权限变更、支付操作、管理操作
- **保留策略**：审计日志长期保留，不随用户删除而删除

### 7.10 AI 安全

#### 7.10.1 AI 安全服务

系统实现 AISafetyModule，提供 AI 内容安全防护：

- **内容过滤**：过滤 AI 生成的不当内容
- **输入验证**：验证用户输入的安全性，防止提示注入攻击
- **输出审核**：审核 AI 生成内容，确保合规

#### 7.10.2 AI 熔断器

系统实现 AI Circuit Breaker（熔断器），防止 AI 服务故障导致系统不可用：

- **失败阈值**：5 次连续失败触发熔断
- **成功阈值**：3 次连续成功恢复
- **超时时间**：30 秒
- **错误百分比**：50%触发熔断
- **全局预算**：每分钟 20 次调用上限

#### 7.10.3 API 密钥安全

AI 服务 API 密钥通过 SecureAPIKeyManager 安全管理：

- 密钥不硬编码在代码中
- 通过环境变量注入
- 支持密钥轮换
- 运行时内存中加密存储

### 7.11 安全配置检查清单

| 检查项         | 状态            | 说明                             |
| -------------- | --------------- | -------------------------------- |
| JWT 密钥强度   | 必须 512-bit    | 生产环境强制检查                 |
| PII 加密       | 生产强制开启    | PII_ENCRYPTION_ENABLED=true      |
| CORS 白名单    | 生产必须配置    | 未配置则拒绝所有跨域             |
| Helmet 安全头  | 全局启用        | 所有 HTTP 响应自动添加           |
| CSRF 保护      | 全局启用        | 豁免路径除外                     |
| API 限流       | 全局 100/min/IP | AI 服务独立限额                  |
| 输入验证       | 全局启用        | whitelist + forbidNonWhitelisted |
| XSS 过滤       | 全局启用        | XssSanitizationPipe              |
| 请求体大小限制 | 10MB/50MB       | 防止 DoS 攻击                    |
| 密码哈希       | bcrypt 12 轮    | 不存储明文密码                   |
| 软删除         | 关键实体启用    | 符合 GDPR/PIPL                   |
| 审计日志       | 关键操作记录    | 长期保留                         |

---

**文档版本**：V1.0

**编制日期**：2026 年 4 月 23 日

**软件名称**：寻裳 AI 智能穿搭推荐系统 V1.0

**页眉**：寻裳 AI 智能穿搭推荐系统 V1.0 软件设计说明书
