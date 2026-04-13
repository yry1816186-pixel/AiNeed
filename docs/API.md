# xuno API 文档

本文档详细说明 xuno 后端 API 接口规范。

---

## 目录

- [概述](#概述)
- [认证方式](#认证方式)
- [通用规范](#通用规范)
- [API 端点列表](#api-端点列表)
- [请求/响应格式](#请求响应格式)
- [错误码说明](#错误码说明)
- [速率限制](#速率限制)

---

## 概述

### 基础信息

| 项目 | 说明 |
|------|------|
| 基础 URL | `http://localhost:3001/api/v1` |
| 协议 | HTTP/HTTPS |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| API 版本 | v1 |

### Swagger 文档

启动后端服务后，访问 Swagger UI 查看完整 API 文档：

```
http://localhost:3001/api/docs
```

---

## 认证方式

### JWT 认证

xuno 使用 JWT (JSON Web Token) 进行身份认证。

#### 获取 Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "nickname": "用户昵称"
    }
  }
}
```

#### 使用 Token

在请求头中携带 Access Token：

```http
GET /api/v1/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 刷新 Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Token 有效期

| Token 类型 | 有效期 | 说明 |
|-----------|-------|------|
| Access Token | 2 小时 | 访问受保护资源 |
| Refresh Token | 7 天 | 刷新 Access Token |

---

## 通用规范

### 请求头

| Header | 必填 | 说明 |
|--------|-----|------|
| `Content-Type` | 是 | `application/json` |
| `Authorization` | 是* | `Bearer {token}` |
| `X-Request-ID` | 否 | 请求追踪 ID |
| `Accept-Language` | 否 | 语言偏好 (zh-CN, en-US) |

*仅认证接口需要

### 响应格式

#### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    // 响应数据
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 分页响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

#### 错误响应

```json
{
  "code": 40001,
  "message": "参数验证失败",
  "errors": [
    {
      "field": "email",
      "message": "邮箱格式不正确"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## API 端点列表

### 认证模块 `/api/v1/auth`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| POST | `/register` | 用户注册 | 否 |
| POST | `/login` | 用户登录 | 否 |
| POST | `/logout` | 用户登出 | 是 |
| POST | `/refresh` | 刷新 Token | 否 |
| POST | `/forgot-password` | 忘记密码 | 否 |
| POST | `/reset-password` | 重置密码 | 否 |

#### 用户注册

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "nickname": "用户昵称"
}
```

---

### 用户档案模块 `/api/v1/profile`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| GET | `/` | 获取用户档案 | 是 |
| PUT | `/` | 更新用户档案 | 是 |
| GET | `/body-analysis` | 获取体型分析 | 是 |
| GET | `/color-analysis` | 获取色彩分析 | 是 |
| PUT | `/measurements` | 更新身体数据 | 是 |

#### 获取用户档案

```http
GET /api/v1/profile
Authorization: Bearer {token}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "bodyType": "hourglass",
    "skinTone": "medium",
    "faceShape": "oval",
    "colorSeason": "autumn",
    "height": 165,
    "weight": 55,
    "stylePreferences": ["minimalist", "casual"],
    "priceRangeMin": 100,
    "priceRangeMax": 500
  }
}
```

#### 更新身体数据

```http
PUT /api/v1/profile/measurements
Authorization: Bearer {token}
Content-Type: application/json

{
  "height": 165,
  "weight": 55,
  "shoulder": 40,
  "bust": 85,
  "waist": 68,
  "hip": 90
}
```

---

### 照片模块 `/api/v1/photos`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| POST | `/upload` | 上传照片 | 是 |
| GET | `/` | 获取照片列表 | 是 |
| GET | `/:id` | 获取照片详情 | 是 |
| DELETE | `/:id` | 删除照片 | 是 |
| GET | `/:id/analysis` | 获取分析结果 | 是 |
| POST | `/:id/analyze` | 触发照片分析 | 是 |

#### 上传照片

```http
POST /api/v1/photos/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [图片文件]
type: full_body  // front|side|full_body|half_body|face
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": "uuid",
    "url": "https://storage.example.com/photos/xxx.jpg",
    "thumbnailUrl": "https://storage.example.com/photos/xxx_thumb.jpg",
    "type": "full_body",
    "analysisStatus": "pending"
  }
}
```

#### 获取分析结果

```http
GET /api/v1/photos/:id/analysis
Authorization: Bearer {token}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "photoId": "uuid",
    "status": "completed",
    "analyzedAt": "2024-01-01T00:00:00.000Z",
    "result": {
      "bodyType": {
        "type": "hourglass",
        "confidence": 0.92
      },
      "skinTone": {
        "type": "medium",
        "confidence": 0.88
      },
      "colorSeason": {
        "type": "autumn",
        "confidence": 0.85
      },
      "measurements": {
        "shoulderWidth": 40,
        "waistWidth": 28,
        "hipWidth": 36
      }
    }
  }
}
```

---

### 服装商品模块 `/api/v1/clothing`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| GET | `/` | 获取商品列表 | 否 |
| GET | `/:id` | 获取商品详情 | 否 |
| GET | `/categories` | 获取分类列表 | 否 |
| GET | `/brands` | 获取品牌列表 | 否 |
| GET | `/trending` | 获取热门商品 | 否 |

#### 获取商品列表

```http
GET /api/v1/clothing?page=1&pageSize=20&category=tops&priceMin=100&priceMax=500
```

**Query 参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|-----|------|
| page | int | 否 | 页码，默认 1 |
| pageSize | int | 否 | 每页数量，默认 20 |
| category | string | 否 | 分类筛选 |
| brandId | string | 否 | 品牌 ID |
| priceMin | number | 否 | 最低价格 |
| priceMax | number | 否 | 最高价格 |
| colors | string | 否 | 颜色筛选（逗号分隔） |
| sizes | string | 否 | 尺码筛选（逗号分隔） |
| sort | string | 否 | 排序字段 |
| order | string | 否 | 排序方向 asc/desc |

**响应**:
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "简约白色T恤",
        "description": "纯棉面料，舒适透气",
        "brand": {
          "id": "uuid",
          "name": "品牌名称"
        },
        "category": "tops",
        "colors": ["white", "black"],
        "sizes": ["S", "M", "L", "XL"],
        "price": 199,
        "originalPrice": 299,
        "images": ["url1", "url2"],
        "mainImage": "url1",
        "viewCount": 1234,
        "likeCount": 567
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

### AI 造型师模块 `/api/v1/ai-stylist`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| POST | `/sessions` | 创建会话 | 是 |
| GET | `/sessions/:id` | 获取会话 | 是 |
| POST | `/sessions/:id/messages` | 发送消息 | 是 |
| GET | `/sessions/:id/messages` | 获取消息历史 | 是 |
| POST | `/sessions/:id/generate` | 生成穿搭方案 | 是 |

#### 创建会话

```http
POST /api/v1/ai-stylist/sessions
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "outfit_recommendation",
  "context": {
    "occasion": "date",
    "weather": "spring_mild"
  }
}
```

#### 发送消息

```http
POST /api/v1/ai-stylist/sessions/:id/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "我想找一套周末约会的穿搭",
  "attachments": []
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": "uuid",
    "role": "assistant",
    "content": "好的，为了给您推荐最合适的约会穿搭，我需要了解一些信息...",
    "suggestions": [
      "休闲约会",
      "正式约会",
      "户外活动"
    ],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 生成穿搭方案

```http
POST /api/v1/ai-stylist/sessions/:id/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "preferences": {
    "styles": ["minimalist", "casual"],
    "budgetMin": 200,
    "budgetMax": 800,
    "colorPreferences": ["neutral", "warm"]
  }
}
```

---

### 虚拟试衣模块 `/api/v1/try-on`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| POST | `/` | 创建试衣任务 | 是 |
| GET | `/:id` | 获取试衣结果 | 是 |
| GET | `/:id/status` | 获取任务状态 | 是 |
| GET | `/history` | 获取试衣历史 | 是 |

#### 创建试衣任务

```http
POST /api/v1/try-on
Authorization: Bearer {token}
Content-Type: application/json

{
  "photoId": "uuid",
  "itemId": "uuid"
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": "uuid",
    "status": "pending",
    "photoId": "uuid",
    "itemId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 获取任务状态

```http
GET /api/v1/try-on/:id/status
Authorization: Bearer {token}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": "uuid",
    "status": "completed",
    "progress": 100,
    "resultImageUrl": "https://storage.example.com/tryon/result.jpg",
    "completedAt": "2024-01-01T00:00:05.000Z"
  }
}
```

### 试衣状态枚举

| 状态 | 说明 |
|------|------|
| pending | 等待处理 |
| processing | 处理中 |
| completed | 已完成 |
| failed | 失败 |

---

### 推荐模块 `/api/v1/recommendations`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| GET | `/` | 获取个性化推荐 | 是 |
| GET | `/daily` | 每日推荐 | 是 |
| GET | `/occasion` | 场合推荐 | 是 |
| GET | `/trending` | 热门趋势 | 否 |
| GET | `/similar/:itemId` | 相似商品推荐 | 否 |

#### 获取个性化推荐

```http
GET /api/v1/recommendations?limit=10&strategy=fusion
Authorization: Bearer {token}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "商品名称",
        "mainImage": "url",
        "price": 299,
        "matchScore": 0.92,
        "matchReason": "与您的身材和风格偏好高度匹配"
      }
    ],
    "strategy": "fusion",
    "generatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 场合推荐

```http
GET /api/v1/recommendations/occasion?type=interview&limit=5
Authorization: Bearer {token}
```

**Query 参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 场合类型 |
| limit | number | 返回数量 |

**场合类型**:
- `interview` - 面试
- `work` - 工作
- `date` - 约会
- `travel` - 旅行
- `party` - 聚会
- `daily` - 日常

---

### 搜索模块 `/api/v1/search`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| GET | `/` | 文本搜索 | 否 |
| POST | `/image` | 以图搜图 | 否 |
| GET | `/similar/:itemId` | 相似商品搜索 | 否 |
| GET | `/suggestions` | 搜索建议 | 否 |

#### 文本搜索

```http
GET /api/v1/search?q=白色连衣裙&page=1&pageSize=20
```

#### 以图搜图

```http
POST /api/v1/search/image
Content-Type: multipart/form-data

file: [图片文件]
limit: 10
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "相似商品",
        "mainImage": "url",
        "price": 199,
        "similarity": 0.89
      }
    ],
    "searchTime": 0.125
  }
}
```

---

### 收藏模块 `/api/v1/favorites`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| GET | `/` | 获取收藏列表 | 是 |
| POST | `/` | 添加收藏 | 是 |
| DELETE | `/:itemId` | 取消收藏 | 是 |
| GET | `/check/:itemId` | 检查收藏状态 | 是 |

#### 添加收藏

```http
POST /api/v1/favorites
Authorization: Bearer {token}
Content-Type: application/json

{
  "itemId": "uuid"
}
```

---

### 购物车模块 `/api/v1/cart`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| GET | `/` | 获取购物车 | 是 |
| POST | `/items` | 添加商品 | 是 |
| PUT | `/items/:id` | 更新数量 | 是 |
| DELETE | `/items/:id` | 删除商品 | 是 |
| DELETE | `/` | 清空购物车 | 是 |

#### 添加商品到购物车

```http
POST /api/v1/cart/items
Authorization: Bearer {token}
Content-Type: application/json

{
  "itemId": "uuid",
  "color": "white",
  "size": "M",
  "quantity": 1
}
```

---

### 订单模块 `/api/v1/orders`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| GET | `/` | 获取订单列表 | 是 |
| GET | `/:id` | 获取订单详情 | 是 |
| POST | `/` | 创建订单 | 是 |
| PUT | `/:id/cancel` | 取消订单 | 是 |
| GET | `/:id/track` | 物流追踪 | 是 |

#### 创建订单

```http
POST /api/v1/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "items": [
    {
      "itemId": "uuid",
      "color": "white",
      "size": "M",
      "quantity": 1
    }
  ],
  "addressId": "uuid",
  "remark": "备注信息"
}
```

---

### 支付模块 `/api/v1/payment`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| POST | `/create` | 创建支付 | 是 |
| GET | `/:orderId/status` | 支付状态 | 是 |
| POST | `/notify/alipay` | 支付宝回调 | 否 |
| POST | `/notify/wechat` | 微信回调 | 否 |

#### 创建支付

```http
POST /api/v1/payment/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderId": "uuid",
  "method": "alipay"  // alipay | wechat
}
```

---

### 社区模块 `/api/v1/community`

| 方法 | 端点 | 说明 | 认证 |
|------|------|------|-----|
| GET | `/posts` | 获取帖子列表 | 否 |
| GET | `/posts/:id` | 获取帖子详情 | 否 |
| POST | `/posts` | 创建帖子 | 是 |
| PUT | `/posts/:id` | 更新帖子 | 是 |
| DELETE | `/posts/:id` | 删除帖子 | 是 |
| POST | `/posts/:id/like` | 点赞帖子 | 是 |
| POST | `/posts/:id/comments` | 评论帖子 | 是 |

---

## 请求/响应格式

### 日期时间格式

所有日期时间使用 ISO 8601 格式：

```
2024-01-01T00:00:00.000Z
```

### 金额格式

金额使用数字类型，单位为分或元（根据接口说明）：

```json
{
  "price": 19900,  // 199.00 元（分）
  "currency": "CNY"
}
```

### 枚举值

#### 体型类型 (BodyType)

| 值 | 中文 |
|---|------|
| rectangle | H型 |
| triangle | A型 |
| inverted_triangle | Y型 |
| hourglass | X型 |
| oval | O型 |

#### 肤色 (SkinTone)

| 值 | 中文 |
|---|------|
| fair | 白皙 |
| light | 浅色 |
| medium | 中等 |
| olive | 橄榄色 |
| tan | 棕褐色 |
| dark | 深色 |

#### 色彩季型 (ColorSeason)

| 值 | 中文 | 适合颜色 |
|---|------|---------|
| spring | 春季型 | 珊瑚、桃色、草绿 |
| summer | 夏季型 | 粉色、薰衣草、浅蓝 |
| autumn | 秋季型 | 驼色、棕色、橄榄绿 |
| winter | 冬季型 | 正红、纯白、黑色 |

#### 服装分类 (ClothingCategory)

| 值 | 中文 |
|---|------|
| tops | 上装 |
| bottoms | 下装 |
| dresses | 连衣裙 |
| outerwear | 外套 |
| footwear | 鞋履 |
| accessories | 配饰 |
| activewear | 运动装 |
| swimwear | 泳装 |

---

## 错误码说明

### 错误码结构

错误码为 5 位数字：`XXYYY`
- `XX`: 模块代码
- `YYY`: 具体错误

### 通用错误码 (0XXXX)

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| 0 | 200 | 成功 |
| 10001 | 400 | 请求参数错误 |
| 10002 | 400 | 参数验证失败 |
| 10003 | 400 | 请求格式错误 |
| 10004 | 429 | 请求过于频繁 |
| 10005 | 500 | 服务器内部错误 |

### 认证错误码 (2XXXX)

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| 20001 | 401 | 未登录 |
| 20002 | 401 | Token 无效 |
| 20003 | 401 | Token 已过期 |
| 20004 | 403 | 权限不足 |
| 20005 | 400 | 邮箱已注册 |
| 20006 | 400 | 用户不存在 |
| 20007 | 400 | 密码错误 |
| 20008 | 401 | Refresh Token 无效 |

### 资源错误码 (3XXXX)

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| 30001 | 404 | 资源不存在 |
| 30002 | 409 | 资源已存在 |
| 30003 | 403 | 无权访问该资源 |
| 30004 | 410 | 资源已删除 |

### 业务错误码 (4XXXX)

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| 40001 | 400 | 商品已下架 |
| 40002 | 400 | 库存不足 |
| 40003 | 400 | 订单状态异常 |
| 40004 | 400 | 支付失败 |
| 40005 | 400 | 照片分析失败 |
| 40006 | 400 | 试衣任务失败 |
| 40007 | 400 | AI 服务异常 |

### 文件上传错误码 (5XXXX)

| 错误码 | HTTP 状态码 | 说明 |
|-------|-----------|------|
| 50001 | 400 | 文件类型不支持 |
| 50002 | 400 | 文件大小超限 |
| 50003 | 400 | 文件上传失败 |
| 50004 | 400 | 图片处理失败 |

---

## 速率限制

### 限制规则

| 端点类型 | 限制 | 窗口 |
|---------|-----|------|
| 通用 API | 100 次 | 1 分钟 |
| 认证 API | 10 次 | 1 分钟 |
| AI 相关 API | 30 次 | 1 分钟 |
| 文件上传 | 20 次 | 1 分钟 |

### 响应头

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

### 超限响应

```json
{
  "code": 10004,
  "message": "请求过于频繁，请稍后重试",
  "retryAfter": 60
}
```

---

## WebSocket 接口

### 连接地址

```
ws://localhost:3001/ws
```

### 消息格式

```json
{
  "event": "try_on_progress",
  "data": {
    "taskId": "uuid",
    "progress": 50,
    "status": "processing"
  }
}
```

### 支持事件

| 事件 | 说明 |
|------|------|
| `try_on_progress` | 试衣进度更新 |
| `try_on_completed` | 试衣完成 |
| `ai_message` | AI 消息推送 |
| `notification` | 系统通知 |

---

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| v1.0.0 | 2024-03-01 | 初始版本 |
| v1.1.0 | 2024-03-15 | 新增社区模块 |
| v1.2.0 | 2024-04-01 | 新增 WebSocket 支持 |

---

## 联系支持

- API 问题: api@xuno.com
- 技术支持: support@xuno.com
- GitHub Issues: https://github.com/your-org/xuno/issues
