import { Injectable, Logger } from '@nestjs/common';
import {
  ILLMProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  ImageOptions,
  ImageResponse,
  ModelInfo,
} from './llm-provider.interface';

const MOCK_MODEL = 'mock-llm';
const MOCK_MAX_TOKENS = 4096;

const MOCK_OUTFIT_RESPONSE = JSON.stringify({
  occasion: 'casual',
  season: 'autumn',
  styleTags: ['简约', '通勤'],
  items: [
    {
      slot: 'top',
      name: '白色基础款T恤',
      category: '上装',
      color: '白色',
      fitType: 'regular',
      material: '棉质',
      priceRange: '50-100',
      reason: '百搭基础款，适合叠穿',
    },
    {
      slot: 'bottom',
      name: '深蓝色直筒牛仔裤',
      category: '下装',
      color: '深蓝色',
      fitType: 'regular',
      material: '牛仔布',
      priceRange: '150-300',
      reason: '经典百搭，修饰腿型',
    },
    {
      slot: 'outer',
      name: '卡其色风衣',
      category: '外套',
      color: '卡其色',
      fitType: 'regular',
      material: '棉质混纺',
      priceRange: '300-600',
      reason: '秋季必备，提升整体质感',
    },
    {
      slot: 'shoes',
      name: '白色帆布鞋',
      category: '鞋履',
      color: '白色',
      fitType: 'regular',
      material: '帆布',
      priceRange: '100-200',
      reason: '休闲百搭，舒适轻便',
    },
    {
      slot: 'bag',
      name: '棕色托特包',
      category: '包袋',
      color: '棕色',
      fitType: 'regular',
      material: '真皮',
      priceRange: '200-500',
      reason: '通勤休闲两用，容量充足',
    },
  ],
  overallReason: '经典秋季通勤休闲搭配，卡其+深蓝+白色三色组合，层次分明',
  colorScheme: '中性色为主，卡其+深蓝经典搭配，白色提亮',
  bodyTypeTip: '直筒版型适合大多数体型，风衣长度建议在膝盖上方',
  alternativeTip: '风衣可替换为牛仔外套，更休闲；帆布鞋可替换为乐福鞋，更正式',
});

@Injectable()
export class MockProvider implements ILLMProvider {
  private readonly logger = new Logger(MockProvider.name);

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    this.logger.log(`Mock chat called with ${messages.length} messages`);

    const lastMessage = messages[messages.length - 1];
    const content = this.generateMockResponse(lastMessage?.content ?? '');

    return {
      content,
      usage: {
        promptTokens: messages.reduce((sum, m) => sum + m.content.length, 0),
        completionTokens: content.length,
      },
      model: MOCK_MODEL,
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk> {
    this.logger.log(`Mock chatStream called with ${messages.length} messages`);

    const lastMessage = messages[messages.length - 1];
    const content = this.generateMockResponse(lastMessage?.content ?? '');

    const words = content.split('');
    for (let i = 0; i < words.length; i++) {
      yield { content: words[i], done: false };
    }

    yield { content: '', done: true };
  }

  async generateImage(prompt: string, options?: ImageOptions): Promise<ImageResponse> {
    this.logger.log(`Mock generateImage called with prompt: ${prompt.substring(0, 50)}...`);

    return {
      url: `https://mock-cdn.aineed.com/mock-outfit-${Date.now()}.png`,
      cost: 0,
    };
  }

  getModelInfo(): ModelInfo {
    return {
      name: MOCK_MODEL,
      provider: 'mock',
      maxTokens: MOCK_MAX_TOKENS,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private generateMockResponse(userMessage: string): string {
    if (userMessage.includes('搭配') || userMessage.includes('推荐') || userMessage.includes('穿搭')) {
      return `根据您的需求，我为您推荐以下搭配方案：\n\n\`\`\`outfit\n${MOCK_OUTFIT_RESPONSE}\n\`\`\`\n\n这套搭配以秋季通勤为场景，卡其色风衣搭配深蓝牛仔裤，经典又不失时尚感。白色T恤作为内搭提亮整体，棕色托特包与风衣色调呼应，整体和谐统一。`;
    }

    if (userMessage.includes('颜色') || userMessage.includes('色彩')) {
      return '根据您的色彩季型，我建议您优先选择中性色系（驼色、米色、灰色）作为基础色，搭配深蓝色或墨绿色作为点缀色。避免大面积使用荧光色或过于鲜艳的撞色组合。';
    }

    if (userMessage.includes('体型') || userMessage.includes('身材')) {
      return '了解您的体型是搭配的第一步！不同体型有不同的穿搭策略：\n\n1. **沙漏型**：突出腰线，选择收腰款式\n2. **梨型**：上半身增加亮点，A字裙修饰臀腿\n3. **苹果型**：V领上衣拉长上半身，高腰裤提升腰线\n4. **直筒型**：腰带和层次感创造曲线\n5. **倒三角型**：下半身增加量感，阔腿裤平衡比例\n\n您可以告诉我您的体型，我来给出更具体的建议！';
    }

    return `您好！我是小衣，您的AI私人造型师。我可以帮您：\n\n1. 🎨 推荐搭配方案\n2. 👗 分析体型适合的穿搭\n3. 🌈 色彩搭配建议\n4. 💼 场合着装指导\n5. 💰 预算内最优选择\n\n请告诉我您今天需要什么帮助？`;
  }
}
