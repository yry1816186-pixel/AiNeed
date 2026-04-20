import { compute_ita, compute_chroma, LabColor } from "./cielab";

export enum TwelveSeason {
  SPRING_WARM_LIGHT_CLEAR = "spring_warm_light_clear",
  SPRING_WARM_LIGHT_MUTED = "spring_warm_light_muted",
  SPRING_WARM_DEEP_CLEAR = "spring_warm_deep_clear",
  SUMMER_COOL_LIGHT_MUTED = "summer_cool_light_muted",
  SUMMER_COOL_LIGHT_CLEAR = "summer_cool_light_clear",
  SUMMER_COOL_DEEP_MUTED = "summer_cool_deep_muted",
  AUTUMN_WARM_DEEP_MUTED = "autumn_warm_deep_muted",
  AUTUMN_WARM_DEEP_CLEAR = "autumn_warm_deep_clear",
  AUTUMN_WARM_LIGHT_MUTED = "autumn_warm_light_muted",
  WINTER_COOL_DEEP_CLEAR = "winter_cool_deep_clear",
  WINTER_COOL_LIGHT_CLEAR = "winter_cool_light_clear",
  WINTER_COOL_DEEP_MUTED = "winter_cool_deep_muted",
}

export enum ToneType {
  WARM = "warm",
  COOL = "cool",
  NEUTRAL = "neutral",
}

export enum DepthType {
  LIGHT = "light",
  DEEP = "deep",
}

export enum ChromaType {
  CLEAR = "clear",
  MUTED = "muted",
}

export interface SeasonColorSwatch {
  name: string;
  hex: string;
  reason: string;
}

export interface SeasonPalette {
  suitable: SeasonColorSwatch[];
  unsuitable: SeasonColorSwatch[];
}

export const SEASON_LABELS: Record<TwelveSeason, string> = {
  [TwelveSeason.SPRING_WARM_LIGHT_CLEAR]: "暖春型",
  [TwelveSeason.SPRING_WARM_LIGHT_MUTED]: "柔春型",
  [TwelveSeason.SPRING_WARM_DEEP_CLEAR]: "深春型",
  [TwelveSeason.SUMMER_COOL_LIGHT_MUTED]: "凉夏型",
  [TwelveSeason.SUMMER_COOL_LIGHT_CLEAR]: "浅夏型",
  [TwelveSeason.SUMMER_COOL_DEEP_MUTED]: "柔夏型",
  [TwelveSeason.AUTUMN_WARM_DEEP_MUTED]: "暖秋型",
  [TwelveSeason.AUTUMN_WARM_DEEP_CLEAR]: "深秋型",
  [TwelveSeason.AUTUMN_WARM_LIGHT_MUTED]: "柔秋型",
  [TwelveSeason.WINTER_COOL_DEEP_CLEAR]: "冷冬型",
  [TwelveSeason.WINTER_COOL_LIGHT_CLEAR]: "浅冬型",
  [TwelveSeason.WINTER_COOL_DEEP_MUTED]: "深冬型",
};

export const PARENT_SEASON: Record<TwelveSeason, string> = {
  [TwelveSeason.SPRING_WARM_LIGHT_CLEAR]: "spring",
  [TwelveSeason.SPRING_WARM_LIGHT_MUTED]: "spring",
  [TwelveSeason.SPRING_WARM_DEEP_CLEAR]: "spring",
  [TwelveSeason.SUMMER_COOL_LIGHT_MUTED]: "summer",
  [TwelveSeason.SUMMER_COOL_LIGHT_CLEAR]: "summer",
  [TwelveSeason.SUMMER_COOL_DEEP_MUTED]: "summer",
  [TwelveSeason.AUTUMN_WARM_DEEP_MUTED]: "autumn",
  [TwelveSeason.AUTUMN_WARM_DEEP_CLEAR]: "autumn",
  [TwelveSeason.AUTUMN_WARM_LIGHT_MUTED]: "autumn",
  [TwelveSeason.WINTER_COOL_DEEP_CLEAR]: "winter",
  [TwelveSeason.WINTER_COOL_LIGHT_CLEAR]: "winter",
  [TwelveSeason.WINTER_COOL_DEEP_MUTED]: "winter",
};

export const SEASON_PALETTES: Record<TwelveSeason, SeasonPalette> = {
  [TwelveSeason.SPRING_WARM_LIGHT_CLEAR]: {
    suitable: [
      { name: "珊瑚粉", hex: "#FF7F7F", reason: "暖浅清基调，与暖春型肤色自然融合" },
      { name: "鹅黄", hex: "#FFF44F", reason: "明亮暖黄，提升暖春型气色" },
      { name: "嫩绿", hex: "#99DC5B", reason: "清新暖绿，呼应暖春型的生机感" },
      { name: "桃红", hex: "#FF8C94", reason: "柔和暖粉，衬托暖春型的好气色" },
      { name: "天蓝", hex: "#87CEEB", reason: "浅暖蓝，为暖春型增添清爽感" },
      { name: "杏色", hex: "#FBCEB1", reason: "暖调裸色，与暖春型肤色和谐统一" },
      { name: "薄荷绿", hex: "#98FB98", reason: "清浅暖绿，让暖春型更显活力" },
      { name: "奶油白", hex: "#FFFDD0", reason: "暖调白色，比纯白更适合暖春型" },
    ],
    unsuitable: [
      { name: "酒红", hex: "#722F37", reason: "过深过冷，压暗暖春型肤色" },
      { name: "藏青", hex: "#273475", reason: "冷深色调，与暖春型暖浅基调冲突" },
      { name: "深紫", hex: "#4B0082", reason: "冷深色，让暖春型显得暗沉" },
      { name: "炭灰", hex: "#3C3C3C", reason: "深灰冷调，削弱暖春型的明快感" },
    ],
  },
  [TwelveSeason.SPRING_WARM_LIGHT_MUTED]: {
    suitable: [
      { name: "柔桃粉", hex: "#FFB6A3", reason: "柔暖粉，与柔春型低饱和度气质匹配" },
      { name: "浅杏", hex: "#F5D5C8", reason: "柔和暖色，适合柔春型的温婉感" },
      { name: "暖米", hex: "#F5E6CC", reason: "低饱和暖色，柔春型的安全色" },
      { name: "柔绿", hex: "#B5D6A7", reason: "灰调暖绿，柔春型穿来清新自然" },
      { name: "浅驼", hex: "#E8D5B7", reason: "暖调中性色，柔春型百搭色" },
      { name: "淡黄", hex: "#FFEAA7", reason: "柔暖黄，提亮柔春型肤色" },
    ],
    unsuitable: [
      { name: "正红", hex: "#FF0000", reason: "高饱和冷色，压制柔春型的柔和气质" },
      { name: "藏青", hex: "#273475", reason: "冷深色调，与柔春型不协调" },
    ],
  },
  [TwelveSeason.SPRING_WARM_DEEP_CLEAR]: {
    suitable: [
      { name: "番茄红", hex: "#E63946", reason: "暖调鲜红，衬托深春型的热烈气质" },
      { name: "金棕", hex: "#C68E17", reason: "暖深棕，与深春型的丰富感匹配" },
      { name: "松石绿", hex: "#40B5A4", reason: "清亮暖绿，深春型的对比色" },
      { name: "蜜橘", hex: "#FF8C42", reason: "暖调橘色，深春型的活力色" },
      { name: "暖铜", hex: "#B87333", reason: "金属暖色，深春型穿来有质感" },
    ],
    unsuitable: [
      { name: "冰蓝", hex: "#99FFFF", reason: "冷浅色，让深春型显灰" },
      { name: "淡紫", hex: "#E6E6FA", reason: "冷柔色，与深春型暖深基调冲突" },
    ],
  },
  [TwelveSeason.SUMMER_COOL_LIGHT_MUTED]: {
    suitable: [
      { name: "薰衣草紫", hex: "#B57EDC", reason: "冷浅紫，与凉夏型肤色柔和搭配" },
      { name: "雾蓝", hex: "#7EC8E3", reason: "柔和冷蓝，衬托凉夏型的清雅" },
      { name: "玫瑰粉", hex: "#FF66CC", reason: "冷调粉红，提升凉夏型的柔美感" },
      { name: "薄荷蓝", hex: "#A5F2F3", reason: "清冷浅蓝，与凉夏型气质一致" },
      { name: "灰粉", hex: "#C3B1E1", reason: "低饱和冷粉，适合凉夏型的柔和感" },
      { name: "冰白", hex: "#F0F8FF", reason: "冷调白色，比暖白更适合凉夏型" },
    ],
    unsuitable: [
      { name: "橘红", hex: "#FF4500", reason: "暖高饱和色，与凉夏型冷浅基调冲突" },
      { name: "明黄", hex: "#FFD700", reason: "暖亮色，让凉夏型肤色显黄" },
    ],
  },
  [TwelveSeason.SUMMER_COOL_LIGHT_CLEAR]: {
    suitable: [
      { name: "冰粉", hex: "#FFD1DC", reason: "清冷粉，与浅夏型的轻盈感匹配" },
      { name: "浅蓝", hex: "#ADD8E6", reason: "清亮冷蓝，浅夏型的经典色" },
      { name: "薰衣草", hex: "#D4A5FF", reason: "冷调柔紫，衬托浅夏型的灵动感" },
      { name: "薄荷绿", hex: "#AAFFCC", reason: "清亮冷绿，浅夏型的活力色" },
    ],
    unsuitable: [
      { name: "砖红", hex: "#CB4335", reason: "暖深色，压制浅夏型的轻盈感" },
      { name: "草绿", hex: "#3EB370", reason: "暖调绿，与浅夏型冷感不协调" },
    ],
  },
  [TwelveSeason.SUMMER_COOL_DEEP_MUTED]: {
    suitable: [
      { name: "灰蓝", hex: "#6F8FAF", reason: "冷柔蓝，柔夏型的核心色" },
      { name: "灰紫", hex: "#8B7DA8", reason: "冷柔紫，柔夏型的气质色" },
      { name: "冷灰", hex: "#A0AEC0", reason: "冷中性灰，柔夏型的高级色" },
      { name: "雾粉", hex: "#D4A5A5", reason: "低饱和冷粉，柔夏型的温柔色" },
    ],
    unsuitable: [
      { name: "橘红", hex: "#FF4500", reason: "暖高饱和色，与柔夏型冲突" },
      { name: "嫩绿", hex: "#99DC5B", reason: "暖亮色，柔夏型穿来显脏" },
    ],
  },
  [TwelveSeason.AUTUMN_WARM_DEEP_MUTED]: {
    suitable: [
      { name: "焦糖棕", hex: "#C68E17", reason: "暖深棕，与暖秋型肤色浑然一体" },
      { name: "砖红", hex: "#CB4335", reason: "暖调深红，衬托暖秋型的醇厚感" },
      { name: "橄榄绿", hex: "#6B8E23", reason: "暖深绿，呼应暖秋型的沉稳气质" },
      { name: "驼色", hex: "#C19A6B", reason: "暖中性色，暖秋型的经典百搭色" },
      { name: "芥末黄", hex: "#FFDB58", reason: "暖深黄，与暖秋型肤色和谐呼应" },
    ],
    unsuitable: [
      { name: "荧光粉", hex: "#FF6FFF", reason: "冷高饱和色，与暖秋型暖深基调冲突" },
      { name: "冰蓝", hex: "#99FFFF", reason: "冷浅色，让暖秋型肤色显灰" },
    ],
  },
  [TwelveSeason.AUTUMN_WARM_DEEP_CLEAR]: {
    suitable: [
      { name: "铁锈红", hex: "#B7410E", reason: "暖深鲜红，深秋型的标志色" },
      { name: "深金", hex: "#D4A017", reason: "暖深金属色，深秋型的质感色" },
      { name: "森林绿", hex: "#228B22", reason: "暖深绿，深秋型的大地色" },
      { name: "深橘", hex: "#FF7518", reason: "暖深鲜橘，深秋型的活力色" },
      { name: "赤褐", hex: "#B5651D", reason: "暖深棕，深秋型的核心色" },
    ],
    unsuitable: [
      { name: "冰粉", hex: "#FFD1DC", reason: "冷浅柔色，与深秋型暖深基调冲突" },
      { name: "浅蓝", hex: "#ADD8E6", reason: "冷浅色，让深秋型显灰" },
    ],
  },
  [TwelveSeason.AUTUMN_WARM_LIGHT_MUTED]: {
    suitable: [
      { name: "暖米", hex: "#F5E6CC", reason: "柔暖浅色，柔秋型的安全色" },
      { name: "暖灰", hex: "#C4B09E", reason: "低饱和暖灰，柔秋型的高级色" },
      { name: "柔驼", hex: "#D4BC98", reason: "柔暖驼色，柔秋型的经典色" },
      { name: "浅橄榄", hex: "#A8B887", reason: "柔暖绿，柔秋型的自然色" },
    ],
    unsuitable: [
      { name: "正红", hex: "#FF0000", reason: "冷清高饱和，与柔秋型柔暖基调冲突" },
      { name: "宝蓝", hex: "#4169E1", reason: "冷清色，与柔秋型不协调" },
    ],
  },
  [TwelveSeason.WINTER_COOL_DEEP_CLEAR]: {
    suitable: [
      { name: "正红", hex: "#FF0000", reason: "冷深基调，正红让冷冬型气场全开" },
      { name: "藏青", hex: "#273475", reason: "冷深蓝，衬托冷冬型的冷艳气质" },
      { name: "纯白", hex: "#FFFFFF", reason: "冷调白色，冷冬型穿来干净利落" },
      { name: "宝蓝", hex: "#4169E1", reason: "冷深蓝，与冷冬型形成鲜明对比" },
      { name: "深紫", hex: "#4B0082", reason: "冷深紫，增强冷冬型的神秘感" },
    ],
    unsuitable: [
      { name: "鹅黄", hex: "#FFF44F", reason: "暖浅色，让冷冬型肤色显暗黄" },
      { name: "杏色", hex: "#FBCEB1", reason: "暖浅裸色，与冷冬型冷深基调冲突" },
    ],
  },
  [TwelveSeason.WINTER_COOL_LIGHT_CLEAR]: {
    suitable: [
      { name: "冰蓝", hex: "#99FFFF", reason: "冷清浅蓝，浅冬型的标志色" },
      { name: "冰粉", hex: "#FFD1DC", reason: "冷清粉，浅冬型的柔美色" },
      { name: "纯白", hex: "#FFFFFF", reason: "冷调白色，浅冬型的清爽色" },
      { name: "薄荷绿", hex: "#AAFFCC", reason: "冷清绿，浅冬型的活力色" },
    ],
    unsuitable: [
      { name: "焦糖棕", hex: "#C68E17", reason: "暖深色，压制浅冬型的轻盈感" },
      { name: "芥末黄", hex: "#FFDB58", reason: "暖深黄，让浅冬型显脏" },
    ],
  },
  [TwelveSeason.WINTER_COOL_DEEP_MUTED]: {
    suitable: [
      { name: "深酒红", hex: "#5C0029", reason: "冷深柔红，深冬型的质感色" },
      { name: "深灰", hex: "#555555", reason: "冷深灰，深冬型的高级色" },
      { name: "深藏青", hex: "#1B2A4A", reason: "冷深蓝，深冬型的核心色" },
      { name: "深紫灰", hex: "#6B5B7B", reason: "冷柔深紫，深冬型的气质色" },
    ],
    unsuitable: [
      { name: "明黄", hex: "#FFD700", reason: "暖亮色，与深冬型冷深基调冲突" },
      { name: "嫩绿", hex: "#99DC5B", reason: "暖亮绿，深冬型穿来显脏" },
    ],
  },
};

export function classify_tone(aStar: number, ita?: number): { tone: ToneType; confidence: number } {
  let warmThreshold = 8.0;
  if (ita !== undefined) {
    if (ita > 55.0) warmThreshold = 6.0;
    else if (ita > 28.0) warmThreshold = 8.0;
    else if (ita > 10.0) warmThreshold = 10.0;
    else warmThreshold = 12.0;
  }

  if (aStar > warmThreshold) {
    return { tone: ToneType.WARM, confidence: Math.min(1.0, 0.5 + aStar / 30.0) };
  }
  if (aStar > 3.0) {
    return { tone: ToneType.WARM, confidence: 0.5 + aStar / 20.0 };
  }
  if (aStar < -2.0) {
    return { tone: ToneType.COOL, confidence: Math.min(1.0, 0.5 + Math.abs(aStar) / 20.0) };
  }
  return { tone: ToneType.NEUTRAL, confidence: 0.5 };
}

export function classify_depth(lStar: number): { depth: DepthType; confidence: number } {
  if (lStar >= 65.0) {
    return { depth: DepthType.LIGHT, confidence: Math.min(1.0, 0.5 + (lStar - 65.0) / 30.0) };
  }
  if (lStar >= 50.0) {
    return { depth: DepthType.LIGHT, confidence: 0.5 + (lStar - 50.0) / 30.0 };
  }
  if (lStar >= 40.0) {
    return { depth: DepthType.DEEP, confidence: 0.5 + (50.0 - lStar) / 20.0 };
  }
  return { depth: DepthType.DEEP, confidence: Math.min(1.0, 0.5 + (40.0 - lStar) / 20.0) };
}

export function classify_chroma(chroma: number): { chromaType: ChromaType; confidence: number } {
  if (chroma >= 18.0) {
    return {
      chromaType: ChromaType.CLEAR,
      confidence: Math.min(1.0, 0.5 + (chroma - 18.0) / 15.0),
    };
  }
  if (chroma >= 12.0) {
    return { chromaType: ChromaType.CLEAR, confidence: 0.5 + (chroma - 12.0) / 12.0 };
  }
  if (chroma >= 8.0) {
    return { chromaType: ChromaType.MUTED, confidence: 0.5 + (12.0 - chroma) / 8.0 };
  }
  return { chromaType: ChromaType.MUTED, confidence: Math.min(1.0, 0.5 + (8.0 - chroma) / 8.0) };
}

export function determine_season(
  tone: ToneType,
  depth: DepthType,
  chromaType: ChromaType
): TwelveSeason {
  if (tone === ToneType.WARM || tone === ToneType.NEUTRAL) {
    if (depth === DepthType.LIGHT) {
      return chromaType === ChromaType.CLEAR
        ? TwelveSeason.SPRING_WARM_LIGHT_CLEAR
        : TwelveSeason.SPRING_WARM_LIGHT_MUTED;
    }
    return chromaType === ChromaType.CLEAR
      ? TwelveSeason.SPRING_WARM_DEEP_CLEAR
      : TwelveSeason.AUTUMN_WARM_DEEP_MUTED;
  }
  if (depth === DepthType.LIGHT) {
    return chromaType === ChromaType.CLEAR
      ? TwelveSeason.SUMMER_COOL_LIGHT_CLEAR
      : TwelveSeason.SUMMER_COOL_LIGHT_MUTED;
  }
  return chromaType === ChromaType.CLEAR
    ? TwelveSeason.WINTER_COOL_DEEP_CLEAR
    : TwelveSeason.WINTER_COOL_DEEP_MUTED;
}

export function get_season_palette(season: TwelveSeason): SeasonPalette {
  return SEASON_PALETTES[season] ?? SEASON_PALETTES[TwelveSeason.SPRING_WARM_LIGHT_CLEAR];
}

export { compute_ita, compute_chroma };
