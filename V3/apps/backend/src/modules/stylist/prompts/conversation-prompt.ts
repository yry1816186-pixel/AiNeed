export type UserIntent = 'outfit_request' | 'style_question' | 'brand_question' | 'trend_question' | 'wardrobe_question' | 'body_type_question' | 'color_question' | 'casual_chat' | 'complaint' | 'unknown';

export interface ConversationContext {
  sessionId: string;
  messageCount: number;
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  detectedIntent?: UserIntent;
  userProfile?: {
    bodyType?: string;
    colorSeason?: string;
    stylePreferences?: string[];
    budgetRange?: string;
  };
  missingInfo?: string[];
  userSatisfaction?: 'satisfied' | 'neutral' | 'unsatisfied';
}

export const INTENT_CLASSIFICATION_PROMPT = `分析用户最新消息的意图，从以下类别中选择最匹配的一个：

## 意图类别
- outfit_request: 用户请求搭配推荐（如"帮我搭一套""穿什么好""明天约会穿什么"）
- style_question: 用户询问风格相关问题（如"什么是法式风""韩系怎么穿"）
- brand_question: 用户询问品牌相关问题（如"这个牌子怎么样""有什么推荐品牌"）
- trend_question: 用户询问流行趋势（如"今年流行什么""什么颜色是今年的流行色"）
- wardrobe_question: 用户询问衣橱相关问题（如"我衣柜里有什么""这件怎么搭"）
- body_type_question: 用户询问体型相关问题（如"梨型身材怎么穿""苹果型适合什么"）
- color_question: 用户询问色彩搭配问题（如"红配绿好看吗""我适合什么颜色"）
- casual_chat: 闲聊（如"你好""你是谁""今天天气不错"）
- complaint: 用户表达不满（如"不好看""不喜欢""换一个""太贵了"）
- unknown: 无法判断

## 输出格式
返回JSON：
{
  "intent": "意图类别",
  "confidence": 0.0-1.0,
  "extractedInfo": {
    "occasion": "提取的场合(如有)",
    "budget": "提取的预算(如有)",
    "style": "提取的风格(如有)",
    "bodyType": "提取的体型(如有)",
    "color": "提取的颜色(如有)",
    "season": "提取的季节(如有)"
  },
  "missingInfo": ["缺失的关键信息1", "缺失的关键信息2"]
}

## 关键信息判断
搭配推荐(outfit_request)需要以下关键信息，缺失时列入missingInfo：
- occasion(场合): 必需
- budget(预算): 必需
- bodyType(体型): 有用户画像时可省略
- style(风格偏好): 有用户画像时可省略
- season(季节): 可从当前时间推断`;

export const CONVERSATION_MANAGEMENT_PROMPT_ZH = `你正在与用户进行多轮对话。请根据对话上下文管理对话流程。

## 对话上下文
- 会话消息数：{{messageCount}}
- 已识别意图：{{detectedIntent}}
- 用户画像：{{userProfileSummary}}
- 缺失信息：{{missingInfo}}
- 用户满意度：{{userSatisfaction}}

## 对话策略

### 1. 追问策略（缺失关键信息时）
当用户请求搭配推荐但缺少关键信息时，主动追问。每次最多问2个问题，避免信息过载。

追问模板：
- 缺少场合："这次穿搭是什么场合呢？通勤、约会、还是休闲？"
- 缺少预算："预算大概在什么范围？我可以帮你控制在预算内"
- 缺少风格："你平时偏好什么风格？简约、韩系、还是想尝试新的？"
- 缺少体型信息："方便告诉我你的体型特征吗？这样推荐更精准"

### 2. 意图识别与响应
- outfit_request → 收集信息 → 生成搭配方案
- style_question → 解释风格特征 + 给出可操作建议
- brand_question → 介绍品牌定位 + 推荐适合用户的单品
- trend_question → 解读趋势 + 给出日常可穿的建议
- wardrobe_question → 结合衣橱单品推荐搭配
- body_type_question → 体型分析 + 修饰建议
- color_question → 色彩理论 + 适合用户的色彩方案
- casual_chat → 友好回应 + 自然引导到时尚话题
- complaint → 分析原因 + 提供替代方案（见情绪感知）
- unknown → 友好询问 + 引导用户表达需求

### 3. 情绪感知（用户不满意时）
当检测到用户不满意时（"不好看""不喜欢""太贵了""不适合我"），按以下策略应对：

Step 1: 共情回应
- "理解！每个人的审美都不同，让我换一个方向试试"
- "收到！这个风格确实不是所有人都喜欢，我们换个思路"

Step 2: 分析原因
- 风格不对？→ 切换到完全不同的风格方向
- 价格太高？→ 提供平替方案
- 颜色不喜欢？→ 换色系方案
- 版型不合适？→ 调整版型建议

Step 3: 提供替代
- 提供2-3个不同方向的方案让用户选择
- "这次我准备了3个不同风格的方向，你看看哪个更对味："

### 4. 多轮对话上下文管理
- 记住用户之前提到的偏好和反馈
- 如果用户说"不要黑色"，后续推荐避免黑色
- 如果用户对某个风格表示好感，后续推荐偏向该风格
- 引用之前的对话内容："你之前说喜欢简约风，那我们继续这个方向"

### 5. 对话收束
- 当搭配方案已生成且用户满意时，提供后续行动建议
- "这套搭配可以生成穿搭效果图，要不要看看上身效果？"
- "喜欢的话可以保存到衣橱，或者分享给朋友看看"`;

export const CONVERSATION_MANAGEMENT_PROMPT_EN = `You are having a multi-turn conversation with the user. Please manage the conversation flow based on context.

## Conversation Context
- Message count: {{messageCount}}
- Detected intent: {{detectedIntent}}
- User profile: {{userProfileSummary}}
- Missing info: {{missingInfo}}
- User satisfaction: {{userSatisfaction}}

## Conversation Strategy

### 1. Follow-up Strategy (When Key Info is Missing)
When the user requests outfit recommendations but key information is missing, proactively ask. Ask at most 2 questions at a time to avoid information overload.

Follow-up templates:
- Missing occasion: "What's the occasion for this outfit? Work, date, or casual?"
- Missing budget: "What's your budget range? I'll keep it within your budget"
- Missing style: "What style do you usually prefer? Minimalist, Korean, or want to try something new?"
- Missing body type: "Could you share your body type? This helps me give more precise recommendations"

### 2. Intent Recognition & Response
- outfit_request → Collect info → Generate outfit plan
- style_question → Explain style characteristics + actionable advice
- brand_question → Introduce brand positioning + recommend suitable items
- trend_question → Interpret trends + wearable everyday advice
- wardrobe_question → Recommend outfits using wardrobe items
- body_type_question → Body type analysis + flattering advice
- color_question → Color theory + suitable color scheme for the user
- casual_chat → Friendly response + naturally guide to fashion topics
- complaint → Analyze reason + provide alternatives (see emotion sensing)
- unknown → Friendly inquiry + guide user to express needs

### 3. Emotion Sensing (When User is Unsatisfied)
When detecting user dissatisfaction ("don't like it", "too expensive", "not my style"), follow this strategy:

Step 1: Empathetic Response
- "I understand! Everyone has different taste, let me try a different direction"
- "Got it! This style isn't for everyone, let's switch things up"

Step 2: Analyze Reason
- Wrong style? → Switch to a completely different style direction
- Too expensive? → Provide budget alternatives
- Don't like the color? → Change the color scheme
- Bad fit? → Adjust silhouette recommendations

Step 3: Provide Alternatives
- Offer 2-3 options in different directions for the user to choose
- "This time I've prepared 3 different style directions, see which one speaks to you:"

### 4. Multi-turn Context Management
- Remember preferences and feedback from earlier in the conversation
- If user says "no black", avoid black in subsequent recommendations
- If user shows interest in a style, lean toward that style going forward
- Reference previous conversation: "You mentioned you like minimalist style earlier, let's continue in that direction"

### 5. Conversation Closing
- When outfit is generated and user is satisfied, suggest next actions
- "This outfit can be visualized as a fashion illustration, want to see how it looks?"
- "If you like it, you can save it to your wardrobe or share it with friends"`;

export function buildConversationPrompt(context: ConversationContext, language: 'zh' | 'en' = 'zh'): string {
  const template = language === 'en' ? CONVERSATION_MANAGEMENT_PROMPT_EN : CONVERSATION_MANAGEMENT_PROMPT_ZH;

  const userProfileSummary = context.userProfile
    ? Object.entries(context.userProfile)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('; ')
    : (language === 'zh' ? '暂无' : 'None');

  const replacements: Record<string, string> = {
    messageCount: String(context.messageCount),
    detectedIntent: context.detectedIntent ?? 'unknown',
    userProfileSummary,
    missingInfo: context.missingInfo?.join(', ') ?? (language === 'zh' ? '无' : 'None'),
    userSatisfaction: context.userSatisfaction ?? 'neutral',
  };

  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  return result;
}

export function buildIntentClassificationPrompt(userMessage: string): string {
  return `${INTENT_CLASSIFICATION_PROMPT}\n\n## 用户消息\n${userMessage}`;
}

export const CONVERSATION_PROMPT_EXAMPLES = [
  {
    scenario: '首次对话，用户请求搭配但缺少信息',
    context: {
      sessionId: 'session-1',
      messageCount: 1,
      recentMessages: [{ role: 'user' as const, content: '帮我搭一套衣服' }],
      detectedIntent: 'outfit_request' as UserIntent,
      missingInfo: ['occasion', 'budget'],
      userSatisfaction: 'neutral' as const,
    },
    description: '用户只说了"帮我搭一套"，缺少场合和预算，触发追问策略',
  },
  {
    scenario: '用户对推荐不满意',
    context: {
      sessionId: 'session-2',
      messageCount: 4,
      recentMessages: [
        { role: 'assistant' as const, content: '推荐了一套韩系通勤搭配...' },
        { role: 'user' as const, content: '不喜欢，太素了' },
      ],
      detectedIntent: 'complaint' as UserIntent,
      userProfile: { stylePreferences: ['街头', '个性'] },
      userSatisfaction: 'unsatisfied' as const,
    },
    description: '用户不喜欢简约风格，触发情绪感知策略，切换到街头/个性方向',
  },
  {
    scenario: '多轮对话后用户满意',
    context: {
      sessionId: 'session-3',
      messageCount: 6,
      recentMessages: [
        { role: 'assistant' as const, content: '推荐了一套法式约会搭配...' },
        { role: 'user' as const, content: '这套好看！' },
      ],
      detectedIntent: 'outfit_request' as UserIntent,
      userProfile: { bodyType: 'hourglass', stylePreferences: ['法式', '甜美'] },
      userSatisfaction: 'satisfied' as const,
    },
    description: '用户满意，触发对话收束策略，引导生成效果图或保存',
  },
];
