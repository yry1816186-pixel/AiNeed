# AiNeed V3 API 文档

> **版本**: 3.3.0 | **基础路径**: `/api/v1` | **Swagger UI**: `http://localhost:3001/api/docs`

---

## 通用约定

### 认证

大部分接口需要 Bearer JWT 认证。在请求头中携带：

```
Authorization: Bearer <access-token>
```

### 响应格式

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: { code: string; message: string };
  meta?: { total?: number; page?: number; limit?: number; totalPages?: number };
}
```

### 分页参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量 |
| sortBy | string | - | 排序字段 |
| sortOrder | 'asc' \| 'desc' | 'desc' | 排序方向 |

### 错误码

| 错误码 | 说明 |
|--------|------|
| AUTH_INVALID_TOKEN | 无效的认证令牌 |
| AUTH_EXPIRED_TOKEN | 认证令牌已过期 |
| AUTH_INVALID_CREDENTIALS | 认证凭据无效 |
| USER_NOT_FOUND | 用户不存在 |
| USER_ALREADY_EXISTS | 用户已存在 |
| CLOTHING_NOT_FOUND | 服装不存在 |
| OUTFIT_NOT_FOUND | 搭配不存在 |
| FORBIDDEN | 无权限 |
| VALIDATION_ERROR | 参数验证失败 |
| RATE_LIMIT_EXCEEDED | 请求频率超限 |
| INTERNAL_ERROR | 服务器内部错误 |

---

## Auth - 认证

手机号+短信验证码登录/注册。

### POST /auth/send-code

发送短信验证码。

**认证**: 无

**请求体**:

```json
{
  "phone": "13800138000"
}
```

**响应**:

```json
{
  "success": true,
  "data": { "expiresIn": 300 }
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}'
```

---

### POST /auth/verify-code

验证码登录/注册（首次自动注册）。

**认证**: 无

**请求体**:

```json
{
  "phone": "13800138000",
  "code": "123456"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "phone": "13800138000",
      "nickname": null,
      "avatarUrl": null
    }
  }
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","code":"123456"}'
```

---

### POST /auth/refresh

刷新 Token。

**认证**: 无

**请求体**:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<your-refresh-token>"}'
```

---

### POST /auth/logout

登出，使当前 Token 失效。

**认证**: 需要

**响应**:

```json
{
  "success": true,
  "data": null
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer <access-token>"
```

---

## Users - 用户

### GET /users/me

获取当前用户信息。

**认证**: 需要

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phone": "13800138000",
    "nickname": "时尚达人",
    "avatarUrl": "https://cdn.aineed.com/avatars/xxx.jpg",
    "gender": "female",
    "height": 165,
    "weight": 55,
    "bodyType": "hourglass",
    "colorSeason": "autumn",
    "role": "user",
    "language": "zh"
  }
}
```

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer <access-token>"
```

---

### PATCH /users/me

更新当前用户资料。

**认证**: 需要

**请求体**:

```json
{
  "nickname": "新昵称",
  "gender": "female",
  "height": 165,
  "weight": 55,
  "language": "zh"
}
```

**curl 示例**:

```bash
curl -X PATCH http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"新昵称","gender":"female"}'
```

---

### POST /users/me/avatar

上传用户头像。

**认证**: 需要

**请求**: `multipart/form-data`，字段 `file` 为图片文件。

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/users/me/avatar \
  -H "Authorization: Bearer <access-token>" \
  -F "file=@/path/to/avatar.jpg"
```

---

### PUT /users/me/preferences

更新用户风格偏好。

**认证**: 需要

**请求体**:

```json
{
  "styleTags": ["minimalist", "casual"],
  "occasionTags": ["work", "date"],
  "colorPreferences": ["black", "white", "navy"],
  "budgetRange": "500-1000"
}
```

**curl 示例**:

```bash
curl -X PUT http://localhost:3001/api/v1/users/me/preferences \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"styleTags":["minimalist","casual"],"budgetRange":"500-1000"}'
```

---

### GET /users/:id/profile

获取用户公开主页信息。

**认证**: 可选

**路径参数**:

| 参数 | 说明 |
|------|------|
| id | 用户 UUID |

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/users/uuid-here/profile
```

---

## Clothing - 服装

### POST /clothing

创建服装（管理员）。

**认证**: 需要（Admin 角色）

**请求体**:

```json
{
  "name": "经典白色T恤",
  "brandId": "uuid",
  "categoryId": "uuid",
  "description": "100%纯棉经典白色T恤",
  "price": 199.00,
  "originalPrice": 299.00,
  "gender": "unisex",
  "seasons": ["spring", "summer"],
  "occasions": ["casual"],
  "styleTags": ["basic", "minimalist"],
  "colors": ["white"],
  "materials": ["cotton"],
  "fitType": "regular",
  "imageUrls": ["https://cdn.aineed.com/clothing/xxx.jpg"],
  "purchaseUrl": "https://example.com/product/123"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/clothing \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"经典白色T恤","categoryId":"uuid","price":199.00}'
```

---

### GET /clothing

获取服装列表（分页+过滤）。

**认证**: 可选

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| gender | string | 性别过滤 |
| categoryId | string | 分类过滤 |
| season | string | 季节过滤 |
| styleTag | string | 风格标签过滤 |
| minPrice | number | 最低价格 |
| maxPrice | number | 最高价格 |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/clothing?page=1&limit=20&gender=female&season=spring"
```

---

### GET /clothing/:id

获取服装详情。

**认证**: 可选

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/clothing/uuid-here
```

---

### GET /clothing/recommend

获取个性化推荐服装。

**认证**: 需要

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| occasion | string | 场合 |
| season | string | 季节 |
| limit | number | 数量（默认10） |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/clothing/recommend?occasion=work&season=spring&limit=10" \
  -H "Authorization: Bearer <access-token>"
```

---

### GET /clothing/search

搜索服装（ES全文+Qdrant语义混合搜索）。

**认证**: 可选

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| q | string | 搜索关键词 |
| type | string | 搜索类型: text / semantic / hybrid |
| page | number | 页码 |
| limit | number | 每页数量 |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/clothing/search?q=白色连衣裙&type=hybrid&page=1&limit=20"
```

---

### GET /clothing/home-feed

获取首页 Feed。

**认证**: 可选

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/clothing/home-feed?page=1&limit=20"
```

---

### POST /interactions

记录用户行为。

**认证**: 需要

**请求体**:

```json
{
  "clothingId": "uuid",
  "interactionType": "view",
  "durationMs": 5000,
  "context": { "source": "home_feed" }
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/interactions \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"clothingId":"uuid","interactionType":"view","durationMs":5000}'
```

---

## Stylist - AI造型师

### POST /stylist/sessions

创建 AI 造型师会话。

**认证**: 需要

**请求体**:

```json
{
  "title": "春季通勤穿搭"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/stylist/sessions \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"春季通勤穿搭"}'
```

---

### GET /stylist/sessions

获取会话列表。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/stylist/sessions \
  -H "Authorization: Bearer <access-token>"
```

---

### GET /stylist/sessions/:id

获取会话详情（含消息历史）。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/stylist/sessions/uuid-here \
  -H "Authorization: Bearer <access-token>"
```

---

### DELETE /stylist/sessions/:id

删除会话。

**认证**: 需要

**curl 示例**:

```bash
curl -X DELETE http://localhost:3001/api/v1/stylist/sessions/uuid-here \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /stylist/sessions/:id/messages

向 AI 造型师发送消息。

**认证**: 需要

**请求体**:

```json
{
  "content": "帮我搭配一套春季通勤穿搭，预算500左右"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/stylist/sessions/uuid-here/messages \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"帮我搭配一套春季通勤穿搭，预算500左右"}'
```

---

### GET /stylist/sessions/:id/stream

SSE 流式获取 AI 造型师回复。

**认证**: 需要

**curl 示例**:

```bash
curl -N http://localhost:3001/api/v1/stylist/sessions/uuid-here/stream \
  -H "Authorization: Bearer <access-token>"
```

---

## Avatar - Q版形象

### GET /avatar/templates

获取可用形象模板列表。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/avatar/templates \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /avatar/create

选择模板+参数创建 Q 版形象。

**认证**: 需要

**请求体**:

```json
{
  "templateId": "uuid",
  "avatarParams": {
    "faceShape": 0.5,
    "eyeShape": "round",
    "skinTone": "#F5D0A9",
    "hairStyle": "bob",
    "hairColor": "#3B2F2F"
  }
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/avatar/create \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"templateId":"uuid","avatarParams":{"faceShape":0.5,"eyeShape":"round","skinTone":"#F5D0A9","hairStyle":"bob","hairColor":"#3B2F2F"}}'
```

---

### GET /avatar/me

获取当前用户形象参数。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/avatar/me \
  -H "Authorization: Bearer <access-token>"
```

---

### PATCH /avatar/me

更新形象参数（脸型/发型/肤色等）。

**认证**: 需要

**请求体**:

```json
{
  "avatarParams": {
    "hairStyle": "long",
    "hairColor": "#1A1A2E"
  }
}
```

**curl 示例**:

```bash
curl -X PATCH http://localhost:3001/api/v1/avatar/me \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"avatarParams":{"hairStyle":"long","hairColor":"#1A1A2E"}}'
```

---

### POST /avatar/me/dress

换装（更新 clothing_map 颜色+类型映射）。

**认证**: 需要

**请求体**:

```json
{
  "clothingMap": {
    "top": { "color": "#FFFFFF", "type": "tshirt", "pattern": "solid" },
    "bottom": { "color": "#1A1A2E", "type": "jeans" },
    "shoes": { "color": "#000000", "type": "sneakers" }
  }
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/avatar/me/dress \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"clothingMap":{"top":{"color":"#FFFFFF","type":"tshirt"},"bottom":{"color":"#1A1A2E","type":"jeans"}}}'
```

---

### POST /avatar/me/thumbnail

客户端截图上传缩略图。

**认证**: 需要

**请求**: `multipart/form-data`，字段 `file` 为截图图片。

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/avatar/me/thumbnail \
  -H "Authorization: Bearer <access-token>" \
  -F "file=@/path/to/thumbnail.png"
```

---

## OutfitImage - 文生图搭配可视化

### POST /outfit-image/generate

根据搭配方案生成穿搭效果图。

**认证**: 需要

**请求体**:

```json
{
  "outfitData": {
    "occasion": "work",
    "items": [
      { "name": "白色衬衫", "slot": "top" },
      { "name": "黑色西裤", "slot": "bottom" }
    ],
    "styleTips": "简约通勤风"
  }
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "cost": 1
  }
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/outfit-image/generate \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"outfitData":{"occasion":"work","items":[{"name":"白色衬衫","slot":"top"},{"name":"黑色西裤","slot":"bottom"}]}}'
```

---

### GET /outfit-image/:id

获取生成结果。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/outfit-image/uuid-here \
  -H "Authorization: Bearer <access-token>"
```

---

### GET /outfit-image/history

获取历史记录。

**认证**: 需要

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/outfit-image/history?page=1&limit=20" \
  -H "Authorization: Bearer <access-token>"
```

---

## Customize - 服装定制

### GET /customize/templates

获取可定制产品模板。

**认证**: 需要

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| productType | string | 产品类型过滤 |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/customize/templates?productType=tshirt" \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /customize/designs

保存设计。

**认证**: 需要

**请求体**:

```json
{
  "name": "我的星空T恤",
  "productType": "tshirt",
  "designData": {
    "patternUrl": "https://cdn.aineed.com/patterns/xxx.png",
    "position": { "x": 150, "y": 200 },
    "scale": 1.0,
    "rotation": 0,
    "tileMode": "none",
    "opacity": 1.0
  },
  "tags": ["星空", "创意"]
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/customize/designs \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"我的星空T恤","productType":"tshirt","designData":{"patternUrl":"https://cdn.aineed.com/patterns/xxx.png","position":{"x":150,"y":200},"scale":1.0,"rotation":0,"tileMode":"none","opacity":1.0}}'
```

---

### GET /customize/designs

获取我的设计列表。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/customize/designs \
  -H "Authorization: Bearer <access-token>"
```

---

### GET /customize/designs/:id

获取设计详情。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/customize/designs/uuid-here \
  -H "Authorization: Bearer <access-token>"
```

---

### PATCH /customize/designs/:id

更新设计。

**认证**: 需要

**请求体**: 同创建，字段可选。

**curl 示例**:

```bash
curl -X PATCH http://localhost:3001/api/v1/customize/designs/uuid-here \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"更新后的名称"}'
```

---

### DELETE /customize/designs/:id

删除设计。

**认证**: 需要

**curl 示例**:

```bash
curl -X DELETE http://localhost:3001/api/v1/customize/designs/uuid-here \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /customize/designs/:id/preview

渲染预览图。

**认证**: 需要

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/customize/designs/uuid-here/preview \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /customize/designs/:id/publish

发布到设计市集（免费分享）。

**认证**: 需要

**请求体**:

```json
{
  "tags": ["创意", "星空"]
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/customize/designs/uuid-here/publish \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"tags":["创意","星空"]}'
```

---

## CustomOrder - 定制订单

### POST /custom-orders

创建定制订单（EPROLO 全 Mock）。

**认证**: 需要

**请求体**:

```json
{
  "designId": "uuid",
  "productType": "tshirt",
  "material": "cotton",
  "size": "M",
  "quantity": 1,
  "shippingAddress": {
    "name": "张三",
    "phone": "13800138000",
    "province": "北京市",
    "city": "北京市",
    "district": "朝阳区",
    "detail": "某某街道某某号",
    "postalCode": "100000"
  }
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/custom-orders \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"designId":"uuid","productType":"tshirt","material":"cotton","size":"M","quantity":1,"shippingAddress":{"name":"张三","phone":"13800138000","province":"北京市","city":"北京市","district":"朝阳区","detail":"某某街道某某号"}}'
```

---

### GET /custom-orders

获取我的订单列表。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/custom-orders \
  -H "Authorization: Bearer <access-token>"
```

---

### GET /custom-orders/:id

获取订单详情。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/custom-orders/uuid-here \
  -H "Authorization: Bearer <access-token>"
```

---

### PATCH /custom-orders/:id/cancel

取消订单。

**认证**: 需要

**curl 示例**:

```bash
curl -X PATCH http://localhost:3001/api/v1/custom-orders/uuid-here/cancel \
  -H "Authorization: Bearer <access-token>"
```

---

## DesignMarket - 设计市集

### GET /market/designs

市集设计列表。

**认证**: 可选

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| productType | string | 产品类型过滤 |
| sortBy | string | 排序: latest / popular |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/market/designs?page=1&limit=20&sortBy=popular"
```

---

### GET /market/designs/:id

设计详情。

**认证**: 可选

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/market/designs/uuid-here
```

---

### POST /market/designs/:id/like

点赞设计。

**认证**: 需要

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/market/designs/uuid-here/like \
  -H "Authorization: Bearer <access-token>"
```

---

### GET /market/designs/:id/reviews

设计评价列表。

**认证**: 可选

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/market/designs/uuid-here/reviews
```

---

### POST /market/designs/:id/report

举报侵权（AI 预审）。

**认证**: 需要

**请求体**:

```json
{
  "reason": "copyright",
  "description": "该设计涉嫌抄袭某品牌Logo"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/market/designs/uuid-here/report \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"copyright","description":"该设计涉嫌抄袭某品牌Logo"}'
```

---

## Bespoke - 高端私人定制

### GET /bespoke/studios

工作室列表（分类+排序）。

**认证**: 可选

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| city | string | 城市过滤 |
| specialty | string | 专长过滤 |
| sortBy | string | 排序: rating / orders / latest |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/bespoke/studios?city=北京&sortBy=rating&page=1&limit=20"
```

---

### GET /bespoke/studios/:id

工作室详情（作品集+服务+评价）。

**认证**: 可选

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/bespoke/studios/uuid-here
```

---

### POST /bespoke/orders

提交定制需求（照片+描述+预算）。

**认证**: 需要

**请求体**:

```json
{
  "studioId": "uuid",
  "title": "定制一套西装",
  "description": "需要一套深蓝色商务西装，适合秋季穿着",
  "referenceImages": ["https://cdn.aineed.com/ref/1.jpg"],
  "budgetRange": "3000-8000",
  "deadline": "2026-06-01"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/bespoke/orders \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"studioId":"uuid","title":"定制一套西装","description":"需要一套深蓝色商务西装","budgetRange":"3000-8000"}'
```

---

### GET /bespoke/orders

我的定制订单列表。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/bespoke/orders \
  -H "Authorization: Bearer <access-token>"
```

---

### GET /bespoke/orders/:id

定制订单详情。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/bespoke/orders/uuid-here \
  -H "Authorization: Bearer <access-token>"
```

---

### GET /bespoke/orders/:id/messages

获取沟通记录。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/bespoke/orders/uuid-here/messages \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /bespoke/orders/:id/message

与工作室沟通（复用私信）。

**认证**: 需要

**请求体**:

```json
{
  "content": "请问面料可以换成羊毛的吗？",
  "messageType": "text"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/bespoke/orders/uuid-here/message \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"请问面料可以换成羊毛的吗？","messageType":"text"}'
```

---

### GET /bespoke/orders/:id/quote

查看报价。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/bespoke/orders/uuid-here/quote \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /bespoke/orders/:id/accept-quote

接受报价并支付。

**认证**: 需要

**请求体**:

```json
{
  "paymentMethod": "wechat"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/bespoke/orders/uuid-here/accept-quote \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"wechat"}'
```

---

### PATCH /bespoke/orders/:id/cancel

取消定制。

**认证**: 需要

**请求体**:

```json
{
  "cancelReason": "预算不合适"
}
```

**curl 示例**:

```bash
curl -X PATCH http://localhost:3001/api/v1/bespoke/orders/uuid-here/cancel \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"cancelReason":"预算不合适"}'
```

---

### POST /bespoke/studios

工作室入驻申请。

**认证**: 需要

**请求体**:

```json
{
  "name": "匠心工作室",
  "city": "北京",
  "specialties": ["西装", "旗袍"],
  "serviceTypes": ["量身定制", "面料选购"],
  "priceRange": "3000-8000",
  "description": "专注高端定制20年"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/bespoke/studios \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"匠心工作室","city":"北京","specialties":["西装","旗袍"],"serviceTypes":["量身定制"],"priceRange":"3000-8000"}'
```

---

### PATCH /bespoke/studios/:id

更新工作室信息（需 JWT+所有者）。

**认证**: 需要（工作室所有者）

**请求体**: 部分更新字段。

**curl 示例**:

```bash
curl -X PATCH http://localhost:3001/api/v1/bespoke/studios/uuid-here \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"description":"更新后的描述"}'
```

---

### POST /bespoke/studios/:id/review

评价工作室。

**认证**: 需要

**请求体**:

```json
{
  "rating": 5,
  "content": "非常满意，做工精细",
  "images": ["https://cdn.aineed.com/review/1.jpg"],
  "isAnonymous": false
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/bespoke/studios/uuid-here/review \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"rating":5,"content":"非常满意，做工精细","isAnonymous":false}'
```

---

### POST /bespoke/orders/:id/quotes

工作室提交报价（需 JWT+工作室所有者）。

**认证**: 需要（工作室角色）

**请求体**:

```json
{
  "items": [
    { "name": "面料费", "description": "意大利进口羊毛", "quantity": 1, "unitPrice": 300000, "subtotal": 300000 },
    { "name": "手工费", "description": "裁剪+缝制", "quantity": 1, "unitPrice": 200000, "subtotal": 200000 }
  ],
  "estimatedDays": 14,
  "validUntil": "2026-05-01T00:00:00Z",
  "notes": "含一次试穿调整"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/bespoke/orders/uuid-here/quotes \
  -H "Authorization: Bearer <studio-token>" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"name":"面料费","quantity":1,"unitPrice":300000,"subtotal":300000}],"estimatedDays":14}'
```

---

### GET /bespoke/studio/orders

工作室收到的新订单（需 JWT+工作室角色）。

**认证**: 需要（工作室角色）

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/bespoke/studio/orders \
  -H "Authorization: Bearer <studio-token>"
```

---

### PATCH /bespoke/studio/orders/:id/status

工作室更新订单状态（需 JWT+工作室角色）。

**认证**: 需要（工作室角色）

**请求体**:

```json
{
  "status": "in_progress",
  "note": "已开始裁剪"
}
```

**curl 示例**:

```bash
curl -X PATCH http://localhost:3001/api/v1/bespoke/studio/orders/uuid-here/status \
  -H "Authorization: Bearer <studio-token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress","note":"已开始裁剪"}'
```

---

## BodyAnalysis - 体型分析

### POST /body-analysis/analyze

上传照片分析体型。

**认证**: 需要

**请求**: `multipart/form-data`，字段 `file` 为全身照。

**响应**:

```json
{
  "success": true,
  "data": {
    "bodyType": "hourglass",
    "colorSeason": "autumn",
    "measurements": { "shoulderWidth": 38, "waistCircumference": 68 },
    "confidence": 0.85,
    "recommendations": ["适合A字裙", "推荐V领上衣"]
  }
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/body-analysis/analyze \
  -H "Authorization: Bearer <access-token>" \
  -F "file=@/path/to/body-photo.jpg"
```

---

### GET /body-analysis/profile

获取体型档案。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/body-analysis/profile \
  -H "Authorization: Bearer <access-token>"
```

---

## Wardrobe - 衣橱

### GET /wardrobe

获取我的衣橱。

**认证**: 需要

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| category | string | 分类过滤 |
| color | string | 颜色过滤 |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/wardrobe?page=1&limit=20" \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /wardrobe

添加到衣橱。

**认证**: 需要

**请求体**:

```json
{
  "clothingId": "uuid",
  "customName": "我最爱的白T",
  "notes": "2024年夏季购入"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/wardrobe \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"clothingId":"uuid","customName":"我最爱的白T"}'
```

---

### GET /wardrobe/stats

衣橱统计。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/wardrobe/stats \
  -H "Authorization: Bearer <access-token>"
```

---

### DELETE /wardrobe/:id

从衣橱移除。

**认证**: 需要

**curl 示例**:

```bash
curl -X DELETE http://localhost:3001/api/v1/wardrobe/uuid-here \
  -H "Authorization: Bearer <access-token>"
```

---

## Favorites - 收藏

### POST /favorites

收藏/取消收藏（切换）。

**认证**: 需要

**请求体**:

```json
{
  "targetType": "clothing",
  "targetId": "uuid"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/favorites \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"targetType":"clothing","targetId":"uuid"}'
```

---

### GET /favorites

收藏列表。

**认证**: 需要

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| targetType | string | 类型过滤: clothing / outfit / post / design |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/favorites?targetType=clothing&page=1&limit=20" \
  -H "Authorization: Bearer <access-token>"
```

---

## Community - 社区

### GET /community/posts

帖子信息流。

**认证**: 可选

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |
| tag | string | 标签过滤 |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/community/posts?page=1&limit=20"
```

---

### POST /community/posts

发帖。

**认证**: 需要

**请求体**:

```json
{
  "title": "今日穿搭分享",
  "content": "春天到了，分享一套通勤穿搭",
  "imageUrls": ["https://cdn.aineed.com/posts/1.jpg"],
  "tags": ["通勤", "春季"],
  "outfitId": "uuid"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/community/posts \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"今日穿搭分享","content":"春天到了，分享一套通勤穿搭","tags":["通勤","春季"]}'
```

---

### GET /community/posts/:id

帖子详情。

**认证**: 可选

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/community/posts/uuid-here
```

---

### DELETE /community/posts/:id

删除帖子。

**认证**: 需要（帖子作者）

**curl 示例**:

```bash
curl -X DELETE http://localhost:3001/api/v1/community/posts/uuid-here \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /community/posts/:id/like

点赞帖子。

**认证**: 需要

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/community/posts/uuid-here/like \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /community/posts/:id/comment

评论帖子。

**认证**: 需要

**请求体**:

```json
{
  "content": "好好看！求链接",
  "parentId": null
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/community/posts/uuid-here/comment \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"好好看！求链接"}'
```

---

### GET /community/posts/:id/comments

评论列表。

**认证**: 可选

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/community/posts/uuid-here/comments
```

---

### POST /community/posts/:id/share

分享帖子。

**认证**: 需要

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/community/posts/uuid-here/share \
  -H "Authorization: Bearer <access-token>"
```

---

## Social - 社交

### POST /social/follow/:userId

关注用户。

**认证**: 需要

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/social/follow/uuid-here \
  -H "Authorization: Bearer <access-token>"
```

---

### DELETE /social/follow/:userId

取消关注。

**认证**: 需要

**curl 示例**:

```bash
curl -X DELETE http://localhost:3001/api/v1/social/follow/uuid-here \
  -H "Authorization: Bearer <access-token>"
```

---

### GET /social/followers

粉丝列表。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/social/followers \
  -H "Authorization: Bearer <access-token>"
```

---

### GET /social/following

关注列表。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/social/following \
  -H "Authorization: Bearer <access-token>"
```

---

### GET /social/users/:id/profile

用户主页。

**认证**: 可选

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/social/users/uuid-here/profile
```

---

## Messaging - 私信

### GET /messages/rooms

会话列表。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/messages/rooms \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /messages/rooms

创建会话。

**认证**: 需要

**请求体**:

```json
{
  "participantIds": ["uuid-1", "uuid-2"]
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/messages/rooms \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"participantIds":["uuid-1","uuid-2"]}'
```

---

### GET /messages/rooms/:id

消息历史。

**认证**: 需要

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/messages/rooms/uuid-here?page=1&limit=50" \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /messages/rooms/:id

发送消息。

**认证**: 需要

**请求体**:

```json
{
  "content": "你好！",
  "messageType": "text"
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/messages/rooms/uuid-here \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"你好！","messageType":"text"}'
```

---

## Notification - 通知

### GET /notifications

通知列表。

**认证**: 需要

**查询参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| limit | number | 每页数量 |

**curl 示例**:

```bash
curl "http://localhost:3001/api/v1/notifications?page=1&limit=20" \
  -H "Authorization: Bearer <access-token>"
```

---

### PATCH /notifications/:id/read

标记已读。

**认证**: 需要

**curl 示例**:

```bash
curl -X PATCH http://localhost:3001/api/v1/notifications/uuid-here/read \
  -H "Authorization: Bearer <access-token>"
```

---

### PATCH /notifications/read-all

全部标记已读。

**认证**: 需要

**curl 示例**:

```bash
curl -X PATCH http://localhost:3001/api/v1/notifications/read-all \
  -H "Authorization: Bearer <access-token>"
```

---

## Upload - 上传

### POST /upload/image

上传图片。

**认证**: 需要

**请求**: `multipart/form-data`，字段 `file` 为图片文件。

**响应**:

```json
{
  "success": true,
  "data": {
    "url": "https://cdn.aineed.com/uploads/xxx.jpg",
    "key": "uploads/xxx.jpg"
  }
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/upload/image \
  -H "Authorization: Bearer <access-token>" \
  -F "file=@/path/to/image.jpg"
```

---

## Outfit - 搭配方案

### POST /outfits

创建搭配方案。

**认证**: 需要

**请求体**:

```json
{
  "name": "春季通勤",
  "description": "简约优雅的春季通勤搭配",
  "occasion": "work",
  "season": "spring",
  "styleTags": ["minimalist", "elegant"],
  "isPublic": false
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/outfits \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"春季通勤","occasion":"work","season":"spring","styleTags":["minimalist"]}'
```

---

### GET /outfits

我的搭配列表。

**认证**: 需要

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/outfits \
  -H "Authorization: Bearer <access-token>"
```

---

### GET /outfits/:id

搭配详情（含 items）。

**认证**: 可选

**curl 示例**:

```bash
curl http://localhost:3001/api/v1/outfits/uuid-here
```

---

### PATCH /outfits/:id

更新搭配。

**认证**: 需要

**curl 示例**:

```bash
curl -X PATCH http://localhost:3001/api/v1/outfits/uuid-here \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"更新后的搭配名"}'
```

---

### DELETE /outfits/:id

删除搭配。

**认证**: 需要

**curl 示例**:

```bash
curl -X DELETE http://localhost:3001/api/v1/outfits/uuid-here \
  -H "Authorization: Bearer <access-token>"
```

---

### POST /outfits/:id/items

添加服装到搭配。

**认证**: 需要

**请求体**:

```json
{
  "clothingId": "uuid",
  "slot": "top",
  "sortOrder": 1
}
```

**curl 示例**:

```bash
curl -X POST http://localhost:3001/api/v1/outfits/uuid-here/items \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"clothingId":"uuid","slot":"top","sortOrder":1}'
```

---

### DELETE /outfits/:id/items/:itemId

从搭配移除服装。

**认证**: 需要

**curl 示例**:

```bash
curl -X DELETE http://localhost:3001/api/v1/outfits/uuid-here/items/item-uuid \
  -H "Authorization: Bearer <access-token>"
```

---

## Search - 搜索

搜索接口通过 `GET /clothing/search` 实现（见 Clothing 模块）。

---

## Knowledge - 知识图谱

知识图谱端点由 Neo4j 驱动，提供时尚规则查询。

---

## Recommendation - 推荐引擎

推荐接口通过 `GET /clothing/recommend` 实现（见 Clothing 模块）。

---

## Embedding - 向量嵌入

向量嵌入服务端点，用于 FashionCLIP+BGE-M3 向量生成。

---

## Admin - 管理员

管理员 CRUD 端点，需要 Admin 角色 JWT。

### 分类管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/categories | 分类列表 |
| POST | /admin/categories | 创建分类 |
| PATCH | /admin/categories/:id | 更新分类 |
| DELETE | /admin/categories/:id | 删除分类 |

### 品牌管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/brands | 品牌列表 |
| POST | /admin/brands | 创建品牌 |
| PATCH | /admin/brands/:id | 更新品牌 |
| DELETE | /admin/brands/:id | 删除品牌 |

### 风格规则管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/style-rules | 风格规则列表 |
| POST | /admin/style-rules | 创建风格规则 |
| PATCH | /admin/style-rules/:id | 更新风格规则 |
| DELETE | /admin/style-rules/:id | 删除风格规则 |

### 产品模板管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/product-templates | 产品模板列表 |
| POST | /admin/product-templates | 创建产品模板 |
| PATCH | /admin/product-templates/:id | 更新产品模板 |
| DELETE | /admin/product-templates/:id | 删除产品模板 |

**curl 示例**（创建分类）:

```bash
curl -X POST http://localhost:3001/api/v1/admin/categories \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"T恤","nameEn":"T-Shirt","slug":"tshirt"}'
```
