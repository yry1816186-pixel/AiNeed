# Phase 3: 虚拟试衣 - Research

**Gathered:** 2026-04-14
**Status:** Research complete

## 1. 现有骨架分析

### 后端（完整度 ~70%）
- **TryOnModule**: controller + service + orchestrator + 2 providers
- **CloudTryOnProvider**: 当前指向 fashn.ai，使用 opossum 熔断器，需替换为 Doubao-Seedream
- **LocalPreviewTryOnProvider**: sharp 合成预览图（confidence=0.42），作为最低保底
- **TryOnOrchestratorService**: provider 选择 + Redis 缓存（TTL 24h）
- **VirtualTryOnProcessor**: BullMQ 处理器（concurrency=1），完整流程：更新状态→执行→保存→通知
- **NotificationGateway**: WebSocket 推送 `try_on_complete` 事件
- **Prisma VirtualTryOn**: status/resultImageUrl/provider/processingTime/confidence/errorMessage
- **AiQuotaGuard**: 已有 `try-on` 配额类型

### 移动端（完整度 ~60%）
- **TryOnScreen**: 完整 UI（照片选择→进度→结果对比→分享按钮）
- **tryOnApi**: create/getStatus/getHistory
- **wsService**: WebSocket 连接 + try_on_complete 事件监听
- **轮询**: 3s 间隔，最多 60 次

### ML 服务（完整度 ~20%）
- **visual_outfit_service.py**: 有虚拟试衣 TODO，当前指向 IDM-VTON
- **degradation_service.py**: 完整降级管理器（CircuitBreaker + FallbackHandler）
- **config.py**: 已有 GLM_API_KEY/ZHIPU_API_KEY 配置

## 2. Doubao-Seedream API

### API 端点
- **提交任务**: `POST https://visual.volcengineapi.com/v1/aigc/generate`
- **查询结果**: `GET https://visual.volcengineapi.com/v1/aigc/result/{task_id}`
- **模型**: `doubao-seedream-3-0-t2i-250415`

### 请求格式（图生图换装）
```json
{
  "req_key": "high_aes_general_v21_L",
  "model": "doubao-seedream-3-0-t2i-250415",
  "parameters": {
    "image": "<base64_person_image>",
    "ref_image": "<base64_garment_image>",
    "prompt": "穿着这件衣服的人物照片，保持人物面部和姿势不变",
    "strength": 0.75,
    "seed": -1
  }
}
```

### 响应格式（异步）
```json
{
  "code": 200,
  "data": {
    "task_id": "img-gen-xxx",
    "status": "processing"
  }
}
```

### 结果查询
```json
{
  "code": 200,
  "data": {
    "task_id": "img-gen-xxx",
    "status": "succeeded",
    "results": [
      {
        "url": "https://...",
        "width": 1024,
        "height": 1024
      }
    ]
  }
}
```

### 关键特性
- 异步模式：提交→轮询结果
- 支持 URL 或 base64 图片输入
- 429 限流、401 认证失败、400 内容违规、500 服务器错误
- 已有 test fixture: `apps/backend/test/fixtures/ai-responses/doubao-seedream.json`

## 3. GLM 图生图降级

### 方案 A: GLM-4V + CogView 组合
1. GLM-4V 分析人物照片和服装图片，生成换装文字描述
2. CogView-3-Plus 根据描述生成效果图
- 优点：利用现有 GLM API
- 缺点：两步调用，效果不如直接图生图

### 方案 B: GLM-4V 编辑模式（推荐）
- GLM-4V 支持多图输入 + 文字指令
- Prompt: "请将第二张图片中的服装穿在第一张图片的人物身上，保持人物面部不变"
- 优点：单次调用，简单直接
- 缺点：效果可能不如专业换装 API

### 推荐：方案 B 作为降级，因为更简单且复用现有 GLM API

## 4. 30 秒超时保障架构

### 当前瓶颈
- VirtualTryOnProcessor concurrency=1
- CloudTryOnProvider timeout=120s
- API 调用本身可能 10-20s

### 优化方案
1. **提升并发**: concurrency 1→3
2. **API 超时**: 120s→25s（Doubao-Seedream 通常 8-15s 返回）
3. **分级降级**:
   - 0-15s: Doubao-Seedream
   - 15-25s: GLM 图生图
   - 25-30s: LocalPreview（已有）
4. **前端超时**: 30s 后显示降级提示
5. **进度推送**: WebSocket 实时推送处理阶段

## 5. 照片自动修复

### 方案
- **背景移除**: Python `rembg` 库（基于 U2-Net）或调用 API
- **图像增强**: Python `Pillow` + `opencv-python`（亮度/对比度/锐化）
- **集成位置**: ML 服务新增 `/api/v1/photo/enhance` 端点
- **触发条件**: photo_quality_analyzer 评分低于阈值时自动触发

### 轻量替代
- 直接在 Doubao-Seedream prompt 中加入"简洁背景"指令
- 使用 CloudTryOnProvider 的 fetchImageAsBase64 预处理

## 6. 每日重试限制

### 方案: Redis + DB 双层
- **Redis**: `tryon:daily:{userId}:{date}` → 计数器，TTL 到当天结束
- **DB**: VirtualTryOn 表按日期统计（兜底）
- **限制**: 每日 3 次免费重试（已有 AiQuotaGuard 基础）

## 7. 分享功能

### React Native 实现
- **react-native-share**: 通用分享（系统分享菜单）
- **react-native-view-shot**: 截取带水印的分享图
- **微信 SDK**: `react-native-wechat-lib`（需微信开放平台 AppID）
- **保存相册**: `react-native-fs` + `CameraRoll`

### 水印图生成
- 前端用 ViewShot 截取结果区域 + 水印叠加层
- 或后端用 Sharp 生成带水印版本

## 8. 多方案对比

### 数据模型
- VirtualTryOn 已支持多个记录（同一 photoId + 不同 itemId）
- 需新增"对比组"概念：一组试衣结果可并排对比

### 前端实现
- TryOnScreen 结果区域改为 ScrollView 横向滑动
- 支持选择 2-4 个结果进入对比模式

## Validation Architecture

### 关键验证点
1. Doubao-Seedream API 调用成功率和响应时间
2. GLM 降级切换的熔断器行为
3. 30 秒超时保障的实际达成率
4. 缓存命中率
5. 每日重试限制的准确性
6. WebSocket 推送的可靠性
7. 分享功能的平台兼容性

---
*Phase: 03-virtual-try-on*
*Research completed: 2026-04-14*
