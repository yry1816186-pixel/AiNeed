# Phase 3: 虚拟试衣 - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Source:** Auto-generated from ROADMAP.md + REQUIREMENTS.md + codebase analysis

<domain>
## Phase Boundary

用户上传照片后，通过 Doubao-Seedream API 看到自己穿推荐服装的效果图。包含：
- 照片上传与自动修复
- Doubao-Seedream 主生成 + GLM 图生图降级备选
- WebSocket + 轮询双重进度获取
- 30 秒超时保障
- 智能缓存（Redis + DB 双层）
- 结果持久化、分享、对比
- 每日免费重试限制（3次）

已有骨架：TryOnModule（controller/service/orchestrator/provider）、BullMQ 队列处理、WebSocket 通知、Prisma VirtualTryOn 模型、移动端 TryOnScreen。
</domain>

<decisions>
## Implementation Decisions

### 生成 API
- Doubao-Seedream 为主生成 API（用户照片 + 商品图片 + 文字辅助描述 → 换装效果图）
- GLM 图生图为降级备选（Doubao-Seedream 不可用时自动降级）
- CloudTryOnProvider 当前指向 fashn.ai，需替换为 Doubao-Seedream
- LocalPreviewTryOnProvider 作为最低保底（sharp 合成预览图）

### 照片处理
- 推荐上传正面全身照，允许半身照/自拍等其他类型（VTO-01）
- 照片质量不佳时自动修复（背景移除/增强处理）（VTO-02）
- 复用 Phase 1 已有的 photo_quality_analyzer 和 reference_line_generator

### 进度与超时
- WebSocket + 轮询双重进度获取（VTO-06）
- 30 秒内返回结果，超时有降级提示（VTO-06）
- 移动端已有 wsService.onTryOnComplete + setInterval 轮询
- 后端已有 NotificationGateway + NotificationService

### 缓存策略
- 同一用户照片 + 服装组合有结果缓存（VTO-09）
- Redis 缓存（TTL 24h）+ DB 缓存（completed 记录）
- 已有 generateStableCacheKey 和 Redis 缓存逻辑

### 重试与限制
- 用户不满意可免费重试，每日限制 3 次（VTO-07）
- 重试时自动调整生成参数
- 已有 AiQuotaGuard + SetQuotaType('try-on')

### 结果管理
- 试衣结果自动保存到历史记录和灵感衣橱（VTO-08）
- 支持按日期/服装/场景分类查看
- 原图对比与多方案对比（VTO-11）
- 多平台分享（VTO-10）
- MinIO 对象存储 + CDN 加速（VTO-12）

### Claude's Discretion
- Doubao-Seedream API 具体调用参数和格式
- GLM 图生图降级的具体 prompt 设计
- 照片自动修复的具体实现方案
- 每日重试限制的存储方式（Redis vs DB）
- 分享功能的具体实现
- 对比交互的具体 UI 实现
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend Try-On Module
- `apps/backend/src/modules/try-on/try-on.service.ts` — 核心服务，创建请求/查询状态/历史
- `apps/backend/src/modules/try-on/try-on.controller.ts` — REST API 端点
- `apps/backend/src/modules/try-on/try-on.module.ts` — 模块注册
- `apps/backend/src/modules/try-on/services/ai-tryon-provider.interface.ts` — Provider 接口和缓存 key
- `apps/backend/src/modules/try-on/services/cloud-tryon.provider.ts` — 云端 Provider（需替换为 Doubao-Seedream）
- `apps/backend/src/modules/try-on/services/local-preview.provider.ts` — 本地预览 Provider
- `apps/backend/src/modules/try-on/services/tryon-orchestrator.service.ts` — 编排器（provider 选择 + 缓存）

### Queue & Processing
- `apps/backend/src/modules/queue/queue.service.ts` — BullMQ 任务入队
- `apps/backend/src/modules/queue/queue.processor.ts` — VirtualTryOnProcessor 处理逻辑
- `apps/backend/src/modules/queue/queue.constants.ts` — 队列名常量

### WebSocket & Notifications
- `apps/backend/src/common/gateway/notification.gateway.ts` — WebSocket 网关
- `apps/backend/src/common/gateway/notification.service.ts` — 通知服务

### Database
- `apps/backend/prisma/schema.prisma` — VirtualTryOn 模型定义

### ML Service
- `ml/api/main.py` — FastAPI 入口
- `ml/api/config.py` — 配置（GLM API key 等）
- `ml/services/visual_outfit_service.py` — 穿搭可视化（含虚拟试衣 TODO）
- `ml/services/degradation_service.py` — 降级管理器

### Mobile
- `apps/mobile/src/components/screens/TryOnScreen.tsx` — 试衣页面
- `apps/mobile/src/screens/VirtualTryOnScreen.tsx` — 页面包装器
- `apps/mobile/src/services/api/tryon.api.ts` — API 调用层
- `apps/mobile/src/services/websocket.ts` — WebSocket 服务

### Security
- `apps/backend/src/modules/security/rate-limit/ai-quota.guard.ts` — AI 配额守卫
</canonical_refs>

<specifics>
## Specific Ideas

- Doubao-Seedream API: 豆包(字节跳动)的图像生成 API，支持图生图换装
- GLM 图生图: 智谱 AI 的多模态 API，可作为降级备选
- 现有 CloudTryOnProvider 使用 opossum 熔断器，可直接复用熔断逻辑
- VirtualTryOnProcessor 已有完整的处理流程：更新状态→执行→保存结果→通知
- 移动端 TryOnScreen 已有完整的 UI：照片选择→进度→结果对比
- Prisma VirtualTryOn 模型已有：status/resultImageUrl/provider/processingTime/confidence/errorMessage
</specifics>

<deferred>
## Deferred Ideas

- 3D 虚拟试衣（v3 探索）
- 本地 ML 推理（CatVTON/SASRec/DensePose，已决定用 API 替代）
- 完整 CDN 加速配置（需基础设施支持）
</deferred>

---
*Phase: 03-virtual-try-on*
*Context gathered: 2026-04-14 via auto-generated from ROADMAP + REQUIREMENTS + codebase*
