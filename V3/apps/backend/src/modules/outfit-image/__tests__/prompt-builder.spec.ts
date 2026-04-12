import { buildOutfitPrompt } from '../prompt-builder';
import type { OutfitItemDto } from '../dto/generate-outfit-image.dto';

function makeItem(overrides: Partial<OutfitItemDto> = {}): OutfitItemDto {
  return {
    name: 'V领毛衣',
    color: '红色',
    category: 'top',
    ...overrides,
  };
}

describe('buildOutfitPrompt', () => {
  const baseItems: OutfitItemDto[] = [
    makeItem({ name: 'V领毛衣', color: '红色', category: 'top' }),
    makeItem({ name: '直筒牛仔裤', color: '深蓝', category: 'bottom' }),
  ];

  it('should build a prompt with basic items and occasion', () => {
    const result = buildOutfitPrompt(baseItems, 'work');

    expect(result).toContain('年轻亚洲女性');
    expect(result).toContain('红色V领毛衣');
    expect(result).toContain('上装');
    expect(result).toContain('深蓝直筒牛仔裤');
    expect(result).toContain('下装');
    expect(result).toContain('现代办公室走廊');
    expect(result).toContain('时尚杂志质感');
    expect(result).toContain('全身照');
    expect(result).toContain('4K');
  });

  it('should default to female gender when gender is omitted', () => {
    const result = buildOutfitPrompt(baseItems, 'work');

    expect(result).toContain('年轻亚洲女性');
  });

  it('should use male body description when gender is male', () => {
    const result = buildOutfitPrompt(baseItems, 'work', undefined, 'male');

    expect(result).toContain('年轻亚洲男性');
    expect(result).not.toContain('年轻亚洲女性');
  });

  it('should use neutral body description when gender is other', () => {
    const result = buildOutfitPrompt(baseItems, 'work', undefined, 'other');

    expect(result).toContain('一位时尚的年轻人');
    expect(result).not.toContain('男性');
    expect(result).not.toContain('女性');
  });

  it('should fall back to female for unknown gender values', () => {
    const result = buildOutfitPrompt(baseItems, 'work', undefined, 'alien');

    expect(result).toContain('年轻亚洲女性');
  });

  it('should include style tips when provided', () => {
    const result = buildOutfitPrompt(baseItems, 'work', '简约优雅');

    expect(result).toContain('简约优雅');
    expect(result).toContain('风格');
  });

  it('should not include style section when styleTips is undefined', () => {
    const result = buildOutfitPrompt(baseItems, 'work');

    // The style part is "，${styleTips}风格" so without styleTips there is no extra style clause
    expect(result).not.toMatch(/风格场景/);
  });

  it('should map all known occasions to their Chinese scenes', () => {
    const occasionMap: Record<string, string> = {
      work: '现代办公室走廊',
      date: '浪漫的咖啡厅露台',
      sport: '户外运动场',
      casual: '阳光明媚的街头',
      party: '时尚派对现场',
      campus: '大学校园林荫道',
    };

    for (const [occasion, expectedScene] of Object.entries(occasionMap)) {
      const result = buildOutfitPrompt([makeItem()], occasion);
      expect(result).toContain(expectedScene);
    }
  });

  it('should map all known Chinese occasions to their scenes', () => {
    const chineseOccasionMap: Record<string, string> = {
      '简约通勤': '现代办公室走廊',
      '休闲': '阳光明媚的街头',
      '约会': '浪漫的咖啡厅露台',
      '运动': '户外运动场',
      '聚会': '时尚派对现场',
      '校园': '大学校园林荫道',
    };

    for (const [occasion, expectedScene] of Object.entries(chineseOccasionMap)) {
      const result = buildOutfitPrompt([makeItem()], occasion);
      expect(result).toContain(expectedScene);
    }
  });

  it('should use the raw occasion string as scene when occasion is not in the map', () => {
    const result = buildOutfitPrompt([makeItem()], 'beach vacation');

    expect(result).toContain('beach vacation');
  });

  it('should describe each item with its category label', () => {
    const categories: Array<{ category: string; expected: string }> = [
      { category: 'top', expected: '上装' },
      { category: 'bottom', expected: '下装' },
      { category: 'outer', expected: '外套' },
      { category: 'shoes', expected: '鞋子' },
      { category: 'accessory', expected: '配饰' },
      { category: 'dress', expected: '连衣裙' },
    ];

    for (const { category, expected } of categories) {
      const result = buildOutfitPrompt(
        [makeItem({ name: '测试', color: '白色', category: category as OutfitItemDto['category'] })],
        'work',
      );
      expect(result).toContain(expected);
    }
  });

  it('should use raw category string when category is not in the map', () => {
    const result = buildOutfitPrompt(
      [makeItem({ name: '帽子', color: '黑色', category: 'hat' as OutfitItemDto['category'] })],
      'work',
    );

    expect(result).toContain('hat');
  });

  it('should join multiple items with the correct delimiter', () => {
    const threeItems: OutfitItemDto[] = [
      makeItem({ name: 'V领毛衣', color: '红色', category: 'top' }),
      makeItem({ name: '直筒裤', color: '深蓝', category: 'bottom' }),
      makeItem({ name: '运动鞋', color: '白色', category: 'shoes' }),
    ];

    const result = buildOutfitPrompt(threeItems, 'casual');

    // Items are joined with "，搭配"
    expect(result).toContain('红色V领毛衣');
    expect(result).toContain('深蓝直筒裤');
    expect(result).toContain('白色运动鞋');
    expect(result).toContain('搭配');
  });

  it('should work with a single item', () => {
    const result = buildOutfitPrompt(
      [makeItem({ name: '连衣裙', color: '黑色', category: 'dress' })],
      'date',
      '优雅气质',
      'female',
    );

    expect(result).toContain('黑色连衣裙');
    expect(result).toContain('连衣裙');
    expect(result).toContain('优雅气质');
    expect(result).toContain('浪漫的咖啡厅露台');
  });

  it('should combine all parts into the expected prompt format', () => {
    const result = buildOutfitPrompt(baseItems, '简约通勤', '简约优雅', 'female');

    // Format: ${personDesc}，穿着${clothingDesc}，${sceneDesc}${stylePart}场景，自然光，时尚杂志质感，全身照，4K
    expect(result).toMatch(/^一位时尚的年轻亚洲女性，身材纤细，穿着.*场景，自然光，时尚杂志质感，全身照，4K$/);
  });
});
