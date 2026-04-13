import { DesignTokens } from "./design-tokens";

/**
 * 寻裳 增强色彩系统 - 国赛一等奖水准
 *
 * 设计理念：
 * - 温暖亲和：珊瑚粉/薄荷绿传达友好感
 * - 时尚专业：深海蓝作为强调色提升品质感
 * - 层次丰富：完整的色阶系统支持各种场景
 */

// ========== 主色调 - 温暖亲和配色 ==========
export const WarmPrimaryColors = {
  // 珊瑚粉主色系（温暖、亲和、女性化）
  coral: {
    50: '#FFF5F5',
    100: '#FFE8E8',
    200: '#FFD1D1',
    300: '#FFB3B3',
    400: '#FF8A8A',
    500: '#FF6B6B',  // Primary Coral
    600: '#EE5A5A',
    700: '#DC4444',
    800: '#C23030',
    900: '#A12525',
    950: '#6B1515',
  },
  // 薄荷绿辅助色系（清新、自然、健康）
  mint: {
    50: '#F0FFF4',
    100: '#D9FFE8',
    200: '#B2FFD6',
    300: '#7DFFBF',
    400: '#51CF66',  // Primary Mint
    500: '#40C057',
    600: '#2F9E44',
    700: '#228B3D',
    800: '#1B7A34',
    900: '#166534',
    950: '#0B3D1A',
  },
  // 深海蓝强调色系（专业、可信赖、高端）
  ocean: {
    50: '#EBF5FF',
    100: '#D0EAFF',
    200: '#A3D9FF',
    300: '#6BC2FF',
    400: '#33AAFF',
    500: '#167FFB',  // Primary Ocean Blue
    600: '#1069CC',
    700: '#0D55A8',
    800: '#0A4488',
    900: '#073569',
    950: '#041D3D',
  },
} as const;

export const BrandColors = {
  primary: DesignTokens.colors.brand.terracotta,
  secondary: DesignTokens.colors.brand.sage,
  accent: DesignTokens.colors.brand.camel,
  success: DesignTokens.colors.semantic.success,
  warning: DesignTokens.colors.semantic.warning,
  error: DesignTokens.colors.semantic.error,
  info: DesignTokens.colors.semantic.info,

  // 新增温暖亲和主色
  warmPrimary: WarmPrimaryColors.coral[500],      // #FF6B6B 珊瑚粉
  warmSecondary: WarmPrimaryColors.mint[500],     // #51CF66 薄荷绿
  warmAccent: WarmPrimaryColors.ocean[500],       // #167FFB 深海蓝
} as const;

export const NeutralColors = DesignTokens.colors.neutral;

export const PrimaryColors = {
  50: "#FDF8F5",
  100: "#FAF0EA",
  200: "#F5E0D5",
  300: "#EBC9B7",
  400: "#D9A88C",
  500: DesignTokens.colors.brand.terracotta,
  600: DesignTokens.colors.brand.terracottaDark,
  700: "#8A5339",
  800: "#6D422C",
  900: "#4A2D1E",
  950: "#2D1B12",
} as const;

export const SecondaryColors = {
  50: "#F5F7F3",
  100: "#EBEFE8",
  200: "#D7DFD2",
  300: "#B8C5AF",
  400: "#9AAF8C",
  500: DesignTokens.colors.brand.sage,
  600: DesignTokens.colors.brand.sageDark,
  700: "#5A6650",
  800: "#485240",
  900: "#323930",
  950: "#1E231C",
} as const;

export const GradientPresets = {
  hero: [...DesignTokens.gradients.brand] as [string, string, ...string[]],
  primary: [...DesignTokens.gradients.brand] as [string, string, ...string[]],
  secondary: [...DesignTokens.gradients.sage] as [string, string, ...string[]],
  warm: [...DesignTokens.gradients.warm] as [string, string, ...string[]],
  cool: [...DesignTokens.gradients.cool] as [string, string, ...string[]],
  brand: [...DesignTokens.gradients.brand] as [string, string, ...string[]],
  sage: [...DesignTokens.gradients.sage] as [string, string, ...string[]],
  glass: ["rgba(255,255,255,0.2)", "rgba(255,255,255,0.05)"] as [string, string, ...string[]],
  glassDark: ["rgba(0,0,0,0.3)", "rgba(0,0,0,0.1)"] as [string, string, ...string[]],
  shimmer: [
    "rgba(255,255,255,0)",
    "rgba(255,255,255,0.3)",
    "rgba(255,255,255,0)",
  ] as [string, string, ...string[]],

  // 新增温暖亲和渐变
  coralRose: ['#FF6B6B', '#FF8E8E'] as [string, string],           // 珊瑚粉渐变
  mintFresh: ['#51CF66', '#69DB7C'] as [string, string],            // 薄荷绿渐变
  oceanDeep: ['#167FFB', '#33AAFF'] as [string, string],            // 深海蓝渐变
  sunsetWarm: ['#FF6B6B', '#FFD93D'] as [string, string],           // 日落暖色
  springBloom: ['#FF6B6B', '#51CF66'] as [string, string],          // 春日绽放
  oceanMint: ['#167FFB', '#51CF66'] as [string, string],            // 海洋薄荷
  coralOcean: ['#FF6B6B', '#167FFB'] as [string, string],           // 珊瑚海洋

  // 高级质感渐变
  luxuryGold: ['#FFD700', '#FFA500'] as [string, string],           // 奢华金
  elegantPurple: ['#9C27B0', '#673AB7'] as [string, string],        // 优雅紫
  romanticPink: ['#FF6B9D', '#FFB6C1'] as [string, string],         // 浪漫粉
} as const;

export const SemanticColors = {
  success: {
    light: DesignTokens.colors.semantic.successLight,
    main: DesignTokens.colors.semantic.success,
    dark: "#3D5E4D",
  },
  warning: {
    light: DesignTokens.colors.semantic.warningLight,
    main: DesignTokens.colors.semantic.warning,
    dark: "#A67D2E",
  },
  error: {
    light: DesignTokens.colors.semantic.errorLight,
    main: DesignTokens.colors.semantic.error,
    dark: "#8E3327",
  },
  info: {
    light: DesignTokens.colors.semantic.infoLight,
    main: DesignTokens.colors.semantic.info,
    dark: "#5F6F7F",
  },
} as const;

export const FashionColors = {
  blush: "#FFB6C1",
  coral: "#FF7F7F",
  mint: "#98FB98",
  lavender: "#E6E6FA",
  peach: "#FFDAB9",
  champagne: "#F7E7CE",
  ivory: "#FFFFF0",
  cream: "#FFFDD0",
  navy: "#1E3A5F",
  burgundy: "#800020",
  olive: "#808000",
  camel: DesignTokens.colors.brand.camel,
  taupe: "#483C32",
  charcoal: "#36454F",
} as const;

export const colors = {
  brand: BrandColors,
  neutral: NeutralColors,
  primary: PrimaryColors,
  secondary: SecondaryColors,
  gradients: GradientPresets,
  semantic: SemanticColors,
  fashion: FashionColors,

  // 新增温暖亲和色系
  warmPrimary: WarmPrimaryColors,  // 完整的温暖亲和色阶
};

export default colors;
