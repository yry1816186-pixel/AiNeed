# Mock功能清单

> 生成时间: 2026-03-19
> 项目: AiNeed Android APK v1.0.0

## 概述

本文档记录了AiNeed应用中使用Mock数据或已禁用的功能模块。

---

## 1. 后端AI服务状态

### 可用服务
| 服务 | 状态 | 说明 |
|------|------|------|
| Inference (体型分析) | ✅ 可用 | MediaPipe PoseLandmarker |
| Recommender (推荐系统) | ✅ 可用 | FashionCLIP + Qdrant |

### Mock服务
| 服务 | 状态 | 原因 | 解决方案 |
|------|------|------|----------|
| Style Understanding | ⚠️ Mock | 缺少LLM API Key | 配置 GLM_API_KEY / ZHIPU_API_KEY / OPENAI_API_KEY |

---

## 2. 客户端服务状态

### 已禁用服务
| 服务 | 状态 | 说明 | 用户体验 |
|------|------|------|----------|
| Virtual Try-On (客户端) | ❌ 禁用 | IDM-VTON服务不可用 | 抛出错误，引导用户使用后端流程 |

### 原因说明
- **IDM-VTON虚拟试穿**: 主机内存不足（需要26GB，可用6.19GB）
- 用户选择跳过此功能，使用占位UI

---

## 3. 功能影响分析

### 受影响的功能页面

| 页面 | 功能 | 影响程度 |
|------|------|----------|
| `/tryon` | 虚拟试穿 | 高 - 功能不可用 |
| `/ai-stylist` | AI造型师对话 | 中 - 使用Mock响应 |
| `/recommendations` | 服装推荐 | 低 - 推荐系统可用 |
| `/body-analysis` | 体型分析 | 低 - 功能可用 |

### 用户可见变化

1. **虚拟试穿页面**
   - 显示功能不可用提示
   - 引导用户等待后续版本

2. **AI造型师**
   - 如后端返回503，显示服务暂不可用
   - 需要配置API Key才能使用

---

## 4. 配置说明

### 启用风格分析 (Style Understanding)

在 `.env` 文件中配置以下任一API Key：

```bash
# 选项1: GLM API (推荐)
GLM_API_KEY=your_glm_api_key
GLM_API_ENDPOINT=https://open.bigmodel.cn/api/paas/v4
GLM_MODEL=glm-5

# 选项2: OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# 选项3: 智谱AI
ZHIPU_API_KEY=your_zhipu_api_key
```

### 启用虚拟试穿 (IDM-VTON)

需要满足以下条件：
- 主机内存 ≥ 32GB
- GPU支持（推荐）
- 下载IDM-VTON模型权重（约26GB）

---

## 5. 版本规划

| 版本 | 功能 | 计划 |
|------|------|------|
| v1.0.0 | 核心功能 + Mock标记 | 当前版本 |
| v1.1.0 | 启用LLM API | 需配置API Key |
| v1.2.0 | 启用虚拟试穿 | 需更高配置环境 |

---

## 6. 验证命令

```bash
# 检查AI服务健康状态
curl -s http://localhost:8001/health | jq .

# 检查风格分析可用性
curl -s http://localhost:8001/api/style/analyze

# 检查体型分析
curl -s -X POST http://localhost:8001/api/body-analysis -F "file=@test.jpg"
```

---

## 附录: 后端服务健康检查结果

```json
{
  "status": "degraded",
  "services": {
    "inference": true,
    "style_understanding": {
      "backend": "MockLLMBackend",
      "using_mock_backend": true,
      "available": false,
      "reason": "No real LLM API key is configured"
    },
    "recommender": true
  }
}
```
