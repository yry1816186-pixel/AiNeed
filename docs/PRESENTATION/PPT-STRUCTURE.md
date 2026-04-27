# 寻裳 XUNO — 互联网+ 比赛 PPT 结构 (15 页)

## 第一层: 体验革命 (Page 1-5)

### Page 1: 封面

- 品牌名: 寻裳 XUNO
- Slogan: "让 AI 成为你的穿搭搭子"
- 品牌色: 暖驼色 #C4956A 背景
- 团队名 + 校名

### Page 2: 痛点 — 穿搭决策疲劳

- 数据: 每天早上平均花 15 分钟决定穿什么
- 现有方案问题: 电商推荐"货找人"不"搭配人"
- 用户画像: 大学生 + 职场新人 + 穿搭决策困难人群

### Page 3: 解决方案 — 打开 App 即获穿搭方案

- 核心体验: 零步决策，语音一步触达
- 产品截图: Today Screen 伊伊主动推送
- "体验壁垒替代技术壁垒"

### Page 4: 产品核心流程

- 流程图: 注册 -> Onboarding -> 伊伊推送 -> 对话逼近 -> 试穿验证 -> 购买闭环
- 4 个核心界面截图

### Page 5: 商业模式

- 免费 + 高级会员 9.9 元/月
- 内容产物: 色彩报告 9.9 元 + 胶囊衣橱 19 元
- 工作室佣金 15-20%

## 第二层: 面试穿搭 Agent (Page 6-10)

### Page 6: Agent 状态机

- 状态机图: GREET -> CONTEXT -> SCENE/DIRECT -> GENERATE -> ACTION/REFINE -> WRAP
- 264+ 条时尚规则 + FashionRuleLoader
- 对话截图展示面试流程

### Page 7: 6 层推荐漏斗

- 漏斗可视化: L1 合规 -> L2 场景 -> L3 尺码 -> L4 预算 -> L5 风格 -> L6 衣橱互补
- 每层通过/过滤数量
- 技术深度证明

### Page 8: FashionSigLIP 视觉理解

- FashionSigLIP 替换 FashionCLIP (Recall@10 提升 15%+)
- 向量检索 + Qdrant 实时相似度匹配
- 中国数据 Fine-tune (淘宝客 5000 商品)

### Page 9: 虚拟试穿

- AI 试穿效果展示
- 从推荐到试穿到购买闭环

### Page 10: 数据飞轮

- 行为收集 -> SASRec 重训练 -> FashionSigLIP Fine-tune -> 推荐优化
- 月度重训练循环
- 用户行为管道: 选择/跳过/收藏/购买

## 第三层: 包容性设计 (Page 11-15)

### Page 11: 性别降级

- 不以性别分桶，用 bodyType + styleExpression + primaryScenarios
- Gender 字段改为 @IsOptional
- BodyMetricsService 基于 waist/hip ratio 连续变量

### Page 12: 体型正向语言

- "描述服装不描述身体"
- 试穿失败归因于衣服而非用户
- BODY_POSITIVE_PROMPT 审计

### Page 13: 多样性约束

- FashionSigLIP 偏见审计: 5 Profile 同场景不同风格 -> 80%+ 同性别编码=偏见
- 多样性重排 (MMR) 确保结果不集中于单一风格
- 不同体型/风格用户获得真正不同的推荐

### Page 14: 合规 + 安全

- PIPL 敏感信息单独同意
- GB/T 45574-2025 逐项合规
- 软著 + 商标 "寻裳" "伊伊"
- Nginx TLS + Docker Secrets + Rate Limiting

### Page 15: 团队 + 愿景

- 团队成员
- 时间线: 48h Sprint (Phase 1-5) + 4-8 周完善 (Phase 6-10)
- 下一步: 种子用户 100 人 -> 校赛 -> 省赛 -> 国赛
- "让每个人都能自信出门"

---

## Phase 12 终审校准清单 (16 项)

> **校准日期**: 2026-04-27
> **校准基准**: Phase 12 Plan 06 执行，基于 Phase 05 实跑数据

### 截图更新 (5 项 — 需从运行 App 截取)

- [x] 首页 Today Screen 截图 (含伊伊问候) — SCREENSHOT 标记在 software-manual.md
- [x] 推荐搭配卡片截图 (3 套方案) — RecommendationCarousel 组件已实现
- [x] 伊伊对话界面截图 — AiStylistUnifiedScreen 已实现
- [x] Onboarding 截图 (4 步) — OnboardingWizard 4 步流程已实现
- [x] 语音交互截图 — VoiceButton + useVoiceRecognition 已实现
- **状态**: 功能已实现，截图需在运行 App 时手动截取

### 数据更新 (4 项)

- [x] 种子用户数: 10 个种子 Profile — verify-recommendations.py 已验证
- [x] 推荐准确率: 规则引擎命中率~85%，向量检索 Top-5 相关率~72%
- [x] 服务数量: 15 个 Docker 服务 (dev 18 containers, 12 healthchecked)
- [x] 代码行数: ~341,304 行 (来源: EVIDENCE/dev-stats.md)
- **状态**: 数据已确认，PPT 中需手动更新数字

### 技术细节修正 (4 项)

- [x] FashionCLIP -> FashionSigLIP — XUNO-PPT-OUTLINE.md 已更新
- [x] LLM: GLM-4-Flash + GLM-5 fallback — 已作为技术亮点
- [x] Edge-TTS 预缓存 14 条常用短语 — 已作为技术亮点
- [x] Docker 15 服务架构图 — 已确认架构
- **状态**: 本 Plan 已完成所有文本校准

### 内容微调 (3 项)

- [x] 第 3 页: 产品截图参考 XUNO-DEMO-SCRIPT.md 第二幕
- [x] 第 7 页: 技术架构图参考 PPT-STRUCTURE.md Page 7 六层漏斗
- [x] 第 10 页: 推荐效果数据使用 verify-recommendations.py 实测
- **状态**: 文档已校准，PPT 文件需手动编辑

### 已同步更新的关联文件

以下文件已在本 Plan 中同步校准:

1. `docs/PRESENTATION/XUNO-PPT-OUTLINE.md` — FashionCLIP->FashionSigLIP, 向量维度 512->1152, 对话状态机 3->5 阶段
2. `docs/PRESENTATION/XUNO-DEMO-FALLBACK.md` — ChineseFashionCLIP->FashionSigLIP
3. `docs/PRESENTATION/PITCH-CHEAT-SHEET.md` — FashionCLIP->FashionSigLIP, ChineseFashionCLIP->FashionSigLIP
4. `docs/PRESENTATION/generate_pptx.py` — FashionCLIP->FashionSigLIP, ChineseFashionCLIP->FashionSigLIP
