# Phase 4: 推荐引擎 - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

用户获得个性化的穿搭推荐信息流，推荐质量随交互不断提升。包含：瀑布流信息流 UI、4 类推荐分类切换、渐进式推荐算法（规则→AI→协同过滤）、色彩搭配评分、推荐理由展示、行为反馈机制、冷启动策略。后端算法全面激活（协同过滤+知识图谱+学习排序+序列推荐），前端实现完整推荐信息流体验。

</domain>

<decisions>
## Implementation Decisions

### 信息流卡片设计
- **D-01:** 图片主导型卡片布局 — 图片占满卡片宽度，底部叠加半透明渐变层显示信息
- **D-02:** 卡片信息全部叠加在图片上，不增加卡片高度 — 底部渐变层分两行：第一行品牌名+价格，第二行风格标签+色彩评分小图标；推荐理由摘要以小字叠在图片底部角落
- **D-03:** 卡片展示信息：基础信息（主图+品牌+价格）+ 风格标签（1-2个）+ 色彩评分（色块+圆环分数）+ 推荐理由摘要（1行）

### 推荐分类切换交互
- **D-04:** 顶部固定 Tab 切换 4 类推荐：每日 | 场合 | 趋势 | 探索。当前 Tab 下有指示器
- **D-05:** 场合 Tab 内嵌横向滚动子标签选择具体场合（通勤/约会/运动/面试/休闲/旅行），选择后加载对应推荐

### 色彩评分与推荐理由展示
- **D-06:** 色彩搭配评分以"色块 + 圆环分数"形式展示 — 2-3 个小色块代表搭配主色，旁边小圆环进度条显示色彩和谐度分数（如 85%）
- **D-07:** 推荐理由以"内联 1 行摘要"展示 — 卡片图片底部角落显示 1 行推荐理由（如"适合你的暖春色彩"），半透明背景，点击商品详情页可看完整理由

### 推荐反馈与交互
- **D-08:** 左右滑动反馈 — 右滑喜欢，左滑直接不喜欢（不弹原因选择）
- **D-09:** 反馈下次刷新生效 — 后台实时更新 Redis 偏好缓存，下次刷新信息流时推荐结果已调整
- **D-10:** 不喜欢原因选择可在商品详情页补充（不在信息流中强制弹出）

### 推荐算法策略
- **D-11:** 全面激活所有算法 — 规则评分 + 色彩匹配 + 协同过滤 + 知识图谱 + 学习排序 + 序列推荐，一步到位全部实现
- **D-12:** GLM AI 仅用于生成推荐理由文本 — 规则引擎生成候选集和评分，GLM 生成个性化推荐理由描述
- **D-13:** 专业工具链 — 协同过滤用 PostgreSQL 实现，知识图谱用 Neo4j 图数据库，向量检索用 Qdrant
- **D-14:** SASRec 序列推荐完整实现 — 部署为独立 Python 微服务，服务器端推理（"不用本地推理"约束仅针对用户手机端，服务器端可运行 ML 模型）
- **D-15:** SASRec 部署为独立微服务（不复用 ml/ FastAPI 服务层）

### 专利创新点（全部纳入）
- **D-16:** 感知色彩和谐评分系统 — CIE Delta E 2000 感知色距 + 个人色彩季型（春夏秋冬）融合评分，区别于现有专利的简单 RGB 匹配
- **D-17:** 渐进式多算法融合框架 — 根据数据成熟度信号自动调整算法权重，从规则→AI→协同过滤渐进演进，无需代码变更
- **D-18:** 多维约束穿搭生成算法 — 同时考虑体型约束+色彩季型兼容+场合需求生成完整穿搭方案，多维度约束同时求解
- **D-19:** 时尚知识图谱 + 图推理 — 构建时尚领域知识图谱（体型-色彩-场合-风格-单品关系），用图推理增强推荐

### Claude's Discretion
- 卡片渐变层具体透明度和颜色值
- 圆环分数的具体尺寸和动画效果
- 左右滑动的触发距离和回弹动画
- Neo4j 图谱的初始数据导入策略
- Qdrant 向量索引的维度和距离度量选择

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend - Recommendations Module
- `apps/backend/src/modules/recommendations/recommendations.service.ts` — 规则评分引擎主服务（完整实现）
- `apps/backend/src/modules/recommendations/recommendations.controller.ts` — API 端点定义
- `apps/backend/src/modules/recommendations/recommendations.module.ts` — 模块依赖和提供者注册
- `apps/backend/src/modules/recommendations/dto/recommendations.dto.ts` — 请求/响应 DTO
- `apps/backend/src/modules/recommendations/types/recommendation.types.ts` — 类型定义（推荐结果、评分明细、解释接口）

### Backend - Algorithm Services (已有骨架)
- `apps/backend/src/modules/recommendations/services/color-matching.service.ts` — Delta E 2000 色彩匹配（完整实现）
- `apps/backend/src/modules/recommendations/services/cold-start.service.ts` — 冷启动策略（完整实现）
- `apps/backend/src/modules/recommendations/services/behavior-tracking.service.ts` — 行为追踪+Redis缓存（完整实现）
- `apps/backend/src/modules/recommendations/services/advanced-recommendation.service.ts` — 高级推荐（骨架）
- `apps/backend/src/modules/recommendations/services/collaborative-filtering.service.ts` — 协同过滤（骨架）
- `apps/backend/src/modules/recommendations/services/knowledge-graph.service.ts` — 知识图谱（骨架）
- `apps/backend/src/modules/recommendations/services/learning-to-rank.service.ts` — 学习排序（骨架）
- `apps/backend/src/modules/recommendations/services/sasrec.service.ts` — 序列推荐（骨架）
- `apps/backend/src/modules/recommendations/services/qdrant.service.ts` — 向量检索（骨架）
- `apps/backend/src/modules/recommendations/services/unified-recommendation.engine.ts` — 统一引擎（骨架）
- `apps/backend/src/modules/recommendations/services/recommendation-explainer.service.ts` — 推荐解释器（骨架）
- `apps/backend/src/modules/recommendations/services/outfit-completion.service.ts` — 搭配推荐（骨架）
- `apps/backend/src/modules/recommendations/services/matching-theory.service.ts` — 搭配理论（骨架）
- `apps/backend/src/modules/recommendations/services/preference-learning.service.ts` — 偏好学习（骨架）
- `apps/backend/src/modules/recommendations/services/vector-similarity.service.ts` — 向量相似度（骨架）
- `apps/backend/src/modules/recommendations/services/transformer-encoder.service.ts` — Transformer编码器（骨架）
- `apps/backend/src/modules/recommendations/services/gnn-compatibility.service.ts` — GNN兼容性（骨架）
- `apps/backend/src/modules/recommendations/orchestrator/recommendation.orchestrator.ts` — 推荐编排器（骨架）

### Backend - Submodules
- `apps/backend/src/modules/recommendations/submodules/collaborative/collaborative.module.ts` — 协同过滤子模块
- `apps/backend/src/modules/recommendations/submodules/content/content.module.ts` — 内容推荐子模块
- `apps/backend/src/modules/recommendations/submodules/knowledge/knowledge.module.ts` — 知识子模块

### Mobile - Home Screen
- `apps/mobile/src/screens/home/HomeScreen.tsx` — 首页（当前占位状态，需替换为推荐信息流）
- `apps/mobile/src/stores/homeStore.ts` — 首页状态管理（天气+画像完成度）

### Infrastructure
- `docker-compose.dev.yml` — Docker Compose 开发环境（需新增 Neo4j + Qdrant）
- `apps/backend/prisma/schema.prisma` — 数据库 Schema（UserBehavior/ClothingItem 等表）

### Project Context
- `.planning/PROJECT.md` — 项目概述和技术栈
- `.planning/REQUIREMENTS.md` — REC-01 ~ REC-11 需求定义
- `.planning/ROADMAP.md` — Phase 4 定义和成功标准

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RecommendationsService`: 完整的规则评分引擎，含体型匹配(+20)、色彩季型匹配(+15)、肤色-颜色匹配(+10)、场合匹配(+15)、行为偏好(+12)、热门度(+8)、价格匹配(+10)、协同相似度(+15)、多样性惩罚(-5)
- `ColorMatchingService`: 完整的 CIE Delta E 2000 色彩距离计算、色彩和谐规则（互补色/相近色/三角色/分裂互补/四角色）、色彩季型适配、搭配色彩建议
- `ColdStartService`: 完整的冷启动策略（人口统计/问卷/热门/混合），含 onboarding 问题和答案保存
- `BehaviorTrackingService`: 完整的行为追踪（view/click/like/dislike/addToCart/purchase/tryOn/share），含 Redis 偏好缓存实时更新
- `RecommendationsController`: 完整的 API 端点（/recommendations, /daily, /occasion, /trending, /discover, /complete-the-look, /feedback, /cold-start）
- HomeScreen FlashList: 已使用 FlashList 渲染，可直接替换数据源为推荐信息流

### Established Patterns
- Zustand + TanStack Query: 移动端状态管理（服务端状态和 UI 状态分离）
- CacheService + Redis: 后端缓存策略（CacheKeyBuilder + CACHE_TTL）
- BullMQ 队列: 异步任务处理（可用于推荐计算异步化）
- Prisma ORM: 数据库访问模式
- DesignTokens: 移动端设计令牌系统（颜色/字体/阴影）

### Integration Points
- HomeScreen 替换 recommendationPlaceholder 为真实推荐信息流
- RecommendationsController 端点已定义，前端需对接
- BehaviorTrackingService 需在移动端各交互点触发行为追踪
- Neo4j + Qdrant 需新增到 docker-compose.dev.yml
- SASRec 独立微服务需新增到 ml/ 或独立目录

</code_context>

<specifics>
## Specific Ideas

- 专利创新点需要特别关注算法的可专利性描述：感知色彩和谐评分系统（Delta E 2000 + 色彩季型融合）、渐进式多算法融合框架（数据成熟度驱动权重调整）、多维约束穿搭生成（体型+色彩+场合同时求解）、时尚知识图谱+图推理
- "不用本地推理"约束仅针对用户手机端，服务器端可运行 ML 模型（SASRec 等）
- 左右滑动反馈交互需要特别注意手势冲突（与页面滚动/导航的手势区分）
- 色彩评分的"色块+圆环"设计需要考虑在瀑布流不同高度卡片上的一致性

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-recommendation-engine*
*Context gathered: 2026-04-14*
