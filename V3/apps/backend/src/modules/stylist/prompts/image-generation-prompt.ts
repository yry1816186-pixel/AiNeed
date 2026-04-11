export interface ImageGenerationInput {
  outfitItems: Array<{
    slot: string;
    name: string;
    color: string;
    secondaryColor?: string;
    fitType: string;
    material: string;
    styleTags: string[];
  }>;
  userProfile: {
    gender?: string;
    bodyType?: string;
    height?: number;
    colorSeason?: string;
    skinTone?: string;
  };
  occasion: string;
  season: string;
  styleTags: string[];
}

export interface ImagePromptResult {
  promptZh: string;
  promptEn: string;
  negativePrompt: string;
  qualityKeywords: string[];
}

const BODY_TYPE_DESCRIPTIONS: Record<string, { zh: string; en: string }> = {
  hourglass: {
    zh: '身材匀称的沙漏型女性，腰线明显，曲线优美',
    en: 'slender hourglass figure with defined waist and graceful curves',
  },
  pear: {
    zh: '梨型身材女性，上半身纤细，臀部丰满',
    en: 'pear-shaped figure with slim upper body and fuller hips',
  },
  apple: {
    zh: '苹果型身材女性，上半身丰满，腿部纤细',
    en: 'apple-shaped figure with fuller midsection and slim legs',
  },
  straight: {
    zh: '直筒型身材女性，线条利落干净',
    en: 'straight figure with clean and sleek lines',
  },
  inverted_triangle: {
    zh: '倒三角型身材，肩部宽阔，下半身纤细',
    en: 'inverted triangle figure with broader shoulders and slim lower body',
  },
};

const SEASON_ATMOSPHERE: Record<string, { zh: string; en: string }> = {
  spring: { zh: '春日暖阳', en: 'warm spring sunlight' },
  summer: { zh: '夏日清风', en: 'fresh summer breeze' },
  autumn: { zh: '秋日暖阳', en: 'golden autumn light' },
  winter: { zh: '冬日雪景', en: 'crisp winter atmosphere' },
};

const OCCASION_SCENE: Record<string, { zh: string; en: string }> = {
  work: { zh: '现代办公空间', en: 'modern office space' },
  casual: { zh: '城市街头', en: 'urban street' },
  date: { zh: '浪漫餐厅', en: 'romantic restaurant' },
  sport: { zh: '运动场景', en: 'athletic setting' },
  formal: { zh: '宴会厅', en: 'banquet hall' },
  party: { zh: '时尚派对', en: 'fashionable party' },
  interview: { zh: '专业商务环境', en: 'professional business environment' },
  campus: { zh: '大学校园', en: 'university campus' },
};

const QUALITY_KEYWORDS_ZH = [
  '高质感',
  '时尚杂志风',
  '自然光',
  '专业时尚摄影',
  '全身照',
  '精致细节',
  '高级感',
  '清晰锐利',
  '真实质感',
];

const QUALITY_KEYWORDS_EN = [
  'high quality',
  'fashion editorial style',
  'natural lighting',
  'professional fashion photography',
  'full body shot',
  'fine details',
  'luxurious feel',
  'sharp focus',
  'realistic texture',
];

export const NEGATIVE_PROMPT = 'low quality, blurry, deformed, bad anatomy, bad hands, missing fingers, extra digits, cropped, worst quality, low resolution, watermark, text, logo, signature, ugly, duplicate, morbid, mutilated, out of frame, mutation, poorly drawn, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, mutated hands, fused fingers, too many fingers, long neck, cartoon, anime, illustration, painting, drawing, sketch, 3d render, CGI';

export function buildImageGenerationPrompt(input: ImageGenerationInput): ImagePromptResult {
  const bodyDesc = BODY_TYPE_DESCRIPTIONS[input.userProfile.bodyType ?? 'straight'] ?? BODY_TYPE_DESCRIPTIONS.straight;
  const seasonAtmo = SEASON_ATMOSPHERE[input.season] ?? SEASON_ATMOSPHERE.spring;
  const occasionScene = OCCASION_SCENE[input.occasion] ?? OCCASION_SCENE.casual;

  const genderZh = input.userProfile.gender === 'male' ? '男性' : '女性';
  const genderEn = input.userProfile.gender === 'male' ? 'man' : 'woman';

  const heightCm = input.userProfile.height ?? 165;

  const outfitDescZh = input.outfitItems
    .map((item) => `${item.color}${item.name}(${item.fitType}版型, ${item.material})`)
    .join('，');

  const outfitDescEn = input.outfitItems
    .map((item) => `${item.color} ${item.name} (${item.fitType} fit, ${item.material})`)
    .join(', ');

  const styleTagsZh = input.styleTags.join('风、') + '风';
  const styleTagsEn = input.styleTags.join(' and ') + ' style';

  const colorSeasonNote = input.userProfile.colorSeason
    ? `，${input.userProfile.colorSeason}色彩季型`
    : '';

  const promptZh = `一张高品质时尚杂志风格的全身穿搭照片。

人物：一位${heightCm}cm高的${genderZh}，${bodyDesc.zh}${colorSeasonNote}。
穿着：${outfitDescZh}。
风格：${styleTagsZh}。
场景：${occasionScene.zh}，${seasonAtmo.zh}。
氛围：自然光照射，专业时尚摄影，精致细节，高级质感，真实服装面料纹理。
构图：全身照，居中构图，姿态自然优雅。`;

  const promptEn = `A high-quality fashion editorial full-body outfit photograph.

Subject: A ${heightCm}cm tall ${genderEn}, ${bodyDesc.en}${input.userProfile.colorSeason ? `, ${input.userProfile.colorSeason} color season` : ''}.
Wearing: ${outfitDescEn}.
Style: ${styleTagsEn}.
Scene: ${occasionScene.en}, ${seasonAtmo.en}.
Atmosphere: Natural lighting, professional fashion photography, fine details, luxurious feel, realistic fabric texture.
Composition: Full body shot, centered framing, natural and elegant pose.`;

  return {
    promptZh,
    promptEn,
    negativePrompt: NEGATIVE_PROMPT,
    qualityKeywords: [...QUALITY_KEYWORDS_ZH, ...QUALITY_KEYWORDS_EN],
  };
}

export function buildCompactImagePrompt(input: ImageGenerationInput, language: 'zh' | 'en' = 'zh'): string {
  const result = buildImageGenerationPrompt(input);
  return language === 'zh' ? result.promptZh : result.promptEn;
}

export const IMAGE_GENERATION_PROMPT_EXAMPLES = [
  {
    scenario: '秋季通勤搭配效果图',
    input: {
      outfitItems: [
        { slot: 'top', name: '驼色高领针织衫', color: '驼色', fitType: 'slim', material: '羊毛混纺', styleTags: ['简约', '通勤'] },
        { slot: 'bottom', name: '深蓝色直筒西裤', color: '深蓝色', fitType: 'regular', material: '精纺羊毛', styleTags: ['通勤', '商务'] },
        { slot: 'outer', name: '卡其色风衣', color: '卡其色', fitType: 'regular', material: '棉质混纺', styleTags: ['经典', '通勤'] },
        { slot: 'shoes', name: '黑色尖头高跟鞋', color: '黑色', fitType: 'regular', material: '真皮', styleTags: ['通勤', '优雅'] },
        { slot: 'bag', name: '棕色托特包', color: '棕色', fitType: 'regular', material: '真皮', styleTags: ['通勤', '百搭'] },
      ],
      userProfile: { gender: 'female', bodyType: 'hourglass', height: 165, colorSeason: '秋季暖调' },
      occasion: 'work',
      season: 'autumn',
      styleTags: ['简约', '通勤'],
    } satisfies ImageGenerationInput,
    description: '沙漏型女性+秋季通勤，驼色+深蓝经典配色，风衣+针织+西裤组合',
  },
  {
    scenario: '春季约会搭配效果图',
    input: {
      outfitItems: [
        { slot: 'dress', name: '碎花裹身裙', color: '淡粉色', secondaryColor: '白色碎花', fitType: 'slim', material: '雪纺', styleTags: ['法式', '甜美'] },
        { slot: 'shoes', name: '米色方头玛丽珍鞋', color: '米色', fitType: 'regular', material: '真皮', styleTags: ['法式', '复古'] },
        { slot: 'bag', name: '白色链条小包', color: '白色', fitType: 'regular', material: '皮革', styleTags: ['法式', '精致'] },
        { slot: 'accessory', name: '珍珠耳环', color: '白色', fitType: 'regular', material: '珍珠', styleTags: ['法式', '优雅'] },
      ],
      userProfile: { gender: 'female', bodyType: 'pear', height: 160, colorSeason: '春季淡暖' },
      occasion: 'date',
      season: 'spring',
      styleTags: ['法式', '甜美'],
    } satisfies ImageGenerationInput,
    description: '梨型女性+春季约会，淡粉裹身裙修饰臀腿，法式浪漫风格',
  },
  {
    scenario: '冬季商务搭配效果图',
    input: {
      outfitItems: [
        { slot: 'top', name: '白色衬衫', color: '白色', fitType: 'slim', material: '棉质', styleTags: ['商务', '简约'] },
        { slot: 'bottom', name: '深灰色修身西裤', color: '深灰色', fitType: 'slim', material: '精纺羊毛', styleTags: ['商务', '干练'] },
        { slot: 'outer', name: '藏蓝色双排扣西装外套', color: '藏蓝色', fitType: 'regular', material: '羊毛', styleTags: ['商务', '经典'] },
        { slot: 'shoes', name: '黑色牛津鞋', color: '黑色', fitType: 'regular', material: '牛皮', styleTags: ['商务', '经典'] },
        { slot: 'accessory', name: '银色领带夹', color: '银色', fitType: 'regular', material: '金属', styleTags: ['商务', '精致'] },
      ],
      userProfile: { gender: 'male', bodyType: 'inverted_triangle', height: 178, colorSeason: '冬季冷调' },
      occasion: 'interview',
      season: 'winter',
      styleTags: ['商务', '简约'],
    } satisfies ImageGenerationInput,
    description: '倒三角型男性+冬季商务面试，藏蓝西装+白衬衫经典组合',
  },
];
