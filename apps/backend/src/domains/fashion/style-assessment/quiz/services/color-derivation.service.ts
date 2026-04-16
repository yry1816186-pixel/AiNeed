/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";

export interface ColorTag {
  hex: string;
  category: string;
  weight: number;
}

export interface ColorPaletteEntry {
  hex: string;
  name: string;
  category: string;
  weight: number;
}

export interface ColorPreferenceResult {
  colorPalette: ColorPaletteEntry[];
}

/**
 * Color-to-Chinese name mapping for common colors.
 * Used by ColorDerivationEngine to provide human-readable color names.
 */
const COLOR_NAME_MAP: Record<string, string> = {
  "#2D2D2D": "炭灰",
  "#F5F5DC": "米色",
  "#8B4513": "棕色",
  "#A0522D": "赭色",
  "#D2691E": "巧克力棕",
  "#CD853F": "秘鲁色",
  "#DEB887": "原木色",
  "#F5DEB3": "小麦色",
  "#FAEBD7": "古白",
  "#FFFAF0": "花白",
  "#FFFFFF": "纯白",
  "#000000": "纯黑",
  "#808080": "灰色",
  "#C0C0C0": "银色",
  "#FF0000": "红色",
  "#DC143C": "深红",
  "#B22222": "耐火砖红",
  "#FF4500": "橙红",
  "#FF6347": "番茄红",
  "#FF7F50": "珊瑚色",
  "#FFA07A": "浅鲑鱼色",
  "#E9967A": "深鲑鱼色",
  "#FA8072": "鲑鱼色",
  "#FFD700": "金色",
  "#FFFF00": "黄色",
  "#BDB76B": "暗卡其",
  "#F0E68C": "卡其色",
  "#EEE8AA": "浅黄",
  "#9ACD32": "黄绿色",
  "#7CFC00": "草绿色",
  "#00FF00": "绿色",
  "#32CD32": "酸橙绿",
  "#228B22": "森林绿",
  "#006400": "深绿",
  "#2E8B57": "海绿",
  "#3CB371": "中海绿",
  "#008B8B": "深青",
  "#00CED1": "暗松石",
  "#40E0D0": "松石绿",
  "#48D1CC": "中松石绿",
  "#7FFFD4": "碧绿",
  "#66CDAA": "中碧绿",
  "#5F9EA0": "军服蓝",
  "#4682B4": "钢蓝",
  "#00BFFF": "深天蓝",
  "#1E90FF": "道奇蓝",
  "#4169E1": "皇家蓝",
  "#0000FF": "蓝色",
  "#0000CD": "中蓝",
  "#00008B": "深蓝",
  "#191970": "午夜蓝",
  "#6A5ACD": "板岩蓝",
  "#7B68EE": "中板岩蓝",
  "#8A2BE2": "蓝紫",
  "#9370DB": "中紫色",
  "#BA55D3": "兰花紫",
  "#9932CC": "暗兰花紫",
  "#800080": "紫色",
  "#4B0082": "靛青",
  "#FF1493": "深粉",
  "#FF69B4": "热粉红",
  "#FFB6C1": "浅粉",
  "#FFC0CB": "粉色",
  "#FFE4E1": "薄雾玫瑰",
  "#E6E6FA": "薰衣草",
  "#D8BFD8": "蓟色",
  "#DDA0DD": "梅色",
  "#EE82EE": "紫罗兰",
  "#F08080": "浅珊瑚",
  "#CD5C5C": "印度红",
  "#BC8F8F": "玫瑰棕",
  "#F4A460": "沙棕色",
  "#DAA520": "金麒麟",
  "#B8860B": "暗金麒麟",
  "#6B8E23": "橄榄褐",
  "#556B2F": "暗橄榄绿",
  "#8FBC8F": "暗海绿",
  "#20B2AA": "浅海绿",
  "#008080": "凫绿",
  "#B0E0E6": "粉蓝",
  "#ADD8E6": "浅蓝",
  "#87CEEB": "天蓝",
  "#87CEFA": "浅天蓝",
  "#F0F8FF": "爱丽丝蓝",
};

/**
 * ColorDerivationEngine derives implicit color preferences from quiz choices.
 * Aggregates color tags from selected quiz options, sums weights per hex code,
 * sorts by total weight, and maps hex codes to Chinese color names.
 * Result is deterministic: same input always produces same output.
 */
@Injectable()
export class ColorDerivationEngine {
  deriveColorPreferences(
    selectedOptions: Array<{ colorTags: Array<{ hex: string; category: string; weight: number }> }>,
  ): ColorPreferenceResult {
    // Aggregate weights per hex code, track highest-weight category
    const hexData: Map<string, { totalWeight: number; category: string; maxWeight: number }> = new Map();

    for (const option of selectedOptions) {
      for (const tag of option.colorTags) {
        const normalizedHex = this.normalizeHex(tag.hex);
        const existing = hexData.get(normalizedHex);

        if (existing) {
          existing.totalWeight += tag.weight;
          // Keep the category with the highest individual weight
          if (tag.weight > existing.maxWeight) {
            existing.category = tag.category;
            existing.maxWeight = tag.weight;
          }
        } else {
          hexData.set(normalizedHex, {
            totalWeight: tag.weight,
            category: tag.category,
            maxWeight: tag.weight,
          });
        }
      }
    }

    // Sort by total weight descending
    const sorted = [...hexData.entries()]
      .sort((a, b) => b[1].totalWeight - a[1].totalWeight)
      .slice(0, 8); // Top 8

    const colorPalette: ColorPaletteEntry[] = sorted.map(([hex, data]) => ({
      hex,
      name: this.getColorName(hex),
      category: data.category,
      weight: Math.round(data.totalWeight * 100) / 100,
    }));

    return { colorPalette };
  }

  private normalizeHex(hex: string): string {
    const cleaned = hex.replace("#", "").toUpperCase();
    return `#${cleaned}`;
  }

  private getColorName(hex: string): string {
    const normalized = this.normalizeHex(hex);
    return COLOR_NAME_MAP[normalized] ?? this.generateFallbackName(normalized);
  }

  private generateFallbackName(hex: string): string {
    // Generate a descriptive name from hex code for unmapped colors
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const brightness = (r + g + b) / 3;
    if (brightness < 50) {return "深色";}
    if (brightness > 200) {return "浅色";}

    // Determine dominant channel
    const max = Math.max(r, g, b);
    if (max === r && r > g + 30) {return "暖色调";}
    if (max === b && b > r + 30) {return "冷色调";}
    if (max === g && g > r + 30) {return "绿色调";}
    return "中性色";
  }
}
