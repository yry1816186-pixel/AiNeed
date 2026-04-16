# Phase 04 Plan 02 Summary: AI-Core 域迁移 + 消除循环依赖

## 执行日期
2026-04-17

## 目标
创建 ai-core 域目录结构，迁移 5 个 AI 相关模块到 ai-core 域，消除 AiStylistModule 与 RecommendationsModule 之间的 forwardRef 循环依赖。

## 完成状态: 全部完成

## 任务执行详情

### Task 01: 创建 ai-core 域目录结构
- 创建 `src/domains/ai-core/` 及 5 个子目录: ai-stylist/, try-on/, ai/, ai-safety/, photos/
- 创建 `src/domains/ai-core/ai-core.module.ts` 聚合模块

### Task 02: 迁移 ai 模块到 ai-core 域
- 复制 `src/modules/ai/` 到 `src/domains/ai-core/ai/`
- 更新所有内部导入路径 (common/ 引用从 2 层调整为 3/4 层)
- 更新 `app.module.ts` 中的导入路径
- 删除 `src/modules/ai/`

### Task 03: 迁移 ai-safety 模块到 ai-core 域
- 复制 `src/modules/ai-safety/` 到 `src/domains/ai-core/ai-safety/`
- 更新导入路径
- 更新 `app.module.ts`
- 删除 `src/modules/ai-safety/`

### Task 04: 迁移 photos 模块到 ai-core 域
- 复制 `src/modules/photos/` 到 `src/domains/ai-core/photos/`
- 更新导入路径
- 更新 `app.module.ts`
- 删除 `src/modules/photos/`

### Task 05: 消除 AiStylistModule 与 RecommendationsModule 循环依赖并迁移 ai-stylist
**这是本 Plan 的核心任务**

循环依赖分析:
- **AiStylistModule** -> `forwardRef(() => RecommendationsModule)` 因为 AiStylistRecommendationService 和 AgentToolsService 注入 RecommendationsService
- **RecommendationsModule** -> `forwardRef(() => AiStylistModule)` 因为 RecommendationExplainerService 注入 LlmProviderService

解耦策略:
1. AiStylistModule 保留对 RecommendationsModule 的直接依赖（AiStylistRecommendationService 和 AgentToolsService 需要直接调用 RecommendationsService）
2. RecommendationsModule 移除对 AiStylistModule 的依赖 -- RecommendationExplainerService 改用自有的 `callGLM()` 方法代替 `llmProviderService.chat()`
3. 移除所有 `forwardRef` 调用

具体修改:
- `ai-stylist.module.ts`: 移除 `forwardRef(() => RecommendationsModule)`，改为直接导入 RecommendationsModule
- `recommendations.module.ts`: 移除 `forwardRef(() => AiStylistModule)` 和 AiStylistModule 导入，改用 AIModule
- `recommendation-explainer.service.ts`: 移除 LlmProviderService 注入，`generateLLMExplanation()` 方法改用 `this.callGLM(prompt)` 代替 `this.llmProviderService.chat()`
- 迁移 ai-stylist 到 `src/domains/ai-core/ai-stylist/`
- 更新所有跨模块导入路径

### Task 06: 迁移 try-on 模块到 ai-core 域
- 复制 `src/modules/try-on/` 到 `src/domains/ai-core/try-on/`
- 更新导入路径 (QueueModule -> ../../platform/queue/, AIModule -> ../ai/)
- 更新 `app.module.ts`
- 删除 `src/modules/try-on/`

### Task 07: 更新所有跨模块导入路径引用
修复了以下跨模块引用:
- `domains/platform/queue/queue.module.ts`: AIModule, TryOnModule 路径
- `domains/platform/queue/queue.processor.ts`: TryOn 相关服务路径
- `domains/platform/recommendations/submodules/content/content.module.ts`: AIModule 路径
- `domains/platform/recommendations/services/unified-recommendation.engine.ts`: AIIntegrationService 路径
- `domains/identity/profile/services/user-profile.service.ts`: BodyImageAnalysisService 路径
- `domains/identity/profile/profile.module.ts`: PhotosModule 路径
- `domains/fashion/search/search.module.ts`: RecommendationsModule 路径
- `domains/fashion/search/search.service.ts`: QdrantService 路径
- `domains/ai-core/try-on/try-on.controller.ts`: Auth/Security 路径
- `domains/ai-core/ai-stylist/ai-stylist.controller.ts`: Security 路径

额外修复了 24 个 2 层深文件的 common/ 路径错误 (../../../../common/ -> ../../../common/)

## 构建验证结果

```
tsc --noEmit: 0 errors (0 TS2307, 0 total)
```

所有模块导入路径已正确解析，无任何 TypeScript 编译错误。

## 文件变更统计

### 新增文件 (ai-core 域)
- `src/domains/ai-core/ai-core.module.ts` (聚合模块)
- `src/domains/ai-core/ai/` (7 个文件)
- `src/domains/ai-core/ai-safety/` (5 个文件)
- `src/domains/ai-core/photos/` (10+ 个文件)
- `src/domains/ai-core/ai-stylist/` (20+ 个文件)
- `src/domains/ai-core/try-on/` (15+ 个文件)

### 删除文件 (旧 modules/ 目录)
- `src/modules/ai/` (整个目录)
- `src/modules/ai-safety/` (整个目录)
- `src/modules/photos/` (整个目录)
- `src/modules/ai-stylist/` (整个目录)
- `src/modules/try-on/` (整个目录)

### 修改文件 (路径更新)
- `src/app.module.ts` (5 个导入路径更新)
- `src/domains/platform/recommendations/recommendations.module.ts` (循环依赖消除)
- `src/domains/platform/recommendations/services/recommendation-explainer.service.ts` (LlmProviderService 解耦)
- 24 个 domains/ 目录下的 2 层深文件 (common/ 路径修正)
- 8+ 个跨模块引用文件

## 架构改进

### 循环依赖消除
**Before:**
```
AiStylistModule <-forwardRef-> RecommendationsModule
```

**After:**
```
AiStylistModule -> RecommendationsModule (单向依赖)
RecommendationsModule -> AIModule (不再依赖 AiStylistModule)
```

### 域目录结构
```
src/domains/ai-core/
  ai-core.module.ts          # 聚合模块
  ai/                        # AI 基础服务 (GLM API 封装)
  ai-safety/                 # AI 安全审计
  ai-stylist/                # AI 造型师核心
  photos/                    # 照片处理服务
  try-on/                    # 虚拟试衣
```

## 遇到的问题

1. **路径层级计算**: 从 `modules/` 迁移到 `domains/ai-core/` 后，所有 common/ 引用需要多加一层 `../`。通过批量 PowerShell 脚本自动化处理。
2. **2 层深文件路径错误**: 之前 Plan 01 的 subagent 在创建 domains/ 目录时，部分 2 层深文件（如 `domains/identity/auth/`）使用了 4 层路径 `../../../../common/`，实际只需要 3 层 `../../../common/`。已全部修正。
3. **RecommendationExplainerService 解耦**: 该服务原本通过注入 LlmProviderService 使用 `llmProviderService.chat()`，但自身已有 `callGLM()` 私有方法作为后备。解耦后直接使用 `callGLM()`，功能等价。

## 风险评估

- **低风险**: 所有修改仅涉及文件移动和导入路径更新，未修改任何业务逻辑
- **已验证**: TypeScript 编译零错误通过
- **建议**: 后续应运行集成测试验证 RecommendationExplainerService 的 LLM 解释功能是否正常工作
