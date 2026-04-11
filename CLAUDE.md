# AiNeed 项目 CLAUDE.md

## 项目概述

AiNeed 是一个基于多模态 AI 技术的智能私人形象定制与服装设计助手平台。通过大语言模型、计算机视觉、图像生成等前沿技术的深度融合，为每位用户提供独一无二的个性化形象设计方案。

## 技术栈

### 前端
- **React Native 0.76.8** (Expo 52) - 移动端跨平台开发
- **TypeScript 5.x** - 类型安全
- **React Navigation** - Stack + Bottom Tabs 导航
- **Zustand** - 轻量级状态管理
- **TanStack Query** - 服务端状态管理
- **React Paper** - UI 组件库
- **React Reanimated** - 动画库

### 后端
- **NestJS 11.x** - 企业级 Node.js 框架
- **Prisma 5.x** - 类型安全 ORM
- **PostgreSQL 16.x** - 主数据库
- **Redis 7.x** - 缓存与会话存储
- **MinIO** - S3 兼容对象存储
- **Qdrant** - 向量数据库
- **JWT + Passport** - 认证授权

### AI / ML
- **GLM-5** - AI 造型师对话 (智谱 AI)
- **CatVTON** - 虚拟试衣扩散模型 (RTX 4060 8GB VRAM)
- **FashionCLIP** - 服装图像特征提取
- **SASRec** - 序列推荐算法
- **DensePose + SCHP** - 人体检测与分割

## Monorepo 结构

```
AiNeed/
├── apps/
│   ├── backend/          # NestJS 后端 (端口 3001)
│   └── mobile/           # React Native 移动应用
├── ml/                   # Python AI 服务
│   ├── inference/        # CatVTON 服务器
│   ├── services/         # AI 服务实现
│   │   ├── rag/          # RAG 系统 (混合检索 + 重排序 + RAGAS 评测)
│   │   └── hallucination/# 幻觉检测 (50+ 规则 + LLM 校验)
│   └── models/           # 模型文件 (CatVTON 等)
├── packages/
│   └── types/            # 共享 TypeScript 类型
├── k8s/                  # Kubernetes 部署配置
├── delivery/
│   └── competition/      # 竞赛文档 (商业计划书、路演脚本)
└── docs/
```

## 服务端口

| 服务 | 端口 | 状态 |
|------|------|------|
| Metro (移动端) | 8081 | ✅ |
| Backend API | 3001 | ✅ |
| CatVTON (虚拟试衣) | 8001 | ✅ |
| PostgreSQL | 5432 | ✅ |
| Redis | 6379 | ✅ |
| MinIO | 9000/9001 | ✅ |
| Qdrant | 6333 | ✅ |

## 关键路径

### 移动端
- `apps/mobile/src/screens/` - 页面组件
- `apps/mobile/src/components/` - UI 组件
- `apps/mobile/src/stores/` - Zustand stores
- `apps/mobile/src/services/` - API 服务层
- `apps/mobile/App.tsx` - 6-tab 导航入口
- `apps/mobile/src/config/runtime.ts` - 运行时配置

### 后端
- `apps/backend/src/modules/` - 业务模块 (auth, ai-stylist, clothing, try-on 等)
- `apps/backend/src/common/` - guards, filters, middleware, encryption
- `apps/backend/prisma/` - 数据库 Schema
- `apps/backend/src/main.ts` - 入口
- `apps/backend/.env` - 环境配置 (含 GLM API Key)

### AI 服务
- `ml/inference/catvton_server.py` - CatVTON 虚拟试衣服务器 (含超时控制 + GPU 内存限制)
- `ml/services/rag/` - RAG 系统 (混合检索 + RAGAS 评测)
- `ml/services/hallucination/` - 幻觉检测系统
- `ml/venv/` - Python 虚拟环境

## 常用命令

```powershell
# 安装依赖
pnpm install

# 启动后端
cd apps/backend; pnpm dev

# 启动移动端
cd apps/mobile; npx react-native start --port 8081

# 启动 CatVTON
cd ml; .\venv\Scripts\activate; $env:CATVTON_REPO_PATH="C:\AiNeed\models\CatVTON"; $env:HF_ENDPOINT="https://hf-mirror.com"; python .\inference\catvton_server.py

# 数据库
cd apps/backend; npx prisma db push
cd apps/backend; npx tsx prisma/seed.ts

# Docker
docker-compose up -d

# Android 构建
cd apps/mobile; npx react-native run-android
```

## API 端点 (v1)

### 认证
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/auth/refresh` - 刷新 Token
- `GET /api/v1/auth/me` - 当前用户信息

### AI 造型师
- `POST /api/v1/ai-stylist/sessions` - 创建会话
- `GET /api/v1/ai-stylist/sessions` - 会话列表
- `POST /api/v1/ai-stylist/sessions/:id/messages` - 发送消息

### 虚拟试衣
- `GET /api/v1/try-on/history` - 试衣历史
- `POST /api/v1/try-on` - 创建试衣任务

### 推荐
- `GET /api/v1/recommendations` - 获取推荐列表

### 服装
- `GET /api/v1/clothing` - 服装列表
- `GET /api/v1/clothing/categories` - 服装分类

### 用户
- `GET /api/v1/profile` - 用户画像
- `PUT /api/v1/profile` - 更新用户画像

### 健康检查
- `GET /health/live` - 存活探针
- `GET /health/ready` - 就绪探针

## 安全增强 (2026-04-01)

### 认证安全
- **JWT 密钥**: 512-bit 强随机密钥 (已更新)
- **密码加密**: bcrypt 12 轮哈希
- **Token 过期**: 7 天 Access Token + 30 天 Refresh Token

### API 安全
- **限流**: @nestjs/throttler (100 req/min/IP)
- **CORS**: 白名单域名配置
- **Helmet**: 安全头注入

### 数据安全
- **PII 加密**: AES-256-GCM 加密存储 (email, phone)
- **传输加密**: HTTPS/TLS 1.3
- **密钥管理**: 环境变量 + Docker Secrets

## AI 工程化 (2026-04-01)

### RAG 系统
- **检索方式**: 混合检索 (BM25 + 向量)
- **重排序**: Cross-Encoder 重排序
- **评测指标**: RAGAS (Faithfulness, Relevancy, ContextRecall, ContextPrecision)
- **检索指标**: HitRate@K, MRR, NDCG, MAP

### 幻觉检测
- **规则引擎**: 50+ 专业规则 (季节材质、颜色理论、场合着装、体型误区)
- **知识验证**: 服装知识图谱验证
- **LLM 校验**: GLM-5 二次校验

### CatVTON 推理
- **超时控制**: 180s 推理超时 + 重试机制
- **GPU 管理**: 80% VRAM 限制 (防止 OOM)
- **批处理**: 支持批量图像处理

## 法律合规 (2026-04-01)

### 用户协议
- **页面**: `apps/mobile/src/screens/LegalScreen.tsx`
- **路由**: `/TermsOfService`
- **内容**: 服务条款、用户行为规范、知识产权、付费服务

### 隐私政策
- **页面**: `apps/mobile/src/screens/LegalScreen.tsx`
- **路由**: `/PrivacyPolicy`
- **内容**: 信息收集、使用、共享、存储、用户权利

### 合规入口
- **设置页面**: 法律信息 → 用户服务协议 / 隐私政策
- **注册页面**: 勾选同意条款

## 已知关键修复

- **MainApplication.kt**: 使用 `SoLoader.init(this, OpenSourceMergedSoMapping)` + `DefaultReactHost.getDefaultReactHost()` 修复启动崩溃
- **6-Tab 布局**: Home/Explore/Heart/Cart/Wardrobe/Profile
- **代码拆分**: 大文件已拆分至 800 行以内
- **数据库连接**: 使用 `127.0.0.1` 替代 `localhost` 解决 IPv6 连接问题
- **TryOn 轮询超时**: 从 60s 改为 180s (60次 x 3s)
- **docker-compose**: 添加 `CATVTON_ENDPOINT` 环境变量
- **JWT 密钥**: 升级为 512-bit 强随机密钥
- **用户协议**: 添加完整的用户服务协议和隐私政策页面

## 环境要求

- Node.js 20+ (当前 v24)
- pnpm 8+
- Python 3.11+ (ML 服务)
- PyTorch 2.5.1+cu121
- CUDA 12.1+
- Docker 20.10+
- 16GB+ RAM (含模型加载)
- GPU: RTX 4060 8GB VRAM (CatVTON 使用约 4GB)

## 当前状态 (2026-04-01 更新)

### ✅ 已完成
- **前端**: 登录页正常渲染，中文 locale，6-Tab 导航，用户协议/隐私政策页面
- **后端**: Auth/AI-Stylist/Recommendations/Clothing/Try-On API 全部可用，健康检查端点
- **数据库**: stylemind DB 已创建，49 张表，测试用户 test@example.com
- **ML**: CatVTON 虚拟试衣服务运行正常 (端口 8001)，超时控制 + GPU 内存限制
- **LLM**: GLM-5 API 已配置，AI 造型师对话正常
- **移动端**: Android 模拟器运行，Metro Bundler 正常
- **安全**: JWT 强密钥、API 限流、PII 加密
- **AI 工程**: RAG 评测指标、幻觉检测 50+ 规则

### 测试账号
- 邮箱: test@example.com
- 密码: Test123456!

### Demo 验收流程
```
用户打开App → 自动登录 → 看到首页推荐 → 点AI Stylist
→ 输入"面试" → AI返回场合询问 → 选择风格 → 获得推荐
→ 虚拟试衣 → 完成 ✅
```

## 项目健康度评分 (2026-04-01)

| 维度 | 评分 | 状态 |
|------|------|------|
| 代码质量 | 70/100 | 🟡 |
| 安全性 | 85/100 | 🟢 |
| 架构设计 | 75/100 | 🟡 |
| AI 工程化 | 80/100 | 🟢 |
| 数据 | 75/100 | 🟡 |
| 移动端 UX | 72/100 | 🟡 |
| API 设计 | 80/100 | 🟢 |
| DevOps | 82/100 | 🟢 |
| 文档 | 80/100 | 🟢 |
| **综合** | **78/100** | 🟡 |

### 待改进项
- TypeScript `any` 类型: 后端 226 处、移动端 105 处 (技术债务)
- 测试覆盖率: 后端 ~15%、移动端 ~5% (需提升至 60%+)
- 真实数据源: 需接入淘宝/得物 API 替代 Mock 数据

## 硬件约束

- **RTX 4060 只有 8GB VRAM**，CatVTON 使用约 4GB，剩余 4GB
- **IDM-VTON 需要 14GB+**，无法运行，使用 CatVTON 替代
- **xformers 装不上** (版本冲突)，不影响 CatVTON
- **CLIP 加载必须 `use_safetensors=True`**
- **react-native-screens 4.4.0, reanimated 3.16.7, svg 15.8.0 不能升级**

## 竞赛文档

- `delivery/competition/AiNeed_Business_Plan.md` - 商业计划书
- `delivery/competition/AiNeed_Competition_Highlights.md` - 比赛加分项
- `delivery/competition/AiNeed_Demo_Script.md` - 路演脚本
