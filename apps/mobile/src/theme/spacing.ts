export const SpacingScale = {
  0: 0,
  px: 1,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const SpacingAliases = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const BorderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  full: 9999,
} as const;

export const LayoutSpacing = {
  screenPadding: 20,
  cardPadding: 16,
  listItemPadding: 12,
  buttonPadding: 12,
  inputPadding: 16,
  modalPadding: 24,
  sectionGap: 24,
  cardGap: 12,
  gridGap: 12,
} as const;

export const spacing = {
  scale: SpacingScale,
  aliases: SpacingAliases,
  borderRadius: BorderRadius,
  layout: LayoutSpacing,
};

export type XunOSpacing = typeof spacing;

export default spacing;
