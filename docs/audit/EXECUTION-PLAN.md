# 寻裳 XUNO — 最高并发执行方案

> **前提条件**: Trae + GLM-5.1 无限并发会话，资源不限，方向由总指挥验收把控
> **目标**: 从 47/100 提升到 80+/100，实现极致优秀、极致创新、极致含金量
> **策略**: 从"减法保 Demo"变为"加法致胜" — 全量修复所有问题 + 新增创新突破

---

## 核心策略转变

| 维度     | 旧策略（48h 限制）     | 新策略（无限并发）                          |
| -------- | ---------------------- | ------------------------------------------- |
| STT 语音 | 放弃，改文字输入       | 保留，用 Android 原生方案独立实现           |
| 推荐管道 | 接通一条路径就够       | 全量重构，六层漏斗真正实现                  |
| 移动端   | exclude 不做的 feature | 全部修复，包括被砍功能的基础设施            |
| 创新     | 无（保 Demo）          | ChineseFashionCLIP Fine-tune + 偏好进化曲线 |
| 合规     | 暂缓                   | 立即启动软著+商标+用户协议                  |

---

## 15 轨道并行执行图

```
轨道  [P0 基础生存]           [P1 Demo质量]           [P2 含金量]        [P3 上线准备]
 1    推荐管道重构
 2    性别降级全量
 3                              对话状态机
 5    移动端TS+导航
 7    FashionCLIP接入
 8    ML对话状态机
 6                              Onboarding+Stylist
 10                             黄金推荐+可视化
 12                             PPT+Demo重写
 9                                                     ChineseFashionCLIP
 11                                                     金融模型修正
 13                                                     AI开发者证据链
 4                                                                        安全+PIPL
 14                                                                       商标+软著
 15                                                                       种子用户测试
```

---

## 轨道清单

### P0 — 决定项目能不能活（立即启动）

| #   | 轨道名                    | 会话数 | 核心交付物                                                                    | 预估耗时 | prompt 文件                       |
| --- | ------------------------- | ------ | ----------------------------------------------------------------------------- | -------- | --------------------------------- |
| 1   | 后端推荐管道重构          | 1      | Orchestrator 真正实现六层漏斗，砍掉虚假 import，接通规则引擎                  | 6-8h     | prompts/01-rec-pipeline.md        |
| 2   | 后端性别降级全量          | 1      | 30 个文件 gender 字段全部降级，ColdStartService 改为 bodyType+styleExpression | 4-6h     | prompts/02-gender-downgrade.md    |
| 5   | 移动端 TS 修复+导航重构   | 2      | 138→0 TS 错误，5Tab→4Tab，TodayScreen+DiscoverScreen                          | 8-10h    | prompts/05-mobile-fix.md          |
| 7   | FashionCLIP 接入+向量灌入 | 1      | 替换 bge-small-zh，接入 FashionCLIP，灌入 Mock 数据到 Qdrant                  | 4-6h     | prompts/07-clip-qdrant.md         |
| 8   | ML 对话状态机 Python      | 1      | intelligent_stylist_service.py 实现 GREET→CONTEXT→GENERATE 三步               | 4-6h     | prompts/08-dialog-statemachine.md |

### P1 — 决定 Demo 好不好（P0 启动后立即启动）

| #   | 轨道名                    | 会话数 | 核心交付物                                           | 预估耗时 | prompt 文件                      |
| --- | ------------------------- | ------ | ---------------------------------------------------- | -------- | -------------------------------- |
| 3   | 后端对话状态机 NestJS     | 1      | context.service.ts 完整状态机+slot 提取              | 4-6h     | prompts/03-dialog-backend.md     |
| 6   | 移动端 Onboarding+Stylist | 1      | 新 4 步 Onboarding + Stylist 单屏体验 + 快速回复按钮 | 6-8h     | prompts/06-onboarding-stylist.md |
| 10  | 黄金推荐+匹配度可视化     | 1      | 5 种 Profile 各 3 套黄金推荐 + 匹配度雷达图组件      | 4-6h     | prompts/10-golden-reco.md        |
| 12  | PPT+Demo 路径重写         | 1      | 金奖级 15 页 PPT + 2:20 秒级 Demo 脚本               | 6-8h     | prompts/12-ppt-demo.md           |

### P2 — 决定含金量够不够（可立即启动，不依赖 P0）

| #   | 轨道名                       | 会话数 | 核心交付物                                            | 预估耗时 | prompt 文件                |
| --- | ---------------------------- | ------ | ----------------------------------------------------- | -------- | -------------------------- |
| 9   | ChineseFashionCLIP Fine-tune | 1      | 用 DeepFashion 数据在 AutoDL 上 Fine-tune + benchmark | 8-12h    | prompts/09-finetune.md     |
| 11  | 金融模型修正                 | 1      | CHINA_MARKET.md 全面修正 + 商业计划书                 | 3-4h     | prompts/11-finance.md      |
| 13  | AI 开发者证据链              | 1      | git 统计+开发日志+决策记录+Prompt 策略文档            | 4-6h     | prompts/13-dev-evidence.md |

### P3 — 决定能不能上线（可立即启动）

| #   | 轨道名             | 会话数 | 核心交付物                                  | 预估耗时 | prompt 文件                 |
| --- | ------------------ | ------ | ------------------------------------------- | -------- | --------------------------- |
| 4   | 后端安全+PIPL+措辞 | 1      | 密钥轮换+PIPL 同意 API+体正面 system prompt | 4-6h     | prompts/04-security-pipl.md |
| 14  | 商标+软著+域名     | 1      | 查询结果+申请材料+注册                      | 2-4h     | prompts/14-ip-legal.md      |
| 15  | 种子用户测试框架   | 1      | 测试脚本+反馈收集表+5 个用户的完整测试记录  | 4-6h     | prompts/15-user-test.md     |

---

## 接口契约（所有轨道共享）

以下接口在所有轨道启动前冻结，每个 prompt 中嵌入完整定义：

### RecommendationOutput（轨道 1、3、5、6、7、10 共享）

```typescript
interface RecommendationOutput {
  outfits: OutfitSuggestion[];
  explanation: {
    why: string; // 自然语言解释
    confidence: number; // 0-1
    factors: {
      // 各维度匹配度
      bodyType: number; // 体型匹配 0-100
      occasion: number; // 场景匹配 0-100
      color: number; // 色彩匹配 0-100
      style: number; // 风格匹配 0-100
      budget: number; // 预算匹配 0-100
    };
    nextAction?: string; // 建议的下一步
  };
  source: "rules" | "vector" | "hybrid";
}
```

### OnboardingOutput（轨道 2、4、6 共享）

```typescript
interface OnboardingOutput {
  userId: string;
  profile: {
    primaryScenarios: string[]; // 替代gender的场景偏好
    ageBand: "18-24" | "25-34" | "35+";
    styleExpression: string[]; // 替代gender的风格表达
    bodyType?: string; // 可选
    colorSeason?: string; // 可选
    garmentPreference: {
      lowerBody: "pants" | "skirts" | "both";
      upperFit: "fitted" | "regular" | "loose";
    };
  };
  initialRecommendations: RecommendationOutput;
}
```

### DialogState（轨道 3、8 共享）

```typescript
type DialogState = "GREET" | "CONTEXT" | "GENERATE" | "REFINE" | "ACTION" | "WRAP";
type DialogSlot = {
  occasion?: string;
  bodyType?: string;
  stylePreference?: string[];
  budget?: { min: number; max: number };
  colorPreference?: string[];
  avoidItems?: string[];
};
```

---

## 验收标准（总指挥逐轨道验收）

每个轨道完成后，总指挥按以下标准验收：

| 轨道 | 验收命令/方法                                                          | 通过标准                                     |
| ---- | ---------------------------------------------------------------------- | -------------------------------------------- |
| 1    | `cd apps/backend && npx tsc --noEmit`                                  | 0 错误 + orchestrator 不再 import 砍掉的模块 |
| 2    | `grep -r "gender" apps/backend/src/ apps/mobile/src/ --include="*.ts"` | 0 个必填 gender 字段                         |
| 5    | `cd apps/mobile && npx tsc --noEmit`                                   | 0 错误 + 4Tab 导航                           |
| 7    | `curl localhost:3001/api/recommendations/test`                         | 返回 FashionCLIP 嵌入+Qdrant 检索结果        |
| 8    | Python 测试对话状态转换                                                | GREET→CONTEXT→GENERATE 三步正确流转          |
| 3    | 后端对话 API 测试                                                      | 返回结构化 DialogState+slots                 |
| 6    | 移动端 App 运行                                                        | Onboarding 4 步+Stylist 单屏                 |
| 10   | 推荐结果检查                                                           | 5 种 Profile 各有 3 套推荐+雷达图渲染        |
| 12   | 人工审阅                                                               | PPT 叙事连贯+Demo 路径无空档                 |
| 9    | benchmark 对比                                                         | Fine-tune 模型 Recall@5 > 原版               |
| 11   | 数字审计                                                               | 每个数字有出处                               |
| 13   | 证据链检查                                                             | git 统计+日志+决策记录完整                   |
| 4    | 安全扫描                                                               | .env 无真实密钥+PIPL 端点存在                |
| 14   | 实际查询                                                               | 商标状态已知+软著材料就绪                    |
| 15   | 用户反馈                                                               | 5 个用户完成测试+有截图                      |

---

## 含金量突破点（项目的"只有我们能做"）

### 突破 1: ChineseFashionCLIP（轨道 9）

Fine-tune FashionCLIP 在中国时尚数据上，解决 Farfetch 西方审美偏见。

- 技术：在 DeepFashion/Polyvore 数据集上用对比学习微调
- 壁垒：竞品用原始 FashionCLIP，XUNO 用中国数据微调版
- 含金量：评委问"哪个模型是你自己训练的"时有答案
- 论文级贡献：可以作为创新点写成短论文

### 突破 2: 穿搭偏好进化曲线（轨道 6 + 8）

用户能看到自己的风格从第 1 天到第 30 天的变化曲线。

- 技术：记录每次选择，用 SASRec 嵌入空间投影到 2D
- 壁垒：竞品没有，且需要用户数据才能构建
- 含金量：Demo 中展示"伊伊比你更了解你的风格"的可视化证明

### 突破 3: 对话式记忆能力（轨道 3 + 8）

伊伊能记住用户 5 分钟前说的偏好，并在新场景中主动应用。

- 技术：Redis 存储偏好 slot + 对话状态机注入历史偏好
- 壁垒：大厂的穿搭推荐没有对话记忆
- 含金量：这是 Demo 的"哇"时刻

### 突破 4: 推荐准确率 benchmark（轨道 7 + 9 + 10）

用 5 种 Profile×10 个场景=50 个测试 case，计算推荐命中率。

- 技术：自动化评估脚本 + 人工标注参考答案
- 壁垒：大部分学生项目没有 benchmark
- 含金量：评委问"准确率多少"时有真实数字

---

## 执行节奏

```
T+0h:    15个轨道全部启动（15个Trae会话并行）
T+4h:    验收P0轨道（轨道2、4、7、11、14、15较快的先到）
T+8h:    验收P0轨道（轨道1、5、8）
T+12h:   验收P1轨道（轨道3、6、10、12）
T+16h:   验收P2轨道（轨道9、13）
T+20h:   全量集成测试
T+24h:   Demo录制 + PPT定稿
T+28h:   种子用户测试
T+32h:   最终修正
```

---

## prompt 文件索引

| 文件                              | 轨道                 | 优先级 |
| --------------------------------- | -------------------- | ------ |
| prompts/01-rec-pipeline.md        | 推荐管道重构         | P0     |
| prompts/02-gender-downgrade.md    | 性别降级全量         | P0     |
| prompts/03-dialog-backend.md      | 后端对话状态机       | P1     |
| prompts/04-security-pipl.md       | 安全+PIPL+措辞       | P3     |
| prompts/05-mobile-fix.md          | 移动端 TS+导航       | P0     |
| prompts/06-onboarding-stylist.md  | Onboarding+Stylist   | P1     |
| prompts/07-clip-qdrant.md         | FashionCLIP+向量灌入 | P0     |
| prompts/08-dialog-statemachine.md | ML 对话状态机        | P0     |
| prompts/09-finetune.md            | ChineseFashionCLIP   | P2     |
| prompts/10-golden-reco.md         | 黄金推荐+可视化      | P1     |
| prompts/11-finance.md             | 金融模型修正         | P2     |
| prompts/12-ppt-demo.md            | PPT+Demo 重写        | P1     |
| prompts/13-dev-evidence.md        | AI 开发者证据链      | P2     |
| prompts/14-ip-legal.md            | 商标+软著+域名       | P3     |
| prompts/15-user-test.md           | 种子用户测试         | P3     |
