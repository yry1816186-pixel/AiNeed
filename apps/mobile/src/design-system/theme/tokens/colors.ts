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
// AUXILIARY ONLY: These warm color systems are for categorical highlights and decorative use.
// They are NOT brand colors. Terracotta (#C67B5C) is the sole brand primary.
// NEVER use these as primary action buttons, CTAs, or brand identity elements.

/**
 * @deprecated WarmPrimaryColors 已迁移至 design-system/theme/index.ts 中的 warmPrimary palettes。
 * 辅助暖色系（coral/mint/ocean）仅用于分类高亮和装饰用途，不应作为品牌主色。
 * 主色操作请使用 Colors.primary[500] (#C67B5C)，
 * 辅助色请使用 Colors.sage[500] (#8B9A7D)。
 */
export const WarmPrimaryColors = {
  coral: {
    50: "#FFF1F1",
    100: "#FFE0E0",
    200: "#FFC8C8",
    300: "#FFA8A8",
    400: "#FF9090",
    500: "#FF7F7F",
    600: "#E86666",
    700: "#CC4D4D",
    800: "#A63C3C",
    900: "#802E2E",
  },
  mint: {
    50: "#EDFBF4",
    100: "#D1F5E4",
    200: "#A8EBCD",
    300: "#7EDCB5",
    400: "#5DD4A3",
    500: "#7ED4AD",
    600: "#4DB88A",
    700: "#3A9A72",
    800: "#2D7A5B",
    900: "#1F5C43",
  },
  ocean: {
    50: "#F0F6FF",
    100: "#DCEAFB",
    200: "#B8D5F7",
    300: "#7DB8F0",
    400: "#4A9BE6",
    500: "#4A90D9",
    600: "#3A7BC2",
    700: "#2D6199",
    800: "#234D7A",
    900: "#1A3A5C",
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

  // Auxiliary warm colors - for decorative/categorical use only, NOT brand identity
  warmPrimary: WarmPrimaryColors.coral[500], // #FF6B6B 珊瑚粉 (auxiliary)
  warmSecondary: WarmPrimaryColors.mint[500], // #51CF66 薄荷绿 (auxiliary)
  warmAccent: WarmPrimaryColors.ocean[500], // #167FFB 深海蓝 (auxiliary)
} as const;

export const NeutralColors = DesignTokens.colors.neutral;

export const PrimaryColors = {
  50: "#FDF8F5",
  100: "#FAEDE6",
  200: "#F5DBC9",
  300: "#EDC4A8",
  400: "#E2A782",
  500: DesignTokens.colors.brand.terracotta,
  600: DesignTokens.colors.brand.terracottaDark,
  700: "#8A533B",
  800: "#714532",
  900: "#5D3A2A",
  950: "#321E16",
} as const;

export const SecondaryColors = {
  50: "#F5F7F3",
  100: "#EBEEE7",
  200: "#D7DDD0",
  300: "#B8C4AD",
  400: "#9AA88C",
  500: DesignTokens.colors.brand.sage,
  600: DesignTokens.colors.brand.sageDark,
  700: "#5A6451",
  800: "#4A5243",
  900: "#3E4438",
  950: "#21241C",
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
  shimmer: ["rgba(255,255,255,0)", "rgba(255,255,255,0.3)", "rgba(255,255,255,0)"] as [
    string,
    string,
    ...string[]
  ],

  // Auxiliary warm gradients - for decorative/categorical use only, NOT brand identity
  coralRose: ["#FF6B6B", "#FF8E8E"] as [string, string], // 珊瑚粉渐变 (auxiliary)
  mintFresh: ["#51CF66", "#69DB7C"] as [string, string], // 薄荷绿渐变 (auxiliary)
  oceanDeep: ["#167FFB", "#33AAFF"] as [string, string], // 深海蓝渐变 (auxiliary)
  sunsetWarm: ["#FF6B6B", "#FFD93D"] as [string, string], // 日落暖色 (auxiliary)
  springBloom: ["#FF6B6B", "#51CF66"] as [string, string], // 春日绽放 (auxiliary)
  oceanMint: ["#167FFB", "#51CF66"] as [string, string], // 海洋薄荷 (auxiliary)
  coralOcean: ["#FF6B6B", "#167FFB"] as [string, string], // 珊瑚海洋 (auxiliary)

  // Auxiliary luxury gradients - for decorative/categorical use only
  luxuryGold: ["#FFD700", "#FFA500"] as [string, string], // 奢华金 (auxiliary)
  elegantPurple: [
    DesignTokens.colors.brand.terracottaDark,
    DesignTokens.colors.brand.slateDark,
  ] as [string, string],
  romanticPink: ["#FF6B9D", "#FFB6C1"] as [string, string], // 浪漫粉 (auxiliary)
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

/**
 * @deprecated 使用 useTheme().colors (flatColors) 或 DesignTokens 替代。
 * 此对象不响应暗色模式切换，仅用于静态引用场景。
 * 新代码请使用: const { colors } = useTheme();
 */
export const colors = {
  brand: BrandColors,
  neutral: NeutralColors,
  primary: PrimaryColors,
  secondary: SecondaryColors,
  gradients: GradientPresets,
  semantic: SemanticColors,
  fashion: FashionColors,

  // Auxiliary warm color scales - for decorative/categorical use only
  warmPrimary: WarmPrimaryColors, // complete warm auxiliary color scales
};

export default colors;
