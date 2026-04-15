# Phase 6: AI 服务规整 - Research

**Gathered:** 2026-04-16
**Status:** Complete

## Current State Analysis

### Directory Structure

```
ml/
├── api/
│   ├── main.py                    # FastAPI 入口 (含 sys.path hack)
│   ├── config.py                  # Settings (pydantic-settings)
│   ├── Dockerfile                 # Docker 构建
│   ├── middleware/
│   │   ├── auth.py               # API Key 认证
│   │   ├── error_handler.py      # MLError 层次结构
│   │   └── logging.py            # 请求日志中间件
│   ├── routes/
│   │   ├── health.py             # /health, /health/detailed
│   │   ├── tasks.py              # /api/tasks (任务队列)
│   │   ├── stylist_chat.py       # /api/stylist (v1 造型师)
│   │   ├── body_analysis.py      # /api/body-analysis
│   │   ├── style_analysis.py     # /api/style
│   │   ├── photo_quality.py      # /api/photo-quality
│   │   ├── fashion_recommend.py  # /api/recommend
│   │   └── virtual_tryon.py      # /api/v1/virtual-tryon
│   ├── schemas/
│   │   ├── stylist.py
│   │   ├── recommendation.py
│   │   ├── body_analysis.py
│   │   └── style_analysis.py
│   └── tests/                    # 8 个测试文件
├── config/
│   └── paths.py                  # 模型路径配置
├── scripts/                      # 5 个测试脚本
├── services/                     # 34 个文件，扁平结构
│   ├── intelligent_stylist_api.py    # /api/stylist/v2 (v2 造型师 API)
│   ├── intelligent_stylist_service.py
│   ├── visual_outfit_api.py         # /api/visual-outfit
│   ├── visual_outfit_service.py
│   ├── virtual_tryon_service.py
│   ├── tryon_preprocessor.py
│   ├── tryon_postprocessor.py
│   ├── tryon_prompt_engine.py
│   ├── body_analyzer.py
│   ├── photo_quality_analyzer.py
│   ├── color_season_analyzer.py
│   ├── color_utils.py
│   ├── style_understanding_service.py
│   ├── intelligent_style_recommender.py
│   ├── fashion_knowledge_rag.py
│   ├── sasrec_service.py
│   ├── algorithm_gateway.py
│   ├── ai_service.py             # 旧版 AI 服务入口 (含 sys.path hack)
│   ├── middleware.py
│   ├── rate_limiter.py
│   ├── metrics_service.py
│   ├── multi_level_cache.py
│   ├── degradation_service.py
│   ├── secure_api_key.py
│   ├── tempfile_manager.py
│   ├── task_worker.py            # 含 sys.path hack
│   ├── task_worker_config.py
│   ├── stylist_prompts.py
│   ├── reference_line_generator.py
│   └── __init__.py               # 仅导出 BodyAnalyzer
├── requirements.txt              # 无 pyproject.toml
├── quick_start.py                # 含 sys.path hack
├── start_ai_service.bat
└── start_ai_service.sh
```

### Key Findings

#### 1. sys.path Hacks (AISV-01) — 12 处

| 文件 | 行号 | 用途 |
|------|------|------|
| `ml/api/main.py` | 8 | `sys.path.insert(0, str(Path(__file__).parent.parent))` |
| `ml/services/intelligent_stylist_api.py` | 13 | `sys.path.append(os.path.dirname(os.path.dirname(...)))` |
| `ml/services/visual_outfit_api.py` | 12 | `sys.path.append(os.path.dirname(os.path.dirname(...)))` |
| `ml/services/ai_service.py` | 18 | `sys.path.insert(0, str(Path(__file__).parent.parent))` |
| `ml/services/task_worker.py` | 28 | `sys.path.insert(0, str(Path(__file__).parent.parent))` |
| `ml/quick_start.py` | 136, 173 | `sys.path.insert(0, str(Path(__file__).parent))` |
| `ml/api/tests/conftest.py` | 10 | `sys.path.insert(0, ...)` |
| `ml/services/reference_line_generator_test.py` | 10 | `sys.path.insert(0, ...)` |
| `ml/services/color_season_analyzer_test.py` | 8 | `sys.path.insert(0, ...)` |
| `ml/scripts/test_visual_outfit.py` | 11 | `sys.path.insert(0, ...)` |
| `ml/scripts/test_intelligent_stylist.py` | 12 | `sys.path.insert(0, ...)` |

**根因：** 没有 `pyproject.toml`，包未以 editable 模式安装，`from services.xxx` 裸导入需要 sys.path hack。

**两种导入风格并存：**
- `from services.xxx` (裸导入，需 hack) — 37 处
- `from ml.services.xxx` (包路径，无需 hack) — 35 处

#### 2. 重复路由 (AISV-02) — stylist_chat vs intelligent_stylist_api

| 特征 | stylist_chat.py | intelligent_stylist_api.py |
|------|----------------|---------------------------|
| 前缀 | `/api/stylist` | `/api/stylist/v2` |
| 端点 | chat, outfit, analyze-body, conversation CRUD | outfit-recommendation, chat, analyze-body-type, fashion-trends, color-guide, body-type-guide, occasion-guide, health |
| Schema | 使用 `ml/api/schemas/stylist.py` | 内联定义 (UserProfileInput, SceneContextInput 等) |
| 服务 | `IntelligentStylistService` | `IntelligentStylistService` |
| 异步任务 | 使用 task_worker (create_task/update_task) | 直接 await |
| 响应格式 | `{task_id, session_id, status}` | `{success, data, timestamp}` |

**重复功能：**
- `/api/stylist/chat` ↔ `/api/stylist/v2/chat`
- `/api/stylist/outfit` ↔ `/api/stylist/v2/outfit-recommendation`
- `/api/stylist/analyze-body` ↔ `/api/stylist/v2/analyze-body-type`

**v2 独有端点：** fashion-trends, color-guide, body-type-guide, occasion-guide, health

#### 3. Analysis 路由分散 (AISV-04)

| 路由 | 前缀 | 服务 | 端点数 |
|------|------|------|--------|
| body_analysis.py | `/api/body-analysis` | `BodyAnalyzerService` | 3 (analyze, recommendations, fit-score) |
| style_analysis.py | `/api/style` | `StyleUnderstandingAPI` | 3 (analyze, suggestions, quick-match) |
| photo_quality.py | `/api/photo-quality` | `PhotoQualityAnalyzer` | 3 (analyze, enhance, health) |

**合并方案：** 统一为 `/api/analysis` 前缀，保留子路径区分：
- `/api/analysis/body/...`
- `/api/analysis/style/...`
- `/api/analysis/photo/...`

#### 4. 服务文件扁平结构 (AISV-03)

34 个文件全部在 `ml/services/` 根目录，无子目录组织。

**建议的能力域分组：**

| 域 | 文件 | 说明 |
|----|------|------|
| **stylist/** | intelligent_stylist_service.py, stylist_prompts.py, intelligent_style_recommender.py, style_understanding_service.py | 造型师核心 |
| **tryon/** | virtual_tryon_service.py, tryon_preprocessor.py, tryon_postprocessor.py, tryon_prompt_engine.py | 虚拟试衣 |
| **analysis/** | body_analyzer.py, photo_quality_analyzer.py, color_season_analyzer.py, color_utils.py | 分析服务 |
| **rag/** | fashion_knowledge_rag.py (+ rag/ 子目录) | RAG 检索 |
| **common/** | middleware.py, rate_limiter.py, metrics_service.py, multi_level_cache.py, degradation_service.py, secure_api_key.py, tempfile_manager.py, algorithm_gateway.py, task_worker.py, task_worker_config.py, reference_line_generator.py | 共享工具 |
| **recommender/** | sasrec_service.py | 推荐算法 |

#### 5. 错误处理不一致

- `ml/api/middleware/error_handler.py` 定义了 `MLError` 层次结构（MLError, ModelNotLoadedError, InferenceError, RateLimitError, ValidationError）
- 但路由文件仍大量使用原始 `HTTPException` 而非 `MLError` 子类
- 响应格式不统一：有的返回 `{success, error, data}`，有的返回 `{success, data, timestamp}`，有的返回原始 Pydantic 模型

#### 6. 日志格式不统一

- `RequestLoggingMiddleware` 已存在，提供请求级结构化日志
- 路由级日志不一致：部分用 `logger.error`，部分不记录
- 无统一的业务日志格式

#### 7. Dockerfile 问题

- CMD 使用 `api.main:app` 而非 `ml.api.main:app`（依赖 PYTHONPATH=/app）
- Dockerfile 端口 8002 vs config.py 默认端口 8001
- 使用 `requirements.txt` 而非 `pyproject.toml`

#### 8. Schema 重复

- `ml/api/schemas/stylist.py` 定义了 StylistChatRequest, StylistChatResponse 等
- `ml/services/intelligent_stylist_api.py` 内联定义了 UserProfileInput, SceneContextInput, ChatRequest 等，功能重复
- `ml/api/routes/photo_quality.py` 内联定义了 QualityAnalyzeRequest, EnhanceRequest

#### 9. 路由注册方式脆弱

`ml/api/main.py` 中所有路由使用 try/except 注册：
```python
try:
    from services.intelligent_stylist_api import router as stylist_router
    app.include_router(stylist_router)
except Exception as e:
    logging.getLogger(__name__).warning("Failed to load ...")
```
问题：
- 导入失败时静默跳过，不易发现问题
- 无法一目了然看到完整 API 表面
- 混合使用 `from services.xxx` 和 `from ml.api.routes.xxx` 两种导入

#### 10. visual_outfit_api.py 与 virtual_tryon.py 重叠

- `ml/services/visual_outfit_api.py` 的 `/api/visual-outfit/try-on` 与 `ml/api/routes/virtual_tryon.py` 的 `/api/v1/virtual-tryon/generate` 功能重叠
- 两者都调用 `virtual_tryon_service.generate_tryon`

## Validation Architecture

### Critical Test Points

1. **pyproject.toml 安装后所有导入正常** — `python -c "from ml.services.xxx import Yyy"` 对所有模块
2. **路由合并后 API 端点可达** — curl/pytest 验证每个端点
3. **服务文件移动后导入路径正确** — `from ml.services.stylist.xxx` 格式
4. **Docker 构建正常** — `docker build` 成功
5. **现有测试通过** — `pytest ml/api/tests/`

### Risk Areas

1. **rag/ 子目录** — `fashion_knowledge_rag.py` 导入 `from services.rag.xxx`，rag/ 子目录可能已存在
2. **ai_service.py** — 旧版入口，可能被外部脚本引用
3. **task_worker.py** — 被 stylist_chat.py 使用，移动后需更新导入
4. **Dockerfile PYTHONPATH** — 需同步更新

## Recommended Approach

### Wave 1: 基础设施 (pyproject.toml + sys.path 清理)
1. 创建 `pyproject.toml`，定义包为 `ml`
2. 将所有 `from services.xxx` 改为 `from ml.services.xxx`
3. 移除所有 `sys.path.insert/append`
4. 更新 Dockerfile

### Wave 2: 路由合并
1. 合并 stylist_chat + intelligent_stylist_api → 统一 stylist 路由
2. 合并 body_analysis + style_analysis + photo_quality → analysis 路由
3. 统一 Schema 定义，消除内联重复
4. 统一错误处理（使用 MLError 子类）

### Wave 3: 服务重组
1. 按能力域创建子目录
2. 移动服务文件到对应子目录
3. 更新所有导入路径
4. 统一日志格式

---

## RESEARCH COMPLETE
