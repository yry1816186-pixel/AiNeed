# Requirements: 寻裳 XUNO — AI 穿搭搭子 伊伊

**Created:** 2026-04-22
**Status:** Active (re-initialized from XUNO_FINAL_PLAN.md, 42 frozen decisions)
**Authoritative Source:** C:\AiNeed\docs\XUNO_FINAL_PLAN.md

---

## v1 Requirements — 48-Hour Sprint (Demo-Ready)

### Foundation (基础)

- [ ] **FND-01**: 移动端 TypeScript 零编译错误（当前 137 个，集中在 ~20 个文件）
- [ ] **FND-02**: 后端 ClothingItem 补充关键字段（material, season, gender, source, DataSource 枚举）
- [ ] **FND-03**: RecommendationBatch + RecommendationImpression 归因表 Prisma 迁移
- [ ] **FND-04**: 统一 UserBehaviorEvent（UserBehavior 视图化）
- [ ] **FND-05**: Mock 商品数据 100+ 条（覆盖多场景 × 多品类 × 多价位矩阵）

### Gender Demotion (性别降级)

- [ ] **GND-01**: auth.dto.ts gender 字段改为 @IsOptional
- [ ] **GND-02**: onboardingStore 移除 gender 必填，新增 primaryScenarios, ageBand, styleExpression 必填
- [ ] **GND-03**: BodyMetricsService 默认值改为基于 waist/hip ratio 连续变量，不依赖 Gender.female 回退
- [ ] **GND-04**: ColdStartService 重构：用 bodyType + styleExpression + primaryScenarios 替代 male/female 分桶
- [ ] **GND-05**: ProfileCompletenessService 权重重算（gender→0%, 场景 20%+体型 25%+风格 20%+衣橱 20%+照片 15%）

### Recommendation Pipeline (推荐管道)

- [ ] **REC-01**: Orchestrator 改为推荐唯一入口（控制器不再绕过 Orchestrator 直接调用策略）
- [ ] **REC-02**: StyleQuizResult 回流到推荐评分权重
- [ ] **REC-03**: ColdStartService 优先读取 Onboarding 数据（primaryScenarios + styleImageSeeds）
- [ ] **REC-04**: 推荐输出必须包含 RecommendationOutput 结构（items + outfit + explanation{why, alternative, nextAction, confidence}）
- [ ] **REC-05**: 降级策略：AI 推荐不可用时，天气+季节+场景模板生成规则化方案
- [ ] **REC-06**: A/B Experiment ID 埋点（每个推荐带 experiment_id，为后续迭代奠基）

### Navigation (导航重构)

- [ ] **NAV-01**: 4 Tab 导航实现（今日/探索/造型师/我的），替代现有 5 Tab
- [ ] **NAV-02**: Wardrobe 从 Profile Stack 提取到 Discover Stack（策展空间）
- [ ] **NAV-03**: TryOnStack 合并到 StylistStack（试衣不再独立页面）
- [ ] **NAV-04**: Community 内容分散到 Today(灵感区) + Me(深层入口)
- [ ] **NAV-05**: 导航状态迁移（NAV_VERSION）防止旧用户崩溃

### Today Screen (今日页面)

- [ ] **TOD-01**: 场景卡组件（天气 + 场景 + 伊伊 AI 摘要 "明天面试，已准备好 3 套"）
- [ ] **TOD-02**: 今日穿搭区（伊伊推荐 + 用户保存，同时展示，标注来源标签）
- [ ] **TOD-03**: 降级方案实现（规则引擎驱动：天气+季节+场景模板）
- [ ] **TOD-04**: 候选适配区（待决策商品的适配判断入口）
- [ ] **TOD-05**: "我的搭配集"按场景分组展示（通勤/约会/新建）

### Discover Screen (探索页面)

- [ ] **DIS-01**: 冷启动用户展示推荐单品流 + 搜索
- [ ] **DIS-02**: 策展空间（已保存/想买/已购三 Tab，替代传统衣橱管理）
- [ ] **DIS-03**: 自然语言搜索栏 + 分类浏览
- [ ] **DIS-04**: "拍照添加"入口保留但不作为主路径

### Yiyi Agent (伊伊对话系统)

- [ ] **YIYI-01**: 对话状态机实现（GREET→CONTEXT→[SCENE|DIRECT|CHAT]→GENERATE→[ACTION|REFINE]→WRAP_UP）
- [ ] **YIYI-02**: 面试穿搭场景完整 Agent 对话（公司类型 → 岗位 → 预算 → 方案 → 试穿 → 保存）
- [ ] **YIYI-03**: 伊伊人格 Prompt（温柔有主见的朋友，不说"亲~"，不说"根据算法分析"）
- [x] **YIYI-04**: 对话中试衣 BottomSheet 触发（不中断对话流） ✓ Phase 4 Plan 04
- [ ] **YIYI-05**: 快速回复按钮（每条伊伊消息下 2-3 个选项，减少打字）
- [x] **YIYI-06**: 异常处理（用户放弃 → 温柔收尾 / 都不喜欢 → 引导描述偏好 / LLM 超时 → 规则降级） ✓ Phase 4 Plan 01/04
- [ ] **YIYI-07**: 偏好记忆基础（记住用户明确的否定偏好，如"不喜欢高领"）

### Voice (语音交互)

- [ ] **VOI-01**: 首页语音按钮（大圆形，底部居中，按住录音+波形动画+松开发送）
- [ ] **VOI-02**: Android 原生 SpeechRecognizer 集成（决策 #24）
- [ ] **VOI-03**: Edge-TTS 基础集成（伊伊语音回复，决策 #33）

### Studio Recommendation (工作室推荐)

- [ ] **WKS-01**: 工作室目录数据结构（名称+城市+擅长场景+价格区间+联系方式）
- [x] **WKS-02**: 伊伊对话中智能推荐触发（信号检测：预算 luxury/连续 3 次拒绝/特殊场合/说"独一无二"） ✓ Phase 4 Plan 04
- [ ] **WKS-03**: 工作室卡片展示（对话中内联，不打断流程）
- [x] **WKS-04**: Sprint 手工录入 5-10 家工作室（决策 #25） ✓ Phase 4 Plan 01/04

### Onboarding (引导流程)

- [x] **ONB-01**: Step 1 -- 场景选择（8 卡片多选 1-3 个） -- Phase 4 Plan 03
- [x] **ONB-02**: Step 2 -- 快速画像（年龄段+身高体重+常穿尺码+garmentPreference） -- Phase 4 Plan 03
- [x] **ONB-03**: Step 3 -- 风格表达（5 选 1）+ 穿搭图选择（6 选 2，向量种子提取） -- Phase 4 Plan 03
- [ ] **ONB-04**: Step 4 — 让伊伊搭第一套（3 套方案+用户选择 → 立即偏好信号+首次衣橱保存）
- [x] **ONB-05**: Onboarding 数据立即流入 ColdStartService -- Phase 4 Plan 03

### Fashion Rules (时尚规则修复)

- [ ] **RUL-01**: above_30 温区 8 个场合 tips 按场景差异化重写
- [ ] **RUL-02**: 0_10 温区面试 layer_details 修复（单层 → 分层）
- [ ] **RUL-03**: full_outfit_engine.py 从 JSON 规则文件动态加载替代硬编码

### Visual System (视觉体系)

- [ ] **VIS-01**: 配色体系实施（主色#C4956A 暖驼 + 辅色#2D3436 深炭灰 + 强调#E17055 暖橘 + 背景#FAFAF8 暖白）
- [ ] **VIS-02**: 伊伊形象组件（暖驼色圆形 + 简笔画衣架图标，不做拟人头像）
- [ ] **VIS-03**: 圆角统一（卡片 16px / 按钮 12px / 输入框 24px）+ 间距基线 8px
- [ ] **VIS-04**: FashionSigLIP 向量可视化组件（推荐结果旁展示相似度热力图，技术深度展示）

### Calendar (穿搭日历)

- [ ] **CAL-01**: 7 天穿搭日历简化版（周视图 + 天气 + 场景标签 + 搭配缩略图）
- [ ] **CAL-02**: 点击日期查看/修改搭配方案

### Curated Wardrobe (策展型衣橱)

- [ ] **CUR-01**: 衣橱数据模型重构（savedOutfits + wishlistedItems + purchasedItems 替代 ownedItems）
- [ ] **CUR-02**: 偏好互补推荐逻辑（从"物品互补"变为"偏好互补"，推荐未探索的风格方向）

### Ethics (伦理)

- [ ] **ETH-01**: 体型敏感度措辞规范（描述服装不描述身体，试穿失败归因于衣服）
- [ ] **ETH-02**: 体型报告使用正面措辞（强调"适合什么"而非"避免什么"）

---

## v2 Requirements — Post-Sprint (4-8 Weeks)

### Model Upgrade (模型升级)

- [ ] **MOD-01**: Marqo-FashionSigLIP 替换 FashionCLIP（决策 #7）
- [ ] **MOD-02**: 中国数据 Fine-tune（淘宝客 5000 商品图 + DeepFashion 中文子集 + LoRA rank=16）
- [ ] **MOD-03**: 偏好学习模型 v1（5M params，输入：用户 Profile+场景+候选商品，输出：偏好得分）
- [ ] **MOD-04**: 穿搭协调度模型（10M params，双塔+交叉注意力，替代规则引擎 L5）

### Data Flywheel (数据飞轮)

- [ ] **FLY-01**: 用户行为收集管道（选择/跳过/收藏/购买，带上下文）
- [ ] **FLY-02**: SASRetrain 自动化（月度重训练）
- [ ] **FLY-03**: FashionSigLIP Fine-tune 迭代循环（月度）
- [ ] **FLY-04**: 穿搭日记 + 风格进化可视化（周报：满意度+风格分布+趋势+进化曲线）

### Photo Search (拍照识图找同款)

- [x] **PHO-01**: 拍照 → FashionSigLIP 编码 → Qdrant 向量检索 → 展示 5 个相似款 ✓ Phase 08 Plan 01
- [ ] **PHO-02**: 找到同款后自然引导 "AI 帮你搭更好的" → 注册转化

### Calendar Full (穿搭日历完整版)

- [ ] **CAL-03**: AI 自动基于天气+日历+衣橱生成一周搭配计划
- [ ] **CAL-04**: 标注特殊事件（面试/约会/聚会），点击修改方案
- [ ] **CAL-05**: 用户修改方案的操作作为偏好信号回流

### Mini Program (微信小程序)

- [x] **MINI-01**: 微信小程序 v1（核心功能：伊伊对话+试穿+分享） — 后端认证+Taro 项目+3 页面+分享 ✓ Phase 08 Plan 01+03
- [x] **MINI-02**: 小程序分享到朋友圈/群（裂变零摩擦） — Taro useShareAppMessage + useShareTimeline ✓ Phase 08 Plan 03

### Social Features (社交功能)

- [x] **SOC-01**: 风格 DNA 社交匹配（基于向量的"和你风格最像的人"推荐） ✓ 08-02
- [ ] **SOC-02**: 分享裂变（react-native-view-shot + QR，穿搭方案分享图+二维码）

### Recommendation Advanced (推荐进阶)

- [ ] **RAD-01**: SASRec 训练管道（RTX 4060 本地）
- [ ] **RAD-02**: 六层漏斗完整实现（L1 合规 →L2 场景 →L3 尺码 →L4 预算 →L5 风格 →L6 衣橱互补）
- [ ] **RAD-03**: FashionSigLIP 偏见审计（5 Profile 同场景不同风格 → 80%+同性别编码=偏见）
- [ ] **RAD-04**: 混合 Explanation 生成（规则引擎证据 + LLM 润色）

### Data Pipeline (数据管道)

- [ ] **DAT-01**: 淘宝客 API 对接（商品搜索/详情/转链）
- [ ] **DAT-02**: 京东联盟 API 对接（优先接入，审核快）
- [ ] **DAT-03**: 全量同步(每日) + 增量(每 2 小时) + 热门刷新(每 30 分钟)
- [ ] **DAT-04**: FashionSigLIP 批量嵌入管道
- [ ] **DAT-05**: 颜色标准化服务

### Compliance (合规前置)

- [ ] **CMP-01**: PIPL 敏感信息单独同意机制（三围/照片/体脂率）
- [ ] **CMP-02**: GB/T 45574-2025 逐项同意架构
- [ ] **CMP-03**: 国产 AI API 无跨境确认
- [ ] **CMP-04**: 软著 + "寻裳""伊伊"商标注册（决策 #41）
- [ ] **CMP-05**: 算法备案准备

### Security (安全修复)

- [ ] **SEC-01**: Nginx 反向代理 + Let's Encrypt TLS
- [ ] **SEC-02**: 端口绑定 127.0.0.1 + 防火墙
- [ ] **SEC-03**: API 密钥 Docker Secrets / Vault
- [ ] **SEC-04**: 移动端 EXPO_PUBLIC_API 改服务端代理

### Monetization (商业化)

- [ ] **MON-01**: 免费层限额（每日 5 次 AI 对话 + 3 次试穿 + 20 件衣橱）
- [ ] **MON-02**: 内容产物付费（色彩报告 9.9 元 + 体型报告 + 胶囊衣橱方案 19 元，一次性购买）
- [ ] **MON-03**: 高级会员（连续穿搭计划 + 深度衣橱诊断 + AI 主动推送，9.9 元/月）
- [ ] **MON-04**: 分享种子功能（穿搭方案图+试衣图+报告图，含 QR 码）

### Production (生产部署)

- [ ] **PRD-01**: Nginx + TLS + 监控告警部署
- [ ] **PRD-02**: 端侧推理迁移（MediaPipe + CIELAB + 规则引擎）
- [ ] **PRD-03**: 离线能力（缓存 50 条推荐 + 衣橱 + 日历可离线使用）
- [ ] **PRD-04**: 性能压测 + 安全审计
- [ ] **PRD-05**: Android 应用商店上架（华为/小米/OPPO/vivo）

### Competition Materials (比赛材料)

- [ ] **CMP-06**: PPT + 商业计划书（15 页叙事结构）
- [ ] **CMP-07**: Demo 演示视频（1-3 分钟，面试穿搭场景完整 Agent 对话 + 技术可视化）
- [ ] **CMP-08**: 种子用户数据（10-20 人使用数据）
- [ ] **CMP-09**: 导师推荐信

---

## Out of Scope

| Item                                 | Reason                     | When         |
| ------------------------------------ | -------------------------- | ------------ |
| Feature Flag 体系                    | 一次性重构，不需要并存机制 | 永远不需要   |
| Deep Link 路由迁移                   | Demo 不需要推送通知        | 上线前       |
| 未成年人合规法务                     | 非代码问题                 | 上线前       |
| 电商 API 真实对接                    | Sprint 用 Mock             | 上线前       |
| SASRec ONNX 导出                     | 服务端推理够用             | 用户量 >1000 |
| 协同过滤 / 知识图谱                  | 伪实现直接砍               | 永远不做     |
| 社区 Tab                             | 降为灵感层                 | 日活 5 万+   |
| 上传图片私人定制                     | 砍掉（决策 #13）           | 永远不做     |
| 微服务拆分                           | 不提前拆                   | 永远不做     |
| @react-navigation/native-bottom-tabs | 与 screens 4.4.0 冲突      | 永远不用     |
| FashionCLIP ONNX int8 量化           | 向量漂移严重               | 永远不用     |
| HarmonyOS 应用                       | 不在范围                   | 市场需求驱动 |
| Flutter 迁移                         | 保持 RN 已投入             | 永远不做     |
| PDF 报告生成                         | 后续功能                   | 会员上线时   |
| 银发用户规则                         | 市场有限                   | 用户反馈驱动 |

---

## Traceability

| Requirement       | Phase       | Status   | Notes                                                                                                                |
| ----------------- | ----------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| FND-01 ~ FND-05   | Phase 1     | Complete | Phase 1 VERIFICATION missing; FND-01 (TS errors) partially done (audit 2026-04-25: backend 0 errors, mobile unknown) |
| GND-01 ~ GND-05   | Phase 1     | Complete | Gender demotion executed in Phase 1 Plan 03                                                                          |
| REC-01 ~ REC-06   | Phase 2     | Complete | Phase 2 VERIFICATION: 7/7 must-haves SATISFIED                                                                       |
| CUR-01 ~ CUR-02   | Phase 2     | Complete | Phase 2 VERIFICATION: SATISFIED                                                                                      |
| NAV-01 ~ NAV-05   | Phase 3     | Complete | Phase 3 VERIFICATION missing; navigation refactored                                                                  |
| TOD-01 ~ TOD-05   | Phase 3     | Partial  | UI components exist but TodayScreen data is hardcoded (audit 2026-04-25)                                             |
| DIS-01 ~ DIS-04   | Phase 3     | Complete | DiscoverScreen exists; DIS-01 empty state missing                                                                    |
| CAL-01 ~ CAL-02   | Phase 3     | Complete | Calendar exists; CAL-01 empty state in English                                                                       |
| YIYI-01 ~ YIYI-07 | Phase 4     | Complete | Phase 4 VERIFICATION: 9/9 must-haves SATISFIED; YIYI-07 preference memory implemented                                |
| VOI-01 ~ VOI-03   | Phase 4     | Complete | Phase 4 VERIFICATION: SATISFIED                                                                                      |
| WKS-01 ~ WKS-04   | Phase 4     | Complete | Phase 4 VERIFICATION: SATISFIED; WKS-01/03 partially (no real studios)                                               |
| ONB-01 ~ ONB-05   | Phase 4     | Complete | Phase 4 VERIFICATION: SATISFIED; ONB-04 implemented in Plan 06                                                       |
| RUL-01 ~ RUL-03   | Phase 4     | Complete | FashionRuleLoader + 7 JSON rule files + 264+ rules                                                                   |
| ETH-01 ~ ETH-02   | Phase 4     | Complete | BODY_POSITIVE_PROMPT in dialog_engine.py; audit found body-positive.filter.ts MISSING                                |
| VIS-01 ~ VIS-04   | Phase 1,3,5 | Partial  | VIS-01: 84 hardcoded colors remain; VIS-04: deferred to Phase 5                                                      |
| MOD-01 ~ MOD-04   | Phase 6     | Pending  |                                                                                                                      |
| FLY-01 ~ FLY-04   | Phase 7     | Pending  |                                                                                                                      |
| PHO-01 ~ PHO-02   | Phase 8     | PHO-01 ✓ | Image embedding + vector search endpoint (08-01)                                                                     |
| CAL-03 ~ CAL-05   | Phase 7     | Pending  |                                                                                                                      |
| MINI-01 ~ MINI-02 | Phase 8     | All ✓    | Backend auth + jscode2session (08-01) + Taro project + share hooks (08-03)                                           |
| SOC-01 ~ SOC-02   | Phase 8     | SOC-01 ✓ | StyleDNAService + Qdrant user_style_dna + NestJS proxy (08-02)                                                       |
| RAD-01 ~ RAD-04   | Phase 6-7   | Pending  |                                                                                                                      |
| DAT-01 ~ DAT-05   | Phase 6     | Pending  |                                                                                                                      |
| CMP-01 ~ CMP-05   | Phase 6     | Pending  |                                                                                                                      |
| SEC-01 ~ SEC-04   | Phase 6     | Pending  |                                                                                                                      |
| MON-01 ~ MON-04   | Phase 9     | Pending  |                                                                                                                      |
| PRD-01 ~ PRD-05   | Phase 10    | Pending  |                                                                                                                      |
| CMP-06 ~ CMP-09   | Phase 5+    | Pending  |                                                                                                                      |

---

_Requirements re-initialized: 2026-04-22 from XUNO_FINAL_PLAN.md_
_Traceability updated: 2026-04-25 (audit-driven update)_
