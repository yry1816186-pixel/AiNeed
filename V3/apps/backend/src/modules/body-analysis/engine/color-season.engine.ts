type ColorSeason = 'spring' | 'summer' | 'autumn' | 'winter';

type SkinTone = 'fair' | 'light' | 'medium' | 'olive' | 'tan' | 'dark';
type HairColor = 'black' | 'dark_brown' | 'brown' | 'light_brown' | 'blonde' | 'red' | 'gray' | 'white';
type EyeColor = 'black' | 'dark_brown' | 'brown' | 'hazel' | 'green' | 'blue' | 'gray';

interface ColorSeasonInput {
  skinTone: SkinTone;
  hairColor: HairColor;
  eyeColor: EyeColor;
}

interface ColorSeasonResult {
  season: ColorSeason;
  label: string;
  suitableColors: string[];
  avoidColors: string[];
  description: string;
}

const SEASON_DATA: Record<ColorSeason, Omit<ColorSeasonResult, 'season'>> = {
  spring: {
    label: '春季型',
    suitableColors: ['珊瑚色', '桃红', '鹅黄', '浅绿', '杏色', '奶油白', '暖粉', '金棕色'],
    avoidColors: ['纯黑', '深紫', '冰蓝', '冷灰', '藏青'],
    description: '春季型人肤色偏暖，适合明亮温暖的颜色。整体给人清新、温暖、活泼的感觉，像春天绽放的花朵。',
  },
  summer: {
    label: '夏季型',
    suitableColors: ['淡粉', '薰衣草紫', '雾蓝', '玫瑰粉', '浅灰', '薄荷绿', '藕粉', '银灰色'],
    avoidColors: ['橘色', '金黄', '砖红', '草绿', '深棕'],
    description: '夏季型人肤色偏冷且柔和，适合低饱和度的冷色调。整体给人温柔、优雅、恬静的感觉，如夏日微风。',
  },
  autumn: {
    label: '秋季型',
    suitableColors: ['焦糖色', '砖红', '墨绿', '驼色', '暖棕', '芥末黄', '酒红', '米色'],
    avoidColors: ['亮粉', '冰蓝', '荧光色', '纯白', '冷紫'],
    description: '秋季型人肤色偏暖且较深，适合浓郁温暖的大地色系。整体给人沉稳、大气、华贵的感觉，如秋日暖阳。',
  },
  winter: {
    label: '冬季型',
    suitableColors: ['纯白', '正红', '宝蓝', '黑色', '深紫', '银色', '翠绿', '冰粉'],
    avoidColors: ['鹅黄', '浅橙', '卡其', '暖棕', '芥末黄'],
    description: '冬季型人肤色偏冷且对比度高，适合高饱和度的冷色调。整体给人干练、鲜明、高级的感觉，如冬日白雪。',
  },
};

const WARM_SKIN: SkinTone[] = ['fair', 'light', 'olive'];
const COOL_SKIN: SkinTone[] = ['medium', 'tan', 'dark'];

const WARM_HAIR: HairColor[] = ['brown', 'light_brown', 'blonde', 'red'];
const COOL_HAIR: HairColor[] = ['black', 'dark_brown', 'gray', 'white'];

const WARM_EYES: EyeColor[] = ['brown', 'hazel'];
const COOL_EYES: EyeColor[] = ['black', 'dark_brown', 'green', 'blue', 'gray'];

function scoreSeason(input: ColorSeasonInput): Record<ColorSeason, number> {
  const scores: Record<ColorSeason, number> = { spring: 0, summer: 0, autumn: 0, winter: 0 };

  const isWarmSkin = WARM_SKIN.includes(input.skinTone);
  const isCoolSkin = COOL_SKIN.includes(input.skinTone);
  const isWarmHair = WARM_HAIR.includes(input.hairColor);
  const isCoolHair = COOL_HAIR.includes(input.hairColor);
  const isWarmEyes = WARM_EYES.includes(input.eyeColor);
  const isCoolEyes = COOL_EYES.includes(input.eyeColor);

  if (isWarmSkin) {
    scores.spring += 2;
    scores.autumn += 2;
  }
  if (isCoolSkin) {
    scores.summer += 2;
    scores.winter += 2;
  }

  if (isWarmHair) {
    scores.spring += 1.5;
    scores.autumn += 1.5;
  }
  if (isCoolHair) {
    scores.summer += 1.5;
    scores.winter += 1.5;
  }

  if (isWarmEyes) {
    scores.spring += 1;
    scores.autumn += 1;
  }
  if (isCoolEyes) {
    scores.summer += 1;
    scores.winter += 1;
  }

  const isLightSkin = input.skinTone === 'fair' || input.skinTone === 'light';
  const isLightHair = input.hairColor === 'blonde' || input.hairColor === 'light_brown';
  const isLightEyes = input.eyeColor === 'blue' || input.eyeColor === 'green' || input.eyeColor === 'gray';

  const isDeepSkin = input.skinTone === 'dark' || input.skinTone === 'tan';
  const isDeepHair = input.hairColor === 'black' || input.hairColor === 'dark_brown';
  const isDeepEyes = input.eyeColor === 'black' || input.eyeColor === 'dark_brown';

  if (isLightSkin) { scores.spring += 1; scores.summer += 1; }
  if (isDeepSkin) { scores.autumn += 1; scores.winter += 1; }
  if (isLightHair) { scores.spring += 0.5; scores.summer += 0.5; }
  if (isDeepHair) { scores.autumn += 0.5; scores.winter += 0.5; }
  if (isLightEyes) { scores.spring += 0.5; scores.summer += 0.5; }
  if (isDeepEyes) { scores.autumn += 0.5; scores.winter += 0.5; }

  return scores;
}

export function analyzeColorSeason(input: ColorSeasonInput): ColorSeasonResult {
  const scores = scoreSeason(input);

  let bestSeason: ColorSeason = 'spring';
  let bestScore = -1;

  for (const [season, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestSeason = season as ColorSeason;
    }
  }

  const data = SEASON_DATA[bestSeason];
  return { season: bestSeason, ...data };
}

export { SEASON_DATA, type ColorSeason, type ColorSeasonInput, type SkinTone, type HairColor, type EyeColor };
