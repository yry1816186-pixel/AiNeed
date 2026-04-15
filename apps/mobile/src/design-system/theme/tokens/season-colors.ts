/**
 * 寻裳 四季色彩强调色方案
 *
 * 设计理念：
 * - 季节色彩作为"强调色叠加"到品牌色体系上，不完全替换品牌色
 * - 品牌标识（Logo、导航栏背景）始终使用 Terracotta (#C67B5C)
 * - 季节强调色用于：CTA按钮渐变、卡片高亮边框、进度条、标签、通知点
 * - 无色彩分析时，界面保持纯 Terracotta 品牌色
 *
 * 色彩心理学：
 * - 春季型：珊瑚红 - 温暖活力、生机勃勃
 * - 夏季型：雾蓝 - 清凉优雅、柔和高雅
 * - 秋季型：琥珀 - 大地温暖、沉稳内敛
 * - 冬季型：深蓝 - 冷艳对比、锐利鲜明
 */

export type ColorSeason = "spring" | "summer" | "autumn" | "winter";

export interface SeasonAccentColors {
  /** 主强调色 - 用于CTA按钮、高亮标签、进度条 */
  accent: string;
  /** 浅强调色 - 用于背景高亮、浅色标签、hover状态 */
  accentLight: string;
  /** 深强调色 - 用于按压状态、深色标签、阴影色 */
  accentDark: string;
  /** 渐变色对 - 用于CTA按钮渐变、卡片渐变背景 */
  gradient: [string, string];
  /** 图标着色 - 用于图标tint、小装饰元素 */
  iconTint: string;
}

export const seasonAccentColors: Record<ColorSeason, SeasonAccentColors> = {
  spring: {
    accent: "#FF6B6B", // 珊瑚红 - 温暖活力
    accentLight: "#FFE0E0", // 浅珊瑚
    accentDark: "#CC5555", // 深珊瑚
    gradient: ["#FF6B6B", "#FFB347"], // 珊瑚到橙
    iconTint: "#FF8A80",
  },
  summer: {
    accent: "#87CEEB", // 雾蓝 - 清凉优雅
    accentLight: "#E0F0FF", // 浅蓝
    accentDark: "#5BA3C7", // 深蓝
    gradient: ["#87CEEB", "#B8A9C9"], // 雾蓝到薰衣草
    iconTint: "#80D8FF",
  },
  autumn: {
    accent: "#D2691E", // 琥珀 - 大地温暖
    accentLight: "#F5DEB3", // 浅琥珀
    accentDark: "#A0522D", // 深琥珀
    gradient: ["#D2691E", "#8B4513"], // 琥珀到棕
    iconTint: "#FFAB40",
  },
  winter: {
    accent: "#1A1A2E", // 深蓝 - 冷艳对比
    accentLight: "#E8E8F0", // 浅灰蓝
    accentDark: "#0D0D1A", // 墨黑
    gradient: ["#1A1A2E", "#4A4A8A"], // 深蓝到紫蓝
    iconTint: "#8C9EFF",
  },
};

/** 季节中文名称映射 */
export const seasonLabels: Record<ColorSeason, string> = {
  spring: "春季型",
  summer: "夏季型",
  autumn: "秋季型",
  winter: "冬季型",
};

/** 季节英文描述映射 */
export const seasonDescriptions: Record<ColorSeason, string> = {
  spring: "Warm Spring",
  summer: "Cool Summer",
  autumn: "Warm Autumn",
  winter: "Cool Winter",
};

/**
 * 从 colorSeason 字符串中提取基础季节类型
 * 支持子类型如 "spring_warm" -> "spring"
 */
export function normalizeColorSeason(raw: string | null | undefined): ColorSeason | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith("spring")) return "spring";
  if (lower.startsWith("summer")) return "summer";
  if (lower.startsWith("autumn") || lower.startsWith("fall")) return "autumn";
  if (lower.startsWith("winter")) return "winter";
  return null;
}
