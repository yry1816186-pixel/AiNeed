# 寻裳 XUNO — 执行总纲

> 生成日期: 2026-04-22 | 融合 8 域研究 + 融合计划 + 无服务器架构分析
> **本文档是执行阶段的唯一参考。研究细节见 `.planning/research/` 各文件。**

---

## 1. 架构决策：本地优先混合部署

### 部署架构

```
Android 手机端                    RTX 4060 开发机 (7×24 Docker)        云端 API (按量)
┌──────────────────┐         ┌─────────────────────────┐       ┌──────────────┐
│ React Native App │◄──HTTPS─┤ Cloudflare Tunnel (免费) │       │ GLM-4-Flash  │
│                  │         │                         │       │ (免费!)       │
│ MediaPipe Pose   │         │ NestJS (后端 API)        │       │ Doubao/GLM   │
│ CIELAB 色彩分析  │         │ PostgreSQL + Redis       │       │ (虚拟试穿)    │
│ 规则引擎评分     │         │ Qdrant (向量库)          │       │ DeepSeek     │
│ 图像质量检测     │         │ FastAPI (ML 推理)        │       │ (备选 LLM)   │
│                  │         │ FashionCLIP (ONNX fp32)  │       └──────────────┘
└──────────────────┘         │ SASRec (PyTorch)         │
                             └─────────────────────────┘
```

### 关键数字

| 项目                 | 数值                             |
| -------------------- | -------------------------------- |
| RTX 4060 VRAM 占用   | ~2GB (FashionCLIP 1.5GB + 系统)  |
| GLM-4-Flash LLM      | **完全免费** (智谱 AI 2025 策略) |
| Cloudflare Tunnel    | **免费** (内网穿透，无需公网 IP) |
| 月成本 (0-100 DAU)   | ~110 元 (电费 + 域名)            |
| 月成本 (100-500 DAU) | ~400 元 (含虚拟试穿 API)         |
| 家庭宽带瓶颈         | 上行 30-50Mbps，1000 DAU 可承受  |
| 最大成本黑洞         | 虚拟试穿图像生成 (占总成本 70%+) |

### 分阶段迁移路径

| DAU      | 部署方案                         | 月成本    | 触发条件     |
| -------- | -------------------------------- | --------- | ------------ |
| 0-100    | 本地全栈 + CF Tunnel             | ~110 元   | 立即开始     |
| 100-500  | + Supabase 备份 + Cloudflare CDN | ~400 元   | 数据安全需求 |
| 500-2000 | Oracle Cloud 免费 VM + 本地 ML   | ~1000 元  | 带宽告警     |
| 2000+    | 全云端 GPU 服务器                | ~3000+ 元 | 有稳定收入后 |

---

## 2. 技术约束速查

### 已安装，无需新增

- `@react-navigation/bottom-tabs` v6.6.0 — 4 Tab 导航
- `zustand` v5.0.5 — 状态管理
- `@gorhom/bottom-sheet` v5.0.0 — Stylist 试衣 BottomSheet
- `@shopify/flash-list` v2.3.1 — 推荐流列表
- `qdrant-client` — 向量存储
- `onnxruntime` — ML 推理

### 需要新增（仅 ML 侧）

- `optimum[onnxruntime]` — FashionCLIP ONNX 导出（一次性）
- `torch>=2.0.0` — SASRec 训练（ML 虚拟环境中已注释，取消注释即可）

### 永远不用

- `@react-navigation/native-bottom-tabs` — 与 react-native-screens 4.4.0 冲突
- FashionCLIP ONNX int8 量化 — CLIP 模型 int8 向量漂移严重
- 协同过滤 / 知识图谱 — 伪实现直接砍

### 锁定依赖

- react-native-screens 4.4.0
- react-native-reanimated 3.16.7
- react-native-svg 15.8.0

---

## 3. 执行路线图

### Track A: 48 小时 Sprint (5 Phases)

```
Phase 1 (H0-8)    Phase 2 (H8-16)   Phase 3 (H16-28)  Phase 4 (H28-40)  Phase 5 (H40-48)
基础+TS错误       推荐管道           导航+核心页面      造型师+引导       端到端集成
┌──────────┐     ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│FND 01-05 │     │REC 01-05 │      │NAV 01-05 │      │STY 01-05 │      │E2E 测试  │
│GND 01-05 │     │          │      │TOD 01-04 │      │ONB 01-05 │      │视觉修复  │
│          │     │          │      │DIS 01-04 │      │RUL 01-03 │      │Demo 就绪 │
└────┬─────┘     └────┬─────┘      └────┬─────┘      └────┬─────┘      └──────────┘
     ↓                ↓                 ↓                 ↓
  10 REQs          5 REQs           13 REQs           13 REQs           0 REQs
```

### Track B: 长期建设 (13-19 Weeks)

```
Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10
合规+安全   数据管道   推荐进阶   商业化     生产部署
 9 REQs     5 REQs     4 REQs    4 REQs     5 REQs
```

---

## 4. 关键研究发现的执行影响

### 必须在 Phase 1 前冻结的接口契约

Phase 2-4 由 3 个并行 Agent 执行，共享接口必须在 Phase 1 冻结：

```typescript
// 冻结：推荐输出结构
interface RecommendationOutput {
  items: ClothingItem[];
  outfit: OutfitSuggestion;
  explanation: {
    why: string;
    alternative: ClothingItem[];
    nextAction: "tryOn" | "saveToWardrobe" | "addToCart" | "askStylist";
    confidence: number;
  };
}

// 冻结：试衣结果结构
interface TryOnResult {
  image: string;
  confidence: number;
  fitAssessment: {
    overall: "good" | "acceptable" | "poor";
    details: { area: string; assessment: string }[];
  };
  suggestion: string;
  alternatives: ClothingItem[];
  scenes: string[];
}

// 冻结：Onboarding 输出数据
interface OnboardingOutput {
  primaryScenarios: string[]; // 必填
  ageBand: string; // 必填
  height: number; // 必填
  weight: number; // 必填
  usualSize: string; // 必填
  garmentPreference: {
    // 必填 (Phase 2 新增)
    lowerBody: "pants" | "skirts" | "both";
  };
  styleExpression: string; // 必填
  styleImageSeeds: string[]; // 必填 (FashionCLIP 嵌入)
  photoUri?: string; // 可选
  gender?: "male" | "female" | "other"; // 可选 (不计入推荐权重)
}
```

### 性别移除级联依赖图

```
gender 字段降级
  ├── auth.dto.ts (@IsOptional) ← Phase 1
  ├── onboardingStore (移除必填) ← Phase 1
  ├── BodyMetricsService (waist/hip ratio 替代 Gender.female) ← Phase 1
  ├── ColdStartService (bodyType+styleExpression 替代分桶) ← Phase 2
  ├── ProfileCompletenessService (gender→0%) ← Phase 1
  └── 推荐管道所有使用 gender 的分支 ← Phase 2
```

### FashionCLIP 偏见缓解策略

1. **Phase 4 Onboarding**：风格图 6 选 2 必须覆盖不同风格维度，不能全是同一性别编码的穿搭
2. **Phase 2 检索层**：Qdrant 搜索添加多样性约束（同类结果不超过 60%）
3. **Phase 8 审计**：5 个相同场景/预算不同 styleExpression 的 profile，如果 80%+ 结果同性别编码 → 偏见主导

### AI 造型师 RAG 策略

- **不用完整 RAG 管道** — 264+ JSON 规则按 bodyType+occasion+colorSeason 过滤后仅 2-5KB
- **过滤式上下文注入** — 服务端过滤规则，作为系统消息注入 LLM
- **关键差距**：当前 LLM system prompt 包含硬编码简化摘要，从未引用 JSON 规则文件

### 冷启动推荐 CTR 预期

| 批次              | CTR 预期 | 策略                                     |
| ----------------- | -------- | ---------------------------------------- |
| 第 1 批 (0-3 次)  | 5-12%    | 场景+FashionCLIP 种子+规则引擎           |
| 第 2 批 (3-10 次) | 10-18%   | 画像+行为混合 (规则 60%+热门 25%+LLM15%) |
| 第 3 批 (10+ 次)  | 15-25%   | SASRec40%+FashionCLIP30%+规则 30%        |

**告警阈值**：第 1 批 CTR < 3% → 管道损坏，需立即修复

---

## 5. 风险速查表

| 风险                    | 严重度  | 检测方式                                   | 发生阶段  |
| ----------------------- | ------- | ------------------------------------------ | --------- |
| 性别移除级联断裂        | 🔴 致命 | 6 个文件逐一检查 gender 引用               | Phase 1-2 |
| FashionCLIP 偏见        | 🟠 高   | 5 profile 同场景不同风格测试               | Phase 4   |
| 冷启动推荐不连贯        | 🟠 高   | garmentPreference 缺失时推荐裙子给裤子用户 | Phase 2   |
| 48h 并行 Agent 接口分歧 | 🟠 高   | Phase 5 集成时 3-5 个关键 bug              | Phase 5   |
| 虚拟试穿成本爆炸        | 🟡 中   | 月账单异常增长                             | Phase 4+  |
| Windows 7×24 不稳定     | 🟡 中   | Docker 容器意外退出                        | 部署阶段  |
| PIPL 合规不通过         | 🟡 中   | 法务审查                                   | Phase 6   |
| 软著 60-90 天阻塞上架   | 🟡 中   | 无法上架应用商店                           | Phase 10  |

---

## 6. 48 小时 Sprint 执行原则

```
能改就不新建，能跑就不重构
先通后美，先连后优
TS 错误按文件批量杀，不逐个分析
Mock 数据 > 真实 API (48 小时内)
3 个 Agent 并行，绝不串行等待
每个 Agent 只负责独立目录，零冲突
接口契约在 Phase 1 冻结，Phase 2-4 严格遵循
Phase 5 是集成不是开发 — 发现断裂点快速修复
```

### Mock 数据覆盖矩阵 (Phase 1)

每个 (场景 × 价位 × 体型) 组合至少 5 件商品：

```
场景: 通勤/约会/休闲/运动/正式/聚会/校园/旅行 = 8
价位: budget/mid_range/premium = 3
体型: apple/pear/hourglass/rectangle/inverted_triangle = 5
最低覆盖: 8 × 3 × 5 × 5 = 600 条 (100+ 也可接受，逐步补充)
```

---

## 7. 文件索引

| 研究文件                             | 内容                         |
| ------------------------------------ | ---------------------------- |
| `research/STACK.md`                  | 技术栈推荐 (289 行)          |
| `research/FEATURES.md`               | 功能全景 + 竞品分析 (238 行) |
| `research/ARCHITECTURE.md`           | 6 层漏斗架构 (612 行)        |
| `research/PITFALLS.md`               | 20 个风险陷阱 (404 行)       |
| `research/AI_STYLIST_DESIGN.md`      | AI 造型师对话设计 (52KB)     |
| `research/ONBOARDING_DESIGN.md`      | 引导转化优化 (35KB)          |
| `research/CHINA_MARKET.md`           | 中国市场合规+API+成本 (45KB) |
| `research/NO_SERVER_ARCHITECTURE.md` | 无服务器部署方案 (985 行)    |
| `research/SUMMARY.md`                | 研究综合摘要 (103 行)        |

---

_本文档替代所有先前规划文档的执行指导地位。如有冲突，以本文档为准。_
_生成: 2026-04-22 | 下一步: /gsd-discuss-phase 1_
