# 寻裳 XUNO — 你的 AI 穿搭搭子

## What This Is

寻裳是面向全年龄段的 AI 穿搭决策平台，以 AI 角色伊伊（温柔但有主见的朋友）为核心交互载体。不是被动等待用户搜索的工具，而是**主动找上门的穿搭搭子**——伊伊会根据天气、日历、用户偏好主动推送搭配方案，通过对话逐步逼近最优穿搭决策，并在对话中无缝触发试穿、收藏、购买等动作。

平台围绕三个核心问题组织一切能力：**我今天穿什么**（场景化穿搭方案）、**这件衣服适不适合我**（候选单品适配判断）、**我值不值得买它**（购买决策辅助）。

项目已完成代码规整（设计系统统一、后端域划分、移动端重组、AI 服务清理），现进入产品重构阶段：基于 42 项冻结决策，将现有功能收束为一条以伊伊为核心的沉浸式 AI 穿搭决策闭环。

## Core Value

用户在 Today Tab 打开 App 即获得伊伊主动推送的当日穿搭方案——零步决策，语音一步触达。**体验壁垒替代技术壁垒**：大厂把 AI 穿搭当功能附件藏在三级页面，XUNO 把它放在首页正中央。

## Requirements

### Validated

- ✓ 用户认证（邮箱/微信/短信） — existing
- ✓ AI 造型师对话 — existing
- ✓ 虚拟试衣（GLM API，无性别设计） — existing
- ✓ 服装目录与推荐 — existing
- ✓ 用户画像与体型分析 — existing
- ✓ 风格测试 — existing
- ✓ 购物车与订单 — existing
- ✓ 支付（支付宝/微信） — existing
- ✓ 社区动态 — existing
- ✓ 博主系统 — existing
- ✓ 私人顾问 — existing
- ✓ 定制设计 — existing
- ✓ VIP 订阅 — existing
- ✓ 通知系统 — existing
- ✓ 管理后台 — existing
- ✓ 后端 6 域 + 1 平台层架构 — Phase 3-4 完成
- ✓ 移动端 feature-based 架构 — Phase 5 完成
- ✓ AI 服务按能力域重组 — Phase 6 完成
- ✓ 设计系统统一（Theme Tokens） — Phase 2 完成
- ✓ ESLint no-explicit-any: error — Phase 7 完成
- ✓ 后端测试覆盖率 50%+ — Phase 7 完成

### Active

<!-- 48h Sprint v1 requirements -->

**基础架构**:

- [ ] 移动端 TypeScript 零编译错误
- [ ] 后端 Schema 增强（material, season, DataSource 枚举）
- [ ] 推荐归因表 + 统一行为事件
- [ ] Mock 商品数据 100+
- [ ] 性别字段降级为可选

**推荐管道**:

- [ ] Orchestrator 唯一入口 + 冷启动重构
- [ ] 降级策略（天气+季节+场景模板）
- [ ] A/B Experiment ID 埋点

**导航与核心屏幕**:

- [ ] 4 Tab 导航（今日/探索/造型师/我的）
- [ ] Today Screen（场景卡 + 伊伊推荐 + 用户保存 + 语音按钮）
- [ ] Discover Screen（推荐流 + 策展空间）
- [ ] FashionSigLIP 向量可视化组件
- [ ] 穿搭日历简化版（7 天视图）

**伊伊对话系统**:

- [ ] 对话状态机（GREET→CONTEXT→GENERATE→ACTION→WRAP）
- [ ] 面试穿搭场景完整 Agent 对话
- [ ] 试衣 BottomSheet 嵌入对话
- [ ] 推荐解释可视化（6 层漏斗）
- [ ] 工作室智能推荐触发

**Onboarding**:

- [ ] 4 步流程（场景 → 画像 → 风格 → 让伊伊搭第一套）
- [ ] Onboarding 数据立即流入冷启动

**语音与 TTS**:

- [ ] 首页语音按钮（按住说话）
- [ ] Edge-TTS 基础集成

**视觉体系**:

- [ ] 配色体系：暖驼#C4956A + 深炭灰#2D3436 + 暖橘#E17055 + 暖白#FAFAF8
- [ ] 伊伊形象：暖驼色圆形 + 简笔画衣架图标
- [ ] 圆角/间距基线统一

<!-- Post-Sprint requirements -->

**模型升级**:

- [ ] Marqo-FashionSigLIP 替换 FashionCLIP
- [ ] 中国数据 Fine-tune（AutoDL 租 GPU）
- [ ] 偏好学习模型 v1（5M params）

**数据飞轮**:

- [ ] 用户行为收集管道
- [ ] SASRetrain 自动化
- [ ] FashionSigLIP Fine-tune 迭代循环

**功能扩展**:

- [ ] 拍照识图找同款
- [ ] 穿搭日历完整版（天气+日历+衣橱）
- [ ] 穿搭日记 + 风格进化可视化
- [ ] 微信小程序 v1
- [ ] 风格 DNA 社交匹配
- [ ] 穿搭协调度模型训练

**合规与安全**:

- [ ] PIPL 敏感信息单独同意
- [ ] TLS + 端口安全 + 密钥管理
- [ ] 软著 + 商标注册
- [ ] 算法备案

**数据与推荐进阶**:

- [ ] 淘宝客 + 京东联盟 API 对接
- [ ] SASRec 训练管道
- [ ] 六层漏斗完整实现
- [ ] FashionSigLIP 偏见审计

**商业化**:

- [ ] 免费层限额 + 内容产物付费 + 高级会员
- [ ] 分享裂变（穿搭方案分享图 + 二维码）
- [ ] 工作室抽佣 15-20%

**生产部署**:

- [ ] Nginx + TLS + 监控告警
- [ ] Android 应用商店上架
- [ ] 离线能力（缓存 50 条 + 衣橱 + 日历）

### Out of Scope

- Feature Flag 体系 — 一次性重构，不需要并存机制
- Deep Link 路由迁移 — Demo 不需要推送通知，上线前处理
- 未成年人合规法务流程 — 非代码问题，上线前处理
- 电商 API 真实对接 — Sprint 用 Mock，上线前处理
- SASRec ONNX 导出 — 服务端推理够用，用户量 >1000 时再做
- 协同过滤 / 知识图谱 — 伪实现直接砍掉
- 社区 Tab — 降为灵感层，日活 5 万+ 时启动
- 上传图片私人定制 — 砍掉（决策 #13）
- 微服务拆分 — 不提前拆
- @react-navigation/native-bottom-tabs — 与 react-native-screens 4.4.0 冲突
- FashionCLIP ONNX int8 量化 — 向量漂移严重
- HarmonyOS 应用 — 不在当前范围
- Flutter 迁移 — 保持 RN（已投入）

## Context

**项目经历了两轮大型迭代**：

1. **业务迭代**（8 个开发阶段）：用户画像 → AI 造型师 → 虚拟试衣 → 推荐引擎 → 电商闭环 → 社区博主 → 定制品牌 → 私人顾问
2. **代码规整**（GSD v1 里程碑，68% 完成）：设计系统统一 → 后端域划分 → 移动端重组 → AI 服务清理 → 代码质量提升

**当前状态基线**：

- 后端 (apps/backend): 0 个 TS 错误
- 移动端 (apps/mobile): 137 个 TS 错误（集中在 ~20 个文件）
- ML 服务 (ml/): Python FastAPI，独立运行

**技术栈**：pnpm monorepo + NestJS 11 + React Native 0.76.8 + Prisma 5 + Python FastAPI + PostgreSQL/Redis/Qdrant

**比赛**: 中国国际大学生创新大赛（互联网+），校赛 2026 年 5-6 月

**差异化重新定义**（FINAL_PLAN 核心洞察）：

- 大厂（淘宝/抖音/小红书）有 AI 穿搭功能但**埋得深、体验差、无沉浸感**
- XUNO 的壁垒不在技术，在**体验**：首页即入口（0 步到达）+ 主动 Agent（AI 先开口）+ 记忆能力（越用越懂你）
- 叙事核心："你的 AI 穿搭记忆" — 不只是推荐今天穿什么，而是**记住**你穿过什么，**理解**你的风格在进化

**垂直场景策略**：

- P0: 职场新人面试穿搭（比赛展示核心，社会价值加分）
- P0: 约会/社交穿搭（口碑传播核心）
- P1: 旅行打包 + 换季衣橱（留存核心）
- P2: 大码/非标体型 + 升职穿搭（壁垒 + 高付费）

**开发资源分配**：

- Claude Code: 架构决策、复杂重构、ML 对接、端到端集成
- Trae (多会话并行): 轻量 UI、文档编写、测试用例、Bug 修复
- AutoDL (按需): GPU 训练（Fine-tune ~15 元/次）

## Constraints

- **Timeline**: 48 小时 Sprint（5 Phase）→ 4 周冲刺 → 校赛提交
- **Tech Stack**: NestJS 11 + React Native 0.76.8 + Prisma 5 + Python FastAPI
- **Locked Deps**: react-native-screens 4.4.0, reanimated 3.16.7, svg 15.8.0 不可升级
- **Node.js**: v24 (当前), 需兼容 v20+
- **Execution**: 3 Agent 并行，绝不串行等待
- **Priority**: 能改就不新建，能跑就不重构；先通后美，先连后优
- **AI Cost**: RTX 4060 本地推理 + AutoDL 按需训练，年训练成本 ~200 元
- **Safety**: 数据库迁移、支付逻辑、用户数据、生产环境必须串行+人工确认
- **Ethics**: 描述服装不描述身体，试穿失败归因于衣服不归因于人（决策 #36）
- **Visual**: 暖驼#C4956A + 深炭灰#2D3436 + 暖橘#E17055 + 暖白#FAFAF8（决策 #35）
- **Voice**: Sprint 用 Android 原生 SpeechRecognizer + Edge-TTS（决策 #24, #33）

## Key Decisions

> 42 项冻结决策，源自 XUNO_FINAL_PLAN.md §20.2 + §20.3。不可更改，只能对齐和细化。

| #   | Decision                                           | Rationale                                      | Outcome   |
| --- | -------------------------------------------------- | ---------------------------------------------- | --------- |
| 1   | 伊伊有角色设计（温柔有主见的朋友）                 | 增强情感连接和传播性                           | — Pending |
| 2   | 比赛叙事三层叠加（体验革命 → 面试 → 包容性）       | 评委多维加分                                   | — Pending |
| 3   | 获客全渠道（校园+小红书+裂变+比赛）                | 多路径降低获客风险                             | — Pending |
| 4   | 衣橱重新定义为策展型                               | 零摩擦，每个行为都是偏好信号                   | — Pending |
| 5   | 吊牌二维码 + AI 拍照识别并行                       | 有合作零摩擦，没合作走 AI                      | — Pending |
| 6   | GPU 按需租用 (AutoDL)                              | 训练时开不用时关，一次 ~15 元                  | — Pending |
| 7   | FashionCLIP → Marqo-FashionSigLIP                  | 2025 SOTA，全面超越                            | — Pending |
| 8   | 平台：RN App + 微信小程序                          | 微信内裂变零摩擦                               | — Pending |
| 9   | 额外功能：穿搭日历 + 拍照找同款 + 风格 DNA         | 日历=主动 AI 载体，拍照=获客钩子，DNA=社交壁垒 | — Pending |
| 10  | 规则引擎分层处理（L1-L4 保留，L5 学习替换）        | 保留确定性 + 渐进替换                          | — Pending |
| 11  | 垂直场景 6 个优先级                                | 面试 → 约会 → 旅行 → 换季 → 大码 → 升职        | — Pending |
| 12  | 商业模型修正（佣金 4-7%、付费 1-2%、内容产品为主） | 修正虚假数字                                   | — Pending |
| 13  | 砍掉"上传图片私人定制"                             | 用户不参与设计过程                             | — Pending |
| 14  | 保留"联系高端工作室"（伊伊智能推荐触发）           | 对用户最好的选择时才推                         | — Pending |
| 15  | 首页语音按钮（核心交互差异化）                     | 比文字快，"搭子"体验本质                       | — Pending |
| 16  | 首页"我的搭配集"按场景分组                         | 快速找到需要的搭配                             | — Pending |
| 17  | Onboarding 第 4 步改为"让伊伊搭第一套"             | 展示价值 + 收集偏好 + 第一次衣橱保存           | — Pending |
| 18  | 推送策略递减型                                     | 新用户日推养习惯 → 老用户仅特殊事件            | — Pending |
| 19  | 互联网+比赛                                        | 校赛 5-6 月 → 省赛 7-8 月 → 国赛 10 月         | — Pending |
| 20  | AI 开发者叙事                                      | 一个人+AI=完整产品，代表未来开发方式           | — Pending |
| 21  | 比赛材料：PPT+视频+种子用户+推荐信                 | 四件套缺一不可                                 | — Pending |
| 22  | 个人独立开发（Trae 轻量 + Claude Code 重载）       | 资源分配最大化                                 | — Pending |
| 23  | 数据策略：5 种数据 × 17 个使用场景全覆盖           | 全链路数据闭环                                 | — Pending |
| 24  | STT: Android 原生 SpeechRecognizer                 | 免费，Sprint 够用                              | — Pending |
| 25  | 工作室目录：Sprint 手工 5-10 家 → 后续 BD          | 快速启动                                       | — Pending |
| 26  | 分享图：react-native-view-shot + QR                | 低成本分享裂变                                 | — Pending |
| 27  | 天气 API：和风天气                                 | 1000 次/天免费，中国最优                       | — Pending |
| 28  | 尺码：国标 GB/T 1335                               | Sprint 够用，上线后补充品牌数据                | — Pending |
| 29  | 264 规则 → 自动生成训练数据                        | 规则不可扩展，转化为训练信号                   | — Pending |
| 30  | 协调度模型替代规则引擎 L5                          | 真正的"AI 驱动"而非"AI 辅助"                   | — Pending |
| 31  | 偏好学习模型（5M params）                          | 比 SASRec 更强：学场景 × 用户 × 商品           | — Pending |
| 32  | 17 个数据使用场景全覆盖                            | 全链路数据驱动                                 | — Pending |
| 33  | TTS: Edge-TTS → 讯飞自定义声线                     | Sprint 免费，后续专属声音                      | — Pending |
| 34  | 对话状态机: GREET→CONTEXT→GENERATE→ACTION→WRAP     | 结构化对话流+异常处理                          | — Pending |
| 35  | 视觉体系：暖驼+深炭灰+暖橘+暖白                    | 温暖但不甜腻的时尚感                           | — Pending |
| 36  | 体型敏感度：描述服装不描述身体                     | 伦理红线，试穿失败归因于衣服                   | — Pending |
| 37  | 离线：缓存 50 条+衣橱+日历可离线                   | 弱网/地铁场景覆盖                              | — Pending |
| 38  | 金融模型：3000MAU 盈亏平衡，LTV/CAC 3-4x           | 财务可行性基准                                 | — Pending |
| 39  | TAM 3 亿/SAM 3000 万/SOM 1-5 万(年 1)              | 市场规模锚定                                   | — Pending |
| 40  | 模型评估：Recall@10 +15%，四维推荐评估             | 技术深度证明                                   | — Pending |
| 41  | IP：软著+商标+模型闭源+规则开源                    | 知识产权保护                                   | — Pending |
| 42  | 赛后：融资/独立/B2B 三条路线                       | 风险对冲                                       | — Pending |

## Current Milestone: v2.0 前端全面重构与商业化品质升级

**Goal:** v1.0 已完成 12 Phase（56/56 plans），后端 385 API 全就绪，现以前端为重心全面重构，完全对标顶尖商业 App 设计水准（小红书/得物/NET-A-PORTER）。

**Target features:**

- 全流程深度审计（逐页截图 + 标杆对比 + 组件一致性 + 性能 + 可访问性）
- 品牌视觉资产定义（Logo 设计、应用图标、启动页动画、视觉图案、字体排版体系、插画风格）
- 设计系统重建（完整 Design Token + 原子组件库 + Lottie/Rive 动效 + 暗色模式）
- 核心页面重构（Today/Stylist/Discover/Wardrobe/Profile/Onboarding 六大页面）
- 技术升级（FlashList/图片缓存/离线体验/Reanimated 3 动画体系）
- 微交互与动效（点赞/下拉刷新/共享元素过渡/骨架屏 shimmer/AI 渐进展示）

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-04-27 after v2.0 milestone initiation (frontend restructuring + commercial quality upgrade)_
