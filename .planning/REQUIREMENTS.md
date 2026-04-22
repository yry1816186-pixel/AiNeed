# Requirements: XUNO AI 穿搭决策平台

**Created:** 2026-04-22
**Status:** Active (auto-mode, derived from XUNO_FUSION_PLAN.md + 7-domain research)

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

### Navigation (导航重构)

- [ ] **NAV-01**: 4 Tab 导航实现（今日/探索/造型师/我的），替代现有 5 Tab
- [ ] **NAV-02**: Wardrobe 从 Profile Stack 提取到 Discover Stack
- [ ] **NAV-03**: TryOnStack 合并到 StylistStack（试衣不再独立页面）
- [ ] **NAV-04**: Community 内容分散到 Today(灵感区) + Me(深层入口)
- [ ] **NAV-05**: 导航状态迁移（NAV_VERSION）防止旧用户崩溃

### Today Screen (今日页面)

- [ ] **TOD-01**: 场景卡组件（天气 + 场景选择 + AI 一句话摘要）
- [ ] **TOD-02**: 今日方案卡片（2-3 套完整搭配，标注衣橱来源）
- [ ] **TOD-03**: 降级方案实现（规则引擎驱动：天气+季节+场景模板）
- [ ] **TOD-04**: 候选适配区（待决策商品的适配判断入口）

### Discover Screen (探索页面)

- [ ] **DIS-01**: 冷启动用户展示推荐单品流 + 搜索
- [ ] **DIS-02**: 有衣橱用户（>5 件）展示衣橱管理 + 缺口推荐
- [ ] **DIS-03**: 自然语言搜索栏 + 分类浏览
- [ ] **DIS-04**: "拍照添加到衣橱"引导入口

### AI Stylist (AI 造型师)

- [ ] **STY-01**: 合并 AiStylistScreen + AiStylistChatScreen 为单屏体验
- [ ] **STY-02**: 对话式穿搭方案输出（搭配+理由+替代+下一步动作）
- [ ] **STY-03**: 试衣按钮嵌入对话流（BottomSheet 模式，不中断对话）
- [ ] **STY-04**: FashionRulesService 过滤规则注入（按 bodyType+occasion+colorSeason 过滤 264+ JSON 规则）
- [ ] **STY-05**: 试衣结果带可信度 + 误差来源 + 适用边界标注

### Onboarding (引导流程)

- [ ] **ONB-01**: Step 1 — 场景选择（8 卡片多选 1-3 个）
- [ ] **ONB-02**: Step 2 — 快速画像（年龄段+身高体重+常穿尺码+garmentPreference）
- [ ] **ONB-03**: Step 3 — 风格表达（5 选 1）+ 穿搭图选择（6 选 2，FashionCLIP 种子提取）
- [ ] **ONB-04**: Step 4 — 可选照片上传 + 衣橱连接（可跳过）
- [ ] **ONB-05**: Onboarding 数据立即流入 ColdStartService，首次推荐可见效果

### Fashion Rules (时尚规则修复)

- [ ] **RUL-01**: above_30 温区 8 个场合 tips 按场景差异化重写
- [ ] **RUL-02**: 0_10 温区面试 layer_details 修复（单层 → 分层）
- [ ] **RUL-03**: full_outfit_engine.py 从 JSON 规则文件动态加载替代硬编码（如有时间）

---

## v2 Requirements — Long-term (13-19 Weeks)

### Compliance (合规前置)

- [ ] **CMP-01**: PIPL 敏感信息单独同意机制（三围/照片/体脂率）
- [ ] **CMP-02**: GB/T 45574-2025 逐项同意架构 + 数据保留策略
- [ ] **CMP-03**: 国产 AI API 无跨境数据传输确认（智谱/豆包/DeepSeek）
- [ ] **CMP-04**: 软著申请启动（60-90 天关键路径）
- [ ] **CMP-05**: 算法备案准备（公开分发前完成）

### Security (安全修复)

- [ ] **SEC-01**: Nginx 反向代理 + Let's Encrypt TLS 终止
- [ ] **SEC-02**: 端口绑定 127.0.0.1 + 防火墙规则
- [ ] **SEC-03**: API 密钥 Docker Secrets / HashiCorp Vault 替代明文
- [ ] **SEC-04**: 移动端 EXPO_PUBLIC_API 密钥改为服务端代理

### Data Pipeline (数据管道)

- [ ] **DAT-01**: 淘宝客 API 对接（商品搜索/详情/转链）
- [ ] **DAT-02**: 京东联盟 API 对接（优先接入，审核快佣金高）
- [ ] **DAT-03**: 全量商品同步(每日) + 增量同步(每 2 小时) + 热门刷新(每 30 分钟)
- [ ] **DAT-04**: FashionCLIP 批量嵌入管道（商品摄取时预计算 512 维向量）
- [ ] **DAT-05**: 颜色标准化服务

### Recommendation Advanced (推荐进阶)

- [ ] **RAD-01**: SASRec 训练管道（RTX 4060 本地训练）
- [ ] **RAD-02**: 六层漏斗完整实现（L1 合规 →L2 场景 →L3 尺码 →L4 预算 →L5 风格 →L6 衣橱互补）
- [ ] **RAD-03**: FashionCLIP 偏见审计 + 检索层多样性约束
- [ ] **RAD-04**: 混合 Explanation 生成（规则引擎证据 + LLM 润色）

### Monetization (商业化)

- [ ] **MON-01**: 免费层实现（每日 5 次 AI 对话 + 3 次试穿 + 基础衣橱 20 件）
- [ ] **MON-02**: 内容产物付费层（色彩报告 + 体型报告 + 胶囊衣橱方案）
- [ ] **MON-03**: 高级会员层（连续穿搭计划 + 深度衣橱诊断 + AI 主动推送）
- [ ] **MON-04**: 分享种子功能（穿搭方案分享图 + 试衣效果图 + 会员报告分享图）

### Production (生产就绪)

- [ ] **PRD-01**: Nginx + TLS + 监控告警部署
- [ ] **PRD-02**: 端侧推理迁移（MediaPipe + CIELAB + 规则引擎）
- [ ] **PRD-03**: SASRec ONNX 导出 + 嵌入表同步
- [ ] **PRD-04**: 性能压测 + 安全审计
- [ ] **PRD-05**: Android 应用商店上架（华为/小米/OPPO/vivo）

---

## Out of Scope

| Item                                 | Reason                             | When                                |
| ------------------------------------ | ---------------------------------- | ----------------------------------- |
| Feature Flag 体系                    | 一次性重构，不需要新旧并存         | 永远不需要                          |
| Deep Link 路由迁移                   | Demo 不需要推送通知                | 上线前                              |
| 未成年人合规法务                     | 非代码问题                         | 上线前（法务确认 ageBand 最低门槛） |
| PIPL 合规法务审查                    | 需中国律师审查                     | 阶段 A                              |
| 电商 API 真实对接                    | Mock 数据足够 Demo                 | 阶段 B                              |
| SASRec ONNX 导出                     | 服务端推理够用                     | 用户量 >1000                        |
| 协同过滤 / 知识图谱                  | 伪实现直接砍                       | 永远不做                            |
| 社区 Tab                             | 降为灵感层                         | 日活 5 万+                          |
| 端侧推理迁移                         | 服务端够用                         | 成本压力时                          |
| PDF 报告生成                         | 后续功能                           | 会员上线时                          |
| 银发用户规则                         | 市场有限                           | 用户反馈驱动                        |
| 微服务拆分                           | 不提前拆                           | 永远不做                            |
| @react-navigation/native-bottom-tabs | 与 react-native-screens 4.4.0 冲突 | 永远不用                            |
| FashionCLIP ONNX int8 量化           | CLIP 模型 int8 向量漂移严重        | 永远不用                            |
| HarmonyOS 应用                       | 不在当前范围                       | 市场需求驱动                        |

---

## Traceability

| Phase | Requirements                   |
| ----- | ------------------------------ |
| —     | _(to be filled by ROADMAP.md)_ |

---

_Requirements defined: 2026-04-22_
