import { Dimensions, Platform, StatusBar } from 'react-native';
import { DesignTokens } from './tokens/design-tokens';
import {
  Colors as LegacyColors,
  Typography as LegacyTypography,
  Spacing as LegacySpacing,
  BorderRadius as LegacyBorderRadius,
  Shadows as LegacyShadows,
  Layout,
  Animation,
  ZIndex,
  gradients,
} from './compat';

import { colors, type XunOColors } from './colors';
import { typography, type XunOTypography } from './typography';
import { spacing, type XunOSpacing } from './spacing';
import { shadows, type XunOShadows } from './shadows';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

export const xunoTheme = {
  colors,
  typography,
  spacing,
  shadows,

  semantic: {
    primary: colors.primary[500],
    primaryLight: colors.primary[400],
    primaryDark: colors.primary[600],
    secondary: colors.secondary[500],
    secondaryLight: colors.secondary[400],
    secondaryDark: colors.secondary[600],
    background: colors.neutral[50],
    surface: colors.neutral.white,
    text: colors.neutral[900],
    textSecondary: colors.neutral[600],
    textTertiary: colors.neutral[500],
    border: colors.neutral[200],
    success: colors.semantic.success,
    error: colors.semantic.error,
    warning: colors.semantic.warning,
    info: colors.semantic.info,
  },

  layout: {
    screen: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
    safeArea: {
      top: isIOS ? 44 : StatusBar.currentHeight || 24,
      bottom: isIOS ? 34 : 16,
    },
  },

  zIndex: {
    base: 0,
    docked: 10,
    dropdown: 20,
    sticky: 30,
    modalBackdrop: 50,
    modal: 60,
    popover: 70,
    toast: 90,
    overlay: 100,
  },
} as const;

export type XunOTheme = typeof xunoTheme;

export { colors, typography, spacing, shadows };
export type { XunOColors, XunOTypography, XunOSpacing, XunOShadows };

export const theme = {
  colors: {
    primary: LegacyColors.primary[500],
    primaryLight: LegacyColors.primary[400],
    primaryDark: LegacyColors.primary[600],
    secondary: LegacyColors.sage[500],
    secondaryLight: LegacyColors.sage[400],
    secondaryDark: LegacyColors.sage[600],
    background: LegacyColors.neutral[50],
    surface: LegacyColors.neutral.white,
    text: LegacyColors.neutral[900],
    textSecondary: LegacyColors.neutral[600],
    textTertiary: LegacyColors.neutral[500],
    border: LegacyColors.neutral[200],
    success: LegacyColors.success[500],
    error: LegacyColors.error[500],
    warning: LegacyColors.warning[500],
    info: LegacyColors.info[500],
    neutral: LegacyColors.neutral,
    brand: LegacyColors.brand,
    like: '#FF4757',
    likeLight: '#FFF0F0',
    cartLight: '#F0F0FF',
    gold: '#FFB800',
    goldDark: '#D9A441',
    purple: '#9C27B0',
    amber: '#FFB300',
    placeholderBg: '#E2E8F0',
    subtleBg: '#F1F3F4',
    divider: '#F1F3F4',
    overlayDark: 'rgba(0,0,0,0.45)',
    overlayDarkLight: 'rgba(0,0,0,0.3)',
    overlayLight: 'rgba(255,255,255,0.9)',
    overlayWhiteLow: 'rgba(255,255,255,0.15)',
    overlayWhiteMid: 'rgba(255,255,255,0.2)',
    overlayWhiteMed: 'rgba(255,255,255,0.25)',
    overlayWhiteHigh: 'rgba(255,255,255,0.7)',
    overlayWhiteFull: 'rgba(255,255,255,0.75)',
    overlayLikeBg: 'rgba(255,71,87,0.12)',
    overlayDislikeBg: 'rgba(150,150,150,0.12)',
    overlayGoldBg: 'rgba(255,184,0,0.2)',
    overlayGoldBorder: 'rgba(255,184,0,0.4)',
    overlayWhite: 'rgba(255,255,255,0.85)',
  },
  Colors: LegacyColors,
  Typography: LegacyTypography,
  Spacing: LegacySpacing,
  BorderRadius: LegacyBorderRadius,
  Shadows: LegacyShadows,
  Layout,
  Animation,
  ZIndex,
  gradients,
};

export default theme;
export {
  LegacyColors as Colors,
  LegacyTypography as Typography,
  LegacySpacing as Spacing,
  LegacyBorderRadius as BorderRadius,
  LegacyShadows as Shadows,
  Layout,
  Animation,
  ZIndex,
  gradients,
};
