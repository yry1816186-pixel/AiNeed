# AI Stylist Conversational System Design

**Project:** XUNO (AiNeed)
**Researched:** 2026-04-22
**Confidence:** HIGH (based on codebase analysis + verified external sources)

---

## Table of Contents

1. [Fashion RAG Strategy](#1-fashion-rag-strategy)
2. [Multi-turn Conversation Context Management](#2-multi-turn-conversation-context-management)
3. [Explanation Generation](#3-explanation-generation)
4. [Try-on Embedded in Conversation Flow](#4-try-on-embedded-in-conversation-flow)
5. [Conversational Onboarding](#5-conversational-onboarding)
6. [Technical Call Chain](#6-technical-call-chain)
7. [Prompt Templates](#7-prompt-templates)

---

## 1. Fashion RAG Strategy

### The Problem

264+ structured JSON rules exist across 7 files (~272KB total):

| File                        | Size | Rules | Content                                                      |
| --------------------------- | ---- | ----- | ------------------------------------------------------------ |
| body_type_rules.json        | 36KB | 30+   | body_type x occasion -> recommended items, colors, tips      |
| chinese_occasion_rules.json | 44KB | 20+   | occasion -> formality, keywords, recommended/avoid           |
| color_season_rules.json     | 61KB | 24+   | color_season x occasion -> best/avoid colors, metals, makeup |
| fabric_rules.json           | 33KB | 20+   | fabric x season x occasion -> care, pairings                 |
| item_compatibility.json     | 52KB | 40+   | top x bottom -> compatibility score, occasions, styles       |
| trend_rules.json            | 4KB  | 4     | season -> trending items, colors, keywords                   |
| weather_outfit_rules.json   | 42KB | 30+   | temp_range x occasion -> layers, materials, suggestions      |

Currently, `stylist_prompts.py` has a 130-line `STYLIST_SYSTEM_PROMPT` with **hardcoded simplified summaries** of these rules. The system prompt in `system-prompt.ts` (NestJS side) has another hardcoded 88-line version. Neither loads from the JSON files. The `HybridRetriever` (BM25 + Qdrant) exists in `ml/services/rag/hybrid_retriever.py` but is **not connected** to the stylist conversation flow.

### Decision: A (Filtered Context Injection) vs B (RAG Retrieval)

| Criterion     | A: Filtered Context Injection                  | B: RAG Retrieval                                       |
| ------------- | ---------------------------------------------- | ------------------------------------------------------ |
| Latency       | ~50ms (server-side filter + inject)            | ~200ms (embedding + vector search + merge)             |
| Precision     | HIGH (exact rule match by bodyType + occasion) | MEDIUM (semantic match may miss structured conditions) |
| Token cost    | LOW (5-8KB per request after filtering)        | MEDIUM (10-20KB with retrieved chunks)                 |
| Complexity    | LOW (JSON filter + stringify)                  | HIGH (embedding pipeline, Qdrant index, hybrid fusion) |
| Rule coverage | COMPLETE (all matching rules injected)         | PARTIAL (depends on retrieval quality)                 |
| Maintenance   | EASY (update JSON files, no re-index)          | MEDIUM (re-embed on rule changes)                      |

**Recommendation: A (Filtered Context Injection) for rules, B (RAG) for products.**

### Rationale

The 264 rules are structured (not free-text), filterable by known dimensions (bodyType, occasion, colorSeason), and small enough after filtering to fit in context. A user with `bodyType=hourglass`, `occasion=interview`, `colorSeason=winter` matches exactly 3-5 rules totaling ~2KB. This is a 5-minute implementation vs. a 2-week RAG pipeline.

RAG should be reserved for product retrieval (FashionCLIP + Qdrant) where the corpus is large (10K+ items), unstructured, and benefits from semantic similarity search.

### Implementation Design: Filtered Rule Injection

```
Server-side filter pipeline:

Session State (slots + bodyProfile)
    |
    v
filterRules(bodyType?, occasion?, colorSeason?, weather?)
    |  Matches ~3-8 rules from ~264 total
    |  Produces ~2-5KB structured context
    v
injectIntoPrompt(systemPrompt, filteredRules, conversationContext)
    |
    v
LLM Chat Completion (GLM-5 / DeepSeek / Qwen)
```

### Rule Filter Function (TypeScript)

```typescript
interface FashionRuleFilter {
  bodyType?: string; // hourglass, pear, apple, rectangle, inverted_triangle
  occasion?: string; // interview, work, date, travel, party, daily, campus
  colorSeason?: string; // spring, summer, autumn, winter
  temperature?: number; // Celsius
}

function filterBodyTypeRules(rules: BodyTypeRule[], filter: FashionRuleFilter): BodyTypeRule[] {
  return rules.filter((rule) => {
    if (filter.bodyType && rule.body_type !== filter.bodyType) return false;
    if (filter.occasion && rule.occasion !== filter.occasion) return false;
    return true;
  });
}

function filterColorSeasonRules(
  rules: ColorSeasonRule[],
  filter: FashionRuleFilter
): ColorSeasonRule[] {
  return rules.filter((rule) => {
    if (filter.colorSeason && rule.color_season !== filter.colorSeason) return false;
    if (filter.occasion && rule.occasion !== filter.occasion) return false;
    return true;
  });
}

function filterWeatherRules(
  rules: WeatherOutfitRule[],
  filter: FashionRuleFilter
): WeatherOutfitRule[] {
  return rules.filter((rule) => {
    if (filter.occasion && rule.occasion !== filter.occasion) return false;
    if (filter.temperature !== undefined) {
      return filter.temperature >= rule.temp_min && filter.temperature <= rule.temp_max;
    }
    return true;
  });
}

function filterItemCompatibility(
  rules: ItemCompatibilityRule[],
  filter: FashionRuleFilter
): ItemCompatibilityRule[] {
  return rules.filter((rule) => {
    if (filter.occasion && !rule.suitable_occasions.includes(filter.occasion)) return false;
    return true;
  });
}
```

### Prompt Integration Point

The filtered rules get injected as a second system message between the persona prompt and conversation context:

```
[System] STYLIST_SYSTEM_PROMPT (persona + behavior rules)     ~2KB
[System] FASHION_RULES_CONTEXT (filtered JSON rules)           ~2-5KB
[System] CONVERSATION_CONTEXT (slots, bodyProfile, stage)     ~0.5KB
[User/Assistant] conversation history (last 4 turns)           ~2KB
[User] structured metadata (nextAction, slotUpdates, stage)   ~0.3KB
---
Total: ~7-10KB input tokens (~3500-5000 tokens for Chinese)
```

GLM-5 context window is 128K tokens. This is well within budget even with generous margins.

### Rule Loading Architecture

Rules should be loaded once at module initialization (not per-request):

```typescript
// fashion-rules.module.ts
@Injectable()
export class FashionRulesService {
  private rules: {
    bodyType: BodyTypeRule[];
    colorSeason: ColorSeasonRule[];
    occasion: OccasionRule[];
    weather: WeatherOutfitRule[];
    compatibility: ItemCompatibilityRule[];
    fabric: FabricRule[];
    trend: TrendRule[];
  };

  onModuleInit() {
    this.rules = {
      bodyType: require("../../../ml/data/fashion_rules/body_type_rules.json"),
      colorSeason: require("../../../ml/data/fashion_rules/color_season_rules.json"),
      // ... etc
    };
  }

  getFilteredContext(filter: FashionRuleFilter): string {
    const parts: string[] = [];

    const bodyRules = filterBodyTypeRules(this.rules.bodyType, filter);
    if (bodyRules.length > 0) {
      parts.push("## 体型-场合穿搭规则\n" + JSON.stringify(bodyRules, null, 2));
    }

    const colorRules = filterColorSeasonRules(this.rules.colorSeason, filter);
    if (colorRules.length > 0) {
      parts.push("## 色彩季型规则\n" + JSON.stringify(colorRules, null, 2));
    }

    const weatherRules = filterWeatherRules(this.rules.weather, filter);
    if (weatherRules.length > 0) {
      parts.push("## 天气穿搭规则\n" + JSON.stringify(weatherRules, null, 2));
    }

    return parts.join("\n\n");
  }
}
```

### Guardrail Strategy: Rule-first vs LLM-first

**Decision: Rule-first guardrails, LLM-first generation.**

```
User Input
    |
    v
[Rule Engine] -- deterministic filter & score
    |  Produces: filtered rules, compatible items, avoid list
    v
[LLM Generation] -- creative output grounded in rules
    |  Receives: rules as context, user message, history
    |  Output constrained by: JSON schema, rule references
    v
[Post-validation] -- check output against rules
    |  Verify: no recommended avoid_items, colors in best_colors range
    v
Response to User
```

The rule engine runs BEFORE the LLM call (not after). This means:

- The LLM never sees rules that don't apply (no noise)
- The LLM cannot recommend items on the avoid list (they are not in context)
- Post-validation catches hallucinated items not in the provided rules

---

## 2. Multi-turn Conversation Context Management

### Current State Machine

The existing state machine in `context.service.ts` `deriveOrchestration()` implements:

```
                    +--------------------+
                    |     NEW SESSION    |
                    +--------------------+
                              |
                              v
                    +--------------------+
              +---->| collecting_scene   |<----+
              |     | (ask_question)     |     |
              |     +--------------------+     |
              |          | occasion?             |
              |          v                       |
              |     +--------------------+     |
              |     | collecting_style   |     |
              |     | (show_preference_  |     |
              |     |  buttons)          |     |
              |     +--------------------+     |
              |          | styles?               |
              |          v                       |
              |     +--------------------+     |
              |     | awaiting_photo     |     |
              |     | (request_photo_    |     |
              |     |  upload, canSkip)  |     |
              |     +--------------------+     |
              |          | photo uploaded       |
              |          v                       |
              |     +--------------------+     |
              |     | analysis_pending   |     |
              |     | (poll_analysis)    |     |
              |     +--------------------+     |
              |          | analysis done        |
              |          v                       |
              |     +--------------------+     |
              +-----| ready_to_resolve   |     |
                    | (generate_outfit)  |     |
                    +--------------------+     |
                          | generated            |
                          v                       |
                    +--------------------+     |
                    | resolved           |-----+
                    | (show_outfit_cards)|
                    +--------------------+
```

### Problems with Current Design

1. **Terminal state**: `resolved` is terminal. User cannot continue refining ("换一件上衣", "预算再加 200").
2. **No try-on state**: Virtual try-on is a separate endpoint, not part of the conversation flow.
3. **No feedback loop**: After showing outfits, the session ends. No "I dislike X, suggest alternatives".
4. **No weather integration**: `weather` slot exists but is never extracted or used.
5. **No onboarding merge**: First-time users get the same flow as returning users.

### Proposed Enhanced State Machine

```
                           +-------------------+
                           |    NEW SESSION    |
                           +-------------------+
                           | isNewUser? -----> ONBOARDING_MERGE
                           +-------------------+
                                     |
                                     v
                           +-------------------+
                     +---->| collecting_scene  |<-------------------+
                     |     | ask_question      |                    |
                     |     +-------------------+                    |
                     |          | occasion extracted                 |
                     |          v                                    |
                     |     +-------------------+                    |
                     |     | collecting_style  |                    |
                     |     | show_preference_  |                    |
                     |     | buttons           |                    |
                     |     +-------------------+                    |
                     |          | styles selected                    |
                     |          v                                    |
                     |     +-------------------+                    |
                     |     | collecting_detail |  (NEW)             |
                     |     | - budget          |                    |
                     |     | - colors          |                    |
                     |     | - fitGoals        |                    |
                     |     | - weather         |                    |
                     |     +-------------------+                    |
                     |          | details sufficient                 |
                     |          v                                    |
                     |     +-------------------+                    |
                     |     | awaiting_photo    |                    |
                     |     | request_photo_    |                    |
                     |     | upload (optional) |                    |
                     |     +-------------------+                    |
                     |          | photo done / skipped               |
                     |          v                                    |
                     |     +-------------------+                    |
                     +---->| ready_to_resolve  |                    |
                           | generate_outfit   |                    |
                           +-------------------+                    |
                                 | outfits generated                   |
                                 v                                    |
                           +-------------------+                    |
                           | showing_outfits   |                    |
                           | show_outfit_cards |                    |
                           +-------------------+                    |
                            /    |    \                               |
                  like/keep  dislike  try_on                       |
                      |        |        |                           |
                      v        v        v                           |
              +-----------+ +--------+ +---------------+           |
              | refining  | | adjust | | try_on_active |           |
              | (NEW)     | | rules  | | (NEW)         |           |
              +-----------+ +--------+ +---------------+           |
                   |            |            |                      |
                   v            v            v                      |
              +------------------------------------------+         |
              |           ready_to_resolve               |---------+
              |   (user says "再来一套" / "换个风格")      |
              +------------------------------------------+
```

### State Definitions (Enhanced)

```typescript
type StylistStage =
  | "collecting_scene" // Need occasion
  | "collecting_style" // Need style preferences
  | "collecting_detail" // NEW: collecting budget, colors, weather, fitGoals
  | "awaiting_photo" // Optional photo upload
  | "analysis_pending" // Photo being analyzed
  | "ready_to_resolve" // Ready to generate outfits
  | "showing_outfits" // Outfits displayed, awaiting feedback
  | "refining" // NEW: User is refining preferences
  | "try_on_active" // NEW: Virtual try-on in progress
  | "completed"; // Session finalized (can still restart)
```

### Conversation History Compression

Current: `maxSessionMessages = 20`, LLM sees last 4 messages. This is acceptable for short sessions but breaks down in refinement loops.

**Compression strategy:**

```typescript
interface CompressedHistory {
  summary: string; // LLM-generated summary of earlier conversation
  extractedSlots: StylistSlots; // Current slot state (always fresh)
  recentMessages: ChatMessage[]; // Last N messages verbatim
}

async function compressHistory(
  history: ChatMessage[],
  slots: StylistSlots
): Promise<CompressedHistory> {
  // If <= 8 messages, keep all verbatim
  if (history.length <= 8) {
    return {
      summary: "",
      extractedSlots: slots,
      recentMessages: history,
    };
  }

  // Summarize messages [0..n-4] and keep last 4 verbatim
  const toSummarize = history.slice(0, -4);
  const recent = history.slice(-4);

  const summary = await this.llmProvider.chat({
    messages: [
      {
        role: "system",
        content:
          "Summarize this fashion consultation conversation in 2-3 sentences. Focus on: what the user asked for, what was recommended, what feedback they gave. Chinese output.",
      },
      { role: "user", content: toSummarize.map((m) => `${m.role}: ${m.content}`).join("\n") },
    ],
    maxTokens: 150,
    temperature: 0.1,
    requestId: `compress-${Date.now()}`,
  });

  return {
    summary: summary.content,
    extractedSlots: slots,
    recentMessages: recent,
  };
}
```

**Token budget for LLM input:**

```
[System] Persona prompt                        ~800 tokens
[System] Filtered fashion rules                ~1500 tokens
[System] Conversation context (slots + stage)  ~200 tokens
[System] Compressed summary (if any)           ~100 tokens
[History] Last 4 messages                      ~800 tokens
[User] Current message + metadata              ~200 tokens
---
Total input: ~3600 tokens
Reserve for output: 300 tokens (maxTokens=200 + safety)
Total per turn: ~3900 tokens
```

### Preventing Conversation Drift

Drift happens when users change topic mid-conversation ("推荐约会穿搭" -> "对了你们支持退货吗").

**Detection:**

```typescript
function detectTopicDrift(
  message: string,
  currentSlots: StylistSlots
): { isDrift: boolean; newTopic?: string } {
  // If user mentions a new occasion different from current session
  const extractedOccasion = extractOccasion(message);
  if (extractedOccasion && currentSlots.occasion && extractedOccasion !== currentSlots.occasion) {
    return { isDrift: true, newTopic: "occasion_change" };
  }

  // Out-of-domain detection
  const outOfDomainPatterns = [
    /退货/,
    /退款/,
    /快递/,
    /物流/,
    /客服/,
    /多少钱/,
    /怎么付款/,
    /会员/,
    /优惠券/,
  ];
  for (const pattern of outOfDomainPatterns) {
    if (pattern.test(message)) {
      return { isDrift: true, newTopic: "out_of_domain" };
    }
  }

  return { isDrift: false };
}
```

**Response to drift:**

- `occasion_change`: Offer to start new session or continue current. Do NOT silently switch context.
- `out_of_domain`: Polite redirect ("这个问题建议联系客服哦，我主要帮你搭配穿搭").

### Outfit Generation Trigger Timing

Current trigger: `ready_to_resolve` stage (all required slots filled).

Enhanced triggers:

| Trigger          | Condition                                   | Behavior                                      |
| ---------------- | ------------------------------------------- | --------------------------------------------- |
| **Explicit**     | User says "直接推荐", "生成方案"            | Generate immediately, even with partial slots |
| **Auto-advance** | `occasion + styles` filled, no photo needed | Auto-generate after 1-second debounce         |
| **Post-photo**   | Photo analysis completes                    | Auto-generate if all other slots ready        |
| **Refinement**   | User says "再来一套", "换个颜色"            | Re-generate with updated slots                |
| **Skip-all**     | User says "跳过" multiple times             | Generate with minimal slots, use defaults     |

---

## 3. Explanation Generation

### Current Implementation

`recommendation.service.ts` `buildWhyItFits()` generates template strings:

```typescript
// Current output (template-based):
// "场景优先按面试来控制正式度和单品噪点。"
// "这次重点满足 显高、显瘦 的诉求。"
// "版型选择参考了你的X型体型特征。"
// "配色优先贴合冬季型的友好色域。"
```

This is functional but generic. It does not reference specific rule matches, specific items, or specific color hex values from the 264 JSON rules.

### Decision: A (Template-based) vs B (LLM-grounded) vs C (Hybrid)

| Criterion       | A: Template                | B: LLM-grounded                  | C: Hybrid                      |
| --------------- | -------------------------- | -------------------------------- | ------------------------------ |
| Specificity     | LOW (generic per category) | HIGH (references specific items) | HIGH                           |
| Accuracy        | HIGH (deterministic)       | MEDIUM (may hallucinate)         | HIGH (template constrains LLM) |
| Cost            | FREE                       | ~200 tokens/turn                 | ~150 tokens/turn               |
| Maintenance     | Easy (update strings)      | Medium (tune prompts)            | Medium                         |
| Personalization | LOW                        | HIGH                             | HIGH                           |

**Recommendation: C (Hybrid) -- template-first with LLM polish.**

### Hybrid Explanation Architecture

```
Step 1: Rule Engine produces structured evidence
    {
      matchedRules: [
        { ruleId: "bt_hourglass_interview", strategy: "含蓄展现曲线优势",
          recommended: ["修身西装外套", "V领衬衫"],
          avoid: ["宽松卫衣", "低腰裤"] },
        { ruleId: "cs_winter_interview", best_colors: ["#2C3E50", "#FFFFFF"],
          avoid_colors: ["#FFA500"] }
      ],
      itemEvidence: [
        { itemId: "xxx", name: "修身西装外套", matchedRule: "bt_hourglass_interview",
          colorMatch: "#2C3E50 is in winter best_colors" }
      ]
    }

Step 2: Template engine produces structured explanation skeleton
    {
      summary: "极简取向的面试穿搭方案，重点围绕显高来组织版型与配色。",
      reasons: [
        { type: "body_type", text: "版型参考X型体型：修身西装外套+收腰针织衫，展现腰线优势" },
        { type: "color_season", text: "配色贴合冬季型：深蓝#2C3E50、纯白#FFFFFF为主色调" },
        { type: "occasion", text: "面试正式度0.9，避开了宽松卫衣和低腰裤" },
        { type: "item_specific", text: "修身西装外套 -- 收腰剪裁配合你的X型体型，V领拉长颈部线条" }
      ]
    }

Step 3 (optional): LLM polishes for natural language
    "这套面试穿搭贴合你的X型体型，收腰西装外套勾勒腰线，深蓝配白色的配色来自冬季型
     色域。V领衬衫拉长颈部比例，整体正式度控制在0.9，适合面试场景。"
```

### Explanation Prompt Template

```
你是寻裳的造型师。请根据以下穿搭证据，用中文写一段简短的推荐说明。

要求：
1. 控制在100字以内
2. 引用具体的单品名称（不是"上衣"，而是"修身西装外套"）
3. 引用具体的穿搭规则（体型、色彩季型、场合）
4. 语气自然，像朋友给建议
5. 只返回文字，不要JSON

穿搭证据：
{structured_evidence_json}

用户档案：
- 体型：{body_type_zh}
- 色彩季型：{color_season_zh}
- 场合：{occasion_zh}
- 风格：{styles}
- 预算：{budget}

请说明为什么这套搭配适合这位用户。
```

### Confidence Score Computation

Current: LLM returns a single `confidence` field (0.0-1.0) in its JSON output. This is opaque and uncalibrated.

**Proposed: Multi-factor confidence score**

```typescript
interface StylistConfidence {
  overall: number; // Weighted composite
  slotCompleteness: number; // How many required slots are filled
  ruleMatchQuality: number; // How many rules matched and their coverage
  bodyProfileConfidence: number; // Photo analysis confidence or 0.5 (no photo)
  budgetAlignment: number; // Are recommended items within budget?
}

function computeConfidence(session: StylistSession, result: StylistResolution): StylistConfidence {
  // Slot completeness (0-1)
  const requiredSlots = ["occasion", "preferredStyles"];
  const optionalSlots = ["fitGoals", "preferredColors", "budgetMax", "bodyType"];
  const filledRequired = requiredSlots.filter((s) => session.state.slots[s]).length;
  const filledOptional = optionalSlots.filter(
    (s) => session.state.slots[s] || session.state.bodyProfile[s]
  ).length;
  const slotCompleteness =
    (filledRequired / requiredSlots.length) * 0.7 + (filledOptional / optionalSlots.length) * 0.3;

  // Rule match quality (0-1)
  // If we injected rules and the LLM referenced them, high confidence
  // If no matching rules found, lower confidence
  const matchedRuleCount = result.whyItFits?.length || 0;
  const ruleMatchQuality = Math.min(matchedRuleCount / 3, 1.0);

  // Body profile confidence
  const bodyProfileConfidence = session.state.bodyReady ? 0.85 : 0.5;

  // Budget alignment
  let budgetAlignment = 0.8;
  if (session.state.slots.budgetMax) {
    const total = result.outfits[0]?.estimatedTotalPrice;
    if (total && total <= session.state.slots.budgetMax) {
      budgetAlignment = 1.0;
    } else if (total && total > session.state.slots.budgetMax * 1.2) {
      budgetAlignment = 0.4;
    }
  }

  // Overall weighted score
  const overall =
    slotCompleteness * 0.3 +
    ruleMatchQuality * 0.3 +
    bodyProfileConfidence * 0.2 +
    budgetAlignment * 0.2;

  return {
    overall: Math.round(overall * 100) / 100,
    slotCompleteness: Math.round(slotCompleteness * 100) / 100,
    ruleMatchQuality: Math.round(ruleMatchQuality * 100) / 100,
    bodyProfileConfidence,
    budgetAlignment,
  };
}
```

### Anti-Hallucination: Grounding LLM Output in Rule Engine Results

The critical problem: LLM may recommend items or colors not in the rule set.

**Grounding protocol:**

1. **Input grounding**: Only inject matching rules into context. The LLM cannot reference rules it never saw.
2. **Output validation**: After LLM generates outfit suggestions, cross-check against rules:

```typescript
function validateOutfitAgainstRules(
  outfit: StylistOutfitPlan,
  rules: FilteredRules
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const item of outfit.items) {
    // Check if item name contains any avoid_items from matched rules
    for (const rule of rules.bodyType) {
      for (const avoid of rule.avoid_items) {
        if (item.name.includes(avoid)) {
          violations.push(`${item.name} matches avoid pattern "${avoid}" from rule ${rule.id}`);
        }
      }
    }

    // Check if item colors are in avoid_colors from color season rules
    for (const rule of rules.colorSeason) {
      for (const avoidColor of rule.avoid_colors || []) {
        if (item.name.includes(avoidColor.name_zh)) {
          violations.push(
            `${item.name} color "${avoidColor.name_zh}" is in avoid list for ${rule.color_season}`
          );
        }
      }
    }
  }

  return { valid: violations.length === 0, violations };
}
```

3. **Forced regeneration**: If violations detected, regenerate with violation list appended to prompt:
   "上一次推荐中{violation}不适合，请避免这些单品或颜色，重新推荐。"

---

## 4. Try-on Embedded in Conversation Flow

### Current State

- `VirtualTryOnInput` / `VirtualTryOnResult` types exist in `types/index.ts`
- `TryOnServiceResponse` exists with `result_image_url`
- `VIRTUAL_TRYON_PROMPT_TEMPLATE` exists in `stylist_prompts.py`
- **BUT**: No try-on state in the state machine. No conversation integration. Try-on is a separate endpoint.

### Decision: A (Separate Flow) vs B (Embedded in Conversation)

| Criterion                 | A: Separate Flow      | B: Embedded in Conversation             |
| ------------------------- | --------------------- | --------------------------------------- |
| User friction             | HIGH (switch context) | LOW (stays in chat)                     |
| Implementation complexity | LOW                   | MEDIUM                                  |
| Data richness             | LOW (no chat context) | HIGH (try-on result feeds back to chat) |
| UX coherence              | POOR                  | GOOD                                    |

**Recommendation: B (Embedded in Conversation)**

### Try-on State Machine Extension

```
showing_outfits
    |
    | User taps "试穿" on an item
    v
+-------------------+
| try_on_initiating |  (NEW)
| - Select item     |
| - Check photo     |
| - Submit to VTON  |
+-------------------+
    |
    | VTON processing
    v
+-------------------+
| try_on_processing |  (NEW)
| - Show progress   |
| - 15-30s wait     |
+-------------------+
    |
    | VTON complete
    v
+-------------------+
| try_on_reviewing  |  (NEW)
| - Show result     |
| - LLM interprets  |
| - User feedback   |
+-------------------+
    |
    | User accepts / rejects
    v
refining OR showing_outfits
```

### Trigger Conditions for Try-on

```typescript
function shouldTriggerTryOn(
  session: StylistSession,
  userAction: string,
  selectedItem?: StylistOutfitItem
): boolean {
  // Explicit trigger: user taps try-on button
  if (userAction === "try_on") return true;

  // No implicit triggers -- try-on is always user-initiated
  // Reasons: VTON is expensive (GPU time), slow (15-30s), and may fail
  return false;
}
```

Try-on is **always user-initiated**. Never auto-trigger. Rationale:

1. GPU cost per try-on is significant (VTON-VLLM inference)
2. User may not want to see themselves in the outfit
3. Privacy expectations -- user opts in to face processing

### LLM Interpretation of Try-on Results

After VTON completes, the result image needs interpretation. Two approaches:

**Decision: Use VTON-VLLM for visual description, then LLM for fashion commentary.**

```python
# Step 1: VTON-VLLM generates visual description of try-on result
VTON_INTERPRETATION_PROMPT = """
请描述这张虚拟试穿效果图中人物的穿搭效果：
1. 整体合身度（偏大/合适/偏紧）
2. 版型与体型的匹配程度
3. 颜色搭配效果
4. 建议调整的地方（如果有）

以JSON格式输出：
{
  "fit_assessment": "偏大/合适/偏紧",
  "body_match_score": 0.0-1.0,
  "color_harmony": "描述",
  "suggestions": ["建议1", "建议2"]
}
"""

# Step 2: NestJS receives VTON interpretation, feeds to conversation LLM
# composeTryOnFeedbackMessage(session, vtonResult)
```

```typescript
// NestJS side: compose try-on feedback message
async composeTryOnFeedbackMessage(
  session: StylistSession,
  vtonInterpretation: VtonInterpretationResult
): Promise<string> {
  const prompt = `用户试穿了 ${vtonInterpretation.itemName}。
试穿效果：${vtonInterpretation.fitAssessment}，匹配度 ${vtonInterpretation.bodyMatchScore}。
建议：${vtonInterpretation.suggestions.join('；')}。

请用1-2句话给用户反馈，语气自然，100字以内。`;

  const response = await this.llmProvider.chat({
    messages: [
      { role: 'system', content: STYLIST_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    maxTokens: 150,
    temperature: 0.5,
    requestId: `tryon-feedback-${Date.now()}`,
  });

  return response.content;
}
```

### Degradation Strategy When Try-on Fails

```
Try-on failure scenarios:
1. VTON service unavailable (GPU OOM, service down)
2. VTON timeout (> 60 seconds)
3. User photo quality too low (blurry, occluded)
4. VTON result quality too low (artifacts, face distortion)

Degradation cascade:
  Level 1: Retry with different parameters (1x)
  Level 2: Fall back to static outfit card (no try-on)
  Level 3: LLM generates verbal description of how it would look
  Level 4: Suggest user visit physical store / return policy reassurance
```

```typescript
async function handleTryOnDegradation(
  session: StylistSession,
  error: TryOnError,
  item: StylistOutfitItem
): Promise<ChatResult> {
  const messages: Record<TryOnErrorType, string> = {
    service_unavailable:
      "试穿功能暂时不可用，但我已经为你选好了搭配方案。你可以先看看单品卡片，稍后再试穿。",
    timeout: "试穿生成时间较长，我先帮你看看其他搭配？",
    photo_quality: "照片清晰度不够，试穿效果可能不理想。建议重新拍一张全身照，光线充足、背景简洁。",
    result_quality: "试穿效果不太理想，可能是角度或光线原因。你可以参考单品图片来想象上身效果。",
  };

  // Revert to showing_outfits state
  session.state.currentStage = "showing_outfits";

  return {
    success: true,
    assistantMessage: messages[error.type] || messages.service_unavailable,
    nextAction: { type: "show_outfit_cards" },
  };
}
```

---

## 5. Conversational Onboarding

### Decision: A (Separate Onboarding Flow) vs B (Merge into Stylist Chat) vs C (Hybrid)

| Criterion       | A: Separate                    | B: Merged into Chat                | C: Hybrid |
| --------------- | ------------------------------ | ---------------------------------- | --------- |
| Completion rate | LOW (users skip onboarding)    | HIGH (natural conversation)        | HIGH      |
| Data quality    | MEDIUM (users rush through)    | HIGH (contextual extraction)       | HIGH      |
| Time to value   | SLOW (finish onboarding first) | FAST (chat immediately useful)     | FAST      |
| Complexity      | LOW                            | HIGH (state management)            | MEDIUM    |
| User control    | HIGH (explicit steps)          | LOW (may not realize sharing info) | MEDIUM    |

**Recommendation: C (Hybrid) -- Progressive profiling through conversation.**

### How It Works

First-time users enter the stylist chat directly. The system detects it is their first session and adjusts behavior:

```typescript
async function createSession(
  userId: string,
  context: StylistContextInternal
): Promise<StylistSession> {
  const isFirstSession = !context.userProfile && !context.preferences;
  const hasBodyProfile = Boolean(context.userProfile?.bodyType || context.userProfile?.colorSeason);

  return {
    id: randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    conversationHistory: [],
    state: {
      currentStage: "collecting_scene",
      slots: {
        preferredStyles: contextService.getInitialPreferredStyles(context),
        styleAvoidances: [],
        fitGoals: [],
        preferredColors: [],
      },
      bodyProfile: {
        bodyType: context.userProfile?.bodyType,
        skinTone: context.userProfile?.skinTone,
        faceShape: context.userProfile?.faceShape,
        colorSeason: context.userProfile?.colorSeason,
        height: context.userProfile?.height,
        weight: context.userProfile?.weight,
        shapeFeatures: [],
      },
      sceneReady: false,
      bodyReady: hasBodyProfile,
      styleReady: contextService.getInitialPreferredStyles(context).length > 0,
      candidateReady: false,
      commerceReady: false,
      photoRequested: false,
      photoSkipped: false,
    },
    // NEW: flag for first-time user behavior
    meta: {
      isFirstSession,
      onboardingStep: isFirstSession ? "scene" : "returning",
    },
  };
}
```

### First-time User Guidance

```typescript
function getWelcomeMessage(session: StylistSession): string {
  if (session.meta.isFirstSession) {
    return (
      "嗨，我是小裳，你的AI造型师。告诉我你想要什么样的穿搭 -- 比如" +
      "面试、约会、还是日常通勤？我会根据你的风格和身材来搭配。"
    );
    // Key: no "onboarding" framing. Just start the conversation.
    // Extract body/color info later through photo or natural questions.
  }

  return "欢迎回来，有什么新的穿搭需求吗？";
}
```

### Onboarding Data Extraction Strategy

The slot-filling dialogue already collects:

- `occasion` (maps to onboarding "lifestyle/usage patterns")
- `preferredStyles` (maps to onboarding "style preferences")
- `fitGoals` (maps to onboarding "body concerns")
- `bodyProfile` via photo (maps to onboarding "body measurements")

After the first session completes, persist extracted data to UserProfile:

```typescript
async function persistOnboardingData(userId: string, session: StylistSession): Promise<void> {
  // Only persist from first session
  if (!session.meta.isFirstSession) return;
  // Only persist if session reached showing_outfits (meaningful data collected)
  if (
    session.state.currentStage !== "showing_outfits" &&
    session.state.currentStage !== "completed"
  )
    return;

  const updates: Record<string, unknown> = {};

  if (session.state.slots.preferredStyles.length > 0) {
    updates.stylePreferences = session.state.slots.preferredStyles;
  }
  if (session.state.bodyProfile.bodyType) {
    updates.bodyType = session.state.bodyProfile.bodyType;
  }
  if (session.state.bodyProfile.colorSeason) {
    updates.colorSeason = session.state.bodyProfile.colorSeason;
  }
  if (session.state.bodyProfile.skinTone) {
    updates.skinTone = session.state.bodyProfile.skinTone;
  }

  if (Object.keys(updates).length > 0) {
    await this.prisma.userProfile.upsert({
      where: { userId },
      update: updates,
      create: { userId, ...updates },
    });
  }
}
```

### What NOT to do in onboarding

1. **Never say "onboarding"** or "设置" to the user. Frame everything as natural conversation.
2. **Never block access**. User can start chatting immediately. Onboarding data is bonus, not prerequisite.
3. **Never ask all questions at once**. One question per turn, interleaved with useful responses.
4. **Never force photo upload**. The `canSkip: true` flag must be respected.

---

## 6. Technical Call Chain

### Full NestJS <-> FastAPI <-> LLM Call Chain

```
User (React Native App)
    |
    | POST /api/ai-stylist/chat
    | { message, sessionId? }
    v
+----------------------------------------------------------+
| NestJS Backend                                           |
|                                                           |
| 1. AiStylistController.createSession / sendMessage        |
|    |                                                      |
|    v                                                      |
| 2. AiStylistService.chat() / sendMessage()                |
|    |                                                      |
|    +--> AiStylistSessionService                           |
|    |    getSessionOrThrow() -- Redis -> PostgreSQL         |
|    |                                                      |
|    +--> AiStylistContextService                           |
|    |    extractSlotUpdates(message) -- keyword matching    |
|    |    mergeSlots(current, updates)                       |
|    |    deriveOrchestration(session) -- state machine      |
|    |                                                      |
|    +--> FashionRulesService (NEW)                         |
|    |    getFilteredContext(bodyType, occasion, colorSeason)|
|    |    Loads from JSON files, filters, returns string     |
|    |                                                      |
|    +--> AiStylistChatService                              |
|    |    composeAssistantMessage()                          |
|    |    |                                                  |
|    |    +--> LlmProviderService.chat()                     |
|    |    |    Provider: GLM-5 / DeepSeek / Qwen            |
|    |    |    Messages: [system, rules, context, history]   |
|    |    |    maxTokens: 200, temperature: 0.4             |
|    |    |                                                  |
|    |    +--> Template fallback if LLM unavailable          |
|    |                                                      |
|    +--> AiStylistSessionService                           |
|         persistSession() -- Memory -> Redis -> PostgreSQL  |
|                                                           |
+----------------------------------------------------------+
    |
    | (only for outfit generation)
    | POST /api/stylist/outfit  (internal or external)
    v
+----------------------------------------------------------+
| FastAPI ML Service                                        |
|                                                           |
| 1. POST /api/stylist/outfit                               |
|    |                                                      |
|    v                                                      |
| 2. IntelligentStylistService                              |
|    generate_outfit_recommendation()                        |
|    |                                                      |
|    +--> StyleUnderstandingService                         |
|    |    getOutfitRecommendation()                          |
|    |    |                                                  |
|    |    +--> FashionCLIP embedding                         |
|    |    +--> Qdrant vector search                          |
|    |    +--> HybridRetriever (BM25 + vector, RRF fusion)  |
|    |                                                      |
|    +--> LLM (via provider)                                |
|    |    STYLIST_OUTFIT_GENERATION_PROMPT                   |
|    |    Generates structured outfit JSON                   |
|    |                                                      |
+----------------------------------------------------------+
    |
    | (only for try-on)
    | POST /api/try-on/generate
    v
+----------------------------------------------------------+
| VTON Service (GPU)                                        |
|                                                           |
| 1. Receives person image + garment image                  |
| 2. VTON-VLLM inference (15-30 seconds)                    |
| 3. Returns result image URL                               |
|                                                           |
+----------------------------------------------------------+
```

### Data Flow: Single Chat Turn

```
Time --> |

App                  NestJS                   LLM                FastAPI
 |                     |                       |                    |
 |---sendMessage()--->|                       |                    |
 |                     |--extractSlots()       |                    |
 |                     |--deriveOrchestration() |                   |
 |                     |--filterRules()        |                    |
 |                     |--chat()------------->|                    |
 |                     |<---response----------|                    |
 |                     |--persistSession()     |                    |
 |                     |                       |                    |
 |<--ChatResult-------|                       |                    |
 |  {message, nextAction, slots, result}       |                   |
 |                     |                       |                    |
```

### Data Flow: Outfit Generation Turn

```
App                  NestJS                   LLM                FastAPI
 |                     |                       |                    |
 |---resolve()-------->|                       |                    |
 |                     |--generateOutfit()     |                    |
 |                     |  |--buildMLOutfit()---|------------------->|
 |                     |  |                    |    POST /outfit    |
 |                     |  |                    |                    |--LLM call
 |                     |  |                    |                    |--Vector search
 |                     |  |                    |                    |--BM25 search
 |                     |  |<-------------------|-------------------|
 |                     |  |  ML outfit result   |                    |
 |                     |  |--getRecommendations() (fallback)        |
 |                     |  |--rankOutfitsWithDecisionEngine()        |
 |                     |  |  |--computeItemStyleScore()             |
 |                     |  |  |--computeItemPreferenceScore()        |
 |                     |  |  |--compositeScore = s*0.3+p*0.4+e*0.3 |
 |                     |  |--buildWhyItFits()  |                    |
 |                     |  |--validateOutfitAgainstRules() (NEW)     |
 |                     |--persistSession()     |                    |
 |<--ChatResult-------|                       |                    |
 |  {result: StylistResolution}                |                   |
```

### Error Handling Chain

```
LLM call fails
  --> try next provider (deepseek -> qwen -> zhipu)
  --> if all fail: template fallback (buildTemplateMessage)

FastAPI /outfit fails
  --> NestJS uses local RecommendationsService (collaborative filtering)
  --> if that fails: return empty outfit with "暂无推荐" message

Try-on fails
  --> degradation cascade (see Section 4)

Session persistence fails (Redis down)
  --> log warning, continue with in-memory only
  --> try PostgreSQL fallback
  --> if DB also fails: session is ephemeral (survives until TTL)
```

---

## 7. Prompt Templates

### 7.1 Enhanced System Prompt (with Rule Injection Slot)

```
你是寻裳的AI穿搭顾问，一位专业、友善、有品味的时尚造型师。

## 你的身份
- 你叫"小裳"，是寻裳平台的专属AI造型师
- 你精通国内时尚趋势、体型分析、色彩搭配和场合着装
- 你会用自然、亲切的中文和用户对话，避免生硬的机器感
- 你的建议基于专业知识，同时尊重用户的个人偏好

## 你的工作流程
1. 了解场景：先搞清楚用户要穿去什么场合
2. 探索风格：了解用户偏好的风格方向
3. 收集细节：了解预算、颜色偏好、身材关注点
4. 给出方案：当信息足够时，生成具体的穿搭推荐

## 对话原则
- 每次回复控制在80字以内，简洁不啰嗦
- 一次只问一个问题，不要连珠炮式提问
- 用户说的每一句话都认真理解，提取有用信息
- 当信息足够时主动推进，不要无意义地追问
- 如果用户说"跳过"或"直接推荐"，尊重用户选择
- 永远用中文回复
- 只讨论穿搭相关话题，其他问题礼貌引导用户联系客服

## 提取信息的关键词
- 场景：面试、求职、上班、通勤、约会、相亲、旅行、出游、聚会、派对、逛街、日常、校园
- 风格：极简、韩系、法式、日系、轻正式、街头、运动、复古
- 身材关注：显高、显瘦、遮胯、修肩、利落、正式、减龄、提气色
- 预算：数字 + 元/块/以内/以下/左右
- 颜色：白色、黑色、灰色、蓝色、米色、卡其、粉色、绿色、酒红
- 避免：不要太甜、别太正式、不要太成熟

## 专业穿搭规则（请严格遵守以下规则进行推荐）
{filtered_fashion_rules}

## 回复格式
你必须返回如下JSON格式（不要加markdown代码块标记）：
{
  "reply": "你给用户的中文回复",
  "slots": {
    "occasion": "interview/work/date/travel/party/daily/campus 或 null",
    "preferredStyles": ["极简/韩系/法式/日系/轻正式/街头/运动/复古"],
    "fitGoals": ["显高/显瘦/修饰胯部/平衡肩线/利落专业/减龄/提气色"],
    "preferredColors": ["颜色词"],
    "styleAvoidances": ["不想要的风格"],
    "budgetMax": 数字或null,
    "budgetMin": 数字或null
  },
  "nextAction": "ask_question/show_preference_buttons/request_photo_upload/generate_outfit",
  "confidence": 0.0到1.0
}
```

### 7.2 Slot Extraction Prompt (Enhanced with Weather)

```
你是一个穿搭信息提取器。从用户的中文消息中提取穿搭相关的结构化信息。

只返回JSON，不要其他内容。格式如下：
{
  "occasion": "interview/work/date/travel/party/daily/campus 之一，没有则为 null",
  "preferredStyles": ["极简/韩系/法式/日系/轻正式/街头/运动/复古 中的匹配项"],
  "fitGoals": ["显高/显瘦/修饰胯部/平衡肩线/利落专业/减龄/提气色 中的匹配项"],
  "preferredColors": ["用户提到的颜色词"],
  "styleAvoidances": ["用户明确不想要的风格"],
  "budgetMax": 数字或null,
  "budgetMin": 数字或null,
  "weather": {
    "temperature": 数字或null,
    "condition": "晴天/阴天/雨天/雪天 或 null",
    "season": "春季/夏季/秋季/冬季 或 null"
  },
  "photoSkip": "用户是否表示要跳过照片上传，true/false",
  "refinement": "用户是否在要求调整已推荐的方案，true/false",
  "tryOnRequest": "用户是否想要试穿某件单品，true/false",
  "tryOnItemId": "用户想试穿的单品ID，没有则为 null"
}
```

### 7.3 Outfit Explanation Prompt (Hybrid)

```
你是寻裳的造型师。请根据以下穿搭证据，用中文写一段简短的推荐说明。

要求：
1. 控制在100字以内
2. 引用具体的单品名称（不是"上衣"，而是"修身西装外套"）
3. 引用具体的穿搭规则（体型适配、色彩季型、场合匹配度）
4. 如果有搭配技巧，简要提及
5. 语气自然，像朋友给建议
6. 只返回文字，不要JSON

穿搭证据：
{structured_evidence}

用户档案：
- 体型：{body_type_zh}
- 色彩季型：{color_season_zh}
- 场合：{occasion_zh}
- 风格：{styles}
- 预算：{budget}

请说明为什么这套搭配适合这位用户。
```

### 7.4 History Compression Prompt

```
请用2-3句话总结这段穿搭咨询对话，重点保留：
1. 用户最初的需求和场景
2. 推荐了什么风格的方案
3. 用户给出了什么反馈（喜欢/不喜欢/调整要求）

只输出中文总结，不要JSON。
```

### 7.5 Try-on Feedback Prompt

```
用户试穿了 {item_name}，虚拟试穿效果如下：
- 合身度：{fit_assessment}
- 体型匹配：{body_match_score}
- 颜色效果：{color_harmony}
- 建议：{suggestions}

请用1-2句话给用户反馈，语气自然亲切，100字以内。
如果要建议调整，顺便提一下可以换成什么。
```

### 7.6 Refinement Handling Prompt

```
用户对已有穿搭方案提出了调整要求：
"{user_message}"

当前方案信息：
{current_outfit_json}

用户档案：
{user_profile_summary}

请根据调整要求，给出回复。选项：
1. 如果只需要微调（换颜色/换单品），直接给出调整建议
2. 如果需要大幅调整（换风格/换场景），建议重新生成方案

返回JSON格式：
{
  "reply": "回复内容",
  "action": "adjust_item/regenerate/clarify",
  "slotUpdates": { ... 需要更新的slot },
  "replaceItemIndex": 要替换的单品索引或null,
  "replaceItemSuggestion": 建议替换为什么
}
```

---

## Implementation Priority

Based on the above design decisions, recommended build order:

| Priority | Task                                                             | Impact                             | Effort                     |
| -------- | ---------------------------------------------------------------- | ---------------------------------- | -------------------------- |
| P0       | Filtered Rule Injection (FashionRulesService)                    | HIGH - fixes the core gap          | 1-2 days                   |
| P0       | Conversation state machine enhancement (refining, try_on states) | HIGH - enables continuous chat     | 2-3 days                   |
| P1       | Hybrid explanation generation (evidence -> LLM polish)           | MEDIUM - better UX                 | 1 day                      |
| P1       | History compression for long sessions                            | MEDIUM - prevents context overflow | 1 day                      |
| P1       | Confidence score computation                                     | MEDIUM - transparency              | 0.5 day                    |
| P2       | Try-on conversation integration                                  | HIGH - key differentiator          | 3-5 days (depends on VTON) |
| P2       | Onboarding merge (first session detection + persist)             | MEDIUM - conversion                | 1 day                      |
| P2       | Output validation against rules                                  | HIGH - anti-hallucination          | 1 day                      |
| P3       | Topic drift detection                                            | LOW - nice to have                 | 0.5 day                    |
| P3       | Dynamic style/occasion options (LLM-generated)                   | LOW - already works with static    | 0.5 day                    |

---

## Key Risks

1. **LLM prompt size**: Injecting filtered rules adds ~2-5KB. Monitor token usage. If Chinese tokenization is inefficient (Chinese chars = 2-3 tokens each), the 7-10KB estimate could balloon to 10-15K tokens. Mitigate by truncating rule fields (remove hex colors, keep Chinese names only).

2. **Dual prompt sync**: NestJS (`system-prompt.ts`) and FastAPI (`stylist_prompts.py`) both have system prompts. Changes must be synced. Recommend: single source of truth in a shared config or the JSON rules themselves, with both services reading from the same source.

3. **VTON latency**: 15-30 second try-on processing creates UX challenges. Must show progress indicator and allow user to continue browsing while waiting.

4. **State machine complexity**: Adding try-on and refinement states increases the number of state transitions. Need comprehensive test coverage for all paths.

5. **Rule conflicts**: Body type rules say "recommend A", color season rules say "recommend B". Need a merge strategy. Recommend: body type rules take precedence for cut/silhouette, color season rules take precedence for color selection.

---

## Sources

- Codebase: `apps/backend/src/domains/ai-core/ai-stylist/` (6 service files, 1 types file, 1 prompts file)
- Codebase: `ml/services/stylist/stylist_prompts.py` (prompt templates + injection protection)
- Codebase: `ml/services/rag/hybrid_retriever.py` (BM25 + vector retrieval)
- Codebase: `ml/data/fashion_rules/*.json` (264+ rules, 272KB total)
- Codebase: `ml/api/routes/stylist.py` (FastAPI endpoints)
- Architecture: `.planning/research/ARCHITECTURE.md` (6-layer funnel pipeline)
- Stack: `.planning/research/STACK.md` (FashionCLIP, Qdrant, SASRec)
