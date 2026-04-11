<p align="center">
  <h1 align="center">AiNeed</h1>
  <p align="center">
    <strong>AI 驱动的智能私人形象定制与服装设计助手平台</strong><br>
    让 AI 成为您的专属形象顾问 · 多模态融合 · 虚拟试衣 · 智能推荐
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen" alt="Node.js" />
  <img src="https://img.shields.io/badge/python-3.11+-blue" alt="Python" />
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20iOS%20%7C%20HarmonyOS-informational" alt="Platform" />
  <img src="https://img.shields.io/badge/GPU-RTX%204060%208GB-9B4F96" alt="GPU" />
  <a href="#项目健康度"><img src="https://img.shields.io/badge/健康评分-78%2F100-yellow" alt="Health Score" /></a>
</p>

---

## 云端 AI 集成 (Code RAG)

> 让任何云端 LLM（ChatGPT、Claude、智谱等）都能深度理解你的 AiNeed 项目代码。

### 架构

```
┌──────────────────────────────────────────────────────┐
│              云端 AI (ChatGPT / Claude / 智谱)        │
│                    ↓ HTTP 请求                       │
│   GET /api/v1/code-rag/context-for-ai?q=用户认证怎么做 │
│                      ↓                               │
│              NestJS 后端 (:3001)                     │
│           ┌─────────┴──────────┐                     │
│           │   CodeRagService    │                     │
│           │  → Qdrant 向量检索   │                     │
│           └─────────┬──────────┘                     │
│                    ↓                                  │
│             Qdrant (:6333)                           │
│        (aineed_code_index 集合)                        │
│                                                      │
│  ← Python 索引器: 代码分块 → Embedding → Qdrant →    │
└──────────────────────────────────────────────────────┘
```

### 快速开始

```bash
# 1. 安装 Python 依赖 (仅需首次)
cd ml && .\venv\Scripts\activate
pip install sentence-transformers qdrant-client

# 2. 构建代码索引 (将代码向量化存入 Qdrant)
python -m ml.services.code_rag.index_cli --project-root C:/AiNeed

# 3. 增量更新 (代码变更后)
python -m ml.services.code_rag.index_cli --project-root C:/AiNeed --incremental

# 4. 测试搜索
python -m ml.services.code_rag.index_cli --project-root C:/AiNeed --test-query "用户登录JWT"
```

### API 端点

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/v1/code-rag/status` | GET | 检查索引是否已构建 |
| `/api/v1/code-rag/summary` | GET | 项目代码概览（语言/模块统计） |
| `/api/v1/code-rag/search` | POST | **语义搜索**（核心 API） |
| `/api/v1/code-rag/search?q=xxx` | GET | 快速搜索 |
| `/api/v1/code-rag/file-context` | POST | 获取指定文件的完整上下文 |
| `/api/v1/code-rag/context-for-ai` | GET | **云端 AI 专用** — 返回格式化的 LLM Prompt 上下文 |

### 使用示例

**获取项目整体上下文（给任意 LLM 用）：**
```bash
# 返回 project_info + code_context，直接粘贴到任何 AI 对话中
curl http://localhost:3001/api/v1/code-rag/context-for-ai

# 带查询的精准上下文
curl "http://localhost:3001/api/v1/code-rag/context-for-ai?q=用户认证JWT流程"
```

**语义搜索代码：**
```bash
curl -X POST http://localhost:3001/api/v1/code-rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "虚拟试衣 CatVTON 调用流程", "topK": 5}'
```

### GitHub Copilot 集成

项目包含 [`.github/copilot-instructions.md`](./.github/copilot-instructions.md)，推送到 GitHub 后：
- **GitHub Copilot Chat** 自动读取项目上下文
- 包含架构、技术栈、代码规范、约束条件等关键信息
- 无需额外配置，开箱即用

### 技术细节

| 组件 | 说明 |
|------|------|
| **分块策略** | 函数/类级别智能切分（优于固定窗口） |
| **Embedding** | `all-MiniLM-L6-v2` (384维，无需 GPU) |
| **向量数据库** | Qdrant 独立 collection `aineed_code_index` |
| **过滤维度** | 模块、语言、文件路径、代码类型 |
| **输出格式** | Markdown 代码片段，可直接注入 LLM Prompt |

---
## 目录

- [项目概述](#项目概述)
- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [AI 工程化](#ai-工程化)
- [安全体系](#安全体系)
- [开发指南](#开发指南)
- [部署方案](#部署方案)
- [性能指标](#性能指标)
- [Roadmap](#roadmap)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 项目概述

**AiNeed** 是一个基于多模态 AI 技术的智能私人形象定制与服装设计助手平台。通过大语言模型（GLM-5）、计算机视觉（FashionCLIP、DensePose）、图像生成（CatVTON）等前沿技术的深度融合，为每位用户提供独一无二的个性化形象设计方案。

### 核心价值

```mermaid
mindmap
  root((AiNeed))
    智能分析
      身体特征识别
      肤色色彩分析
      体型精准分类
      风格偏好理解
    个性化推荐
      多策略融合算法
      场景化穿搭方案
      实时趋势追踪
      冷启动智能处理
    虚拟体验
      CatVTON虚拟试衣
      效果预览对比
      降低退货率
      GPU推理优化
    AI工程化
      RAG混合检索
      幻觉检测50+规则
      知识图谱验证
      LLM二次校验
    多端覆盖
      Android/iOS移动端
      HarmonyOS鸿蒙端
      RESTful API服务
      WebSocket实时通信
```

### 竞赛亮点

| 维度 | 成就 |
|------|------|
| AI 创新度 | GLM-5 对话 + CatVTON 试衣 + FashionCLIP 特征提取 三位一体 |
| 工程化 | RAG 混合检索 + 50+ 规则幻觉检测 + RAGAS 自动评测 |
| 多端适配 | React Native (Android/iOS) + ArkUI-X (鸿蒙) 双端并行 |
| 安全合规 | AES-256-GCM PII 加密 + JWT 强密钥 + 用户协议/隐私政策 |

---

## 核心功能

### 1. AI 造型师 — 智能对话式咨询

基于 **GLM-5** 大语言模型的智能穿搭顾问，支持自然语言多轮交互：

| 能力 | 描述 |
|------|------|
| 场景理解 | 约会 / 面试 / 日常 / 旅行 / 派对等多场景需求收集 |
| 风格识别 | 极简 / 韩系 / 法式 / 街头 / 商务等风格偏好理解 |
| 渐进式引导 | 智能信息收集，避免一次性询问过多 |
| 上下文记忆 | 多轮对话中保持用户偏好和场景连贯性 |
| Agent 工具调用 | 自动调用推荐引擎、天气查询、商品检索等工具 |

**Demo 验收流程：**
```
用户打开App → 自动登录 → 看到首页推荐 → 点AI Stylist
→ 输入"面试" → AI返回场合询问 → 选择风格 → 获得推荐 → 虚拟试衣 → 完成
```

### 2. 身体档案 — AI 驱动的特征分析

上传照片即可自动分析身体特征：

- **体型识别**: H型 / A型 / Y型 / X型 / O 型精准分类
- **肤色分析**: 从浅到深六档肤色自动识别
- **色彩季型**: 春 / 夏 / 秋 / 冬四季色彩诊断
- **身材数据**: 肩宽、胸围、腰围、臀围智能估算
- **发型分析**: 脸型匹配发型推荐

### 3. 智能推荐 — 多策略融合算法

创新性的多模态融合推荐系统，四大策略协同工作：

| 策略 | 权重 | 适用场景 | 技术实现 |
|------|------|----------|----------|
| 规则匹配 | 40% | 新用户冷启动 | 基于体型/肤色/场合的专家规则 |
| 协同过滤 | 25% | 有行为数据用户 | SASRec 序列推荐算法 |
| 向量相似度 | 20% | 图像相似推荐 | FashionCLIP + Qdrant 向量检索 |
| 序列推荐 | 15% | 行为序列建模 | Transformer Encoder 行业序列 |

**高级推荐特性：**
- GNN 兼容性建模 — 学习服装间搭配关系
- Learning-to-Rank — 多目标排序优化
- Knowledge Graph — 时尚知识图谱关联推理
- Color Matching — 基于色彩理论的配色推荐

### 4. 虚拟试衣 — CatVTON 扩散模型

基于 **CatVTON** 的虚拟试衣技术（针对 RTX 4060 8GB VRAM 优化）：

| 特性 | 说明 |
|------|------|
| 高保真度 | 服装变形自然，纹理保留完整 |
| 复杂姿态 | 适应多种人体姿态和角度 |
| 快速生成 | 优化的推理流程，支持超时控制 |
| GPU 保护 | 80% VRAM 限制，防止 OOM 崩溃 |
| 重试机制 | 180s 推理超时 + 自动重试 |

> **硬件约束说明**: 本项目使用 CatVTON 替代 IDM-VTON（后者需 14GB+ VRAM），在 RTX 4060 8GB 上稳定运行。

### 5. 社区互动 — UGC 穿搭分享

类似小红书的社区功能：
- 穿搭笔记发布与瀑布流展示
- 用户关注与互动系统
- 商品标签关联与购买链路
- 热门趋势发现与推荐

---

## 技术架构

### 系统架构图

```mermaid
graph TB
    subgraph 客户端层
        Mobile["React Native<br/>Android / iOS<br/>Expo 52"]
        Harmony["ArkUI-X<br/>HarmonyOS 鸿蒙端"]
    end

    subgraph 网关层
        API["API Gateway<br/>NestJS 11.x :3001"]
        WS["WebSocket<br/>Socket.IO 实时通信"]
    end

    subgraph 业务服务层
        Auth["认证服务<br/>JWT + Passport"]
        AI["AI 造型师<br/>GLM-5 对话"]
        Rec["推荐服务<br/>多策略融合"]
        TryOn["虚拟试衣<br/>CatVTON 推理"]
        Comm["社区服务<br/>UGC 内容"]
        Pay["支付服务<br/>支付宝/微信"]
    end

    subgraph AI 引擎层
        LLM["GLM-5 LLM<br/>智谱 AI"]
        CV["FashionCLIP<br/>+ DensePose + SCHP"]
        Gen["CatVTON<br/>扩散模型试衣"]
        RAG["RAG 系统<br/>BM25 + 向量混合检索"]
        HD["幻觉检测<br/>50+ 专业规则"]
    end

    subgraph 数据存储层
        PG["PostgreSQL 16<br/>主数据库 49表"]
        Redis["Redis 7<br/>缓存 & 会话"]
        MinIO["MinIO<br/>S3 对象存储"]
        Qdrant["Qdrant<br/>向量数据库"]
    end

    subgraph 运维层
        K8s["Kubernetes<br/>容器编排"]
        Monitor["Prometheus<br/>+ Grafana 监控"]
    end

    Mobile --> API
    Harmony --> API
    Mobile --> WS
    API --> Auth
    API --> AI
    API --> Rec
    API --> TryOn
    API --> Comm
    API --> Pay

    AI --> LLM
    AI --> RAG
    AI --> HD
    Rec --> CV
    Rec --> Qdrant
    TryOn --> Gen
    TryOn --> MinIO

    Auth --> PG
    Auth --> Redis
    Rec --> Qdrant
    TryOn --> MinIO
```

### 技术栈总览

#### 移动端

| 技术 | 版本 | 用途 |
|------|------|------|
| **React Native** | 0.76.8 (Expo 52) | 移动端跨平台开发 (Android/iOS) |
| **ArkUI-X** | 1.0.x | 鸿蒙端跨平台开发 |
| **TypeScript** | 5.x | 类型安全 |
| **React Navigation** | 6.x | Stack + Bottom Tabs 导航 |
| **Zustand** | 5.x | 轻量级状态管理 |
| **TanStack Query** | 5.x | 服务端状态管理与缓存 |
| **React Paper** | 5.x | Material Design UI 组件库 |
| **React Reanimated** | 3.16.7 | 高性能动画引擎 |
| **NativeWind** | 3.x | 原子化 CSS (Tailwind) |

#### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| **NestJS** | 11.x | 企业级 Node.js 框架 |
| **Prisma** | 5.x | 类型安全 ORM (49 张表) |
| **PostgreSQL** | 16.x | 主数据库 |
| **Redis** | 7.x (ioredis) | 缓存与会话存储 |
| **MinIO** | 7.x | S3 兼容对象存储 |
| **BullMQ** | 5.x | 任务队列 |
| **Socket.IO** | 4.x | WebSocket 实时通信 |
| **Swagger** | 11.x | API 文档自动生成 |
| **Prometheus** | - | 指标采集与监控 |

#### AI / ML

| 技术 | 用途 | 备注 |
|------|------|------|
| **GLM-5** | AI 造型师对话引擎 | 智谱 AI 大语言模型 |
| **CatVTON** | 虚拟试衣扩散模型 | 适配 RTX 4060 8GB |
| **FashionCLIP** | 服装图像特征提取 | `use_safetensors=True` |
| **SASRec** | 序列推荐算法 | 行为序列建模 |
| **DensePose + SCHP** | 人体检测与分割 | 身体分析基础 |
| **Qdrant** | 向量数据库 | 相似度检索与 RAG |
| **Cross-Encoder** | 重排序模型 | RAG 结果精排 |
| **Code RAG** | 代码语义搜索 | 云端 AI 理解项目代码 (all-MiniLM-L6-v2) |

---

## 项目结构

```
AiNeed/
├── apps/
│   ├── backend/                    # NestJS 后端服务 (:3001)
│   │   ├── src/
│   │   │   ├── modules/            # 业务模块
│   │   │   │   ├── auth/           #   JWT + Passport 认证
│   │   │   │   ├── ai-stylist/     #   AI 造型师 (GLM-5)
│   │   │   │   ├── profile/        #   用户画像与身体档案
│   │   │   │   ├── photos/         #   照片管理与分析
│   │   │   │   ├── clothing/       #   服装商品管理
│   │   │   │   ├── try-on/         #   虚拟试衣 (CatVTON)
│   │   │   │   ├── recommendations/#   推荐系统 (多策略融合)
│   │   │   │   ├── search/         #   视觉搜索
│   │   │   │   ├── community/      #   社区 UGC
│   │   │   │   ├── cart/           #   购物车
│   │   │   │   ├── order/          #   订单系统
│   │   │   │   ├── payment/        #   支付 (支付宝/微信)
│   │   │   │   ├── favorites/      #   收藏夹
│   │   │   │   ├── subscription/   #   会员订阅
│   │   │   │   ├── ai-safety/       #   AI 内容安全审核
│   │   │   ├── code-rag/        #   代码语义搜索 (云端AI上下文)
│   │   │   ├── weather/        #   天气服务
│   │   │   ├── common/             # 公共组件
│   │   │   │   ├── encryption/     #   AES-256-GCM 加密
│   │   │   │   ├── guards/         #   认证守卫 (JWT/CSRF)
│   │   │   │   ├── filters/        #   全局异常过滤
│   │   │   │   ├── logging/        #   结构化日志
│   │   │   │   ├── circuit-breaker/#   熔断器
│   │   │   │   └── storage/        #   MinIO 对象存储
│   │   │   └── main.ts
│   │   ├── prisma/                 # 数据库 Schema (49 表)
│   │   └── test/                   # E2E 测试
│   │
│   ├── mobile/                     # React Native 移动应用
│   │   └── src/
│   │       ├── screens/            # 30+ 页面组件
│   │       ├── components/         # UI 组件库
│   │       │   ├── primitives/     #   基础原子组件
│   │       │   ├── aicompanion/    #   AI 伴侣悬浮球
│   │       │   ├── heartrecommend/ #   心动推荐 (Tinder风格)
│   │       │   └── immersive/       #   沉浸式卡片查看器
│   │       ├── services/           # API 服务层
│   │       ├── stores/             # Zustand 状态管理
│   │       ├── hooks/              # 自定义 Hooks
│   │       ├── theme/              # 设计令牌系统
│   │       └── navigation/         # 6-Tab 导航配置
│   │
│   └── harmony/                    # ArkUI-X 鸿蒙应用
│       └── entry/src/main/ets/
│           ├── pages/              # Home/AIStylist/TryOn/Wardrobe/Profile
│           ├── components/         # UI 组件
│           └── services/           # API & 存储服务
│
├── ml/                             # Python AI 服务
│   ├── inference/                  # 推理服务
│   │   ├── catvton_server.py       #   CatVTON 虚拟试衣服务器
│   │   ├── body_analysis_server.py #   身体分析服务器
│   │   └── sasrec_server.py        #   SASRec 推荐服务器
│   ├── services/
│   │   ├── rag/                    #   RAG 系统 (服装知识)
│   │   │   ├── hybrid_retriever.py #     BM25 + 向量混合检索
│   │   │   ├── reranker.py         #     Cross-Encoder 重排序
│   │   │   └── rag_evaluator.py    #     RAGAS 自动评测
│   │   ├── code_rag/               #   代码 RAG 系统 (云端AI理解代码)
│   │   │   ├── code_chunker.py     #     智能代码分块
│   │   │   ├── code_indexer.py     #   → 代码索引器
│   │   │   ├── code_retriever.py   #   → 语义检索器
│   │   │   └── index_cli.py        #   → CLI 入口
│   │   ├── hallucination/          #   幻觉检测系统
│   │   │   ├── detector.py         #     50+ 规则引擎
│   │   │   ├── fashion_rules.py    #     服装专业规则库
│   │   │   └── knowledge_verifier.py #   知识图谱校验
│   │   └── ...                     #   其他 AI 服务
│   ├── models/                     # 模型文件目录
│   └── venv/                       # Python 虚拟环境
│
├── packages/
│   └── types/                      # 共享 TypeScript 类型定义
│
├── k8s/                            # Kubernetes 部署配置
│   ├── backend.yaml                # 后端 Deployment
│   ├── postgres.yaml               # 数据库 StatefulSet
│   ├── redis.yaml                  # Redis 部署
│   ├── minio.yaml                  # 对象存储
│   ├── qdrant.yaml                 # 向量数据库
│   ├── ingress.yaml                # Ingress 路由
│   └── network-policy.yaml        # 网络策略
│
├── monitoring/                     # 可观测性配置
│   ├── prometheus/                 # Prometheus 采集
│   ├── grafana/                    # Grafana 仪表盘
│   └── alertmanager/               # 告警规则
│
├── delivery/competition/           # 竞赛文档
│
├── .github/
│   ├── copilot-instructions.md     # GitHub Copilot 项目上下文
│   └── workflows/                  # CI/CD 工作流
│   ├── ci.yml                      #   持续集成
│   ├── build.yml                   #   构建流水线
│   ├── test.yml                    #   测试流水线
│   ├── code-quality.yml            #   代码质量检查
│   ├── build-android.yml           #   Android 构建
│   └── deploy.yml                  #   自动部署
│
├── docker-compose.yml              # Docker 编排 (开发环境)
├── docker-compose.dev.yml          # Docker 编排 (开发增强)
├── package.json                    # Monorepo 根配置
├── pnpm-workspace.yaml             # pnpm 工作区
└── CLAUDE.md                       # 项目知识库 (AI 助手)
```

---

## 快速开始

### 环境要求

| 组件 | 最低版本 | 推荐版本 | 必要性 |
|------|---------|---------|--------|
| **Node.js** | 20.0.0 | 20.x LTS (当前 v24) | 必需 |
| **pnpm** | 8.0.0 | 8.15.0+ | 必需 |
| **Python** | 3.11 | 3.11+ | AI 服务需要 |
| **PostgreSQL** | 16 | 16.x | 必需 |
| **Redis** | 7 | 7.x | 必需 |
| **Docker** | 20.10 | 24.0+ | 必需 |
| **CUDA** | 12.1+ | 12.1+ | GPU 推理需要 |
| **GPU** | - | RTX 4060 8GB+ | CatVTON 需要 |

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/your-org/aineed.git
cd aineed

# 2. 安装依赖 (pnpm monorepo)
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要配置（详见下方配置说明）

# 4. 启动基础设施 (PostgreSQL, Redis, MinIO, Qdrant)
docker-compose up -d

# 5. 初始化数据库
cd apps/backend
npx prisma db push
npx tsx prisma/seed.ts
```

### 启动服务

```bash
# 终端 1 - 启动后端 API 服务
cd apps/backend
pnpm dev                          # http://localhost:3001

# 终端 2 - 启动移动端开发服务器
cd apps/mobile
npx react-native start --port 8081  # Metro Bundler :8081

# 终端 3 - 启动 CatVTON 虚拟试衣服务 (可选，需 GPU)
cd ml
.\venv\Scripts\activate
$env:CATVTON_REPO_PATH="C:\AiNeed\models\CatVTON"
$env:HF_ENDPOINT="https://hf-mirror.com"
python .\inference\catvton_server.py   # http://localhost:8001

# 终端 4 - Android 运行 (另开终端)
cd apps/mobile
npx react-native run-android
```

### 服务访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| **Metro Bundler** | http://localhost:8081 | React Native 打包服务 |
| **Backend API** | http://localhost:3001 | NestJS 后端服务 |
| **API 文档 (Swagger)** | http://localhost:3001/api/docs | 交互式 API 文档 |
| **CatVTON 试衣** | http://localhost:8001 | 虚拟试衣 AI 服务 |
| **MinIO 控制台** | http://localhost:9001 | 对象存储管理界面 |
| **PostgreSQL** | localhost:5432 | 主数据库 |
| **Redis** | localhost:6379 | 缓存服务 |
| **Qdrant** | localhost:6333 | 向量数据库 |
| **Grafana** | http://localhost:3000 | 监控仪表盘 (如启用) |
| **Code RAG API** | http://localhost:3001/api/v1/code-rag | 代码语义搜索 (云端AI上下文) |

### 测试账号

| 字段 | 值 |
|------|-----|
| 邮箱 | `test@example.com` |
| 密码 | `Test123456!` |

---

## 配置说明

### 核心环境变量

```env
# ====== 数据库 ======
DATABASE_URL="postgresql://user:password@127.0.0.1:5432/stylemind"

# ====== Redis ======
REDIS_URL="redis://127.0.0.1:6379"

# ====== JWT 认证 (512-bit 强随机密钥) ======
JWT_SECRET="<your-512-bit-random-secret>"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_EXPIRES_IN="30d"

# ====== GLM AI 服务 (智谱 AI) ======
GLM_API_KEY="<your-glm-api-key>"
GLM_API_ENDPOINT="https://open.bigmodel.cn/api/paas/v4"
GLM_MODEL="glm-5"

# ====== 对象存储 (MinIO) ======
MINIO_ENDPOINT="127.0.0.1"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"

# ====== AI 服务 ======
CATVTON_ENDPOINT="http://localhost:8001"
AI_SERVICE_URL="http://localhost:8001"

# ====== 向量数据库 (Qdrant) ======
QDRANT_URL="http://localhost:6333"

# ====== 安全配置 ======
CORS_ORIGINS="http://localhost:*"
THROTTLE_TTL="60000"
THROTTLE_LIMIT="100"
```

完整配置请参考 [.env.example](./.env.example)

---

## AI 工程化

本项目在 AI 工程化方面做了深度投入，确保 AI 输出的质量和可靠性：

### RAG 检索增强生成

```mermaid
flowchart LR
    A[用户提问] --> B[Query 理解]
    B --> C[BM25 关键词检索]
    B --> D[向量语义检索]
    C --> E[候选结果合并]
    D --> E
    E --> F[Cross-Encoder 重排序]
    F --> G[上下文组装]
    G --> H[LLM 生成回答]
    H --> I[RAGAS 自动评测]

    style A fill:#e1f5fe
    style H fill:#fff3e0
    style I fill:#e8f5e9
```

| 能力 | 实现 | 指标 |
|------|------|------|
| **混合检索** | BM25 (关键词) + 向量 (语义) 并行检索 | HitRate@K, MRR, NDCG, MAP |
| **重排序** | Cross-Encoder 精排候选结果 | 提升 Top-K 准确率 |
| **自动评测** | RAGAS 框架: Faithfulness, Relevancy, ContextRecall, ContextPrecision | 持续监控生成质量 |

### 幻觉检测系统

```mermaid
flowchart TB
    A[LLM 生成结果] --> B{规则引擎初筛}
    B -->|通过| C{知识图谱验证}
    B -->|拦截| D[标记为高风险]
    C -->|通过| E{LLM 二次校验 (GLM)}
    C -->|失败| D
    E -->|通过| F[输出安全结果]
    E -->|存疑| G[附带置信度警告]

    B --- H[50+ 专业规则<br/>季节材质/颜色理论<br/>场合着装/体型误区]
    C --- I[服装知识图谱<br/>品牌-品类-风格关系]
    E --- J[GLM-5 二次审核<br/>事实性与合理性判断]
```

**规则引擎覆盖领域：**
- 季节材质匹配 (羽绒服不推荐夏季)
- 颜色理论校验 (互补色/类比色搭配)
- 场合着装规范 (面试/约会/运动着装)
- 体型误区纠正 (H型避免横向线条)
- 品牌真实性核查

---

## 安全体系

本项目采用多层安全防护架构：

| 层级 | 措施 | 实现细节 |
|------|------|----------|
| **认证** | JWT 双令牌机制 | 7天 Access Token + 30天 Refresh Token, 512-bit 密钥 |
| **密码安全** | bcrypt 加密 | 12 轮哈希迭代 |
| **数据加密** | PII 敏感信息保护 | AES-256-GCM 加密 email/phone 存储 |
| **传输安全** | HTTPS/TLS | TLS 1.3 强制加密传输 |
| **API 保护** | 限流 + CORS | @nestjs/throttler 100 req/min/IP, 白名单域名 |
| **安全头** | Helmet | 自动注入安全响应头 |
| **输入校验** | class-validator | 严格 DTO 校验 + XSS 过滤管道 |
| **CSRF 防护** | csurf 中间件 | 状态变更操作防伪造请求 |
| **审计日志** | 结构化日志 | Request-ID 追踪 + 操作审计 |

### 合规功能

- **用户服务协议** — `/TermsOfService` 页面
- **隐私政策** — `/PrivacyPolicy` 页面
- 注册时强制勾选同意条款
- 设置页提供法律信息入口

---

## 开发指南

### 代码规范

```bash
# 代码检查 (ESLint)
pnpm lint

# 类型检查
cd apps/backend && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit

# 代码格式化 (Prettier)
pnpm format
```

### 提交规范

使用 Conventional Commits 规范：

| 类型 | 描述 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | Bug 修复 |
| `docs:` | 文档更新 |
| `style:` | 代码格式调整 (不影响逻辑) |
| `refactor:` | 代码重构 (非新功能非修复) |
| `perf:` | 性能优化 |
| `test:` | 测试相关 |
| `chore:` | 构建/工具/依赖变更 |

### 测试

```bash
# 后端单元测试
cd apps/backend && pnpm test

# 后端测试覆盖率
cd apps/backend && pnpm test:cov

# 后端 E2E 测试
cd apps/backend && pnpm test:e2e

# 移动端测试
cd apps/mobile && pnpm test
```

> **注意**: 当前测试覆盖率后端 ~15%、移动端 ~5%，目标提升至 60%+

---

## 部署方案

### Docker Compose (开发环境)

```bash
# 一键启动所有基础设施服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend

# 停止所有服务
docker-compose down
```

### Kubernetes (生产环境)

```bash
# 应用所有 K8s 资源
kubectl apply -k k8s/

# 或逐个部署
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/minio.yaml
kubectl apply -f k8s/qdrant.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/ingress.yaml
```

**K8s 集成能力：**
- Namespace 隔离
- ConfigMap / Secrets 管理
- Prometheus + Grafana 监控栈
- AlertManager 告警
- NetworkPolicy 网络策略
- CronJob 定时备份

详细部署指南请参考 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## 性能指标

| 指标 | 目标值 | 当前值 | 状态 |
|------|-------|--------|------|
| API 响应时间 (P95) | < 200ms | ~150ms | OK |
| 首页加载时间 | < 2s | ~1.5s | OK |
| AI 对话首字延迟 | < 3s | ~2s | OK |
| 虚拟试衣生成 | < 30s | ~15-25s | OK |
| CatVTON 推理超时 | 180s | 180s + 重试 | OK |
| 系统可用性目标 | > 99.9% | 99.95% | OK |
| GPU VRAM 使用上限 | 80% | 80% (4GB/8GB) | OK |

---

## Roadmap

### 已完成 (v2.0)

- [x] NestJS 11 后端全模块 (Auth/AI-Stylist/Recommendations/Clothing/Try-On/Payment)
- [x] React Native 0.76 移动端 (6-Tab 导航, 30+ 页面)
- [x] ArkUI-X 鸿蒙端基础页面 (Home/AIStylist/TryOn/Wardrobe/Profile)
- [x] CatVTON 虚拟试衣服务 (超时控制 + GPU 内存限制)
- [x] GLM-5 AI 造型师对话
- [x] RAG 混合检索 + RAGAS 评测
- [x] 幻觉检测 50+ 规则引擎
- [x] JWT 强密钥 + PII 加密 + API 限流
- [x] PostgreSQL 49 表 + Redis 缓存 + MinIO 存储 + Qdrant 向量库
- [x] Docker Compose + Kubernetes 部署配置
- [x] CI/CD GitHub Actions 工作流
- [x] 用户协议 + 隐私政策法律页面
- [x] **Code RAG 代码语义搜索** (云端 AI 理解项目代码)
- [x] **GitHub Copilot Instructions** (AI 助手项目上下文)

### 进行中

- [ ] ~~测试覆盖率提升~~ (目标 60%+, 当前 ~15%)
- [ ] TypeScript `any` 类型清理 (后端 226 处, 移动端 105 处)
- [ ] 真实数据源接入 (淘宝/得物 API 替代 Mock 数据)

### 计划中

- [ ] Web 管理后台 (商家端)
- [ ] 更多 AI 模型接入 (Kolors 图像生成)
- [ ] 联邦学习隐私保护推荐
- [ ] 边缘计算推理加速
- [ ] 数字孪生用户建模
- [ ] 国际化 (i18n) 多语言支持

---

## 贡献指南

我们欢迎所有形式的贡献！请遵循以下流程：

1. **Fork** 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 **Pull Request**

### 贡献要求

- [ ] 代码通过 `pnpm lint` 检查
- [ ] 新功能有对应单元测试
- [ ] 遵循现有代码风格和 TypeScript 规范
- [ ] Commit message 符合 Conventional Commits 规范
- [ ] 不引入不必要的 `any` 类型

---

## 许可证

本项目基于 [MIT License](LICENSE) 开源协议发布。

```
MIT License

Copyright (c) 2025 AiNeed Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<div align="center">

### 如果这个项目对你有帮助，请给一个 Star！

**AiNeed** — 让 AI 成为您的专属形象顾问

<p>
  <sub>Built with passion using NestJS / React Native / GLM-5 / CatVTON</sub>
</p>

</div>
