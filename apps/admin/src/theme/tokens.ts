/**
 * AiNeed Admin 主题配置
 * 品牌色: Terracotta #C67B5C / xuno #C67C4E（与 Mobile 端一致）
 */
export const brandColors = {
  /** 品牌主色 — 用于按钮、链接、选中态。与 Mobile DesignTokens.colors.brand.terracotta 一致 */
  primary: "#C67B5C",
  /** 品牌辅色（暖调强调色，用于渐变/装饰） */
  secondary: "#C67C4E",
  /** 浅色背景 */
  primaryLight: "#FDE8DF",
  /** 悬停态 */
  primaryHover: "#B56B3E",
  /** 按压态 */
  primaryActive: "#A05A2E",
  /** Sage 辅助绿 — 成功/确认 */
  sage: "#8B9A7D",
  /** Slate 辅助灰蓝 — 中性操作 */
  slate: "#7B8FA2",
  /** Camel 暖驼色 — 温和提示 */
  camel: "#B5A08C",
  /** 语义色 */
  success: "#52C41A",
  warning: "#FAAD14",
  error: "#FF4D4F",
  info: "#7B8FA2",
} as const;

/**
 * Ant Design ConfigProvider theme token
 */
export const antdThemeToken = {
  colorPrimary: brandColors.primary,
  colorPrimaryBg: brandColors.primaryLight,
  colorPrimaryBgHover: "#FAD4C5",
  colorPrimaryBorder: brandColors.primary,
  colorPrimaryHover: brandColors.primaryHover,
  colorPrimaryActive: brandColors.primaryActive,
  colorSuccess: brandColors.success,
  colorWarning: brandColors.warning,
  colorError: brandColors.error,
  colorInfo: brandColors.info,
  borderRadius: 8,
  colorLink: "#C67C4E",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

export default brandColors;
