export interface FashionKnowledgeSnippet {
  category: 'color_rule' | 'occasion_rule' | 'body_type_rule' | 'season_rule' | 'style_rule' | 'fabric_rule';
  title: string;
  content: string;
  source: string;
  confidence: number;
}

export interface WardrobeItemData {
  id: string;
  name: string;
  category: string;
  color: string;
  brand?: string;
  styleTags: string[];
  imageUrl?: string;
  notes?: string;
}

export interface TrendData {
  name: string;
  keywords: string[];
  hotItems: string[];
  styleMatches: string[];
  ttl: number;
  source: string;
}

export interface BodyAnalysisReport {
  bodyType: string;
  colorSeason: string;
  measurements: Record<string, number>;
  confidence: number;
  recommendations: string[];
}

export const KNOWLEDGE_INJECTION_TEMPLATES = {
  fashionKnowledge: `## 时尚知识库（相关规则）

以下是与你当前推荐任务相关的时尚规则，请在推荐时参考：

{{knowledgeItems}}

请将这些规则融入推荐理由中，让用户理解"为什么这样搭配是好的"。不要直接引用规则原文，而是用自然的语言表达。`,

  wardrobeData: `## 用户衣橱数据

以下是用户衣橱中现有的单品，优先使用这些单品进行搭配推荐：

{{wardrobeItems}}

搭配策略：
1. 优先从用户衣橱中选择单品，减少额外购买
2. 如果衣橱单品不足以完成搭配，推荐需要补充的单品
3. 标注哪些是衣橱现有单品，哪些是新推荐单品
4. 考虑单品之间的搭配兼容性`,

  trendData: `## 当前流行趋势

以下是当前热门的时尚趋势，推荐时可以适当融入：

{{trendItems}}

趋势融入策略：
1. 不要盲目追趋势，要与用户个人风格协调
2. 用1-2个趋势元素点缀，而非全身趋势
3. 优先推荐"趋势+经典"的混搭方案
4. 如果趋势与用户风格冲突，以用户风格为主`,

  bodyAnalysis: `## 用户体型分析报告

以下是用户的体型分析结果，推荐时必须参考：

{{bodyReport}}

体型修饰策略：
1. 根据体型分类选择合适的版型和剪裁
2. 根据色彩季型推荐适合的色系
3. 根据具体测量值判断适合的衣长、裤长等
4. 推荐理由中要体现体型修饰的逻辑`,
};

export function injectFashionKnowledge(snippets: FashionKnowledgeSnippet[]): string {
  if (snippets.length === 0) {
    return '';
  }

  const items = snippets.map((snippet) => {
    const categoryLabels: Record<string, string> = {
      color_rule: '色彩规则',
      occasion_rule: '场合规则',
      body_type_rule: '体型规则',
      season_rule: '季节规则',
      style_rule: '风格规则',
      fabric_rule: '面料规则',
    };

    return `[${categoryLabels[snippet.category] ?? snippet.category}] ${snippet.title}\n${snippet.content}\n(来源: ${snippet.source}, 置信度: ${(snippet.confidence * 100).toFixed(0)}%)`;
  }).join('\n\n');

  return KNOWLEDGE_INJECTION_TEMPLATES.fashionKnowledge.replace('{{knowledgeItems}}', items);
}

export function injectWardrobeData(items: WardrobeItemData[]): string {
  if (items.length === 0) {
    return '';
  }

  const itemLines = items.map((item) => {
    const parts = [
      `- ${item.name}`,
      `分类: ${item.category}`,
      `颜色: ${item.color}`,
    ];
    if (item.brand) parts.push(`品牌: ${item.brand}`);
    parts.push(`风格: ${item.styleTags.join('/')}`);
    if (item.notes) parts.push(`备注: ${item.notes}`);
    return parts.join(', ');
  }).join('\n');

  return KNOWLEDGE_INJECTION_TEMPLATES.wardrobeData.replace('{{wardrobeItems}}', itemLines);
}

export function injectTrendData(trends: TrendData[]): string {
  if (trends.length === 0) {
    return '';
  }

  const trendLines = trends.map((trend) => {
    return `- ${trend.name}\n  关键词: ${trend.keywords.join(', ')}\n  热门单品: ${trend.hotItems.join(', ')}\n  匹配风格: ${trend.styleMatches.join(', ')}\n  (来源: ${trend.source}, 有效期: ${trend.ttl}天)`;
  }).join('\n\n');

  return KNOWLEDGE_INJECTION_TEMPLATES.trendData.replace('{{trendItems}}', trendLines);
}

export function injectBodyAnalysis(report: BodyAnalysisReport): string {
  const measurementLines = Object.entries(report.measurements)
    .map(([key, value]) => `  ${key}: ${value}cm`)
    .join('\n');

  const recommendationLines = report.recommendations.map((r) => `  - ${r}`).join('\n');

  const bodyReport = `体型分类: ${report.bodyType}
色彩季型: ${report.colorSeason}
分析置信度: ${(report.confidence * 100).toFixed(0)}%

身体测量值:
${measurementLines}

推荐方向:
${recommendationLines}`;

  return KNOWLEDGE_INJECTION_TEMPLATES.bodyAnalysis.replace('{{bodyReport}}', bodyReport);
}

export const KNOWLEDGE_INJECTION_EXAMPLES = [
  {
    scenario: '注入色彩规则+体型规则',
    knowledge: injectFashionKnowledge([
      {
        category: 'color_rule',
        title: '海军蓝+驼色经典搭配',
        content: '海军蓝与驼色是经典商务搭配，沉稳有品味。适合通勤、商务场合。',
        source: '时尚规则库',
        confidence: 0.9,
      },
      {
        category: 'body_type_rule',
        title: '梨型身材上装建议',
        content: '梨型身材上半身应增加视觉焦点，选择浅色/亮色上装，搭配深色A字下装。',
        source: '体型规则库',
        confidence: 0.85,
      },
    ]),
    description: '注入2条时尚规则：色彩搭配规则和体型修饰规则',
  },
  {
    scenario: '注入用户衣橱数据',
    knowledge: injectWardrobeData([
      {
        id: 'w-001',
        name: '优衣库白色衬衫',
        category: '上装',
        color: '白色',
        brand: 'UNIQLO',
        styleTags: ['简约', '通勤'],
        notes: '经典款，版型好',
      },
      {
        id: 'w-002',
        name: '深蓝色直筒牛仔裤',
        category: '下装',
        color: '深蓝色',
        styleTags: ['休闲', '百搭'],
      },
    ]),
    description: '注入2件衣橱单品，优先使用现有单品搭配',
  },
  {
    scenario: '注入流行趋势数据',
    knowledge: injectTrendData([
      {
        name: '2026春夏薄荷曼波风',
        keywords: ['薄荷绿', '清新', '自然'],
        hotItems: ['薄荷绿针织衫', '奶油白阔腿裤', '草编包'],
        styleMatches: ['简约', '法式', '韩系'],
        ttl: 60,
        source: '小红书热榜',
      },
    ]),
    description: '注入1条流行趋势，融入推荐时保持用户风格为主',
  },
];
