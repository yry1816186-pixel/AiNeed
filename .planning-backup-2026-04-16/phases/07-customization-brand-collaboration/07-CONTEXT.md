# Phase 7: 定制服务 & 品牌合作 - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

提供个性化服装定制服务（2D 模板编辑器 + 完整定制流程）和品牌合作能力（专属二维码扫码导入 + 品牌管理后台），拓展商业模式。

覆盖需求：CUS-01 ~ CUS-10 (10 条)

</domain>

<decisions>
## Implementation Decisions

### 2D 定制编辑器
- **D-01:** 技术选型为 Fabric.js — 成熟的 Canvas 库，内置拖拽/旋转/缩放/图层管理，React Native 可通过 WebView 封装使用
- **D-02:** MVP 支持 5-6 种常见商品类型模板 — T恤/帽子/鞋子/包包/手机壳等，覆盖最常见定制场景
- **D-03:** 预览效果使用 GLM AI 生成逼真效果图 — 用户完成设计后调用 GLM 图生图 API 将设计渲染到商品上
- **D-04:** 完整编辑器操作 — 拖拽定位 + 缩放 + 旋转 + 文字添加 + 颜色调整 + 图层管理 + 滤镜 + 裁剪
- **D-05:** 全屏沉浸式布局 — 类似 Canva 的编辑体验，底部工具栏，专注设计
- **D-06:** 模板来源为平台预设 + 社区模板 — 平台提供基础模板，用户可分享设计为社区模板

### 定制流程 & 报价
- **D-07:** 自动报价 — 基于商品类型 + 图案复杂度 + 材质自动计算报价，即时返回
- **D-08:** 定金 + 尾款支付模式 — 用户确认报价后先付定金，制作完成后付尾款
- **D-09:** AiNeed 专属包装 — 专属包装盒 + 感谢卡 + 品牌贴纸，提升开箱仪式感
- **D-10:** 全流程通知 — 每个状态变更（报价→确认→制作→发货→送达）都推送通知

### 品牌扫码导入
- **D-11:** 二维码采用完整数据编码 — 包含品牌 + 商品 + 尺码 + 颜色等信息，离线可读基本信息
- **D-12:** 双入口扫码 — 衣橱页 + 首页都有扫码入口
- **D-13:** 预览后手动添加 — 扫码后展示商品详情，用户确认后添加到衣橱
- **D-14:** 服务端实时拉取品牌数据 — 扫码后从服务器获取最新完整商品数据（尺码表/材质/搭配建议）

### 品牌管理后台
- **D-15:** 双模块协作架构 — merchant 模块管理通用商家功能，新建 brand-portal 模块管理品牌合作专属功能，通过 brandId 关联
- **D-16:** 核心三件套功能 — 商品数据管理 + 扫码统计 + 用户偏好分析
- **D-17:** 独立 Web 后台 — 品牌方通过独立 Web 端操作管理后台，不嵌入 App

### Claude's Discretion
- 编辑器内各工具的具体 UI 设计和交互细节
- 自动报价算法的具体参数和权重
- 定金/尾款的比例（建议 30%/70%）
- 专属包装的具体设计方案
- 社区模板的审核和展示机制

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 现有代码 — 定制服务
- `apps/backend/src/modules/customization/customization.controller.ts` — 已有定制需求 CRUD API（创建/提交/选择报价/取消）
- `apps/backend/src/modules/customization/customization.service.ts` — 已有定制需求业务逻辑
- `apps/backend/prisma/schema.prisma` §CustomizationRequest — 定制需求数据模型（type/title/description/referenceImages/preferences/status/quotes）
- `apps/backend/prisma/schema.prisma` §CustomizationQuote — 定制报价数据模型（provider/price/estimatedDays/description/terms）

### 现有代码 — 品牌与商家
- `apps/backend/src/modules/brands/brands.controller.ts` — 品牌列表/详情/商品 API
- `apps/backend/src/modules/brands/brands.service.ts` — 品牌业务逻辑 + PII 加密
- `apps/backend/src/modules/merchant/merchant.controller.ts` — 商家入驻/登录/商品管理/数据看板/结算/趋势/用户画像
- `apps/backend/src/modules/merchant/merchant.service.ts` — 商家业务逻辑（入驻/商品CRUD/数据看板/趋势/用户画像洞察）
- `apps/backend/prisma/schema.prisma` §Brand — 品牌数据模型（name/slug/categories/priceRange/contactEmail/contactPhone/businessLicense/verified）
- `apps/backend/prisma/schema.prisma` §BrandMerchant — 商家账号模型（email/password/name/role/brandId）
- `apps/backend/prisma/schema.prisma` §BrandSettlement — 品牌结算模型

### 现有代码 — 支付与订单
- `apps/backend/src/modules/order/` — 订单模块骨架
- `apps/backend/src/modules/payment/` — 支付模块（支付宝/微信支付）

### 需求文档
- `.planning/REQUIREMENTS.md` §Phase 7 — CUS-01 ~ CUS-10 完整需求定义

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CustomizationService`: 已有完整的定制需求 CRUD + 报价选择逻辑，可直接扩展
- `BrandsService`: 已有品牌列表/详情/商品查询 + PII 加密/解密，品牌管理后台可复用
- `MerchantService`: 已有商家入驻/登录/商品管理/数据看板/趋势/用户画像洞察，是品牌后台的基础
- `MerchantAuthGuard`: 已有商家认证守卫，品牌后台可复用
- `EncryptionService`: 已有 PII 加密服务
- `PrismaService`: 数据库访问层

### Established Patterns
- NestJS 模块化架构：每个功能域一个 module/controller/service
- Prisma ORM + PostgreSQL：数据模型定义在 schema.prisma
- JWT + Guard 认证模式
- PII 字段加密存储模式
- 分页查询模式（page/limit/total/totalPages）

### Integration Points
- 定制编辑器 → CustomizationService（创建定制需求）
- 定制预览 → GLM API（图生图）
- 品牌扫码 → BrandsService（品牌数据）+ ClothingService（商品数据）
- 品牌后台 → MerchantService（商家功能）+ 新建 BrandPortalService
- 支付 → PaymentService（支付宝/微信支付）
- 订单 → OrderService（订单管理）
- 通知 → 需要通知系统（目前 Out of Scope，可用 WebSocket 推送）

</code_context>

<specifics>
## Specific Ideas

- 编辑器体验参考 Canva 的全屏沉浸式设计
- 定制流程参考 Printful 的定制体验
- 二维码需要包含完整商品数据（品牌/尺码/颜色/材质/价格）
- 专属包装要体现 AiNeed 品牌感（包装盒+感谢卡+品牌贴纸）
- 社区模板让用户分享设计，形成模板生态

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-customization-brand-collaboration*
*Context gathered: 2026-04-14*
