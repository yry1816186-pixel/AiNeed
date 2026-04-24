# Phase 7: Data Flywheel + Calendar Full + Advanced Rec - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 delivers the data-driven intelligence layer:

1. **数据飞轮闭环** — 用户行为事件 → ETL 提取 → 模型重训练 → 推荐改善的自动化管道
2. **穿搭日历完整版** — AI 自动生成 7 天搭配计划 + 天气集成 + 方案编辑 + 穿搭重复检测
3. **穿搭日记 + 风格进化** — 自动记录穿搭日记 + 周报生成 + 风格进化可视化
4. **协调度模型训练与集成** — 10M params 双塔+交叉注意力模型，替代规则引擎 L5

验证标准：用户行为自动收集并回流到模型重训练；日历可自动生成一周搭配计划并支持编辑；每周穿搭日记自动生成；协调度模型产出兼容性分数
</domain>

<decisions>
## Implementation Decisions

### 数据飞轮管道架构

- **D-01:** BullMQ Cron 调度 — 使用 NestJS 已集成的 BullMQ @Cron 装饰器触发月度重训练任务，与现有架构一致，无需新依赖
  - 重训练任务入队 BullMQ，支持重试和失败处理
  - SASRec 月度重训练 + FashionSigLIP 阈值触发
- **D-02:** 全量 ETL 提取 — 每次重训练从 UserBehaviorEvent 表全量提取行为数据
  - 当前用户量 <1000，全量提取简单可靠
  - 后续用户量增长时可切换为增量提取
- **D-03:** FashionSigLIP fine-tune 数据量阈值触发 — 积累 500+ 新用户交互时触发 fine-tune
  - 比固定月度更智能，避免数据不足时无效训练
  - 需数据量监控逻辑
- **D-04:** 评估 + 自动回滚 — 重训练后自动跑 Recall@K 评估，指标下降则回滚到旧模型
  - SASRec 和 FashionSigLIP 各自独立评估和回滚
  - 需维护模型版本（当前模型 + 上一版本）
- **D-05:** 事件类型最小扩展 — 新增 skip 和 outfit_save 两种事件类型
  - 现有 16 种事件类型覆盖大部分场景
  - skip 捕捉用户跳过推荐，outfit_save 捕捉搭配保存
  - 其他场景复用现有事件（favorite 代替 outfit_save 不可行时用新事件）
- **D-06:** 用户行为序列构建 — 按 userId 分组，按时间排序，每个用户一条序列
  - SASRec 标准输入格式
  - 长序列超过模型 max_len 时截断最近行为
- **D-07:** 独立回滚 — SASRec 和 FashionSigLIP 各自独立评估和回滚
  - 一个模型回滚不影响另一个
  - 需维护更多模型版本

### 穿搭日历完整版

- **D-08:** 7 天横向滚动视图 — 每天显示天气图标 + 场景标签 + 搭配缩略图
  - 与 Phase 3 的 7 天简化版一致，增加 AI 自动生成和编辑能力
  - 保留现有月视图作为切换选项
- **D-09:** 周初自动生成 — 每周一自动生成本周 7 天搭配计划
  - 基于：天气预报 + 用户日历事件 + 衣橱现有单品
  - 用户可随时修改，修改操作回流为偏好信号（CAL-05）
  - 符合"伊伊主动推送"理念
- **D-10:** BottomSheet 编辑 — 点击某天弹出 BottomSheet 显示当前搭配 + "换一套"按钮
  - 与 TryOnBottomSheet 交互模式一致
  - 替换从推荐结果中选取，不中断日历浏览
- **D-11:** 提示标签重复检测 — 显示"上次穿这套是 X 天前"的提示标签
  - 轻量不强制，用户自行决定是否换
  - 基于搭配单品重叠度计算（>70% 重叠视为相同搭配）

### 穿搭日记 + 风格进化

- **D-12:** 自动记录穿搭日记 — 用户保存搭配或完成试穿时自动记录
  - 零摩擦，每个行为都是日记数据
  - 符合"策展型衣橱"理念（决策 #4）
  - 记录内容：搭配单品列表 + 场景 + 天气 + 时间 + 来源（推荐/自选）
- **D-13:** 全面 7 要素周报 — 满意度 + 风格分布 + 趋势 + 进化曲线 + 场景覆盖 + 色彩分析 + 单品复用率
  - 超出 FLY-04 最低要求（4 要素），提供更丰富的风格洞察
  - 每周日自动生成，推送通知用户查看
- **D-14:** 行为推断满意度 — 保存搭配=满意，跳过/拒绝=不满意，试穿未保存=中性
  - 零额外操作，从用户行为推断
  - 满意度得分：save=1.0, try_on_complete=0.6, skip=-0.3, reject=-0.5
- **D-15:** 风格维度多线图 — X 轴时间，Y 轴各风格维度得分（通勤/休闲/正式/约会等）
  - 直观展示风格演变趋势
  - 复用现有 StyleEvolution 组件骨架，接入真实数据

### 协调度模型训练与集成

- **D-16:** 规则生成训练数据 — 用 264 条 JSON 规则生成正样本 + 随机组合生成负样本
  - 决策 #29 锁定"规则 → 训练数据"
  - 无需真实用户数据即可启动训练
  - 规则认可的搭配为正样本（label=1），随机单品组合为负样本（label=0）
- **D-17:** 双塔 + 交叉注意力架构 — 决策 #30 锁定
  - 双塔编码（商品 A + 商品 B）+ 交叉注意力层
  - 10M params，能捕捉商品间细粒度交互
  - 输出：兼容性分数 [0, 1]
- **D-18:** 并行运行 + 渐进切换 — 新模型先与 L5 规则并行运行，对比输出一致性
  - 一致率 >90% 后切换为主，L5 降级为 fallback
  - 安全过渡，可随时回滚
- **D-19:** 本地开发 + AutoDL 生产 — 小模型本地快速迭代，最终版本 AutoDL 训练
  - 10M params 模型本地可跑但较慢
  - AutoDL 训练 <1 小时，成本 <5 元/次

### Claude's Discretion

- BullMQ Cron 的具体 cron 表达式和重试策略
- ETL 提取的具体 SQL 查询和数据转换逻辑
- 500+ 交互阈值的具体计算方式
- Recall@K 评估的具体 K 值和回滚阈值
- 7 天搭配计划生成的具体算法（如何组合天气+日历+衣橱）
- BottomSheet 编辑的具体 UI 布局
- 穿搭重复检测的相似度计算方式（单品重叠度 >70%）
- 周报生成的具体数据聚合逻辑
- 风格维度得分的计算方式
- 协调度模型的训练超参数和正负样本比例
- L5 并行运行期间的一致性对比指标

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 数据飞轮

- `apps/backend/src/domains/platform/analytics/services/behavior-tracker.service.ts` — 核心行为追踪服务（934 行，Redis 队列 + 异步批量写入）
- `apps/backend/src/domains/platform/analytics/dto/track-event.dto.ts` — 16 种事件类型 DTO
- `apps/backend/src/domains/platform/analytics/controllers/analytics.controller.ts` — REST 端点 /analytics/track 和 /analytics/track/batch
- `apps/backend/src/domains/platform/recommendations/services/behavior-tracking.service.ts` — 推荐域行为追踪（282 行）
- `apps/backend/src/domains/platform/recommendations/services/preference-learning.service.ts` — 偏好学习服务
- `apps/mobile/src/shared/services/analytics.ts` — 客户端分析服务（164 行）
- `apps/mobile/src/shared/hooks/useAnalytics.ts` — React hook + AnalyticsEvents 常量

### SASRec

- `ml/services/recommender/sasrec_service.py` — 完整 SASRec 模型（1343 行，多头部自注意力 + BPR 损失）
- `apps/backend/src/domains/platform/recommendations/services/sasrec-client.service.ts` — 后端 HTTP 客户端（SASREC_ENABLED=false）
- `ml/api/tests/test_sasrec_service.py` — SASRec 测试（337 行）

### FashionSigLIP / Fine-tuning

- `ml/scripts/finetune_fashionclip.py` — Fine-tuning 脚本（427 行）
- `ml/scripts/prepare_finetune_data.py` — 训练数据准备（734 行）
- `ml/scripts/benchmark_fashionclip.py` — 基准评估（335 行）
- `ml/scripts/AUTODL-TRAINING-GUIDE.md` — AutoDL 云训练指南
- `ml/services/rag/embeddings.py` — EmbeddingService（自动检测 ChineseFashionCLIP）

### 穿搭日历

- `apps/mobile/src/features/stylist/screens/SessionCalendarScreen.tsx` — 月视图日历（287 行）
- `apps/mobile/src/features/consultant/components/CalendarGrid.tsx` — 可复用日历网格（205 行）
- `apps/mobile/src/features/stylist/screens/OutfitPlanScreen.tsx` — 搭配方案详情（371 行）
- `apps/backend/src/domains/ai-core/ai-stylist/services/session-archive.service.ts` — 日历日查询服务

### 风格进化

- `apps/mobile/src/features/home/components/SmartRecommendations.tsx` — StyleEvolution 组件骨架（lines 660-707）
- `apps/mobile/src/features/profile/screens/ProfileReportScreen.tsx` — 体型/色彩分析报告（518 行）
- `apps/mobile/src/features/commerce/screens/SubscriptionScreen.tsx` — 引用"每周风格报告"作为高级功能

### 协调度模型

- `apps/backend/src/domains/platform/recommendations/services/gnn-compatibility.service.ts` — GNN 兼容性评分（722 行）
- `ml/services/stylist/full_outfit_engine.py` — 搭配引擎兼容性评分（2073 行，6 维度加权）
- `ml/services/stylist/intelligent_style_recommender.py` — PCMF 模型引用（无实际模型文件）
- `apps/backend/src/domains/platform/recommendations/services/matching-theory.service.ts` — 匹配理论评分（663 行）
- `apps/backend/src/domains/platform/recommendations/services/outfit-completion.service.ts` — 搭配完成评分（370 行）

### 推荐管道（核心集成点）

- `apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts` — 主编排器（1505 行）
- `apps/backend/src/domains/platform/recommendations/services/rule-engine.service.ts` — 规则引擎（855 行，L5 层）
- `apps/backend/src/domains/platform/recommendations/services/learning-to-rank.service.ts` — LTR 服务
- `apps/backend/src/domains/platform/recommendations/recommendations.module.ts` — 模块注册（32 个服务）

### Fashion Rules（训练数据源）

- `ml/data/fashion_rules/` — 7 个 JSON 规则文件（264+ 规则）
- `ml/scripts/generate_fashion_rules.py` — 规则生成脚本（886 行）

### Prisma Schema

- `apps/backend/prisma/schema.prisma` — UserBehaviorEvent + UserPreferenceWeight 模型

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `BehaviorTrackerService` (934 行): 完整行为追踪，Redis 队列 + 异步批量写入 + 隐式反馈 + 会话聚合 + 偏好权重更新
- `SASRecService` (1343 行): 完整 SASRec 模型，多头部自注意力 + BPR 损失 + NumPy/PyTorch 双后端
- `SASRecClientService`: 后端 HTTP 客户端，已实现 predict/train/isEnabled
- `finetune_fashionclip.py` (427 行): 完整 fine-tuning 脚本，支持解冻最后 N 层 + 余弦学习率 + 早停
- `GnnCompatibilityService` (722 行): 图结构兼容性评分，分类/风格/色彩权重
- `full_outfit_engine.py` (2073 行): 6 维度搭配评分（色彩 0.25 + 风格 0.25 + 场合 0.15 + 体型 0.15 + 季节 0.10 + 价格 0.10）
- `SessionCalendarScreen` (287 行): 月视图日历，可扩展为 7 天规划
- `CalendarGrid` (205 行): 可复用日历网格组件
- `StyleEvolution` 组件骨架: 可直接接入真实数据
- `ProfileReportScreen` (518 行): 报告生成模式可参考

### Established Patterns

- 行为追踪: Mobile analytics.track() → batch flush → POST /analytics/track/batch → Redis queue → BehaviorTrackerService.flushQueue() (cron) → Prisma
- 推荐管道: Orchestrator 唯一入口 → funnel pipeline (candidates → rule filter → vector search → preference boost → LTR ranking)
- SASRec: 独立 FastAPI 服务 port 8100，后端 HTTP 通信
- 模型训练: AutoDL 云端 GPU，下载 best_model 到本地
- 状态管理: Zustand + AsyncStorage
- 主题: useTheme() + createStyles() 模式
- 数据获取: TanStack Query (useQuery/useInfiniteQuery)

### Integration Points

- 行为事件 → ETL 提取 → SASRec 训练序列（新管道）
- 行为事件 → FashionSigLIP fine-tune 数据（新管道）
- SASRec 预测 → Orchestrator 评分权重（已有 sasrec-client.service.ts，需启用）
- 协调度模型 → 替代 L5 规则层（需并行运行期）
- 周报生成 → BullMQ Cron 调度（新管道）
- 7 天搭配计划 → 天气 API + 日历事件 + 衣橱数据（新管道）
- 穿搭日记 → 行为事件自动记录（扩展现有追踪）
- 修改方案操作 → 偏好信号回流（CAL-05，新管道）

</code_context>

<specifics>
## Specific Ideas

- 数据飞轮核心循环：用户行为 → 偏好权重更新 → 模型重训练 → 推荐改善 → 更多正面行为
- SASRec 月度重训练：BullMQ Cron 每月 1 日凌晨触发，全量提取行为事件，构建用户序列，训练新模型
- FashionSigLIP 阈值触发：监控新交互数据量，达到 500+ 时触发 fine-tune
- 7 天搭配计划：伊伊说"这周天气 15-22°C，有 2 天面试，给你搭了 7 套"
- 重复检测标签："这套 3 天前穿过" → 用户点"换一套" → BottomSheet 弹出替代方案
- 周报推送："本周你穿了 5 套搭配，风格偏通勤，满意度 85%，比上周多了 1 套约会风"
- 风格进化曲线：多线图展示通勤/休闲/正式/约会四个维度随时间的变化
- 协调度模型训练：264 规则生成 ~2000 正样本 + 随机组合 ~8000 负样本
- L5 并行期：新模型和规则引擎同时评分，对比一致性，>90% 后切换

</specifics>

<deferred>
## Deferred Ideas

- 讯飞自定义声线（Phase 6+ 已 deferred）
- FashionDNA 连续嵌入（Phase 8+）
- 增量 ETL 提取（用户量 >5000 时切换）
- A/B 实验框架（Phase 8+，当前用评估+回滚替代）
- 协调度模型从用户行为数据训练（积累足够数据后替换规则生成数据）
- 灰度发布 + A/B 对比（A/B 框架就绪后升级质量保障策略）
- 日历与手机系统日历同步（Phase 8+）
- 穿搭日记照片上传（用户主动补充，Phase 8+）

</deferred>

---

_Phase: 07-data-flywheel-calendar-full-advanced-rec_
_Context gathered: 2026-04-25_
