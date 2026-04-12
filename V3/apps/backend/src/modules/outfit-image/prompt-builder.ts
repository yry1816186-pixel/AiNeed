import type { OutfitItemDto } from './dto/generate-outfit-image.dto';

const OCCASION_SCENE_MAP: Record<string, string> = {
  work: '现代办公室走廊',
  date: '浪漫的咖啡厅露台',
  sport: '户外运动场',
  casual: '阳光明媚的街头',
  party: '时尚派对现场',
  campus: '大学校园林荫道',
  简约通勤: '现代办公室走廊',
  休闲: '阳光明媚的街头',
  约会: '浪漫的咖啡厅露台',
  运动: '户外运动场',
  聚会: '时尚派对现场',
  校园: '大学校园林荫道',
};

const CATEGORY_DESCRIPTION_MAP: Record<string, string> = {
  top: '上装',
  bottom: '下装',
  outer: '外套',
  shoes: '鞋子',
  accessory: '配饰',
  dress: '连衣裙',
};

const GENDER_BODY_MAP: Record<string, string> = {
  male: '一位时尚的年轻亚洲男性，身材挺拔',
  female: '一位时尚的年轻亚洲女性，身材纤细',
  other: '一位时尚的年轻人',
};

function describeItem(item: OutfitItemDto): string {
  const categoryLabel = CATEGORY_DESCRIPTION_MAP[item.category] ?? item.category;
  return `[${item.color}${item.name}]作为${categoryLabel}`;
}

export function buildOutfitPrompt(
  items: OutfitItemDto[],
  occasion: string,
  styleTips?: string,
  gender?: string,
): string {
  const personDesc = GENDER_BODY_MAP[gender ?? 'female'] ?? GENDER_BODY_MAP.female;

  const clothingDesc = items.map(describeItem).join('，搭配');

  const sceneDesc = OCCASION_SCENE_MAP[occasion] ?? occasion;

  const stylePart = styleTips ? `，${styleTips}风格` : '';

  const prompt = `${personDesc}，穿着${clothingDesc}，${sceneDesc}${stylePart}场景，自然光，时尚杂志质感，全身照，4K`;

  return prompt;
}
