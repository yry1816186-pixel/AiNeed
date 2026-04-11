export interface UserProfile {
  bodyType?: 'hourglass' | 'pear' | 'apple' | 'straight' | 'inverted_triangle';
  height?: number;
  weight?: number;
  colorSeason?: string;
  gender?: 'male' | 'female' | 'other';
  stylePreferences?: string[];
  colorPreferences?: string[];
  budgetRange?: string;
  occasion?: string;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  ageRange?: string;
  skinTone?: string;
}

export interface OutfitItem {
  slot: 'top' | 'bottom' | 'outer' | 'shoes' | 'bag' | 'accessory' | 'dress';
  name: string;
  category: string;
  color: string;
  secondaryColor?: string;
  styleTags: string[];
  fitType: 'slim' | 'regular' | 'loose' | 'oversized';
  material: string;
  priceRange: string;
  reason: string;
}

export interface OutfitRecommendation {
  occasion: string;
  season: string;
  styleTags: string[];
  items: OutfitItem[];
  overallReason: string;
  colorScheme: string;
  bodyTypeTip: string;
  alternativeTip?: string;
}

export const OUTFIT_PROMPT_TEMPLATE_ZH = `请根据以下用户画像生成一套完整的搭配方案。

## 用户画像
- 性别：{{gender}}
- 体型：{{bodyType}}
- 身高：{{height}}cm
- 体重：{{weight}}kg
- 肤色季型：{{colorSeason}}
- 风格偏好：{{stylePreferences}}
- 颜色偏好：{{colorPreferences}}
- 预算范围：{{budgetRange}}
- 穿着场合：{{occasion}}
- 当前季节：{{season}}
- 年龄段：{{ageRange}}

## 搭配要求
1. 生成5-6件单品的完整搭配方案（上装/下装/鞋子/包包/配饰/外套，根据场合选择）
2. 每件单品必须包含：名称、类别、颜色、风格标签、版型、面料、价格区间、适配理由
3. 必须考虑以下因素：
   - **体型修饰**：根据{{bodyType}}体型选择能扬长避短的版型和剪裁
   - **色彩协调**：整体色彩方案和谐统一，符合{{colorSeason}}色彩季型
   - **场合适配**：符合{{occasion}}场合的着装规范和社交期待
   - **预算控制**：所有单品总价在{{budgetRange}}范围内
4. 提供整体搭配思路说明、色彩方案说明、体型修饰要点
5. 可选提供平替建议（更经济的替代方案）

## 体型修饰参考
- 沙漏型(hourglass)：突出腰线，选择收腰款式，避免oversized遮盖曲线
- 梨型(pear)：上半身增加视觉焦点，A字下装修饰臀腿，浅色上装+深色下装
- 苹果型(apple)：V领/开领上装拉长颈部线条，高腰下装提升腰线，避免腰部紧身
- 直筒型(straight)：用层次感和腰带创造曲线，选择有体积感的单品
- 倒三角型(inverted_triangle)：下半身增加视觉分量，宽腿裤/A字裙平衡比例

## 色彩季型参考
- 春季型：适合明亮温暖色调（珊瑚色、鹅黄、薄荷绿）
- 夏季型：适合柔和冷色调（淡粉、水蓝、薰衣草紫）
- 秋季型：适合浓郁暖色调（驼色、砖红、橄榄绿）
- 冬季型：适合鲜明冷色调（正红、宝蓝、纯黑纯白对比）

## 输出格式
请严格按照以下JSON格式输出搭配方案：

\`\`\`outfit
{
  "occasion": "{{occasion}}",
  "season": "{{season}}",
  "styleTags": ["风格1", "风格2"],
  "items": [
    {
      "slot": "top|bottom|outer|shoes|bag|accessory|dress",
      "name": "具体单品名称",
      "category": "分类",
      "color": "主色",
      "secondaryColor": "辅色",
      "styleTags": ["风格标签"],
      "fitType": "slim|regular|loose|oversized",
      "material": "面料",
      "priceRange": "价格区间",
      "reason": "为什么选这件——体型修饰/色彩搭配/场合适配的具体理由"
    }
  ],
  "overallReason": "整体搭配思路：为什么这些单品组合在一起是和谐的",
  "colorScheme": "色彩方案：主色+辅色+点缀色的搭配逻辑",
  "bodyTypeTip": "体型修饰要点：这套搭配如何扬长避短",
  "alternativeTip": "平替建议：更经济的替代方案(可选)"
}
\`\`\`

请确保搭配方案既时尚又实用，让用户感到"这就是我想要的"！`;

export const OUTFIT_PROMPT_TEMPLATE_EN = `Please generate a complete outfit plan based on the following user profile.

## User Profile
- Gender: {{gender}}
- Body Type: {{bodyType}}
- Height: {{height}}cm
- Weight: {{weight}}kg
- Color Season: {{colorSeason}}
- Style Preferences: {{stylePreferences}}
- Color Preferences: {{colorPreferences}}
- Budget Range: {{budgetRange}}
- Occasion: {{occasion}}
- Current Season: {{season}}
- Age Range: {{ageRange}}

## Outfit Requirements
1. Generate 5-6 items for a complete outfit (top/bottom/shoes/bag/accessory/outer, select based on occasion)
2. Each item must include: name, category, color, style tags, fit type, material, price range, and reason
3. Must consider the following factors:
   - **Body Type Flattering**: Choose silhouettes and cuts that enhance strengths and minimize concerns for {{bodyType}} body type
   - **Color Coordination**: Overall color scheme should be harmonious and match {{colorSeason}} color season
   - **Occasion Matching**: Meet the dress code and social expectations for {{occasion}}
   - **Budget Control**: Total cost of all items within {{budgetRange}} range
4. Provide overall outfit concept, color scheme explanation, and body type flattering tips
5. Optionally provide budget alternative suggestions

## Body Type Flattering Reference
- Hourglass: Emphasize waistline, choose fitted styles, avoid oversized pieces that hide curves
- Pear: Add visual interest to upper body, A-line bottoms flatter hips/thighs, light top + dark bottom
- Apple: V-neck/open collar tops elongate neckline, high-waist bottoms raise waistline, avoid tight waist
- Straight: Create curves with layering and belts, choose pieces with volume
- Inverted Triangle: Add visual weight to lower body, wide-leg pants/A-line skirts balance proportions

## Color Season Reference
- Spring: Bright warm tones (coral, pale yellow, mint green)
- Summer: Soft cool tones (pale pink, aqua blue, lavender)
- Autumn: Rich warm tones (camel, brick red, olive green)
- Winter: Bold cool tones (true red, royal blue, stark black-white contrast)

## Output Format
Please output the outfit plan in the following strict JSON format:

\`\`\`outfit
{
  "occasion": "{{occasion}}",
  "season": "{{season}}",
  "styleTags": ["style1", "style2"],
  "items": [
    {
      "slot": "top|bottom|outer|shoes|bag|accessory|dress",
      "name": "specific item name",
      "category": "category",
      "color": "primary color",
      "secondaryColor": "secondary color",
      "styleTags": ["style tags"],
      "fitType": "slim|regular|loose|oversized",
      "material": "fabric",
      "priceRange": "price range",
      "reason": "why this item — body type flattering / color coordination / occasion matching specifics"
    }
  ],
  "overallReason": "Overall outfit concept: why these pieces work together harmoniously",
  "colorScheme": "Color scheme: primary + secondary + accent color coordination logic",
  "bodyTypeTip": "Body type flattering tips: how this outfit enhances strengths",
  "alternativeTip": "Budget alternative: more affordable options (optional)"
}
\`\`\`

Make sure the outfit is both fashionable and practical — the user should feel "this is exactly what I wanted"!`;

export function buildOutfitPrompt(profile: UserProfile, language: 'zh' | 'en' = 'zh'): string {
  const template = language === 'en' ? OUTFIT_PROMPT_TEMPLATE_EN : OUTFIT_PROMPT_TEMPLATE_ZH;

  const bodyTypeLabels: Record<string, string> = {
    hourglass: language === 'zh' ? '沙漏型' : 'Hourglass',
    pear: language === 'zh' ? '梨型' : 'Pear',
    apple: language === 'zh' ? '苹果型' : 'Apple',
    straight: language === 'zh' ? '直筒型' : 'Straight',
    inverted_triangle: language === 'zh' ? '倒三角型' : 'Inverted Triangle',
  };

  const genderLabels: Record<string, string> = {
    male: language === 'zh' ? '男' : 'Male',
    female: language === 'zh' ? '女' : 'Female',
    other: language === 'zh' ? '其他' : 'Other',
  };

  const replacements: Record<string, string> = {
    gender: genderLabels[profile.gender ?? 'female'] ?? (language === 'zh' ? '女' : 'Female'),
    bodyType: bodyTypeLabels[profile.bodyType ?? 'straight'] ?? (language === 'zh' ? '直筒型' : 'Straight'),
    height: String(profile.height ?? 165),
    weight: String(profile.weight ?? 55),
    colorSeason: profile.colorSeason ?? (language === 'zh' ? '未确定' : 'Undetermined'),
    stylePreferences: profile.stylePreferences?.join('、') ?? (language === 'zh' ? '简约' : 'Minimalist'),
    colorPreferences: profile.colorPreferences?.join('、') ?? (language === 'zh' ? '不限' : 'No preference'),
    budgetRange: profile.budgetRange ?? (language === 'zh' ? '500-1500' : '500-1500 CNY'),
    occasion: profile.occasion ?? (language === 'zh' ? '日常通勤' : 'Daily Commute'),
    season: profile.season ?? 'spring',
    ageRange: profile.ageRange ?? (language === 'zh' ? '25-35' : '25-35'),
  };

  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  return result;
}

export const OUTFIT_PROMPT_EXAMPLES = [
  {
    scenario: '梨型身材女性通勤搭配',
    profile: {
      gender: 'female' as const,
      bodyType: 'pear' as const,
      height: 160,
      weight: 55,
      colorSeason: '秋季暖调',
      stylePreferences: ['简约', '韩系'],
      colorPreferences: ['驼色', '米白', '深蓝'],
      budgetRange: '500-1500',
      occasion: '日常通勤',
      season: 'autumn' as const,
      ageRange: '25-30',
    },
    description: '梨型身材+秋季暖调+通勤场景，浅色上装+深色A字下装策略',
  },
  {
    scenario: '苹果型身材约会搭配',
    profile: {
      gender: 'female' as const,
      bodyType: 'apple' as const,
      height: 165,
      weight: 62,
      colorSeason: '春季淡暖',
      stylePreferences: ['甜美', '法式'],
      colorPreferences: ['粉色', '白色', '浅蓝'],
      budgetRange: '800-2000',
      occasion: '约会',
      season: 'spring' as const,
      ageRange: '22-28',
    },
    description: '苹果型+春季淡暖+约会场景，V领上装+高腰下装修饰策略',
  },
  {
    scenario: '倒三角型男性商务搭配',
    profile: {
      gender: 'male' as const,
      bodyType: 'inverted_triangle' as const,
      height: 178,
      weight: 75,
      colorSeason: '冬季冷调',
      stylePreferences: ['商务', '简约'],
      colorPreferences: ['深蓝', '灰色', '白色'],
      budgetRange: '1000-3000',
      occasion: '商务会议',
      season: 'winter' as const,
      ageRange: '30-40',
    },
    description: '倒三角型+冬季冷调+商务场景，深色系+合身剪裁策略',
  },
];
