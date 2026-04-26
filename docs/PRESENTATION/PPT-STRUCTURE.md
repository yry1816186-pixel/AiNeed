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
