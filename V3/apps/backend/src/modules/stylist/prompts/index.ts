import { buildSystemPrompt, SYSTEM_PROMPT_ZH, SYSTEM_PROMPT_EN, SYSTEM_PROMPT_EXAMPLES, type SystemPromptConfig } from './system-prompt';
import { buildOutfitPrompt, OUTFIT_PROMPT_TEMPLATE_ZH, OUTFIT_PROMPT_TEMPLATE_EN, OUTFIT_PROMPT_EXAMPLES, type UserProfile, type OutfitItem, type OutfitRecommendation } from './outfit-prompt';
import { buildConversationPrompt, buildIntentClassificationPrompt, CONVERSATION_MANAGEMENT_PROMPT_ZH, CONVERSATION_MANAGEMENT_PROMPT_EN, INTENT_CLASSIFICATION_PROMPT, CONVERSATION_PROMPT_EXAMPLES, type ConversationContext, type UserIntent } from './conversation-prompt';
import { injectFashionKnowledge, injectWardrobeData, injectTrendData, injectBodyAnalysis, KNOWLEDGE_INJECTION_TEMPLATES, KNOWLEDGE_INJECTION_EXAMPLES, type FashionKnowledgeSnippet, type WardrobeItemData, type TrendData, type BodyAnalysisReport } from './knowledge-injection';
import { buildImageGenerationPrompt, buildCompactImagePrompt, IMAGE_GENERATION_PROMPT_EXAMPLES, NEGATIVE_PROMPT, type ImageGenerationInput, type ImagePromptResult } from './image-generation-prompt';

export { buildSystemPrompt, SYSTEM_PROMPT_ZH, SYSTEM_PROMPT_EN, SYSTEM_PROMPT_EXAMPLES } from './system-prompt';
export { buildOutfitPrompt, OUTFIT_PROMPT_TEMPLATE_ZH, OUTFIT_PROMPT_TEMPLATE_EN, OUTFIT_PROMPT_EXAMPLES } from './outfit-prompt';
export { buildConversationPrompt, buildIntentClassificationPrompt, CONVERSATION_MANAGEMENT_PROMPT_ZH, CONVERSATION_MANAGEMENT_PROMPT_EN, INTENT_CLASSIFICATION_PROMPT, CONVERSATION_PROMPT_EXAMPLES } from './conversation-prompt';
export { injectFashionKnowledge, injectWardrobeData, injectTrendData, injectBodyAnalysis, KNOWLEDGE_INJECTION_TEMPLATES, KNOWLEDGE_INJECTION_EXAMPLES } from './knowledge-injection';
export { buildImageGenerationPrompt, buildCompactImagePrompt, IMAGE_GENERATION_PROMPT_EXAMPLES } from './image-generation-prompt';

export type { SystemPromptConfig, UserProfile, OutfitItem, OutfitRecommendation, ConversationContext, UserIntent, FashionKnowledgeSnippet, WardrobeItemData, TrendData, BodyAnalysisReport, ImageGenerationInput, ImagePromptResult };

const CHINESE_CHAR_RATIO = 1.5;
const ENGLISH_WORD_RATIO = 1.3;
const DEFAULT_MAX_TOKENS = 8000;
const SAFETY_MARGIN = 0.9;

function estimateTokenCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
  const remainingText = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, '');
  const englishWords = remainingText.split(/\s+/).filter((w) => w.length > 0).length;

  return Math.ceil(chineseChars * CHINESE_CHAR_RATIO + englishWords * ENGLISH_WORD_RATIO);
}

function truncateToTokenLimit(text: string, maxTokens: number): string {
  const currentTokens = estimateTokenCount(text);
  if (currentTokens <= maxTokens) {
    return text;
  }

  const ratio = maxTokens / currentTokens;
  const targetLength = Math.floor(text.length * ratio * SAFETY_MARGIN);
  const truncated = text.substring(0, targetLength);

  const lastNewline = truncated.lastIndexOf('\n');
  if (lastNewline > targetLength * 0.8) {
    return truncated.substring(0, lastNewline);
  }

  return truncated;
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

export interface PromptBuilderConfig {
  language: 'zh' | 'en';
  maxTokens?: number;
  userName?: string;
  enableEmoji?: boolean;
}

export interface PromptBuilderContext {
  userProfile?: UserProfile;
  conversationContext?: ConversationContext;
  fashionKnowledge?: FashionKnowledgeSnippet[];
  wardrobeItems?: WardrobeItemData[];
  trends?: TrendData[];
  bodyAnalysis?: BodyAnalysisReport;
}

export class PromptBuilder {
  private readonly config: PromptBuilderConfig;
  private readonly maxTokens: number;
  private sections: Array<{ priority: number; content: string; label: string }> = [];

  constructor(config: PromptBuilderConfig) {
    this.config = config;
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  reset(): PromptBuilder {
    this.sections = [];
    return this;
  }

  addSystemPrompt(config?: Partial<SystemPromptConfig>): PromptBuilder {
    const content = buildSystemPrompt({
      language: this.config.language,
      userName: config?.userName ?? this.config.userName,
      enableEmoji: config?.enableEmoji ?? this.config.enableEmoji ?? true,
    });
    this.sections.push({ priority: 100, content, label: 'system_prompt' });
    return this;
  }

  addOutfitPrompt(profile: UserProfile): PromptBuilder {
    const content = buildOutfitPrompt(profile, this.config.language);
    this.sections.push({ priority: 80, content, label: 'outfit_prompt' });
    return this;
  }

  addConversationContext(context: ConversationContext): PromptBuilder {
    const content = buildConversationPrompt(context, this.config.language);
    this.sections.push({ priority: 70, content, label: 'conversation_context' });
    return this;
  }

  addFashionKnowledge(snippets: FashionKnowledgeSnippet[]): PromptBuilder {
    const content = injectFashionKnowledge(snippets);
    if (content) {
      this.sections.push({ priority: 60, content, label: 'fashion_knowledge' });
    }
    return this;
  }

  addWardrobeData(items: WardrobeItemData[]): PromptBuilder {
    const content = injectWardrobeData(items);
    if (content) {
      this.sections.push({ priority: 50, content, label: 'wardrobe_data' });
    }
    return this;
  }

  addTrendData(trends: TrendData[]): PromptBuilder {
    const content = injectTrendData(trends);
    if (content) {
      this.sections.push({ priority: 40, content, label: 'trend_data' });
    }
    return this;
  }

  addBodyAnalysis(report: BodyAnalysisReport): PromptBuilder {
    const content = injectBodyAnalysis(report);
    if (content) {
      this.sections.push({ priority: 55, content, label: 'body_analysis' });
    }
    return this;
  }

  addCustomSection(label: string, content: string, priority: number = 30): PromptBuilder {
    this.sections.push({ priority, content, label });
    return this;
  }

  build(): string {
    const sorted = [...this.sections].sort((a, b) => b.priority - a.priority);

    const parts: string[] = [];
    let usedTokens = 0;

    for (const section of sorted) {
      const sectionTokens = estimateTokenCount(section.content);

      if (usedTokens + sectionTokens <= this.maxTokens) {
        parts.push(section.content);
        usedTokens += sectionTokens;
      } else {
        const remainingTokens = this.maxTokens - usedTokens;
        if (remainingTokens > 200) {
          const truncated = truncateToTokenLimit(section.content, remainingTokens);
          parts.push(truncated + '\n\n[内容因token限制已截断]');
          break;
        }
        break;
      }
    }

    return parts.join('\n\n---\n\n');
  }

  getTokenEstimate(): { total: number; sections: Array<{ label: string; tokens: number }> } {
    const sections = this.sections.map((s) => ({
      label: s.label,
      tokens: estimateTokenCount(s.content),
    }));
    return {
      total: sections.reduce((sum, s) => sum + s.tokens, 0),
      sections,
    };
  }

  getSections(): Array<{ label: string; tokens: number; priority: number }> {
    return this.sections.map((s) => ({
      label: s.label,
      tokens: estimateTokenCount(s.content),
      priority: s.priority,
    }));
  }
}

export function createFullPrompt(
  config: PromptBuilderConfig,
  context: PromptBuilderContext,
): string {
  const builder = new PromptBuilder(config);

  builder.addSystemPrompt();

  if (context.bodyAnalysis) {
    builder.addBodyAnalysis(context.bodyAnalysis);
  }

  if (context.fashionKnowledge && context.fashionKnowledge.length > 0) {
    builder.addFashionKnowledge(context.fashionKnowledge);
  }

  if (context.wardrobeItems && context.wardrobeItems.length > 0) {
    builder.addWardrobeData(context.wardrobeItems);
  }

  if (context.trends && context.trends.length > 0) {
    builder.addTrendData(context.trends);
  }

  if (context.userProfile) {
    builder.addOutfitPrompt(context.userProfile);
  }

  if (context.conversationContext) {
    builder.addConversationContext(context.conversationContext);
  }

  return builder.build();
}

export { estimateTokenCount, truncateToTokenLimit, replaceVariables };

export const PROMPT_BUILDER_EXAMPLES = [
  {
    scenario: '完整搭配推荐场景',
    description: '系统Prompt + 用户画像 + 体型分析 + 时尚知识 + 衣橱数据 → 生成完整搭配推荐Prompt',
    code: `const builder = new PromptBuilder({ language: 'zh', userName: '小雨' });
builder
  .addSystemPrompt()
  .addBodyAnalysis({ bodyType: 'pear', colorSeason: '秋季暖调', measurements: { waist: 68, hips: 96 }, confidence: 0.85, recommendations: ['高腰A字裙'] })
  .addFashionKnowledge([{ category: 'color_rule', title: '驼色+深蓝', content: '经典搭配', source: '规则库', confidence: 0.9 }])
  .addWardrobeData([{ id: 'w1', name: '白衬衫', category: '上装', color: '白色', styleTags: ['简约'] }])
  .addOutfitPrompt({ gender: 'female', bodyType: 'pear', height: 160, occasion: '通勤', season: 'autumn', budgetRange: '500-1500' });
const prompt = builder.build();`,
  },
  {
    scenario: '对话管理场景',
    description: '系统Prompt + 对话上下文 + 流行趋势 → 生成对话管理Prompt',
    code: `const builder = new PromptBuilder({ language: 'zh', maxTokens: 6000 });
builder
  .addSystemPrompt()
  .addConversationContext({ sessionId: 's1', messageCount: 3, recentMessages: [...], detectedIntent: 'complaint', userSatisfaction: 'unsatisfied' })
  .addTrendData([{ name: '薄荷曼波风', keywords: ['薄荷绿'], hotItems: ['薄荷绿针织衫'], styleMatches: ['简约'], ttl: 60, source: '小红书' }]);
const prompt = builder.build();`,
  },
  {
    scenario: '英文用户场景',
    description: '英文环境完整Prompt构建',
    code: `const builder = new PromptBuilder({ language: 'en', userName: 'Sarah', enableEmoji: true });
builder
  .addSystemPrompt()
  .addOutfitPrompt({ gender: 'female', bodyType: 'hourglass', height: 170, colorSeason: 'Winter Cool', occasion: 'date', season: 'spring', budgetRange: '200-500 USD' });
const prompt = builder.build();`,
  },
];
