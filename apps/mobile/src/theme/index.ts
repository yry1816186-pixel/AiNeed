import { Dimensions, Platform, StatusBar } from "react-native";
import { DesignTokens } from "./tokens/design-tokens";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
  Animation,
  ZIndex,
  gradients,
} from "./compat";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isIOS = Platform.OS === "ios";
const isAndroid = Platform.OS === "android";

export const theme = {
  colors: {
    primary: Colors.primary[500],
    primaryLight: Colors.primary[400],
    primaryDark: Colors.primary[600],
    secondary: Colors.sage[500],
    secondaryLight: Colors.sage[400],
    secondaryDark: Colors.sage[600],
    background: Colors.neutral[50],
    surface: Colors.neutral.white,
    text: Colors.neutral[900],
    textSecondary: Colors.neutral[600],
    textTertiary: Colors.neutral[500],
    border: Colors.neutral[200],
    success: Colors.success[500],
    error: Colors.error[500],
    warning: Colors.warning[500],
    info: Colors.info[500],
    neutral: Colors.neutral,
    brand: Colors.brand,

    // Semantic UI colors
    like: '#FF4757',
    likeLight: '#FFF0F0',
    cartLight: '#F0F0FF',
    gold: '#FFB800',
    goldDark: '#D9A441',
    purple: '#9C27B0',
    amber: '#FFB300',

    // Placeholder & divider colors
    placeholderBg: '#E2E8F0',
    subtleBg: '#F1F3F4',
    divider: '#F1F3F4',

    // Overlay colors
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
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
  Animation,
  ZIndex,
  gradients,
};

export default theme;
export {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
  Animation,
  ZIndex,
  gradients,
};
