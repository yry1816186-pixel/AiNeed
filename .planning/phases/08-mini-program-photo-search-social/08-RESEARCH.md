# Phase 8: Mini Program + Photo Search + Social - Research

**Researched:** 2026-04-25
**Domain:** WeChat Mini Program (Taro 4), Image Vector Search (FashionSigLIP + Qdrant), Style DNA Social Matching
**Confidence:** MEDIUM-HIGH

## Summary

Phase 8 交付三个独立但相互关联的能力：(1) 微信小程序 v1，基于 Taro 4 + React 复用现有后端 API；(2) 拍照识图找同款，利用已有的 FashionSigLIP EmbeddingService + Qdrant 向量库实现端到端拍照->编码->检索->展示管道；(3) 风格 DNA 社交匹配，基于用户 FashionSigLIP 向量画像做余弦相似度匹配。

核心发现：**后端基础设施已完备**。WechatService 已实现 wx.login code 换 openid/unionid 逻辑；User 模型已有 wechatOpenId/wechatUnionId 字段；EmbeddingService 已有 encode_image 方法；QdrantService 已有 searchSimilar 方法；SearchService.searchByImage 已有完整的图片搜索降级链（ML 向量搜索 -> 属性搜索 -> 热门兜底）。**新增工作集中在 Taro 小程序端和 ML API 图像端点的暴露**。

**Primary recommendation:** Taro 4 + React 构建小程序前端（与现有 React Native 技术栈共享 React 知识），新增 Python FastAPI `/api/vector/search/image` 端点暴露图像嵌入+检索能力，新增 Qdrant `user_style_dna` collection 存储用户风格向量用于社交匹配。

<phase_requirements>

## Phase Requirements

| ID      | Description                                                      | Research Support                                                                                                               |
| ------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| MINI-01 | 微信小程序 v1（核心功能：伊伊对话+试穿+分享）                    | Taro 4.2.0 + React 构建小程序；复用后端 /dialog、/tryon、/recommendations API；小程序包体管理需分包                            |
| MINI-02 | 小程序分享到朋友圈/群（裂变零摩擦）                              | Taro useShareAppMessage + useShareTimeline hooks；需 enableShareAppMessage/enableShareTimeline 页面配置                        |
| PHO-01  | 拍照 -> FashionSigLIP 编码 -> Qdrant 向量检索 -> 展示 5 个相似款 | EmbeddingService.encode_image 已实现；需新增 FastAPI image embed endpoint + Qdrant image search endpoint；Taro.chooseImage API |
| PHO-02  | 找到同款后自然引导 "AI 帮你搭更好的" -> 注册转化                 | 纯 UI/UX 流程设计；搜索结果页底部 CTA 按钮；微信登录一键注册                                                                   |
| SOC-01  | 风格 DNA 社交匹配（基于向量的"和你风格最像的人"推荐）            | 新增 Qdrant user_style_vectors collection；用户行为向量聚合；余弦相似度 top-K 匹配                                             |

</phase_requirements>

## Architectural Responsibility Map

| Capability         | Primary Tier                      | Secondary Tier                | Rationale                                                     |
| ------------------ | --------------------------------- | ----------------------------- | ------------------------------------------------------------- |
| 微信小程序 UI 渲染 | Browser/Client (WeChat WebView)   | --                            | 小程序运行在微信沙箱环境，Taro 编译为 WXML/WXSS               |
| 小程序分享裂变     | Browser/Client                    | API/Backend (分享追踪)        | 分享 API 是客户端能力；后端记录分享归因                       |
| 拍照 + 图片上传    | Browser/Client (Taro.chooseImage) | API/Backend (接收上传)        | 小程序端选图，上传到后端/MinIO                                |
| 图片向量编码       | API/Backend (Python FastAPI)      | --                            | FashionSigLIP 推理在 GPU 服务器执行                           |
| 向量相似度检索     | Database/Storage (Qdrant)         | --                            | Qdrant 管理向量索引和 COSINE 搜索                             |
| 用户风格 DNA 向量  | Database/Storage (Qdrant)         | API/Backend (聚合逻辑)        | 用户行为向量存储在 Qdrant，后端负责聚合计算                   |
| 风格社交匹配       | API/Backend                       | Database/Storage (Qdrant)     | 后端编排：查用户向量 -> Qdrant top-K 搜索 -> 返回匹配用户列表 |
| 微信登录           | API/Backend (WechatService)       | Database/Storage (PostgreSQL) | code->openid 在后端完成，User 表存储 wechatOpenId             |

## Standard Stack

### Core

| Library            | Version        | Purpose                    | Why Standard                                                      |
| ------------------ | -------------- | -------------------------- | ----------------------------------------------------------------- |
| @tarojs/taro       | 4.2.0          | 跨端框架，编译到微信小程序 | [VERIFIED: npm registry] 最新稳定版，React 语法，成熟生态         |
| @tarojs/cli        | 4.2.0          | Taro 脚手架与构建工具      | [VERIFIED: npm registry] 与 taro 核心版本对齐                     |
| @tarojs/components | 4.2.0          | Taro 跨端 UI 组件          | [VERIFIED: npm registry] View, Text, Image, ScrollView 等基础组件 |
| @tarojs/runtime    | 4.2.0          | Taro React 运行时          | [VERIFIED: npm registry] React 在小程序环境的运行时适配           |
| zustand            | 4.x (existing) | 状态管理                   | [ASSUMED] 项目已使用 Zustand，小程序端复用相同模式                |
| qdrant-client      | 1.17.1         | Python Qdrant 客户端       | [VERIFIED: pip registry] 已安装在项目中                           |

### Supporting

| Library             | Version | Purpose                      | When to Use                                                          |
| ------------------- | ------- | ---------------------------- | -------------------------------------------------------------------- |
| taro-ui             | 3.3.1   | Taro UI 组件库               | [VERIFIED: npm registry] 小程序端快速搭建 UI，含 Button/Form/Card 等 |
| @tarojs/plugin-html | 4.2.0   | 支持 HTML 标签在小程序中渲染 | 当需要复用 Web 端组件时                                              |
| react               | 18.x    | UI 库                        | [ASSUMED] Taro 4 支持 React 18                                       |

### Alternatives Considered

| Instead of   | Could Use                 | Tradeoff                                                                    |
| ------------ | ------------------------- | --------------------------------------------------------------------------- |
| Taro + React | uni-app + Vue             | uni-app 生态更大但 Vue 语法栈与项目 React RN 不匹配；Taro 保持 React 一致性 |
| Taro + React | 原生微信小程序开发        | 原生开发包体更小性能更好，但无法复用 React 知识和组件逻辑                   |
| taro-ui      | NutUI (@nutui/nutui-taro) | NutUI 功能更丰富但版本 4.3.15-beta.1 不稳定；taro-ui 3.3.1 是正式稳定版     |
| taro-ui      | 自定义组件                | 更灵活但开发成本高，v1 优先速度                                             |

**Installation:**

```bash
# 小程序项目初始化
npx @tarojs/cli init apps/mini-program --template react-ts
cd apps/mini-program
pnpm add zustand taro-ui
```

**Version verification:**

- @tarojs/taro: 4.2.0 [VERIFIED: npm registry, 2026-04-25]
- @tarojs/cli: 4.2.0 [VERIFIED: npm registry, 2026-04-25]
- @tarojs/components: 4.2.0 [VERIFIED: npm registry, 2026-04-25]
- qdrant-client: 1.17.1 [VERIFIED: pip, INSTALLED in project]
- taro-ui: 3.3.1 [VERIFIED: npm registry, 2026-04-25]

## Architecture Patterns

### System Architecture Diagram

```
                    WeChat Ecosystem
                    ┌─────────────────────────────────┐
                    │   WeChat Mini Program Client     │
                    │   (Taro 4 + React)               │
                    │                                  │
                    │  ┌──────────┐  ┌──────────────┐  │
                    │  │  Chat UI  │  │ Photo Search  │  │
                    │  │  (Yiyi)   │  │   Camera      │  │
                    │  └─────┬─────┘  └──────┬───────┘  │
                    │        │               │          │
                    │  ┌─────┴─────┐  ┌──────┴───────┐  │
                    │  │  Share    │  │ Image Upload  │  │
                    │  │ Moments/  │  │  Taro.upload  │  │
                    │  │  Groups   │  │               │  │
                    │  └─────┬─────┘  └──────┬───────┘  │
                    └────────┼───────────────┼──────────┘
                             │               │
              wx.login(code) │               │ Taro.uploadFile
              /api/v1/dialog │               │ /api/v1/search/image
                             │               │
                    ┌────────▼───────────────▼──────────┐
                    │   NestJS Backend (port 3001)       │
                    │                                    │
                    │  ┌─────────────┐  ┌──────────────┐ │
                    │  │ AuthModule  │  │ SearchModule │ │
                    │  │ WechatLogin │  │  PhotoSearch │ │
                    │  └──────┬──────┘  └──────┬───────┘ │
                    │         │                │         │
                    │  ┌──────┴──────┐  ┌──────┴───────┐ │
                    │  │ DialogModule│  │ SocialModule │ │
                    │  │  (Yiyi Chat)│  │  StyleDNA    │ │
                    │  └──────┬──────┘  └──────┬───────┘ │
                    └─────────┼────────────────┼─────────┘
                              │                │
                    ┌─────────▼────────────────▼─────────┐
                    │   Python FastAPI (ML Service)       │
                    │                                     │
                    │  ┌──────────────────┐               │
                    │  │ EmbeddingService  │               │
                    │  │ encode_image()    │──────┐       │
                    │  │ encode_text()     │      │       │
                    │  └──────────────────┘      │       │
                    │                            │       │
                    │  ┌──────────────────┐      │       │
                    │  │ Vector Search     │◄─────┘       │
                    │  │ /api/vector/search│              │
                    │  └─────────┬────────┘              │
                    └────────────┼────────────────────────┘
                                 │
                    ┌────────────▼────────────────────────┐
                    │   Qdrant (port 6333)                │
                    │                                     │
                    │  ┌────────────────┐ ┌─────────────┐ │
                    │  │ clothing_items  │ │ user_style_  │ │
                    │  │ (fashion vectors│ │ dna (user    │ │
                    │  │  1152-dim)      │ │  vectors)    │ │
                    │  └────────────────┘ └─────────────┘ │
                    └─────────────────────────────────────┘
```

### Recommended Project Structure

```
apps/
├── mini-program/           # Taro 4 微信小程序项目（新增）
│   ├── config/             # Taro 构建配置
│   │   ├── index.ts        # 主配置（API base URL, 编译选项）
│   │   ├── dev.ts          # 开发环境
│   │   └── prod.ts         # 生产环境
│   ├── src/
│   │   ├── app.config.ts   # 小程序全局配置（pages, tabBar, subPackages）
│   │   ├── app.tsx         # 入口文件
│   │   ├── app.scss        # 全局样式（XUNO 设计 token）
│   │   ├── pages/
│   │   │   ├── index/      # 首页（拍照入口 + 快速对话）
│   │   │   ├── chat/       # 伊伊对话页
│   │   │   ├── search/     # 拍照搜索结果页
│   │   │   ├── profile/    # 个人中心（微信登录）
│   │   │   └── social/     # 风格 DNA 匹配页
│   │   ├── components/     # 通用组件
│   │   │   ├── YiyiAvatar/
│   │   │   ├── ProductCard/
│   │   │   └── PhotoCapture/
│   │   ├── services/       # API 调用封装
│   │   │   ├── request.ts  # Taro.request 封装（JWT, 错误处理）
│   │   │   ├── auth.ts     # 微信登录
│   │   │   ├── dialog.ts   # 对话 API
│   │   │   ├── search.ts   # 图片搜索 API
│   │   │   └── social.ts   # 风格匹配 API
│   │   ├── store/          # Zustand stores
│   │   └── utils/          # 工具函数
│   ├── project.config.json # 微信开发者工具配置（appid）
│   └── package.json
├── backend/                # NestJS 后端（已有，扩展）
└── mobile/                 # React Native（已有）
```

### Pattern 1: 微信小程序登录流程

**What:** wx.login 获取临时 code -> 后端换 openid -> JWT 签发
**When to use:** 小程序首次打开、登录态过期
**Example:**

```typescript
// Source: Taro Context7 docs + 项目 WechatService 分析
import Taro from "@tarojs/taro";

// 小程序端
async function wechatLogin() {
  const { code } = await Taro.login();
  const res = await Taro.request({
    url: `${API_BASE}/api/v1/auth/wechat-mini`,
    method: "POST",
    data: { code },
  });
  // 存储 JWT
  Taro.setStorageSync("access_token", res.data.accessToken);
  return res.data;
}

// 后端已有 WechatService.getAccessToken(code)
// 需新增 MiniProgram 登录端点（区别于开放平台 OAuth）
// 小程序用 jscode2session API:
// GET https://api.weixin.qq.com/sns/jscode2session?
//   appid=APPID&secret=SECRET&js_code=CODE&grant_type=authorization_code
```

### Pattern 2: 图片向量搜索管道

**What:** 拍照 -> 上传 -> FashionSigLIP encode_image -> Qdrant search -> 返回 5 个相似款
**When to use:** PHO-01 拍照识图找同款
**Example:**

```typescript
// Source: 项目 EmbeddingService.encode_image + QdrantService.searchSimilar 分析
// 小程序端
async function photoSearch(tempFilePath: string) {
  // Step 1: 上传图片到后端
  const uploadRes = await Taro.uploadFile({
    url: `${API_BASE}/api/v1/search/image`,
    filePath: tempFilePath,
    name: 'image'
  })
  // Step 2: 后端流程（已在 SearchService.searchByImage 实现）:
  // a) 保存图片到 MinIO
  // b) 调用 ML /api/vector/embed/image 获取 1152-dim 向量
  // c) Qdrant searchSimilar 向量检索
  // d) 返回 top-5 匹配商品
  return JSON.parse(uploadRes.data)
}

// Python ML 端新增 endpoint:
@router.post("/api/vector/embed/image")
async def embed_image(file: UploadFile):
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    embedding = _embedding_service.encode_image([image])
    return {"embedding": embedding[0], "dimension": len(embedding[0])}
```

### Pattern 3: 风格 DNA 向量聚合与匹配

**What:** 用户行为向量聚合 -> Qdrant user collection 存储 -> 余弦相似度 top-K 匹配
**When to use:** SOC-01 风格社交匹配
**Example:**

```python
# Source: 项目 QdrantService + EmbeddingService 分析
# 用户风格 DNA = 用户交互过的所有商品向量的加权平均
async def compute_user_style_dna(user_id: str) -> List[float]:
    # 1. 获取用户交互过的商品 ID（favorite, purchase, try_on 行为）
    # 2. 从 Qdrant clothing_items 获取这些商品的向量
    # 3. 加权平均（purchase * 3, favorite * 2, view * 1）
    # 4. 存入 Qdrant user_style_dna collection
    pass

async def find_style_matches(user_id: str, top_k: int = 10):
    # 1. 从 Qdrant user_style_dna 获取用户向量
    # 2. 在 user_style_dna collection 中做 COSINE 搜索
    # 3. 返回 top-K 相似用户 + 相似度分数
    pass
```

### Pattern 4: 小程序分享裂变

**What:** useShareAppMessage + useShareTimeline 实现零摩擦分享
**When to use:** MINI-02 分享到朋友圈/群
**Example:**

```typescript
// Source: Taro Context7 docs - useShareAppMessage
import { useShareAppMessage, useShareTimeline } from "@tarojs/taro";

function ProductPage() {
  // 分享给好友/群
  useShareAppMessage((res) => {
    return {
      title: "伊伊帮我找到了这件同款！",
      path: "/pages/search?id=xxx",
      imageUrl: "/assets/share-image.png",
    };
  });

  // 分享到朋友圈（需同时定义 useShareAppMessage）
  useShareTimeline(() => ({
    title: "拍照找同款，AI 帮你搭更好",
    imageUrl: "/assets/share-timeline.png",
  }));

  return <View>...</View>;
}

// page.config.ts 必须配置:
export default {
  enableShareAppMessage: true,
  enableShareTimeline: true,
};
```

### Anti-Patterns to Avoid

- **在小程序端做向量推理**: FashionSigLIP 1152 维向量推理需要 GPU，小程序端无法运行。必须上传图片到后端处理。
- **使用 window/document 对象**: 小程序没有 DOM/BOM。Taro 编译层处理了大部分差异，但自定义代码中不可使用。
- **包体超过 2MB 限制**: 微信小程序主包 2MB 上限，必须使用 subPackages 分包。图片资源走 CDN。
- **忽略微信隐私协议**: 2023 年起微信要求用户同意隐私协议后才能调用相机、相册等 API。需配置 `__usePrivacyCheck__`。
- **在小程序端存储大量数据**: Storage 上限 10MB，不要缓存商品向量。只存 JWT、用户基本信息。

## Don't Hand-Roll

| Problem        | Don't Build        | Use Instead                               | Why                                                 |
| -------------- | ------------------ | ----------------------------------------- | --------------------------------------------------- |
| 微信登录认证   | 自建 OAuth 流程    | WechatService (已有) + jscode2session API | 后端已有完整微信登录逻辑，只需新增小程序专用端点    |
| 图片向量编码   | 自己写 CLIP 推理   | EmbeddingService.encode_image (已有)      | 已实现 FashionSigLIP 加载、GPU 推理、归一化         |
| 向量相似度搜索 | 自己写 ANN 索引    | QdrantService.searchSimilar (已有)        | Qdrant HNSW 索引已在 Docker 运行，COSINE 距离已配置 |
| 图片搜索降级链 | 只依赖 ML 服务     | SearchService.searchByImage (已有)        | 已有三级降级：ML 向量搜索 -> 属性搜索 -> 热门兜底   |
| HTTP 请求封装  | 自建 fetch wrapper | Taro.request + interceptor                | Taro 统一了小程序网络请求 API                       |
| 状态管理       | Redux/Context      | Zustand (项目标准)                        | 项目已在 RN 端使用 Zustand，保持一致                |

**Key insight:** Phase 8 的核心价值不在从零构建基础设施，而是**将已有后端能力（对话、搜索、推荐、认证）通过新的小程序前端暴露给微信生态用户**。新增的后端代码主要是 API 适配层和 ML image embedding 端点。

## Common Pitfalls

### Pitfall 1: 小程序包体超限

**What goes wrong:** 主包超过 2MB，构建失败或上传被拒
**Why it happens:** 图片资源、第三方库、未 tree-shake 的代码
**How to avoid:** (1) 使用 subPackages 分包：chat/search/social 各一个分包；(2) 图片走 CDN；(3) 使用 `taro build --type weapp --reporter json` 分析包体
**Warning signs:** 构建产物 > 1.5MB 时立即分包

### Pitfall 2: FashionSigLIP 首次加载冷启动

**What goes wrong:** 首次图片搜索耗时 > 10s，用户体验差
**Why it happens:** FashionSigLIP 模型 ~1GB，首次加载到 GPU 需要 5-8s
**How to avoid:** (1) ML 服务启动时预加载模型（已实现 EmbeddingService lazy load）；(2) 健康检查确认模型就绪后才接受请求；(3) 小程序端显示骨架屏/loading 动画
**Warning signs:** `/api/vector/health` 返回 `embedding: false`

### Pitfall 3: 小程序与 RN 端 JWT 不兼容

**What goes wrong:** 小程序 wx.login 获取的 openid 创建的用户缺少 profile 数据，后端推荐管道报错
**Why it happens:** RN 端走邮箱/手机注册 + 完整 onboarding；小程序可能只做微信授权没有 onboarding
**How to avoid:** (1) 微信登录后创建 User 时设置 authProvider = AuthProvider.wechat_mini；(2) 小程序端也实现轻量 onboarding（选场景+风格）；(3) 后端检测到缺少 profile 时使用 degraded 推荐
**Warning signs:** 微信登录用户 cold start CTR < 2%

### Pitfall 4: 朋友圈分享图片不显示

**What goes wrong:** useShareTimeline 配置后分享到朋友圈的图片是空白
**Why it happens:** Android only 功能，iOS 不支持；图片必须是正方形 1:1 比例；网络图片需要配置 downloadFile 域名白名单
**How to avoid:** (1) 在 project.config.json 配置合法域名；(2) 准备 5:4 或 1:1 的分享图片；(3) 降级方案：Android 朋友圈分享，iOS 只支持转发给好友
**Warning signs:** 分享到朋友圈按钮灰色不可点击

### Pitfall 5: 用户风格 DNA 向量冷启动

**What goes wrong:** 新用户没有行为数据，无法计算风格向量，社交匹配为空
**Why it happens:** 需要至少 3-5 个交互商品才有有意义的聚合向量
**How to avoid:** (1) Onboarding Step 3 选的 6 张穿搭图作为初始向量种子（已有 styleImageSeeds 字段）；(2) 新用户用 onboarding 偏好向量代替行为向量；(3) 冷启动用户显示"等你多和伊伊聊聊，就能找到风格搭子"
**Warning signs:** 注册 3 天内用户社交匹配结果为空

### Pitfall 6: Qdrant 跨 Collection 搜索性能

**What goes wrong:** user_style_dna collection 增长后搜索变慢
**Why it happens:** 用户量 > 10000 时 HNSW 索引参数需调优
**How to avoid:** (1) 使用合适的 ef_construct（100）和 m（16）参数（已在 clothing_items 上验证）；(2) 设置 score_threshold 过滤低相似度匹配；(3) 缓存热门用户的匹配结果
**Warning signs:** 匹配 API 响应时间 > 500ms

## Code Examples

### 微信小程序登录（后端新增端点）

```typescript
// apps/backend/src/domains/identity/auth/auth.controller.ts (扩展)
// Source: 项目 WechatService + jscode2session 微信官方 API

@Post('wechat-mini')
@UseGuches(LocalAuthGuard) // 或自定义 guard
async miniProgramLogin(@Body() dto: MiniProgramLoginDto) {
  // 微信小程序使用 jscode2session（不是开放平台 OAuth）
  // GET https://api.weixin.qq.com/sns/jscode2session
  const wxResult = await this.wechatService.jscode2session(dto.code)
  // wxResult: { openid, session_key, unionid? }

  // 查找或创建用户
  let user = await this.usersService.findByWechatOpenId(wxResult.openid)
  if (!user) {
    user = await this.usersService.createFromWechat({
      openid: wxResult.openid,
      unionid: wxResult.unionid,
    })
  }

  return this.authService.generateTokens(user)
}
```

### 图片向量搜索端点（Python ML 新增）

```python
# ml/api/routes/vector.py (扩展)
# Source: 项目 EmbeddingService.encode_image + QdrantVectorStore.search

from fastapi import UploadFile, File
from PIL import Image
import io

class ImageSearchRequest(BaseModel):
    image_url: Optional[str] = None
    top_k: int = 5

class ImageSearchResult(BaseModel):
    id: str
    score: float
    name: str
    price: float
    image_url: str
    similarity: float

@router.post("/search/image", response_model=List[ImageSearchResult])
async def search_by_image(file: UploadFile = File(...), top_k: int = 5):
    """拍照识图找同款: image -> FashionSigLIP encode -> Qdrant search"""
    if not _embedding_available or _embedding_service is None:
        raise ModelNotLoadedError(model_name="fashionSigLIP")
    if not _vector_store_available or _vector_store is None:
        raise ModelNotLoadedError(model_name="qdrant")

    # Step 1: 读取并编码图片
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    query_embedding = _embedding_service.encode_image([image])[0]  # 1152-dim

    # Step 2: Qdrant 向量检索
    raw_results = _vector_store.search(
        query_embedding=query_embedding,
        top_k=top_k,
    )

    return [
        ImageSearchResult(
            id=r["doc_id"],
            score=r["score"],
            name=r["metadata"].get("name", ""),
            price=r["metadata"].get("price", 0),
            image_url=r["metadata"].get("imageUrl", ""),
            similarity=r["score"],
        )
        for r in raw_results
    ]
```

### 风格 DNA 匹配（新增 Python 服务）

```python
# ml/services/social/style_dna.py (新增)
# Source: 项目 QdrantService + EmbeddingService 架构分析

from ml.services.rag.qdrant_client import QdrantVectorStore, QdrantConfig, VectorDocument

USER_STYLE_COLLECTION = "user_style_dna"

class StyleDNAService:
    def __init__(self, qdrant: QdrantVectorStore, embedding_service):
        self._qdrant = qdrant
        self._embedding = embedding_service

    async def update_user_vector(self, user_id: str, item_vectors: list[list[float]], weights: list[float]):
        """根据用户交互的商品向量计算风格 DNA"""
        import numpy as np
        weighted = np.zeros(len(item_vectors[0]))
        total_weight = sum(weights)
        for vec, w in zip(item_vectors, weights):
            weighted += np.array(vec) * w
        weighted /= total_weight
        # 归一化
        weighted /= np.linalg.norm(weighted)

        self._qdrant.upsert_documents([
            VectorDocument(
                doc_id=user_id,
                content=f"user_style_dna:{user_id}",
                embedding=weighted.tolist(),
                metadata={"user_id": user_id, "method": "weighted_avg"},
            )
        ])

    async def find_similar_users(self, user_id: str, top_k: int = 10):
        """找到风格最像的用户"""
        # 获取用户向量
        user_vec = self._qdrant.get_point(user_id)
        if not user_vec:
            return []
        # 在 user_style_dna collection 搜索
        results = self._qdrant.search(
            query_embedding=user_vec,
            top_k=top_k + 1,  # +1 排除自己
        )
        return [r for r in results if r["doc_id"] != user_id][:top_k]
```

## State of the Art

| Old Approach                | Current Approach                | When Changed  | Impact                                  |
| --------------------------- | ------------------------------- | ------------- | --------------------------------------- |
| wx.getUserInfo 获取用户信息 | wx.login + 用户自主填写头像昵称 | 2022 微信调整 | 不再能静默获取头像昵称，需用户手动授权  |
| FashionCLIP (512-dim)       | Marqo-FashionSigLIP (1152-dim)  | Phase 6 完成  | 维度更高、中文时尚数据表现更好          |
| 原生小程序开发              | Taro 4 + React 跨端             | 2024-2025     | React 语法 + 跨端编译，开发效率更高     |
| 协同过滤推荐                | 向量相似度推荐                  | Phase 7 完成  | 基于 FashionSigLIP 向量的语义匹配更精准 |

**Deprecated/outdated:**

- wx.getUserProfile: 2022 年后逐步限制，实际用户信息需要用户主动填写 [ASSUMED]
- wx.getUserInfo: 已不返回真实用户数据 [ASSUMED]

## Assumptions Log

| #   | Claim                                                                   | Section               | Risk if Wrong                                   |
| --- | ----------------------------------------------------------------------- | --------------------- | ----------------------------------------------- |
| A1  | Taro 4.2.0 与 React 18 完全兼容，所有 hooks 正常工作                    | Standard Stack        | 某些 React 18 特性可能不支持，需降级到 React 17 |
| A2  | wx.getUserProfile 已被限制/废弃，需用 wx.login + 用户手动填昵称头像     | Architecture Patterns | 如果仍可用可简化登录流程                        |
| A3  | 微信小程序 onShareTimeline 仅 Android 支持                              | Architecture Patterns | iOS 也可能已支持，需确认                        |
| A4  | FashionSigLIP 模型已通过 Phase 6 部署到生产环境                         | Common Pitfalls       | 如果模型未部署，图片搜索功能不可用              |
| A5  | Qdrant clothing_items collection 已有数据（Phase 6 seed_qdrant 已执行） | Architecture Patterns | 如果没有数据，搜索返回空结果                    |
| A6  | 小程序 AppID 已在微信公众平台注册                                       | Environment           | 未注册则无法真机调试和发布                      |
| A7  | Zustand 在小程序环境下正常工作                                          | Standard Stack        | 可能需要额外 polyfill                           |

## Open Questions

1. **微信小程序 AppID 是否已注册?**

   - What we know: 项目使用微信登录，必然有公众号/开放平台 AppID
   - What's unclear: 是否有单独的小程序 AppID（与公众号 AppID 不同）
   - Recommendation: Plan 中包含 AppID 注册步骤，如已有则跳过

2. **FashionSigLIP 模型部署状态?**

   - What we know: EmbeddingService 代码已实现，Phase 6 计划了 FashionSigLIP 替换
   - What's unclear: 模型是否已实际部署并能正常运行 encode_image
   - Recommendation: Phase 8 Plan 01 包含 ML 服务健康检查验证步骤

3. **Qdrant 中是否有已嵌入的商品向量数据?**

   - What we know: seed_qdrant.py 脚本已写好，Phase 6 DAT-04 计划了批量嵌入管道
   - What's unclear: 实际数据量是否足够支撑有意义的搜索结果
   - Recommendation: Plan 中包含数据验证步骤

4. **小程序域名白名单是否已配置?**

   - What we know: 后端有 Nginx 反向代理（Phase 6 SEC-01）
   - What's unclear: 是否有已备案域名可用于小程序 API 调用（微信要求 HTTPS + 已备案域名）
   - Recommendation: 必须有已备案域名 + HTTPS 证书，否则小程序无法调用后端

5. **用户风格 DNA 向量的初始种子如何获取?**
   - What we know: Onboarding Step 3 有 6 张穿搭图选择（styleImageSeeds）
   - What's unclear: 这些图片的向量是否已在用户注册时计算并存储
   - Recommendation: 如果未存储，需在 Phase 8 新增 onboarding 完成时计算初始 DNA 向量的逻辑

## Environment Availability

| Dependency            | Required By             | Available    | Version  | Fallback               |
| --------------------- | ----------------------- | ------------ | -------- | ---------------------- |
| Node.js               | Taro CLI 构建           | Yes          | v24      | --                     |
| pnpm                  | 包管理                  | Yes          | 8.x      | --                     |
| Python 3.11+          | ML 服务                 | Yes          | 3.11+    | --                     |
| Docker                | Qdrant/PostgreSQL/Redis | Yes          | 20.10+   | --                     |
| Qdrant                | 向量搜索                | Yes (Docker) | v1.12.1  | --                     |
| FashionSigLIP 模型    | 图片嵌入                | Unknown      | --       | 需要 GPU + 模型权重    |
| 微信开发者工具        | 小程序调试              | Unknown      | --       | 必须安装               |
| 微信小程序 AppID      | 真机调试/发布           | Unknown      | --       | 必须在微信公众平台注册 |
| 已备案 HTTPS 域名     | 小程序网络请求          | Unknown      | --       | 微信强制要求           |
| NVIDIA GPU (RTX 4060) | FashionSigLIP 推理      | Yes          | RTX 4060 | CPU 推理（极慢）       |

**Missing dependencies with no fallback:**

- 微信小程序 AppID: 无替代方案，必须注册
- 已备案 HTTPS 域名: 微信小程序强制要求，无替代方案
- 微信开发者工具: 无替代方案，真机调试和上传必需

**Missing dependencies with fallback:**

- FashionSigLIP 模型: 如果未部署，可用属性搜索降级（SearchService 已实现）

## Validation Architecture

### Test Framework

| Property           | Value                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------- |
| Framework          | Jest (backend) + pytest (ML)                                                             |
| Config file        | apps/backend/jest.config.ts / ml/api/conftest.py                                         |
| Quick run command  | `cd C:/AiNeed && pnpm --filter backend test -- --testPathPattern="search\|auth\|social"` |
| Full suite command | `cd C:/AiNeed && pnpm --filter backend test`                                             |

### Phase Requirements -> Test Map

| Req ID  | Behavior                                      | Test Type   | Automated Command                                          | File Exists?      |
| ------- | --------------------------------------------- | ----------- | ---------------------------------------------------------- | ----------------- |
| MINI-01 | 微信登录后获取 JWT                            | unit        | `pnpm --filter backend test -- --testPathPattern="wechat"` | Yes (spec exists) |
| MINI-01 | 对话 API 可被小程序调用                       | integration | `pnpm --filter backend test -- --testPathPattern="dialog"` | Partial           |
| MINI-02 | 分享链接包含追踪参数                          | unit        | Manual verification in mini program                        | No (Wave 0)       |
| PHO-01  | 图片上传 -> FashionSigLIP 编码 -> Qdrant 检索 | unit        | `pytest ml/api/tests/test_vector_search.py -x`             | No (Wave 0)       |
| PHO-01  | 图片搜索降级链 (ML -> 属性 -> 热门)           | unit        | `pnpm --filter backend test -- --testPathPattern="search"` | Yes               |
| PHO-02  | 搜索结果页包含注册引导 CTA                    | e2e         | Manual verification                                        | No (Wave 0)       |
| SOC-01  | 用户风格向量聚合计算                          | unit        | `pytest ml/api/tests/test_style_dna.py -x`                 | No (Wave 0)       |
| SOC-01  | 余弦相似度 top-K 匹配                         | unit        | `pytest ml/api/tests/test_style_dna.py -x`                 | No (Wave 0)       |

### Sampling Rate

- **Per task commit:** `pnpm --filter backend test -- --testPathPattern="<changed-module>"`
- **Per wave merge:** `pnpm --filter backend test && pytest ml/api/tests/`
- **Phase gate:** Full suite green before proceeding

### Wave 0 Gaps

- [ ] `ml/api/tests/test_vector_search.py` -- covers PHO-01 image search endpoint
- [ ] `ml/api/tests/test_style_dna.py` -- covers SOC-01 style DNA matching
- [ ] `apps/backend/src/domains/social/social.service.spec.ts` -- covers SOC-01 social matching controller
- [ ] `apps/backend/src/domains/identity/auth/auth.controller.spec.ts` -- extend for mini-program login
- [ ] Mini-program Jest config + test setup -- Taro mini program testing infrastructure

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                           |
| --------------------- | ------- | ---------------------------------------------------------- |
| V2 Authentication     | Yes     | WechatService + JWT (已有)                                 |
| V3 Session Management | Yes     | JWT access/refresh token + Redis session store (已有)      |
| V4 Access Control     | Yes     | NestJS Guards + Role-based (已有)                          |
| V5 Input Validation   | Yes     | class-validator DTOs (已有) + image file validation (新增) |
| V6 Cryptography       | Yes     | bcrypt password hash + JWT signing (已有)                  |
| V8 Data Protection    | Yes     | PIPL 合规已在 Phase 6 实现                                 |

### Known Threat Patterns for WeChat Mini Program + Image Upload Stack

| Pattern                                    | STRIDE                 | Standard Mitigation                                        |
| ------------------------------------------ | ---------------------- | ---------------------------------------------------------- |
| Image upload malicious file                | Tampering              | File type validation + size limit + PIL image verification |
| JWT token theft via XSS (webview)          | Information Disclosure | HttpOnly cookie + short-lived access token                 |
| WeChat openid enumeration                  | Spoofing               | Rate limiting on /auth/wechat-mini endpoint                |
| Qdrant injection via crafted vectors       | Tampering              | Input validation on vector dimension (must be 1152)        |
| Cross-user data leakage in social matching | Information Disclosure | Only expose non-PII (nickname + style overlap %)           |

## Sources

### Primary (HIGH confidence)

- Context7 /nervjs/taro-docs - Taro 4 project setup, hooks API, sharing API, request API, chooseImage API
- npm registry - @tarojs/taro 4.2.0, @tarojs/cli 4.2.0, @tarojs/components 4.2.0, taro-ui 3.3.1 verified
- pip registry - qdrant-client 1.17.1 (installed)
- Project codebase analysis - EmbeddingService, QdrantService, WechatService, SearchService, Prisma schema

### Secondary (MEDIUM confidence)

- Taro Context7 docs - useShareAppMessage, useShareTimeline, page lifecycle hooks
- Qdrant Context7 docs - query_points API, filter support, score_threshold

### Tertiary (LOW confidence)

- WeChat Mini Program API 变更历史 (wx.getUserProfile 限制) - [ASSUMED] based on training knowledge
- Taro 4 性能特性 - [ASSUMED] based on training knowledge
- onShareTimeline Android-only 限制 - [ASSUMED] based on Taro docs

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Taro 4.2.0 verified on npm, Context7 docs fetched
- Architecture: HIGH - Existing backend infrastructure analyzed in detail (EmbeddingService, QdrantService, WechatService all verified in codebase)
- Pitfalls: MEDIUM - Based on Taro docs + training knowledge, some WeChat-specific pitfalls need real-device verification

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (Taro 4 stable, Qdrant stable)
